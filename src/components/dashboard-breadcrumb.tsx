"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ThemeToggle } from "@/components/theme-toggle"
import { PageStatusBadge } from "@/components/page-status-badge"
import { useEffect, useState } from "react"
import { registerStatusCallback, unregisterStatusCallback, type PageStatus } from "@/lib/page-status-ref"

export function DashboardBreadcrumb({
  items
}: {
  items: { label: string; href?: string }[]
}) {
  const [status, setStatus] = useState<PageStatus>("saved");

  useEffect(() => {
    registerStatusCallback(setStatus);
    return () => {
      unregisterStatusCallback();
    };
  }, []);

  return (
    <header className="flex h-14 md:h-16 shrink-0 items-center gap-1 md:gap-2 border-b px-2 md:px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <Breadcrumb className="flex-1 min-w-0">
        <BreadcrumbList className="overflow-hidden">
          {items.map((item, index) => (
            <div key={index} className="flex items-center">
              <BreadcrumbItem className="hidden md:block">
                {item.href ? (
                  <BreadcrumbLink href={item.href}>
                    {item.label}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {index < items.length - 1 && (
                <BreadcrumbSeparator className="hidden md:block" />
              )}
            </div>
          ))}
          {/* Show last item on mobile */}
          {items.length > 0 && (
            <BreadcrumbItem className="md:hidden">
              <BreadcrumbPage className="truncate max-w-[150px]">{items[items.length - 1]?.label}</BreadcrumbPage>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex-shrink-0 flex items-center gap-2">
        <PageStatusBadge status={status} />
        <ThemeToggle />
      </div>
    </header>
  )
}
