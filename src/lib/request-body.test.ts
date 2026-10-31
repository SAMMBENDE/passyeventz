import { describe, expect, it } from "vitest";

import { readRequestBody, RequestBodyTooLargeError } from "@/lib/request-body";

describe("readRequestBody", () => {
  it("reads a bounded request body without changing its bytes", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ event: "paid" }),
    });

    await expect(readRequestBody(request, 100)).resolves.toEqual(
      Buffer.from(JSON.stringify({ event: "paid" })),
    );
  });

  it("rejects oversized streamed bodies even when content length is absent", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      body: "x".repeat(20),
    });

    await expect(readRequestBody(request, 10)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
  });
});
