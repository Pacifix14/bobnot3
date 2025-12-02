"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AuthButtons } from "@/components/auth-buttons";

export function HeroSection() {
  const [mounted, setMounted] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);
  const [headlinesVisible, setHeadlinesVisible] = useState(false);
  const [buttonsVisible, setButtonsVisible] = useState(false);

  useEffect(() => {
    // Set mounted to true after component mounts
    setMounted(true);
    
    // Stagger the animations
    const logoTimer = setTimeout(() => setLogoVisible(true), 100);
    const headlinesTimer = setTimeout(() => setHeadlinesVisible(true), 400);
    const buttonsTimer = setTimeout(() => setButtonsVisible(true), 600);
    
    return () => {
      clearTimeout(logoTimer);
      clearTimeout(headlinesTimer);
      clearTimeout(buttonsTimer);
    };
  }, []);

  return (
    <section className="flex-1 flex flex-col items-center justify-center px-4 md:px-6 py-20 md:py-32 lg:py-40 xl:py-48 text-center">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        {/* Logo and Brand Name */}
        <div 
          className="flex items-center justify-center gap-3 mb-4 md:mb-6"
          style={{
            opacity: mounted && logoVisible ? 1 : 0,
            transform: mounted && logoVisible ? 'translateY(0)' : 'translateY(1rem)',
            transition: 'opacity 1s ease-out, transform 1s ease-out',
          }}
        >
          <Image 
            src="/logo.png" 
            alt="bobnot3 logo" 
            width={40} 
            height={40} 
            className="w-10 h-10 md:w-12 md:h-12"
            priority
            loading="eager"
          />
          <span className="font-serif text-xl md:text-2xl font-medium tracking-tight text-primary">
            bobnot3
          </span>
        </div>
        
        <div 
          className="space-y-2 md:space-y-2.5"
          style={{
            opacity: mounted && headlinesVisible ? 1 : 0,
            transform: mounted && headlinesVisible ? 'translateY(0)' : 'translateY(1rem)',
            transition: 'opacity 1s ease-out, transform 1s ease-out',
          }}
        >
          <h1 className="font-serif text-[2.5rem] md:text-[3rem] lg:text-[3.75rem] xl:text-[4.5rem] font-medium tracking-tight text-primary leading-[1.1]">
            Your thoughts
          </h1>
          <h2 className="font-serif text-[1.5rem] md:text-[1.875rem] lg:text-[2.25rem] xl:text-[2.75rem] font-normal tracking-tight text-foreground/80 leading-[1.2]">
            <span className="bg-gradient-to-r from-foreground/80 via-foreground/75 to-foreground/80 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              organized
            </span>{" "}
            and{" "}
            <span className="bg-gradient-to-r from-foreground/80 via-foreground/75 to-foreground/80 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient animation-delay-1000">
              connected
            </span>
          </h2>
        </div>
        
        <div 
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          style={{
            opacity: mounted && buttonsVisible ? 1 : 0,
            transform: mounted && buttonsVisible ? 'translateY(0)' : 'translateY(1.5rem)',
            transition: 'opacity 1s ease-out, transform 1s ease-out',
          }}
        >
          <AuthButtons />
        </div>
      </div>
    </section>
  );
}

