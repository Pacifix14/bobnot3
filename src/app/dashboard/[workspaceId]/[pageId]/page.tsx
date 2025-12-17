"use client";

import { useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useEffect, lazy, Suspense, useState } from "react";
import { motion } from "framer-motion";

// Lazy load the heavy Editor component to improve initial page load
const Editor = lazy(() => import("@/components/editor").then(module => ({ default: module.Editor })));

export default function PageEditor() {
  const params = useParams();
  const router = useRouter();
  const pageId = params.pageId as string;
  
  // Start with false to match server render, then check after hydration
  const [shouldAnimate, setShouldAnimate] = useState(false);

  // Check sessionStorage after mount to avoid hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const fromSettings = sessionStorage.getItem('navigating-from-settings') === 'true';
      const justLoggedIn = sessionStorage.getItem('just-logged-in') === 'true';
      
      if (fromSettings || justLoggedIn) {
        setShouldAnimate(true);
      }
    }
  }, []);

  // Use the cached page data from layout - React Query will share the cache
  // This avoids duplicate network requests
  // The layout already fetches this, so we just read from cache
  const { data: page, isLoading, error } = api.page.getPage.useQuery(
    { pageId },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
      // Don't refetch if we have cached data from layout
      refetchOnMount: false,
    }
  );

  // Clean up sessionStorage after animation
  useEffect(() => {
    if (shouldAnimate) {
      const timers: NodeJS.Timeout[] = [];
      
      if (typeof window !== 'undefined') {
        const fromSettings = sessionStorage.getItem('navigating-from-settings') === 'true';
        const justLoggedIn = sessionStorage.getItem('just-logged-in') === 'true';
        
        if (fromSettings) {
          const timer = setTimeout(() => {
            sessionStorage.removeItem('navigating-from-settings');
          }, 500); // Match animation duration
          timers.push(timer);
        }
        
        if (justLoggedIn) {
          const timer = setTimeout(() => {
            sessionStorage.removeItem('just-logged-in');
          }, 500); // Match animation duration
          timers.push(timer);
        }
      }
      
      return () => {
        timers.forEach(timer => clearTimeout(timer));
      };
    }
  }, [shouldAnimate]);

  // Handle errors and redirects
  useEffect(() => {
    if (error) {
      if (error.data?.code === "NOT_FOUND") {
        // Page not found, redirect to dashboard
        router.push("/dashboard");
      } else if (error.data?.code === "FORBIDDEN") {
        // Access denied, redirect to dashboard
        router.push("/dashboard");
      }
    }
  }, [error, router]);

  // Only show loading if we don't have cached data
  // This improves perceived performance by using cached data immediately
  if (isLoading && !page) {
    return (
      <div
        className="py-6 md:py-12 px-4 md:px-8 min-h-full overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{
          paddingLeft: 'calc(1rem + var(--sidebar-push-offset, 0px))',
        }}
      >
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
          <div className="pl-0 md:pl-[54px] pr-4 md:pr-6">
            <Skeleton className="h-10 md:h-12 w-1/2" />
          </div>
          <div className="pl-0 md:pl-[54px] pr-4 md:pr-6 space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return null; // Will redirect via useEffect
  }

  return (
    <motion.div
      key={`${pageId}-${shouldAnimate ? 'animate' : 'no-animate'}`}
      initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="h-full"
    >
      <Suspense fallback={null}>
        <Editor pageId={page.id} title={page.title} coverImage={page.coverImage} bannerImage={page.bannerImage} />
      </Suspense>
    </motion.div>
  );
}
