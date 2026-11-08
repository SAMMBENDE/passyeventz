"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import {
  cookiePreferencesChangedEvent,
  cookiePreferencesEvent,
  cookiePreferencesStorageKey,
  type OptionalCookiePreferences,
} from "@/lib/cookie-preferences";

type Panel = "closed" | "settings";
type StoredPreferences = OptionalCookiePreferences & { savedAt: string };

const defaultPreferences: OptionalCookiePreferences = {
  analytics: false,
  functional: false,
  marketing: false,
};

function subscribeToPreferences(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(cookiePreferencesChangedEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(cookiePreferencesChangedEvent, onChange);
  };
}

function getPreferencesSnapshot() {
  try {
    return window.localStorage.getItem(cookiePreferencesStorageKey) ?? "";
  } catch {
    return "storage-unavailable";
  }
}

function getServerPreferencesSnapshot() {
  return "loading";
}

function isOptionalPreferences(value: unknown): value is OptionalCookiePreferences {
  return (
    typeof value === "object" &&
    value !== null &&
    "analytics" in value &&
    typeof value.analytics === "boolean" &&
    "functional" in value &&
    typeof value.functional === "boolean" &&
    "marketing" in value &&
    typeof value.marketing === "boolean"
  );
}

function readStoredPreferences(snapshot: string): StoredPreferences | null {
  if (!snapshot || snapshot === "loading" || snapshot === "storage-unavailable") return null;

  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (
      !isOptionalPreferences(parsed) ||
      !("savedAt" in parsed) ||
      typeof parsed.savedAt !== "string"
    ) {
      return null;
    }

    const savedAt = new Date(parsed.savedAt);
    if (Number.isNaN(savedAt.getTime())) return null;
    savedAt.setMonth(savedAt.getMonth() + 6);
    return savedAt.getTime() > Date.now() ? { ...parsed, savedAt: parsed.savedAt } : null;
  } catch {
    return null;
  }
}

export function CookieConsent() {
  const [panel, setPanel] = useState<Panel>("closed");
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [storageError, setStorageError] = useState("");
  const snapshot = useSyncExternalStore(
    subscribeToPreferences,
    getPreferencesSnapshot,
    getServerPreferencesSnapshot,
  );
  const savedPreferences = readStoredPreferences(snapshot);
  const hasSavedPreferences = savedPreferences !== null;
  const showBanner = panel === "closed" && snapshot !== "loading" && !hasSavedPreferences;

  useEffect(() => {
    const openSettings = () => {
      setPreferences(readStoredPreferences(getPreferencesSnapshot()) ?? defaultPreferences);
      setStorageError("");
      setPanel("settings");
    };
    window.addEventListener(cookiePreferencesEvent, openSettings);
    return () => window.removeEventListener(cookiePreferencesEvent, openSettings);
  }, []);

  useEffect(() => {
    if (panel !== "settings") return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel("closed");
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [hasSavedPreferences, panel]);

  function savePreferences(nextPreferences: OptionalCookiePreferences) {
    try {
      window.localStorage.setItem(
        cookiePreferencesStorageKey,
        JSON.stringify({ ...nextPreferences, savedAt: new Date().toISOString() }),
      );
      setPreferences(nextPreferences);
      setStorageError("");
      setPanel("closed");
      window.dispatchEvent(new Event(cookiePreferencesChangedEvent));
    } catch {
      setStorageError(
        "Vos choix n’ont pas pu être enregistrés dans ce navigateur. Vérifiez ses paramètres de stockage puis réessayez.",
      );
    }
  }

  function openSettings() {
    setStorageError("");
    setPanel("settings");
  }

  if (panel === "closed" && !showBanner) return null;

  const allAccepted: OptionalCookiePreferences = {
    analytics: true,
    functional: true,
    marketing: true,
  };

  return (
    <>
      {showBanner ? (
        <aside
          aria-label="Préférences relatives aux cookies"
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-3xl border border-line bg-white p-5 shadow-[0_20px_70px_rgba(8,7,6,0.2)] sm:inset-x-6 sm:bottom-6 sm:p-6"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Votre confidentialité
          </p>
          <h2 className="mt-2 font-serif text-2xl text-foreground">Vos préférences de cookies</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Les cookies nécessaires assurent le fonctionnement du site. Aucun outil de mesure
            d’audience ou de publicité n’est actuellement activé. Vous pouvez choisir si les
            catégories optionnelles pourront être utilisées si ces services sont ajoutés.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => savePreferences(defaultPreferences)}
              className="rounded-full border border-line px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-background"
            >
              Tout refuser
            </button>
            <button
              type="button"
              onClick={openSettings}
              className="rounded-full border border-line px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-background"
            >
              Personnaliser
            </button>
            <button
              type="button"
              onClick={() => savePreferences(allAccepted)}
              className="rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-colors hover:bg-gold hover:text-foreground"
            >
              Tout accepter
            </button>
          </div>
          {storageError && (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {storageError}
            </p>
          )}
        </aside>
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-settings-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              Confidentialité
            </p>
            <h2 id="cookie-settings-title" className="mt-2 font-serif text-3xl text-foreground">
              Gérer mes cookies
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Les cookies nécessaires sont toujours actifs. Les choix ci-dessous sont enregistrés
              dans ce navigateur et pourront être modifiés à tout moment depuis le pied de page.
              Aucun outil optionnel de mesure d’audience ou de publicité n’est actuellement activé.
            </p>

            <div className="mt-6 divide-y divide-line border-y border-line">
              <div className="flex items-start justify-between gap-5 py-4">
                <div>
                  <h3 className="font-medium text-foreground">Strictement nécessaires</h3>
                  <p className="mt-1 text-sm leading-5 text-muted">
                    Fonctionnement, sécurité et mémorisation des choix du site.
                  </p>
                </div>
                <span className="shrink-0 pt-1 text-xs font-medium text-muted">Toujours actifs</span>
              </div>
              {(
                [
                  ["analytics", "Mesure d’audience", "Aider à comprendre la fréquentation du site."],
                  ["functional", "Fonctionnels", "Mémoriser certaines préférences de navigation."],
                  ["marketing", "Publicité et réseaux sociaux", "Personnaliser les contenus et mesurer les campagnes."],
                ] as const
              ).map(([key, title, description]) => (
                <label key={key} className="flex cursor-pointer items-start justify-between gap-5 py-4">
                  <span>
                    <span className="block font-medium text-foreground">{title}</span>
                    <span className="mt-1 block text-sm leading-5 text-muted">{description}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences[key]}
                    onChange={(event) =>
                      setPreferences((current) => ({ ...current, [key]: event.target.checked }))
                    }
                    className="mt-1 h-4 w-4 accent-[#b58a3a]"
                  />
                </label>
              ))}
            </div>

            {storageError && (
              <p className="mt-4 text-sm text-red-700" role="alert">
                {storageError}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setPanel("closed")}
                className="rounded-full border border-line px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-background"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => savePreferences(preferences)}
                className="rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-colors hover:bg-gold hover:text-foreground"
              >
                Enregistrer mes choix
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
