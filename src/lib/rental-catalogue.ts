import type { Rental } from "@/models/rental";

export const rentalCategories = ["MOBILIER", "VAISSELLE", "ACCESSOIRES"] as const;
export type RentalCategory = (typeof rentalCategories)[number];

export const rentalPriceUnits = ["item", "pair", "set", "dozen"] as const;
export type RentalPriceUnit = (typeof rentalPriceUnits)[number];

export const rentalPriceUnitLabels: Record<RentalPriceUnit, string> = {
  item: "l’unité",
  pair: "la paire",
  set: "le set",
  dozen: "la douzaine",
};

export type RentalQuoteSelection = {
  sku: string;
  quantity: number;
};

type TrustedRentalForQuote = {
  sku: string;
  name: string;
  unitPriceCents: number;
  minRentalQuantity?: number;
  stockQuantity: number;
};

type RentalQuoteLineItem = {
  id: string;
  label: string;
  quantity: number;
  unitPriceCents: number;
  type: "rental";
};

export type RentalQuoteResolution =
  | { ok: true; lineItems: RentalQuoteLineItem[] }
  | {
      ok: false;
      reason: "unavailable" | "below-minimum" | "out-of-stock";
      productName?: string;
      minimum?: number;
    };

function canonicalCategory(category: string): RentalCategory {
  const normalized = category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("fr");
  if (normalized === "MOBILIER") return "MOBILIER";
  if (normalized === "VAISSELLE") return "VAISSELLE";
  return "ACCESSOIRES";
}

export function isAllowedRentalImageUrl(value: string): boolean {
  if (value.startsWith("/images/") && !value.includes("..")) return true;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return false;

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      url.pathname.startsWith(`/${cloudName}/image/upload/`) &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

export function resolveRentalQuoteLineItems(
  selections: RentalQuoteSelection[],
  trustedRentals: TrustedRentalForQuote[],
): RentalQuoteResolution {
  const rentalsBySku = new Map(
    trustedRentals.map((rental) => [rental.sku.toUpperCase(), rental]),
  );
  const lineItems: RentalQuoteLineItem[] = [];

  for (const { sku, quantity } of selections) {
    const rental = rentalsBySku.get(sku.toUpperCase());
    if (!rental) return { ok: false, reason: "unavailable" };

    const minimum = rental.minRentalQuantity ?? 1;
    if (quantity < minimum) {
      return { ok: false, reason: "below-minimum", productName: rental.name, minimum };
    }
    if (quantity > rental.stockQuantity) {
      return { ok: false, reason: "out-of-stock", productName: rental.name };
    }
    lineItems.push({
      id: rental.sku,
      label: rental.name,
      quantity,
      unitPriceCents: rental.unitPriceCents,
      type: "rental",
    });
  }

  return { ok: true, lineItems };
}

export function serializePublicRental(rental: Rental & { _id: { toString(): string } }) {
  return {
    id: rental._id.toString(),
    sku: rental.sku,
    name: rental.name,
    description: rental.description ?? "",
    category: canonicalCategory(rental.category),
    subcategory: rental.subcategory ?? rental.category ?? "Collection",
    unitPriceCents: rental.unitPriceCents,
    priceUnit: rental.priceUnit ?? "item",
    minRentalQuantity: rental.minRentalQuantity ?? 1,
    ...(rental.showStock === false ? {} : { stockQuantity: rental.stockQuantity }),
    imageUrl:
      rental.imageUrl && isAllowedRentalImageUrl(rental.imageUrl) ? rental.imageUrl : "",
  };
}

export function serializeAdminRental(rental: Rental & { _id: { toString(): string } }) {
  return {
    ...serializePublicRental(rental),
    replacementPriceCents: rental.replacementPriceCents ?? 0,
    stockQuantity: rental.stockQuantity ?? 0,
    showStock: rental.showStock ?? true,
    isActive: rental.isActive,
    sortOrder: rental.sortOrder ?? 0,
  };
}
