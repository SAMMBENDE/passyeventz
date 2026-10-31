"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });

      if (!response.ok) {
        const result: unknown = await response.json();
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Connexion impossible. Veuillez réessayer.";
        setError(message);
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Connexion impossible. Vérifiez votre connexion et réessayez.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <section className="w-full max-w-md rounded-4xl border border-line bg-white p-7 shadow-(--shadow) sm:p-9">
        <p className="text-xs uppercase tracking-[0.24em] text-gold">PassyEventz · Administration</p>
        <h1 className="mt-4 font-serif text-4xl text-foreground">Connexion</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Connectez-vous pour accéder à l’espace d’administration.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Adresse e-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              className="h-12 w-full rounded-xl border border-line bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gold"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={16}
              maxLength={1024}
              className="h-12 w-full rounded-xl border border-line bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gold"
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-gold px-5 text-sm font-semibold text-foreground transition-colors hover:bg-light-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </section>
    </main>
  );
}
