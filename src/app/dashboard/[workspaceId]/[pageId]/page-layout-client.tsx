"use client";

import { useRouter } from "next/navigation";
import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb";
import { api } from "@/trpc/react";
import { useEffect } from "react";
import type { RouterOutputs } from "@/trpc/react";
import { SmoothScrollContainer } from "@/components/smooth-scroll-container";

type PrefetchedData = {
  userWorkspaces: RouterOutputs["workspace"]["getUserWorkspaces"];
  page: RouterOutputs["page"]["getPage"] | null;
  workspace: RouterOutputs["workspace"]["getWorkspace"] | null;
  workspaceInfo: RouterOutputs["workspace"]["getWorkspaceInfo"] | null;
};

export function PageLayoutClient({
  children,
  workspaceId,
  pageId,
  prefetchedData,
}: {
  children: React.ReactNode;
  workspaceId: string;
  pageId: string;
  prefetchedData: PrefetchedData;
}) {
  const router = useRouter();

  // Set initial data for queries to use prefetched data
  const { data: userWorkspaces } = api.workspace.getUserWorkspaces.useQuery(
    undefined,
    {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      initialData: prefetchedData.userWorkspaces,
    }
  );

  const { data: page, error: pageError } = api.page.getPage.useQuery(
    { pageId },
    {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      initialData: prefetchedData.page ?? undefined,
      // If prefetched data exists, don't refetch on mount
      refetchOnMount: prefetchedData.page ? false : "always",
    }
  );

  const isWorkspaceOwner = userWorkspaces?.some(w => w.id === workspaceId) ?? false;

  const { data: workspace, error: workspaceError } = api.workspace.getWorkspace.useQuery(
    { workspaceId },
    {
      enabled: isWorkspaceOwner,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      initialData: prefetchedData.workspace ?? undefined,
      refetchOnMount: prefetchedData.workspace ? false : "always",
    }
  );

  const { data: workspaceInfo } = api.workspace.getWorkspaceInfo.useQuery(
    { workspaceId },
    {
      enabled: !isWorkspaceOwner && !!userWorkspaces,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      initialData: prefetchedData.workspaceInfo ?? undefined,
      refetchOnMount: prefetchedData.workspaceInfo ? false : "always",
    }
  );

  // Handle errors and redirects
  useEffect(() => {
    if (pageError) {
      if (pageError.data?.code === "NOT_FOUND") {
        router.push(`/dashboard/${workspaceId}`);
      } else if (pageError.data?.code === "FORBIDDEN") {
        router.push("/dashboard");
      }
    }
    if (workspaceError && isWorkspaceOwner) {
      if (workspaceError.data?.code === "NOT_FOUND" || workspaceError.data?.code === "FORBIDDEN") {
        router.push("/dashboard");
      }
    }
  }, [workspaceError, pageError, router, workspaceId, isWorkspaceOwner]);

  if (!page) {
    return null; // Will redirect via useEffect
  }

  // Build breadcrumbs
  const breadcrumbItems: { label: string; href?: string }[] = [];
  
  if (workspace) {
    breadcrumbItems.push({ label: workspace.name, href: `/dashboard/${workspaceId}` });
  } else if (workspaceInfo) {
    breadcrumbItems.push({ label: workspaceInfo.name });
  } else if (page.workspace) {
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
      <SmoothScrollContainer 
        className="h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] overflow-y-auto"
        duration={0.7}
        wheelMultiplier={1.3}
      >
        {children}
      </SmoothScrollContainer>
    </>
  );
}
