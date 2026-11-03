import { requireAdminSession } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { BookingModel } from "@/models/booking";
import { QuoteModel } from "@/models/quote";

export class AdminQuoteInboxError extends Error {
  constructor() {
    super("The admin quote inbox could not be loaded.");
    this.name = "AdminQuoteInboxError";
  }
}

export async function getAdminQuoteInbox() {
  await requireAdminSession();

  try {
    await connectToDatabase();

    const [quotes, reviewCount, approvedCount, activeBookingCount] = await Promise.all([
      QuoteModel.find({})
        .sort({ createdAt: -1 })
        .limit(50)
        .select(
          "reference eventType eventDate guestCount cleaningChoice termsAcceptedAt termsVersion customer.email customer.name customer.phone note services lineItems pricing status createdAt updatedAt",
        )
        .lean(),
      QuoteModel.countDocuments({ status: { $in: ["submitted", "revised"] } }),
      QuoteModel.countDocuments({ status: "approved" }),
      BookingModel.countDocuments({ status: { $in: ["pending", "confirmed", "in_progress"] } }),
    ]);

    return {
      counts: { review: reviewCount, approved: approvedCount, activeBookings: activeBookingCount },
      quotes: quotes.map((quote) => ({
        id: quote._id.toString(),
        reference: quote.reference,
        eventType: quote.eventType,
        eventDate: quote.eventDate.toISOString(),
        guestCount: quote.guestCount,
        cleaningChoice: quote.cleaningChoice ?? "customer",
        termsAcceptedAt: quote.termsAcceptedAt?.toISOString() ?? null,
        termsVersion: quote.termsVersion ?? null,
        customer: quote.customer,
        note: quote.note,
        services: quote.services,
        lineItems: quote.lineItems.map((item) => ({
          id: item.id,
          label: item.label,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          type: item.type,
        })),
        pricing: quote.pricing,
        status: quote.status,
        createdAt: quote.createdAt?.toISOString() ?? null,
        updatedAt: quote.updatedAt?.toISOString() ?? quote.createdAt?.toISOString() ?? "",
      })),
    };
  } catch (error) {
    console.error(
      "Failed to load admin quote inbox:",
      error instanceof Error ? error.name : "UnknownError",
    );
    throw new AdminQuoteInboxError();
  }
}
