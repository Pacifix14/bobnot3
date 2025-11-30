import { createCaller } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PageLayoutClient } from "./page-layout-client";
import { TRPCError } from "@trpc/server";

export default async function PageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string; pageId: string }>;
}) {
  const { workspaceId, pageId } = await params;
  const headersList = await headers();
  
  // Create server-side tRPC caller for prefetching
  const ctx = await createTRPCContext({ headers: headersList });
  const caller = createCaller(ctx);

  // Prefetch all critical data in parallel on the server
  // This data will be available immediately on the client, eliminating loading states
  const [userWorkspaces, pageResult] = await Promise.allSettled([
    caller.workspace.getUserWorkspaces(),
    caller.page.getPage({ pageId }),
  ]);

  const userWorkspacesData = userWorkspaces.status === "fulfilled" ? userWorkspaces.value : [];
  const page = pageResult.status === "fulfilled" ? pageResult.value : null;

  // Handle page errors on server
  if (pageResult.status === "rejected") {
    const error = pageResult.reason as unknown;
    // Type guard for TRPCError
    if (error instanceof TRPCError || (error && typeof error === "object" && "data" in error)) {
      const trpcError = error as { data?: { code?: string } };
      if (trpcError.data?.code === "NOT_FOUND") {
        redirect(`/dashboard/${workspaceId}`);
      } else if (trpcError.data?.code === "FORBIDDEN") {
        redirect("/dashboard");
      }
    }
  }

  if (!page) {
    redirect(`/dashboard/${workspaceId}`);
  }

  const isWorkspaceOwner = userWorkspacesData.some(w => w.id === workspaceId);

  // Prefetch workspace data based on ownership
  const [workspaceResult, workspaceInfoResult] = await Promise.allSettled([
    isWorkspaceOwner ? caller.workspace.getWorkspace({ workspaceId }) : Promise.resolve(null),
    !isWorkspaceOwner ? caller.workspace.getWorkspaceInfo({ workspaceId }) : Promise.resolve(null),
  ]);

  const workspace = workspaceResult.status === "fulfilled" ? workspaceResult.value : null;
  const workspaceInfo = workspaceInfoResult.status === "fulfilled" ? workspaceInfoResult.value : null;

  // Pass prefetched data to client component
  return (
    <PageLayoutClient
      workspaceId={workspaceId}
      pageId={pageId}
      prefetchedData={{
        userWorkspaces: userWorkspacesData,
        page,
        workspace,
        workspaceInfo,
      }}
    >
      {children}
    </PageLayoutClient>
  );
}

