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
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const serverTab = searchParams.get("tab") || "general";
  
  // Optimistic state management for tab switching
  const [optimisticTab, setOptimisticTab] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  
  const currentTab = optimisticTab || serverTab;
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
      
      // Debug: Verify font is applied correctly
      if (process.env.NODE_ENV === 'development') {
        setTimeout(() => {
          const sidebar = document.querySelector('aside[data-sidebar]');
          if (sidebar) {
            const computed = window.getComputedStyle(sidebar);
            console.log('[Settings Sidebar Debug]', {
              fontFamily: computed.fontFamily,
              fontWeight: computed.fontWeight,
              fontSize: computed.fontSize,
              referrer: document.referrer,
              hasDataSidebar: sidebar.hasAttribute('data-sidebar'),
            });
          }
        }, 100);
      }
    }
  }, []);

  const handleTabChange = (tab: string) => {
    // Prevent clicks if already switching or if already selected
    if (isSwitching) return;
    if (currentTab === tab) return;
    
    // Optimistic update
    setOptimisticTab(tab);
    setIsSwitching(true);
    
    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/dashboard/settings?${params.toString()}`);
    
    // Clear loading state after a brief delay (simulates smooth transition)
    setTimeout(() => {
      setIsSwitching(false);
      setOptimisticTab(null);
    }, 300);
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

  const [isNavigatingBack, setIsNavigatingBack] = useState(false);

  const handleBack = () => {
    // Prevent multiple clicks
    if (isNavigatingBack) return;
    
    setIsNavigatingBack(true);
    
    // Mark that we're navigating back from settings (for page animations)
    sessionStorage.setItem('navigating-from-settings', 'true');
    
    // Get stored return path
    const returnPath = sessionStorage.getItem('settings-return-path');
    
    // Validate and use stored path
    if (returnPath && isValidDashboardRoute(returnPath)) {
      sessionStorage.removeItem('settings-return-path'); // Clean up
      
      // Add a small delay for smooth transition
      setTimeout(() => {
        router.push(returnPath);
      }, 150);
      return;
    }
    
    // Fallback: navigate to workspace or dashboard
    const fallbackPath = getFallbackPath();
    setTimeout(() => {
      router.push(fallbackPath);
    }, 150);
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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col h-screen overflow-hidden bg-background"
    >
      {/* Header - Fixed at top */}
      <motion.header 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex-none flex items-center gap-4 border-b px-6 py-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 shrink-0 rounded-b-xl"
      >
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        >
          <motion.div
            initial={false}
            animate={isNavigatingBack ? { scale: 0.95 } : { scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
              disabled={isNavigatingBack}
              className={cn(
                "shrink-0 rounded-full hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-sm group relative",
                isNavigatingBack && "cursor-wait opacity-70"
              )}
            >
              {isNavigatingBack ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ArrowLeft className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
              )}
              <span className="sr-only">Back</span>
            </Button>
          </motion.div>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
          className="flex flex-col"
        >
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground hidden md:block">
            Manage your workspace and account preferences
          </p>
        </motion.div>
      </motion.header>

      {/* Main Layout - Separate scrolling */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar - Fixed width, scrolls independently */}
        <motion.aside 
          data-sidebar="menu"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
          className="w-64 border-r bg-muted/30 overflow-y-auto hidden md:block shrink-0"
        >
          <div className="p-4 space-y-4">
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="px-3 py-2"
            >
              <h2 className="mb-2 px-1 text-sm font-semibold tracking-tight text-muted-foreground/70 uppercase">
                Configuration
              </h2>
              <SettingsNav activeTab={currentTab} onTabChange={handleTabChange} isSwitching={isSwitching} />
            </motion.div>
          </div>
        </motion.aside>

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
                 <SettingsNav activeTab={currentTab} onTabChange={handleTabChange} isSwitching={isSwitching} />
                 <Separator className="my-6" />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="min-h-[500px]"
                >
                  {renderContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </SmoothScrollContainer>
        </main>
      </div>
    </motion.div>
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
