import {
  LayoutDashboard,
  Users,
  FileText,
  ShoppingCart,
  Package,
  ArrowLeftRight,
  UserCog,
  Settings,
  type LucideIcon,
} from "lucide-react"
import type { Permission } from "@/lib/auth/auth-context"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  adminOnly?: boolean
  requires?: Permission
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/contracts", label: "Quarterly Monitoring", icon: FileText },
  { href: "/sales", label: "Sales", icon: ShoppingCart },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/inventory/stock-movements", label: "Stock Movements", icon: ArrowLeftRight },
  { href: "/users", label: "Users", icon: UserCog, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
]
