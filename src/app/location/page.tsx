import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { RentalCatalogue } from "@/components/rental-catalogue";

export const metadata: Metadata = {
  title: "Location de mobilier, vaisselle et accessoires | PassyEventz",
  description:
    "Découvrez la collection de mobilier, vaisselle et accessoires de réception PassyEventz et demandez un devis de location personnalisé.",
};

export default function LocationPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-[65vh] bg-background">
        <section className="relative overflow-hidden border-b border-line bg-[linear-gradient(130deg,#f5f0e7_0%,#fbf8f2_58%,#eee5d6_100%)]">
          <div className="mx-auto max-w-7xl px-4 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-16 lg:px-8 lg:pb-20">
            <p className="text-xs uppercase tracking-[0.3em] text-gold">La collection PassyEventz</p>
            <div className="mt-4 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <h1 className="max-w-3xl font-serif text-5xl leading-[0.98] text-foreground sm:text-6xl lg:text-7xl">
                  L’art de recevoir,
                  <span className="block text-gold">dans chaque détail.</span>
                </h1>
                <p className="mt-5 max-w-xl text-sm leading-7 text-muted sm:text-base">
                  Mobilier, art de la table et pièces de caractère : composez une réception qui vous
                  ressemble.
                </p>
              </div>
              <a
                href="#collection"
                className="inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(197,161,90,0.42)] px-5 py-3 text-xs font-medium uppercase tracking-[0.16em] text-foreground transition-colors hover:bg-white/60"
              >
                Explorer la collection <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
        </section>
        <RentalCatalogue />
      </main>
      <SiteFooter />
    </>
  );
}
