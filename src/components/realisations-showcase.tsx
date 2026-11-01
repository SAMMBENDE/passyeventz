"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type RealisationItem = {
  title: string;
  category: string;
  description: string;
  image: string;
  imageAlt: string;
};

type RealisationsShowcaseProps = {
  items: RealisationItem[];
};

export function RealisationsShowcase({ items }: RealisationsShowcaseProps) {
  const showcaseRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [copyVisible, setCopyVisible] = useState(true);
  const [isInView, setIsInView] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const changeSlide = useCallback(
    (nextIndex: number) => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }

      setCopyVisible(false);
      copyTimeoutRef.current = window.setTimeout(() => {
        setActiveIndex((nextIndex + items.length) % items.length);
        setCopyVisible(true);
        copyTimeoutRef.current = null;
      }, 160);
    },
    [items.length],
  );

  useEffect(() => {
    const element = showcaseRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.2 },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateVisibility = () => setIsPageVisible(!document.hidden);
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setPrefersReducedMotion(motionPreference.matches);

    updateVisibility();
    updateMotionPreference();
    document.addEventListener("visibilitychange", updateVisibility);
    motionPreference.addEventListener("change", updateMotionPreference);

    return () => {
      document.removeEventListener("visibilitychange", updateVisibility);
      motionPreference.removeEventListener("change", updateMotionPreference);
    };
  }, []);

  useEffect(() => {
    if (!isInView || !isPageVisible || isPaused || prefersReducedMotion) return;

    const timeout = window.setTimeout(() => {
      changeSlide(activeIndex + 1);
    }, 4500);

    return () => window.clearTimeout(timeout);
  }, [activeIndex, changeSlide, isInView, isPageVisible, isPaused, prefersReducedMotion]);

  useEffect(
    () => () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    },
    [],
  );

  const moveSlide = (direction: -1 | 1) => {
    setIsPaused(true);
    changeSlide(activeIndex + direction);
  };

  const activeItem = items[activeIndex];

  return (
    <div
      ref={showcaseRef}
      role="region"
      aria-label="Réalisations — diaporama"
      className="mt-10 md:hidden"
    >
      <div
        className="relative aspect-4/3 overflow-hidden rounded-[1.7rem] border border-[rgba(8,7,6,0.08)] bg-[#e8dfd1] shadow-[0_18px_40px_rgba(8,7,6,0.08)]"
        onPointerDown={() => setIsPaused(true)}
      >
        {items.map((item, index) => (
          <Image
            key={item.image}
            src={item.image}
            alt={index === activeIndex ? item.imageAlt : ""}
            fill
            sizes="(max-width: 767px) calc(100vw - 32px), 0px"
            className={`object-cover transition-opacity duration-800 ease-in-out motion-reduce:duration-0 ${
              index === activeIndex ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-hidden={index !== activeIndex}
            priority={index === 0}
          />
        ))}

        <div className="absolute left-4 top-4 rounded-full border border-white/50 bg-black/30 px-3 py-1.5 text-[0.62rem] font-medium uppercase tracking-[0.18em] text-white backdrop-blur-sm">
          {activeItem.category}
        </div>

        <div className="absolute inset-x-4 bottom-4 flex items-center justify-between">
          <button
            type="button"
            aria-label="Réalisation précédente"
            onClick={() => moveSlide(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronLeft aria-hidden="true" className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Réalisation suivante"
            onClick={() => moveSlide(1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronRight aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mt-5 flex items-start justify-between gap-4">
        <div
          className={`transition-opacity duration-300 motion-reduce:duration-0 ${
            copyVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <h3 className="font-serif text-[1.8rem] leading-tight text-foreground">
            {activeItem.title}
          </h3>
          <p className="mt-2 max-w-[34ch] text-sm leading-6 text-muted">
            {activeItem.description}
          </p>
        </div>
        <button
          type="button"
          aria-label={isPaused ? "Reprendre le diaporama" : "Mettre le diaporama en pause"}
          aria-pressed={isPaused}
          disabled={prefersReducedMotion}
          onClick={() => setIsPaused((paused) => !paused)}
          className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(8,7,6,0.12)] text-foreground transition-colors hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPaused ? (
            <Play aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Pause aria-hidden="true" className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <span className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted">
          {String(activeIndex + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
        </span>
        <div className="flex gap-1.5" aria-hidden="true">
          {items.map((item, index) => (
            <span
              key={item.image}
              className={`h-1 rounded-full transition-all duration-300 ${
                index === activeIndex ? "w-6 bg-gold" : "w-1.5 bg-[rgba(8,7,6,0.2)]"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
