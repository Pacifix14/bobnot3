import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb";
import { db } from "@/server/db";

export const dynamic = 'force-dynamic';

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
    <div className="flex flex-col h-full">
      <DashboardBreadcrumb items={breadcrumbItems} />
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-serif text-foreground">Welcome to your workspace</h2>
          <p>Select a page from the sidebar to start writing.</p>
        </div>
      </div>
    </div>
  );
}
