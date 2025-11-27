"use client";

import { useParams, useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";

export default function PageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const pageId = params.pageId as string;

  const { data: page, isLoading: pageLoading, error: pageError } = api.page.getPage.useQuery(
    { pageId },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    }
  );

  const { data: workspace, isLoading: workspaceLoading, error: workspaceError } = api.workspace.getWorkspace.useQuery(
    { workspaceId },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    }
  );

  // Handle errors and redirects
  useEffect(() => {
    if (workspaceError) {
      if (workspaceError.data?.code === "NOT_FOUND" || workspaceError.data?.code === "FORBIDDEN") {
        router.push("/dashboard");
      }
    }
    if (pageError) {
      if (pageError.data?.code === "NOT_FOUND" || pageError.data?.code === "FORBIDDEN") {
        router.push(`/dashboard/${workspaceId}`);
      }
    }
  }, [workspaceError, pageError, router, workspaceId]);

  if (pageLoading || workspaceLoading) {
    return (
      <>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-4 w-px" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
          <div className="ml-auto">
            <Skeleton className="h-9 w-9" />
          </div>
        </header>
        <div className="h-[calc(100vh-4rem)] overflow-y-auto">
          {children}
        </div>
      </>
    );
  }

  if (!page || !workspace) {
    return null; // Will redirect via useEffect
  }

  const breadcrumbItems: { label: string; href?: string }[] = [
    { label: workspace.name, href: `/dashboard/${workspaceId}` },
  ];

  if (page.folder) {
    breadcrumbItems.push({
      label: page.folder.name,
      href: `/dashboard/${workspaceId}/folder/${page.folder.id}`,
    });
  }

  breadcrumbItems.push({
    label: page.title || "Untitled",
  });

  return (
    <>
      <DashboardBreadcrumb items={breadcrumbItems} />
      <div className="h-[calc(100vh-4rem)] overflow-y-auto">
        {children}
      </div>
    </>
  );
}

