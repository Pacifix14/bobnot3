"use client";

import { Loader2 } from "lucide-react";
import { cva } from "class-variance-authority";
import type { PageStatus } from "@/lib/page-status-ref";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      status: {
        saved: [
          // Light mode: soft green background with darker green text
          "bg-[oklch(0.92_0.08_150)] text-[oklch(0.30_0.10_150)]",
          // Dark mode: darker green background with lighter green text
          "dark:bg-[oklch(0.25_0.08_150)] dark:text-[oklch(0.85_0.08_150)]",
        ],
        saving: [
          // Light mode: soft blue background with darker blue text
          "bg-[oklch(0.88_0.08_240)] text-[oklch(0.32_0.10_240)]",
          // Dark mode: darker blue background with lighter blue text
          "dark:bg-[oklch(0.28_0.08_240)] dark:text-[oklch(0.85_0.08_240)]",
        ],
        unsaved: [
          // Light mode: soft orange/yellow background with darker orange text
          "bg-[oklch(0.90_0.10_75)] text-[oklch(0.38_0.12_75)]",
          // Dark mode: darker orange background with lighter orange text
          "dark:bg-[oklch(0.30_0.10_75)] dark:text-[oklch(0.85_0.10_75)]",
        ],
      },
    },
    defaultVariants: {
      status: "saved",
    },
  }
);

export function PageStatusBadge({ status }: { status: PageStatus }) {
  return (
    <div
      className={cn(badgeVariants({ status }))}
      aria-live="polite"
      aria-label={`Page status: ${status}`}
    >
      {status === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          <span>Saving</span>
        </>
      )}
      {status === "saved" && <span>Saved</span>}
      {status === "unsaved" && <span>Unsaved</span>}
    </div>
  );
}

