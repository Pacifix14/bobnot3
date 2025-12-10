import { Navbar } from "@/components/navbar";
import { HeroSection } from "@/components/hero-section";
import { FeaturesSection } from "@/components/features-section";
import { HowItWorksSection } from "@/components/how-it-works-section";
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { type Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Home",
};

export default async function Home() {
  // Check if user is already authenticated
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/10 selection:text-primary relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)] animate-pulse" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      <Navbar />
      
      <main className="flex-1 flex flex-col relative z-10">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
      </main>
      
      <footer className="py-8 md:py-10 px-4 text-center border-t border-border/40 bg-background/50 backdrop-blur-sm">
        <p className="text-sm md:text-base text-muted-foreground transition-all duration-300 hover:text-foreground/80">
          © 2025 bobnot3. All rights reserved.
        </p>
      </footer>
    </div>
  );
}