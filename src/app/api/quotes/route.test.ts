import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/quotes/route";

describe("POST /api/quotes", () => {
  it("rejects malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Le format de la demande est invalide.",
    });
  });

  it("rejects invalid quote requests before connecting to MongoDB", async () => {
    const response = await POST(
      new Request("http://localhost/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventType: "Mariage", email: "not-an-email" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Veuillez vérifier les informations saisies.",
    });
  });

  it("rejects oversized requests", async () => {
    const response = await POST(
      new Request("http://localhost/api/quotes", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": String(16 * 1024 + 1),
        },
        body: "{}",
      }),
    );

    expect(response.status).toBe(413);
  });
});
