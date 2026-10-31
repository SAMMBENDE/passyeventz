import { NextResponse } from "next/server";

import { DepositPaymentError, createDepositCheckoutLink } from "@/lib/deposit-payments";
import { getAdminSession } from "@/lib/admin-auth";
import { readRequestBody, RequestBodyTooLargeError } from "@/lib/request-body";
import { paymentProviderSchema } from "@/lib/validation";

const objectIdPattern = /^[\da-f]{24}$/i;
const maxRequestSize = 1024;

function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function getBaseUrl(request: Request): string {
  const configuredUrl = process.env.APP_BASE_URL?.trim();
  const baseUrl = configuredUrl || new URL(request.url).origin;
  const parsedUrl = new URL(baseUrl);
  if (
    process.env.NODE_ENV === "production" &&
    (parsedUrl.protocol !== "https:" || !configuredUrl)
  ) {
    throw new DepositPaymentError(
      "DEPOSIT_NOT_CONFIGURED",
      "L’URL publique HTTPS du site doit être configurée.",
    );
  }
  return parsedUrl.origin;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ bookingId: string }> },
) {
  const session = await getAdminSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json(
      { error: "Votre session a expiré. Reconnectez-vous." },
      { status: 401 },
    );
  }

  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  }

  const { bookingId } = await context.params;
  if (!objectIdPattern.test(bookingId)) {
    return NextResponse.json({ error: "Identifiant de réservation invalide." }, { status: 400 });
  }
  let body: unknown;
  try {
    body = JSON.parse((await readRequestBody(request, maxRequestSize)).toString("utf8")) as unknown;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "La demande est trop volumineuse." }, { status: 413 });
    }
    return NextResponse.json({ error: "Le format de la demande est invalide." }, { status: 400 });
  }

  const parsed = paymentProviderSchema.safeParse(
    typeof body === "object" && body !== null && "provider" in body ? body.provider : undefined,
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Choisissez Stripe ou PayPal." }, { status: 400 });
  }

  try {
    const payment = await createDepositCheckoutLink(
      bookingId,
      parsed.data,
      getBaseUrl(request),
    );
    return NextResponse.json({ payment });
  } catch (error) {
    if (error instanceof DepositPaymentError) {
      const status =
        error.code === "INVALID_BOOKING"
          ? 404
          : error.code === "DEPOSIT_NOT_CONFIGURED" ||
              error.code === "PAYMENT_PROVIDER_ERROR"
            ? 503
            : error.code === "PAYMENT_ALREADY_PENDING" || error.code === "DEPOSIT_ALREADY_PAID"
              ? 409
              : 422;
      return NextResponse.json({ error: error.message }, { status });
    }

    console.error(
      "Failed to create deposit checkout link:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { error: "Impossible de créer le lien de paiement pour le moment." },
      { status: 503 },
    );
  }
}
