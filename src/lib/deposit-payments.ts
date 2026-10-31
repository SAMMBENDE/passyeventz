import { createHash } from "node:crypto";
import mongoose, { Types } from "mongoose";
import Stripe from "stripe";

import { expirePendingBookings, getPendingBookingExpiryCutoff } from "@/lib/booking-expiration";
import { connectToDatabase } from "@/lib/mongodb";
import type { PaymentProvider } from "@/models/deposit-payment";
import { DepositPaymentModel } from "@/models/deposit-payment";
import { BookingModel } from "@/models/booking";
import { QuoteModel } from "@/models/quote";

export class DepositPaymentError extends Error {
  constructor(
    readonly code:
      | "INVALID_BOOKING"
      | "BOOKING_NOT_PAYABLE"
      | "DEPOSIT_NOT_CONFIGURED"
      | "PAYMENT_ALREADY_PENDING"
      | "DEPOSIT_ALREADY_PAID"
      | "PAYMENT_EXPIRED"
      | "PAYMENT_PROVIDER_ERROR",
    message: string,
  ) {
    super(message);
    this.name = "DepositPaymentError";
  }
}

type PayPalOrder = {
  id: string;
  links: Array<{ href: string; rel: string }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function paypalBaseUrl(): string {
  const mode = process.env.PAYPAL_MODE ?? "sandbox";
  if (mode === "sandbox") return "https://api-m.sandbox.paypal.com";
  if (mode === "live") return "https://api-m.paypal.com";
  throw new DepositPaymentError("DEPOSIT_NOT_CONFIGURED", "La configuration PayPal est invalide.");
}

function stripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new DepositPaymentError(
      "DEPOSIT_NOT_CONFIGURED",
      "Le paiement Stripe n’est pas encore configuré.",
    );
  }
  return new Stripe(key);
}

async function paypalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new DepositPaymentError(
      "DEPOSIT_NOT_CONFIGURED",
      "Le paiement PayPal n’est pas encore configuré.",
    );
  }

  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(10_000),
  });
  const result: unknown = await response.json();
  if (!response.ok || !isRecord(result) || typeof result.access_token !== "string") {
    throw new DepositPaymentError(
      "PAYMENT_PROVIDER_ERROR",
      "Impossible d’établir une connexion sécurisée avec PayPal.",
    );
  }
  return result.access_token;
}

async function paypalRequest(
  path: string,
  accessToken: string,
  init: RequestInit,
  requestId?: string,
): Promise<unknown> {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${accessToken}`);
  headers.set("content-type", "application/json");
  if (requestId) headers.set("paypal-request-id", requestId);

  const response = await fetch(`${paypalBaseUrl()}${path}`, {
    ...init,
    headers,
    signal: AbortSignal.timeout(10_000),
  });
  const result: unknown = await response.json();
  if (!response.ok) {
    throw new DepositPaymentError(
      "PAYMENT_PROVIDER_ERROR",
      "PayPal n’a pas pu traiter le paiement. Réessayez.",
    );
  }
  return result;
}

function isPayPalOrder(value: unknown): value is PayPalOrder {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    Array.isArray(value.links) &&
    value.links.every(
      (link) =>
        isRecord(link) && typeof link.href === "string" && typeof link.rel === "string",
    )
  );
}

function euroAmount(amountCents: number): string {
  return (amountCents / 100).toFixed(2);
}

function validateCheckoutUrl(value: string, provider: PaymentProvider): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new DepositPaymentError(
      "PAYMENT_PROVIDER_ERROR",
      "Le prestataire a renvoyé un lien de paiement invalide.",
    );
  }

  const allowedHost =
    provider === "stripe"
      ? url.hostname === "checkout.stripe.com"
      : url.hostname === "paypal.com" || url.hostname.endsWith(".paypal.com");
  if (url.protocol !== "https:" || !allowedHost) {
    throw new DepositPaymentError(
      "PAYMENT_PROVIDER_ERROR",
      "Le prestataire a renvoyé un lien de paiement invalide.",
    );
  }
  return url.toString();
}

function getPaymentExpiry(now: Date, bookingCreatedAt: Date, bookingStatus: string): Date {
  const providerExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (bookingStatus !== "pending") return providerExpiry;

  const bookingExpiry = new Date(bookingCreatedAt.getTime() + 24 * 60 * 60 * 1000);
  return bookingExpiry < providerExpiry ? bookingExpiry : providerExpiry;
}

async function createPayPalOrder(
  paymentId: string,
  bookingId: string,
  amountCents: number,
  currency: string,
  customerEmail: string,
  baseUrl: string,
): Promise<PayPalOrder> {
  const accessToken = await paypalAccessToken();
  const result = await paypalRequest(
    "/v2/checkout/orders",
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: paymentId,
            custom_id: paymentId,
            invoice_id: `PE-${paymentId}`,
            amount: {
              currency_code: currency.toUpperCase(),
              value: euroAmount(amountCents),
            },
            description: `Acompte PassyEventz — réservation ${bookingId}`,
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              user_action: "PAY_NOW",
              return_url: `${baseUrl}/api/payments/paypal/capture`,
              cancel_url: `${baseUrl}/paiement/confirmation?statut=annule`,
              shipping_preference: "NO_SHIPPING",
              payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
              locale: "fr-FR",
              landing_page: "LOGIN",
              brand_name: "PassyEventz",
            },
          },
        },
        payer: { email_address: customerEmail },
      }),
    },
    `passyeventz-${paymentId}`,
  );
  if (!isPayPalOrder(result)) {
    throw new DepositPaymentError(
      "PAYMENT_PROVIDER_ERROR",
      "PayPal a renvoyé une réponse de paiement invalide.",
    );
  }
  return result;
}

function assertDuplicateKey(error: unknown): boolean {
  return isRecord(error) && error.code === 11000;
}

export async function createDepositCheckoutLink(
  bookingId: string,
  provider: PaymentProvider,
  baseUrl: string,
) {
  if (!Types.ObjectId.isValid(bookingId)) {
    throw new DepositPaymentError("INVALID_BOOKING", "Identifiant de réservation invalide.");
  }

  await connectToDatabase();
  await expirePendingBookings();
  await expireDepositPayments();
  const booking = await BookingModel.findById(bookingId)
    .select("status createdAt quoteId customer")
    .lean();
  if (!booking || !booking.createdAt) {
    throw new DepositPaymentError("INVALID_BOOKING", "Réservation introuvable.");
  }
  if (!["pending", "confirmed"].includes(booking.status)) {
    throw new DepositPaymentError(
      "BOOKING_NOT_PAYABLE",
      "Cette réservation ne peut pas recevoir de paiement.",
    );
  }
  if (
    booking.status === "pending" &&
    booking.createdAt <= getPendingBookingExpiryCutoff()
  ) {
    throw new DepositPaymentError("PAYMENT_EXPIRED", "Le délai de réservation est expiré.");
  }

  const quote = await QuoteModel.findById(booking.quoteId).select("status pricing").lean();
  if (quote?.status !== "approved") {
    throw new DepositPaymentError(
      "BOOKING_NOT_PAYABLE",
      "Le devis associé à cette réservation n’est plus approuvé.",
    );
  }
  const amountCents = quote?.pricing?.depositCents;
  if (!amountCents || amountCents < 1) {
    throw new DepositPaymentError(
      "BOOKING_NOT_PAYABLE",
      "Le devis ne contient pas de montant d’acompte à régler.",
    );
  }
  const completedPayment = await DepositPaymentModel.exists({
    bookingId: booking._id,
    status: "paid",
  });
  if (completedPayment) {
    throw new DepositPaymentError("DEPOSIT_ALREADY_PAID", "L’acompte de ce devis est déjà réglé.");
  }

  const now = new Date();
  const expiresAt = getPaymentExpiry(now, booking.createdAt, booking.status);
  if (expiresAt.getTime() <= now.getTime()) {
    throw new DepositPaymentError("PAYMENT_EXPIRED", "Le délai de réservation est expiré.");
  }

  let payment;
  try {
    [payment] = await DepositPaymentModel.create([
      {
        bookingId: booking._id,
        provider,
        amountCents,
        currency: "eur",
        status: "pending",
        expiresAt,
      },
    ]);
  } catch (error) {
    if (!assertDuplicateKey(error)) throw error;

    const activePayment = await DepositPaymentModel.findOne({
      bookingId: booking._id,
      status: "pending",
    }).lean();
    if (
      activePayment?.provider === provider &&
      activePayment.checkoutUrl &&
      activePayment.expiresAt > now
    ) {
      return {
        id: activePayment._id.toString(),
        provider,
        checkoutUrl: activePayment.checkoutUrl,
        amountCents: activePayment.amountCents,
        expiresAt: activePayment.expiresAt.toISOString(),
      };
    }

    const paidPayment = await DepositPaymentModel.exists({
      bookingId: booking._id,
      status: "paid",
    });
    if (paidPayment) {
      throw new DepositPaymentError("DEPOSIT_ALREADY_PAID", "L’acompte de ce devis est déjà réglé.");
    }
    throw new DepositPaymentError(
      "PAYMENT_ALREADY_PENDING",
      "Un lien de paiement est déjà actif pour cette réservation.",
    );
  }

  try {
    let checkoutUrl: string;
    let providerOrderId: string;

    if (provider === "stripe") {
      const stripe = stripeClient();
      const secondsUntilExpiry = Math.floor(expiresAt.getTime() / 1000);
      if (secondsUntilExpiry < Math.floor(now.getTime() / 1000) + 30 * 60) {
        throw new DepositPaymentError(
          "PAYMENT_EXPIRED",
          "Moins de 30 minutes restent sur cette réservation. Confirmez-la avant de créer le lien.",
        );
      }

      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          allowed_payment_method_types: ["card"],
          customer_email: booking.customer.email,
          client_reference_id: payment._id.toString(),
          expires_at: secondsUntilExpiry,
          metadata: {
            paymentId: payment._id.toString(),
            bookingId: booking._id.toString(),
          },
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: "eur",
                unit_amount: amountCents,
                product_data: { name: "Acompte — réservation PassyEventz" },
              },
            },
          ],
          success_url: `${baseUrl}/paiement/confirmation?statut=succes`,
          cancel_url: `${baseUrl}/paiement/confirmation?statut=annule`,
        },
        { idempotencyKey: `passyeventz-deposit-${payment._id.toString()}` },
      );
      if (!session.url) {
        throw new DepositPaymentError(
          "PAYMENT_PROVIDER_ERROR",
          "Stripe n’a pas fourni de lien de paiement.",
        );
      }
      checkoutUrl = validateCheckoutUrl(session.url, "stripe");
      providerOrderId = session.id;
    } else {
      const order = await createPayPalOrder(
        payment._id.toString(),
        booking._id.toString(),
        amountCents,
        "eur",
        booking.customer.email,
        baseUrl,
      );
      const approvalLink = order.links.find((link) => link.rel === "payer-action")
        ?? order.links.find((link) => link.rel === "approve");
      if (!approvalLink) {
        throw new DepositPaymentError(
          "PAYMENT_PROVIDER_ERROR",
          "PayPal n’a pas fourni de lien de paiement.",
        );
      }
      checkoutUrl = validateCheckoutUrl(approvalLink.href, "paypal");
      providerOrderId = order.id;
    }

    await DepositPaymentModel.updateOne(
      { _id: payment._id, status: "pending" },
      { $set: { checkoutUrl, providerOrderId } },
    );

    return {
      id: payment._id.toString(),
      provider,
      checkoutUrl,
      amountCents,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    await DepositPaymentModel.updateOne(
      { _id: payment._id, status: "pending" },
      { $set: { status: "failed" } },
    );
    throw error;
  }
}

export async function markDepositAsPaid(input: {
  paymentId: string;
  provider: PaymentProvider;
  providerOrderId: string;
  amountCents: number;
  currency: string;
}): Promise<boolean> {
  await connectToDatabase();
  const session = await mongoose.startSession();

  try {
    let wasPaid = false;
    await session.withTransaction(async () => {
      wasPaid = false;
      const payment = await DepositPaymentModel.findById(input.paymentId)
        .session(session)
        .lean();
      if (!payment || payment.provider !== input.provider) return;
      if (
        payment.amountCents !== input.amountCents ||
        payment.currency !== input.currency.toLowerCase() ||
        payment.providerOrderId !== input.providerOrderId
      ) {
        throw new DepositPaymentError(
          "PAYMENT_PROVIDER_ERROR",
          "Le montant ou la référence du paiement ne correspond pas au devis.",
        );
      }
      if (payment.status === "paid") {
        wasPaid = true;
        return;
      }
      if (payment.status !== "pending") return;

      const booking = await BookingModel.findById(payment.bookingId)
        .select("status createdAt")
        .session(session)
        .lean();
      const expiredPendingBooking =
        booking?.status === "pending" &&
        (!booking.createdAt || booking.createdAt <= getPendingBookingExpiryCutoff());
      if (
        !booking ||
        !["pending", "confirmed"].includes(booking.status) ||
        payment.expiresAt <= new Date() ||
        expiredPendingBooking
      ) {
        await DepositPaymentModel.updateOne(
          { _id: payment._id, status: "pending" },
          { $set: { status: "expired" } },
          { session },
        );
        return;
      }

      const paymentUpdate = await DepositPaymentModel.updateOne(
        { _id: payment._id, status: "pending", expiresAt: { $gt: new Date() } },
        { $set: { status: "paid", paidAt: new Date() } },
        { session },
      );
      if (paymentUpdate.modifiedCount !== 1) return;

      const bookingUpdate = await BookingModel.updateOne(
        { _id: booking._id, status: { $in: ["pending", "confirmed"] } },
        { $set: { status: "confirmed" } },
        { session },
      );
      if (bookingUpdate.matchedCount !== 1) {
        await DepositPaymentModel.updateOne(
          { _id: payment._id, status: "paid" },
          { $set: { status: "expired" }, $unset: { paidAt: 1 } },
          { session },
        );
        return;
      }
      wasPaid = true;
    });
    return wasPaid;
  } catch (error) {
    if (assertDuplicateKey(error)) return false;
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function verifyPayPalWebhook(
  request: Request,
  event: unknown,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  const headers = request.headers;
  const authAlgo = headers.get("paypal-auth-algo");
  const certUrl = headers.get("paypal-cert-url");
  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionSig = headers.get("paypal-transmission-sig");
  const transmissionTime = headers.get("paypal-transmission-time");
  if (
    !webhookId ||
    !authAlgo ||
    !certUrl ||
    !transmissionId ||
    !transmissionSig ||
    !transmissionTime
  ) {
    return false;
  }

  const accessToken = await paypalAccessToken();
  const result = await paypalRequest(
    "/v1/notifications/verify-webhook-signature",
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: event,
      }),
    },
  );
  return isRecord(result) && result.verification_status === "SUCCESS";
}

export async function capturePayPalOrder(orderId: string): Promise<unknown> {
  const accessToken = await paypalAccessToken();
  return paypalRequest(
    `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    accessToken,
    { method: "POST", body: JSON.stringify({}) },
    paypalRequestId("pe-c-", orderId),
  );
}

export async function refundPayPalCapture(captureId: string, requestId: string): Promise<void> {
  const accessToken = await paypalAccessToken();
  await paypalRequest(
    `/v2/payments/captures/${encodeURIComponent(captureId)}/refund`,
    accessToken,
    { method: "POST", body: JSON.stringify({}) },
    paypalRequestId("pe-r-", requestId),
  );
}

function paypalRequestId(prefix: string, value: string): string {
  const digest = createHash("sha256").update(value).digest("hex").slice(0, 32);
  return `${prefix}${digest}`;
}

export function paypalCaptureDetails(
  value: unknown,
  expectedOrderId: string,
): { id: string; orderId: string; amountCents: number; currency: string } | null {
  if (!isRecord(value) || !Array.isArray(value.purchase_units)) return null;
  const firstUnit = value.purchase_units[0];
  if (!isRecord(firstUnit) || !isRecord(firstUnit.payments)) return null;
  const captures = firstUnit.payments.captures;
  if (!Array.isArray(captures)) return null;
  const capture = captures[0];
  if (!isRecord(capture) || !isRecord(capture.amount)) return null;
  const amount = capture.amount.value;
  const currency = capture.amount.currency_code;
  const relatedIds = isRecord(capture.supplementary_data)
    ? capture.supplementary_data.related_ids
    : null;
  const responseOrderId = isRecord(relatedIds) ? relatedIds.order_id : null;
  if (
    capture.status !== "COMPLETED" ||
    typeof capture.id !== "string" ||
    (responseOrderId !== undefined &&
      responseOrderId !== null &&
      (typeof responseOrderId !== "string" || responseOrderId !== expectedOrderId)) ||
    typeof amount !== "string" ||
    typeof currency !== "string" ||
    !/^\d+(?:\.\d{1,2})?$/.test(amount)
  ) {
    return null;
  }
  return {
    id: capture.id,
    orderId: expectedOrderId,
    amountCents: Math.round(Number(amount) * 100),
    currency: currency.toLowerCase(),
  };
}

export function paypalWebhookCaptureDetails(
  value: unknown,
): { id: string; orderId: string; amountCents: number; currency: string } | null {
  if (!isRecord(value) || !isRecord(value.resource)) return null;
  const resource = value.resource;
  const amount = resource.amount;
  const relatedIds = isRecord(resource.supplementary_data)
    ? resource.supplementary_data.related_ids
    : null;
  const orderId = isRecord(relatedIds) ? relatedIds.order_id : null;
  if (
    value.event_type !== "PAYMENT.CAPTURE.COMPLETED" ||
    resource.status !== "COMPLETED" ||
    !isRecord(amount) ||
    typeof resource.id !== "string" ||
    typeof orderId !== "string" ||
    typeof amount.value !== "string" ||
    typeof amount.currency_code !== "string" ||
    !/^\d+(?:\.\d{1,2})?$/.test(amount.value)
  ) {
    return null;
  }
  return {
    id: resource.id,
    orderId,
    amountCents: Math.round(Number(amount.value) * 100),
    currency: amount.currency_code.toLowerCase(),
  };
}

export async function expireDepositPayments(now = new Date()): Promise<number> {
  await connectToDatabase();
  const result = await DepositPaymentModel.updateMany(
    { status: "pending", expiresAt: { $lte: now } },
    { $set: { status: "expired" } },
  );
  return result.modifiedCount;
}
