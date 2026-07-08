import type {
  ActivityLog,
  AppNotification,
  Contract,
  Customer,
  Product,
  Sale,
  StockMovement,
  Supplier,
  User,
} from "@/lib/types"

// Intentionally empty — this is a blank starting point. Sign up your own Admin/Staff
// accounts from the login page, then add your own suppliers, products, customers, and sales.
export const USERS: User[] = []
export const SUPPLIERS: Supplier[] = []
export const PRODUCTS: Product[] = []
export const CUSTOMERS: Customer[] = []
export const CONTRACTS: Contract[] = []
export const SALES: Sale[] = []
export const STOCK_MOVEMENTS: StockMovement[] = []
export const NOTIFICATIONS: AppNotification[] = []
export const ACTIVITY_LOGS: ActivityLog[] = []
