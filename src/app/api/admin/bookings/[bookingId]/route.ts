import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { expirePendingBookings } from "@/lib/booking-expiration";
import { canTransitionBookingStatus } from "@/lib/booking-status";
import { connectToDatabase } from "@/lib/mongodb";
import { bookingStatusUpdateSchema } from "@/lib/validation";
import { BookingModel } from "@/models/booking";

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
  context: { params: Promise<{ bookingId: string }> },
) {
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

  const { bookingId } = await context.params;
  if (!objectIdPattern.test(bookingId)) {
    return NextResponse.json({ error: "Identifiant de réservation invalide." }, { status: 400 });
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

  const parsed = bookingStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nouveau statut de réservation invalide." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    await expirePendingBookings();
    const booking = await BookingModel.findById(bookingId)
      .select("status updatedAt")
      .lean();
    if (!booking) {
      return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
    }
    if (!booking.updatedAt || booking.updatedAt.toISOString() !== parsed.data.updatedAt) {
      return NextResponse.json(
        { error: "La réservation a changé entre-temps. Actualisez la page." },
        { status: 409 },
      );
    }
    if (!canTransitionBookingStatus(booking.status, parsed.data.status)) {
      return NextResponse.json(
        { error: "Ce changement de statut n’est pas autorisé." },
        { status: 409 },
      );
    }

    const updatedBooking = await BookingModel.findOneAndUpdate(
      { _id: bookingId, status: booking.status, updatedAt: booking.updatedAt },
      { $set: { status: parsed.data.status } },
      { new: true },
    )
      .select("status updatedAt")
      .lean();

    if (!updatedBooking?.updatedAt) {
      return NextResponse.json(
        { error: "La réservation a changé entre-temps. Actualisez la page." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      booking: {
        status: updatedBooking.status,
        updatedAt: updatedBooking.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error(
      "Failed to update booking status:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { error: "Impossible de modifier la réservation pour le moment." },
      { status: 503 },
    );
  }
}
