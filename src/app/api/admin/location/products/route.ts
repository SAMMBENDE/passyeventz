import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { isAllowedRentalImageUrl, serializeAdminRental } from "@/lib/rental-catalogue";
import { rentalCreateSchema } from "@/lib/validation";
import { RentalModel } from "@/models/rental";

const maxRequestSize = 24 * 1024;

function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function readAdminRequest(
  request: Request,
  requireOrigin = true,
): Promise<NextResponse | null> {
  const session = await getAdminSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Votre session a expiré. Reconnectez-vous." }, { status: 401 });
  }
  if ((requireOrigin || request.headers.has("origin")) && !hasSameOrigin(request)) {
    return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > maxRequestSize) {
    return NextResponse.json({ error: "La demande est trop volumineuse." }, { status: 413 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = await readAdminRequest(request, false);
  if (denied) return denied;

  try {
    await connectToDatabase();
    const rentals = await RentalModel.find({})
      .sort({ category: 1, sortOrder: 1, name: 1 })
      .select("sku name description category subcategory unitPriceCents replacementPriceCents priceUnit minRentalQuantity stockQuantity imageUrl showStock isActive sortOrder")
      .lean();
    return NextResponse.json({ products: rentals.map(serializeAdminRental) });
  } catch (error) {
    console.error(
      "Failed to load admin rental catalogue:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json({ error: "Impossible de charger le catalogue." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const denied = await readAdminRequest(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Le format de la demande est invalide." }, { status: 400 });
  }

  const parsed = rentalCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Vérifiez les informations de l’article." },
      { status: 400 },
    );
  }
  const data = { ...parsed.data, sku: parsed.data.sku.toUpperCase() };
  if (!isAllowedRentalImageUrl(data.imageUrl)) {
    return NextResponse.json({ error: "L’image doit provenir de la médiathèque autorisée." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const product = await RentalModel.create(data);
    return NextResponse.json({ product: serializeAdminRental(product) }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "Cette référence produit existe déjà." }, { status: 409 });
    }
    console.error(
      "Failed to create rental product:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json({ error: "Impossible d’ajouter cet article." }, { status: 503 });
  }
}
