"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
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
  type DragOverEvent,
} from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
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
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, FileText, Folder, Plus, Loader2, GalleryVerticalEnd, Users, Pencil, Trash2, PanelLeftIcon, ChevronsLeftRight } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SmoothScrollContainer } from "@/components/smooth-scroll-container";

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

type SharedFolder = {
  id: string;
  name: string;
  workspaceId: string;
  workspaceName: string;
};

// Helper component for action buttons
function ActionButton({ icon: Icon, onClick, className }: { icon: React.ComponentType<{ className?: string }>, onClick: (e: React.MouseEvent) => void, className?: string }) {
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onClick(e);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    e.preventDefault();
                    onClick(e as unknown as React.MouseEvent);
                }
            }}
            className={cn("p-1 hover:bg-background/50 rounded-md transition-colors text-muted-foreground hover:text-foreground cursor-pointer", className)}
        >
           <Icon className="h-3.5 w-3.5" />
        </div>
    )
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

function TreeItemRenderer({
  item,
  workspaceId,
  isOwner,
  prefetchPage,
  utils,
  onItemDeleted,
  isInReorderMode,
  onReorderModeChange,
}: {
  item: TreeItem;
  workspaceId: string;
  isOwner?: boolean;
  prefetchPage: (pageId: string) => void;
  utils: ReturnType<typeof api.useUtils>;
  onItemDeleted?: (itemId: string) => void;
  isInReorderMode?: boolean;
  onReorderModeChange?: (itemId: string, isActive: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const isActive = pathname === `/dashboard/${workspaceId}/${item.id}`;
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState(item.name);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [pointerStartPos, setPointerStartPos] = useState<{ x: number; y: number } | null>(null);

  // Close sidebar on mobile when a page is clicked
  const handlePageClick = useCallback(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);

  const renameFolder = api.workspace.renameFolder.useMutation({
    onSuccess: () => {
        void utils.workspace.getWorkspace.invalidate({ workspaceId });
        router.refresh();
        setIsRenaming(false);
    }
  });

  const deleteFolder = api.workspace.deleteFolder.useMutation({
    onSuccess: () => {
        onItemDeleted?.(item.id);
        void utils.workspace.getWorkspace.invalidate({ workspaceId });
        router.refresh();
        setIsDeleteDialogOpen(false);
    }
  });

  const deletePage = api.workspace.deletePage.useMutation({
    onSuccess: () => {
        onItemDeleted?.(item.id);
        void utils.workspace.getWorkspace.invalidate({ workspaceId });
        router.refresh();
        setIsDeleteDialogOpen(false);
        if (isActive) {
            router.push(`/dashboard/${workspaceId}`);
        }
    }
  });

  const handleRename = (e: React.FormEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!renameName.trim()) return;

      if (item.type === "folder") {
          renameFolder.mutate({
              folderId: item.id,
              name: renameName
          });
      } else {
          // Implement page rename if needed
          setIsRenaming(false);
      }
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

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isOwner) return;

    // Store initial pointer position
    setPointerStartPos({ x: e.clientX, y: e.clientY });

    // Only start long press timer if not already in reorder mode
    if (!isInReorderMode) {
      const timer = setTimeout(() => {
        onReorderModeChange?.(item.id, true);
        // Haptic feedback when reorder mode activates
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([50, 30, 50]);
        }
      }, 500); // 500ms long press
      setLongPressTimer(timer);
    }
  }, [isOwner, isInReorderMode, item.id, onReorderModeChange]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isOwner || !pointerStartPos) return;

    // Calculate distance moved
    const deltaX = Math.abs(e.clientX - pointerStartPos.x);
    const deltaY = Math.abs(e.clientY - pointerStartPos.y);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // If user moved more than 10px, cancel long press (they're scrolling)
    if (distance > 10) {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
      if (isInReorderMode) {
        onReorderModeChange?.(item.id, false);
      }
      setPointerStartPos(null);
    }
  }, [isOwner, pointerStartPos, longPressTimer, isInReorderMode, item.id, onReorderModeChange]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setPointerStartPos(null);
  }, [longPressTimer]);

  const handlePointerCancel = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    if (isInReorderMode) {
      onReorderModeChange?.(item.id, false);
    }
    setPointerStartPos(null);
  }, [longPressTimer, isInReorderMode, item.id, onReorderModeChange]);

  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: item.id, 
    data: item,
    disabled: !isOwner,
  });

  const enhancedListeners = isOwner ? {
      ...listeners,
      onPointerDown: (e: React.PointerEvent) => {
        handlePointerDown(e);
        listeners?.onPointerDown?.(e);
      },
      onPointerMove: (e: React.PointerEvent) => {
        handlePointerMove(e);
        listeners?.onPointerMove?.(e);
      },
      onPointerUp: (e: React.PointerEvent) => {
        handlePointerUp();
        listeners?.onPointerUp?.(e);
      },
      onPointerCancel: (e: React.PointerEvent) => {
        handlePointerCancel();
        listeners?.onPointerCancel?.(e);
      },
  } : {};

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none', 
  };

  if (item.type === "folder") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...(isOwner ? enhancedListeners : {})}
        className={cn(
          "group/item",
          isInReorderMode && "animate-shake"
        )}
      >
        <Collapsible defaultOpen className="group/collapsible">
            <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={item.name} className="group/row relative overflow-hidden">
                {isRenaming ? (
                    <form onSubmit={handleRename} className="flex-1 flex items-center" onClick={e => e.stopPropagation()}>
                        <input
                            type="text"
                            value={renameName}
                            onChange={(e) => setRenameName(e.target.value)}
                            className="h-6 w-full bg-transparent border-none focus:outline-none text-sm px-1"
                            autoFocus
                            onBlur={() => setIsRenaming(false)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') setIsRenaming(false);
                            }}
                        />
                    </form>
                ) : (
                    <>
                        <Folder className="h-4 w-4" />
                        <span className="truncate">{item.name}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </>
                )}
                
                {isOwner && !isRenaming && (
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center gap-1 bg-sidebar-accent/80 backdrop-blur-sm rounded-md px-1">
                         <ActionButton 
                            icon={Pencil} 
                            onClick={() => setIsRenaming(true)}
                        />
                         <ActionButton 
                            icon={Trash2} 
                            onClick={() => setIsDeleteDialogOpen(true)}
                            className="hover:text-destructive"
                        />
                    </div>
                )}
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              <SortableContext 
                items={item.children?.map(c => c.id) ?? []}
                strategy={verticalListSortingStrategy}
              >
                {item.children?.map((subItem) => (
                  <TreeItemRenderer 
                    key={subItem.id} 
                    item={subItem} 
                    workspaceId={workspaceId}
                    isOwner={isOwner}
                    prefetchPage={prefetchPage}
                    utils={utils}
                    onItemDeleted={onItemDeleted}
                    isInReorderMode={isInReorderMode}
                    onReorderModeChange={onReorderModeChange}
                  />
                ))}
              </SortableContext>
              {/* Drop zone for empty folders */}
              {(!item.children || item.children.length === 0) && (
                  <EmptyDropZone folderId={item.id} />
              )}
            </SidebarMenuSub>
          </CollapsibleContent>

           <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Folder?</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete &quot;{item.name}&quot;? This action cannot be undone.
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
        </SidebarMenuItem>
      </Collapsible>
      </div>
    );
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...(isOwner ? enhancedListeners : {})} 
      className={cn(
        "group/item",
        isInReorderMode && "animate-shake"
      )}
    >
        <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive} tooltip={item.name} className="cursor-grab active:cursor-grabbing group/row relative overflow-hidden">
            <Link 
                href={`/dashboard/${workspaceId}/${item.id}`} 
                onMouseEnter={() => prefetchPage(item.id)}
                onClick={handlePageClick}
            >
                <FileText className="h-4 w-4" />
                {isRenaming ? (
                    <form onSubmit={handleRename} className="flex-1 flex items-center" onClick={e => e.stopPropagation()}>
                         {/* Page rename not implemented yet, placeholder */}
                        <span className="truncate">{item.name}</span>
                    </form>
                ) : (
                    <span className="truncate">{item.name}</span>
                )}

                 {isOwner && !isRenaming && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center gap-1 bg-sidebar-accent/80 backdrop-blur-sm rounded-md px-1">
                         <ActionButton 
                            icon={Trash2} 
                            onClick={() => setIsDeleteDialogOpen(true)}
                            className="hover:text-destructive"
                        />
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

export function AppSidebarV2({
  workspaceId,
  items: initialItems,
  user,
  workspaces,
  isOwner = true,
  sharedPages = [],
  sharedFolders = [],
}: {
  workspaceId: string;
  items: TreeItem[];
  user: { name: string; email: string; avatar: string };
  workspaces: { name: string; plan: string; id: string }[];
  isOwner?: boolean;
  sharedPages?: SharedPage[];
  sharedFolders?: SharedFolder[];
}) {
  const router = useRouter();
  const dropAnimationConfig: DropAnimation = useMemo(() => ({
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  }), []);
  const { open, setOpen } = useSidebar();
  const [items, setItems] = useState<TreeItem[]>(initialItems);
  const [activeId, setActiveId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const edgeScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Dispatch event when sidebar open state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('sidebarv2-state-change', { detail: { open } });
      window.dispatchEvent(event);
    }
  }, [open]);


  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const utils = api.useUtils();

  const createPage = api.workspace.createPage.useMutation({
    onSuccess: (page) => {
      const newPageItem: TreeItem = {
        id: page.id,
        name: page.title,
        type: 'page'
      };
      setItems(prev => [...prev, newPageItem]);
      void utils.workspace.getWorkspace.invalidate({ workspaceId });
      router.refresh();
      router.push(`/dashboard/${workspaceId}/${page.id}`);
    },
  });

  const createFolder = api.workspace.createFolder.useMutation({
    onSuccess: () => {
      void utils.workspace.getWorkspace.invalidate({ workspaceId });
      router.refresh();
      setIsNewFolderDialogOpen(false);
      setNewFolderName("");
    }
  });

  const updateStructure = api.workspace.updateStructure.useMutation({
    onSuccess: () => {
      void utils.workspace.getWorkspace.invalidate({ workspaceId });
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

  const [animationStage, setAnimationStage] = useState<'closed' | 'expanding-horizontal' | 'expanding-vertical' | 'open'>('closed');

  useEffect(() => {
    if (open) {
      setAnimationStage('expanding-horizontal');
      
      // After 3/4 of horizontal expansion (225ms), start vertical
      const timer1 = setTimeout(() => {
        setAnimationStage('expanding-vertical');
      }, 225);
      
      // After 450ms, show content (starts fading in while still expanding)
      const timer2 = setTimeout(() => {
        setAnimationStage('open');
      }, 450);
      
      // Cleanup timers if component unmounts or sidebar closes
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    } else {
      // Immediately reset to closed when closing
      setAnimationStage('closed');
    }
  }, [open]);

  const prefetchPage = useCallback((pageId: string) => {
    void utils.page.getPage.prefetch({ pageId });
  }, [utils]);

  const [reorderModeItems, setReorderModeItems] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 500,
        tolerance: 5,
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

  // Helper function to remove an item from the tree structure
  const removeItemFromTree = useCallback((items: TreeItem[], itemId: string): TreeItem[] => {
    return items
      .filter(item => item.id !== itemId)
      .map(item => {
        if (item.children) {
          return {
            ...item,
            children: removeItemFromTree(item.children, itemId)
          };
        }
        return item;
      });
  }, []);

  const flattenedItems = useMemo(() => flatten(items), [items, flatten]);
  const activeItem = activeId ? flattenedItems.find((i) => i.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    const itemId = event.active.id as string;
    setActiveId(itemId);
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const handleDragOver = useCallback((event: DragOverEvent) => {
    if (!activeId) return;
    
    const sidebarElement = document.querySelector('.sidebar-group-content')?.closest('[class*="overflow"]');
    const container = (sidebarElement as HTMLElement | null) ?? scrollContainerRef.current;
    if (!container) return;
    
    if (container.scrollTop === undefined || container.scrollTop === null) {
      const scrollableChild = container.querySelector('[style*="overflow"]');
      if (scrollableChild && (scrollableChild as HTMLElement).scrollTop !== undefined) {
        // Use scrollableChild if found
      }
    }
    
    const rect = container.getBoundingClientRect();
    
    let pointerY: number | null = null;
    
    if (event.activatorEvent && 'clientY' in event.activatorEvent) {
      const clientY = (event.activatorEvent as { clientY: number }).clientY;
      if (typeof clientY === 'number') {
        pointerY = clientY;
      }
    } else if (event.active.rect.current.translated) {
      pointerY = event.active.rect.current.translated.top + event.active.rect.current.translated.height / 2;
    }
    
    if (pointerY === null) return;
    
    const edgeThreshold = 50;
    
    if (edgeScrollIntervalRef.current) {
      clearInterval(edgeScrollIntervalRef.current);
      edgeScrollIntervalRef.current = null;
    }
    
    if (pointerY < rect.top + edgeThreshold) {
      const distance = pointerY - rect.top;
      const speed = Math.max(2, Math.floor((edgeThreshold - distance) / 5));
      
      edgeScrollIntervalRef.current = setInterval(() => {
        const sidebarElement = document.querySelector('.sidebar-group-content')?.closest('[class*="overflow"]');
        const container = (sidebarElement as HTMLElement | null) ?? scrollContainerRef.current;
        if (!container) return;
        
        let scrollElement: HTMLElement = container;
        if (container.scrollTop === undefined || container.scrollTop === null) {
          const scrollableChild = container.querySelector('[style*="overflow"]');
          if (scrollableChild && (scrollableChild as HTMLElement).scrollTop !== undefined) {
            scrollElement = scrollableChild as HTMLElement;
          } else {
            return;
          }
        }
        
        const currentScroll = scrollElement.scrollTop ?? 0;
        if (currentScroll <= 0) {
          if (edgeScrollIntervalRef.current) {
            clearInterval(edgeScrollIntervalRef.current);
            edgeScrollIntervalRef.current = null;
          }
          return;
        }
        scrollElement.scrollTop = Math.max(0, currentScroll - speed);
      }, 16);
    }
    else if (pointerY > rect.bottom - edgeThreshold) {
      const distance = rect.bottom - pointerY;
      const speed = Math.max(2, Math.floor((edgeThreshold - distance) / 5));
      
      edgeScrollIntervalRef.current = setInterval(() => {
        const sidebarElement = document.querySelector('.sidebar-group-content')?.closest('[class*="overflow"]');
        const container = (sidebarElement as HTMLElement | null) ?? scrollContainerRef.current;
        if (!container) return;
        
        let scrollElement: HTMLElement = container;
        if (container.scrollTop === undefined || container.scrollTop === null) {
          const scrollableChild = container.querySelector('[style*="overflow"]');
          if (scrollableChild && (scrollableChild as HTMLElement).scrollTop !== undefined) {
            scrollElement = scrollableChild as HTMLElement;
          } else {
            return;
          }
        }
        
        const maxScroll = scrollElement.scrollHeight - scrollElement.clientHeight;
        const currentScroll = scrollElement.scrollTop ?? 0;
        if (currentScroll >= maxScroll) {
          if (edgeScrollIntervalRef.current) {
            clearInterval(edgeScrollIntervalRef.current);
            edgeScrollIntervalRef.current = null;
          }
          return;
        }
        scrollElement.scrollTop = Math.min(maxScroll, currentScroll + speed);
      }, 16);
    }
  }, [activeId]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (edgeScrollIntervalRef.current) {
      clearInterval(edgeScrollIntervalRef.current);
      edgeScrollIntervalRef.current = null;
    }
    
    setReorderModeItems(new Set());

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const cloneItems = (items: TreeItem[]): TreeItem[] => {
        return items.map(item => ({
            ...item,
            children: item.children ? cloneItems(item.children) : []
        }));
    };
    
    const newItems = cloneItems(items);
    
    let sourceParent: TreeItem[] | null = null;
    let sourceIndex = -1;
    let sourceItem: TreeItem | undefined;
    
    let destParent: TreeItem[] | null = null;
    let destIndex = -1;
    
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
            (sourceParent as TreeItem[]).splice(sourceIndex, 1);
            folder.children = folder.children ?? [];
            folder.children.push(sourceItem);
        }
    } else {
         if (!destParent || destIndex === -1) return;
         (sourceParent as TreeItem[]).splice(sourceIndex, 1);
         const insertIndex = destIndex;
         (destParent as TreeItem[]).splice(insertIndex, 0, sourceItem);
    }

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



  const MotionChevronsLeftRight = motion.create(ChevronsLeftRight);
  const MotionPanelLeftIcon = motion.create(PanelLeftIcon);

  return (
    <LayoutGroup>
      <AnimatePresence mode="popLayout">
        {!open && (
          <motion.div
            key="closed-sidebar"
            className="fixed top-4 left-4 z-[60] flex flex-row items-center gap-1 rounded-lg border border-white/10 bg-sidebar/40 p-1 shadow-sm"
            style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <motion.button
              onClick={() => setOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10 transition-colors text-sidebar-foreground"
            >
              <MotionPanelLeftIcon className="h-4 w-4" />
              <span className="sr-only">Open Sidebar</span>
            </motion.button>
            <div className="h-4 w-[1px] bg-white/10 mx-0.5" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10 transition-colors text-sidebar-foreground">
                  <MotionChevronsLeftRight 
                    className="h-4 w-4 rotate-90" 
                  />
                  <span className="sr-only">Switch Workspace</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 rounded-lg"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Teams
                </DropdownMenuLabel>
                {workspacesWithIcons.map((team, index) => (
                  <DropdownMenuItem
                    key={team.id}
                    onClick={() => {
                      router.push(`/dashboard/${team.id}`)
                    }}
                    className="gap-2 p-2"
                  >
                    <div className="flex size-6 items-center justify-center rounded-sm border">
                      <team.logo className="size-4 shrink-0" />
                    </div>
                    {team.name}
                    <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 p-2">
                  <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                    <Plus className="size-4" />
                  </div>
                  <div className="font-medium text-muted-foreground">Add team</div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        )}

        {open && (
          <motion.div
            key="open-sidebar"
            className="fixed top-4 left-4 z-50 flex flex-col rounded-lg border border-white/10 bg-sidebar/40 shadow-sm overflow-hidden"
            style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
            initial={{
              width: 72,
              height: 42,
              opacity: 1
            }}
            animate={{
              width: animationStage === 'closed' ? 72 : 288,
              height: animationStage === 'open' || animationStage === 'expanding-vertical'
                ? 'calc(100vh - 2rem)'
                : 42,
              opacity: 1
            }}
            exit={{
              opacity: 0,
              scale: 0.95,
              width: 72,
              height: 42
            }}
            transition={{
              width: {
                duration: 0.3,
                ease: [0.32, 0.72, 0, 1]
              },
              height: {
                duration: 0.3,
                ease: [0.32, 0.72, 0, 1],
                delay: animationStage === 'expanding-horizontal' ? 0.225 : 0
              },
              opacity: { duration: 0.2 },
              scale: { duration: 0.2 }
            }}
          >
            <div className="flex flex-col h-full overflow-hidden">
                <SidebarHeader className="h-12 flex flex-row items-start gap-0 p-0 pl-1 pr-4 bg-transparent">
                    <motion.button
                        onClick={() => setOpen(false)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-sidebar-accent text-sidebar-foreground transition-colors mt-1"
                    >
                        <MotionPanelLeftIcon className="h-4 w-4" />
                        <span className="sr-only">Close Sidebar</span>
                    </motion.button>
                <motion.div 
                  className="flex-1 min-w-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: animationStage === 'open' ? 1 : 0 }}
                  transition={{ duration: 0.2, delay: animationStage === 'open' ? 0.3 : 0 }}
                >
                    <TeamSwitcher teams={workspacesWithIcons} />
                </motion.div>
            </SidebarHeader>

            <motion.div 
              className="flex min-h-0 flex-1 flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: animationStage === 'open' ? 1 : 0 }}
              transition={{ duration: 0.2, delay: animationStage === 'open' ? 0.3 : 0 }}
            >
                {/* Fixed Platform header */}
                <SidebarGroup className="shrink-0 bg-transparent">
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
                </SidebarGroup>

                {/* Scrollable Platform content */}
                <SmoothScrollContainer 
                className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-transparent"
                duration={0.5}
                wheelMultiplier={1.2}
                touchMultiplier={2.0}
                >
                <SidebarGroup className="bg-transparent">
                    <SidebarGroupContent>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                        onDragCancel={() => {
                            setActiveId(null);
                            setReorderModeItems(new Set());
                            if (edgeScrollIntervalRef.current) {
                            clearInterval(edgeScrollIntervalRef.current);
                            edgeScrollIntervalRef.current = null;
                            }
                        }}
                    >
                        <SidebarMenu className="ml-2">
                            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                                {items.map((item) => (
                                    <TreeItemRenderer 
                                        key={item.id} 
                                        item={item} 
                                        workspaceId={workspaceId}
                                        isOwner={isOwner}
                                        prefetchPage={prefetchPage}
                                        utils={utils}
                                        onItemDeleted={(itemId) => {
                                            setItems(prev => removeItemFromTree(prev, itemId));
                                        }}
                                        isInReorderMode={reorderModeItems.has(item.id)}
                                        onReorderModeChange={(itemId, isActive) => {
                                            setReorderModeItems(prev => {
                                                const next = new Set(prev);
                                                if (isActive) {
                                                    next.add(itemId);
                                                } else {
                                                    next.delete(itemId);
                                                }
                                                return next;
                                            });
                                        }}
                                    />
                                ))}
                            </SortableContext>
                        </SidebarMenu>

                        <DragOverlay dropAnimation={dropAnimationConfig} modifiers={[snapCenterToCursor]}>
                            {activeItem ? (
                                <div className="bg-sidebar-accent border border-sidebar-border rounded-md p-2 shadow-lg flex items-center gap-2">
                                    {activeItem.type === 'folder' ? (
                                        <Folder className="h-4 w-4" />
                                    ) : (
                                        <FileText className="h-4 w-4" />
                                    )}
                                    <span className="text-sm">{activeItem.name}</span>
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                    </SidebarGroupContent>
                </SidebarGroup>
                </SmoothScrollContainer>

                <SidebarSeparator className="bg-white/5" />
                <SidebarGroup className="bg-transparent">
                    <SidebarGroupLabel className="text-sidebar-foreground/50">
                        Shared With Me
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                    <SidebarMenu className="ml-2">
                        {sharedPages.map((page) => (
                            <SidebarMenuItem key={page.id}>
                                <SidebarMenuButton asChild>
                                    <Link href={`/dashboard/${page.workspaceId}/${page.id}`}>
                                        <FileText className="h-4 w-4 flex-shrink-0" />
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <span className="truncate text-sm">{page.title}</span>
                                            <span className="text-xs text-muted-foreground truncate">{page.workspaceName}</span>
                                        </div>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                        {sharedFolders.map((folder) => (
                            <SidebarMenuItem key={folder.id}>
                                <SidebarMenuButton asChild>
                                    <Link href={`/dashboard/${folder.workspaceId}/folder/${folder.id}`}>
                                        <Folder className="h-4 w-4 flex-shrink-0" />
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <span className="truncate text-sm">{folder.name}</span>
                                            <span className="text-xs text-muted-foreground truncate">{folder.workspaceName}</span>
                                        </div>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </motion.div>

            <SidebarFooter className="bg-transparent">
                <NavUser user={user} />
            </SidebarFooter>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Folder Dialog */}
      <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
                <DialogDescription>
                    Enter a name for your new folder.
                </DialogDescription>
            </DialogHeader>
            <Input 
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleCreateFolder();
                    }
                }}
            />
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewFolderDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || createFolder.isPending}>
                    {createFolder.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : "Create"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutGroup>
  );
}
