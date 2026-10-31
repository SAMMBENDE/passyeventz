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

import { PATCH } from "@/app/api/admin/quotes/[quoteId]/route";

const quoteId = "507f1f77bcf86cd799439011";
const routeContext = { params: Promise.resolve({ quoteId }) };

function request(body: unknown, origin = "http://localhost") {
  return new Request(`http://localhost/api/admin/quotes/${quoteId}`, {
    method: "PATCH",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setCurrentQuote(status: string) {
  mocks.findById.mockReturnValue({
    select: () => ({
      lean: () =>
        Promise.resolve({
          status,
          pricing: { totalCents: 25_000 },
          lineItems: [{ id: "DECORATION" }],
        }),
    }),
  });
}

describe("PATCH /api/admin/quotes/[quoteId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminSession.mockResolvedValue({ role: "admin" });
    mocks.connectToDatabase.mockResolvedValue(undefined);
  });

  it("returns a JSON 401 before request parsing or database access when unauthenticated", async () => {
    mocks.getAdminSession.mockResolvedValue(null);

    const response = await PATCH(request({ status: "approved" }), routeContext);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "Votre session a expiré. Reconnectez-vous.",
    });
    expect(mocks.connectToDatabase).not.toHaveBeenCalled();
  });

  it("rejects cross-origin status changes", async () => {
    const response = await PATCH(
      request({ status: "approved" }, "https://attacker.example"),
      routeContext,
    );

    expect(response.status).toBe(403);
    expect(mocks.connectToDatabase).not.toHaveBeenCalled();
  });

  it("rejects invalid quote IDs and unsupported status values", async () => {
    const invalidIdResponse = await PATCH(request({ status: "approved" }), {
      params: Promise.resolve({ quoteId: "invalid" }),
    });
    const invalidStatusResponse = await PATCH(request({ status: "confirmed" }), routeContext);

    expect(invalidIdResponse.status).toBe(400);
    expect(invalidStatusResponse.status).toBe(400);
    expect(mocks.connectToDatabase).not.toHaveBeenCalled();
  });

  it("updates submitted quotes only when the status transition is allowed", async () => {
    setCurrentQuote("submitted");
    mocks.findOneAndUpdate.mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve({ reference: "PE-2027-0001", status: "approved" }),
      }),
    });

    const response = await PATCH(request({ status: "approved" }), routeContext);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      quote: { reference: "PE-2027-0001", status: "approved" },
    });
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: quoteId, status: "submitted" },
      { $set: { status: "approved" } },
      { new: true },
    );
  });

  it("rejects invalid transitions and concurrent status changes", async () => {
    setCurrentQuote("confirmed");
    const invalidTransition = await PATCH(request({ status: "rejected" }), routeContext);
    expect(invalidTransition.status).toBe(409);
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();

    setCurrentQuote("submitted");
    mocks.findOneAndUpdate.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve(null) }),
    });
    const staleUpdate = await PATCH(request({ status: "rejected" }), routeContext);
    expect(staleUpdate.status).toBe(409);
  });

  it("does not allow approval until the quote has priced line items", async () => {
    mocks.findById.mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve({ status: "submitted", lineItems: [], pricing: undefined }),
      }),
    });

    const response = await PATCH(request({ status: "approved" }), routeContext);

    expect(response.status).toBe(409);
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("returns a generic service error when MongoDB fails", async () => {
    mocks.connectToDatabase.mockRejectedValue(new Error("private database detail"));

    const response = await PATCH(request({ status: "approved" }), routeContext);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: "Impossible de modifier ce devis pour le moment.",
    });
  });
});
