"use client";

import { Loader2 } from "lucide-react";
import type { PageStatus } from "@/lib/page-status-ref";

export function PageStatusBadge({ status }: { status: PageStatus }) {
  return (
    <div 
      className="text-xs text-muted-foreground flex items-center"
      aria-live="polite"
      aria-label={`Page status: ${status}`}
    >
      {status === "saving" && (
        <span className="flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          <span>Saving</span>
        </span>
      )}
      {status === "saved" && <span>Saved</span>}
      {status === "unsaved" && <span>Unsaved</span>}
    </div>
  );
}

