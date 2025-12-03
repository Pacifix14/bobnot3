"use client";

import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useIsMobile } from "@/hooks/use-mobile";

interface SmoothScrollContainerProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  wheelMultiplier?: number;
  touchMultiplier?: number;
}

export function SmoothScrollContainer({
  children,
  className = "",
  duration = 1.5,
  wheelMultiplier = 0.8,
  touchMultiplier = 1.5,
}: SmoothScrollContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  // Wait for mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !contentRef.current || !mounted) return;

    const container = containerRef.current;
    const content = contentRef.current;

    // On mobile, use native scrolling (no Lenis) for better edge scrolling compatibility
    if (isMobile) {
      // Just ensure native scrolling works - no Lenis setup needed
      container.style.overflow = '';
      container.style.position = '';
      content.style.width = '100%';
      content.style.minHeight = '100%';
      return;
    }

    // Desktop: Use Lenis for smooth scrolling
    // Store original styles to restore on cleanup
    const originalOverflow = container.style.overflow;
    const originalPosition = container.style.position;
    
    // Lenis requires overflow: hidden on the wrapper
    container.style.overflow = 'hidden';
    container.style.position = 'relative';

    // Ensure content can grow beyond container
    content.style.width = '100%';
    // Ensure content has proper height calculation for Lenis
    content.style.minHeight = '100%';

    const lenis = new Lenis({
      duration,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      syncTouch: false, // Not needed on desktop
      wheelMultiplier,
      touchMultiplier,
      infinite: false,
      wrapper: container,
      content: content,
    });

    lenisRef.current = lenis;

    // Force Lenis to recalculate scroll dimensions multiple times
    // This ensures it works with dynamically loaded content
    const recalculateHeight = () => {
      requestAnimationFrame(() => {
        lenis.resize();
        // Recalculate multiple times to catch late-loading content
        setTimeout(() => {
          lenis.resize();
          setTimeout(() => lenis.resize(), 200);
        }, 100);
      });
    };

    recalculateHeight();
    
    // Also recalculate when images and other resources load
    const handleLoad = () => {
    requestAnimationFrame(() => {
      lenis.resize();
      });
    };
    
    window.addEventListener('load', handleLoad);
    // Listen for images loading
    const images = content.querySelectorAll('img');
    const imageLoadHandlers: Array<{ img: HTMLImageElement; handler: () => void }> = [];
    images.forEach(img => {
      if (!img.complete) {
        img.addEventListener('load', handleLoad);
        imageLoadHandlers.push({ img, handler: handleLoad });
      }
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Handle window resize and content changes
    const handleResize = () => {
      lenis.resize();
    };
    
    // Use ResizeObserver to detect content size changes
    const resizeObserver = new ResizeObserver(() => {
      // Use requestAnimationFrame to batch resize calls
      requestAnimationFrame(() => {
      lenis.resize();
      });
    });
    
    resizeObserver.observe(content);
    // Also observe the container for height changes
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);
    
    // Recalculate on content mutations (for dynamically loaded content)
    const mutationObserver = new MutationObserver(() => {
      requestAnimationFrame(() => {
        lenis.resize();
      });
    });
    
    mutationObserver.observe(content, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('load', handleLoad);
      // Clean up image load listeners
      imageLoadHandlers.forEach(({ img, handler }) => {
        img.removeEventListener('load', handler);
      });
      container.style.overflow = originalOverflow;
      container.style.position = originalPosition;
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [duration, wheelMultiplier, touchMultiplier, isMobile, mounted]);

  return (
    <div ref={containerRef} className={className}>
      <div ref={contentRef} style={{ width: '100%', minHeight: '100%' }}>
        {children}
      </div>
    </div>
  );
}

