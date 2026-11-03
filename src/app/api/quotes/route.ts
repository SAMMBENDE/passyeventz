import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import { quoteTermsVersion } from "@/lib/quote-terms";
import { quoteRequestSchema } from "@/lib/validation";
import { QuoteModel } from "@/models/quote";

const maxRequestSize = 16 * 1024;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxRequestSize) {
    return NextResponse.json(
      { error: "La demande est trop volumineuse." },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Le format de la demande est invalide." },
      { status: 400 },
    );
  }

  const result = quoteRequestSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Veuillez vérifier les informations saisies.",
        fields: result.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    await connectToDatabase();

    const quote = await QuoteModel.create({
      reference: `PE-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
      eventType: result.data.eventType,
      eventDate: new Date(`${result.data.eventDate}T00:00:00.000Z`),
      guestCount: result.data.guestCount,
      cleaningChoice: result.data.cleaningChoice,
      termsAcceptedAt: new Date(),
      termsVersion: quoteTermsVersion,
      customer: {
        email: result.data.email,
        name: result.data.customerName,
        phone: result.data.phone,
      },
      note: result.data.note,
      services: result.data.services,
      status: "submitted",
    });

    return NextResponse.json({ reference: quote.reference }, { status: 201 });
  } catch (error) {
    console.error(
      "Failed to save quote request:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { error: "Impossible d’enregistrer votre demande pour le moment. Réessayez plus tard." },
      { status: 503 },
    );
  }
}
