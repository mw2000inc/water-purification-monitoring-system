"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Droplets } from "lucide-react"
import { cn } from "@/lib/utils"
import { NAV_ITEMS } from "@/components/layout/nav-items"
import { useAuth } from "@/lib/auth/auth-context"

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { user } = useAuth()

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "admin")

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Droplets className="h-5 w-5" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-sm">AquaTrack</span>
          <span className="text-xs text-muted-foreground">Water Purification ERP</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2 overflow-y-auto">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="px-5 py-4 text-xs text-muted-foreground border-t">
        &copy; {new Date().getFullYear()} AquaTrack Inc.
      </div>
    </div>
  )
}
