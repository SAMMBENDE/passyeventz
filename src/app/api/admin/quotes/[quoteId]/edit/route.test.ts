import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  connectToDatabase: vi.fn(),
  findById: vi.fn(),
  findOneAndUpdate: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({
  getAdminSession: mocks.getAdminSession,
}));

vi.mock("@/lib/mongodb", () => ({
  connectToDatabase: mocks.connectToDatabase,
}));

vi.mock("@/models/quote", () => ({
  QuoteModel: {
    findById: mocks.findById,
    findOneAndUpdate: mocks.findOneAndUpdate,
  },
}));

import { PATCH } from "@/app/api/admin/quotes/[quoteId]/edit/route";

const quoteId = "507f1f77bcf86cd799439011";
const updatedAt = "2026-10-30T12:00:00.000Z";
const routeContext = { params: Promise.resolve({ quoteId }) };

const validPayload = {
  updatedAt,
  eventType: "Mariage",
  eventDate: "2027-06-12",
  guestCount: 120,
  services: ["Décoration"],
  note: "Palette ivoire",
  lineItems: [
    {
      id: "DECORATION",
      label: "Décoration de salle",
      quantity: 1,
      unitPriceCents: 25_000,
      type: "service",
    },
    {
      id: "CHAIR-PREMIUM",
      label: "Chaises premium",
      quantity: 20,
      unitPriceCents: 1200,
      type: "rental",
    },
  ],
  deliveryCents: 4000,
  cleaningCents: 1500,
  taxRateBasisPoints: 2000,
  depositBasisPoints: 3000,
  advanceBasisPoints: 4000,
};

function request(body: unknown, origin = "http://localhost") {
  return new Request(`http://localhost/api/admin/quotes/${quoteId}/edit`, {
    method: "PATCH",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setCurrentQuote(
  status: string,
  timestamp = new Date(updatedAt),
  cleaningChoice: "passyeventz" | "customer" = "passyeventz",
) {
  mocks.findById.mockReturnValue({
    select: () => ({ lean: () => Promise.resolve({ status, updatedAt: timestamp, cleaningChoice }) }),
  });
}

describe("PATCH /api/admin/quotes/[quoteId]/edit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminSession.mockResolvedValue({ role: "admin" });
    mocks.connectToDatabase.mockResolvedValue(undefined);
  });

  it("returns JSON unauthorized before touching the database", async () => {
    mocks.getAdminSession.mockResolvedValue(null);
    const response = await PATCH(request(validPayload), routeContext);
    expect(response.status).toBe(401);
    expect(mocks.connectToDatabase).not.toHaveBeenCalled();
  });

  it("rejects cross-origin and invalid edit requests", async () => {
    const crossOrigin = await PATCH(
      request(validPayload, "https://attacker.example"),
      routeContext,
    );
    const invalidPayload = await PATCH(
      request({ ...validPayload, lineItems: [] }),
      routeContext,
    );

    expect(crossOrigin.status).toBe(403);
    expect(invalidPayload.status).toBe(400);
    expect(mocks.connectToDatabase).not.toHaveBeenCalled();
  });

  it("recalculates pricing on the server and returns the revised quote", async () => {
    setCurrentQuote("submitted");
    const result = {
      _id: { toString: () => quoteId },
      reference: "PE-2027-0001",
      status: "revised",
      updatedAt: new Date("2026-10-30T12:05:00Z"),
    };
    mocks.findOneAndUpdate.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve(result) }),
    });

    const response = await PATCH(request(validPayload), routeContext);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.quote.status).toBe("revised");
    expect(body.quote.pricing).toMatchObject({
      subtotalCents: 49_000,
      deliveryCents: 4000,
      cleaningCents: 21_600,
      taxCents: 14_920,
      totalCents: 89_520,
      depositCents: 35_808,
      advancePaymentCents: 35_808,
      balanceDueCents: 53_712,
      taxRateBasisPoints: 2000,
    });

    const [filter, update] = mocks.findOneAndUpdate.mock.calls[0];
    expect(filter).toMatchObject({ _id: quoteId, status: "submitted", updatedAt: new Date(updatedAt) });
    expect(update.$set).toMatchObject({
      status: "revised",
      eventType: "Mariage",
      lineItems: validPayload.lineItems,
    });
    expect(update.$set.pricing.totalCents).toBe(89_520);
  });

  it("waives washing and applies the fixed 40% deposit when the customer washes", async () => {
    setCurrentQuote("submitted", new Date(updatedAt), "customer");
    mocks.findOneAndUpdate.mockReturnValue({
      select: () => ({
        lean: () =>
          Promise.resolve({
            _id: { toString: () => quoteId },
            reference: "PE-2027-0001",
            status: "revised",
            updatedAt: new Date("2026-10-30T12:05:00Z"),
          }),
      }),
    });

    const response = await PATCH(
      request({ ...validPayload, depositBasisPoints: 3000, cleaningCents: 90_000 }),
      routeContext,
    );
    const body = await response.json();

    expect(body.quote.pricing.cleaningCents).toBe(0);
    expect(body.quote.pricing.depositBasisPoints).toBe(4000);
    expect(body.quote.pricing.depositCents).toBe(25_440);
  });

  it("disallows editing approved quotes and rejects stale edits", async () => {
    setCurrentQuote("approved");
    const approvedResponse = await PATCH(request(validPayload), routeContext);
    expect(approvedResponse.status).toBe(409);

    setCurrentQuote("submitted", new Date("2026-10-30T12:01:00Z"));
    const staleResponse = await PATCH(request(validPayload), routeContext);
    expect(staleResponse.status).toBe(409);
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
