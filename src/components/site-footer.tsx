"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { cookiePreferencesEvent } from "@/lib/cookie-preferences";

const quickLinks = [
  { label: "Accueil", href: "/#accueil" },
  { label: "À propos", href: "/#about" },
  { label: "Prestations", href: "/#services" },
  { label: "LOCATION", href: "/location" },
  { label: "Tarification", href: "/#devis" },
  { label: "Nous contacter", href: "/#contact" },
];

const legalLinks = [
  { label: "Mentions légales", href: "/legal/mentions-legales" },
  { label: "Politique de confidentialité", href: "/legal/politique-de-confidentialite" },
  { label: "Conditions générales d’utilisation", href: "/legal/conditions-generales-utilisation" },
  { label: "Conditions générales de location", href: "/legal/conditions-generales-location" },
  { label: "Politique de cookies", href: "/legal/politique-de-cookies" },
];

const socialLinks = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/passyeventz/",
    icon: "instagram",
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@passyeventz",
    icon: "tiktok",
  },
  {
    label: "YouTube — Passyeventz",
    href: "https://www.youtube.com/results?search_query=Passyeventz",
    icon: "youtube",
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61595161020240",
    icon: "facebook",
  },
] as const;

function SocialIcon({ name }: { name: (typeof socialLinks)[number]["icon"] }) {
  if (name === "instagram") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
      </svg>
    );
  }

  if (name === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <path
          d="M14 3v11.2a4.2 4.2 0 1 1-3.4-4.1M14 3c.4 3.1 2.2 5 5 5.4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "youtube") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <rect x="2.5" y="5" width="19" height="14" rx="4" stroke="currentColor" strokeWidth="1.8" />
        <path d="m10 9 5 3-5 3V9Z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-5 w-5">
      <path d="M13.3 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7v3.1h2.9v8h3.4Z" />
    </svg>
  );
}

export function SiteFooter() {
  const [newsletterMessage, setNewsletterMessage] = useState("");

  function handleNewsletterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const subject = encodeURIComponent("Inscription à la newsletter PassyEventz");
    const body = encodeURIComponent(`Bonjour,\n\nJe souhaite recevoir la newsletter PassyEventz.\nMon adresse e-mail : ${email}`);

    window.location.href = `mailto:contact@passyeventz.com?subject=${subject}&body=${body}`;
    setNewsletterMessage("Votre messagerie va s’ouvrir pour finaliser votre demande d’inscription.");
    event.currentTarget.reset();
  }

  return (
    <footer className="border-t border-[rgba(214,163,77,0.2)] bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-12 rounded-4xl border border-[rgba(244,213,138,0.18)] bg-[linear-gradient(135deg,rgba(244,213,138,0.1),rgba(255,249,239,0.03)_55%)] p-6 sm:p-9 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:p-10">
          <div>
            <Image
              src="/images/passyeventz-logo.png"
              alt="PassyEventz"
              width={1254}
              height={1254}
              sizes="64px"
              className="mb-4 h-16 w-16 object-contain"
            />
            <p className="text-[0.68rem] uppercase tracking-[0.28em] text-light-gold">La Newsletter PassyEventz</p>
            <h2 className="mt-3 max-w-xl font-serif text-4xl leading-tight text-background sm:text-5xl">
              Directement dans votre boîte mail.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[rgba(255,249,239,0.7)]">
              Tendances, inspirations déco et coulisses de nos événements : retrouvez toute l’élégance de l’univers Passyeventz à travers une sélection exclusive.
            </p>
          </div>

          <form onSubmit={handleNewsletterSubmit} className="rounded-3xl border border-[rgba(244,213,138,0.16)] bg-[rgba(8,7,6,0.28)] p-4 sm:p-5">
            <label htmlFor="newsletter-email" className="mb-2 block text-sm text-[rgba(255,249,239,0.82)]">
              Votre adresse e-mail
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="newsletter-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="vous@exemple.fr"
                required
                className="h-12 min-w-0 flex-1 rounded-full border border-[rgba(255,249,239,0.16)] bg-[rgba(255,249,239,0.06)] px-5 text-sm text-background outline-none placeholder:text-[rgba(255,249,239,0.42)] focus:border-light-gold focus:ring-2 focus:ring-[rgba(244,213,138,0.2)]"
              />
              <button
                type="submit"
                className="h-12 rounded-full bg-gold px-6 text-sm font-semibold text-foreground transition-colors hover:bg-light-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-gold focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
              >
                S’inscrire
              </button>
            </div>
            <p aria-live="polite" className="mt-3 min-h-5 text-xs leading-5 text-[rgba(255,249,239,0.58)]">
              {newsletterMessage || "En vous inscrivant, vous pourrez vous désabonner à tout moment."}
            </p>
          </form>
        </div>

        <div className="grid gap-10 border-b border-[rgba(255,249,239,0.1)] py-12 sm:grid-cols-2 lg:grid-cols-[1.25fr_1fr_1fr_0.8fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="relative h-12 w-12 shrink-0">
                <Image src="/images/passyeventz-logo.png" alt="" fill sizes="48px" className="object-contain" />
              </span>
              <span>
                <span className="block text-[0.72rem] uppercase tracking-[0.28em] text-light-gold">PassyEventz</span>
                <span className="mt-1 block text-sm text-[rgba(255,249,239,0.62)]">Événements premium</span>
              </span>
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-7 text-[rgba(255,249,239,0.62)]">
              Décoration, location & scénographie.
            </p>
            <p className="mt-5 max-w-xs text-sm leading-7 text-[rgba(255,249,239,0.62)]">
              SUIVEZ NOUS...
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.icon}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  title={social.label}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(244,213,138,0.26)] text-[rgba(255,249,239,0.8)] transition-colors hover:border-light-gold hover:bg-[rgba(244,213,138,0.1)] hover:text-light-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-gold"
                >
                  <SocialIcon name={social.icon} />
                </a>
              ))}
            </div>
          </div>

          <nav aria-label="Liens rapides">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-light-gold">Liens rapides</h2>
            <ul className="mt-5 space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-[rgba(255,249,239,0.68)] transition-colors hover:text-light-gold">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Mentions légales">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-light-gold">Mentions légales</h2>
            <ul className="mt-5 space-y-3">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-[rgba(255,249,239,0.68)] transition-colors hover:text-light-gold"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new Event(cookiePreferencesEvent))}
                  className="text-left text-sm text-[rgba(255,249,239,0.68)] transition-colors hover:text-light-gold"
                >
                  Gérer mes cookies
                </button>
              </li>
            </ul>
          </nav>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-light-gold">Nos partenaires</h2>
            <ul className="mt-5 space-y-3 text-sm text-[rgba(255,249,239,0.68)]">
              <li>
                <a
                  href="https://www.facebook.com/p/Mboa-Cook-100090457417614/"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-light-gold"
                >
                  Mboa Cook
                </a>
              </li>
              <li>
                <a
                  href="https://afrobizz.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-light-gold"
                >
                  Afrobizz
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-6 text-xs text-[rgba(255,249,239,0.5)] sm:flex-row sm:items-center sm:justify-between">
          <span>© PassyEventz. Tous droits réservés.</span>
          <a href="mailto:contact@passyeventz.com" className="transition-colors hover:text-light-gold">
            contact@passyeventz.com
          </a>
        </div>
      </div>
    </footer>
  );
}
