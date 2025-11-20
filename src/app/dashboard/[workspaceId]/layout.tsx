import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { GalleryVerticalEnd } from "lucide-react";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const { workspaceId } = await params;

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace || workspace.ownerId !== session.user.id) {
    redirect("/dashboard");
  }

  // Fetch all folders and pages to build the tree
  const allFolders = await db.folder.findMany({
    where: { workspaceId: workspaceId },
    include: { pages: true },
    orderBy: { createdAt: 'asc' }
  });
  
  const rootPages = await db.page.findMany({
    where: { workspaceId: workspaceId, folderId: null },
    orderBy: { createdAt: 'asc' }
  });

  // Build tree in memory
  const folderMap = new Map<string, any>();
  
  // Initialize map with folders
  allFolders.forEach(f => {
    folderMap.set(f.id, { 
      id: f.id, 
      name: f.name, 
      type: 'folder', 
      children: [],
      isOpen: false // We can manage this state in the client, but good to have the structure
    });
  });

  // Add pages to their respective folders
  allFolders.forEach(f => {
    const folderNode = folderMap.get(f.id);
    f.pages.forEach(p => {
      folderNode.children.push({
        id: p.id,
        name: p.title,
        type: 'page'
      });
    });
  });

  const treeItems: any[] = [];

  // Build folder hierarchy
  allFolders.forEach(f => {
    const node = folderMap.get(f.id);
    if (f.parentId && folderMap.has(f.parentId)) {
      folderMap.get(f.parentId).children.push(node);
    } else {
      treeItems.push(node);
    }
  });

  // Add root pages
  rootPages.forEach(p => {
    treeItems.push({
      id: p.id,
      name: p.title,
      type: 'page'
    });
  });

  // Sort items: Folders first, then pages, or alphabetical? 
  // Let's sort by name for now, or keep folders first.
  // A simple sort function could be added here.



  const user = {
    name: session.user.name ?? "User",
    email: session.user.email ?? "user@example.com",
    avatar: session.user.image ?? "",
  };

  const workspaces = [
    {
      name: workspace.name,
      plan: "Enterprise",
    },
  ];

  return (
    <SidebarProvider>
      <AppSidebar 
        workspaceId={workspaceId} 
        items={treeItems} 
        user={user}
        workspaces={workspaces}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="font-medium">
             {workspace.name}
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
