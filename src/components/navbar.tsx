"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth-modal";

export function Navbar() {
  const [signinModalOpen, setSigninModalOpen] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);

  return (
    <>
      <nav className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-all duration-300 group">
            <Image 
              src="/logo.png" 
              alt="bobnot3 logo" 
              width={32} 
              height={32} 
              className="w-8 h-8 md:w-9 md:h-9 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
              priority
            />
            <span className="font-serif text-xl md:text-2xl font-medium tracking-tight text-primary transition-all duration-300 group-hover:scale-105">
              bobnot3
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <Button 
            variant="ghost" 
            className="text-muted-foreground hover:text-primary h-8 md:h-9 px-3 md:px-4 text-sm md:text-sm transition-all duration-300 hover:scale-105 active:scale-95"
            onClick={() => {
              setSigninModalOpen(true);
            }}
          >
            Log in
          </Button>
          <Button 
            className="font-medium h-8 md:h-9 px-3 md:px-4 text-sm md:text-sm transition-all duration-300 hover:scale-105 active:scale-95"
            onClick={() => {
              setSignupModalOpen(true);
            }}
          >
            Sign up
          </Button>
        </div>
      </nav>
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
