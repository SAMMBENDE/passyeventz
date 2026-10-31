import { BookingModel } from "@/models/booking";

export const pendingBookingHoldDurationMs = 24 * 60 * 60 * 1000;

export function getPendingBookingExpiryCutoff(now = new Date()): Date {
  return new Date(now.getTime() - pendingBookingHoldDurationMs);
}

export async function expirePendingBookings(now = new Date()): Promise<number> {
  const result = await BookingModel.updateMany(
    {
      status: "pending",
      createdAt: { $lte: getPendingBookingExpiryCutoff(now) },
    },
    { $set: { status: "expired" } },
  );

  return result.modifiedCount;
}
