import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { transitionQuoteStatus } from "@/lib/quote";
import { quoteReviewSchema } from "@/lib/validation";
import { QuoteModel } from "@/models/quote";

const objectIdPattern = /^[\da-f]{24}$/i;
const maxRequestSize = 1024;

function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ quoteId: string }> },
) {
  const session = await getAdminSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Votre session a expiré. Reconnectez-vous." }, { status: 401 });
  }

  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  }

  const { quoteId } = await context.params;
  if (!objectIdPattern.test(quoteId)) {
    return NextResponse.json({ error: "Identifiant de devis invalide." }, { status: 400 });
  }

  if (Number(request.headers.get("content-length") ?? 0) > maxRequestSize) {
    return NextResponse.json({ error: "La demande est trop volumineuse." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Le format de la demande est invalide." }, { status: 400 });
  }

  const parsed = quoteReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Action de devis invalide." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const quote = await QuoteModel.findById(quoteId).select("status pricing lineItems").lean();
    if (!quote) {
      return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
    }

    if (
      parsed.data.status === "approved" &&
      (!quote.pricing || quote.lineItems.length === 0)
    ) {
      return NextResponse.json(
        { error: "Ajoutez les lignes et le tarif du devis avant de l’approuver." },
        { status: 409 },
      );
    }

    if (!transitionQuoteStatus(quote.status, parsed.data.status)) {
      return NextResponse.json(
        { error: "Ce devis ne peut plus être modifié depuis son statut actuel." },
        { status: 409 },
      );
    }

    const updatedQuote = await QuoteModel.findOneAndUpdate(
      { _id: quoteId, status: quote.status },
      { $set: { status: parsed.data.status } },
      { new: true },
    )
      .select("reference status")
      .lean();

    if (!updatedQuote) {
      return NextResponse.json(
        { error: "Le devis a été modifié entre-temps. Actualisez la page." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      quote: { reference: updatedQuote.reference, status: updatedQuote.status },
    });
  } catch (error) {
    console.error(
      "Failed to review quote:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { error: "Impossible de modifier ce devis pour le moment." },
      { status: 503 },
    );
  }
}
