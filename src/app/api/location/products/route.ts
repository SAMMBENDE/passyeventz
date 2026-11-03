import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import { serializePublicRental } from "@/lib/rental-catalogue";
import { RentalModel } from "@/models/rental";

export async function GET() {
  try {
    await connectToDatabase();
    const rentals = await RentalModel.find({ isActive: true, stockQuantity: { $gt: 0 } })
      .sort({ category: 1, sortOrder: 1, name: 1 })
      .select("sku name description category subcategory unitPriceCents priceUnit minRentalQuantity stockQuantity imageUrl showStock")
      .lean();

    return NextResponse.json({ products: rentals.map(serializePublicRental) });
  } catch (error) {
    console.error(
      "Failed to load rental catalogue:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { error: "Le catalogue est momentanément indisponible. Réessayez plus tard." },
      { status: 503 },
    );
  }
}
