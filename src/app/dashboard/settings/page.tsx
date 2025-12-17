"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SettingsNav } from "./_components/settings-nav";
import AppearanceForm from "./_components/appearance-form";
import GeneralSettings from "./_components/general-settings";
import AccountSettings from "./_components/account-settings";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SmoothScrollContainer } from "@/components/smooth-scroll-container";

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentTab = searchParams.get("tab") || "general";
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    document.title = "Settings | bobnot3";
    
    // Store return path on first load if not already stored and we have a valid referrer
    if (typeof window !== 'undefined') {
      const storedPath = sessionStorage.getItem('settings-return-path');
      const referrer = document.referrer;
      
      // If no stored path and we have a same-origin referrer that's not settings, store it
      if (!storedPath && referrer && 
          new URL(referrer).origin === window.location.origin &&
          !referrer.includes('/dashboard/settings')) {
        try {
          const referrerPath = new URL(referrer).pathname;
          if (referrerPath.startsWith('/dashboard/')) {
            sessionStorage.setItem('settings-return-path', referrerPath);
          }
        } catch {
          // Invalid referrer URL, ignore
        }
      }
    }
  }, []);

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    // Use replace instead of push to avoid adding to history
    router.replace(`/dashboard/settings?${params.toString()}`);
  };

  const isValidDashboardRoute = (path: string): boolean => {
    // Check if path is a valid dashboard route (not settings)
    return path.startsWith('/dashboard/') && 
           path !== '/dashboard/settings' &&
           !path.startsWith('/dashboard/settings');
  };

  const getFallbackPath = (): string => {
    // Try to extract workspaceId from referrer
    // If we have a workspace context, return to workspace page
    // Otherwise, return to dashboard root
    if (typeof window !== 'undefined' && document.referrer) {
      try {
        const referrerPath = new URL(document.referrer).pathname;
        const workspaceMatch = referrerPath.match(/^\/dashboard\/([^/]+)/);
        if (workspaceMatch && workspaceMatch[1] !== 'settings') {
          return `/dashboard/${workspaceMatch[1]}`;
        }
      } catch {
        // Invalid referrer, continue to default
      }
    }
    
    return '/dashboard';
  };

  const handleBack = () => {
    // Get stored return path
    const returnPath = sessionStorage.getItem('settings-return-path');
    
    // Validate and use stored path
    if (returnPath && isValidDashboardRoute(returnPath)) {
      sessionStorage.removeItem('settings-return-path'); // Clean up
      router.push(returnPath);
      return;
    }
    
    // Fallback: navigate to workspace or dashboard
    const fallbackPath = getFallbackPath();
    router.push(fallbackPath);
  };

  if (!isMounted) {
    return null; 
  }

  const renderContent = () => {
    switch (currentTab) {
      case "general":
        return <GeneralSettings />;
      case "appearance":
        return <AppearanceForm />;
      case "account":
        return <AccountSettings />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Header - Fixed at top */}
      <header className="flex-none flex items-center gap-4 border-b px-6 py-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 shrink-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleBack}
          className="shrink-0 rounded-full hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Back</span>
        </Button>
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground hidden md:block">
            Manage your workspace and account preferences
          </p>
        </div>
      </header>

      {/* Main Layout - Separate scrolling */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar - Fixed width, scrolls independently */}
        <aside className="w-64 border-r bg-muted/30 overflow-y-auto hidden md:block shrink-0">
          <div className="p-4 space-y-4">
            <div className="px-3 py-2">
              <h2 className="mb-2 px-1 text-sm font-semibold tracking-tight text-muted-foreground/70 uppercase">
                Configuration
              </h2>
              <SettingsNav activeTab={currentTab} onTabChange={handleTabChange} />
            </div>
          </div>
        </aside>

        {/* Content Area - Scrolls independently */}
        <main className="flex-1 min-h-0 bg-background">
          <SmoothScrollContainer 
            className="h-full"
            duration={0.5}
            wheelMultiplier={1.3}
          >
            <div className="max-w-4xl mx-auto p-6 md:p-10 lg:p-12 space-y-8">
              {/* Mobile Nav (visible only on small screens) */}
              <div className="md:hidden mb-8">
                 <SettingsNav activeTab={currentTab} onTabChange={handleTabChange} />
                 <Separator className="my-6" />
              </div>

              <div className="min-h-[500px]">
                {renderContent()}
              </div>
            </div>
          </SmoothScrollContainer>
        </main>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
