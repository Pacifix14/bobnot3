"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  type DropAnimation,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, FileText, Folder, FolderOpen, Plus, Settings, Loader2, GalleryVerticalEnd, GripVertical } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { TeamSwitcher } from "./team-switcher";
import { NavUser } from "./nav-user";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type TreeItem = {
  id: string;
  name: string;
  type: "folder" | "page";
  children?: TreeItem[];
  parentId?: string | null;
};

type FlatItem = TreeItem & {
  depth: number;
  index: number;
};

export function AppSidebar({
  workspaceId,
  items: initialItems,
  user,
  workspaces,
}: {
  workspaceId: string;
  items: TreeItem[];
  user: { name: string; email: string; avatar: string };
  workspaces: { name: string; plan: string }[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<TreeItem[]>(initialItems);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const createPage = api.workspace.createPage.useMutation({
    onSuccess: (page) => {
      router.refresh();
      router.push(`/dashboard/${workspaceId}/${page.id}`);
    },
  });

  const createFolder = api.workspace.createFolder.useMutation({
    onSuccess: () => {
      router.refresh();
      setIsNewFolderDialogOpen(false);
      setNewFolderName("");
    }
  });

  const updateStructure = api.workspace.updateStructure.useMutation({
    onSuccess: () => {
        router.refresh();
    }
  });

  const handleCreatePage = () => {
    createPage.mutate({ workspaceId });
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolder.mutate({ workspaceId, name: newFolderName });
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const flatten = (
    items: TreeItem[],
    parentId: string | null = null,
    depth = 0
  ): FlatItem[] => {
    return items.reduce<FlatItem[]>((acc, item, index) => {
      return [
        ...acc,
        { ...item, parentId, depth, index },
        ...flatten(item.children || [], item.id, depth + 1),
      ];
    }, []);
  };

  const flattenedItems = useMemo(() => flatten(items), [items]);
  const activeItem = activeId ? flattenedItems.find((i) => i.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Optimistic updates could go here for smoother interactions
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Helper to deeply clone
    const cloneItems = (items: TreeItem[]): TreeItem[] => {
        return items.map(item => ({
            ...item,
            children: item.children ? cloneItems(item.children) : []
        }));
    };
    
    let newItems = cloneItems(items);
    
    // Find source and destination in the original structure first
    let sourceParent: TreeItem[] | null = null;
    let sourceIndex = -1;
    let sourceItem: TreeItem | undefined;
    
    let destParent: TreeItem[] | null = null;
    let destParentId: string | null = null;
    let destIndex = -1;

    // Helper to find item and its parent
    const findItem = (list: TreeItem[], id: string, parentId: string | null): boolean => {
        const idx = list.findIndex(i => i.id === id);
        if (idx !== -1) {
            if (id === activeId) {
                sourceParent = list;
                sourceIndex = idx;
                sourceItem = list[idx];
            }
            if (id === overId) {
                destParent = list;
                destParentId = parentId;
                destIndex = idx;
            }
            return !!(sourceItem && destParent);
        }
        for (const item of list) {
            if (item.children) {
                if (findItem(item.children, id, item.id)) return true;
            }
        }
        return false;
    };

    // We need to find both in the *same* traversal or separate?
    // Since we need to modify the list, we should work on `newItems`.
    // But to get correct indices, we need to find them *before* modification.
    // So let's find them in `newItems` (which is a clone of `items` at this point).
    
    // Note: We need to find both. The recursive function above stops if both found? 
    // Actually, we can just traverse fully or until both found.
    
    const findBoth = (list: TreeItem[], pid: string | null) => {
        for (let i = 0; i < list.length; i++) {
            const item = list[i];
            if (!item) continue;
            
            if (item.id === activeId) {
                sourceParent = list;
                sourceIndex = i;
                sourceItem = item;
            }
            if (item.id === overId) {
                destParent = list;
                destParentId = pid;
                destIndex = i;
            }
            if (item.children) {
                findBoth(item.children, item.id);
            }
        }
    };
    
    findBoth(newItems, null);

    if (!sourceItem || !sourceParent || sourceIndex === -1) return;

    // Handle "Empty" placeholder drop
    if (overId.endsWith("-empty")) {
        const folderId = overId.replace("-empty", "");
        const findFolder = (list: TreeItem[]): TreeItem | undefined => {
            for (const item of list) {
                if (item.id === folderId) return item;
                if (item.children) {
                    const found = findFolder(item.children);
                    if (found) return found;
                }
            }
        };
        const folder = findFolder(newItems);
        if (folder) {
             // Remove from source
            (sourceParent as TreeItem[]).splice(sourceIndex, 1);
            
            if (!folder.children) folder.children = [];
            folder.children.push(sourceItem);
        }
    } else {
         if (!destParent || destIndex === -1) return;
         
         // Remove from source
         (sourceParent as TreeItem[]).splice(sourceIndex, 1);
         
         // Calculate insertion index
         const insertIndex = destIndex;
         
         (destParent as TreeItem[]).splice(insertIndex, 0, sourceItem);
    }

    // Collect updates
    const updates: { id: string, type: "page" | "folder", parentId: string | null, order: number }[] = [];
    
    const collectUpdates = (list: TreeItem[], pid: string | null) => {
        list.forEach((item, idx) => {
             updates.push({
                 id: item.id,
                 type: item.type,
                 parentId: pid,
                 order: idx
             });
             if (item.children) collectUpdates(item.children, item.id);
        });
    };
    
    collectUpdates(newItems, null);

    setItems(newItems);
    
    // Ensure we don't pass undefined as parentId, map undefined to null just in case
    // although collectUpdates logic passes null for root.
    const sanitizedUpdates = updates.map(u => ({
        ...u,
        parentId: u.parentId ?? null
    }));

    updateStructure.mutate(sanitizedUpdates);
  };

  if (!mounted) return null;

  const workspacesWithIcons = workspaces.map((w) => ({
    ...w,
    logo: GalleryVerticalEnd,
  }));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <TeamSwitcher teams={workspacesWithIcons} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between pr-2">
            <span className="font-serif">Platform</span>
            <div className="flex items-center gap-1">
              <button 
                onClick={handleCreatePage} 
                disabled={createPage.isPending}
                className="p-1 hover:bg-sidebar-accent rounded-md transition-colors text-sidebar-foreground/50 hover:text-sidebar-foreground"
                title="New Page"
              >
                {createPage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </button>
              <button 
                onClick={() => setIsNewFolderDialogOpen(true)}
                className="p-1 hover:bg-sidebar-accent rounded-md transition-colors text-sidebar-foreground/50 hover:text-sidebar-foreground"
                title="New Folder"
              >
                 <Folder className="h-4 w-4" />
              </button>
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <SidebarMenu>
                    <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                        {items.map((item) => (
                            <TreeItemRenderer key={item.id} item={item} workspaceId={workspaceId} />
                        ))}
                    </SortableContext>
                </SidebarMenu>
                <DragOverlay dropAnimation={dropAnimationConfig}>
                    {activeItem ? (
                        <div className="opacity-80 bg-sidebar-accent rounded-md p-2">
                            <div className="flex items-center gap-2">
                                {activeItem.type === 'folder' ? <Folder className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                <span>{activeItem.name}</span>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto group-data-[collapsible=icon]:hidden">
          <SidebarGroupContent>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
      <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
            <DialogDescription>
              Enter a name for your new folder.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              id="name"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateFolder();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || createFolder.isPending}>
              {createFolder.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Folder"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}

const dropAnimationConfig: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
};

function TreeItemRenderer({
  item,
  workspaceId,
}: {
  item: TreeItem;
  workspaceId: string;
}) {
  const pathname = usePathname();
  const isActive = pathname === `/dashboard/${workspaceId}/${item.id}`;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id, data: item });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (item.type === "folder") {
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="group/item">
        <Collapsible defaultOpen className="group/collapsible">
            <SidebarMenuItem>
              <div className="flex items-center w-full group/folder-row">
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton 
                    tooltip="Toggle Folder"
                    className="h-8 w-8 p-2 shrink-0"
                  >
                    <div className="relative w-4 h-4">
                        {/* State: Not Hovered */}
                        <div className="absolute inset-0 flex items-center justify-center transition-all duration-200 group-hover/folder-row:opacity-0 group-hover/folder-row:scale-75">
                            <Folder className={cn(
                                "w-4 h-4 absolute transition-all duration-200",
                                "opacity-100 scale-100",
                                "group-data-[state=open]/collapsible:opacity-0 group-data-[state=open]/collapsible:scale-75"
                            )} />
                            <FolderOpen className={cn(
                                "w-4 h-4 absolute transition-all duration-200",
                                "opacity-0 scale-75",
                                "group-data-[state=open]/collapsible:opacity-100 group-data-[state=open]/collapsible:scale-100"
                            )} />
                        </div>

                        {/* State: Hovered */}
                        <div className="absolute inset-0 flex items-center justify-center transition-all duration-200 opacity-0 scale-75 group-hover/folder-row:opacity-100 group-hover/folder-row:scale-100">
                            <ChevronRight className={cn(
                                "w-4 h-4 transition-transform duration-200",
                                "group-data-[state=open]/collapsible:rotate-90"
                            )} />
                        </div>
                    </div>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <SidebarMenuButton asChild tooltip={item.name} className="cursor-grab active:cursor-grabbing flex-1 pl-0">
                    <a href={`/dashboard/${workspaceId}/folder/${item.id}`} className="flex items-center gap-2">
                        <span className="truncate">{item.name}</span>
                    </a>
                </SidebarMenuButton>
              </div>
            <CollapsibleContent>
                <SidebarMenuSub>
                    <SortableContext items={item.children?.map(c => c.id) || []} strategy={verticalListSortingStrategy}>
                        {item.children?.map((child) => (
                            <TreeItemRenderer
                            key={child.id}
                            item={child}
                            workspaceId={workspaceId}
                            />
                        ))}
                    </SortableContext>
                    {item.children?.length === 0 && (
                        <EmptyDropZone folderId={item.id} />
                    )}
                </SidebarMenuSub>
            </CollapsibleContent>
            </SidebarMenuItem>
        </Collapsible>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="group/item">
        <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive} tooltip={item.name} className="cursor-grab active:cursor-grabbing">
                <a href={`/dashboard/${workspaceId}/${item.id}`} className={`flex items-center gap-2 ${isActive ? '' : 'text-muted-foreground/70 hover:text-foreground transition-colors'}`}>
                <FileText className="flex-shrink-0" />
                <span className="truncate">{item.name}</span>
                </a>
            </SidebarMenuButton>
        </SidebarMenuItem>
    </div>
  );
}

function EmptyDropZone({ folderId }: { folderId: string }) {
    const id = `${folderId}-empty`;
    const {
        attributes,
        listeners,
        setNodeRef,
        isOver
    } = useSortable({ id, disabled: false });

    return (
        <SidebarMenuSubItem ref={setNodeRef} className={isOver ? "bg-sidebar-accent/50" : ""}>
            <span className="text-xs text-muted-foreground px-2 italic block py-1">
                Empty
            </span>
        </SidebarMenuSubItem>
    );
}
