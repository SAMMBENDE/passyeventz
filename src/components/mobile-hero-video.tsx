"use client";

import { useEffect, useState } from "react";

export function MobileHeroVideo() {
  const [shouldPlayVideo, setShouldPlayVideo] = useState(false);

  useEffect(() => {
    const mobileViewport = window.matchMedia("(max-width: 767px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function updateVideoPreference() {
      setShouldPlayVideo(mobileViewport.matches && !reducedMotion.matches);
    }

    updateVideoPreference();
    mobileViewport.addEventListener("change", updateVideoPreference);
    reducedMotion.addEventListener("change", updateVideoPreference);

    return () => {
      mobileViewport.removeEventListener("change", updateVideoPreference);
      reducedMotion.removeEventListener("change", updateVideoPreference);
    };
  }, []);

  return (
    <>
      {shouldPlayVideo ? (
        <video
          aria-hidden="true"
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster="/images/PE.5.jpeg"
          className="mobile-hero-video absolute inset-0 h-full w-full object-cover"
        >
          <source src="/images/PE.mp4" type="video/mp4" />
        </video>
      ) : null}
    </>
  );
}
