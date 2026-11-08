import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getLegalDocument, legalDocuments } from "@/lib/legal-documents";

type LegalPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return legalDocuments.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
  const { slug } = await params;
  const document = getLegalDocument(slug);

  return {
    title: document ? `${document.title} | Passyeventz` : "Informations légales | Passyeventz",
    description: document?.intro
      ? `${document.title} de Passyeventz.`
      : "Informations légales de Passyeventz.",
  };
}

export default function LegalPage({ params }: LegalPageProps) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<LegalPageFallback />}>
        {params.then(({ slug }) => (
          <LegalDocumentContent slug={slug} />
        ))}
      </Suspense>
      <SiteFooter />
    </>
  );
}

function LegalPageFallback() {
  return (
    <main className="min-h-[65vh] bg-background">
      <section className="border-b border-line bg-[linear-gradient(130deg,#f5f0e7_0%,#fbf8f2_58%,#eee5d6_100%)]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Informations légales</p>
          <div className="mt-8 h-14 max-w-2xl animate-pulse rounded-xl bg-black/5" />
        </div>
      </section>
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-32 animate-pulse rounded-3xl bg-white" />
        ))}
      </div>
    </main>
  );
}

function LegalDocumentContent({ slug }: { slug: string }) {
  const document = getLegalDocument(slug);
  if (!document) notFound();

  return (
    <main className="min-h-[65vh] bg-background">
        <section className="border-b border-line bg-[linear-gradient(130deg,#f5f0e7_0%,#fbf8f2_58%,#eee5d6_100%)]">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
            <Link
              href="/"
              className="text-xs uppercase tracking-[0.18em] text-muted transition-colors hover:text-gold"
            >
              PassyEventz <span aria-hidden="true">/</span> Informations légales
            </Link>
            <div className="mt-8 max-w-4xl">
              <p className="text-xs uppercase tracking-[0.28em] text-gold">Informations légales</p>
              <h1 className="mt-4 font-serif text-5xl leading-[0.98] text-foreground sm:text-6xl lg:text-7xl">
                {document.title}
              </h1>
              <p className="mt-5 text-sm text-muted">
                Dernière mise à jour : {document.updatedAt}
              </p>
              {document.intro && (
                <p className="mt-6 max-w-3xl text-base leading-8 text-muted">
                  {document.intro}
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          {document.reviewNotice && (
            <aside className="mb-8 rounded-2xl border border-[#d6a34d]/40 bg-[#f7f0e2] p-5 text-sm leading-7 text-foreground sm:p-6">
              <p className="font-semibold text-gold">Projet à valider avant publication définitive</p>
              <p className="mt-2">{document.reviewNotice}</p>
            </aside>
          )}

          <div className="space-y-5">
            {document.sections.map((section, index) => (
              <section
                key={section.title}
                className="rounded-3xl border border-line bg-white p-6 shadow-[0_12px_35px_rgba(8,7,6,0.035)] sm:p-8"
              >
                <div className="flex items-start gap-4">
                  <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f6f0e5] text-xs font-semibold text-gold">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-serif text-2xl leading-tight text-foreground sm:text-3xl">
                      {section.title}
                    </h2>
                    {section.paragraphs?.map((paragraph, paragraphIndex) => (
                      <p
                        key={paragraphIndex}
                        className="mt-4 text-sm leading-7 text-muted sm:text-base"
                      >
                        {paragraph}
                      </p>
                    ))}
                    {section.bullets && (
                      <ul className="mt-4 space-y-3 pl-5 text-sm leading-7 text-muted marker:text-gold sm:text-base">
                        {section.bullets.map((bullet, bulletIndex) => (
                          <li key={bulletIndex} className="list-disc">
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>
    </main>
  );
}
