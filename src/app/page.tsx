import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, Layers, Sparkles } from "lucide-react";
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Check if user is already authenticated
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/10 selection:text-primary">
      <Navbar />
      
      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="flex-1 flex flex-col items-center justify-center px-4 md:px-6 py-16 md:py-24 lg:py-32 text-center space-y-6 md:space-y-8 max-w-4xl mx-auto">
          <div className="space-y-3 md:space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <h1 className="font-serif text-3xl md:text-5xl lg:text-7xl font-medium tracking-tight text-primary leading-[1.1]">
              Think clearer <br className="hidden md:block" /> with <span className="italic text-accent-foreground">intelligent</span> context.
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              A workspace that understands your thoughts. Organize, write, and collaborate with an AI that knows your entire knowledge base.
            </p>
          </div>
          
          <div className="flex items-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            <Link href="/dashboard">
              <Button size="lg" className="h-10 md:h-12 px-6 md:px-8 text-base md:text-lg rounded-full shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all">
                Start Writing <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Grid */}
        <section className="px-4 md:px-6 py-16 md:py-24 bg-secondary/30 border-t border-border/40">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 md:gap-12">
            <FeatureCard 
              icon={<Layers className="h-6 w-6" />}
              title="Nested Workspaces"
              description="Organize your thoughts in infinite hierarchies. Folders within folders, pages within pages."
            />
            <FeatureCard 
              icon={<Sparkles className="h-6 w-6" />}
              title="AI Context"
              description="Our AI understands your entire workspace, not just the current page. Ask questions across your knowledge base."
            />
            <FeatureCard 
              icon={<Brain className="h-6 w-6" />}
              title="Thought Partners"
              description="Collaborate with AI as a partner, not just a tool. It helps you refine, expand, and connect ideas."
            />
          </div>
        </section>
      </main>
      
      <footer className="py-6 md:py-8 px-4 text-center text-xs md:text-sm text-muted-foreground border-t border-border/40">
        <p>© 2024 Antigravity Notes. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="space-y-3 md:space-y-4 p-4 md:p-6 rounded-2xl bg-background/50 border border-border/50 hover:border-primary/20 transition-colors">
      <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
        {icon}
      </div>
      <h3 className="font-serif text-lg md:text-xl font-medium text-primary">{title}</h3>
      <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
