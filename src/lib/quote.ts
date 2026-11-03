export const quoteStatuses = [
  "draft",
  "submitted",
  "revised",
  "approved",
  "rejected",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type QuoteStatus = (typeof quoteStatuses)[number];

export type QuoteLineItemInput = {
  id: string;
  label: string;
  quantity: number;
  unitPriceCents: number;
  type?: "service" | "rental" | "addon";
};

export type QuoteCalculationInput = {
  items: QuoteLineItemInput[];
  deliveryCents?: number;
  cleaningCents?: number;
  taxRate?: number;
  depositPercent?: number;
  advancePercent?: number;
};

export type QuoteCalculationResult = {
  subtotalCents: number;
  deliveryCents: number;
  cleaningCents: number;
  taxCents: number;
  totalCents: number;
  depositCents: number;
  advancePaymentCents: number;
  balanceDueCents: number;
  taxRateBasisPoints: number;
  depositBasisPoints: number;
  advanceBasisPoints: number;
};

const statusTransitions: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ["submitted", "revised", "rejected"],
  submitted: ["approved", "revised", "rejected", "cancelled"],
  revised: ["submitted", "approved", "rejected", "cancelled"],
  approved: ["confirmed", "cancelled"],
  rejected: ["draft"],
  confirmed: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function calculateQuote({
  items,
  deliveryCents = 0,
  cleaningCents = 0,
  taxRate = 0.2,
  depositPercent = 0.4,
  advancePercent = 0.4,
}: QuoteCalculationInput): QuoteCalculationResult {
  const subtotalCents = items.reduce(
    (total, item) => total + Math.max(0, item.quantity) * Math.max(0, item.unitPriceCents),
    0,
  );

  const safeDelivery = Math.max(0, deliveryCents);
  const safeCleaning = Math.max(0, cleaningCents);
  const safeTaxRate = Math.max(0, taxRate);
  const safeDepositPercent = Math.max(0, Math.min(depositPercent, 1));
  const safeAdvancePercent = Math.max(0, Math.min(advancePercent, 1));

  const taxableBase = subtotalCents + safeDelivery + safeCleaning;
  const taxCents = Math.round(taxableBase * safeTaxRate);
  const totalCents = subtotalCents + safeDelivery + safeCleaning + taxCents;
  const depositCents = Math.round(totalCents * safeDepositPercent);
  const advancePaymentCents = Math.round(totalCents * safeAdvancePercent);
  const balanceDueCents = Math.max(totalCents - advancePaymentCents, 0);

  return {
    subtotalCents,
    deliveryCents: safeDelivery,
    cleaningCents: safeCleaning,
    taxCents,
    totalCents,
    depositCents,
    advancePaymentCents,
    balanceDueCents,
    taxRateBasisPoints: Math.round(safeTaxRate * 10_000),
    depositBasisPoints: Math.round(safeDepositPercent * 10_000),
    advanceBasisPoints: Math.round(safeAdvancePercent * 10_000),
  };
}

export function validateQuotePrices(
  items: Array<{ id: string; quantity: number; unitPriceCents: number }>,
  trustedProducts: Array<{ id: string; unitPriceCents: number }>,
): { isValid: boolean; errors: string[] } {
  const trustedMap = new Map(
    trustedProducts.map((product) => [product.id, product.unitPriceCents]),
  );
  const errors: string[] = [];

  for (const item of items) {
    const trustedPrice = trustedMap.get(item.id);

    if (trustedPrice === undefined) {
      errors.push(`${item.id} is not present in the trusted catalog`);
      continue;
    }

    if (item.unitPriceCents !== trustedPrice) {
      errors.push(`${item.id} unit price differs from trusted server price`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function transitionQuoteStatus(
  currentStatus: QuoteStatus,
  nextStatus: QuoteStatus,
): boolean {
  return Boolean(statusTransitions[currentStatus]?.includes(nextStatus));
}

export function formatPriceCents(value: number): string {
  return `${(value / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}
