"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { store } from "@/lib/mock/store"
import type { Role, User } from "@/lib/types"

export type Permission =
  | "customers:add"
  | "customers:edit"
  | "customers:delete"
  | "sales:add"
  | "sales:edit"
  | "sales:delete"
  | "inventory:add"
  | "inventory:edit"
  | "inventory:delete"
  | "users:manage"
  | "settings:manage"

const STAFF_ALLOWED: Permission[] = [
  "customers:add",
  "customers:edit",
  "sales:add",
]

const SESSION_KEY = "aquatrack-session"

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (userId: string) => void
  logout: () => void
  can: (permission: Permission) => boolean
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)
  const router = useRouter()

  React.useEffect(() => {
    // One-time bootstrap from localStorage on mount (client-only external system, not derivable during render).
    const raw = window.localStorage.getItem(SESSION_KEY)
    if (raw) {
      const userId = JSON.parse(raw) as string
      const found = store.state.users.find((u) => u.id === userId)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (found) setUser(found)
    }
    setLoading(false)
  }, [])

  const login = React.useCallback(
    (userId: string) => {
      const found = store.state.users.find((u) => u.id === userId)
      if (!found) return
      setUser(found)
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(found.id))
      store.recordLogin(found.id)
      router.push("/")
    },
    [router]
  )

  const logout = React.useCallback(() => {
    if (user) store.recordLogout(user.id)
    setUser(null)
    window.localStorage.removeItem(SESSION_KEY)
    router.push("/login")
  }, [router, user])

  const can = React.useCallback(
    (permission: Permission) => {
      if (!user) return false
      if (user.role === "admin") return true
      return STAFF_ALLOWED.includes(permission)
    },
    [user]
  )

  const value = React.useMemo(
    () => ({ user, loading, login, logout, can }),
    [user, loading, login, logout, can]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

export function roleLabel(role: Role) {
  return role === "admin" ? "Admin" : "Staff"
}
