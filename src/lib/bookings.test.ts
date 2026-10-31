import { describe, expect, it } from "vitest";

import { BookingServiceError, createBookingFromApprovedQuote } from "@/lib/bookings";

describe("createBookingFromApprovedQuote", () => {
  it("rejects invalid input before connecting to MongoDB", async () => {
    await expect(createBookingFromApprovedQuote({ quoteId: "invalid" })).rejects.toMatchObject({
      name: "BookingServiceError",
      code: "INVALID_BOOKING",
    } satisfies Partial<BookingServiceError>);
  });
});
