import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"

export function DashboardBreadcrumb({
  items
}: {
  items: { label: string; href?: string }[]
}) {
  return (
    <header className="flex h-14 md:h-16 shrink-0 items-center gap-1 md:gap-2 border-b px-2 md:px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 md:mr-2 h-4" />
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
      <div className="ml-auto flex-shrink-0">
        <ThemeToggle />
      </div>
    </header>
  )
}
