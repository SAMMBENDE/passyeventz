import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateMany: vi.fn(),
}));

vi.mock("@/models/booking", () => ({
  BookingModel: { updateMany: mocks.updateMany },
}));

import {
  expirePendingBookings,
  getPendingBookingExpiryCutoff,
  pendingBookingHoldDurationMs,
} from "@/lib/booking-expiration";

describe("pending booking expiration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses a 24-hour hold duration", () => {
    const now = new Date("2027-06-13T10:00:00.000Z");
    expect(pendingBookingHoldDurationMs).toBe(24 * 60 * 60 * 1000);
    expect(getPendingBookingExpiryCutoff(now).toISOString()).toBe("2027-06-12T10:00:00.000Z");
  });

  it("expires only pending bookings at least 24 hours old", async () => {
    mocks.updateMany.mockResolvedValue({ modifiedCount: 3 });
    const now = new Date("2027-06-13T10:00:00.000Z");

    await expect(expirePendingBookings(now)).resolves.toBe(3);

    expect(mocks.updateMany).toHaveBeenCalledWith(
      {
        status: "pending",
        createdAt: { $lte: new Date("2027-06-12T10:00:00.000Z") },
      },
      { $set: { status: "expired" } },
    );
  });
});
