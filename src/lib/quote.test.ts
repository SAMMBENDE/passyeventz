import { describe, expect, it } from "vitest";

import {
  calculateQuote,
  transitionQuoteStatus,
  validateQuotePrices,
} from "@/lib/quote";

describe("quote calculations", () => {
  it("calculates subtotal, taxes, deposit and remaining balance correctly", () => {
    const result = calculateQuote({
      items: [
        { id: "srv-1", label: "Décoration de salle", unitPriceCents: 25000, quantity: 1, type: "service" },
        { id: "prod-3", label: "Chaises premium", unitPriceCents: 1200, quantity: 20, type: "rental" },
      ],
      deliveryCents: 4000,
      cleaningCents: 1500,
      taxRate: 0.2,
      depositPercent: 0.4,
      advancePercent: 0.4,
    });

    expect(result.subtotalCents).toBe(49000);
    expect(result.deliveryCents).toBe(4000);
    expect(result.cleaningCents).toBe(1500);
    expect(result.taxCents).toBe(10900);
    expect(result.totalCents).toBe(65400);
    expect(result.depositCents).toBe(26160);
    expect(result.advancePaymentCents).toBe(26160);
    expect(result.balanceDueCents).toBe(39240);
  });

  it("rejects client-submitted prices that do not match trusted server prices", () => {
    const trustedProducts = [
      { id: "prod-1", unitPriceCents: 1500 },
      { id: "prod-2", unitPriceCents: 900 },
    ];

    const result = validateQuotePrices(
      [
        { id: "prod-1", quantity: 2, unitPriceCents: 1500 },
        { id: "prod-2", quantity: 1, unitPriceCents: 1200 },
      ],
      trustedProducts,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("prod-2 unit price differs from trusted server price");
  });

  it("allows valid status transitions for quotes", () => {
    expect(transitionQuoteStatus("draft", "submitted")).toBe(true);
    expect(transitionQuoteStatus("submitted", "approved")).toBe(true);
    expect(transitionQuoteStatus("submitted", "rejected")).toBe(true);
    expect(transitionQuoteStatus("revised", "rejected")).toBe(true);
    expect(transitionQuoteStatus("approved", "draft")).toBe(false);
    expect(transitionQuoteStatus("rejected", "approved")).toBe(false);
  });
});
