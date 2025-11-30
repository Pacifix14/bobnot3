"use client";

import { LiveblocksProvider } from "@liveblocks/react/suspense";
import { type ReactNode } from "react";

export function LiveblocksProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      // Optimized throttle - 16ms provides smooth 60fps updates
      // This balances responsiveness with performance
      throttle={16}
    >
      {children}
    </LiveblocksProvider>
  );
}
