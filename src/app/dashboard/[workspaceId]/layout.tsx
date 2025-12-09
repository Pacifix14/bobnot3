import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { AppSidebarV2 } from "@/components/app-sidebar-v2";
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
  // Fetch user's own workspaces and memberships
  const userWorkspaces = await db.workspace.findMany({
      where: { 
        OR: [
          { ownerId: session.user.id },
          { members: { some: { id: session.user.id } } }
        ]
      },
      select: { id: true, name: true, ownerId: true }
  });

  const isUrlOwner = urlWorkspace.ownerId === session.user.id;

  // Determine Context Workspace
  // If I am the owner of the URL workspace, show it.
  // If I am NOT the owner, ALWAYS use my own workspace as context (even for shared pages)
  let contextWorkspaceId = urlWorkspaceId;
  
  if (!isUrlOwner) {
    // For non-owners, always use their own workspace as context
    if (userWorkspaces.length > 0) {
      contextWorkspaceId = userWorkspaces[0]!.id;
    } else {
      // If user has no workspaces, redirect to dashboard to create one
      redirect("/dashboard");
    }
    
    // Verify they actually have access to the shared page (security check)
    const hasSharedAccess = await db.page.findFirst({
      where: {
        workspaceId: urlWorkspaceId,
        collaborators: {
          some: { id: session.user.id }
        }
      }
    });

    // If no shared access, redirect to their workspace
    if (!hasSharedAccess) {
      redirect(`/dashboard/${contextWorkspaceId}`);
    }
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

  // Fetch folders shared with me (excluding those in context workspace)
  const otherSharedFolders = await db.folder.findMany({
      where: {
          collaborators: { some: { id: session.user.id } },
          workspaceId: { not: contextWorkspaceId }
      },
      include: {
          workspace: true,
          pages: {
            orderBy: { order: 'asc' }
          }
      },
      orderBy: { updatedAt: 'desc' }
  });

  const formattedSharedFolders = otherSharedFolders.map(f => ({
      id: f.id,
      name: f.name,
      workspaceId: f.workspaceId,
      workspaceName: f.workspace.name,
      // We might need to recursively format children if we want deep nesting in shared view,
      // but for now let's keep it simple: just the shared folder itself.
      // If the user has access to a folder, they likely have access to its children too,
      // but the `findMany` above only gets folders explicitly shared with them OR we need a recursive query.
      // For MVP, let's assume "Shared with me" lists the *root* of the share.
      // If I share Folder A, and it has Child B, Child B isn't explicitly shared, but accessible via A.
      // The Sidebar component will need to handle fetching children of shared folders if they aren't loaded.
      // For now, let's just pass the folder info.
  }));

  const user = {
    name: session.user.name ?? "User",
    email: session.user.email ?? "user@example.com",
    avatar: session.user.image ?? "",
  };

  const ownedWorkspaceParams = userWorkspaces.map(w => ({
      name: w.name,
      plan: w.ownerId === session.user.id ? "Owner" : "Member",
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

  // Fetch user settings
  const userSettings = await db.userSettings.findUnique({
    where: { userId: session.user.id },
  });

  const useSidebarV2 = userSettings?.sidebarVersion === "v2";
  const backgroundImage = userSettings?.backgroundImage ?? null;

   return (
    <div
      className={`${inter.variable} font-sans min-h-screen w-full bg-cover bg-center bg-no-repeat`}
      style={{ backgroundImage: backgroundImage ? `url("${backgroundImage}")` : undefined }}
    >
      <SidebarProvider>
        {useSidebarV2 ? (
           <AppSidebarV2
              workspaceId={contextWorkspaceId}
              items={treeItems}
              user={user}
              workspaces={allWorkspaces}
              isOwner={isContextOwner}
              sharedPages={formattedSharedPages}
              sharedFolders={formattedSharedFolders}
           />
        ) : (
          <AppSidebar 
            workspaceId={contextWorkspaceId} 
            items={treeItems} 
            user={user}
            workspaces={allWorkspaces}
            isOwner={isContextOwner}
            sharedPages={formattedSharedPages}
          />
        )}
        <SidebarInset className="bg-transparent">
          <div className="flex-1 h-full w-full">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
