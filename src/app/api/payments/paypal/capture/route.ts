import { NextResponse } from "next/server";

import { expirePendingBookings } from "@/lib/booking-expiration";
import {
  capturePayPalOrder,
  DepositPaymentError,
  expireDepositPayments,
  markDepositAsPaid,
  paypalCaptureDetails,
  refundPayPalCapture,
} from "@/lib/deposit-payments";
import { connectToDatabase } from "@/lib/mongodb";
import { DepositPaymentModel } from "@/models/deposit-payment";

function confirmationUrl(request: Request, status: "succes" | "annule" | "erreur") {
  const baseUrl = process.env.APP_BASE_URL?.trim() || new URL(request.url).origin;
  const url = new URL("/paiement/confirmation", baseUrl);
  url.searchParams.set("statut", status);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const orderId = new URL(request.url).searchParams.get("token");
  if (!orderId || !/^[\w-]{1,128}$/.test(orderId)) {
    return confirmationUrl(request, "erreur");
  }

  try {
    await connectToDatabase();
    await expirePendingBookings();
    await expireDepositPayments();

    const payment = await DepositPaymentModel.findOne({
      provider: "paypal",
      providerOrderId: orderId,
    })
      .select("_id status expiresAt")
      .lean();
    if (!payment) return confirmationUrl(request, "erreur");
    if (payment.status === "paid") return confirmationUrl(request, "succes");
    if (payment.status !== "pending" || payment.expiresAt <= new Date()) {
      return confirmationUrl(request, "annule");
    }

    const captureResult = await capturePayPalOrder(orderId);
    const capture = paypalCaptureDetails(captureResult, orderId);
    if (!capture || capture.orderId !== orderId) {
      return confirmationUrl(request, "erreur");
    }

    let paid = false;
    try {
      paid = await markDepositAsPaid({
        paymentId: payment._id.toString(),
        provider: "paypal",
        providerOrderId: orderId,
        amountCents: capture.amountCents,
        currency: capture.currency,
      });
    } catch (error) {
      if (!(error instanceof DepositPaymentError) || error.code !== "PAYMENT_PROVIDER_ERROR") {
        throw error;
      }
    }
    if (!paid) {
      await refundPayPalCapture(capture.id, `late-capture-${capture.id}`);
      await DepositPaymentModel.updateOne(
        { _id: payment._id, status: "pending" },
        { $set: { status: "failed" } },
      );
      return confirmationUrl(request, "annule");
    }

    return confirmationUrl(request, "succes");
  } catch (error) {
    console.error(
      "Failed to capture PayPal deposit:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return confirmationUrl(request, "erreur");
  }
}
