"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type AdminRealisation = {
  id: string;
  title: string;
  description: string;
  category: string;
  image: string;
  imageAlt: string;
  isActive: boolean;
  sortOrder: number;
};

type RealisationDraft = {
  title: string;
  description: string;
  category: string;
  image: string;
};

const emptyDraft: RealisationDraft = {
  title: "",
  description: "",
  category: "Événement",
  image: "",
};

function getErrorMessage(result: unknown, fallback: string): string {
  return typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof result.error === "string"
    ? result.error
    : fallback;
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const body = await response.text();
  if (!body.trim()) {
    return {
      error:
        response.status === 401
          ? "Votre session a expiré. Reconnectez-vous."
          : `Le serveur a renvoyé une réponse vide (HTTP ${response.status}). Actualisez la page et réessayez.`,
    };
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return {
      error: `Le serveur a renvoyé une réponse invalide (HTTP ${response.status}). Actualisez la page et réessayez.`,
    };
  }
}

async function fetchRealisations(signal?: AbortSignal): Promise<AdminRealisation[]> {
  const response = await fetch("/api/admin/realisations", { signal });
  const result = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(getErrorMessage(result, "Impossible de charger les réalisations."));
  }
  if (
    typeof result !== "object" ||
    result === null ||
    !("realisations" in result) ||
    !Array.isArray(result.realisations)
  ) {
    throw new Error("La réponse des réalisations est invalide.");
  }
  return result.realisations as AdminRealisation[];
}

export function AdminRealisations() {
  const [realisations, setRealisations] = useState<AdminRealisation[]>([]);
  const [draft, setDraft] = useState<RealisationDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadRealisations(signal?: AbortSignal) {
    setRealisations(await fetchRealisations(signal));
  }

  useEffect(() => {
    const controller = new AbortController();
    fetchRealisations(controller.signal)
      .then(setRealisations)
      .then(() => setError(null))
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Impossible de charger les réalisations.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  function startEditing(realisation: AdminRealisation) {
    setEditingId(realisation.id);
    setDraft({
      title: realisation.title,
      description: realisation.description,
      category: realisation.category,
      image: realisation.image,
    });
    setError(null);
    setNotice(null);
  }

  function resetForm() {
    setEditingId(null);
    setDraft(emptyDraft);
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
      const signatureResponse = await fetch(
        "/api/admin/location/upload-signature?purpose=realisations",
        { method: "POST" },
      );
      const signatureResult = await readJsonResponse(signatureResponse);
      if (!signatureResponse.ok) {
        throw new Error(
          getErrorMessage(signatureResult, "Impossible de préparer l’envoi vers Cloudinary."),
        );
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
      const uploadResult = await readJsonResponse(uploadResponse);
      if (
        !uploadResponse.ok ||
        typeof uploadResult !== "object" ||
        uploadResult === null ||
        !("secure_url" in uploadResult)
      ) {
        throw new Error(
          getErrorMessage(uploadResult, "Cloudinary n’a pas pu enregistrer cette image."),
        );
      }

      const secureUrl = uploadResult.secure_url;
      if (typeof secureUrl !== "string") {
        throw new Error("Cloudinary a renvoyé une adresse d’image invalide.");
      }
      setDraft((current) => ({ ...current, image: secureUrl }));
      setNotice("Image enregistrée dans la médiathèque Cloudinary.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible d’envoyer cette image.");
    } finally {
      setIsUploading(false);
    }
  }

  async function saveRealisation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSaving(true);
    try {
      const response = await fetch(
        editingId ? `/api/admin/realisations/${editingId}` : "/api/admin/realisations",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: draft.title.trim(),
            description: draft.description.trim(),
            category: draft.category.trim(),
            imageUrl: draft.image,
          }),
        },
      );
      const result = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(result, "Impossible d’enregistrer cette réalisation."));
      }
      await loadRealisations();
      setNotice(editingId ? "Réalisation mise à jour." : "Réalisation ajoutée à la galerie.");
      setEditingId(null);
      setDraft(emptyDraft);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Impossible d’enregistrer cette réalisation.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleActive(realisation: AdminRealisation) {
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/realisations/${realisation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !realisation.isActive }),
      });
      const result = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(result, "Impossible de modifier la visibilité."));
      }
      await loadRealisations();
      setNotice(realisation.isActive ? "Réalisation masquée du site." : "Réalisation publiée.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de modifier la visibilité.");
    }
  }

  async function deleteRealisation(realisation: AdminRealisation) {
    if (!window.confirm(`Supprimer « ${realisation.title} » de la galerie ?`)) return;
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/realisations/${realisation.id}`, {
        method: "DELETE",
      });
      const result = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(result, "Impossible de supprimer cette réalisation."));
      }
      await loadRealisations();
      if (editingId === realisation.id) resetForm();
      setNotice("Réalisation supprimée.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de supprimer cette réalisation.");
    }
  }

  const inputClass =
    "w-full rounded-xl border border-line bg-background px-3.5 py-3 text-sm text-foreground outline-none focus:border-gold";

  return (
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(19rem,0.82fr)_minmax(0,1.18fr)]">
      <form
        onSubmit={saveRealisation}
        className="rounded-3xl border border-line bg-white p-5 shadow-[0_12px_30px_rgba(23,21,19,0.04)] sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.2em] text-gold">Gestion de galerie</p>
            <h3 className="mt-2 font-serif text-3xl text-foreground">
              {editingId ? "Modifier une réalisation" : "Nouvelle réalisation"}
            </h3>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-muted underline underline-offset-4"
            >
              Annuler
            </button>
          )}
        </div>

        <div className="mt-6 grid gap-4">
          <label className="space-y-1.5 text-xs text-muted">
            <span>Titre</span>
            <input
              required
              minLength={2}
              maxLength={120}
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              className={inputClass}
            />
          </label>
          <label className="space-y-1.5 text-xs text-muted">
            <span>Catégorie</span>
            <input
              required
              minLength={2}
              maxLength={80}
              value={draft.category}
              onChange={(event) => setDraft({ ...draft, category: event.target.value })}
              className={inputClass}
            />
          </label>
          <label className="space-y-1.5 text-xs text-muted">
            <span>Description courte</span>
            <textarea
              required
              minLength={3}
              maxLength={600}
              rows={3}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              className={`${inputClass} resize-y`}
            />
            <span className="block text-[0.68rem] text-muted">
              {draft.description.length}/600 caractères
            </span>
          </label>
          <div className="space-y-2">
            <span className="block text-xs text-muted">Photographie (Cloudinary)</span>
            {draft.image && (
              <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-[#f5f0e7]">
                <Image
                  src={draft.image}
                  alt={draft.title || "Aperçu de la réalisation"}
                  fill
                  sizes="(max-width: 639px) 100vw, 40vw"
                  className="object-cover"
                />
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
            {!draft.image && (
              <p className="text-[0.68rem] text-muted">
                Une photographie est requise avant l’enregistrement.
              </p>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="mt-4 rounded-xl bg-[#f7f3eb] px-4 py-3 text-sm text-foreground" role="status">
            {notice}
          </p>
        )}
        <button
          type="submit"
          disabled={isSaving || isUploading || !draft.image}
          className="mt-5 min-h-12 w-full rounded-full bg-[#171513] px-5 text-xs font-semibold uppercase tracking-[0.15em] text-background transition hover:bg-[#342e27] disabled:cursor-wait disabled:opacity-60"
        >
          {isSaving
            ? "Enregistrement…"
            : editingId
              ? "Enregistrer les modifications"
              : "Ajouter à la galerie"}
        </button>
      </form>

      <div className="min-w-0">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.2em] text-gold">Portfolio</p>
            <h3 className="mt-2 font-serif text-3xl text-foreground">Réalisations enregistrées</h3>
          </div>
          <span className="text-sm text-muted">
            {realisations.length} réalisation{realisations.length === 1 ? "" : "s"}
          </span>
        </div>
        {isLoading ? (
          <p className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">
            Chargement des réalisations…
          </p>
        ) : realisations.length === 0 ? (
          <p className="rounded-2xl border border-line bg-white p-6 text-sm leading-6 text-muted">
            Aucune réalisation ajoutée par l’administration. Les six projets historiques restent
            affichés sur le site.
          </p>
        ) : (
          <ul className="space-y-3">
            {realisations.map((realisation) => (
              <li
                key={realisation.id}
                className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-white p-4 sm:flex-row sm:items-center"
              >
                <div className="relative aspect-4/3 w-full shrink-0 overflow-hidden rounded-xl bg-[#f5f0e7] sm:h-24 sm:w-32 sm:aspect-auto">
                  <Image src={realisation.image} alt="" fill sizes="128px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-serif text-xl text-foreground">{realisation.title}</h4>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[0.62rem] uppercase tracking-widest ${
                        realisation.isActive
                          ? "bg-[#edf4eb] text-[#345b35]"
                          : "bg-[#f2eee8] text-muted"
                      }`}
                    >
                      {realisation.isActive ? "Publiée" : "Masquée"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted">{realisation.category}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-muted">{realisation.description}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => startEditing(realisation)}
                    className="rounded-full border border-line px-3.5 py-2 text-xs text-foreground transition hover:border-gold"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleActive(realisation)}
                    className="rounded-full border border-line px-3.5 py-2 text-xs text-foreground transition hover:border-gold"
                  >
                    {realisation.isActive ? "Masquer" : "Publier"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteRealisation(realisation)}
                    className="rounded-full border border-red-200 px-3.5 py-2 text-xs text-red-800 transition hover:bg-red-50"
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
