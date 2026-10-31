import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectToDatabase: vi.fn(),
  expirePendingBookings: vi.fn(),
  expireDepositPayments: vi.fn(),
}));

vi.mock("@/lib/mongodb", () => ({
  connectToDatabase: mocks.connectToDatabase,
}));

vi.mock("@/lib/booking-expiration", () => ({
  expirePendingBookings: mocks.expirePendingBookings,
}));

vi.mock("@/lib/deposit-payments", () => ({
  expireDepositPayments: mocks.expireDepositPayments,
}));

import { GET } from "@/app/api/cron/expire-pending-bookings/route";

describe("GET /api/cron/expire-pending-bookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret-that-is-at-least-32-bytes";
    mocks.connectToDatabase.mockResolvedValue(undefined);
    mocks.expirePendingBookings.mockResolvedValue(2);
    mocks.expireDepositPayments.mockResolvedValue(1);
  });

  it("rejects requests without the configured bearer secret", async () => {
    const response = await GET(new Request("http://localhost/api/cron/expire-pending-bookings"));

    expect(response.status).toBe(401);
    expect(mocks.connectToDatabase).not.toHaveBeenCalled();
  });

  it("expires stale pending bookings for authorized cron requests", async () => {
    const response = await GET(
      new Request("http://localhost/api/cron/expire-pending-bookings", {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      expiredCount: 2,
      expiredPaymentCount: 1,
    });
    expect(mocks.connectToDatabase).toHaveBeenCalledOnce();
    expect(mocks.expirePendingBookings).toHaveBeenCalledOnce();
    expect(mocks.expireDepositPayments).toHaveBeenCalledOnce();
  });
});
