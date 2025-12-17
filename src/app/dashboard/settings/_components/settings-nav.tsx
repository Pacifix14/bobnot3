"use client";

import { cn } from "@/lib/utils";
import { User, Palette, Settings, Bell, Shield, Keyboard } from "lucide-react";
import { motion } from "framer-motion";

interface SettingsNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  {
    id: "general",
    label: "General",
    icon: Settings,
    description: "Workspace preferences",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    description: "Look and feel",
  },
  {
    id: "account",
    label: "Account",
    icon: User,
    description: "Profile and security",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    description: "Email and alerts",
    disabled: true,
  },
];

export function SettingsNav({ activeTab, onTabChange }: SettingsNavProps) {
  return (
    <nav className="flex flex-col space-y-1">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => !item.disabled && onTabChange(item.id)}
            disabled={item.disabled}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors outline-none",
              isActive 
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              item.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 rounded-lg bg-primary/10"
                initial={false}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                }}
              />
            )}
            <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
            <div className="flex flex-col items-start text-left">
              <span className="leading-none">{item.label}</span>
              {/* <span className="text-[10px] font-normal text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.description}
              </span> */}
            </div>
          </button>
        );
      })}
    </nav>
  );
}

