export type Role = "admin" | "staff"

export interface User {
  id: string
  name: string
  email: string
  role: Role
  avatarUrl?: string
  phone?: string
  passwordHash?: string
  createdAt: string
}

export type ContractStatus = "active" | "expiring" | "expired"

export interface Customer {
  id: string
  orderNumber: string
  fullName: string
  companyName?: string
  contractNumber: string
  contractStart: string
  contractEnd: string
  address: string
  email: string
  contactNumber: string
  dispenserType: string
  filterInstalled: boolean
  installedDate?: string
  assignedTechnician: string
  notes?: string
  createdAt: string
}

export type MonitoringStatus = "active" | "for-replacement"

export interface Contract {
  id: string
  customerId: string
  contractNumber: string
  startDate: string
  endDate: string
}

export type PaymentMethod = "Cash" | "Bank Transfer" | "Credit Card" | "GCash" | "Check"
export type PaymentStatus = "Paid" | "Pending" | "Overdue" | "Partial"

export interface SaleItem {
  id: string
  productId: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface Sale {
  id: string
  invoiceNumber: string
  date: string
  customerId: string
  salesRepId: string
  items: SaleItem[]
  discount: number
  totalAmount: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
}

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock"

export interface Product {
  id: string
  name: string
  category: string
  supplierId: string
  sku: string
  barcode?: string
  stockQuantity: number
  minStockLevel: number
  purchasePrice: number
  sellingPrice: number
  dateAdded: string
  lastUpdated: string
}

export interface Supplier {
  id: string
  name: string
  contact: string
  email: string
  address: string
}

export type StockMovementReason =
  | "Sale"
  | "Restock"
  | "Return"
  | "Damaged"
  | "Adjustment"

export interface StockMovement {
  id: string
  date: string
  productId: string
  quantityAdded: number
  quantityRemoved: number
  reason: StockMovementReason
  userId: string
  referenceNumber: string
}

export type NotificationType =
  | "low-stock"
  | "out-of-stock"
  | "expiring-contract"
  | "new-customer"
  | "new-sale"

export interface AppNotification {
  id: string
  type: NotificationType
  message: string
  isRead: boolean
  createdAt: string
  relatedEntityId?: string
}

export interface ActivityLog {
  id: string
  userId: string
  action: string
  date: string
  time: string
  ipAddress: string
}

export interface ContactEntry {
  label: string
  value: string
}

export interface CompanySettings {
  companyName: string
  companyLogoUrl?: string
  supportEmail: string
  emailNotificationsEnabled: boolean
  currency: string
  taxRate: number
  address: string
  contactNumbers: ContactEntry[]
  contactEmails: ContactEntry[]
}
