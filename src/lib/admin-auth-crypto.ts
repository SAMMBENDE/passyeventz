import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const sessionDurationSeconds = 8 * 60 * 60;
const passwordSaltBytes = 16;
const passwordHashBytes = 64;

export type AdminSession = {
  role: "admin";
  expiresAt: number;
};

function constantTimeStringEqual(first: string, second: string): boolean {
  const firstHash = createHash("sha256").update(first).digest();
  const secondHash = createHash("sha256").update(second).digest();
  return timingSafeEqual(firstHash, secondHash);
}

export async function createAdminPasswordHash(password: string): Promise<string> {
  const salt = randomBytes(passwordSaltBytes);
  const hash = (await scrypt(password, salt, passwordHashBytes)) as Buffer;
  return `${salt.toString("base64url")}:${hash.toString("base64url")}`;
}

export async function verifyAdminPasswordHash(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  const [encodedSalt, encodedDigest, ...extra] = encodedHash.split(":");
  if (!encodedSalt || !encodedDigest || extra.length > 0) {
    throw new Error("ADMIN_PASSWORD_HASH has an invalid format.");
  }

  const salt = Buffer.from(encodedSalt, "base64url");
  const expectedDigest = Buffer.from(encodedDigest, "base64url");
  if (
    salt.length !== passwordSaltBytes ||
    expectedDigest.length !== passwordHashBytes ||
    salt.toString("base64url") !== encodedSalt ||
    expectedDigest.toString("base64url") !== encodedDigest
  ) {
    throw new Error("ADMIN_PASSWORD_HASH has an invalid format.");
  }

  const actualDigest = (await scrypt(password, salt, passwordHashBytes)) as Buffer;
  return timingSafeEqual(actualDigest, expectedDigest);
}

export function verifyAdminEmail(email: string, configuredEmail: string): boolean {
  return constantTimeStringEqual(email.trim().toLowerCase(), configuredEmail.trim().toLowerCase());
}

export function createAdminSessionToken(secret: string, now = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({
      role: "admin",
      expiresAt: Math.floor(now / 1000) + sessionDurationSeconds,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyAdminSessionToken(
  token: string,
  secret: string,
  now = Date.now(),
): AdminSession | null {
  const [payload, encodedSignature, ...extra] = token.split(".");
  if (!payload || !encodedSignature || extra.length > 0) return null;

  const actualSignature = Buffer.from(encodedSignature, "base64url");
  const expectedSignature = createHmac("sha256", secret).update(payload).digest();
  if (
    actualSignature.length !== expectedSignature.length ||
    actualSignature.toString("base64url") !== encodedSignature ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("role" in parsed) ||
      parsed.role !== "admin" ||
      !("expiresAt" in parsed) ||
      typeof parsed.expiresAt !== "number" ||
      !Number.isSafeInteger(parsed.expiresAt) ||
      parsed.expiresAt <= Math.floor(now / 1000)
    ) {
      return null;
    }

    return { role: "admin", expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}
