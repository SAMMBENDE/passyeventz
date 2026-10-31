import { NextResponse } from "next/server";
import Stripe from "stripe";

import {
  DepositPaymentError,
  markDepositAsPaid,
} from "@/lib/deposit-payments";
import { connectToDatabase } from "@/lib/mongodb";
import { readRequestBody, RequestBodyTooLargeError } from "@/lib/request-body";
import { DepositPaymentModel } from "@/models/deposit-payment";

const maxWebhookBytes = 1024 * 1024;

export async function POST(request: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: "Webhook Stripe non configuré." }, { status: 503 });
  }
  if (!signature) {
    return NextResponse.json({ error: "Signature Stripe manquante." }, { status: 400 });
  }

  let rawBody: Buffer;
  try {
    rawBody = await readRequestBody(request, maxWebhookBytes);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Requête trop volumineuse." }, { status: 413 });
    }
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = new Stripe(stripeKey).webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Signature Stripe invalide." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const checkout = event.data.object;
      if (checkout.payment_status !== "paid") {
        return NextResponse.json({ received: true });
      }

      const paymentId = checkout.metadata?.paymentId;
      if (!paymentId || !/^[\da-f]{24}$/i.test(paymentId)) {
        return NextResponse.json({ received: true });
      }
      const paymentRecord = await DepositPaymentModel.findById(paymentId)
        .select("provider")
        .lean();
      if (!paymentRecord || paymentRecord.provider !== "stripe") {
        return NextResponse.json({ received: true });
      }
      const paymentIntentId =
        typeof checkout.payment_intent === "string"
          ? checkout.payment_intent
          : checkout.payment_intent?.id;
      if (!checkout.currency || checkout.amount_total === null) {
        return NextResponse.json({ error: "Données de paiement Stripe incomplètes." }, { status: 400 });
      }

      let paid = false;
      let paymentMismatch = false;
      try {
        paid = await markDepositAsPaid({
          paymentId,
          provider: "stripe",
          providerOrderId: checkout.id,
          amountCents: checkout.amount_total,
          currency: checkout.currency,
        });
      } catch (error) {
        if (!(error instanceof DepositPaymentError) || error.code !== "PAYMENT_PROVIDER_ERROR") {
          throw error;
        }
        paymentMismatch = true;
      }

      if (!paid) {
        if (!paymentIntentId) {
          throw new Error("A paid Stripe Checkout session has no payment intent.");
        }
        await new Stripe(stripeKey).refunds.create(
          { payment_intent: paymentIntentId },
          { idempotencyKey: `deposit-refund-${paymentIntentId}` },
        );
        await DepositPaymentModel.updateOne(
          { _id: paymentId, status: "pending" },
          { $set: { status: paymentMismatch ? "failed" : "expired" } },
        );
      }
    } else if (event.type === "checkout.session.expired") {
      await DepositPaymentModel.updateOne(
        {
          provider: "stripe",
          providerOrderId: event.data.object.id,
          status: "pending",
        },
        { $set: { status: "expired" } },
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof DepositPaymentError) {
      console.error("Stripe payment event rejected:", error.code);
    } else {
      console.error(
        "Failed to process Stripe webhook:",
        error instanceof Error ? error.name : "UnknownError",
      );
    }
    return NextResponse.json({ error: "Impossible de traiter l’événement Stripe." }, { status: 503 });
  }
}
