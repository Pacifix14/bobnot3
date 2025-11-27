import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb";

export const dynamic = 'force-dynamic';

export default async function PageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string; pageId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const { workspaceId, pageId } = await params;

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) redirect("/dashboard");

  const page = await db.page.findUnique({
    where: { id: pageId },
    include: { folder: true },
  });

  if (!page) redirect(`/dashboard/${workspaceId}`);

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

