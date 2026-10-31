import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { expirePendingBookings } from "@/lib/booking-expiration";
import { expireDepositPayments } from "@/lib/deposit-payments";
import { connectToDatabase } from "@/lib/mongodb";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || Buffer.byteLength(secret, "utf8") < 32 || !authorization) return false;

  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  const provided = Buffer.from(authorization, "utf8");
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const expiredCount = await expirePendingBookings();
    const expiredPaymentCount = await expireDepositPayments();
    return NextResponse.json({ expiredCount, expiredPaymentCount });
  } catch (error) {
    console.error(
      "Failed to expire pending bookings:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { error: "Impossible d’expirer les réservations en attente." },
      { status: 503 },
    );
  }
}
