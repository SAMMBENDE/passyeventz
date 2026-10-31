import { NextResponse } from "next/server";

import {
  createAdminSessionCookieValue,
  getAdminSessionCookieName,
  getAdminSessionCookieOptions,
  verifyAdminCredentials,
} from "@/lib/admin-auth";
import { adminLoginSchema } from "@/lib/validation";

const maxRequestSize = 4 * 1024;

function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  }

  if (Number(request.headers.get("content-length") ?? 0) > maxRequestSize) {
    return NextResponse.json({ error: "La demande est trop volumineuse." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Le format de la demande est invalide." }, { status: 400 });
  }

  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Adresse e-mail ou mot de passe invalide." },
      { status: 400 },
    );
  }

  try {
    if (!(await verifyAdminCredentials(parsed.data.email, parsed.data.password))) {
      return NextResponse.json(
        { error: "Adresse e-mail ou mot de passe invalide." },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(
      getAdminSessionCookieName(),
      createAdminSessionCookieValue(),
      getAdminSessionCookieOptions(),
    );
    return response;
  } catch (error) {
    console.error(
      "Admin sign-in failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { error: "La connexion administrateur est momentanément indisponible." },
      { status: 503 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(getAdminSessionCookieName(), "", {
    ...getAdminSessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
