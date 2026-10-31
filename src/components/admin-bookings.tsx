"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { formatPriceCents } from "@/lib/quote";
import { nextBookingStatuses } from "@/lib/booking-status";
import type { BookingStatus } from "@/lib/validation";

type AdminBooking = {
  id: string;
  quoteId: string;
  quoteReference: string;
  depositCents: number | null;
  reference: string;
  startsAt: string;
  endsAt: string;
  customer: { email: string; name?: string; phone?: string };
  eventType: string;
  rentalItems: Array<{ sku: string; name: string; quantity: number; unitPriceCents: number }>;
  deliveryAddress?: string;
  note?: string;
  status: BookingStatus;
  updatedAt: string;
  payment: {
    id: string;
    provider: "stripe" | "paypal";
    amountCents: number;
    status: "pending" | "paid" | "expired" | "failed";
    checkoutUrl?: string;
    expiresAt: string;
  } | null;
};

type ApprovedQuote = {
  id: string;
  reference: string;
  eventType: string;
  eventDate: string;
  customer: { email: string; name?: string };
};

type CreatedPaymentLink = {
  id: string;
  checkoutUrl: string;
  expiresAt: string;
  amountCents: number;
};

type Props = {
  bookings: AdminBooking[];
  approvedQuotes: ApprovedQuote[];
};

const statusLabels: Record<BookingStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
  expired: "Expirée",
};

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

function nextDay(date: string): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

function errorMessage(result: unknown, fallback: string): string {
  if (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof result.error === "string"
  ) {
    return result.error;
  }
  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCreatedPaymentLink(value: unknown): value is CreatedPaymentLink {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.checkoutUrl === "string" &&
    typeof value.expiresAt === "string" &&
    typeof value.amountCents === "number"
  );
}

async function readJsonResponse(response: Response): Promise<unknown> {
  try {
    return JSON.parse(await response.text()) as unknown;
  } catch {
    return null;
  }
}

export function AdminBookings({ bookings, approvedQuotes }: Props) {
  const router = useRouter();
  const [bookingList, setBookingList] = useState(bookings);
  const [bookedQuoteIds, setBookedQuoteIds] = useState(
    () => new Set(bookings.map((booking) => booking.quoteId)),
  );
  const [selectedQuoteId, setSelectedQuoteId] = useState(approvedQuotes[0]?.id ?? "");
  const initialDate = approvedQuotes[0]?.eventDate.slice(0, 10) ?? "";
  const [startsAt, setStartsAt] = useState(initialDate ? `${initialDate}T10:00` : "");
  const [endsAt, setEndsAt] = useState(initialDate ? `${nextDay(initialDate)}T10:00` : "");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [note, setNote] = useState("");
  const [createError, setCreateError] = useState("");
  const [pendingCreate, setPendingCreate] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [pendingPayment, setPendingPayment] = useState<{
    bookingId: string;
    provider: "stripe" | "paypal";
  } | null>(null);
  const [paymentMessages, setPaymentMessages] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const availableQuotes = approvedQuotes.filter((quote) => !bookedQuoteIds.has(quote.id));
  const selectedQuote = availableQuotes.find((quote) => quote.id === selectedQuoteId);

  function selectQuote(quoteId: string) {
    setSelectedQuoteId(quoteId);
    const quote = approvedQuotes.find((item) => item.id === quoteId);
    if (!quote) return;
    const date = quote.eventDate.slice(0, 10);
    setStartsAt(`${date}T10:00`);
    setEndsAt(`${nextDay(date)}T10:00`);
  }

  async function createBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedQuote) return;
    setCreateError("");
    setPendingCreate(true);

    try {
      const response = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          quoteId: selectedQuote.id,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          deliveryAddress: deliveryAddress.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });
      const result = await readJsonResponse(response);

      if (!response.ok) {
        setCreateError(errorMessage(result, "Impossible de créer la réservation."));
        return;
      }
      if (
        typeof result !== "object" ||
        result === null ||
        !("booking" in result) ||
        typeof result.booking !== "object" ||
        result.booking === null ||
        !("id" in result.booking) ||
        typeof result.booking.id !== "string"
      ) {
        setCreateError("Réponse invalide du serveur. Actualisez la page.");
        return;
      }

      setBookedQuoteIds((current) => new Set(current).add(selectedQuote.id));
      setSelectedQuoteId("");
      setDeliveryAddress("");
      setNote("");
      router.refresh();
    } catch {
      setCreateError("Connexion impossible. Veuillez réessayer.");
    } finally {
      setPendingCreate(false);
    }
  }

  async function updateStatus(booking: AdminBooking, status: BookingStatus) {
    setPendingStatusId(booking.id);
    setErrors((current) => ({ ...current, [booking.id]: "" }));

    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, updatedAt: booking.updatedAt }),
      });
      const result = await readJsonResponse(response);
      if (!response.ok) {
        setErrors((current) => ({
          ...current,
          [booking.id]: errorMessage(result, "Impossible de modifier la réservation."),
        }));
        return;
      }

      setBookingList((current) =>
        current.map((item) =>
          item.id === booking.id
            ? {
                ...item,
                status,
                updatedAt:
                  typeof result === "object" &&
                  result !== null &&
                  "booking" in result &&
                  typeof result.booking === "object" &&
                  result.booking !== null &&
                  "updatedAt" in result.booking &&
                  typeof result.booking.updatedAt === "string"
                    ? result.booking.updatedAt
                    : item.updatedAt,
              }
            : item,
        ),
      );
      router.refresh();
    } catch {
      setErrors((current) => ({
        ...current,
        [booking.id]: "Connexion impossible. Veuillez réessayer.",
      }));
    } finally {
      setPendingStatusId(null);
    }
  }

  async function createPaymentLink(
    booking: AdminBooking,
    provider: "stripe" | "paypal",
  ) {
    setPendingPayment({ bookingId: booking.id, provider });
    setErrors((current) => ({ ...current, [booking.id]: "" }));
    setPaymentMessages((current) => ({ ...current, [booking.id]: "" }));

    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}/payments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const result = await readJsonResponse(response);
      if (!response.ok) {
        setErrors((current) => ({
          ...current,
          [booking.id]: errorMessage(result, "Impossible de créer le lien de paiement."),
        }));
        return;
      }

      const payment = isRecord(result) ? result.payment : null;
      if (!isCreatedPaymentLink(payment)) {
        setErrors((current) => ({
          ...current,
          [booking.id]: "Réponse invalide du serveur. Actualisez la page.",
        }));
        return;
      }

      setBookingList((current) =>
        current.map((item) =>
          item.id === booking.id
            ? {
                ...item,
                payment: {
                  id: payment.id,
                  provider,
                  amountCents: payment.amountCents,
                  status: "pending",
                  checkoutUrl: payment.checkoutUrl,
                  expiresAt: payment.expiresAt,
                },
              }
            : item,
        ),
      );
      setPaymentMessages((current) => ({
        ...current,
        [booking.id]: "Lien sécurisé créé. Copiez-le pour l’envoyer au client.",
      }));
      router.refresh();
    } catch {
      setErrors((current) => ({
        ...current,
        [booking.id]: "Connexion impossible. Veuillez réessayer.",
      }));
    } finally {
      setPendingPayment(null);
    }
  }

  async function copyPaymentLink(booking: AdminBooking) {
    const checkoutUrl = booking.payment?.checkoutUrl;
    if (!checkoutUrl) return;

    try {
      await navigator.clipboard.writeText(checkoutUrl);
      setPaymentMessages((current) => ({ ...current, [booking.id]: "Lien copié." }));
    } catch {
      setErrors((current) => ({
        ...current,
        [booking.id]: "Impossible de copier le lien. Sélectionnez et copiez-le manuellement.",
      }));
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={createBooking}
        className="rounded-3xl border border-line bg-white p-5 shadow-[0_18px_40px_rgba(8,7,6,0.04)] sm:p-7"
      >
        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Nouvelle réservation</p>
          <h3 className="mt-2 font-serif text-3xl text-foreground">À partir d’un devis approuvé</h3>
        </div>

        {availableQuotes.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-muted sm:col-span-2">
                Devis
                <select
                  required
                  value={selectedQuoteId}
                  onChange={(event) => selectQuote(event.target.value)}
                  className="h-11 w-full rounded-xl border border-line bg-background px-3 text-foreground"
                >
                  <option value="">Choisir un devis approuvé</option>
                  {availableQuotes.map((quote) => (
                    <option key={quote.id} value={quote.id}>
                      {quote.reference} — {quote.eventType} — {quote.customer.name ?? quote.customer.email}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm text-muted">
                Début de réservation
                <input
                  required
                  type="datetime-local"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                  className="h-11 w-full rounded-xl border border-line bg-background px-3 text-foreground"
                />
              </label>
              <label className="space-y-2 text-sm text-muted">
                Fin de réservation
                <input
                  required
                  type="datetime-local"
                  min={startsAt}
                  value={endsAt}
                  onChange={(event) => setEndsAt(event.target.value)}
                  className="h-11 w-full rounded-xl border border-line bg-background px-3 text-foreground"
                />
              </label>
              <label className="space-y-2 text-sm text-muted sm:col-span-2">
                Adresse de livraison (facultatif)
                <input
                  value={deliveryAddress}
                  onChange={(event) => setDeliveryAddress(event.target.value)}
                  minLength={5}
                  maxLength={500}
                  className="h-11 w-full rounded-xl border border-line bg-background px-3 text-foreground"
                />
              </label>
              <label className="space-y-2 text-sm text-muted sm:col-span-2">
                Note (facultatif)
                <textarea
                  rows={2}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={2000}
                  className="w-full rounded-xl border border-line bg-background px-3 py-2 text-foreground"
                />
              </label>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted">
              La réservation bloque les articles du devis pour la période choisie. Les réservations
              en attente restent actives jusqu’à ce que leur statut soit modifié.
            </p>
            {createError ? (
              <p role="alert" className="mt-3 text-sm text-red-700">{createError}</p>
            ) : null}
            <button
              type="submit"
              disabled={pendingCreate || !selectedQuote}
              className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-gold px-5 text-sm font-semibold text-foreground hover:bg-light-gold disabled:cursor-wait disabled:opacity-60"
            >
              {pendingCreate ? "Création…" : "Créer la réservation"}
            </button>
          </>
        ) : (
          <p className="text-sm text-muted">
            Aucun devis approuvé disponible. Un devis ne peut être réservé qu’une seule fois.
          </p>
        )}
      </form>

      {bookingList.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-white px-6 py-10 text-center">
          <p className="font-serif text-2xl text-foreground">Aucune réservation pour le moment</p>
          <p className="mt-2 text-sm text-muted">
            Les réservations créées à partir des devis approuvés apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookingList.map((booking) => {
            const transitions = nextBookingStatuses(booking.status);
            return (
              <article
                key={booking.id}
                className="rounded-3xl border border-line bg-white p-5 shadow-[0_18px_40px_rgba(8,7,6,0.04)] sm:p-7"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-serif text-2xl text-foreground">{booking.eventType}</h3>
                      <span className="rounded-full bg-[rgba(214,163,77,0.12)] px-3 py-1 text-xs font-medium text-foreground">
                        {statusLabels[booking.status]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      {booking.reference} · Devis {booking.quoteReference}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {formatDateTime(booking.startsAt)} – {formatDateTime(booking.endsAt)}
                    </p>
                  </div>
                  {transitions.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {transitions.map((status) => (
                        <button
                          key={status}
                          type="button"
                          disabled={pendingStatusId !== null}
                          onClick={() => updateStatus(booking, status)}
                          className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium disabled:opacity-60 ${
                            status === "cancelled"
                              ? "border border-red-200 text-red-700 hover:bg-red-50"
                              : "border border-line text-foreground hover:border-gold"
                          }`}
                        >
                          {pendingStatusId === booking.id
                            ? "Mise à jour…"
                            : status === "confirmed"
                              ? "Confirmer"
                              : status === "in_progress"
                                ? "Démarrer"
                                : status === "completed"
                                  ? "Terminer"
                                  : "Annuler"}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">Client</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {booking.customer.name ?? "Nom non renseigné"}
                    </p>
                    <a href={`mailto:${booking.customer.email}`} className="text-sm text-muted underline">
                      {booking.customer.email}
                    </a>
                    {booking.customer.phone ? (
                      <a href={`tel:${booking.customer.phone}`} className="mt-1 block text-sm text-muted">
                        {booking.customer.phone}
                      </a>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">Articles réservés</p>
                    {booking.rentalItems.length > 0 ? (
                      <ul className="mt-1 space-y-1 text-sm text-muted">
                        {booking.rentalItems.map((item) => (
                          <li key={item.sku}>
                            {item.name} × {item.quantity} ·{" "}
                            {formatPriceCents(item.unitPriceCents * item.quantity)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm text-muted">Aucun article de location</p>
                    )}
                  </div>
                </div>

                {booking.deliveryAddress ? (
                  <p className="mt-4 text-sm text-muted">
                    <span className="font-medium text-foreground">Livraison :</span>{" "}
                    {booking.deliveryAddress}
                  </p>
                ) : null}
                {booking.note ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted">
                    <span className="font-medium text-foreground">Note :</span> {booking.note}
                  </p>
                ) : null}
                <div className="mt-4 rounded-2xl border border-line bg-background p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted">Acompte</p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {booking.payment
                          ? formatPriceCents(booking.payment.amountCents)
                          : booking.depositCents !== null
                            ? formatPriceCents(booking.depositCents)
                            : "Montant indisponible"}
                        {booking.payment?.status === "paid"
                          ? " · Réglé"
                          : booking.payment?.status === "pending"
                            ? ` · En attente (${booking.payment.provider === "stripe" ? "Stripe" : "PayPal"})`
                            : booking.payment?.status === "expired"
                              ? " · Lien expiré"
                              : booking.payment?.status === "failed"
                                ? " · Échec de création"
                                : ""}
                      </p>
                    </div>
                    {booking.payment?.status === "pending" && booking.payment.checkoutUrl ? (
                      <button
                        type="button"
                        onClick={() => copyPaymentLink(booking)}
                        className="inline-flex h-10 items-center justify-center rounded-full border border-line px-4 text-sm font-medium text-foreground hover:border-gold"
                      >
                        Copier le lien sécurisé
                      </button>
                    ) : null}
                  </div>
                  {booking.payment?.status === "pending" ? (
                    <>
                      <p className="mt-2 text-xs text-muted">
                        Valable jusqu’au {formatDateTime(booking.payment.expiresAt)}. Envoyez ce lien
                        au client par votre canal habituel.
                      </p>
                      {booking.payment.checkoutUrl ? (
                        <a
                          href={booking.payment.checkoutUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 block break-all text-xs text-muted underline"
                        >
                          {booking.payment.checkoutUrl}
                        </a>
                      ) : null}
                    </>
                  ) : null}
                  {!booking.payment || ["expired", "failed"].includes(booking.payment.status) ? (
                    ["pending", "confirmed"].includes(booking.status) ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(["stripe", "paypal"] as const).map((provider) => (
                          <button
                            key={provider}
                            type="button"
                            disabled={pendingPayment !== null}
                            onClick={() => createPaymentLink(booking, provider)}
                            className="inline-flex h-10 items-center justify-center rounded-full bg-gold px-4 text-sm font-semibold text-foreground hover:bg-light-gold disabled:cursor-wait disabled:opacity-60"
                          >
                            {pendingPayment?.bookingId === booking.id &&
                            pendingPayment.provider === provider
                              ? "Création…"
                              : `Créer un lien ${provider === "stripe" ? "Stripe" : "PayPal"}`}
                          </button>
                        ))}
                      </div>
                    ) : null
                  ) : null}
                  {paymentMessages[booking.id] ? (
                    <p role="status" className="mt-2 text-sm text-muted">
                      {paymentMessages[booking.id]}
                    </p>
                  ) : null}
                </div>
                {errors[booking.id] ? (
                  <p role="alert" className="mt-3 text-sm text-red-700">{errors[booking.id]}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
