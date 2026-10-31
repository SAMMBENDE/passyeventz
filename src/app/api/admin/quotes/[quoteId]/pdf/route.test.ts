import { PDFDocument } from "pdf-lib";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  connectToDatabase: vi.fn(),
  findById: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({
  getAdminSession: mocks.getAdminSession,
}));

vi.mock("@/lib/mongodb", () => ({
  connectToDatabase: mocks.connectToDatabase,
}));

vi.mock("@/models/quote", () => ({
  QuoteModel: { findById: mocks.findById },
}));

import { GET } from "@/app/api/admin/quotes/[quoteId]/pdf/route";

const quoteId = "507f1f77bcf86cd799439011";
const context = { params: Promise.resolve({ quoteId }) };
const pricedQuote = {
  reference: "PE-2027-0001",
  eventType: "Mariage",
  eventDate: new Date("2027-06-12T00:00:00Z"),
  guestCount: 120,
  customer: { email: "client@example.com", name: "Camille" },
  services: ["Décoration de salle"],
  lineItems: [
    {
      id: "DECORATION",
      label: "Décoration",
      quantity: 1,
      unitPriceCents: 25_000,
      type: "service",
    },
  ],
  pricing: {
    subtotalCents: 25_000,
    deliveryCents: 0,
    cleaningCents: 0,
    taxCents: 5000,
    totalCents: 30_000,
    depositCents: 9000,
    advancePaymentCents: 12_000,
    balanceDueCents: 18_000,
  },
  status: "approved",
};

describe("GET /api/admin/quotes/[quoteId]/pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminSession.mockResolvedValue({ role: "admin" });
    mocks.connectToDatabase.mockResolvedValue(undefined);
    mocks.findById.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve(pricedQuote) }),
    });
  });

  it("returns JSON unauthorized before database access", async () => {
    mocks.getAdminSession.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost"), context);
    expect(response.status).toBe(401);
    expect(mocks.connectToDatabase).not.toHaveBeenCalled();
  });

  it("returns a generated PDF with download headers for priced quotes", async () => {
    const response = await GET(new Request("http://localhost"), context);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("PE-2027-0001.pdf");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 8))).toContain("%PDF-");
  });

  it("requires priced line items before PDF generation", async () => {
    mocks.findById.mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve({ ...pricedQuote, lineItems: [], pricing: undefined }),
      }),
    });

    const response = await GET(new Request("http://localhost"), context);
    expect(response.status).toBe(409);
  });

  it("generates multipage PDFs for long item lists", async () => {
    mocks.findById.mockReturnValue({
      select: () => ({
        lean: () =>
          Promise.resolve({
            ...pricedQuote,
            lineItems: Array.from({ length: 100 }, (_, index) => ({
              id: `ITEM-${index}`,
              label: `Décoration de table ${index}`,
              quantity: index + 1,
              unitPriceCents: 250,
              type: "service",
            })),
          }),
      }),
    });

    const response = await GET(new Request("http://localhost"), context);

    expect(response.status).toBe(200);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });
});
