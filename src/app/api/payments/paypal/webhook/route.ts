import { NextResponse } from "next/server";

import {
  DepositPaymentError,
  markDepositAsPaid,
  paypalWebhookCaptureDetails,
  refundPayPalCapture,
  verifyPayPalWebhook,
} from "@/lib/deposit-payments";
import { connectToDatabase } from "@/lib/mongodb";
import { readRequestBody, RequestBodyTooLargeError } from "@/lib/request-body";
import { DepositPaymentModel } from "@/models/deposit-payment";

const maxWebhookBytes = 1024 * 1024;

export async function POST(request: Request) {
  let event: unknown;
  try {
    const rawBody = await readRequestBody(request, maxWebhookBytes);
    event = JSON.parse(rawBody.toString("utf8")) as unknown;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Requête trop volumineuse." }, { status: 413 });
    }
    return NextResponse.json({ error: "Événement PayPal invalide." }, { status: 400 });
  }

  try {
    if (
      !process.env.PAYPAL_WEBHOOK_ID ||
      !process.env.PAYPAL_CLIENT_ID ||
      !process.env.PAYPAL_CLIENT_SECRET
    ) {
      return NextResponse.json({ error: "Webhook PayPal non configuré." }, { status: 503 });
    }
    if (!(await verifyPayPalWebhook(request, event))) {
      return NextResponse.json({ error: "Signature PayPal invalide." }, { status: 400 });
    }
    await connectToDatabase();
    const capture = paypalWebhookCaptureDetails(event);
    if (!capture) return NextResponse.json({ received: true });

    const payment = await DepositPaymentModel.findOne({
      provider: "paypal",
      providerOrderId: capture.orderId,
    })
      .select("_id")
      .lean();
    if (!payment) return NextResponse.json({ received: true });

    let paid = false;
    let paymentMismatch = false;
    try {
      paid = await markDepositAsPaid({
        paymentId: payment._id.toString(),
        provider: "paypal",
        providerOrderId: capture.orderId,
        amountCents: capture.amountCents,
        currency: capture.currency,
      });
    } catch (error) {
      if (!(error instanceof DepositPaymentError) || error.code !== "PAYMENT_PROVIDER_ERROR") {
        throw error;
      }
      paymentMismatch = true;
    }
    if (!paid) {
      await refundPayPalCapture(capture.id, `deposit-${capture.id}`);
      await DepositPaymentModel.updateOne(
        { _id: payment._id, status: "pending" },
        { $set: { status: paymentMismatch ? "failed" : "expired" } },
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof DepositPaymentError) {
      console.error("PayPal payment event rejected:", error.code);
    } else {
      console.error(
        "Failed to process PayPal webhook:",
        error instanceof Error ? error.name : "UnknownError",
      );
    }
    return NextResponse.json({ error: "Impossible de traiter l’événement PayPal." }, { status: 503 });
  }
}
