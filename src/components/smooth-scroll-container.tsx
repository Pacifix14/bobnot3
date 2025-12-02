"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

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

  useEffect(() => {
    if (!containerRef.current || !contentRef.current) return;

    const container = containerRef.current;
    const content = contentRef.current;

    // Store original styles to restore on cleanup
    const originalOverflow = container.style.overflow;
    const originalPosition = container.style.position;
    
    // Lenis requires overflow: hidden on the wrapper
    container.style.overflow = 'hidden';
    container.style.position = 'relative';

    // Ensure content can grow beyond container
    content.style.width = '100%';

    const lenis = new Lenis({
      duration,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier,
      touchMultiplier,
      infinite: false,
      wrapper: container,
      content: content,
    });

    lenisRef.current = lenis;

    // Force Lenis to recalculate scroll dimensions
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      lenis.resize();
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
      lenis.resize();
    });
    
    resizeObserver.observe(content);
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      container.style.overflow = originalOverflow;
      container.style.position = originalPosition;
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [duration, wheelMultiplier, touchMultiplier]);

  return (
    <div ref={containerRef} className={className}>
      <div ref={contentRef} style={{ width: '100%' }}>
        {children}
      </div>
    </div>
  );
}

