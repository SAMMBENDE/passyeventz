import type { BookingStatus } from "@/lib/validation";

export const inventoryReservationStatuses = [
  "pending",
  "confirmed",
  "in_progress",
] as const satisfies readonly BookingStatus[];
const reservingStatuses = new Set<BookingStatus>(inventoryReservationStatuses);

type Reservation = {
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  rentalItems: Array<{ rentalId: string; quantity: number }>;
};

export function bookingIntervalsOverlap(
  firstStartsAt: Date,
  firstEndsAt: Date,
  secondStartsAt: Date,
  secondEndsAt: Date,
): boolean {
  return firstStartsAt < secondEndsAt && firstEndsAt > secondStartsAt;
}

export function getAvailableRentalQuantity(
  stockQuantity: number,
  rentalId: string,
  startsAt: Date,
  endsAt: Date,
  reservations: Reservation[],
): number {
  const reservedQuantity = reservations.reduce((total, reservation) => {
    if (
      !reservingStatuses.has(reservation.status) ||
      !bookingIntervalsOverlap(startsAt, endsAt, reservation.startsAt, reservation.endsAt)
    ) {
      return total;
    }

    return (
      total +
      reservation.rentalItems.reduce(
        (quantity, item) => quantity + (item.rentalId === rentalId ? item.quantity : 0),
        0,
      )
    );
  }, 0);

  return Math.max(0, stockQuantity - reservedQuantity);
}
