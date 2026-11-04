import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  connectToDatabase: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({
  getAdminSession: mocks.getAdminSession,
}));

vi.mock("@/lib/mongodb", () => ({
  connectToDatabase: mocks.connectToDatabase,
}));

vi.mock("@/models/realisation", () => ({
  RealisationModel: {
    findOne: mocks.findOne,
    create: mocks.create,
  },
}));

import { POST } from "@/app/api/admin/realisations/route";

function request(body: unknown, origin = "http://localhost") {
  return new Request("http://localhost/api/admin/realisations", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/realisations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminSession.mockResolvedValue({ role: "admin" });
    mocks.connectToDatabase.mockResolvedValue(undefined);
    mocks.findOne.mockReturnValue({
      sort: () => ({
        select: () => ({
          lean: () => Promise.resolve({ sortOrder: 2 }),
        }),
      }),
    });
    mocks.create.mockImplementation(async (data) => ({
      ...data,
      _id: { toString: () => "507f1f77bcf86cd799439011" },
    }));
  });

  it("requires an administrator before database access", async () => {
    mocks.getAdminSession.mockResolvedValue(null);

    const response = await POST(
      request({
        title: "Réception élégante",
        description: "Une scénographie raffinée pour une réception.",
        imageUrl: "/images/realisations/scene.webp",
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.connectToDatabase).not.toHaveBeenCalled();
  });

  it("creates an active project in display order", async () => {
    const response = await POST(
      request({
        title: "Réception élégante",
        description: "Une scénographie raffinée pour une réception.",
        category: "Mariage",
        imageUrl: "/images/realisations/scene.webp",
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      realisation: {
        id: "507f1f77bcf86cd799439011",
        title: "Réception élégante",
        image: "/images/realisations/scene.webp",
        isActive: true,
        sortOrder: 3,
      },
    });
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ sortOrder: 3, isActive: true }),
    );
  });

  it("rejects images outside the managed media library", async () => {
    const response = await POST(
      request({
        title: "Réception élégante",
        description: "Une scénographie raffinée pour une réception.",
        imageUrl: "https://example.com/image.jpg",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
