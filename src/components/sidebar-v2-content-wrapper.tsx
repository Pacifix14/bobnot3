"use client";

import { useSidebar } from "@/components/ui/sidebar";

export function SidebarV2ContentWrapper({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar();

  return (
    <div className="flex-1 h-full w-full relative">
      {/* This wrapper creates a CSS variable that child components can use */}
      <div
        className="h-full w-full"
        style={{
          // Set a CSS variable that children can use for conditional spacing
          ['--sidebar-push-offset' as string]: open ? '320px' : '0px',
        }}
      >
        {children}
      </div>
    </div>
  );
}
