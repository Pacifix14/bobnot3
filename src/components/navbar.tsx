"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth-modal";
import GlassSurface from "@/components/GlassSurface";

export function Navbar() {
  const [signinModalOpen, setSigninModalOpen] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 w-full px-4 md:px-6 pt-4 md:pt-6">
        <GlassSurface
          width="100%"
          height="auto"
          borderRadius={50}
          className="max-w-5xl mx-auto [&_.glass-surface__content]:p-0 [&_.glass-surface__content]:justify-start [&.glass-surface--fallback]:!backdrop-blur-md [&.glass-surface--fallback]:!bg-background/10 [&.glass-surface--fallback]:!-webkit-backdrop-blur-md"
          backgroundOpacity={0.1}
          saturation={1}
          brightness={50}
          opacity={0.93}
          blur={11}
          style={{ minHeight: 'auto' }}
        >
          <nav className="flex items-center justify-between px-2 md:px-3 py-0.5 md:py-1 w-full h-full">
            <div className="flex items-center gap-1.5 ml-4 md:ml-6">
          <Link href="/" className="flex items-center gap-1.5 hover:opacity-80 transition-all duration-300 group">
            <Image 
              src="/logo.png" 
              alt="bobnot3 logo" 
              width={20} 
              height={20} 
              className="w-5 h-5 md:w-6 md:h-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
              priority
            />
            <span className="font-serif text-base md:text-lg font-medium tracking-tight text-primary transition-all duration-300 group-hover:scale-105">
              bobnot3
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2 md:gap-2.5 mr-4 md:mr-6">
          <Button 
            variant="ghost" 
            className="text-muted-foreground hover:text-foreground hover:bg-background/20 h-7 md:h-8 px-3 md:px-4 text-xs md:text-sm rounded-full transition-all duration-300 hover:scale-105 active:scale-95"
            onClick={() => {
              setSigninModalOpen(true);
            }}
          >
            Log in
          </Button>
          <Button 
            className="font-medium h-7 md:h-8 px-4 md:px-5 text-xs md:text-sm rounded-full shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 hover:scale-105 active:scale-95"
            onClick={() => {
              setSignupModalOpen(true);
            }}
          >
            Sign up
          </Button>
        </div>
          </nav>
        </GlassSurface>
      </div>
      <AuthModal 
        open={signinModalOpen} 
        onOpenChange={setSigninModalOpen}
        defaultView="signin"
      />
      <AuthModal 
        open={signupModalOpen} 
        onOpenChange={setSignupModalOpen}
        defaultView="signup"
      />
    </>
  );
}
