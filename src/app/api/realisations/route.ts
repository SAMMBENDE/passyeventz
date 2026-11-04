import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import { serializeRealisation } from "@/lib/realisations";
import { RealisationModel } from "@/models/realisation";

export async function GET() {
  try {
    await connectToDatabase();
    const realisations = await RealisationModel.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .select("title description category imageUrl isActive sortOrder")
      .lean();

    return NextResponse.json({
      realisations: realisations.map(serializeRealisation),
    });
  } catch (error) {
    console.error(
      "Failed to load public realisations:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { error: "Les réalisations sont momentanément indisponibles." },
      { status: 503 },
    );
  }
}
