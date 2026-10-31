import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  HeartHandshake,
  MessageSquareText,
  Palette,
  Sparkles,
  Star,
  WandSparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { MobileHeroVideo } from "@/components/mobile-hero-video";
import { SectionHeading } from "@/components/section-heading";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const services = [
  {
    title: "Mariages & cérémonies",
    description:
      "Décors floraux, installations de cérémonie, tables de réception et atmosphères sur mesure pour célébrer votre union avec élégance.",
    icon: Sparkles,
  },
  {
    title: "Événements familiaux",
    description:
      "Baptêmes, anniversaires et galas intimes imaginés comme des expériences chaleureuses, personnalisées et mémorables.",
    icon: HeartHandshake,
  },
  {
    title: "Scénographie & styling",
    description:
      "Ambiances raffinées, personnalisation chromatique et mise en scène immersive pour des lieux uniques et sophistiqués.",
    icon: Palette,
  },
  {
    title: "Location premium",
    description:
      "Mobilier design, vaisselle, accessoires décoratifs et éléments d’atelier sélectionnés pour des installations impeccables.",
    icon: CalendarCheck2,
  },
];

const gallery = [
  { title: "Mariage intimiste à Paris", category: "Mariage", image: "/images/PE-Marriage_1.png" },
  { title: "Cérémonie sous les étoiles", category: "Événement", image: "/images/PE6.jpeg" },
  { title: "Ambiance de soirée chic", category: "Soirée", image: "/images/PE.4.jpeg" },
  { title: "Décoration florale signature", category: "Floral", image: "/images/PE7.png" },
  { title: "Table d’atelier luxe", category: "Location", image: "/images/PE8.png" },
  { title: "Scénographie événementielle", category: "Corporate", image: "/images/PE.3.jpeg" },
];

const process = [
  { step: "01", title: "Écoute & inspiration", text: "Nous explorons votre vision, votre lieu, votre palette et vos priorités pour définir une direction réfléchie." },
  { step: "02", title: "Concept & devis", text: "Un projet détaillé, des éléments sélectionnés et un devis clair fondé sur des prix vérifiés et personnalisés." },
  { step: "03", title: "Mise en œuvre", text: "Préparation, livraison, installation et coordination sur site pour une exécution sans stress." },
  { step: "04", title: "Récit inoubliable", text: "Nous veillons à ce que chaque détail participe à une expérience élégante, cohérente et mémorable." },
];

const testimonials = [
  {
    quote:
      "PassyEventz a transformé notre lieu en un univers féérique. Le rendu était à la fois très chic et d’une grande chaleur humaine.",
    author: "Claire & Thomas",
    context: "Mariage à la campagne",
  },
  {
    quote:
      "L’équipe a su écouter nos envies et proposer une ambiance premium sans jamais perdre la cohérence du projet. Une vraie signature.",
    author: "Sophie L.",
    context: "Cérémonie d’entreprise",
  },
  {
    quote:
      "Le service de location était impeccable, les finitions parfaites et le conseil très précieux pour organiser un événement serein.",
    author: "Élodie M.",
    context: "Anniversaire privé",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main id="accueil" className="scroll-mt-24">
        <section className="relative isolate flex min-h-[calc(100svh-77px)] flex-col overflow-hidden bg-foreground text-background md:hidden">
          <div className="absolute inset-0">
            <Image
              src="/images/PE.5.jpeg"
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
            />
            <MobileHeroVideo />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,7,6,0.68)_0%,rgba(8,7,6,0.46)_34%,rgba(8,7,6,0.9)_66%,rgba(8,7,6,0.98)_100%)]" />
          </div>

          <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-between px-6 pb-8 pt-7 sm:px-10 sm:pb-10 sm:pt-8">
            <Image
              src="/images/passyeventz-logo-black.png"
              alt="PassyEventz — décoration, événementiel et location"
              width={1254}
              height={1254}
              priority
              sizes="(max-width: 767px) 45vw, 176px"
              className="h-auto w-[min(45vw,11rem)] rounded-3xl border border-[rgba(244,213,138,0.24)] shadow-[0_12px_42px_rgba(0,0,0,0.42)]"
            />

            <div className="flex w-full flex-col items-center text-center">
              <p className="mb-3 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-light-gold sm:text-[0.68rem]">
                VOTRE ÉVÉNEMENT. NOTRE SIGNATURE.
              </p>
              <h1 className="font-serif text-[clamp(2.55rem,10vw,3.55rem)] leading-[0.9] tracking-[-0.035em] text-background">
                L&apos;élégance
                <span className="block">de vos événements.</span>
              </h1>
              <p className="mt-4 max-w-sm text-[0.9rem] leading-6 text-[rgba(255,249,239,0.84)] sm:text-[0.95rem] sm:leading-7">
                Des décors raffinés et des mises en scène sur mesure, imaginés pour rendre chaque instant inoubliable.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3">
              <Link
                href="/devis"
                className="inline-flex min-h-14 items-center justify-center rounded-full bg-gold px-6 text-sm font-semibold text-foreground transition-colors hover:bg-light-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-gold focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
              >
                Demander un devis →
              </Link>
              <Link
                href="#portfolio"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[rgba(244,213,138,0.36)] px-6 text-sm font-medium text-background transition-colors hover:border-light-gold hover:bg-[rgba(255,249,239,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-gold"
              >
                Découvrir nos réalisations
              </Link>
            </div>
          </div>
        </section>

        <section className="relative hidden overflow-hidden bg-foreground text-background md:block">
          <div className="absolute inset-0">
            <Image
              src="/images/PE6.jpeg"
              alt="Décoration premium pour un événement"
              fill
              sizes="100vw"
              className="object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,7,6,0.88)_0%,rgba(8,7,6,0.68)_32%,rgba(8,7,6,0.42)_100%)]" />
          </div>

          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-28">
            <FadeIn className="max-w-2xl">
              <p className="mb-5 text-[0.72rem] font-medium uppercase tracking-[0.34em] text-light-gold">
                Votre événement. Notre signature.
              </p>
              <h1 className="max-w-xl text-5xl leading-[0.9] text-background sm:text-6xl lg:text-7xl">
                Chaque détail compte. Chaque événement devient une expérience.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-[rgba(255,249,239,0.78)] sm:text-lg">
                PassyEventz conçoit des célébrations raffinées, des ambiances sculptées à la main et des installations de prestige pour les instants qui comptent le plus.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Button asChild size="lg" className="bg-gold text-foreground hover:bg-light-gold">
                  <Link href="/devis">
                    Demander un devis
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link href="#portfolio">Découvrir nos réalisations</Link>
                </Button>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-[rgba(255,249,239,0.72)]">
                <span className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-gold" /> Décors sur mesure</span>
                <span className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-gold" /> Location premium</span>
                <span className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-gold" /> Coordination complète</span>
              </div>
            </FadeIn>

            <FadeIn className="relative flex items-end justify-center lg:justify-end">
              <div className="w-full max-w-md rounded-4xl border border-[rgba(244,213,138,0.28)] bg-[rgba(255,249,239,0.04)] p-4 shadow-(--shadow) backdrop-blur-sm">
                <div className="overflow-hidden rounded-3xl border border-[rgba(255,249,239,0.12)]">
                  <Image
                    src="/images/PE-SH.png"
                    alt="Scénographie d’événement luxe"
                    width={640}
                    height={820}
                    className="h-120 w-full object-cover"
                  />
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-[rgba(244,213,138,0.2)] pt-4 text-sm text-[rgba(255,249,239,0.8)]">
                  <div>
                    <div className="text-[0.68rem] uppercase tracking-[0.2em] text-light-gold">Dernière création</div>
                    <div className="mt-2 font-medium">Élégance de soirée</div>
                  </div>
                  <div className="flex items-center gap-1 text-light-gold">
                    <Star className="h-4 w-4 fill-current" />
                    4.9/5
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        <section id="services" className="scroll-mt-24 mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Prestations"
            title="Des prestations pensées pour les grands moments."
            description="Chaque projet est pensé pour allier l’expérience utilisateur, la beauté visuelle et une organisation impeccable, du concept à la mise en scène finale."
          />

          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {services.map(({ title, description, icon: Icon }) => (
              <FadeIn key={title} className="group rounded-[1.8rem] border border-line bg-white p-7 shadow-[0_18px_40px_rgba(8,7,6,0.04)] transition-transform duration-300 hover:-translate-y-1">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(214,163,77,0.12)] text-gold">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-3xl text-foreground">{title}</h3>
                <p className="mt-4 text-[0.98rem] leading-7 text-muted">{description}</p>
              </FadeIn>
            ))}
          </div>
        </section>

        <section id="portfolio" className="scroll-mt-24 bg-panel py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Réalisations"
              title="Des ambiances sculptées pour raconter votre histoire."
              description="Créez des scènes à forte signature visuelle, appuyées par une palette raffinée, des textures élégantes et des détails soigneusement orchestrés."
            />

            <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {gallery.map((item) => (
                <FadeIn key={item.title} className="group overflow-hidden rounded-4xl border border-[rgba(8,7,6,0.06)] bg-white shadow-[0_18px_40px_rgba(8,7,6,0.04)]">
                  <div className="relative h-80 overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(min-width: 1280px) 389px, (min-width: 1024px) calc((100vw - 88px) / 2), (min-width: 768px) calc((100vw - 72px) / 2), calc(100vw - 32px)"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,7,6,0.08),rgba(8,7,6,0.56))]" />
                    <div className="absolute left-5 top-5 rounded-full border border-[rgba(244,213,138,0.5)] bg-[rgba(8,7,6,0.28)] px-3 py-1 text-[0.62rem] uppercase tracking-[0.18em] text-background backdrop-blur-sm">
                      {item.category}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 p-6">
                    <div>
                      <h3 className="text-2xl text-foreground">{item.title}</h3>
                    </div>
                    <Link href="/devis" className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(8,7,6,0.12)] text-foreground transition-colors hover:border-gold hover:text-gold">
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="scroll-mt-24 mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="rounded-[2.2rem] bg-foreground px-6 py-12 text-background sm:px-8 lg:px-10">
            <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeading
                eyebrow="Processus"
                title="Un accompagnement serein, de la première idée au dernier détail."
                description="Nous orchestrons les éléments essentiels pour vous faire vivre un moment sans friction et sans compromis sur le design."
              />
              <Button asChild variant="secondary" className="self-start">
                <Link href="/devis">Parler à notre équipe</Link>
              </Button>
            </div>

            <Image
              src="/images/passyeventz-logo.png"
              alt="PassyEventz"
              width={1254}
              height={1254}
              sizes="64px"
              className="mx-auto mt-8 h-16 w-16 object-contain md:hidden"
            />

            <div className="mt-8 grid gap-6 md:mt-12 md:grid-cols-2 xl:grid-cols-4">
              {process.map((item) => (
                <div key={item.step} className="rounded-[1.6rem] border border-[rgba(244,213,138,0.18)] bg-[rgba(255,249,239,0.03)] p-6">
                  <div className="mb-5 text-[0.7rem] uppercase tracking-[0.28em] text-light-gold">{item.step}</div>
                  <h3 className="text-3xl text-background">{item.title}</h3>
                  <p className="mt-4 text-[0.96rem] leading-7 text-[rgba(255,249,239,0.7)]">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <SectionHeading
                eyebrow="Valeurs"
                title="Élégance, raffinement, créativité."
                description="Nous concevons des espaces qui lisent à la fois chic et chaleureux, avec une forte attention au détail et à l’âme de chaque événement."
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              {[
                { label: "Élégance", text: "Un style affirmé, discret et luxueux." },
                { label: "Raffinement", text: "Des finitions soignées et une expérience premium." },
                { label: "Créativité", text: "Des idées nouvelles qui reflètent votre personnalité." },
              ].map((item) => (
                <div key={item.label} className="rounded-[1.7rem] border border-line bg-white p-6 shadow-[0_15px_30px_rgba(8,7,6,0.03)]">
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(214,163,77,0.12)] text-gold">
                    <WandSparkles className="h-5 w-5" />
                  </div>
                  <h3 className="text-3xl text-foreground">{item.label}</h3>
                  <p className="mt-3 text-[0.96rem] leading-7 text-muted">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f7f1e7] py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Témoignages"
              title="Des clients inspirés par des moments mémorables."
              description="Chaque retour nous aide à affiner l’expérience et à créer des atmosphères toujours plus cohérentes et émouvantes."
              align="center"
            />

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {testimonials.map((item) => (
                <FadeIn key={item.author} className="rounded-[1.8rem] border border-[rgba(8,7,6,0.06)] bg-white p-7 shadow-[0_18px_40px_rgba(8,7,6,0.04)]">
                  <div className="mb-6 flex items-center gap-1 text-gold">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={`${item.author}-${index}`} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-[1.06rem] leading-8 text-muted">“{item.quote}”</p>
                  <div className="mt-8 border-t border-[rgba(8,7,6,0.06)] pt-5">
                    <div className="font-medium text-foreground">{item.author}</div>
                    <div className="mt-1 text-sm text-muted">{item.context}</div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        <section id="devis" className="scroll-mt-24 mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="grid gap-8 rounded-[2.2rem] border border-line bg-white p-8 shadow-[0_28px_70px_rgba(8,7,6,0.05)] lg:grid-cols-[1.1fr_0.9fr] lg:p-12">
            <div>
              <Image
                src="/images/passyeventz-logo-black.png"
                alt="PassyEventz — décoration, événementiel et location"
                width={1254}
                height={1254}
                sizes="80px"
                className="mb-6 h-20 w-20 rounded-2xl border border-[rgba(214,163,77,0.2)] shadow-[0_12px_30px_rgba(8,7,6,0.12)]"
              />
              <p className="mb-3 text-[0.72rem] uppercase tracking-[0.28em] text-gold">Demande de devis</p>
              <h2 className="font-serif text-5xl leading-none text-foreground">Créer un événement qui marque les esprits.</h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-muted">
                Partagez votre vision, votre date et vos besoins, et nous vous proposerons une ambiance pensée pour votre événement avec une réponse claire et élégante.
              </p>
            </div>

            <div className="rounded-[1.8rem] border border-[rgba(214,163,77,0.18)] bg-panel p-6">
              <div className="space-y-4 text-sm text-muted">
                <div className="flex items-start gap-3">
                  <MessageSquareText className="mt-0.5 h-5 w-5 text-gold" />
                  <span>Des recommandations personnalisées selon votre lieu, votre thème et votre budget.</span>
                </div>
                <div className="flex items-start gap-3">
                  <CalendarCheck2 className="mt-0.5 h-5 w-5 text-gold" />
                  <span>Disponibilité confirmée pour vos dates clés, les installations et la logistique.</span>
                </div>
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 text-gold" />
                  <span>Une proposition élégante et construite sur des prix vérifiés et des éléments adaptés.</span>
                </div>
              </div>

              <Button asChild size="lg" className="mt-6 w-full">
                <Link href="/devis">Commencer ma demande</Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="contact" className="scroll-mt-24 bg-foreground py-24 text-background">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:px-8">
            <div>
              <p className="mb-3 text-[0.72rem] uppercase tracking-[0.28em] text-light-gold">Contact</p>
              <h2 className="font-serif text-5xl leading-none text-background">Discutons de votre prochain projet.</h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-[rgba(255,249,239,0.76)]">
                Que vous prépariez un mariage, une soirée privée ou un événement d’entreprise, notre équipe vous accompagne avec une attention particulière à chaque détail.
              </p>
            </div>

            <div className="rounded-[1.8rem] border border-[rgba(244,213,138,0.2)] bg-[rgba(255,249,239,0.03)] p-6">
              <div className="space-y-6 text-sm text-[rgba(255,249,239,0.8)]">
                <div>
                  <div className="text-[0.68rem] uppercase tracking-[0.2em] text-light-gold">Téléphone</div>
                  <a href="tel:+33670256831" className="mt-2 inline-block text-lg text-background transition-colors hover:text-light-gold">
                    +33 (0) 670 256 831
                  </a>
                </div>
                <div>
                  <div className="text-[0.68rem] uppercase tracking-[0.2em] text-light-gold">Email</div>
                  <a href="mailto:contact@passyeventz.com" className="mt-2 inline-block text-lg text-background transition-colors hover:text-light-gold">
                    contact@passyeventz.com
                  </a>
                </div>
                <div>
                  <div className="text-[0.68rem] uppercase tracking-[0.2em] text-light-gold">Site internet</div>
                  <a href="https://www.passyeventz.com" target="_blank" rel="noreferrer" className="mt-2 inline-block text-lg text-background transition-colors hover:text-light-gold">
                    www.passyeventz.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
