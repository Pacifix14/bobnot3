"use client";

import { LiveblocksProvider } from "@liveblocks/react/suspense";
import { type ReactNode } from "react";

export function LiveblocksProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      // Throttle updates to avoid too many re-renders
      throttle={16}
    >
      {children}
    </LiveblocksProvider>
  );
}
