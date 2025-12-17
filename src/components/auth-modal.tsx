"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Mail, Chrome } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultView?: "signin" | "signup";
}

export function AuthModal({ open, onOpenChange, defaultView = "signin" }: AuthModalProps) {
  const [view, setView] = useState<"signin" | "signup" | "email">(defaultView);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  // Sync view with defaultView prop
  useEffect(() => {
    if (open) {
      setView(defaultView);
    }
  }, [defaultView, open]);

  // Reset state when modal closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setView(defaultView);
      setEmail("");
      setError(null);
      setEmailSent(false);
      setIsLoading(false);
    }
    onOpenChange(newOpen);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Set flag before redirect for login animation
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('just-logged-in', 'true');
      }
      await signIn("google", {
        callbackUrl: "/dashboard",
        redirect: true,
      });
        } catch {
      setError("Failed to sign in with Google. Please try again.");
      setIsLoading(false);
      // Remove flag on error
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('just-logged-in');
      }
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await signIn("email", {
        email,
        callbackUrl: "/dashboard",
        redirect: false,
      });
      
      if (result?.error) {
        setError("Failed to send sign in link. Please try again.");
        setIsLoading(false);
      } else {
        setEmailSent(true);
        setIsLoading(false);
      }
        } catch {
      setError("Failed to send sign in link. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-center mb-2">
            <Image 
              src="/logo.png" 
              alt="bobnot3 logo" 
              width={48} 
              height={48} 
              className="w-12 h-12"
            />
          </div>
          <DialogTitle className="text-2xl font-serif text-center">
            {view === "email" 
              ? "Sign in with email" 
              : view === "signup" 
              ? "Create your account" 
              : "Welcome back"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {view === "email"
              ? "Enter your email address and we'll send you a sign in link"
              : view === "signup"
              ? "Get started with bobnot3 today"
              : "Sign in to continue to your workspace"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {view === "email" ? (
            emailSent ? (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Check your email</h3>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ve sent a sign in link to <strong>{email}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground pt-2">
                    Click the link in the email to sign in. The link will expire in 24 hours.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => {
                    setEmailSent(false);
                    setEmail("");
                    setView("signin");
                  }}
                >
                  Back to sign in
                </Button>
              </div>
            ) : (
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    disabled={isLoading}
                    className="h-11"
                    required
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive text-center">{error}</p>
                )}
                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send sign in link
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setView("signin");
                    setEmail("");
                    setError(null);
                    setEmailSent(false);
                  }}
                  disabled={isLoading}
                >
                  Back
                </Button>
              </form>
            )
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 relative"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Chrome className="mr-2 h-4 w-4" />
                    Continue with Google
                  </>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-11"
                onClick={() => {
                  setView("email");
                  setError(null);
                }}
                disabled={isLoading}
              >
                <Mail className="mr-2 h-4 w-4" />
                Continue with email
              </Button>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <div className="text-center text-sm text-muted-foreground pt-2">
                {view === "signup" ? (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setView("signin")}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setView("signup")}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign up
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

