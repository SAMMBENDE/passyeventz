import { requireAdminSession } from "@/lib/admin-auth";
import { expirePendingBookings } from "@/lib/booking-expiration";
import { expireDepositPayments } from "@/lib/deposit-payments";
import { connectToDatabase } from "@/lib/mongodb";
import { BookingModel } from "@/models/booking";
import { DepositPaymentModel } from "@/models/deposit-payment";
import { QuoteModel } from "@/models/quote";

export class AdminBookingListError extends Error {
  constructor() {
    super("The admin booking list could not be loaded.");
    this.name = "AdminBookingListError";
  }
}

export async function getAdminBookingList() {
  await requireAdminSession();

  try {
    await connectToDatabase();
    await expirePendingBookings();
    await expireDepositPayments();
    const bookings = await BookingModel.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .select(
        "reference quoteId startsAt endsAt customer eventType rentalItems deliveryAddress note status updatedAt",
      )
      .lean();

    const quotes = await QuoteModel.find({
      _id: { $in: bookings.map((booking) => booking.quoteId) },
    })
      .select("reference pricing.depositCents")
      .lean();
    const quotesById = new Map(quotes.map((quote) => [quote._id.toString(), quote]));
    const payments = await DepositPaymentModel.find({
      bookingId: { $in: bookings.map((booking) => booking._id) },
    })
      .sort({ createdAt: -1 })
      .select("bookingId provider amountCents status checkoutUrl expiresAt")
      .lean();
    const paymentsByBookingId = new Map<
      string,
      (typeof payments)[number]
    >();
    for (const payment of payments) {
      const bookingId = payment.bookingId.toString();
      if (!paymentsByBookingId.has(bookingId)) paymentsByBookingId.set(bookingId, payment);
    }

    return {
      bookings: bookings.map((booking) => {
        const bookingId = booking._id.toString();
        const quote = quotesById.get(booking.quoteId.toString());
        const payment = paymentsByBookingId.get(bookingId);
        return {
          id: bookingId,
          quoteId: booking.quoteId.toString(),
          quoteReference: quote?.reference ?? "Devis",
          depositCents: quote?.pricing?.depositCents ?? null,
          reference: booking.reference,
          startsAt: booking.startsAt.toISOString(),
          endsAt: booking.endsAt.toISOString(),
          customer: booking.customer,
          eventType: booking.eventType,
          rentalItems: booking.rentalItems.map((item) => ({
            sku: item.sku,
            name: item.name,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
          })),
          deliveryAddress: booking.deliveryAddress,
          note: booking.note,
          status: booking.status,
          updatedAt: booking.updatedAt?.toISOString() ?? "",
          payment: payment
            ? {
                id: payment._id.toString(),
                provider: payment.provider,
                amountCents: payment.amountCents,
                status: payment.status,
                checkoutUrl: payment.checkoutUrl,
                expiresAt: payment.expiresAt.toISOString(),
              }
            : null,
        };
      }),
    };
  } catch (error) {
    console.error(
      "Failed to load admin bookings:",
      error instanceof Error ? error.name : "UnknownError",
    );
    throw new AdminBookingListError();
  }
}
