"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import {
  rentalCategories,
  rentalPriceUnitLabels,
  type RentalCategory,
  type RentalPriceUnit,
} from "@/lib/rental-catalogue";
import { formatPriceCents } from "@/lib/quote";

type CatalogueProduct = {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: RentalCategory;
  subcategory: string;
  unitPriceCents: number;
  priceUnit: RentalPriceUnit;
  minRentalQuantity: number;
  stockQuantity?: number;
  imageUrl: string;
};

type QuoteForm = {
  eventType: string;
  eventDate: string;
  guestCount: number;
  email: string;
  customerName: string;
  phone: string;
  note: string;
};

const categoryLabels: Record<RentalCategory, string> = {
  MOBILIER: "Mobilier",
  VAISSELLE: "Vaisselle",
  ACCESSOIRES: "Accessoires",
};

const initialQuoteForm: QuoteForm = {
  eventType: "Mariage",
  eventDate: "",
  guestCount: 80,
  email: "",
  customerName: "",
  phone: "",
  note: "",
};

function getErrorMessage(result: unknown, fallback: string): string {
  return typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof result.error === "string"
    ? result.error
    : fallback;
}

export function RentalCatalogue() {
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<RentalCategory | "TOUT">("TOUT");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"featured" | "price-asc" | "price-desc">("featured");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [quoteForm, setQuoteForm] = useState(initialQuoteForm);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteReference, setQuoteReference] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/location/products", { signal: controller.signal })
      .then(async (response) => {
        const result: unknown = await response.json();
        if (!response.ok) throw new Error(getErrorMessage(result, "Impossible de charger le catalogue."));
        if (
          typeof result !== "object" ||
          result === null ||
          !("products" in result) ||
          !Array.isArray(result.products)
        ) {
          throw new Error("La réponse du catalogue est invalide.");
        }
        setProducts(result.products as CatalogueProduct[]);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadError(error instanceof Error ? error.message : "Impossible de charger le catalogue.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    const filtered = products.filter((product) => {
      const matchesCategory = activeCategory === "TOUT" || product.category === activeCategory;
      const matchesSearch =
        !query ||
        `${product.name} ${product.description} ${product.subcategory}`.toLocaleLowerCase("fr").includes(query);
      return matchesCategory && matchesSearch;
    });

    if (sortOrder === "price-asc") filtered.sort((first, second) => first.unitPriceCents - second.unitPriceCents);
    if (sortOrder === "price-desc") filtered.sort((first, second) => second.unitPriceCents - first.unitPriceCents);
    return filtered;
  }, [activeCategory, products, search, sortOrder]);

  const selectedProducts = useMemo(
    () =>
      products.flatMap((product) => {
        const quantity = quantities[product.sku] ?? 0;
        return quantity > 0 ? [{ product, quantity }] : [];
      }),
    [products, quantities],
  );
  const rentalSubtotal = selectedProducts.reduce(
    (total, { product, quantity }) => total + product.unitPriceCents * quantity,
    0,
  );

  function setProductQuantity(product: CatalogueProduct, value: number) {
    const minimum = product.minRentalQuantity || 1;
    const boundedValue = Math.max(0, Math.floor(value));
    const withMinimum = boundedValue > 0 ? Math.max(minimum, boundedValue) : 0;
    const nextValue =
      product.stockQuantity === undefined ? withMinimum : Math.min(withMinimum, product.stockQuantity);
    setQuantities((current) => ({ ...current, [product.sku]: nextValue }));
    setQuoteReference(null);
  }

  async function submitRentalQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuoteError(null);
    setQuoteReference(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/location/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...quoteForm,
          customerName: quoteForm.customerName.trim() || undefined,
          phone: quoteForm.phone.trim() || undefined,
          guestCount: Number(quoteForm.guestCount),
          services: ["Location de matériel"],
          rentalSelections: selectedProducts.map(({ product, quantity }) => ({
            sku: product.sku,
            quantity,
          })),
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(result, "Impossible d’envoyer votre demande."));
      if (
        typeof result !== "object" ||
        result === null ||
        !("reference" in result) ||
        typeof result.reference !== "string"
      ) {
        throw new Error("La réponse du serveur est invalide. Veuillez réessayer.");
      }

      setQuoteReference(result.reference);
      setQuantities({});
    } catch (error) {
      setQuoteError(error instanceof Error ? error.message : "Impossible d’envoyer votre demande.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="collection" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mb-8 flex flex-col gap-6 lg:mb-10 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-gold">La sélection</p>
          <h2 className="mt-2 font-serif text-4xl text-foreground sm:text-5xl">La collection</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(12rem,1fr)_auto] lg:w-[min(100%,36rem)]">
          <label className="sr-only" htmlFor="rental-search">Rechercher un article</label>
          <input
            id="rental-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un article…"
            className="min-w-0 rounded-full border border-line bg-white px-5 py-3 text-sm text-foreground outline-none transition focus:border-gold"
          />
          <label className="sr-only" htmlFor="rental-sort">Trier les articles</label>
          <select
            id="rental-sort"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}
            className="rounded-full border border-line bg-white px-5 py-3 text-sm text-foreground outline-none focus:border-gold"
          >
            <option value="featured">Sélection PassyEventz</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
          </select>
        </div>
      </div>

      <nav aria-label="Catégories de location" className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <button
          type="button"
          onClick={() => setActiveCategory("TOUT")}
          aria-pressed={activeCategory === "TOUT"}
          className={`shrink-0 rounded-full border px-5 py-2.5 text-xs uppercase tracking-[0.14em] transition ${
            activeCategory === "TOUT"
              ? "border-foreground bg-foreground text-background"
              : "border-line bg-white text-muted hover:border-gold"
          }`}
        >
          Tout
        </button>
        {rentalCategories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            aria-pressed={activeCategory === category}
            className={`shrink-0 rounded-full border px-5 py-2.5 text-xs uppercase tracking-[0.14em] transition ${
              activeCategory === category
                ? "border-foreground bg-foreground text-background"
                : "border-line bg-white text-muted hover:border-gold"
            }`}
          >
            {categoryLabels[category]}
          </button>
        ))}
      </nav>

      {isLoading ? (
        <p className="rounded-3xl border border-line bg-white px-6 py-12 text-center text-sm text-muted" aria-live="polite">
          La collection se prépare…
        </p>
      ) : loadError ? (
        <div className="rounded-3xl border border-red-200 bg-white px-6 py-10 text-center" role="alert">
          <p className="text-sm text-foreground">{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-gold underline underline-offset-4"
          >
            Réessayer
          </button>
        </div>
      ) : visibleProducts.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleProducts.map((product) => {
            const quantity = quantities[product.sku] ?? 0;
            return (
              <article
                key={product.id}
                className="group min-w-0 overflow-hidden rounded-[1.4rem] border border-[rgba(23,21,19,0.09)] bg-white shadow-[0_14px_38px_rgba(23,21,19,0.035)] transition-shadow hover:shadow-[0_20px_44px_rgba(23,21,19,0.09)]"
              >
                <div
                  className="relative overflow-hidden bg-[#ece6dc]"
                  style={{ aspectRatio: "4 / 3" }}
                >
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted">
                      Photo à venir
                    </div>
                  )}
                  <span className="absolute left-3 top-3 rounded-full border border-white/60 bg-[#f7f3eb]/90 px-3 py-1.5 text-[0.62rem] uppercase tracking-[0.13em] text-foreground backdrop-blur-sm">
                    {categoryLabels[product.category]}
                  </span>
                </div>
                <div className="p-4 sm:p-5">
                  <p className="text-[0.65rem] uppercase tracking-[0.18em] text-gold">
                    {product.subcategory || "Collection"}
                  </p>
                  <h3 className="mt-2 font-serif text-2xl leading-tight text-foreground">{product.name}</h3>
                  {product.description ? (
                    <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-muted">
                      {product.description}
                    </p>
                  ) : (
                    <div className="mt-2 min-h-10" />
                  )}
                  <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-line pt-4">
                    <p className="font-medium text-foreground">
                      {formatPriceCents(product.unitPriceCents)}
                      <span className="ml-1 text-xs font-normal text-muted">/ {rentalPriceUnitLabels[product.priceUnit]}</span>
                    </p>
                    {product.stockQuantity !== undefined && (
                      <span className="text-[0.68rem] text-muted">{product.stockQuantity} en stock</span>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex h-10 items-center overflow-hidden rounded-full border border-line">
                      <button
                        type="button"
                        aria-label={`Réduire la quantité de ${product.name}`}
                        onClick={() => setProductQuantity(product, quantity - 1)}
                        disabled={quantity === 0}
                        className="h-full w-10 text-lg text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        step={1}
                        min={quantity > 0 ? product.minRentalQuantity : 0}
                        max={product.stockQuantity}
                        value={quantity}
                        aria-label={`Quantité de ${product.name}`}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          if (Number.isFinite(next)) setProductQuantity(product, next);
                        }}
                        className="h-full w-12 appearance-none border-x border-line bg-transparent text-center text-sm text-foreground outline-none"
                      />
                      <button
                        type="button"
                        aria-label={`Ajouter une quantité de ${product.name}`}
                        onClick={() => setProductQuantity(product, quantity + 1)}
                        disabled={
                          product.stockQuantity !== undefined &&
                          quantity + (quantity === 0 ? product.minRentalQuantity : 1) >
                            product.stockQuantity
                        }
                        className="h-full w-10 text-lg text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setProductQuantity(
                          product,
                          quantity > 0 ? quantity : product.minRentalQuantity,
                        )
                      }
                      className="inline-flex items-center gap-2 text-[0.66rem] font-semibold uppercase tracking-[0.13em] text-gold transition-colors hover:text-foreground"
                    >
                      {quantity > 0 ? "Dans ma sélection" : "Ajouter"} <span aria-hidden="true">↗</span>
                    </button>
                  </div>
                  {quantity > 0 && (
                    <p className="mt-3 text-right text-xs text-muted">
                      Sous-total <span className="font-medium text-foreground">{formatPriceCents(quantity * product.unitPriceCents)}</span>
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-line bg-white px-6 py-12 text-center">
          <p className="font-serif text-2xl text-foreground">Une collection en préparation</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            {products.length === 0
              ? "Les articles disponibles seront bientôt présentés ici. Contactez-nous pour composer votre sélection."
              : "Aucun article ne correspond à votre recherche."}
          </p>
          {products.length === 0 && (
            <Link
              href="/devis"
              className="mt-5 inline-flex text-xs font-semibold uppercase tracking-[0.14em] text-gold underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Demander un devis personnalisé <span aria-hidden="true" className="ml-1">↗</span>
            </Link>
          )}
        </div>
      )}

      <section id="demande-location" className="mt-14 grid scroll-mt-24 gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10">
        <div className="rounded-[1.6rem] bg-[#171513] p-6 text-background sm:p-8 lg:p-10">
          <p className="text-xs uppercase tracking-[0.25em] text-light-gold">Votre sélection</p>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl">Un projet à imaginer ?</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-[rgba(255,249,239,0.7)]">
            Envoyez-nous votre sélection : notre équipe vous répondra avec une proposition adaptée à
            votre événement.
          </p>
          {selectedProducts.length ? (
            <ul className="mt-7 space-y-3 border-t border-white/15 pt-5">
              {selectedProducts.map(({ product, quantity }) => (
                <li key={product.sku} className="flex items-start justify-between gap-4 text-sm">
                  <span className="min-w-0 text-[rgba(255,249,239,0.8)]">
                    {product.name} <span className="text-[rgba(255,249,239,0.5)]">× {quantity}</span>
                  </span>
                  <span className="shrink-0 text-light-gold">{formatPriceCents(quantity * product.unitPriceCents)}</span>
                </li>
              ))}
              <li className="flex justify-between gap-4 border-t border-white/15 pt-4 text-sm">
                <span>Sous-total indicatif</span>
                <span className="font-medium text-light-gold">{formatPriceCents(rentalSubtotal)}</span>
              </li>
            </ul>
          ) : (
            <p className="mt-7 border-t border-white/15 pt-5 text-sm text-[rgba(255,249,239,0.65)]">
              Ajoutez des pièces à votre sélection pour préparer votre demande de devis.
            </p>
          )}
          <p className="mt-6 text-xs leading-5 text-[rgba(255,249,239,0.5)]">
            Tarifs indicatifs. La disponibilité des articles sera confirmée avec votre devis et
            validée lors de la réservation.
          </p>
        </div>

        <form onSubmit={submitRentalQuote} className="rounded-[1.6rem] border border-line bg-white p-6 sm:p-8 lg:p-10">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.22em] text-gold">Demande de location</p>
            <h2 className="mt-2 font-serif text-3xl text-foreground">Parlons de votre réception</h2>
          </div>
          {quoteReference ? (
            <div className="rounded-2xl border border-[rgba(197,161,90,0.35)] bg-[#f8f4ec] p-5" role="status">
              <p className="font-serif text-2xl text-foreground">Votre demande est envoyée.</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Votre référence : <strong className="text-foreground">{quoteReference}</strong>. Notre
                équipe reviendra vers vous après vérification de la disponibilité.
              </p>
            </div>
          ) : selectedProducts.length === 0 ? (
            <p className="rounded-2xl bg-background p-5 text-sm leading-6 text-muted">
              Sélectionnez au moins un article dans la collection pour envoyer votre demande.
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-muted">
                  <span>Type d’événement</span>
                  <select
                    required
                    value={quoteForm.eventType}
                    onChange={(event) => setQuoteForm({ ...quoteForm, eventType: event.target.value })}
                    className="w-full rounded-xl border border-line bg-background px-4 py-3 text-foreground outline-none focus:border-gold"
                  >
                    {["Mariage", "Baptême", "Baby shower", "Fiançailles", "Anniversaire", "Soirée privée", "Événement corporate"].map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm text-muted">
                  <span>Date de l’événement</span>
                  <input
                    required
                    type="date"
                    value={quoteForm.eventDate}
                    onChange={(event) => setQuoteForm({ ...quoteForm, eventDate: event.target.value })}
                    className="w-full rounded-xl border border-line bg-background px-4 py-3 text-foreground outline-none focus:border-gold"
                  />
                </label>
                <label className="space-y-2 text-sm text-muted">
                  <span>Nombre d’invités</span>
                  <input
                    required
                    type="number"
                    min={1}
                    max={100000}
                    value={quoteForm.guestCount}
                    onChange={(event) => setQuoteForm({ ...quoteForm, guestCount: Number(event.target.value) })}
                    className="w-full rounded-xl border border-line bg-background px-4 py-3 text-foreground outline-none focus:border-gold"
                  />
                </label>
                <label className="space-y-2 text-sm text-muted">
                  <span>Votre nom</span>
                  <input
                    type="text"
                    autoComplete="name"
                    value={quoteForm.customerName}
                    onChange={(event) => setQuoteForm({ ...quoteForm, customerName: event.target.value })}
                    className="w-full rounded-xl border border-line bg-background px-4 py-3 text-foreground outline-none focus:border-gold"
                  />
                </label>
                <label className="space-y-2 text-sm text-muted sm:col-span-2">
                  <span>Adresse e-mail</span>
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={quoteForm.email}
                    onChange={(event) => setQuoteForm({ ...quoteForm, email: event.target.value })}
                    placeholder="vous@example.com"
                    className="w-full rounded-xl border border-line bg-background px-4 py-3 text-foreground outline-none focus:border-gold"
                  />
                </label>
                <label className="space-y-2 text-sm text-muted sm:col-span-2">
                  <span>Téléphone <span className="text-muted/70">(facultatif)</span></span>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={quoteForm.phone}
                    onChange={(event) => setQuoteForm({ ...quoteForm, phone: event.target.value })}
                    className="w-full rounded-xl border border-line bg-background px-4 py-3 text-foreground outline-none focus:border-gold"
                  />
                </label>
                <label className="space-y-2 text-sm text-muted sm:col-span-2">
                  <span>Un détail à nous partager ? <span className="text-muted/70">(facultatif)</span></span>
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={quoteForm.note}
                    onChange={(event) => setQuoteForm({ ...quoteForm, note: event.target.value })}
                    className="w-full resize-y rounded-xl border border-line bg-background px-4 py-3 text-foreground outline-none focus:border-gold"
                  />
                </label>
              </div>
              {quoteError && <p className="mt-4 text-sm text-red-700" role="alert">{quoteError}</p>}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#171513] px-6 text-xs font-semibold uppercase tracking-[0.16em] text-background transition-colors hover:bg-[#342e27] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
              >
                {isSubmitting ? "Envoi en cours…" : "Demander un devis"}
              </button>
            </>
          )}
        </form>
      </section>
    </section>
  );
}
