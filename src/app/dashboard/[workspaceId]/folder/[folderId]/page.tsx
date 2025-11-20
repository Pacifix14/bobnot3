import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Folder } from "lucide-react";
import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb";

export default async function FolderPage({
  params,
}: {
  params: Promise<{ workspaceId: string; folderId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const { workspaceId, folderId } = await params;

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) redirect("/dashboard");

  const folder = await db.folder.findUnique({
    where: { id: folderId },
    include: {
      pages: {
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!folder) redirect(`/dashboard/${workspaceId}`);

  const breadcrumbItems = [
    { label: workspace.name, href: `/dashboard/${workspaceId}` },
    { label: folder.name, active: true },
  ];

  return (
    <div className="flex flex-col h-full">
      <DashboardBreadcrumb items={breadcrumbItems} />
      <div className="flex-1 p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <Folder className="w-6 h-6" />
              <span className="text-sm font-medium uppercase tracking-wider">Folder</span>
            </div>
            <h1 className="text-4xl font-serif font-medium">{folder.name}</h1>
          </div>

          <div className="grid gap-4">
            {folder.pages.length === 0 ? (
              <div className="text-center py-12 border rounded-lg bg-muted/10 border-dashed">
                <p className="text-muted-foreground">No pages in this folder yet.</p>
              </div>
            ) : (
              folder.pages.map((page) => (
                <Link
                  key={page.id}
                  href={`/dashboard/${workspaceId}/${page.id}`}
                  className="flex items-center gap-3 p-4 rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">{page.title || "Untitled"}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

