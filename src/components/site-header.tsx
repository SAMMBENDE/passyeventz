"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Accueil", href: "#accueil" },
  { label: "Prestations", href: "#services" },
  { label: "Réalisations", href: "#portfolio" },
  { label: "Tarifs", href: "#devis" },
  { label: "Contact", href: "#contact" },
];

export function SiteHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  function closeMenuAfterNavigation() {
    window.requestAnimationFrame(() => {
      menuButtonRef.current?.focus();
      setIsMobileMenuOpen(false);
    });
  }

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        menuButtonRef.current?.focus();
        setIsMobileMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(214,163,77,0.16)] bg-[rgba(8,7,6,0.86)] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4.5 sm:px-6 lg:px-8 xl:py-4">
        <Link href="#accueil" className="flex min-w-0 items-center gap-2.5 text-background transition-opacity hover:opacity-90">
          <div className="relative h-12 w-12 shrink-0">
            <Image
              src="/images/passyeventz-logo.png"
              alt="PassyEventz"
              fill
              sizes="48px"
              className="object-contain"
            />
          </div>
          <div className="min-w-0 leading-none">
            <div className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-light-gold">
              PassyEventz
            </div>
            <div className="mt-1 truncate font-serif text-base text-background">Décoration & Location</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 xl:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm uppercase tracking-[0.18em] text-[rgba(255,249,239,0.7)] transition-colors hover:text-light-gold"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Button asChild size="sm" className="hidden xl:inline-flex">
          <Link href="/devis">Demander un devis</Link>
        </Button>

        <button
          ref={menuButtonRef}
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(244,213,138,0.3)] text-background transition-colors hover:border-light-gold hover:text-light-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold xl:hidden"
          aria-label={isMobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
        >
          <span aria-hidden="true" className="relative h-5 w-5">
            <span
              className={`absolute left-0 top-1.25 h-0.5 w-5 rounded-full bg-current transition-transform duration-200 ease-out motion-reduce:transition-none ${
                isMobileMenuOpen ? "translate-y-1.25 rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-2.5 h-0.5 w-5 rounded-full bg-current transition-opacity duration-150 ease-out motion-reduce:transition-none ${
                isMobileMenuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 top-3.75 h-0.5 w-5 rounded-full bg-current transition-transform duration-200 ease-out motion-reduce:transition-none ${
                isMobileMenuOpen ? "-translate-y-1.25 -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </div>

      <nav
        id="mobile-navigation"
        aria-label="Navigation mobile"
        aria-hidden={!isMobileMenuOpen}
        inert={!isMobileMenuOpen}
        style={{
          pointerEvents: isMobileMenuOpen ? "auto" : "none",
          visibility: isMobileMenuOpen ? "visible" : "hidden",
        }}
        className={`absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-[rgba(214,163,77,0.16)] bg-[rgba(8,7,6,0.98)] px-4 py-4 shadow-[0_20px_40px_rgba(0,0,0,0.24)] transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none sm:px-6 xl:hidden ${
          isMobileMenuOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
        }`}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-1">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={closeMenuAfterNavigation}
              className="block cursor-pointer rounded-xl px-3 py-3 text-sm uppercase tracking-[0.18em] text-[rgba(255,249,239,0.78)] transition-colors hover:bg-[rgba(255,249,239,0.05)] hover:text-light-gold"
            >
              {item.label}
            </a>
          ))}
          <Button asChild size="sm" className="mt-2">
            <Link href="/devis">
              Demander un devis
            </Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
