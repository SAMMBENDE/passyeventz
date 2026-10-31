import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  createDepositCheckoutLink: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({
  getAdminSession: mocks.getAdminSession,
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
  createDepositCheckoutLink: mocks.createDepositCheckoutLink,
}));

import { POST } from "@/app/api/admin/bookings/[bookingId]/payments/route";

const bookingId = "507f1f77bcf86cd799439011";
const routeContext = { params: Promise.resolve({ bookingId }) };

function request(body: unknown = { provider: "stripe" }, origin = "http://localhost") {
  return new Request(`http://localhost/api/admin/bookings/${bookingId}/payments`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/bookings/[bookingId]/payments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminSession.mockResolvedValue({ role: "admin" });
    mocks.createDepositCheckoutLink.mockImplementation((id, provider) => Promise.resolve({
      id: "payment-1",
      provider,
      checkoutUrl: "https://checkout.stripe.com/session",
      amountCents: 5000,
      expiresAt: "2027-06-02T10:00:00.000Z",
    }));
  });

  it("requires an admin session before creating a payment link", async () => {
    mocks.getAdminSession.mockResolvedValue(null);

    const response = await POST(request(), routeContext);

    expect(response.status).toBe(401);
    expect(mocks.createDepositCheckoutLink).not.toHaveBeenCalled();
  });

  it("rejects cross-origin requests and invalid providers", async () => {
    const crossOrigin = await POST(request({ provider: "stripe" }, "https://attacker.example"), routeContext);
    const invalidProvider = await POST(request({ provider: "cash" }), routeContext);

    expect(crossOrigin.status).toBe(403);
    expect(invalidProvider.status).toBe(400);
    expect(mocks.createDepositCheckoutLink).not.toHaveBeenCalled();
  });

  it("creates a link using the selected provider and request origin", async () => {
    const response = await POST(request({ provider: "paypal" }), routeContext);

    expect(response.status).toBe(200);
    expect(mocks.createDepositCheckoutLink).toHaveBeenCalledWith(
      bookingId,
      "paypal",
      "http://localhost",
    );
    await expect(response.json()).resolves.toMatchObject({
      payment: { provider: "paypal", checkoutUrl: "https://checkout.stripe.com/session" },
    });
  });
});
