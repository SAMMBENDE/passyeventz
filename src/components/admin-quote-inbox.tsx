"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";

import { calculateQuote, formatPriceCents } from "@/lib/quote";
import type { QuoteCalculationResult, QuoteStatus } from "@/lib/quote";
import { quoteEditorResponseSchema } from "@/lib/validation";

type AdminQuoteLineItem = {
  id: string;
  label: string;
  quantity: number;
  unitPriceCents: number;
  type?: "service" | "rental" | "addon";
};

type AdminQuote = {
  id: string;
  reference: string;
  eventType: string;
  eventDate: string;
  guestCount: number;
  customer: { email: string; name?: string; phone?: string };
  note?: string;
  services: string[];
  lineItems: AdminQuoteLineItem[];
  pricing?: Omit<
    QuoteCalculationResult,
    "taxRateBasisPoints" | "depositBasisPoints" | "advanceBasisPoints"
  > &
    Partial<
      Pick<QuoteCalculationResult, "taxRateBasisPoints" | "depositBasisPoints" | "advanceBasisPoints">
    >;
  status: QuoteStatus;
  createdAt: string | null;
  updatedAt: string;
};

type Props = {
  quotes: AdminQuote[];
};

const statusLabels: Record<QuoteStatus, string> = {
  draft: "Brouillon",
  submitted: "À traiter",
  revised: "Révisé",
  approved: "Approuvé",
  rejected: "Refusé",
  confirmed: "Confirmé",
  in_progress: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

function percentBasisPoints(value: number | undefined, numerator: number, denominator: number) {
  if (value !== undefined) return value;
  if (denominator <= 0) return numerator === 0 ? 0 : 2000;
  return Math.min(10_000, Math.max(0, Math.round((numerator / denominator) * 10_000)));
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

async function readJsonResponse(response: Response): Promise<unknown> {
  const body = await response.text();
  try {
    return JSON.parse(body) as unknown;
  } catch {
    if (response.status === 401 || response.redirected) {
      return { error: "Votre session a expiré. Reconnectez-vous." };
    }
    return null;
  }
}

function QuoteEditor({
  quote,
  onCancel,
  onSave,
}: {
  quote: AdminQuote;
  onCancel: () => void;
  onSave: (updatedQuote: Partial<AdminQuote>) => void;
}) {
  const [eventType, setEventType] = useState(quote.eventType);
  const [eventDate, setEventDate] = useState(quote.eventDate.slice(0, 10));
  const [guestCount, setGuestCount] = useState(String(quote.guestCount));
  const [services, setServices] = useState(quote.services.join("\n"));
  const [note, setNote] = useState(quote.note ?? "");
  const [lineItems, setLineItems] = useState(
    quote.lineItems.map((item) => ({
      ...item,
      type: item.type ?? "service",
      quantity: String(item.quantity),
      unitPriceEuros: (item.unitPriceCents / 100).toFixed(2),
    })),
  );
  const subtotalCents = quote.pricing?.subtotalCents ?? 0;
  const totalCents = quote.pricing?.totalCents ?? 0;
  const [deliveryEuros, setDeliveryEuros] = useState(
    ((quote.pricing?.deliveryCents ?? 0) / 100).toFixed(2),
  );
  const [cleaningEuros, setCleaningEuros] = useState(
    ((quote.pricing?.cleaningCents ?? 0) / 100).toFixed(2),
  );
  const [taxPercent, setTaxPercent] = useState(
    (
      percentBasisPoints(
        quote.pricing?.taxRateBasisPoints,
        quote.pricing?.taxCents ?? 0,
        subtotalCents + (quote.pricing?.deliveryCents ?? 0) + (quote.pricing?.cleaningCents ?? 0),
      ) / 100
    ).toFixed(2),
  );
  const [depositPercent, setDepositPercent] = useState(
    (
      percentBasisPoints(quote.pricing?.depositBasisPoints, quote.pricing?.depositCents ?? 0, totalCents) /
      100
    ).toFixed(2),
  );
  const [advancePercent, setAdvancePercent] = useState(
    (
      percentBasisPoints(
        quote.pricing?.advanceBasisPoints,
        quote.pricing?.advancePaymentCents ?? 0,
        totalCents,
      ) / 100
    ).toFixed(2),
  );
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function updateLineItem(index: number, field: string, value: string) {
    setLineItems((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }

  function centsFromEuro(value: string): number {
    return Math.round(Number(value) * 100);
  }

  const preview = calculateQuote({
    items: lineItems.map((item) => ({
      id: item.id,
      label: item.label,
      quantity: Number(item.quantity) || 0,
      unitPriceCents: centsFromEuro(item.unitPriceEuros) || 0,
      type: item.type,
    })),
    deliveryCents: centsFromEuro(deliveryEuros) || 0,
    cleaningCents: centsFromEuro(cleaningEuros) || 0,
    taxRate: (Number(taxPercent) || 0) / 100,
    depositPercent: (Number(depositPercent) || 0) / 100,
    advancePercent: (Number(advancePercent) || 0) / 100,
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/quotes/${quote.id}/edit`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          updatedAt: quote.updatedAt,
          eventType,
          eventDate,
          guestCount: Number(guestCount),
          services: services.split("\n").map((service) => service.trim()).filter(Boolean),
          note,
          lineItems: lineItems.map((item) => ({
            id: item.id.trim(),
            label: item.label.trim(),
            quantity: Number(item.quantity),
            unitPriceCents: centsFromEuro(item.unitPriceEuros),
            type: item.type,
          })),
          deliveryCents: centsFromEuro(deliveryEuros),
          cleaningCents: centsFromEuro(cleaningEuros),
          taxRateBasisPoints: Math.round(Number(taxPercent) * 100),
          depositBasisPoints: Math.round(Number(depositPercent) * 100),
          advanceBasisPoints: Math.round(Number(advancePercent) * 100),
        }),
      });
      const result = await readJsonResponse(response);

      if (!response.ok) {
        setError(errorMessage(result, "Impossible d’enregistrer le devis."));
        return;
      }

      if (typeof result !== "object" || result === null || !("quote" in result)) {
        setError("Réponse invalide du serveur. Actualisez la page.");
        return;
      }

      const parsedQuote = quoteEditorResponseSchema.safeParse(result.quote);
      if (!parsedQuote.success) {
        setError("Réponse invalide du serveur. Actualisez la page.");
        return;
      }

      onSave(parsedQuote.data);
    } catch {
      setError("Connexion impossible. Veuillez réessayer.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-6 border-t border-line pt-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-2 text-sm text-muted">
          Type d’événement
          <input
            required
            minLength={2}
            maxLength={100}
            value={eventType}
            onChange={(event) => setEventType(event.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-background px-3 text-foreground"
          />
        </label>
        <label className="space-y-2 text-sm text-muted">
          Date
          <input
            required
            type="date"
            value={eventDate}
            onChange={(event) => setEventDate(event.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-background px-3 text-foreground"
          />
        </label>
        <label className="space-y-2 text-sm text-muted">
          Nombre d’invités
          <input
            required
            type="number"
            min={1}
            max={100_000}
            step={1}
            value={guestCount}
            onChange={(event) => setGuestCount(event.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-background px-3 text-foreground"
          />
        </label>
      </div>

      <label className="block space-y-2 text-sm text-muted">
        Prestations demandées (une par ligne)
        <textarea
          required
          rows={3}
          value={services}
          onChange={(event) => setServices(event.target.value)}
          className="w-full rounded-xl border border-line bg-background px-3 py-2 text-foreground"
        />
      </label>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Lignes et tarifs</h4>
            <p className="mt-1 text-xs text-muted">
              Pour une location, la référence doit être le SKU exact de l’inventaire.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setLineItems((items) => [
                ...items,
                {
                  id: "",
                  label: "",
                  quantity: "1",
                  unitPriceCents: 0,
                  unitPriceEuros: "0.00",
                  type: "service",
                },
              ])
            }
            className="rounded-full border border-line px-4 py-2 text-xs font-medium text-foreground hover:border-gold"
          >
            Ajouter une ligne
          </button>
        </div>

        <div className="space-y-3">
          {lineItems.map((item, index) => (
            <div key={`${item.id}-${index}`} className="rounded-2xl bg-background p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.4fr_0.8fr_0.8fr_1fr_auto]">
                <label className="space-y-1 text-xs text-muted">
                  Référence
                  <input
                    required
                    maxLength={100}
                    value={item.id}
                    onChange={(event) => updateLineItem(index, "id", event.target.value)}
                    className="h-10 w-full rounded-lg border border-line bg-white px-2 text-sm text-foreground"
                  />
                </label>
                <label className="space-y-1 text-xs text-muted">
                  Désignation
                  <input
                    required
                    maxLength={160}
                    value={item.label}
                    onChange={(event) => updateLineItem(index, "label", event.target.value)}
                    className="h-10 w-full rounded-lg border border-line bg-white px-2 text-sm text-foreground"
                  />
                </label>
                <label className="space-y-1 text-xs text-muted">
                  Type
                  <select
                    value={item.type}
                    onChange={(event) => updateLineItem(index, "type", event.target.value)}
                    className="h-10 w-full rounded-lg border border-line bg-white px-2 text-sm text-foreground"
                  >
                    <option value="service">Prestation</option>
                    <option value="rental">Location</option>
                    <option value="addon">Supplément</option>
                  </select>
                </label>
                <label className="space-y-1 text-xs text-muted">
                  Quantité
                  <input
                    required
                    type="number"
                    min={1}
                    max={100_000}
                    step={1}
                    value={item.quantity}
                    onChange={(event) => updateLineItem(index, "quantity", event.target.value)}
                    className="h-10 w-full rounded-lg border border-line bg-white px-2 text-sm text-foreground"
                  />
                </label>
                <label className="space-y-1 text-xs text-muted">
                  Prix unitaire (€)
                  <input
                    required
                    type="number"
                    min={0}
                    max={1_000_000}
                    step="0.01"
                    value={item.unitPriceEuros}
                    onChange={(event) =>
                      updateLineItem(index, "unitPriceEuros", event.target.value)
                    }
                    className="h-10 w-full rounded-lg border border-line bg-white px-2 text-sm text-foreground"
                  />
                </label>
                <button
                  type="button"
                  aria-label={`Supprimer la ligne ${index + 1}`}
                  onClick={() => setLineItems((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                  className="mt-5 h-10 rounded-lg px-3 text-xs text-red-700 hover:bg-red-50"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {(
          [
            { label: "Livraison (€)", value: deliveryEuros, setter: setDeliveryEuros },
            { label: "Nettoyage (€)", value: cleaningEuros, setter: setCleaningEuros },
            { label: "TVA (%)", value: taxPercent, setter: setTaxPercent },
            { label: "Acompte (%)", value: depositPercent, setter: setDepositPercent },
            { label: "Avance (%)", value: advancePercent, setter: setAdvancePercent },
          ] satisfies Array<{
            label: string;
            value: string;
            setter: Dispatch<SetStateAction<string>>;
          }>
        ).map(({ label, value, setter }) => (
          <label key={label} className="space-y-2 text-sm text-muted">
            {label}
            <input
              required
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={value}
              onChange={(event) => setter(event.target.value)}
              className="h-11 w-full rounded-xl border border-line bg-background px-3 text-foreground"
            />
          </label>
        ))}
      </div>

      <label className="block space-y-2 text-sm text-muted">
        Note pour le devis
        <textarea
          rows={3}
          maxLength={2000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="w-full rounded-xl border border-line bg-background px-3 py-2 text-foreground"
        />
      </label>

      <div className="rounded-2xl border border-[rgba(214,163,77,0.22)] bg-[rgba(214,163,77,0.06)] p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">Aperçu calculé</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <p className="text-muted">Sous-total <strong className="block text-foreground">{formatPriceCents(preview.subtotalCents)}</strong></p>
          <p className="text-muted">TVA <strong className="block text-foreground">{formatPriceCents(preview.taxCents)}</strong></p>
          <p className="text-muted">Total TTC <strong className="block text-foreground">{formatPriceCents(preview.totalCents)}</strong></p>
          <p className="text-muted">Acompte <strong className="block text-foreground">{formatPriceCents(preview.depositCents)}</strong></p>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex h-11 items-center justify-center rounded-full bg-gold px-5 text-sm font-semibold text-foreground hover:bg-light-gold disabled:opacity-60"
        >
          {isSaving ? "Enregistrement…" : "Enregistrer et soumettre à validation"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="inline-flex h-11 items-center justify-center rounded-full border border-line px-5 text-sm text-muted hover:border-gold disabled:opacity-60"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

export function AdminQuoteInbox({ quotes }: Props) {
  const router = useRouter();
  const [quoteList, setQuoteList] = useState(quotes);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function reviewQuote(id: string, status: "approved" | "rejected") {
    setPendingId(id);
    setErrors((current) => ({ ...current, [id]: "" }));

    try {
      const response = await fetch(`/api/admin/quotes/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await readJsonResponse(response);

      if (!response.ok) {
        setErrors((current) => ({
          ...current,
          [id]: errorMessage(result, "Impossible de modifier ce devis."),
        }));
        return;
      }

      setQuoteList((current) =>
        current.map((quote) => (quote.id === id ? { ...quote, status } : quote)),
      );
      router.refresh();
    } catch {
      setErrors((current) => ({
        ...current,
        [id]: "Connexion impossible. Veuillez réessayer.",
      }));
    } finally {
      setPendingId(null);
    }
  }

  if (quoteList.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-line bg-white px-6 py-12 text-center">
        <p className="font-serif text-2xl text-foreground">Aucun devis pour le moment</p>
        <p className="mt-2 text-sm text-muted">Les nouvelles demandes apparaîtront ici.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {quoteList.map((quote) => {
        const canReview = quote.status === "submitted" || quote.status === "revised";
        const canEdit = canReview;
        const canApprove = canReview && Boolean(quote.pricing) && quote.lineItems.length > 0;

        return (
          <article
            key={quote.id}
            className="rounded-3xl border border-line bg-white p-5 shadow-[0_18px_40px_rgba(8,7,6,0.04)] sm:p-7"
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-serif text-2xl text-foreground">{quote.eventType}</h3>
                  <span className="rounded-full bg-[rgba(214,163,77,0.12)] px-3 py-1 text-xs font-medium text-foreground">
                    {statusLabels[quote.status]}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted">
                  {quote.reference} · Événement le {formatDate(quote.eventDate)} ·{" "}
                  {quote.guestCount} invités
                </p>
              </div>

              {quote.pricing ? (
                <div className="sm:text-right">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">Total du devis</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    {formatPriceCents(quote.pricing.totalCents)}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-5 grid gap-5 border-t border-line pt-5 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Client</p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {quote.customer.name ?? "Nom non renseigné"}
                </p>
                <a
                  href={`mailto:${quote.customer.email}`}
                  className="mt-1 inline-block text-sm text-muted underline decoration-[rgba(214,163,77,0.6)] underline-offset-4 hover:text-foreground"
                >
                  {quote.customer.email}
                </a>
                {quote.customer.phone ? (
                  <a
                    href={`tel:${quote.customer.phone}`}
                    className="mt-1 block text-sm text-muted hover:text-foreground"
                  >
                    {quote.customer.phone}
                  </a>
                ) : null}
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Prestations demandées</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {quote.services.map((service) => (
                    <li
                      key={service}
                      className="rounded-full border border-line px-3 py-1 text-xs text-muted"
                    >
                      {service}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {quote.lineItems.length > 0 ? (
              <div className="mt-5 border-t border-line pt-5">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Détail du devis</p>
                <ul className="mt-3 space-y-2">
                  {quote.lineItems.map((item, index) => (
                    <li key={`${item.id}-${index}`} className="flex justify-between gap-4 text-sm">
                      <span className="text-muted">
                        {item.label} × {item.quantity}
                      </span>
                      <span className="shrink-0 font-medium text-foreground">
                        {formatPriceCents(item.unitPriceCents * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {quote.note ? (
              <div className="mt-5 rounded-2xl bg-background p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Message du client</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {quote.note}
                </p>
              </div>
            ) : null}

            {errors[quote.id] ? (
              <p role="alert" className="mt-4 text-sm text-red-700">
                {errors[quote.id]}
              </p>
            ) : null}

            {canReview || quote.pricing ? (
              <div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-5">
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => setEditingId(editingId === quote.id ? null : quote.id)}
                    disabled={pendingId !== null}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-line px-5 text-sm font-medium text-foreground hover:border-gold disabled:opacity-60"
                  >
                    {editingId === quote.id ? "Fermer l’édition" : "Modifier le devis"}
                  </button>
                ) : null}
                {quote.pricing ? (
                  <a
                    href={`/api/admin/quotes/${quote.id}/pdf`}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-line px-5 text-sm font-medium text-foreground hover:border-gold"
                  >
                    Télécharger le PDF
                  </a>
                ) : null}
                {canApprove ? (
                  <>
                    <button
                      type="button"
                      onClick={() => reviewQuote(quote.id, "approved")}
                      disabled={pendingId !== null}
                      className="inline-flex h-10 items-center justify-center rounded-full bg-gold px-5 text-sm font-semibold text-foreground transition-colors hover:bg-light-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-wait disabled:opacity-60"
                    >
                      {pendingId === quote.id ? "Mise à jour…" : "Approuver le devis"}
                    </button>
                    <button
                      type="button"
                      onClick={() => reviewQuote(quote.id, "rejected")}
                      disabled={pendingId !== null}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-line px-5 text-sm font-medium text-muted transition-colors hover:border-red-300 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-wait disabled:opacity-60"
                    >
                      Refuser
                    </button>
                  </>
                ) : null}
                {canReview && !canApprove ? (
                  <p className="self-center text-xs text-muted">
                    Ajoutez les lignes et tarifs avant d’approuver le devis.
                  </p>
                ) : null}
              </div>
            ) : null}

            {editingId === quote.id ? (
              <QuoteEditor
                quote={quote}
                onCancel={() => setEditingId(null)}
                onSave={(updatedQuote) => {
                  setQuoteList((current) =>
                    current.map((item) =>
                      item.id === quote.id ? { ...item, ...updatedQuote } : item,
                    ),
                  );
                  setEditingId(null);
                  router.refresh();
                }}
              />
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
