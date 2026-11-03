export const quoteTermsVersion = "2026-11-03";
export const washingPricePerPersonCents = 180;
export const quoteDepositBasisPoints = 4000;

export const quoteTerms = [
  {
    title: "Casse et détérioration",
    text: "Toute assiette ou tout verre cassé sera facturé à hauteur de 5 € par pièce. Tout mobilier ou équipement Passyeventz endommagé sera facturé sur la base de sa valeur de remplacement au prix du marché.",
  },
  {
    title: "Réservation et validation",
    text: "Le devis dûment signé, accompagné du versement de l’acompte (40 %), vaut acceptation des conditions de la prestation et confirmation de la réservation de la date.",
  },
  {
    title: "Prestations supplémentaires",
    text: "Toute prestation, fourniture ou demande complémentaire non mentionnée dans le présent devis fera l’objet d’un devis additionnel, soumis à validation préalable du client.",
  },
] as const;

export type CleaningChoice = "passyeventz" | "customer";

export function calculateWashingCents(guestCount: number, choice: CleaningChoice): number {
  if (choice !== "passyeventz") return 0;
  if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 100_000) {
    throw new RangeError("Guest count must be an integer between 1 and 100000.");
  }
  return guestCount * washingPricePerPersonCents;
}
