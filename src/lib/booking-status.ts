import type { BookingStatus } from "@/lib/validation";

const bookingStatusTransitions: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  expired: [],
};

export function canTransitionBookingStatus(
  currentStatus: BookingStatus,
  nextStatus: BookingStatus,
): boolean {
  return bookingStatusTransitions[currentStatus].includes(nextStatus);
}

export function nextBookingStatuses(status: BookingStatus): BookingStatus[] {
  return bookingStatusTransitions[status];
}
