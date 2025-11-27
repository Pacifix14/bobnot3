import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Inter } from "next/font/google";

export const dynamic = 'force-dynamic';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

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

  const { workspaceId: urlWorkspaceId } = await params;

  const urlWorkspace = await db.workspace.findUnique({
    where: { id: urlWorkspaceId },
  });

  if (!urlWorkspace) {
    redirect("/dashboard");
  }

  // Fetch user's own workspaces first
  const userWorkspaces = await db.workspace.findMany({
      where: { ownerId: session.user.id },
      select: { id: true, name: true }
  });

  const isUrlOwner = urlWorkspace.ownerId === session.user.id;

  // Determine Context Workspace
  // If I am the owner of the URL workspace, show it.
  // If I am NOT the owner (viewing shared page), show MY primary workspace instead.
  let contextWorkspaceId = urlWorkspaceId;
  
  if (!isUrlOwner && userWorkspaces.length > 0) {
      contextWorkspaceId = userWorkspaces[0]!.id;
  }

  // Is user owner of the CONTEXT workspace?
  const isContextOwner = userWorkspaces.some(w => w.id === contextWorkspaceId);

  // Fetch data for CONTEXT workspace
  const allFolders = await db.folder.findMany({
    where: { workspaceId: contextWorkspaceId },
    include: { 
      pages: {
        orderBy: { order: 'asc' }
      } 
    },
    orderBy: { order: 'asc' }
  });
  
  const rootPages = await db.page.findMany({
    where: { workspaceId: contextWorkspaceId, folderId: null },
    orderBy: { order: 'asc' }
  });

  interface FolderNode {
    id: string;
    name: string;
    type: 'folder';
    children: Array<FolderNode | PageNode>;
    isOpen: boolean;
  }

  interface PageNode {
    id: string;
    name: string;
    type: 'page';
  }

  const folderMap = new Map<string, FolderNode>();
  const treeItems: Array<FolderNode | PageNode> = [];
  
  allFolders.forEach(f => {
    folderMap.set(f.id, { 
      id: f.id, 
      name: f.name, 
      type: 'folder', 
      children: [],
      isOpen: false
    });
  });

  allFolders.forEach(f => {
    const folderNode = folderMap.get(f.id);
    if (!folderNode) return;
    f.pages.forEach(p => {
      folderNode.children.push({
        id: p.id,
        name: p.title,
        type: 'page'
      });
    });
  });

  allFolders.forEach(f => {
    const node = folderMap.get(f.id);
    if (!node) return;
    if (f.parentId && folderMap.has(f.parentId)) {
      folderMap.get(f.parentId)?.children.push(node);
    } else {
      treeItems.push(node);
    }
  });

  rootPages.forEach(p => {
    treeItems.push({
      id: p.id,
      name: p.title,
      type: 'page'
    });
  });

  // Fetch pages shared with me (excluding those in context workspace)
  // If context is MY workspace, shared pages from OTHER workspaces (like urlWorkspaceId) will appear here.
  const otherSharedPages = await db.page.findMany({
      where: {
          collaborators: { some: { id: session.user.id } },
          workspaceId: { not: contextWorkspaceId }
      },
      include: {
          workspace: true
      },
      orderBy: { updatedAt: 'desc' }
  });

  const formattedSharedPages = otherSharedPages.map(p => ({
      id: p.id,
      title: p.title,
      workspaceId: p.workspaceId,
      workspaceName: p.workspace.name
  }));

  const user = {
    name: session.user.name ?? "User",
    email: session.user.email ?? "user@example.com",
    avatar: session.user.image ?? "",
  };

  const ownedWorkspaceParams = userWorkspaces.map(w => ({
      name: w.name,
      plan: "Enterprise",
      id: w.id
  }));

  // Switcher only shows MY workspaces (since I'm in my context)
  let allWorkspaces = [...ownedWorkspaceParams];
  
  // Sort to put context workspace first
  allWorkspaces = allWorkspaces.sort((a, b) => {
      if (a.id === contextWorkspaceId) return -1;
      if (b.id === contextWorkspaceId) return 1;
      return 0;
  });

  return (
    <div className={`${inter.variable} font-sans`}>
      <SidebarProvider>
        <AppSidebar 
          workspaceId={contextWorkspaceId} 
          items={treeItems} 
          user={user}
          workspaces={allWorkspaces}
          isOwner={isContextOwner}
          sharedPages={formattedSharedPages}
        />
        <SidebarInset>
          <div className="flex-1">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
