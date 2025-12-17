"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AppSidebar } from "@/components/app-sidebar";
import { AppSidebarV2 } from "@/components/app-sidebar-v2";

interface SidebarWrapperProps {
  useSidebarV2: boolean;
  workspaceId: string;
  items: any[];
  user: { name: string; email: string; avatar: string };
  workspaces: { name: string; plan: string; id: string }[];
  isOwner: boolean;
  sharedPages?: any[];
  sharedFolders?: any[];
}

export function SidebarWrapper({
  useSidebarV2,
  workspaceId,
  items,
  user,
  workspaces,
  isOwner,
  sharedPages,
  sharedFolders,
}: SidebarWrapperProps) {
  // Check sessionStorage synchronously on mount (client-side only)
  const [isFromSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const fromSettings = sessionStorage.getItem('navigating-from-settings');
      return fromSettings === 'true';
    }
    return false;
  });

  return (
    <motion.div
      initial={isFromSettings ? { opacity: 0, x: -20 } : { opacity: 1, x: 0 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="h-full"
    >
      {useSidebarV2 ? (
        <AppSidebarV2
          workspaceId={workspaceId}
          items={items}
          user={user}
          workspaces={workspaces}
          isOwner={isOwner}
          sharedPages={sharedPages}
          sharedFolders={sharedFolders}
        />
      ) : (
        <AppSidebar
          workspaceId={workspaceId}
          items={items}
          user={user}
          workspaces={workspaces}
          isOwner={isOwner}
          sharedPages={sharedPages}
        />
      )}
    </motion.div>
  );
}

