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

    // Smoother easing function for better feel while maintaining responsiveness
    // This cubic ease-out provides smooth deceleration
    const smoothEasing = (t: number) => {
      return 1 - Math.pow(1 - t, 3);
    };

    const lenis = new Lenis({
      duration,
      easing: smoothEasing,
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

    // Throttle function to limit resize calls
    let pendingResize = false;
    const throttledResize = () => {
      if (!pendingResize) {
        pendingResize = true;
        requestAnimationFrame(() => {
          lenis.resize();
          pendingResize = false;
        });
      }
    };

    // Debounce function for mutation observer (less frequent updates)
    let mutationTimeout: NodeJS.Timeout | null = null;
    const debouncedResize = () => {
      if (mutationTimeout) {
        clearTimeout(mutationTimeout);
      }
      mutationTimeout = setTimeout(() => {
        throttledResize();
      }, 150);
    };

    // Force Lenis to recalculate scroll dimensions
    // Single resize call is sufficient - Lenis handles dynamic content well
    const recalculateHeight = () => {
      requestAnimationFrame(() => {
        lenis.resize();
      });
    };

    recalculateHeight();
    
    // Also recalculate when images and other resources load
    const handleLoad = () => {
      throttledResize();
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

    // Handle window resize with throttling
    const handleResize = () => {
      throttledResize();
    };
    
    // Use ResizeObserver to detect content size changes with throttling
    const resizeObserver = new ResizeObserver(() => {
      throttledResize();
    });
    
    resizeObserver.observe(content);
    // Also observe the container for height changes
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);
    
    // Recalculate on content mutations with debouncing
    const mutationObserver = new MutationObserver(() => {
      debouncedResize();
    });
    
    mutationObserver.observe(content, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    return () => {
      // Clear any pending timeouts
      if (mutationTimeout) {
        clearTimeout(mutationTimeout);
      }
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

