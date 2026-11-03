import { Types } from "mongoose";
import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { isAllowedRentalImageUrl, serializeAdminRental } from "@/lib/rental-catalogue";
import { rentalUpdateSchema } from "@/lib/validation";
import { BookingModel } from "@/models/booking";
import { QuoteModel } from "@/models/quote";
import { RentalModel } from "@/models/rental";

const objectIdPattern = /^[\da-f]{24}$/i;
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

async function authorize(request: Request): Promise<NextResponse | null> {
  const session = await getAdminSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Votre session a expiré. Reconnectez-vous." }, { status: 401 });
  }
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > maxRequestSize) {
    return NextResponse.json({ error: "La demande est trop volumineuse." }, { status: 413 });
  }
  return null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ rentalId: string }> },
) {
  const denied = await authorize(request);
  if (denied) return denied;
  const { rentalId } = await context.params;
  if (!objectIdPattern.test(rentalId)) {
    return NextResponse.json({ error: "Identifiant d’article invalide." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Le format de la demande est invalide." }, { status: 400 });
  }
  const parsed = rentalUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Vérifiez les informations modifiées." }, { status: 400 });
  }
  try {
    await connectToDatabase();
    const current = await RentalModel.findById(rentalId)
      .select("sku imageUrl stockQuantity minRentalQuantity")
      .lean();
    if (!current) return NextResponse.json({ error: "Article introuvable." }, { status: 404 });

    if (parsed.data.sku && parsed.data.sku.toUpperCase() !== current.sku) {
      return NextResponse.json(
        { error: "La référence ne peut pas être modifiée après création." },
        { status: 409 },
      );
    }
    if (
      parsed.data.imageUrl &&
      parsed.data.imageUrl !== current.imageUrl &&
      !isAllowedRentalImageUrl(parsed.data.imageUrl)
    ) {
      return NextResponse.json(
        { error: "L’image doit provenir de la médiathèque autorisée." },
        { status: 400 },
      );
    }
    const nextStock = parsed.data.stockQuantity ?? current.stockQuantity;
    const nextMinimum = parsed.data.minRentalQuantity ?? current.minRentalQuantity ?? 1;
    if (nextStock > 0 && nextMinimum > nextStock) {
      return NextResponse.json(
        { error: "La quantité minimale ne peut pas dépasser le stock disponible." },
        { status: 400 },
      );
    }

    const updates = { ...parsed.data };
    delete updates.sku;
    const product = await RentalModel.findByIdAndUpdate(
      rentalId,
      { $set: updates },
      { new: true, runValidators: true },
    ).lean();
    if (!product) return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
    return NextResponse.json({ product: serializeAdminRental(product) });
  } catch (error) {
    console.error(
      "Failed to update rental product:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json({ error: "Impossible de modifier cet article." }, { status: 503 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ rentalId: string }> },
) {
  const denied = await authorize(request);
  if (denied) return denied;
  const { rentalId } = await context.params;
  if (!objectIdPattern.test(rentalId)) {
    return NextResponse.json({ error: "Identifiant d’article invalide." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const product = await RentalModel.findById(rentalId).select("sku").lean();
    if (!product) return NextResponse.json({ error: "Article introuvable." }, { status: 404 });

    const rentalObjectId = new Types.ObjectId(rentalId);
    const [bookingReference, quoteReference] = await Promise.all([
      BookingModel.exists({ "rentalItems.rentalId": rentalObjectId }),
      QuoteModel.exists({ "lineItems.id": product.sku }),
    ]);
    if (bookingReference || quoteReference) {
      return NextResponse.json(
        { error: "Cet article figure dans l’historique. Désactivez-le au lieu de le supprimer." },
        { status: 409 },
      );
    }

    await RentalModel.deleteOne({ _id: rentalObjectId });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error(
      "Failed to delete rental product:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json({ error: "Impossible de supprimer cet article." }, { status: 503 });
  }
}
