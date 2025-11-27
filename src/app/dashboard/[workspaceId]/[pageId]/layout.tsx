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

  // First, get user's workspaces to determine if they own the current workspace
  const { data: userWorkspaces } = api.workspace.getUserWorkspaces.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: page, isLoading: pageLoading, error: pageError } = api.page.getPage.useQuery(
    { pageId },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    }
  );

  // Check if user owns this workspace
  const isWorkspaceOwner = userWorkspaces?.some(w => w.id === workspaceId) ?? false;

  // Only try to get full workspace data if user owns the workspace
  const { data: workspace, isLoading: workspaceLoading, error: workspaceError } = api.workspace.getWorkspace.useQuery(
    { workspaceId },
    {
      enabled: isWorkspaceOwner, // Only query if user owns the workspace
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    }
  );

  // For non-owners, get basic workspace info (for shared pages)
  const { data: workspaceInfo } = api.workspace.getWorkspaceInfo.useQuery(
    { workspaceId },
    {
      enabled: !isWorkspaceOwner && !!userWorkspaces, // Only query if not owner and we know user's workspaces
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  // Handle errors and redirects
  useEffect(() => {
    if (pageError) {
      if (pageError.data?.code === "NOT_FOUND") {
        // Page not found, redirect to workspace
        router.push(`/dashboard/${workspaceId}`);
      } else if (pageError.data?.code === "FORBIDDEN") {
        // Access denied to page, redirect to dashboard
        router.push("/dashboard");
      }
    }
    // Handle workspace errors only for owners
    if (workspaceError && isWorkspaceOwner) {
      if (workspaceError.data?.code === "NOT_FOUND" || workspaceError.data?.code === "FORBIDDEN") {
        router.push("/dashboard");
      }
    }
  }, [workspaceError, pageError, router, workspaceId, page]);

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

  if (!page) {
    return null; // Will redirect via useEffect
  }

  // Build breadcrumbs - use workspace data if available, otherwise use fallback info
  const breadcrumbItems: { label: string; href?: string }[] = [];
  
  if (workspace) {
    // We have full workspace access (owner scenario)
    breadcrumbItems.push({ label: workspace.name, href: `/dashboard/${workspaceId}` });
  } else if (workspaceInfo) {
    // Shared page scenario - use basic workspace info, but no link
    breadcrumbItems.push({ label: workspaceInfo.name });
  } else if (page.workspace) {
    // Final fallback - use workspace name from page data
    breadcrumbItems.push({ label: page.workspace.name });
  }

  if (page.folder) {
    breadcrumbItems.push({
      label: page.folder.name,
      href: workspace ? `/dashboard/${workspaceId}/folder/${page.folder.id}` : undefined,
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

