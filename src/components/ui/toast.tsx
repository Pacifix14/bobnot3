"use client";

import * as React from "react";
import { CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  type?: "success" | "error" | "info";
}

export function Toast({ message, isVisible, onClose, type = "success" }: ToastProps) {
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-300 ease-out">
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border px-6 py-4 shadow-2xl min-w-[300px] max-w-[400px]",
          "bg-background border-border",
          type === "success" && "border-green-200 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950 dark:text-green-200",
          type === "error" && "border-red-200 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200",
          type === "info" && "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200"
        )}
        style={{
          boxShadow: type === "success" 
            ? "0 25px 50px -12px rgba(34, 197, 94, 0.25), 0 0 0 1px rgba(34, 197, 94, 0.05)"
            : "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
          transform: "translateZ(0)", // Force hardware acceleration
          backfaceVisibility: "hidden", // Prevent blur during animation
        }}
      >
        {type === "success" && (
          <div className="flex-shrink-0 animate-in zoom-in-75 duration-200 delay-100">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
        )}
        <span className="text-sm font-semibold flex-1 text-center animate-in fade-in duration-200 delay-150">{message}</span>
        <button
          onClick={onClose}
          className="flex-shrink-0 rounded-full p-1.5 hover:bg-black/10 dark:hover:bg-white/10 transition-all duration-200 hover:scale-110 opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
