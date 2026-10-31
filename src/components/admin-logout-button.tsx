"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/session", { method: "DELETE" });
      if (!response.ok) {
        throw new Error(`Admin sign-out failed with status ${response.status}.`);
      }
      router.replace("/admin/login");
      router.refresh();
    } catch (error) {
      console.error("Admin sign-out failed:", error);
      setError("La déconnexion a échoué. Veuillez réessayer.");
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={signOut}
        disabled={isSubmitting}
        className="rounded-full border border-line px-4 py-2 text-sm text-foreground transition-colors hover:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-60"
      >
        {isSubmitting ? "Déconnexion…" : "Se déconnecter"}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
