"use client";

import { cn } from "@/lib/utils";
import { User, Palette, Settings, Bell, Shield, Keyboard, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface SettingsNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isSwitching?: boolean;
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

export function SettingsNav({ activeTab, onTabChange, isSwitching = false }: SettingsNavProps) {
  return (
    <nav className="flex flex-col space-y-2">
      {navItems.map((item, index) => {
        const isActive = activeTab === item.id;
        return (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            onClick={() => !item.disabled && !isSwitching && onTabChange(item.id)}
            disabled={item.disabled || isSwitching}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-200 ease-out outline-none",
              isActive 
                ? "text-sidebar-accent-foreground bg-sidebar-accent shadow-sm py-3" 
                : "text-muted-foreground bg-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground py-2.5",
              (item.disabled || isSwitching) && "opacity-50 cursor-not-allowed",
              isSwitching && "cursor-wait",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
            whileHover={!item.disabled && !isActive && !isSwitching ? { scale: 1.01 } : {}}
            whileTap={!item.disabled && !isSwitching ? { scale: 0.98 } : {}}
            initial={false}
            animate={
              isActive && isSwitching
                ? {
                    scale: [1, 1.01, 1],
                  }
                : {}
            }
            transition={
              isActive && isSwitching
                ? {
                    scale: {
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                  }
                : { duration: 0.15 }
            }
          >
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 rounded-xl bg-sidebar-accent z-0"
                initial={false}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                }}
              />
            )}
            
            {/* Loading overlay */}
            {isSwitching && isActive && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 rounded-xl bg-sidebar-accent/80 backdrop-blur-sm flex items-center justify-center z-20"
              >
                <Loader2 className="h-4 w-4 animate-spin text-sidebar-accent-foreground" />
              </motion.div>
            )}
            
            <motion.div
              className={cn("h-4 w-4 shrink-0 relative z-10", isActive ? "text-sidebar-accent-foreground" : "text-muted-foreground group-hover:text-sidebar-accent-foreground")}
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              whileHover={!item.disabled && !isSwitching ? { scale: 1.1, rotate: 2 } : {}}
              transition={{ duration: 0.2 }}
            >
              <item.icon className="h-4 w-4" />
            </motion.div>
            <div className="flex flex-col items-start text-left relative z-10 min-w-0 flex-1">
              <span className="leading-none transition-colors duration-200 text-base font-medium">{item.label}</span>
              {isActive && (
                <motion.span 
                  className="text-[13px] font-normal text-muted-foreground mt-1.5 leading-tight"
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ 
                    opacity: 0.7,
                    height: "auto",
                    marginTop: "0.375rem"
                  }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {item.description}
                </motion.span>
              )}
            </div>
          </motion.button>
        );
      })}
    </nav>
  );
}

