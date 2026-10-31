import { describe, expect, it } from "vitest";

import {
  createAdminPasswordHash,
  createAdminSessionToken,
  verifyAdminEmail,
  verifyAdminPasswordHash,
  verifyAdminSessionToken,
} from "@/lib/admin-auth-crypto";

describe("admin authentication cryptography", () => {
  it("verifies password hashes without storing the password", async () => {
    const hash = await createAdminPasswordHash("a long test password");

    await expect(verifyAdminPasswordHash("a long test password", hash)).resolves.toBe(true);
    await expect(verifyAdminPasswordHash("a different password", hash)).resolves.toBe(false);
  });

  it("rejects malformed password hashes", async () => {
    await expect(verifyAdminPasswordHash("password", "malformed")).rejects.toThrow(
      "ADMIN_PASSWORD_HASH has an invalid format.",
    );
  });

  it("normalizes the configured administrator email", () => {
    expect(verifyAdminEmail(" ADMIN@EXAMPLE.COM ", "admin@example.com")).toBe(true);
    expect(verifyAdminEmail("other@example.com", "admin@example.com")).toBe(false);
  });

  it("accepts only a valid, unexpired, signed administrator session", () => {
    const secret = "0123456789abcdef0123456789abcdef";
    const now = Date.UTC(2026, 9, 30);
    const token = createAdminSessionToken(secret, now);

    expect(verifyAdminSessionToken(token, secret, now)).toMatchObject({ role: "admin" });
    expect(verifyAdminSessionToken(token, "abcdef0123456789abcdef0123456789", now)).toBeNull();
    expect(verifyAdminSessionToken(`${token}x`, secret, now)).toBeNull();
    expect(verifyAdminSessionToken(token, secret, now + 8 * 60 * 60 * 1000)).toBeNull();
  });
});
