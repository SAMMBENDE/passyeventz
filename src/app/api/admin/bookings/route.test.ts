import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  connectToDatabase: vi.fn(),
  findById: vi.fn(),
  createBookingFromApprovedQuote: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({
  getAdminSession: mocks.getAdminSession,
}));

vi.mock("@/lib/mongodb", () => ({
  connectToDatabase: mocks.connectToDatabase,
}));

vi.mock("@/lib/bookings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bookings")>();
  return {
    ...actual,
    createBookingFromApprovedQuote: mocks.createBookingFromApprovedQuote,
  };
});

vi.mock("@/models/quote", () => ({
  QuoteModel: { findById: mocks.findById },
}));

vi.mock("@/models/rental", () => ({
  RentalModel: { find: vi.fn() },
}));

import { POST } from "@/app/api/admin/bookings/route";

const quoteId = "507f1f77bcf86cd799439011";
const body = {
  quoteId,
  startsAt: "2027-06-12T10:00:00+02:00",
  endsAt: "2027-06-13T10:00:00+02:00",
};

function request(data: unknown = body, origin = "http://localhost") {
  return new Request("http://localhost/api/admin/bookings", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(data),
  });
}

describe("POST /api/admin/bookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminSession.mockResolvedValue({ role: "admin" });
    mocks.connectToDatabase.mockResolvedValue(undefined);
    mocks.findById.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve({ status: "approved", lineItems: [] }) }),
    });
    mocks.createBookingFromApprovedQuote.mockResolvedValue({
      id: "507f1f77bcf86cd799439012",
      reference: "PE-B-2027-12345678",
    });
  });

  it("requires an admin session before database access", async () => {
    mocks.getAdminSession.mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(mocks.connectToDatabase).not.toHaveBeenCalled();
  });

  it("rejects cross-origin and invalid booking requests", async () => {
    const crossOrigin = await POST(request(body, "https://attacker.example"));
    const invalidBody = await POST(request({ ...body, endsAt: body.startsAt }));

    expect(crossOrigin.status).toBe(403);
    expect(invalidBody.status).toBe(400);
    expect(mocks.findById).not.toHaveBeenCalled();
  });

  it("creates a booking from an approved quote without rental items", async () => {
    const response = await POST(request());

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      booking: { reference: "PE-B-2027-12345678" },
    });
    expect(mocks.createBookingFromApprovedQuote).toHaveBeenCalledWith({
      quoteId,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      rentalItems: [],
    });
  });

  it("rejects quotes that are not approved", async () => {
    mocks.findById.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve({ status: "submitted", lineItems: [] }) }),
    });

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(mocks.createBookingFromApprovedQuote).not.toHaveBeenCalled();
  });
});
