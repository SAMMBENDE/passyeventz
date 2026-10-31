import { randomUUID } from "node:crypto";
import mongoose, { Types } from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import { expirePendingBookings, getPendingBookingExpiryCutoff } from "@/lib/booking-expiration";
import { getAvailableRentalQuantity } from "@/lib/inventory";
import { bookingCreateSchema } from "@/lib/validation";
import { BookingModel } from "@/models/booking";
import { QuoteModel } from "@/models/quote";
import { RentalModel } from "@/models/rental";

export class BookingServiceError extends Error {
  constructor(
    readonly code:
      | "INVALID_BOOKING"
      | "QUOTE_NOT_FOUND"
      | "QUOTE_NOT_APPROVED"
      | "QUOTE_ALREADY_BOOKED"
      | "QUOTE_RENTAL_MISMATCH"
      | "RENTAL_UNAVAILABLE"
      | "INSUFFICIENT_INVENTORY",
    message: string,
    readonly details?: Record<string, string | number>,
  ) {
    super(message);
    this.name = "BookingServiceError";
  }
}

type RentalSnapshot = {
  _id: Types.ObjectId;
  sku: string;
  name: string;
  stockQuantity: number;
};

export async function createBookingFromApprovedQuote(input: unknown) {
  const parsed = bookingCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new BookingServiceError(
      "INVALID_BOOKING",
      "Les informations de réservation sont invalides.",
      { issueCount: parsed.error.issues.length },
    );
  }

  const { quoteId, startsAt, endsAt, rentalItems, deliveryAddress, note } = parsed.data;
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  await connectToDatabase();
  await expirePendingBookings();
  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => {
      const quote = await QuoteModel.findById(new Types.ObjectId(quoteId))
        .session(session)
        .lean();

      if (!quote) {
        throw new BookingServiceError("QUOTE_NOT_FOUND", "Le devis est introuvable.");
      }
      if (quote.status !== "approved") {
        throw new BookingServiceError(
          "QUOTE_NOT_APPROVED",
          "Seul un devis approuvé peut être réservé.",
        );
      }

      const existingBooking = await BookingModel.exists({ quoteId: quote._id }).session(session);
      if (existingBooking) {
        throw new BookingServiceError(
          "QUOTE_ALREADY_BOOKED",
          "Une réservation existe déjà pour ce devis.",
        );
      }

      const rentalIds = rentalItems
        .map(({ rentalId }) => new Types.ObjectId(rentalId))
        .sort((first, second) => first.toHexString().localeCompare(second.toHexString()));
      const rentals: RentalSnapshot[] = [];

      for (const rentalId of rentalIds) {
        const rental = await RentalModel.findOneAndUpdate(
          { _id: rentalId, isActive: true },
          { $inc: { inventoryRevision: 1 } },
          { new: true, session },
        )
          .select("sku name stockQuantity")
          .lean();

        if (!rental) {
          throw new BookingServiceError(
            "RENTAL_UNAVAILABLE",
            "Un article demandé n’est pas disponible à la location.",
          );
        }
        if (rentals.some(({ sku }) => sku === rental.sku)) {
          throw new BookingServiceError(
            "QUOTE_RENTAL_MISMATCH",
            "Un article ne peut apparaître qu’une seule fois dans la sélection.",
          );
        }
        rentals.push(rental);
      }

      const requestedBySku = new Map<string, number>();
      for (const selection of rentalItems) {
        const rental = rentals.find(
          ({ _id }) => _id.toHexString() === selection.rentalId.toLowerCase(),
        );
        if (!rental) {
          throw new BookingServiceError(
            "RENTAL_UNAVAILABLE",
            "Un article demandé n’est pas disponible à la location.",
          );
        }
        requestedBySku.set(rental.sku, selection.quantity);
      }

      const quotedBySku = new Map<string, { quantity: number; unitPriceCents: number }>();
      for (const lineItem of quote.lineItems) {
        if (lineItem.type !== "rental") continue;

        const quotedItem = quotedBySku.get(lineItem.id);
        if (quotedItem && quotedItem.unitPriceCents !== lineItem.unitPriceCents) {
          throw new BookingServiceError(
            "QUOTE_RENTAL_MISMATCH",
            "Le devis contient des tarifs incohérents pour une location.",
          );
        }
        quotedBySku.set(lineItem.id, {
          quantity: (quotedItem?.quantity ?? 0) + lineItem.quantity,
          unitPriceCents: lineItem.unitPriceCents,
        });
      }

      if (
        quotedBySku.size !== requestedBySku.size ||
        [...quotedBySku].some(
          ([sku, quoteItem]) => requestedBySku.get(sku) !== quoteItem.quantity,
        )
      ) {
        throw new BookingServiceError(
          "QUOTE_RENTAL_MISMATCH",
          "Les articles et quantités doivent correspondre au devis approuvé.",
        );
      }

      const rentalObjectIds = rentals.map(({ _id }) => _id);
      const reservations = await BookingModel.find({
        $or: [
          {
            status: "pending",
            createdAt: { $gt: getPendingBookingExpiryCutoff() },
          },
          { status: { $in: ["confirmed", "in_progress"] } },
        ],
        startsAt: { $lt: end },
        endsAt: { $gt: start },
        rentalItems: { $elemMatch: { rentalId: { $in: rentalObjectIds } } },
      })
        .select("startsAt endsAt status rentalItems.rentalId rentalItems.quantity")
        .session(session)
        .lean();
      const availabilityReservations = reservations.map((reservation) => ({
        startsAt: reservation.startsAt,
        endsAt: reservation.endsAt,
        status: reservation.status,
        rentalItems: reservation.rentalItems.map((item) => ({
          rentalId: item.rentalId.toString(),
          quantity: item.quantity,
        })),
      }));

      const bookingItems = rentals.map((rental) => {
        const quoteItem = quotedBySku.get(rental.sku);
        const quantity = requestedBySku.get(rental.sku);
        if (!quoteItem || quantity === undefined) {
          throw new BookingServiceError(
            "QUOTE_RENTAL_MISMATCH",
            "Les articles et quantités doivent correspondre au devis approuvé.",
          );
        }

        const availableQuantity = getAvailableRentalQuantity(
          rental.stockQuantity,
          rental._id.toHexString(),
          start,
          end,
          availabilityReservations,
        );

        if (quantity > availableQuantity) {
          throw new BookingServiceError(
            "INSUFFICIENT_INVENTORY",
            "Le stock disponible est insuffisant pour les dates demandées.",
            { sku: rental.sku, availableQuantity, requestedQuantity: quantity },
          );
        }

        return {
          rentalId: rental._id,
          sku: rental.sku,
          name: rental.name,
          quantity,
          unitPriceCents: quoteItem.unitPriceCents,
        };
      });

      const quoteUpdate = await QuoteModel.updateOne(
        { _id: quote._id, status: "approved" },
        { $set: { status: "confirmed" } },
        { session },
      );
      if (quoteUpdate.modifiedCount !== 1) {
        throw new BookingServiceError(
          "QUOTE_ALREADY_BOOKED",
          "Le devis a déjà été utilisé pour une réservation.",
        );
      }

      const [booking] = await BookingModel.create(
        [
          {
            reference: `PE-B-${new Date().getFullYear()}-${randomUUID()
              .slice(0, 8)
              .toUpperCase()}`,
            quoteId: quote._id,
            startsAt: start,
            endsAt: end,
            customer: quote.customer,
            eventType: quote.eventType,
            rentalItems: bookingItems,
            deliveryAddress,
            note,
            status: "pending",
          },
        ],
        { session },
      );

      return { id: booking._id.toHexString(), reference: booking.reference };
    });
  } finally {
    await session.endSession();
  }
}
