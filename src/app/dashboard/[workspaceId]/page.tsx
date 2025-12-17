import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb";
import { db } from "@/server/db";
import { type Metadata } from "next";
import { WorkspacePageClient } from "./workspace-page-client";

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}): Promise<Metadata> {
  const { workspaceId } = await params;
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
  });

  return {
    title: workspace?.name ?? "Workspace",
  };
}

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
  });

  const breadcrumbItems = [
    { label: workspace?.name ?? "Workspace", href: `/dashboard/${workspaceId}`, active: true },
  ];

  return (
    <WorkspacePageClient breadcrumbItems={breadcrumbItems} />
  );
}
