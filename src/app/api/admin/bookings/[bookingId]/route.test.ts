import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  connectToDatabase: vi.fn(),
  expirePendingBookings: vi.fn(),
  findById: vi.fn(),
  findOneAndUpdate: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({
  getAdminSession: mocks.getAdminSession,
}));

vi.mock("@/lib/mongodb", () => ({
  connectToDatabase: mocks.connectToDatabase,
}));

vi.mock("@/lib/booking-expiration", () => ({
  expirePendingBookings: mocks.expirePendingBookings,
}));

vi.mock("@/models/booking", () => ({
  BookingModel: {
    findById: mocks.findById,
    findOneAndUpdate: mocks.findOneAndUpdate,
  },
}));

import { PATCH } from "@/app/api/admin/bookings/[bookingId]/route";

const bookingId = "507f1f77bcf86cd799439011";
const updatedAt = "2027-06-01T10:00:00.000Z";
const context = { params: Promise.resolve({ bookingId }) };

function request(status = "confirmed", timestamp = updatedAt) {
  return new Request(`http://localhost/api/admin/bookings/${bookingId}`, {
    method: "PATCH",
    headers: { origin: "http://localhost", "content-type": "application/json" },
    body: JSON.stringify({ status, updatedAt: timestamp }),
  });
}

function currentBooking() {
  mocks.findById.mockReturnValue({
    select: () => ({
      lean: () => Promise.resolve({ status: "pending", updatedAt: new Date(updatedAt) }),
    }),
  });
}

describe("PATCH /api/admin/bookings/[bookingId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminSession.mockResolvedValue({ role: "admin" });
    mocks.connectToDatabase.mockResolvedValue(undefined);
    mocks.expirePendingBookings.mockResolvedValue(0);
    currentBooking();
    mocks.findOneAndUpdate.mockReturnValue({
      select: () => ({
        lean: () =>
          Promise.resolve({ status: "confirmed", updatedAt: new Date("2027-06-01T10:01:00Z") }),
      }),
    });
  });

  it("transitions a booking only from its current status and timestamp", async () => {
    const response = await PATCH(request(), context);

    expect(response.status).toBe(200);
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: bookingId, status: "pending", updatedAt: new Date(updatedAt) },
      { $set: { status: "confirmed" } },
      { new: true },
    );
  });

  it("rejects invalid status transitions", async () => {
    const response = await PATCH(request("completed"), context);

    expect(response.status).toBe(409);
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects stale updates", async () => {
    const response = await PATCH(request("confirmed", "2027-06-01T09:00:00.000Z"), context);

    expect(response.status).toBe(409);
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
