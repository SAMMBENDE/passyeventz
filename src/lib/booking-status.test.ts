import { describe, expect, it } from "vitest";

import { canTransitionBookingStatus, nextBookingStatuses } from "@/lib/booking-status";

describe("booking status transitions", () => {
  it("does not allow expired bookings to reserve inventory again", () => {
    expect(nextBookingStatuses("expired")).toEqual([]);
    expect(canTransitionBookingStatus("expired", "confirmed")).toBe(false);
  });

  it("allows pending bookings to be confirmed or cancelled before expiry", () => {
    expect(nextBookingStatuses("pending")).toEqual(["confirmed", "cancelled"]);
    expect(canTransitionBookingStatus("pending", "confirmed")).toBe(true);
  });
});
