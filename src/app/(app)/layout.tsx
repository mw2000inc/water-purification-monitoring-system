"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import { SidebarNav } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { Logo } from "@/components/shared/logo"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (!loading && !user) router.replace("/login")
  }, [loading, user, router])

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Logo className="h-8 w-8 animate-pulse" />
          <span className="text-sm">Loading MW2000...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background print:h-auto print:overflow-visible">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r bg-sidebar print:hidden">
        <SidebarNav />
      </aside>
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 print:overflow-visible print:p-0">{children}</main>
      </div>
    </div>
  )
}
