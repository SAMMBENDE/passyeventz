import { Types } from "mongoose";
import { describe, expect, it } from "vitest";

import { BookingModel } from "@/models/booking";
import { QuoteModel } from "@/models/quote";
import { RentalModel } from "@/models/rental";

describe("Mongoose models", () => {
  it("applies rental defaults and rejects invalid quantities", async () => {
    const rental = new RentalModel({
      sku: "CHAIR-PREMIUM",
      name: "Chaise premium",
      category: "Mobilier",
      unitPriceCents: 1200,
      stockQuantity: 40,
    });

    expect(rental.isActive).toBe(true);
    await rental.validate();
    await expect(
      new RentalModel({
        sku: "CHAIR-PREMIUM",
        name: "Chaise premium",
        category: "Mobilier",
        unitPriceCents: 1200,
        stockQuantity: 1.5,
      }).validate(),
    ).rejects.toMatchObject({ errors: { stockQuantity: expect.anything() } });
  });

  it("accepts a quote request document without priced line items", async () => {
    const quote = new QuoteModel({
      reference: "PE-2027-0001",
      eventType: "Mariage",
      eventDate: new Date("2027-06-12"),
      guestCount: 120,
      customer: { email: "client@example.com" },
      services: ["Décoration de salle"],
    });

    expect(quote.status).toBe("submitted");
    expect(quote.lineItems).toHaveLength(0);
    await quote.validate();
  });

  it("rejects bookings whose end is not after their start", async () => {
    const booking = new BookingModel({
      reference: "PE-B-2027-0001",
      quoteId: new Types.ObjectId(),
      startsAt: new Date("2027-06-12T10:00:00Z"),
      endsAt: new Date("2027-06-12T09:00:00Z"),
      customer: { email: "client@example.com" },
      eventType: "Mariage",
      rentalItems: [
        {
          rentalId: new Types.ObjectId(),
          sku: "CHAIR-PREMIUM",
          name: "Chaise premium",
          quantity: 1,
          unitPriceCents: 1200,
        },
      ],
    });

    await expect(booking.validate()).rejects.toMatchObject({
      errors: { endsAt: expect.anything() },
    });
  });

  it("accepts event bookings without rental items", async () => {
    const booking = new BookingModel({
      reference: "PE-B-2027-0002",
      quoteId: new Types.ObjectId(),
      startsAt: new Date("2027-06-12T10:00:00Z"),
      endsAt: new Date("2027-06-13T10:00:00Z"),
      customer: { email: "client@example.com" },
      eventType: "Baby shower",
      rentalItems: [],
    });

    await expect(booking.validate()).resolves.toBeUndefined();
  });

  it("accepts expired booking records", async () => {
    const booking = new BookingModel({
      reference: "PE-B-2027-0003",
      quoteId: new Types.ObjectId(),
      startsAt: new Date("2027-06-12T10:00:00Z"),
      endsAt: new Date("2027-06-13T10:00:00Z"),
      customer: { email: "client@example.com" },
      eventType: "Mariage",
      rentalItems: [],
      status: "expired",
    });

    await expect(booking.validate()).resolves.toBeUndefined();
  });
});
