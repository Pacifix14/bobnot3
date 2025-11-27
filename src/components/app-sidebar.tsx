"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  type DragEndEvent,
} from "@dnd-kit/core";
import {
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
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, FileText, Folder, FolderOpen, Plus, Loader2, GalleryVerticalEnd, Users, Pencil, Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
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

type SharedPage = {
  id: string;
  title: string;
  workspaceId: string;
  workspaceName: string;
};

export function AppSidebar({
  workspaceId,
  items: initialItems,
  user,
  workspaces,
  isOwner = true,
  sharedPages = [],
}: {
  workspaceId: string;
  items: TreeItem[];
  user: { name: string; email: string; avatar: string };
  workspaces: { name: string; plan: string; id: string }[];
  isOwner?: boolean;
  sharedPages?: SharedPage[];
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
      router.push(`/dashboard/${workspaceId}/${page.id}`);
    },
  });

  const createFolder = api.workspace.createFolder.useMutation({
    onSuccess: () => {
      setIsNewFolderDialogOpen(false);
      setNewFolderName("");
    }
  });

  const updateStructure = api.workspace.updateStructure.useMutation();

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

  const flatten = useCallback((
    items: TreeItem[],
    parentId: string | null = null,
    depth = 0
  ): FlatItem[] => {
    return items.reduce<FlatItem[]>((acc, item, index) => {
      return [
        ...acc,
        { ...item, parentId, depth, index },
        ...flatten(item.children ?? [], item.id, depth + 1),
      ];
    }, []);
  }, []);

  const flattenedItems = useMemo(() => flatten(items), [items, flatten]);
  const activeItem = activeId ? flattenedItems.find((i) => i.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
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
    
    const newItems = cloneItems(items);
    
    // Find source and destination in the original structure first
    let sourceParent: TreeItem[] | null = null;
    let sourceIndex = -1;
    let sourceItem: TreeItem | undefined;
    
    let destParent: TreeItem[] | null = null;
    let destIndex = -1;

    // We need to find both in the *same* traversal or separate?
    // Since we need to modify the list, we should work on `newItems`.
    // But to get correct indices, we need to find them *before* modification.
    // So let's find them in `newItems` (which is a clone of `items` at this point).
    
    
    // Note: We need to find both. The recursive function above stops if both found? 
    // Actually, we can just traverse fully or until both found.
    
    const findBoth = (list: TreeItem[], _pid: string | null) => {
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
            
            folder.children = folder.children ?? [];
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

  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <TeamSwitcher teams={workspacesWithIcons} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between pr-2">
            <span>Platform</span>
            {isOwner && (
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
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <SidebarMenu className="ml-2">
                    <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                        {items.map((item) => (
                            <TreeItemRenderer key={item.id} item={item} workspaceId={workspaceId} isOwner={isOwner} />
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

        <SidebarSeparator className="mx-2 my-2 mt-auto" />
        <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Shared with me</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu className="ml-2">
                    {sharedPages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 px-2 text-center border border-dashed border-sidebar-border/50 rounded-md m-1">
                            <span className="text-xs text-muted-foreground">No pages shared with you</span>
                        </div>
                    ) : (
                        sharedPages.map((page) => (
                            <SidebarMenuItem key={page.id}>
                                <SidebarMenuButton 
                                    asChild 
                                    isActive={pathname === `/dashboard/${page.workspaceId}/${page.id}`}
                                    className="h-auto py-2.5 items-start"
                                    tooltip={`${page.title} • ${page.workspaceName}`}
                                >
                                    <Link href={`/dashboard/${page.workspaceId}/${page.id}`} className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 shrink-0 mt-0.5" />
                                        <div className="flex flex-col gap-0.5 overflow-hidden">
                                            <span className="truncate font-medium leading-none">{page.title}</span>
                                            <span className="truncate text-[10px] text-muted-foreground">
                                                {page.workspaceName}
                                            </span>
                                        </div>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))
                    )}
                </SidebarMenu>
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

// Helper component for action buttons
function ActionButton({ icon: Icon, onClick, className }: { icon: React.ComponentType<{ className?: string }>, onClick: (e: React.MouseEvent) => void, className?: string }) {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onClick(e);
            }}
            className={cn("p-1 hover:bg-background/50 rounded-md transition-colors text-muted-foreground hover:text-foreground", className)}
        >
           <Icon className="h-3.5 w-3.5" />
        </button>
    )
}

function TreeItemRenderer({
  item,
  workspaceId,
  isOwner,
}: {
  item: TreeItem;
  workspaceId: string;
  isOwner?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isActive = pathname === `/dashboard/${workspaceId}/${item.id}`;
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState(item.name);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const renameFolder = api.workspace.renameFolder.useMutation({
    onSuccess: () => {
        setIsRenaming(false);
    }
  });

  const deleteFolder = api.workspace.deleteFolder.useMutation({
    onSuccess: () => {
        setIsDeleteDialogOpen(false);
    }
  });

  const deletePage = api.workspace.deletePage.useMutation({
    onSuccess: () => {
        setIsDeleteDialogOpen(false);
    }
  });

  const handleRename = () => {
      if (!renameName.trim()) return;
      if (renameName === item.name) {
          setIsRenaming(false);
          return;
      }
      renameFolder.mutate({ folderId: item.id, name: renameName });
  };

  const handleDelete = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (item.type === "folder") {
          deleteFolder.mutate({ folderId: item.id });
      } else {
          deletePage.mutate({ pageId: item.id });
      }
  };

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
              <div className="flex items-center w-full group/folder-row relative">
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton 
                    tooltip="Toggle Folder"
                    className="h-8 w-6 p-1 shrink-0"
                  >
                    <div className="relative w-4 h-4">
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

                        <div className="absolute inset-0 flex items-center justify-center transition-all duration-200 opacity-0 scale-75 group-hover/folder-row:opacity-100 group-hover/folder-row:scale-100">
                            <ChevronRight className={cn(
                                "w-4 h-4 transition-transform duration-200",
                                "group-data-[state=open]/collapsible:rotate-90"
                            )} />
                        </div>
                    </div>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                {isRenaming ? (
                    <div className="flex-1 px-2">
                         <Input
                            value={renameName}
                            onChange={(e) => setRenameName(e.target.value)}
                            onBlur={handleRename}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleRename();
                                if (e.key === "Escape") {
                                    setRenameName(item.name);
                                    setIsRenaming(false);
                                }
                                e.stopPropagation();
                            }}
                            autoFocus
                            className="h-7 text-sm"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                ) : (
                    <SidebarMenuButton asChild tooltip={item.name} className="cursor-grab active:cursor-grabbing flex-1 pr-2 group/row relative overflow-hidden">
                        <Link href={`/dashboard/${workspaceId}/folder/${item.id}`} className="flex items-center gap-2 w-full">
                            <span className="truncate transition-all duration-200 group-hover/row:pr-16">{item.name}</span>
                            
                            {isOwner && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 translate-x-2 transition-all duration-200 group-hover/row:opacity-100 group-hover/row:translate-x-0">
                                    <ActionButton icon={Pencil} onClick={() => setIsRenaming(true)} />
                                    <ActionButton icon={Trash2} onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive hover:text-destructive hover:bg-destructive/10" />
                                </div>
                            )}
                        </Link>
                    </SidebarMenuButton>
                )}
              </div>
            <CollapsibleContent>
                <SidebarMenuSub>
                    <SortableContext items={item.children?.map(c => c.id) ?? []} strategy={verticalListSortingStrategy}>
                        {item.children?.map((child) => (
                            <TreeItemRenderer
                            key={child.id}
                            item={child}
                            workspaceId={workspaceId}
                            isOwner={isOwner}
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
        
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Folder?</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete &quot;{item.name}&quot; and all its contents? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={deleteFolder.isPending}>
                        {deleteFolder.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : "Delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="group/item">
        <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive} tooltip={item.name} className="cursor-grab active:cursor-grabbing group/row relative overflow-hidden">
                <Link href={`/dashboard/${workspaceId}/${item.id}`} className={`flex items-center gap-2 w-full ${isActive ? '' : 'text-muted-foreground/70 hover:text-foreground transition-colors'}`}>
                    <FileText className="flex-shrink-0" />
                    <span className="truncate transition-all duration-200 group-hover/row:pr-8">{item.name}</span>
                    
                    {isOwner && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 translate-x-2 transition-all duration-200 group-hover/row:opacity-100 group-hover/row:translate-x-0">
                            <ActionButton icon={Trash2} onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive hover:text-destructive hover:bg-destructive/10" />
                        </div>
                    )}
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
        
         <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Page?</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete &quot;{item.name}&quot;? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={deletePage.isPending}>
                        {deletePage.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : "Delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}

function EmptyDropZone({ folderId }: { folderId: string }) {
    const id = `${folderId}-empty`;
    const {
        setNodeRef,
        isOver
    } = useSortable({ id, disabled: false });

    return (
        <SidebarMenuSubItem ref={setNodeRef}>
             <div 
                className={cn(
                    "h-8 border border-dashed rounded-md flex items-center justify-center transition-colors",
                    isOver 
                        ? "border-primary/50 bg-sidebar-accent" 
                        : "border-sidebar-border/50 hover:border-sidebar-border text-muted-foreground/50"
                )}
            >
                <span className="text-[10px] font-medium">
                    {isOver ? "Drop here" : "Empty"}
                </span>
            </div>
        </SidebarMenuSubItem>
    );
}
