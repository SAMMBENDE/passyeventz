import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { isAllowedRentalImageUrl } from "@/lib/rental-catalogue";
import { serializeRealisation } from "@/lib/realisations";
import { realisationCreateSchema } from "@/lib/validation";
import { RealisationModel } from "@/models/realisation";

const maxRequestSize = 12 * 1024;

function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function authorize(request: Request, requireOrigin = true): Promise<NextResponse | null> {
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
  const denied = await authorize(request, false);
  if (denied) return denied;

  try {
    await connectToDatabase();
    const realisations = await RealisationModel.find({})
      .sort({ sortOrder: 1, createdAt: 1 })
      .select("title description category imageUrl isActive sortOrder")
      .lean();
    return NextResponse.json({ realisations: realisations.map(serializeRealisation) });
  } catch (error) {
    console.error(
      "Failed to load admin realisations:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json({ error: "Impossible de charger les réalisations." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Le format de la demande est invalide." }, { status: 400 });
  }

  const parsed = realisationCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Vérifiez les informations de la réalisation." }, { status: 400 });
  }
  if (!isAllowedRentalImageUrl(parsed.data.imageUrl)) {
    return NextResponse.json(
      { error: "L’image doit provenir de la médiathèque Cloudinary autorisée." },
      { status: 400 },
    );
  }

  try {
    await connectToDatabase();
    const lastRealisation = await RealisationModel.findOne({})
      .sort({ sortOrder: -1 })
      .select("sortOrder")
      .lean();
    const realisation = await RealisationModel.create({
      ...parsed.data,
      sortOrder: (lastRealisation?.sortOrder ?? -1) + 1,
      isActive: true,
    });
    return NextResponse.json({ realisation: serializeRealisation(realisation) }, { status: 201 });
  } catch (error) {
    console.error(
      "Failed to create realisation:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json({ error: "Impossible d’ajouter cette réalisation." }, { status: 503 });
  }
}
