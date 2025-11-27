"use client";

import { useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { Editor } from "@/components/editor";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PageEditor() {
  const params = useParams();
  const router = useRouter();
  const pageId = params.pageId as string;

  const { data: page, isLoading, error } = api.page.getPage.useQuery(
    { pageId },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
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

  if (isLoading) {
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
      <Editor pageId={page.id} title={page.title} />
    </div>
  );
}
