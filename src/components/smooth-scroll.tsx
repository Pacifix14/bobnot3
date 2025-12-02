"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { usePathname } from "next/navigation";
import "lenis/dist/lenis.css";

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Enable smooth scroll on landing page and dashboard pages
    const isLandingPage = pathname === "/";
    const isDashboardPage = pathname?.startsWith("/dashboard");
    
    if (!isLandingPage && !isDashboardPage) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.5, // Higher duration = smoother, slower scroll (increased for premium feel)
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Smooth easing function
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 0.8, // Slightly slower for smoother feel
      touchMultiplier: 1.5,
      infinite: false,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, [pathname]);

  return <>{children}</>;
}

