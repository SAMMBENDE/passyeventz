import { describe, expect, it } from "vitest";

import { getAvailableRentalQuantity } from "@/lib/inventory";

const rentalId = "507f191e810c19729de860ea";
const startsAt = new Date("2027-06-12T10:00:00Z");
const endsAt = new Date("2027-06-13T10:00:00Z");

describe("rental inventory availability", () => {
  it("subtracts quantities held by overlapping reservations", () => {
    const available = getAvailableRentalQuantity(10, rentalId, startsAt, endsAt, [
      {
        startsAt: new Date("2027-06-12T12:00:00Z"),
        endsAt: new Date("2027-06-13T12:00:00Z"),
        status: "confirmed",
        rentalItems: [{ rentalId, quantity: 4 }],
      },
      {
        startsAt,
        endsAt,
        status: "pending",
        rentalItems: [{ rentalId: "507f191e810c19729de860eb", quantity: 3 }],
      },
    ]);

    expect(available).toBe(6);
  });

  it("allows bookings with adjacent, non-overlapping date intervals", () => {
    const available = getAvailableRentalQuantity(5, rentalId, startsAt, endsAt, [
      {
        startsAt: new Date("2027-06-11T10:00:00Z"),
        endsAt: startsAt,
        status: "confirmed",
        rentalItems: [{ rentalId, quantity: 5 }],
      },
      {
        startsAt: endsAt,
        endsAt: new Date("2027-06-14T10:00:00Z"),
        status: "confirmed",
        rentalItems: [{ rentalId, quantity: 5 }],
      },
    ]);

    expect(available).toBe(5);
  });

  it("does not reserve stock for cancelled or completed bookings", () => {
    const available = getAvailableRentalQuantity(5, rentalId, startsAt, endsAt, [
      {
        startsAt,
        endsAt,
        status: "cancelled",
        rentalItems: [{ rentalId, quantity: 5 }],
      },
      {
        startsAt,
        endsAt,
        status: "completed",
        rentalItems: [{ rentalId, quantity: 5 }],
      },
    ]);

    expect(available).toBe(5);
  });

  it("never reports negative availability when existing data is over-reserved", () => {
    expect(
      getAvailableRentalQuantity(2, rentalId, startsAt, endsAt, [
        {
          startsAt,
          endsAt,
          status: "in_progress",
          rentalItems: [{ rentalId, quantity: 3 }],
        },
      ]),
    ).toBe(0);
  });
});
