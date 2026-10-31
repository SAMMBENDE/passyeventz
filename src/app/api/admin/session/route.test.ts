import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DELETE, POST } from "@/app/api/admin/session/route";
import { createAdminPasswordHash, verifyAdminSessionToken } from "@/lib/admin-auth-crypto";

describe("/api/admin/session", () => {
  const originalEnvironment = {
    adminEmail: process.env.ADMIN_EMAIL,
    adminPasswordHash: process.env.ADMIN_PASSWORD_HASH,
    adminSessionSecret: process.env.ADMIN_SESSION_SECRET,
  };
  const testPassword = "a secure integration test password";
  const testSessionSecret = "integration-test-secret-with-at-least-32-bytes";

  beforeEach(async () => {
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.ADMIN_PASSWORD_HASH = await createAdminPasswordHash(testPassword);
    process.env.ADMIN_SESSION_SECRET = testSessionSecret;
  });

  afterEach(() => {
    if (originalEnvironment.adminEmail === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = originalEnvironment.adminEmail;
    if (originalEnvironment.adminPasswordHash === undefined) delete process.env.ADMIN_PASSWORD_HASH;
    else process.env.ADMIN_PASSWORD_HASH = originalEnvironment.adminPasswordHash;
    if (originalEnvironment.adminSessionSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = originalEnvironment.adminSessionSecret;
  });

  it("rejects sign-in requests without a same-origin header", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "admin@example.com", password: "a sufficiently long password" }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("rejects invalid credentials input before reading auth configuration", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/session", {
        method: "POST",
        headers: {
          origin: "http://localhost",
          "content-type": "application/json",
        },
        body: JSON.stringify({ email: "not-an-email", password: "short" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Adresse e-mail ou mot de passe invalide.",
    });
  });

  it("rejects logout requests from another origin", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/admin/session", {
        method: "DELETE",
        headers: { origin: "https://attacker.example" },
      }),
    );

    expect(response.status).toBe(403);
  });

  it("creates an HttpOnly signed admin session for valid credentials", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/session", {
        method: "POST",
        headers: {
          origin: "http://localhost",
          "content-type": "application/json",
        },
        body: JSON.stringify({ email: "ADMIN@example.com", password: testPassword }),
      }),
    );

    expect(response.status).toBe(200);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("passyeventz-admin=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toMatch(/SameSite=strict/i);

    const token = setCookie?.match(/passyeventz-admin=([^;]+)/)?.[1];
    expect(token).toBeDefined();
    if (!token) throw new Error("Admin session cookie was not set.");
    expect(verifyAdminSessionToken(token, testSessionSecret)).toMatchObject({ role: "admin" });
  });

  it("uses a generic unauthorized response for incorrect credentials", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/session", {
        method: "POST",
        headers: {
          origin: "http://localhost",
          "content-type": "application/json",
        },
        body: JSON.stringify({ email: "admin@example.com", password: "a different password" }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "Adresse e-mail ou mot de passe invalide.",
    });
  });
});
