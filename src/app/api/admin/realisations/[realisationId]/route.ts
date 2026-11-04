import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { isAllowedRentalImageUrl } from "@/lib/rental-catalogue";
import { serializeRealisation } from "@/lib/realisations";
import { realisationUpdateSchema } from "@/lib/validation";
import { RealisationModel } from "@/models/realisation";

const objectIdPattern = /^[\da-f]{24}$/i;
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
  context: { params: Promise<{ realisationId: string }> },
) {
  const denied = await authorize(request);
  if (denied) return denied;

  const { realisationId } = await context.params;
  if (!objectIdPattern.test(realisationId)) {
    return NextResponse.json({ error: "Identifiant de réalisation invalide." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Le format de la demande est invalide." }, { status: 400 });
  }
  const parsed = realisationUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Vérifiez les informations modifiées." }, { status: 400 });
  }
  if (parsed.data.imageUrl && !isAllowedRentalImageUrl(parsed.data.imageUrl)) {
    return NextResponse.json(
      { error: "L’image doit provenir de la médiathèque Cloudinary autorisée." },
      { status: 400 },
    );
  }

  try {
    await connectToDatabase();
    const realisation = await RealisationModel.findByIdAndUpdate(
      realisationId,
      { $set: parsed.data },
      { new: true, runValidators: true },
    )
      .select("title description category imageUrl isActive sortOrder")
      .lean();
    if (!realisation) {
      return NextResponse.json({ error: "Réalisation introuvable." }, { status: 404 });
    }
    return NextResponse.json({ realisation: serializeRealisation(realisation) });
  } catch (error) {
    console.error(
      "Failed to update realisation:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json({ error: "Impossible de modifier cette réalisation." }, { status: 503 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ realisationId: string }> },
) {
  const denied = await authorize(request);
  if (denied) return denied;

  const { realisationId } = await context.params;
  if (!objectIdPattern.test(realisationId)) {
    return NextResponse.json({ error: "Identifiant de réalisation invalide." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const result = await RealisationModel.deleteOne({ _id: realisationId });
    if (!result.deletedCount) {
      return NextResponse.json({ error: "Réalisation introuvable." }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error(
      "Failed to delete realisation:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json({ error: "Impossible de supprimer cette réalisation." }, { status: 503 });
  }
}
