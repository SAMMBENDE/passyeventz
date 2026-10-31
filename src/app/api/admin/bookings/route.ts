import { NextResponse } from "next/server";

import { BookingServiceError, createBookingFromApprovedQuote } from "@/lib/bookings";
import { getAdminSession } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { adminBookingCreateSchema } from "@/lib/validation";
import { QuoteModel } from "@/models/quote";
import { RentalModel } from "@/models/rental";

const maxRequestSize = 8 * 1024;

function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function serviceErrorResponse(error: BookingServiceError) {
  const statusByCode = {
    INVALID_BOOKING: 400,
    QUOTE_NOT_FOUND: 404,
    QUOTE_NOT_APPROVED: 409,
    QUOTE_ALREADY_BOOKED: 409,
    QUOTE_RENTAL_MISMATCH: 409,
    RENTAL_UNAVAILABLE: 409,
    INSUFFICIENT_INVENTORY: 409,
  } as const;

  return NextResponse.json({ error: error.message }, { status: statusByCode[error.code] });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json(
      { error: "Votre session a expiré. Reconnectez-vous." },
      { status: 401 },
    );
  }

  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
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

  const parsed = adminBookingCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Vérifiez les dates et les informations de réservation." },
      { status: 400 },
    );
  }

  try {
    await connectToDatabase();
    const quote = await QuoteModel.findById(parsed.data.quoteId)
      .select("status lineItems")
      .lean();

    if (!quote) {
      return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
    }
    if (quote.status !== "approved") {
      return NextResponse.json(
        { error: "Seul un devis approuvé peut être réservé." },
        { status: 409 },
      );
    }

    const rentalLines = quote.lineItems.filter((item) => item.type === "rental");
    const rentalSkus = [...new Set(rentalLines.map((item) => item.id))];
    const rentals = rentalSkus.length
      ? await RentalModel.find({ sku: { $in: rentalSkus }, isActive: true })
          .select("_id sku")
          .lean()
      : [];
    const rentalsBySku = new Map(rentals.map((rental) => [rental.sku, rental]));

    if (rentalSkus.some((sku) => !rentalsBySku.has(sku))) {
      return NextResponse.json(
        { error: "Un article de location du devis n’est plus disponible." },
        { status: 409 },
      );
    }

    const rentalItems = rentalLines.map((item) => {
      const rental = rentalsBySku.get(item.id);
      if (!rental) {
        throw new Error("Approved quote contains an invalid rental reference.");
      }
      return { rentalId: rental._id.toString(), quantity: item.quantity };
    });

    const booking = await createBookingFromApprovedQuote({
      ...parsed.data,
      rentalItems,
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    if (error instanceof BookingServiceError) {
      return serviceErrorResponse(error);
    }

    console.error(
      "Failed to create admin booking:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { error: "Impossible de créer la réservation pour le moment." },
      { status: 503 },
    );
  }
}
