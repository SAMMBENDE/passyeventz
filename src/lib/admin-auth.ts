import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  createAdminSessionToken,
  verifyAdminPasswordHash,
  verifyAdminEmail,
  verifyAdminSessionToken,
} from "@/lib/admin-auth-crypto";

const sessionCookieName =
  process.env.NODE_ENV === "production"
    ? "__Host-passyeventz-admin"
    : "passyeventz-admin";
const sessionDurationSeconds = 8 * 60 * 60;

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("ADMIN_SESSION_SECRET must contain at least 32 bytes.");
  }
  return secret;
}

export async function verifyAdminCredentials(email: string, password: string): Promise<boolean> {
  const configuredEmail = process.env.ADMIN_EMAIL;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!configuredEmail || !passwordHash) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD_HASH must be configured.");
  }

  const [emailMatches, passwordMatches] = await Promise.all([
    Promise.resolve(verifyAdminEmail(email, configuredEmail)),
    verifyAdminPasswordHash(password, passwordHash),
  ]);
  return emailMatches && passwordMatches;
}

export function createAdminSessionCookieValue(): string {
  return createAdminSessionToken(getSessionSecret());
}

export async function getAdminSession() {
  const token = (await cookies()).get(sessionCookieName)?.value;
  if (!token) return null;
  return verifyAdminSessionToken(token, getSessionSecret());
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session || session.role !== "admin") {
    redirect("/admin/login");
  }
  return session;
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: sessionDurationSeconds,
  };
}

export function getAdminSessionCookieName() {
  return sessionCookieName;
}
