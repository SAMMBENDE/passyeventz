import { describe, expect, it } from "vitest";

import { resolveRentalQuoteLineItems } from "@/lib/rental-catalogue";

describe("rental quote selection resolution", () => {
  const rentals = [
    {
      sku: "CHAIR-PREMIUM",
      name: "Chaise premium",
      unitPriceCents: 1250,
      minRentalQuantity: 2,
      stockQuantity: 20,
    },
  ];

  it("uses the trusted product price and permits quantities above the minimum", () => {
    expect(
      resolveRentalQuoteLineItems(
        [{ sku: "chair-premium", quantity: 3 }],
        rentals,
      ),
    ).toEqual({
      ok: true,
      lineItems: [
        {
          id: "CHAIR-PREMIUM",
          label: "Chaise premium",
          quantity: 3,
          unitPriceCents: 1250,
          type: "rental",
        },
      ],
    });
  });

  it("rejects unavailable products, quantities below the minimum, and insufficient stock", () => {
    expect(resolveRentalQuoteLineItems([{ sku: "UNKNOWN", quantity: 1 }], rentals)).toMatchObject({
      ok: false,
      reason: "unavailable",
    });
    expect(resolveRentalQuoteLineItems([{ sku: "CHAIR-PREMIUM", quantity: 1 }], rentals)).toMatchObject({
      ok: false,
      reason: "below-minimum",
      minimum: 2,
    });
    expect(resolveRentalQuoteLineItems([{ sku: "CHAIR-PREMIUM", quantity: 21 }], rentals)).toMatchObject({
      ok: false,
      reason: "out-of-stock",
    });
  });
});
