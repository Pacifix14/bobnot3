"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb";

interface WorkspacePageClientProps {
  breadcrumbItems: { label: string; href?: string; active?: boolean }[];
}

export function WorkspacePageClient({ breadcrumbItems }: WorkspacePageClientProps) {
  // Start with false to match server render, then check after hydration
  const [shouldAnimate, setShouldAnimate] = useState(false);

  // Check sessionStorage after mount to avoid hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const fromSettings = sessionStorage.getItem('navigating-from-settings') === 'true';
      const justLoggedIn = sessionStorage.getItem('just-logged-in') === 'true';
      
      if (fromSettings || justLoggedIn) {
        setShouldAnimate(true);
        
        // Clean up after animation
        const timers: NodeJS.Timeout[] = [];
        if (fromSettings) {
          const timer = setTimeout(() => {
            sessionStorage.removeItem('navigating-from-settings');
          }, 500);
          timers.push(timer);
        }
        if (justLoggedIn) {
          const timer = setTimeout(() => {
            sessionStorage.removeItem('just-logged-in');
          }, 500);
          timers.push(timer);
        }
        
        return () => {
          timers.forEach(timer => clearTimeout(timer));
        };
      }
    }
  }, []);

  return (
    <motion.div
      key={shouldAnimate ? 'animate' : 'no-animate'}
      initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col h-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
      style={{
        paddingLeft: 'var(--sidebar-push-offset, 0px)',
      }}
    >
      <DashboardBreadcrumb items={breadcrumbItems} />
      <motion.div 
        initial={shouldAnimate ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
        className="flex items-center justify-center h-full text-muted-foreground px-4"
      >
        <div className="text-center space-y-2 max-w-md">
          <h2 className="text-lg md:text-xl font-serif text-foreground">Welcome to your workspace</h2>
          <p className="text-sm md:text-base">Select a page from the sidebar to start writing.</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

