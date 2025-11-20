import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <Link href="/" className="font-serif text-2xl font-medium tracking-tight text-primary">
          Antigravity
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <Link href="/api/auth/signin?callbackUrl=/dashboard">
          <Button variant="ghost" className="text-muted-foreground hover:text-primary">
            Log in
          </Button>
        </Link>
        <Link href="/api/auth/signin?callbackUrl=/dashboard">
          <Button className="font-medium">Sign up</Button>
        </Link>
      </div>
    </nav>
  );
}
