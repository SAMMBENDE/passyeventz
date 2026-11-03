import { describe, expect, it } from "vitest";

import {
  bookingCreateSchema,
  quoteEditorSchema,
  quoteRequestSchema,
  quoteReviewSchema,
  rentalCreateSchema,
  rentalQuoteRequestSchema,
  rentalUpdateSchema,
} from "@/lib/validation";

describe("rental validation", () => {
  it("accepts valid rental data and applies the active default", () => {
    const result = rentalCreateSchema.parse({
      sku: "CHAIR-PREMIUM",
      name: "Chaise premium",
      category: "MOBILIER",
      subcategory: "Chaises",
      unitPriceCents: 1200,
      replacementPriceCents: 9000,
      priceUnit: "item",
      minRentalQuantity: 1,
      stockQuantity: 40,
      imageUrl: "/images/location/chaise.webp",
    });

    expect(result.isActive).toBe(true);
  });

  it("rejects fractional stock, negative prices, and unknown fields", () => {
    expect(
      rentalCreateSchema.safeParse({
        sku: "CHAIR-PREMIUM",
        name: "Chaise premium",
        category: "MOBILIER",
        subcategory: "Chaises",
        unitPriceCents: -1,
        replacementPriceCents: 9000,
        priceUnit: "item",
        minRentalQuantity: 1,
        stockQuantity: 2.5,
        imageUrl: "/images/location/chaise.webp",
      }).success,
    ).toBe(false);
    expect(
      rentalCreateSchema.safeParse({
        sku: "CHAIR-PREMIUM",
        name: "Chaise premium",
        category: "MOBILIER",
        subcategory: "Chaises",
        unitPriceCents: 1200,
        replacementPriceCents: 9000,
        priceUnit: "item",
        minRentalQuantity: 3,
        stockQuantity: 2,
        imageUrl: "/images/location/chaise.webp",
      }).success,
    ).toBe(false);
    expect(
      rentalCreateSchema.safeParse({
        sku: "CHAIR-PREMIUM",
        name: "Chaise premium",
        category: "MOBILIER",
        subcategory: "Chaises",
        unitPriceCents: 1200,
        replacementPriceCents: 9000,
        priceUnit: "item",
        minRentalQuantity: 1,
        stockQuantity: 40,
        imageUrl: "/images/location/chaise.webp",
        ownerId: "untrusted",
      }).success,
    ).toBe(false);
  });

  it("requires at least one field for an update", () => {
    expect(rentalUpdateSchema.safeParse({}).success).toBe(false);
    expect(rentalUpdateSchema.safeParse({ stockQuantity: 12 }).success).toBe(true);
  });
});

describe("quote request validation", () => {
  const validQuoteRequest = {
    eventType: "Mariage",
    eventDate: "2027-06-12",
    guestCount: 120,
    email: "CLIENT@EXAMPLE.COM",
    services: ["Décoration de salle"],
  };

  it("validates the event details and normalizes email", () => {
    expect(quoteRequestSchema.parse(validQuoteRequest).email).toBe("client@example.com");
  });

  it("rejects malformed dates, empty service lists, and duplicate services", () => {
    expect(quoteRequestSchema.safeParse({ ...validQuoteRequest, eventDate: "2027-02-30" }).success).toBe(false);
    expect(quoteRequestSchema.safeParse({ ...validQuoteRequest, services: [] }).success).toBe(false);
    expect(
      quoteRequestSchema.safeParse({
        ...validQuoteRequest,
        services: ["Location de mobilier", "Location de mobilier"],
      }).success,
    ).toBe(false);
  });

  it("accepts rental selections but rejects duplicate SKUs and client-supplied prices", () => {
    const rentalRequest = {
      ...validQuoteRequest,
      rentalSelections: [{ sku: "CHAIR-PREMIUM", quantity: 4 }],
    };
    expect(rentalQuoteRequestSchema.safeParse(rentalRequest).success).toBe(true);
    expect(
      rentalQuoteRequestSchema.safeParse({
        ...rentalRequest,
        rentalSelections: [
          { sku: "CHAIR-PREMIUM", quantity: 4 },
          { sku: "chair-premium", quantity: 2 },
        ],
      }).success,
    ).toBe(false);
    expect(
      rentalQuoteRequestSchema.safeParse({
        ...rentalRequest,
        unitPriceCents: 1,
      }).success,
    ).toBe(false);
  });
});

describe("booking validation", () => {
  const validBooking = {
    quoteId: "507f1f77bcf86cd799439011",
    startsAt: "2027-06-12T10:00:00+02:00",
    endsAt: "2027-06-13T10:00:00+02:00",
    rentalItems: [{ rentalId: "507f191e810c19729de860ea", quantity: 3 }],
  };

  it("accepts a valid quote reference and date interval", () => {
    expect(bookingCreateSchema.safeParse(validBooking).success).toBe(true);
  });

  it("rejects invalid quote ids and intervals that end before they start", () => {
    expect(bookingCreateSchema.safeParse({ ...validBooking, quoteId: "not-an-object-id" }).success).toBe(false);
    expect(
      bookingCreateSchema.safeParse({
        ...validBooking,
        endsAt: "2027-06-12T09:00:00+02:00",
      }).success,
    ).toBe(false);
  });

  describe("admin quote validation", () => {
    it("only accepts explicit approval or rejection statuses", () => {
      expect(quoteReviewSchema.safeParse({ status: "approved" }).success).toBe(true);
      expect(quoteReviewSchema.safeParse({ status: "rejected" }).success).toBe(true);
      expect(quoteReviewSchema.safeParse({ status: "confirmed" }).success).toBe(false);
      expect(quoteReviewSchema.safeParse({ status: "approved", pricing: {} }).success).toBe(false);
    });

    it("requires unique quote line references and bounded rates", () => {
      const validEdit = {
        updatedAt: "2026-10-30T12:00:00.000Z",
        eventType: "Mariage",
        eventDate: "2027-06-12",
        guestCount: 120,
        services: ["Décoration"],
        lineItems: [
          {
            id: "DECORATION",
            label: "Décoration",
            quantity: 1,
            unitPriceCents: 25_000,
            type: "service" as const,
          },
        ],
        deliveryCents: 0,
        cleaningCents: 0,
        taxRateBasisPoints: 2000,
        depositBasisPoints: 3000,
        advanceBasisPoints: 4000,
      };

      expect(quoteEditorSchema.safeParse(validEdit).success).toBe(true);
      expect(
        quoteEditorSchema.safeParse({
          ...validEdit,
          taxRateBasisPoints: 20_000,
        }).success,
      ).toBe(false);
      expect(
        quoteEditorSchema.safeParse({
          ...validEdit,
          lineItems: [...validEdit.lineItems, ...validEdit.lineItems],
        }).success,
      ).toBe(false);
    });
  });

  it("rejects duplicated rental selections and allows event bookings without rentals", () => {
    expect(
      bookingCreateSchema.safeParse({
        ...validBooking,
        rentalItems: [validBooking.rentalItems[0], validBooking.rentalItems[0]],
      }).success,
    ).toBe(false);
    expect(bookingCreateSchema.safeParse({ ...validBooking, rentalItems: [] }).success).toBe(true);
  });
});
