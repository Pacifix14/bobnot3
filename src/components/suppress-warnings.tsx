"use client";

import { useEffect } from "react";

/**
 * Suppresses third-party library warnings in production
 * These warnings are from Liveblocks/BlockNote/TipTap and can't be easily fixed
 */
export function SuppressWarnings() {
  useEffect(() => {
    // Only suppress in production
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    const originalWarn = console.warn;
    const originalError = console.error;

    // Filter out known third-party warnings
    console.warn = (...args: unknown[]) => {
      const message = args[0];
      if (typeof message === "string") {
        // Suppress Liveblocks warnings
        if (
          message.includes("[Liveblocks]") ||
          message.includes("Liveblocks Connection") ||
          message.includes("liveblocksExtension") ||
          message.includes("undoRedo extension") ||
          message.includes("Initial content must be set")
        ) {
          return;
        }
        // Suppress TipTap warnings
        if (
          message.includes("[tiptap warn]") ||
          message.includes("Duplicate extension names")
        ) {
          return;
        }
      }
      originalWarn.apply(console, args);
    };

    console.error = (...args: unknown[]) => {
      const message = args[0];
      if (typeof message === "string") {
        // Suppress Liveblocks connection errors (these are handled gracefully)
        if (
          message.includes("Liveblocks Connection") ||
          message.includes("websocket server closed")
        ) {
          return;
        }
      }
      originalError.apply(console, args);
    };

    return () => {
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  return null;
}

