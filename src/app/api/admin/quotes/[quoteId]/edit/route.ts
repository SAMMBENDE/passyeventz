import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { calculateQuote } from "@/lib/quote";
import { quoteEditorSchema } from "@/lib/validation";
import { QuoteModel } from "@/models/quote";

const objectIdPattern = /^[\da-f]{24}$/i;
const maxRequestSize = 32 * 1024;

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

  const parsed = quoteEditorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Veuillez vérifier les informations du devis." },
      { status: 400 },
    );
  }

  try {
    await connectToDatabase();
    const currentQuote = await QuoteModel.findById(quoteId).select("status updatedAt").lean();
    if (!currentQuote) {
      return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
    }
    if (!currentQuote.updatedAt) {
      throw new Error("Quote timestamp is missing.");
    }

    if (!["submitted", "revised"].includes(currentQuote.status)) {
      return NextResponse.json(
        { error: "Seuls les devis à traiter ou révisés peuvent être modifiés." },
        { status: 409 },
      );
    }

    if (currentQuote.updatedAt.getTime() !== new Date(parsed.data.updatedAt).getTime()) {
      return NextResponse.json(
        { error: "Le devis a été modifié entre-temps. Actualisez la page." },
        { status: 409 },
      );
    }

    const pricing = calculateQuote({
      items: parsed.data.lineItems,
      deliveryCents: parsed.data.deliveryCents,
      cleaningCents: parsed.data.cleaningCents,
      taxRate: parsed.data.taxRateBasisPoints / 10_000,
      depositPercent: parsed.data.depositBasisPoints / 10_000,
      advancePercent: parsed.data.advanceBasisPoints / 10_000,
    });

    if (Object.values(pricing).some((amount) => !Number.isSafeInteger(amount))) {
      return NextResponse.json(
        { error: "Les montants du devis dépassent les limites autorisées." },
        { status: 400 },
      );
    }

    const updatedQuote = await QuoteModel.findOneAndUpdate(
      {
        _id: quoteId,
        status: currentQuote.status,
        updatedAt: currentQuote.updatedAt,
      },
      {
        $set: {
          eventType: parsed.data.eventType,
          eventDate: new Date(`${parsed.data.eventDate}T00:00:00.000Z`),
          guestCount: parsed.data.guestCount,
          services: parsed.data.services,
          note: parsed.data.note,
          lineItems: parsed.data.lineItems,
          pricing,
          status: "revised",
        },
      },
      { new: true, runValidators: true },
    )
      .select("reference status updatedAt")
      .lean();

    if (!updatedQuote) {
      return NextResponse.json(
        { error: "Le devis a été modifié entre-temps. Actualisez la page." },
        { status: 409 },
      );
    }
    if (!updatedQuote.updatedAt) {
      throw new Error("Updated quote timestamp is missing.");
    }

    return NextResponse.json({
      quote: {
        reference: updatedQuote.reference,
        status: updatedQuote.status,
        updatedAt: updatedQuote.updatedAt.toISOString(),
        eventType: parsed.data.eventType,
        eventDate: new Date(`${parsed.data.eventDate}T00:00:00.000Z`).toISOString(),
        guestCount: parsed.data.guestCount,
        services: parsed.data.services,
        note: parsed.data.note,
        lineItems: parsed.data.lineItems,
        pricing,
      },
    });
  } catch (error) {
    console.error(
      "Failed to edit admin quote:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { error: "Impossible de modifier ce devis pour le moment." },
      { status: 503 },
    );
  }
}
