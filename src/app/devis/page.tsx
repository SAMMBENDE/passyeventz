"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { calculateQuote, formatPriceCents } from "@/lib/quote";
import { quoteRequestSchema } from "@/lib/validation";

type QuoteFormValues = {
  eventType: string;
  eventDate: string;
  guestCount: number;
  email: string;
  note?: string;
  services: string[];
};

const quoteResolver = (values: QuoteFormValues) => {
  const result = quoteRequestSchema.safeParse({
    ...values,
    guestCount: Number(values.guestCount),
  });

  if (result.success) {
    return { values: result.data, errors: {} };
  }

  const fieldErrors = result.error.flatten().fieldErrors;
  const errors = Object.fromEntries(
    Object.entries(fieldErrors).map(([key, value]) => [key, { type: "validation", message: value?.[0] ?? "Valeur invalide" }]),
  );

  return { values: {}, errors };
};

const defaultServices = [
  "Décoration de salle",
  "Location de mobilier",
  "Scénographie florale",
];

const selectedItems = [
  { id: "decoration-salle", label: "Décoration de salle", quantity: 1, unitPriceCents: 25000 },
  { id: "mobilier", label: "Location de mobilier", quantity: 1, unitPriceCents: 15000 },
  { id: "florale", label: "Scénographie florale", quantity: 1, unitPriceCents: 18000 },
];

export default function QuotePage() {
  const [reference, setReference] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const form = useForm<QuoteFormValues>({
    resolver: quoteResolver as never,
    defaultValues: {
      eventType: "Mariage",
      eventDate: "",
      guestCount: 120,
      email: "",
      note: "",
      services: defaultServices,
    },
  });

  const quoteSummary = useMemo(() => {
    return calculateQuote({
      items: selectedItems,
      deliveryCents: 4000,
      cleaningCents: 1500,
      taxRate: 0.2,
      depositPercent: 0.3,
      advancePercent: 0.4,
    });
  }, []);

  const onSubmit = async (values: QuoteFormValues) => {
    setSubmissionError(null);

    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          guestCount: Number(values.guestCount),
        }),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Impossible d’enregistrer votre demande pour le moment.";
        throw new Error(message);
      }

      if (
        typeof result !== "object" ||
        result === null ||
        !("reference" in result) ||
        typeof result.reference !== "string"
      ) {
        throw new Error("La réponse du serveur est invalide. Veuillez réessayer.");
      }

      setReference(result.reference);
      form.reset(values);
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer votre demande pour le moment. Réessayez plus tard.",
      );
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 sm:gap-6">
          <Image
            src="/images/passyeventz-logo-black.png"
            alt="PassyEventz — décoration, événementiel et location"
            width={1254}
            height={1254}
            sizes="(max-width: 639px) 72px, 96px"
            className="h-18 w-18 shrink-0 rounded-2xl border border-[rgba(214,163,77,0.2)] shadow-[0_10px_28px_rgba(8,7,6,0.12)] sm:h-24 sm:w-24"
          />
          <div className="min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-gold"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à l’accueil
            </Link>
            <p className="text-[0.72rem] uppercase tracking-[0.28em] text-gold">Devis</p>
            <h1 className="mt-2 font-serif text-3xl leading-tight text-foreground sm:text-5xl">
              Votre demande de devis
            </h1>
          </div>
        </div>
        <div className="hidden rounded-full border border-[rgba(214,163,77,0.2)] bg-[rgba(214,163,77,0.08)] px-4 py-2 text-sm text-muted md:block">
          <span className="font-medium text-foreground">Réponse sous 24h</span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={form.handleSubmit(onSubmit)} className="min-w-0 space-y-6 rounded-4xl border border-line bg-white p-6 shadow-(--shadow) sm:p-8">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2 text-sm text-muted">
              <span>Type d’événement</span>
              <select
                {...form.register("eventType")}
                className="w-full rounded-2xl border border-[rgba(8,7,6,0.12)] bg-background px-4 py-3 text-foreground outline-none focus:border-gold"
              >
                <option value="Mariage">Mariage</option>
                <option value="Baptême">Baptême</option>
                <option value="Baby shower">Baby shower</option>
                <option value="Fiançailles">Fiançailles</option>
                <option value="Anniversaire">Anniversaire</option>
                <option value="Soirée privée">Soirée privée</option>
                <option value="Événement corporate">Événement corporate</option>
              </select>
            </label>

            <label className="space-y-2 text-sm text-muted">
              <span>Date de l’événement</span>
              <input
                type="date"
                {...form.register("eventDate")}
                className="w-full rounded-2xl border border-[rgba(8,7,6,0.12)] bg-background px-4 py-3 text-foreground outline-none focus:border-gold"
              />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2 text-sm text-muted">
              <span>Nombre d’invités</span>
              <input
                type="number"
                min={1}
                {...form.register("guestCount")}
                className="w-full rounded-2xl border border-[rgba(8,7,6,0.12)] bg-background px-4 py-3 text-foreground outline-none focus:border-gold"
              />
            </label>

            <label className="space-y-2 text-sm text-muted">
              <span>Email</span>
              <input
                type="email"
                placeholder="vous@example.com"
                {...form.register("email")}
                className="w-full rounded-2xl border border-[rgba(8,7,6,0.12)] bg-background px-4 py-3 text-foreground outline-none focus:border-gold"
              />
            </label>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium text-foreground">Prestations souhaitées</div>
            <div className="grid gap-3 sm:grid-cols-3">
              {defaultServices.map((service) => (
                <label key={service} className="flex items-center gap-3 rounded-2xl border border-[rgba(8,7,6,0.08)] bg-background px-3 py-3 text-sm text-muted">
                  <input
                    type="checkbox"
                    value={service}
                    {...form.register("services")}
                    className="h-4 w-4 accent-gold"
                  />
                  {service}
                </label>
              ))}
            </div>
          </div>

          <label className="block space-y-2 text-sm text-muted">
            <span>Message & exigences</span>
            <textarea
              rows={5}
              placeholder="Décrivez votre ambiance, palette, lieu, contraintes logistiques..."
              {...form.register("note")}
              className="w-full rounded-2xl border border-[rgba(8,7,6,0.12)] bg-background px-4 py-3 text-foreground outline-none focus:border-gold"
            />
          </label>

          {Object.values(form.formState.errors).some((error) => error?.message) || submissionError ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submissionError ??
                Object.values(form.formState.errors)
                  .map((error) => error?.message)
                  .filter(Boolean)
                  .join(" ")}
            </div>
          ) : null}

          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Envoi en cours…" : "Soumettre ma demande"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <aside className="min-w-0 rounded-4xl border border-line bg-panel p-6 shadow-[0_20px_40px_rgba(8,7,6,0.04)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(214,163,77,0.14)] text-gold">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.22em] text-gold">Synthèse</p>
              <h2 className="text-3xl text-foreground">Votre devis</h2>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {selectedItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-6 border-b border-[rgba(8,7,6,0.08)] pb-3">
                <div>
                  <div className="text-foreground">{item.label}</div>
                  <div className="text-xs uppercase tracking-[0.14em] text-muted">Qté: {item.quantity}</div>
                </div>
                <div className="font-medium text-foreground">{formatPriceCents(item.unitPriceCents * item.quantity)}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-3 text-sm text-muted">
            <div className="flex justify-between"><span>Sous-total</span><span>{formatPriceCents(quoteSummary.subtotalCents)}</span></div>
            <div className="flex justify-between"><span>Livraison</span><span>{formatPriceCents(quoteSummary.deliveryCents)}</span></div>
            <div className="flex justify-between"><span>Nettoyage</span><span>{formatPriceCents(quoteSummary.cleaningCents)}</span></div>
            <div className="flex justify-between"><span>TVA</span><span>{formatPriceCents(quoteSummary.taxCents)}</span></div>
            <div className="flex justify-between border-t border-[rgba(8,7,6,0.08)] pt-3 text-base font-medium text-foreground">
              <span>Total</span>
              <span>{formatPriceCents(quoteSummary.totalCents)}</span>
            </div>
          </div>

          {reference ? (
            <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Demande enregistrée
              </div>
              <div className="mt-2">Référence: {reference}</div>
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
