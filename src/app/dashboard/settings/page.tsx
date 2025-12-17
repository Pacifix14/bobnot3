"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const currentTab = searchParams.get("tab") || "general";
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    document.title = "Settings | bobnot3";
  }, []);

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`/dashboard/settings?${params.toString()}`);
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
          onClick={() => router.back()}
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
