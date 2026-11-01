"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarCheck2, HeartHandshake, Palette, Sparkles, ArrowUpRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const services = [
  {
    number: "01",
    title: "Mariages & cérémonies",
    description:
      "Décors floraux, installations de cérémonie, tables de réception et atmosphères sur mesure pour célébrer votre union avec élégance.",
    image: "/images/prestations/mariage.jpg",
    imageAlt: "Décoration de mariage aux drapés ivoire et détails dorés",
    imagePosition: "50% 50%",
    icon: Sparkles,
  },
  {
    number: "02",
    title: "Événements familiaux",
    description:
      "Baptêmes, anniversaires et galas intimes imaginés comme des expériences chaleureuses, personnalisées et mémorables.",
    image: "/images/prestations/famille.jpg",
    imageAlt: "Décor de baby shower pastel réalisé par PassyEventz",
    imagePosition: "55% 48%",
    detailImage: "/images/prestations/famille-anniversaire.jpg",
    detailImageAlt: "Table de réception familiale aux accents dorés",
    icon: HeartHandshake,
  },
  {
    number: "03",
    title: "Scénographie & styling",
    description:
      "Ambiances raffinées, personnalisation chromatique et mise en scène immersive pour des lieux uniques et sophistiqués.",
    image: "/images/prestations/decor.jpg",
    imageAlt: "Scénographie florale et table de réception élégante",
    imagePosition: "52% 48%",
    detailImage: "/images/prestations/scenographie.jpg",
    detailImageAlt: "Mise en scène de cérémonie et décor de réception",
    icon: Palette,
  },
  {
    number: "04",
    title: "Location premium",
    description:
      "Mobilier design, vaisselle, accessoires décoratifs et éléments d’atelier sélectionnés pour des installations impeccables.",
    image: "/images/prestations/location.jpg",
    imageAlt: "Verres taillés et art de la table pour une réception premium",
    imagePosition: "50% 48%",
    icon: CalendarCheck2,
  },
];

export function ServicesGrid() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const cards = gsap.utils.toArray<HTMLElement>(".service-card");
        const isMobile = window.matchMedia("(max-width: 767px)").matches;
        const revealedCards = new WeakSet<HTMLElement>();

        gsap.set(cards, { autoAlpha: 0, y: isMobile ? 18 : 24 });
        cards.forEach((card) => {
          const image = card.querySelector(".service-card__image");
          if (image) {
            gsap.set(image, {
              clipPath: "inset(8% 5% 8% 5% round 1.2rem)",
              scale: 1.04,
            });
          }
        });

        const revealCards = (batch: Element[]) => {
          const unrevealed = batch.filter(
            (card): card is HTMLElement =>
              card instanceof HTMLElement && !revealedCards.has(card),
          );
          if (unrevealed.length === 0) return;
          unrevealed.forEach((card) => revealedCards.add(card));

          gsap.to(unrevealed, {
            autoAlpha: 1,
            y: 0,
            duration: isMobile ? 0.52 : 0.68,
            stagger: isMobile ? 0.04 : 0.12,
            ease: "power2.out",
          });

          const images = unrevealed
            .map((card) => card.querySelector(".service-card__image"))
            .filter((image): image is HTMLImageElement => image instanceof HTMLImageElement);
          gsap.to(images, {
            clipPath: "inset(0% 0% 0% 0% round 1.2rem)",
            scale: 1,
            duration: 0.82,
            stagger: isMobile ? 0.04 : 0.12,
            ease: "power2.out",
          });
        };

        ScrollTrigger.batch(cards, {
          start: "top 86%",
          once: true,
          interval: 0.12,
          batchMax: isMobile ? 1 : 4,
          onEnter: revealCards,
        });

        const observer = new IntersectionObserver(
          (entries, activeObserver) => {
            const visibleCards = entries
              .filter((entry) => entry.isIntersecting)
              .map((entry) => entry.target)
              .filter((target): target is HTMLElement => target instanceof HTMLElement);
            if (visibleCards.length === 0) return;

            revealCards(visibleCards);
            visibleCards.forEach((card) => activeObserver.unobserve(card));
          },
          { rootMargin: "0px 0px -12% 0px" },
        );
        cards.forEach((card) => observer.observe(card));

        return () => observer.disconnect();
      });
    }, grid);

    return () => context.revert();
  }, []);

  return (
    <div
      ref={gridRef}
      className="mt-10 grid grid-cols-1 gap-5 md:mt-14 md:grid-cols-2 md:gap-6 lg:grid-cols-4"
    >
      {services.map(({ number, title, description, image, imageAlt, imagePosition, detailImage, detailImageAlt, icon: Icon }) => (
        <article
          key={title}
          className="service-card group flex flex-col overflow-hidden rounded-[1.55rem] border border-[rgba(8,7,6,0.08)] bg-white shadow-[0_16px_38px_rgba(8,7,6,0.045)] transition-shadow duration-300 hover:shadow-[0_22px_48px_rgba(8,7,6,0.09)] md:rounded-[1.7rem]"
        >
          <div className="relative order-1 aspect-video overflow-hidden bg-panel">
            <Image
              src={image}
              alt={imageAlt}
              fill
              sizes="(min-width: 1280px) 286px, (min-width: 768px) calc((100vw - 72px) / 2), calc(100vw - 32px)"
              className="service-card__image object-cover transition-transform duration-700 ease-out motion-reduce:transition-none md:group-hover:scale-[1.035]"
              style={{ objectPosition: imagePosition }}
            />
            <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/25 via-transparent to-black/4" />
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/35 bg-black/20 px-3 py-1.5 text-[0.62rem] font-medium uppercase tracking-[0.18em] text-white backdrop-blur-sm">
              <span>{number}</span>
              <span aria-hidden="true" className="h-px w-4 bg-light-gold" />
              <Icon aria-hidden="true" className="h-3.5 w-3.5 text-light-gold" />
            </div>
            {detailImage && detailImageAlt ? (
              <div className="absolute bottom-3 right-3 h-[4.3rem] w-22 overflow-hidden rounded-xl border-2 border-white/90 shadow-[0_8px_24px_rgba(8,7,6,0.22)] sm:bottom-4 sm:right-4 sm:h-[5.1rem] sm:w-26">
                <Image
                  src={detailImage}
                  alt={detailImageAlt}
                  fill
                  sizes="104px"
                  className="object-cover"
                />
              </div>
            ) : null}
          </div>

          <div className="order-2 flex min-h-62 flex-col px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
            <h3 className="max-w-[15ch] font-serif text-[1.8rem] leading-[1.02] tracking-tight text-foreground sm:text-[1.95rem] lg:text-[1.7rem] xl:text-[1.9rem]">
              {title}
            </h3>
            <p className="mt-3 text-[0.9rem] leading-[1.75] text-muted sm:text-[0.94rem]">
              {description}
            </p>
            <Link
              href="/devis"
              aria-label={`Découvrir ${title}`}
              className="mt-auto inline-flex w-fit items-center gap-2 pt-5 text-[0.78rem] font-semibold uppercase tracking-[0.13em] text-[#9a6b22] transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4"
            >
              Découvrir
              <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
