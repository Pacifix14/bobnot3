"use client";

import { useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useEffect, lazy, Suspense } from "react";

// Lazy load the heavy Editor component to improve initial page load
const Editor = lazy(() => import("@/components/editor").then(module => ({ default: module.Editor })));

export default function PageEditor() {
  const params = useParams();
  const router = useRouter();
  const pageId = params.pageId as string;

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
      <div className="py-12 px-8 min-h-full overflow-hidden">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="pl-[54px] pr-6">
            <Skeleton className="h-12 w-1/2" />
          </div>
          <div className="pl-[54px] pr-6 space-y-4">
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
    <div className="py-12 px-8 min-h-full overflow-hidden">
      <Suspense
        fallback={
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="pl-[54px] pr-6">
              <Skeleton className="h-12 w-1/2" />
            </div>
            <div className="pl-[54px] pr-6 space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        }
      >
        <Editor pageId={page.id} title={page.title} coverImage={page.coverImage} />
      </Suspense>
    </div>
  );
}
