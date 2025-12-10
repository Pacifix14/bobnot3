import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Folder } from "lucide-react";
import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb";
import { type Metadata } from "next";

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspaceId: string; folderId: string }>;
}): Promise<Metadata> {
  const { folderId } = await params;
  const folder = await db.folder.findUnique({
    where: { id: folderId },
  });

  return {
    title: folder?.name ?? "Folder",
  };
}

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
    <div
      className="flex flex-col h-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
      style={{
        paddingLeft: 'var(--sidebar-push-offset, 0px)',
      }}
    >
      <DashboardBreadcrumb items={breadcrumbItems} />
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6 md:space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <Folder className="w-5 h-5 md:w-6 md:h-6" />
              <span className="text-xs md:text-sm font-medium uppercase tracking-wider">Folder</span>
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-medium">{folder.name}</h1>
          </div>

          <div className="grid gap-3 md:gap-4">
            {folder.pages.length === 0 ? (
              <div className="text-center py-8 md:py-12 border rounded-lg bg-muted/10 border-dashed">
                <p className="text-sm md:text-base text-muted-foreground">No pages in this folder yet.</p>
              </div>
            ) : (
              folder.pages.map((page) => (
                <Link
                  key={page.id}
                  href={`/dashboard/${workspaceId}/${page.id}`}
                  className="flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <FileText className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-sm md:text-base truncate">{page.title || "Untitled"}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

