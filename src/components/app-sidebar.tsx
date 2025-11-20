"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, FileText, Folder, Plus, Settings, Loader2, GalleryVerticalEnd } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { TeamSwitcher } from "./team-switcher";
import { NavUser } from "./nav-user";

type TreeItem = {
  id: string;
  name: string;
  type: "folder" | "page";
  children?: TreeItem[];
};

export function AppSidebar({
  workspaceId,
  items,
  user,
  workspaces
}: {
  workspaceId: string;
  items: TreeItem[];
  user: { name: string; email: string; avatar: string };
  workspaces: { name: string; plan: string }[];
}) {
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

  const workspacesWithIcons = workspaces.map(w => ({
    ...w,
    logo: GalleryVerticalEnd
  }));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <TeamSwitcher teams={workspacesWithIcons} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <TreeItemRenderer key={item.id} item={item} workspaceId={workspaceId} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup className="mt-auto group-data-[collapsible=icon]:hidden">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleCreatePage} disabled={createPage.isPending}>
                  {createPage.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
                  <span>New Page</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function TreeItemRenderer({ item, workspaceId }: { item: TreeItem; workspaceId: string }) {
  const pathname = usePathname();
  const isActive = pathname === `/dashboard/${workspaceId}/${item.id}`;

  if (item.type === "folder") {
    return (
      <Collapsible defaultOpen className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={item.name}>
              <ChevronRight className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              <Folder />
              <span>{item.name}</span>
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.children?.map((child) => (
                <TreeItemRenderer key={child.id} item={child} workspaceId={workspaceId} />
              ))}
              {item.children?.length === 0 && (
                <SidebarMenuSubItem>
                  <span className="text-xs text-muted-foreground px-2 italic">Empty</span>
                </SidebarMenuSubItem>
              )}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
        <a href={`/dashboard/${workspaceId}/${item.id}`}>
          <FileText />
          <span>{item.name}</span>
        </a>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
