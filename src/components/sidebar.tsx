"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ChevronRight, FileText, Folder, Plus, Settings, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { api } from "@/trpc/react";

type SidebarProps = {
  workspaceId: string;
  folders: any[]; // We'll type this properly later
  pages: any[];
};

export function Sidebar({ workspaceId, folders, pages }: SidebarProps) {
  const router = useRouter();
  const createPage = api.workspace.createPage.useMutation({
    onSuccess: (page) => {
      router.refresh();
      router.push(`/dashboard/${workspaceId}/${page.id}`);
    },
  });

  const handleCreatePage = () => {
    createPage.mutate({ workspaceId });
  };

  return (
    <aside className="w-64 border-r border-border/40 bg-sidebar h-screen flex flex-col">
      <div className="p-4 border-b border-sidebar-border/40">
        <div className="flex items-center gap-2 font-serif font-medium text-sidebar-foreground">
          <div className="h-6 w-6 bg-sidebar-primary rounded-md flex items-center justify-center text-sidebar-primary-foreground text-xs">
            A
          </div>
          <span>My Workspace</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="px-2 py-1.5 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
          Folders
        </div>
        {folders.map((folder) => (
          <FolderItem key={folder.id} folder={folder} workspaceId={workspaceId} />
        ))}
        
        <div className="px-2 py-1.5 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider mt-4">
          Pages
        </div>
        {pages.map((page) => (
          <PageItem key={page.id} page={page} workspaceId={workspaceId} />
        ))}
      </div>

      <div className="p-2 border-t border-sidebar-border/40">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start gap-2 text-sidebar-foreground/70"
          onClick={handleCreatePage}
          disabled={createPage.isPending}
        >
          {createPage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          New Page
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sidebar-foreground/70">
          <Settings className="h-4 w-4" /> Settings
        </Button>
      </div>
    </aside>
  );
}

function FolderItem({ folder, workspaceId }: { folder: any, workspaceId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = folder.children?.length > 0 || folder.pages?.length > 0;

  return (
    <div>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md transition-colors group"
      >
        <ChevronRight className={cn("h-4 w-4 transition-transform text-sidebar-foreground/50", isOpen && "rotate-90")} />
        <Folder className="h-4 w-4 text-sidebar-foreground/50 group-hover:text-sidebar-primary" />
        <span className="truncate">{folder.name}</span>
      </button>
      
      {isOpen && (
        <div className="pl-4 border-l border-sidebar-border/40 ml-4 space-y-1 mt-1">
          {folder.children?.map((child: any) => (
            <FolderItem key={child.id} folder={child} workspaceId={workspaceId} />
          ))}
          {folder.pages?.map((page: any) => (
            <PageItem key={page.id} page={page} workspaceId={workspaceId} />
          ))}
          {(!hasChildren) && (
            <div className="px-2 py-1 text-xs text-sidebar-foreground/40 italic">Empty</div>
          )}
        </div>
      )}
    </div>
  );
}

function PageItem({ page, workspaceId }: { page: any, workspaceId: string }) {
  const pathname = usePathname();
  const isActive = pathname === `/dashboard/${workspaceId}/${page.id}`;

  return (
    <Link href={`/dashboard/${workspaceId}/${page.id}`}>
      <div className={cn(
        "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors group",
        isActive 
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}>
        <FileText className="h-4 w-4 text-sidebar-foreground/50 group-hover:text-sidebar-primary" />
        <span className="truncate">{page.title}</span>
      </div>
    </Link>
  );
}
