"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const services = [
  {
    title: "Mariages",
    description: "Le mariage - Des décors sur mesure pour vos plus beaux moments.",
    image: "/images/prestations/mariage.jpg",
    imageAlt: "Décoration de mariage aux drapés ivoire et détails dorés",
    imagePosition: "50% 50%",
  },
  {
    title: "Événements privés",
    description: "Anniversaires, baptêmes et baby showers sublimés par une décoration sur mesure.",
    image: "/images/prestations/famille.jpg",
    imageAlt: "Décor de baby shower pastel réalisé par PassyEventz",
    imagePosition: "55% 48%",
  },
  {
    title: "Événements corporate",
    description: "Des événements d’entreprise orchestrés avec élégance et raffinement.",
    image: "/images/prestations/decor.jpg",
    imageAlt: "Scénographie florale et table de réception élégante",
    imagePosition: "52% 48%",
  },
  {
    title: "Fiançailles & demandes en mariage",
    description: "Des mises en scène raffinées pour célébrer vos plus belles promesses.",
    image: "/images/prestations/fiancailles.webp",
    imageAlt: "Une bague de fiançailles mise en lumière lors d’une réception chaleureuse",
    imagePosition: "50% 45%",
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
      role="region"
      aria-label="Prestations — faites défiler horizontalement sur mobile"
      tabIndex={0}
      className="mt-10 -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-4 pb-4 md:mx-0 md:mt-14 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-4"
    >
      {services.map(({ title, description, image, imageAlt, imagePosition }) => (
        <article
          key={title}
          className="service-card group flex w-[min(84vw,22rem)] shrink-0 snap-start flex-col overflow-hidden rounded-[1.55rem] border border-[rgba(8,7,6,0.08)] bg-white shadow-[0_16px_38px_rgba(8,7,6,0.045)] transition-shadow duration-300 hover:shadow-[0_22px_48px_rgba(8,7,6,0.09)] md:w-auto md:shrink md:snap-none md:rounded-[1.7rem]"
        >
          <div className="relative order-1 aspect-4/3 overflow-hidden bg-panel md:aspect-5/7 lg:aspect-3/4 xl:aspect-9/17">
            <Image
              src={image}
              alt={imageAlt}
              fill
              sizes="(min-width: 1280px) 286px, (min-width: 768px) calc((100vw - 72px) / 2), 84vw"
              className="service-card__image object-cover transition-transform duration-700 ease-out motion-reduce:transition-none lg:group-hover:scale-[1.035]"
              style={{ objectPosition: imagePosition }}
            />
          </div>

          <div className="order-2 flex min-h-41 flex-col px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
            <h3 className="max-w-[15ch] font-serif text-[1.65rem] leading-[1.02] tracking-tight text-foreground sm:text-[1.8rem] lg:text-[1.55rem] xl:text-[1.7rem]">
              {title}
            </h3>
            <p className="mt-2 text-[0.84rem] leading-normal text-muted sm:text-[0.88rem]">
              {description}
            </p>
            <Link
              href="/devis"
              aria-label={`Découvrir ${title}`}
              className="mt-auto inline-flex w-fit items-center gap-1.5 pt-3 text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-[#9a6b22] transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4"
            >
              Découvrir
              <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
