import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { calculateQuote } from "@/lib/quote";
import { connectToDatabase } from "@/lib/mongodb";
import { resolveRentalQuoteLineItems } from "@/lib/rental-catalogue";
import { calculateWashingCents, quoteTermsVersion } from "@/lib/quote-terms";
import { rentalQuoteRequestSchema } from "@/lib/validation";
import { QuoteModel } from "@/models/quote";
import { RentalModel } from "@/models/rental";

const maxRequestSize = 24 * 1024;
const rentalService = "Location de matériel";

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > maxRequestSize) {
    return NextResponse.json({ error: "La demande est trop volumineuse." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Le format de la demande est invalide." }, { status: 400 });
  }

  const parsed = rentalQuoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Veuillez vérifier les informations saisies." },
      { status: 400 },
    );
  }

  try {
    await connectToDatabase();
    const products = await RentalModel.find({
      sku: { $in: parsed.data.rentalSelections.map(({ sku }) => sku) },
      isActive: true,
    })
      .select("sku name unitPriceCents minRentalQuantity stockQuantity")
      .lean();
    const resolution = resolveRentalQuoteLineItems(parsed.data.rentalSelections, products);
    if (!resolution.ok) {
      if (resolution.reason === "unavailable") {
        return NextResponse.json(
          { error: "Un article sélectionné n’est plus disponible." },
          { status: 409 },
        );
      }
      if (resolution.reason === "below-minimum") {
        return NextResponse.json(
          { error: `${resolution.productName} doit être loué par ${resolution.minimum} minimum.` },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: `Le stock de ${resolution.productName} ne permet pas cette quantité.` },
        { status: 409 },
      );
    }
    const lineItems = resolution.lineItems;
    const pricing = calculateQuote({
      items: lineItems,
      cleaningCents: calculateWashingCents(
        parsed.data.guestCount,
        parsed.data.cleaningChoice,
      ),
    });
    if (!Number.isSafeInteger(pricing.totalCents)) {
      return NextResponse.json({ error: "Le montant de la demande dépasse la limite autorisée." }, { status: 400 });
    }

    const quote = await QuoteModel.create({
      reference: `PE-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
      eventType: parsed.data.eventType,
      eventDate: new Date(`${parsed.data.eventDate}T00:00:00.000Z`),
      guestCount: parsed.data.guestCount,
      cleaningChoice: parsed.data.cleaningChoice,
      termsAcceptedAt: new Date(),
      termsVersion: quoteTermsVersion,
      customer: {
        email: parsed.data.email,
        name: parsed.data.customerName,
        phone: parsed.data.phone,
      },
      note: parsed.data.note,
      services: [...new Set([...parsed.data.services, rentalService])],
      lineItems,
      pricing,
      status: "submitted",
    });

    return NextResponse.json({ reference: quote.reference }, { status: 201 });
  } catch (error) {
    console.error(
      "Failed to save rental quote request:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { error: "Impossible d’enregistrer votre demande pour le moment. Réessayez plus tard." },
      { status: 503 },
    );
  }
}
