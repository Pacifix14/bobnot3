"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { AuthModal } from "@/components/auth-modal";

export function AuthButtons() {
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [signinModalOpen, setSigninModalOpen] = useState(false);

  return (
    <>
      <Button 
        size="lg" 
        className="h-12 md:h-14 px-8 md:px-10 text-base md:text-lg rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 hover:scale-110 active:scale-95 group"
        onClick={() => {
          setSignupModalOpen(true);
        }}
      >
        Get Started <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
      </Button>
      <Button 
        variant="outline" 
        size="lg" 
        className="h-12 md:h-14 px-8 md:px-10 text-base md:text-lg rounded-full transition-all duration-300 hover:scale-110 hover:bg-background active:scale-95"
        onClick={() => {
          setSigninModalOpen(true);
        }}
      >
        Sign In
      </Button>
      <AuthModal 
        open={signupModalOpen} 
        onOpenChange={setSignupModalOpen}
        defaultView="signup"
      />
      <AuthModal 
        open={signinModalOpen} 
        onOpenChange={setSigninModalOpen}
        defaultView="signin"
      />
    </>
  );
}

