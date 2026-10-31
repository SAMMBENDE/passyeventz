import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  markDepositAsPaid: vi.fn(),
  connectToDatabase: vi.fn(),
  findById: vi.fn(),
  updateOne: vi.fn(),
}));

vi.mock("@/lib/deposit-payments", () => ({
  DepositPaymentError: class DepositPaymentError extends Error {
    constructor(
      readonly code: string,
      message: string,
    ) {
      super(message);
    }
  },
  markDepositAsPaid: mocks.markDepositAsPaid,
}));

vi.mock("@/models/deposit-payment", () => ({
  DepositPaymentModel: {
    findById: mocks.findById,
    updateOne: mocks.updateOne,
  },
}));

vi.mock("@/lib/mongodb", () => ({
  connectToDatabase: mocks.connectToDatabase,
}));

import { POST } from "@/app/api/payments/stripe/webhook/route";

const stripeKey = "sk_test_example";
const webhookSecret = "whsec_example";
const paymentId = "507f1f77bcf86cd799439011";
const payload = JSON.stringify({
  id: "evt_test",
  object: "event",
  api_version: "2025-03-31.basil",
  created: 1_780_000_000,
  data: {
    object: {
      id: "cs_test_123",
      object: "checkout.session",
      amount_total: 5000,
      currency: "eur",
      payment_status: "paid",
      payment_intent: "pi_test_123",
      metadata: { paymentId },
    },
  },
  livemode: false,
  pending_webhooks: 1,
  request: null,
  type: "checkout.session.completed",
});

function signedRequest(body: string, signature: string) {
  return new Request("http://localhost/api/payments/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": signature, "content-type": "application/json" },
    body,
  });
}

describe("POST /api/payments/stripe/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = stripeKey;
    process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
    mocks.connectToDatabase.mockResolvedValue(undefined);
    mocks.findById.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve({ provider: "stripe" }) }),
    });
    mocks.markDepositAsPaid.mockResolvedValue(true);
  });

  it("rejects unsigned events without settling a payment", async () => {
    const response = await POST(signedRequest(payload, "invalid-signature"));

    expect(response.status).toBe(400);
    expect(mocks.markDepositAsPaid).not.toHaveBeenCalled();
  });

  it("settles only a signed completed checkout using its provider values", async () => {
    const stripe = new Stripe(stripeKey);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    });

    const response = await POST(signedRequest(payload, signature));

    expect(response.status).toBe(200);
    expect(mocks.markDepositAsPaid).toHaveBeenCalledWith({
      paymentId,
      provider: "stripe",
      providerOrderId: "cs_test_123",
      amountCents: 5000,
      currency: "eur",
    });
  });
});
