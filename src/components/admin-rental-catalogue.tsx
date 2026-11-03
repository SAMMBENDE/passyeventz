"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import {
  rentalCategories,
  rentalPriceUnitLabels,
  type RentalCategory,
  type RentalPriceUnit,
} from "@/lib/rental-catalogue";
import { formatPriceCents } from "@/lib/quote";

type AdminProduct = {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: RentalCategory;
  subcategory: string;
  unitPriceCents: number;
  replacementPriceCents: number;
  priceUnit: RentalPriceUnit;
  minRentalQuantity: number;
  stockQuantity: number;
  imageUrl: string;
  showStock: boolean;
  isActive: boolean;
  sortOrder: number;
};

type ProductDraft = {
  sku: string;
  name: string;
  description: string;
  category: RentalCategory;
  subcategory: string;
  unitPrice: string;
  replacementPrice: string;
  priceUnit: RentalPriceUnit;
  minRentalQuantity: string;
  stockQuantity: string;
  imageUrl: string;
  showStock: boolean;
  isActive: boolean;
  sortOrder: string;
};

const blankDraft: ProductDraft = {
  sku: "",
  name: "",
  description: "",
  category: "MOBILIER",
  subcategory: "",
  unitPrice: "",
  replacementPrice: "",
  priceUnit: "item",
  minRentalQuantity: "1",
  stockQuantity: "1",
  imageUrl: "",
  showStock: true,
  isActive: true,
  sortOrder: "0",
};

function getErrorMessage(result: unknown, fallback: string): string {
  return typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof result.error === "string"
    ? result.error
    : fallback;
}

function centsFromInput(value: string): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : Number.NaN;
}

function draftFromProduct(product: AdminProduct): ProductDraft {
  return {
    sku: product.sku,
    name: product.name,
    description: product.description,
    category: product.category,
    subcategory: product.subcategory,
    unitPrice: (product.unitPriceCents / 100).toFixed(2),
    replacementPrice: (product.replacementPriceCents / 100).toFixed(2),
    priceUnit: product.priceUnit,
    minRentalQuantity: String(product.minRentalQuantity),
    stockQuantity: String(product.stockQuantity),
    imageUrl: product.imageUrl,
    showStock: product.showStock,
    isActive: product.isActive,
    sortOrder: String(product.sortOrder),
  };
}

export function AdminRentalCatalogue() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [draft, setDraft] = useState<ProductDraft>(blankDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function fetchProducts(signal?: AbortSignal): Promise<AdminProduct[]> {
    const response = await fetch("/api/admin/location/products", { signal });
    const result: unknown = await response.json();
    if (!response.ok) throw new Error(getErrorMessage(result, "Impossible de charger les articles."));
    if (
      typeof result !== "object" ||
      result === null ||
      !("products" in result) ||
      !Array.isArray(result.products)
    ) {
      throw new Error("La réponse du catalogue est invalide.");
    }
    return result.products as AdminProduct[];
  }

  async function loadProducts() {
    setProducts(await fetchProducts());
  }

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal)
      .then(setProducts)
      .then(() => setError(null))
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Impossible de charger les articles.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  function startEditing(product: AdminProduct) {
    setEditingId(product.id);
    setDraft(draftFromProduct(product));
    setError(null);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startAdding() {
    setEditingId(null);
    setDraft(blankDraft);
    setError(null);
    setNotice(null);
  }

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    setError(null);
    setNotice(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choisissez une image JPG, PNG ou WebP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("L’image ne doit pas dépasser 10 Mo.");
      return;
    }

    setIsUploading(true);
    try {
      const signatureResponse = await fetch("/api/admin/location/upload-signature", { method: "POST" });
      const signatureResult: unknown = await signatureResponse.json();
      if (!signatureResponse.ok) {
        throw new Error(getErrorMessage(signatureResult, "Impossible de préparer l’envoi vers Cloudinary."));
      }
      if (
        typeof signatureResult !== "object" ||
        signatureResult === null ||
        !("cloudName" in signatureResult) ||
        !("apiKey" in signatureResult) ||
        !("folder" in signatureResult) ||
        !("timestamp" in signatureResult) ||
        !("signature" in signatureResult) ||
        typeof signatureResult.cloudName !== "string" ||
        typeof signatureResult.apiKey !== "string" ||
        typeof signatureResult.folder !== "string" ||
        typeof signatureResult.timestamp !== "number" ||
        typeof signatureResult.signature !== "string"
      ) {
        throw new Error("La signature Cloudinary reçue est invalide.");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", signatureResult.apiKey);
      formData.append("folder", signatureResult.folder);
      formData.append("timestamp", String(signatureResult.timestamp));
      formData.append("signature", signatureResult.signature);
      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${signatureResult.cloudName}/image/upload`,
        { method: "POST", body: formData },
      );
      const uploadResult: unknown = await uploadResponse.json();
      if (
        !uploadResponse.ok ||
        typeof uploadResult !== "object" ||
        uploadResult === null ||
        !("secure_url" in uploadResult) ||
        typeof uploadResult.secure_url !== "string"
      ) {
        throw new Error(
          getErrorMessage(uploadResult, "Cloudinary n’a pas pu enregistrer cette image."),
        );
      }
      const secureUrl = uploadResult.secure_url;
      setDraft((current) => ({ ...current, imageUrl: secureUrl }));
      setNotice("Image enregistrée dans la médiathèque Cloudinary.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible d’envoyer cette image.");
    } finally {
      setIsUploading(false);
    }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSaving(true);
    const payload = {
      sku: draft.sku.trim().toUpperCase(),
      name: draft.name.trim(),
      description: draft.description.trim(),
      category: draft.category,
      subcategory: draft.subcategory.trim(),
      unitPriceCents: centsFromInput(draft.unitPrice),
      replacementPriceCents: centsFromInput(draft.replacementPrice),
      priceUnit: draft.priceUnit,
      minRentalQuantity: Number(draft.minRentalQuantity),
      stockQuantity: Number(draft.stockQuantity),
      imageUrl: draft.imageUrl.trim(),
      showStock: draft.showStock,
      isActive: draft.isActive,
      sortOrder: Number(draft.sortOrder),
    };

    try {
      const response = await fetch(
        editingId ? `/api/admin/location/products/${editingId}` : "/api/admin/location/products",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result: unknown = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(result, "Impossible d’enregistrer cet article."));

      await loadProducts();
      setNotice(editingId ? "Article mis à jour." : "Article ajouté à la collection.");
      setEditingId(null);
      setDraft(blankDraft);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible d’enregistrer cet article.");
    } finally {
      setIsSaving(false);
    }
  }

  async function setProductActive(product: AdminProduct, isActive: boolean) {
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/location/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const result: unknown = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(result, "Impossible de modifier la disponibilité."));
      await loadProducts();
      setNotice(isActive ? "Article activé." : "Article désactivé.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de modifier la disponibilité.");
    }
  }

  async function deleteProduct(product: AdminProduct) {
    if (!window.confirm(`Supprimer « ${product.name} » ?`)) return;
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/location/products/${product.id}`, { method: "DELETE" });
      const result: unknown = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(result, "Impossible de supprimer cet article."));
      await loadProducts();
      setNotice("Article supprimé.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de supprimer cet article.");
    }
  }

  const inputClass =
    "w-full rounded-xl border border-line bg-background px-3.5 py-3 text-sm text-foreground outline-none focus:border-gold";

  return (
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(19rem,0.82fr)_minmax(0,1.18fr)]">
      <form onSubmit={saveProduct} className="rounded-3xl border border-line bg-white p-5 shadow-[0_12px_30px_rgba(23,21,19,0.04)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.2em] text-gold">Gestion catalogue</p>
            <h3 className="mt-2 font-serif text-3xl text-foreground">
              {editingId ? "Modifier un article" : "Nouvel article"}
            </h3>
          </div>
          {editingId && (
            <button type="button" onClick={startAdding} className="text-xs text-muted underline underline-offset-4">
              Annuler
            </button>
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs text-muted sm:col-span-2">
            <span>Référence unique (SKU)</span>
            <input
              required
              minLength={1}
              maxLength={64}
              pattern="[\w-]+"
              value={draft.sku}
              disabled={Boolean(editingId)}
              onChange={(event) => setDraft({ ...draft, sku: event.target.value })}
              className={`${inputClass} disabled:opacity-60`}
            />
          </label>
          <label className="space-y-1.5 text-xs text-muted sm:col-span-2">
            <span>Nom du produit</span>
            <input required minLength={2} maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={inputClass} />
          </label>
          <label className="space-y-1.5 text-xs text-muted">
            <span>Catégorie</span>
            <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as RentalCategory })} className={inputClass}>
              {rentalCategories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-xs text-muted">
            <span>Sous-catégorie</span>
            <input required minLength={2} maxLength={80} value={draft.subcategory} onChange={(event) => setDraft({ ...draft, subcategory: event.target.value })} className={inputClass} />
          </label>
          <label className="space-y-1.5 text-xs text-muted sm:col-span-2">
            <span>Description courte</span>
            <textarea rows={2} maxLength={2000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className={`${inputClass} resize-y`} />
          </label>
          <label className="space-y-1.5 text-xs text-muted">
            <span>Prix de location (€)</span>
            <input required type="number" min={0} step="0.01" value={draft.unitPrice} onChange={(event) => setDraft({ ...draft, unitPrice: event.target.value })} className={inputClass} />
          </label>
          <label className="space-y-1.5 text-xs text-muted">
            <span>Prix de remplacement (€ / {rentalPriceUnitLabels[draft.priceUnit]})</span>
            <input required type="number" min={0} step="0.01" value={draft.replacementPrice} onChange={(event) => setDraft({ ...draft, replacementPrice: event.target.value })} className={inputClass} />
          </label>
          <label className="space-y-1.5 text-xs text-muted">
            <span>Unité tarifaire</span>
            <select value={draft.priceUnit} onChange={(event) => setDraft({ ...draft, priceUnit: event.target.value as RentalPriceUnit })} className={inputClass}>
              {(Object.keys(rentalPriceUnitLabels) as RentalPriceUnit[]).map((unit) => (
                <option key={unit} value={unit}>{rentalPriceUnitLabels[unit]}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-xs text-muted">
            <span>Unités tarifaires minimales à louer</span>
            <input required type="number" min={1} max={100000} step={1} value={draft.minRentalQuantity} onChange={(event) => setDraft({ ...draft, minRentalQuantity: event.target.value })} className={inputClass} />
          </label>
          <label className="space-y-1.5 text-xs text-muted">
            <span>Stock (unités tarifaires)</span>
            <input required type="number" min={0} max={100000} step={1} value={draft.stockQuantity} onChange={(event) => setDraft({ ...draft, stockQuantity: event.target.value })} className={inputClass} />
          </label>
          <label className="space-y-1.5 text-xs text-muted">
            <span>Ordre d’affichage</span>
            <input required type="number" min={0} max={1000000} step={1} value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })} className={inputClass} />
          </label>

          <div className="space-y-2 sm:col-span-2">
            <span className="block text-xs text-muted">Photographie produit (Cloudinary)</span>
            {draft.imageUrl && (
              <div className="relative aspect-16/8 overflow-hidden rounded-xl bg-background">
                <Image src={draft.imageUrl} alt="Aperçu de la photographie produit" fill sizes="(max-width: 639px) 100vw, 40vw" className="object-cover" />
              </div>
            )}
            <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-dashed border-[rgba(197,161,90,0.6)] bg-[#fbf8f2] px-4 py-3 text-center text-xs font-medium text-foreground transition hover:bg-[#f5f0e7]">
              {isUploading ? "Envoi de la photographie…" : "Choisir une image JPG, PNG ou WebP"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={isUploading}
                onChange={(event) => {
                  void uploadImage(event.target.files?.[0]);
                  event.target.value = "";
                }}
                className="sr-only"
              />
            </label>
            {!draft.imageUrl && <p className="text-[0.68rem] text-muted">Une photographie est requise avant l’enregistrement.</p>}
          </div>

          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={draft.showStock} onChange={(event) => setDraft({ ...draft, showStock: event.target.checked })} className="h-4 w-4 accent-gold" />
            Afficher le stock au public
          </label>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} className="h-4 w-4 accent-gold" />
            Article actif
          </label>
        </div>

        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
        {notice && <p className="mt-4 rounded-xl bg-[#f7f3eb] px-4 py-3 text-sm text-foreground" role="status">{notice}</p>}
        <button
          type="submit"
          disabled={isSaving || isUploading}
          className="mt-5 min-h-12 w-full rounded-full bg-[#171513] px-5 text-xs font-semibold uppercase tracking-[0.15em] text-background transition hover:bg-[#342e27] disabled:cursor-wait disabled:opacity-60"
        >
          {isSaving ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Ajouter à la collection"}
        </button>
      </form>

      <div className="min-w-0">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.2em] text-gold">Inventaire</p>
            <h3 className="mt-2 font-serif text-3xl text-foreground">Articles enregistrés</h3>
          </div>
          <span className="text-sm text-muted">{products.length} article{products.length === 1 ? "" : "s"}</span>
        </div>
        {isLoading ? (
          <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">Chargement des articles…</p>
        ) : products.length === 0 ? (
          <p className="rounded-2xl border border-line bg-white p-6 text-sm leading-6 text-muted">Aucun produit pour le moment. Ajoutez votre premier article à l’aide du formulaire.</p>
        ) : (
          <ul className="space-y-3">
            {products.map((product) => (
              <li key={product.id} className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-white p-4 sm:flex-row sm:items-center">
                <div className="relative aspect-4/3 w-full shrink-0 overflow-hidden rounded-xl bg-background sm:h-24 sm:w-32 sm:aspect-auto">
                  {product.imageUrl && <Image src={product.imageUrl} alt="" fill sizes="128px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-serif text-xl text-foreground">{product.name}</h4>
                    <span className={`rounded-full px-2.5 py-1 text-[0.62rem] uppercase tracking-widest ${product.isActive ? "bg-[#edf4eb] text-[#345b35]" : "bg-[#f2eee8] text-muted"}`}>
                      {product.isActive ? "Actif" : "Désactivé"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted">{product.sku} · {product.category} · {product.stockQuantity} en stock</p>
                  <p className="mt-2 text-sm text-foreground">{formatPriceCents(product.unitPriceCents)} <span className="text-xs text-muted">/ {rentalPriceUnitLabels[product.priceUnit]}</span></p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                  <button type="button" onClick={() => startEditing(product)} className="rounded-full border border-line px-3.5 py-2 text-xs text-foreground transition hover:border-gold">Modifier</button>
                  <button type="button" onClick={() => void setProductActive(product, !product.isActive)} className="rounded-full border border-line px-3.5 py-2 text-xs text-foreground transition hover:border-gold">{product.isActive ? "Désactiver" : "Activer"}</button>
                  <button type="button" onClick={() => void deleteProduct(product)} className="rounded-full border border-red-200 px-3.5 py-2 text-xs text-red-800 transition hover:bg-red-50">Supprimer</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
