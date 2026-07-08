import type {
  ActivityLog,
  AppNotification,
  CompanySettings,
  Contract,
  Customer,
  Product,
  Sale,
  StockMovement,
  Supplier,
  User,
} from "@/lib/types"
import {
  ACTIVITY_LOGS,
  CONTRACTS,
  CUSTOMERS,
  NOTIFICATIONS,
  PRODUCTS,
  SALES,
  STOCK_MOVEMENTS,
  SUPPLIERS,
  USERS,
} from "@/lib/mock/seed"
import { formatOrderNumber, generateId, getContractStatus, getStockStatus, parseOrderNumberSequence } from "@/lib/utils"

export interface AquaDB {
  users: User[]
  customers: Customer[]
  contracts: Contract[]
  sales: Sale[]
  products: Product[]
  stockMovements: StockMovement[]
  suppliers: Supplier[]
  notifications: AppNotification[]
  activityLogs: ActivityLog[]
  settings: CompanySettings
}

const STORAGE_KEY = "aquatrack-db-v1"

function defaultSettings(): CompanySettings {
  return {
    companyName: "MW2000 Water Purification Co.",
    companyLogoUrl: undefined,
    supportEmail: "support@aquatrack.ph",
    emailNotificationsEnabled: true,
    currency: "PHP",
    taxRate: 12,
    address: "#1 Kalantiaw St. cor. JP Rizal, Brgy. San Roque, Project 4, Cubao, Quezon City, Metro Manila",
    contactNumbers: [
      { label: "Admin", value: "(02) 8275 9642" },
      { label: "Customer Service", value: "0917 857 5601" },
      { label: "Sales", value: "0917 857 5626" },
    ],
    contactEmails: [
      { label: "Admin", value: "admin@aquatrack.ph" },
      { label: "Customer Service", value: "cs@aquatrack.ph" },
    ],
  }
}

function freshDB(): AquaDB {
  return {
    users: structuredClone(USERS),
    customers: structuredClone(CUSTOMERS),
    contracts: structuredClone(CONTRACTS),
    sales: structuredClone(SALES),
    products: structuredClone(PRODUCTS),
    stockMovements: structuredClone(STOCK_MOVEMENTS),
    suppliers: structuredClone(SUPPLIERS),
    notifications: structuredClone(NOTIFICATIONS),
    activityLogs: structuredClone(ACTIVITY_LOGS),
    settings: defaultSettings(),
  }
}

function loadDB(): AquaDB {
  if (typeof window === "undefined") return freshDB()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return freshDB()
    const parsed = JSON.parse(raw) as AquaDB
    if (!parsed.users || !parsed.customers) return freshDB()
    // Backfill settings fields added after this session's data was first persisted.
    parsed.settings = { ...defaultSettings(), ...parsed.settings }
    // Backfill order numbers for customers persisted before this field existed.
    let nextSeq = Math.max(0, ...parsed.customers.map((c) => parseOrderNumberSequence(c.orderNumber ?? ""))) + 1
    parsed.customers = parsed.customers.map((c) =>
      c.orderNumber ? c : { ...c, orderNumber: formatOrderNumber(nextSeq++) }
    )
    return parsed
  } catch {
    return freshDB()
  }
}

class Store {
  private db: AquaDB
  private hydrated = false

  constructor() {
    this.db = freshDB()
  }

  private ensureHydrated() {
    if (this.hydrated) return
    this.db = loadDB()
    this.hydrated = true
    this.syncExpiringContractNotifications()
    this.persist()
  }

  private persist() {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db))
  }

  get state(): AquaDB {
    this.ensureHydrated()
    return this.db
  }

  reset() {
    this.db = freshDB()
    this.hydrated = true
    this.persist()
  }

  replaceAll(next: AquaDB) {
    this.db = next
    this.hydrated = true
    this.persist()
  }

  private log(userId: string, action: string) {
    const now = new Date()
    const entry: ActivityLog = {
      id: generateId("log"),
      userId,
      action,
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
      ipAddress: "127.0.0.1",
    }
    this.state.activityLogs.unshift(entry)
  }

  private notify(n: Omit<AppNotification, "id" | "createdAt" | "isRead">) {
    this.state.notifications.unshift({
      ...n,
      id: generateId("ntf"),
      createdAt: new Date().toISOString().slice(0, 10),
      isRead: false,
    })
  }

  syncExpiringContractNotifications() {
    const existingIds = new Set(
      this.db.notifications
        .filter((n) => n.type === "expiring-contract")
        .map((n) => n.relatedEntityId)
    )
    for (const contract of this.db.contracts) {
      if (getContractStatus(contract.endDate) !== "expiring") continue
      if (existingIds.has(contract.id)) continue
      const customer = this.db.customers.find((c) => c.id === contract.customerId)
      this.db.notifications.unshift({
        id: generateId("ntf"),
        type: "expiring-contract",
        message: `Contract ${contract.contractNumber} for ${customer?.fullName ?? "customer"} expires within 30 days.`,
        isRead: false,
        createdAt: new Date().toISOString().slice(0, 10),
        relatedEntityId: contract.id,
      })
    }
  }

  // ---------- Customers ----------
  addCustomer(input: Omit<Customer, "id" | "createdAt" | "orderNumber">, actorId: string): Customer {
    const s = this.state
    const nextSequence = Math.max(0, ...s.customers.map((c) => parseOrderNumberSequence(c.orderNumber))) + 1
    const customer: Customer = {
      ...input,
      id: generateId("cus"),
      orderNumber: formatOrderNumber(nextSequence),
      createdAt: new Date().toISOString().slice(0, 10),
    }
    s.customers.unshift(customer)
    const contract: Contract = {
      id: generateId("con"),
      customerId: customer.id,
      contractNumber: customer.contractNumber,
      startDate: customer.contractStart,
      endDate: customer.contractEnd,
    }
    s.contracts.unshift(contract)
    this.log(actorId, "Customer Added")
    this.notify({ type: "new-customer", message: `${customer.fullName} registered as a new customer.`, relatedEntityId: customer.id })
    this.persist()
    return customer
  }

  updateCustomer(id: string, input: Partial<Omit<Customer, "id" | "createdAt" | "orderNumber">>, actorId: string): Customer {
    const s = this.state
    const idx = s.customers.findIndex((c) => c.id === id)
    if (idx === -1) throw new Error("Customer not found")
    s.customers[idx] = { ...s.customers[idx], ...input }
    const contractIdx = s.contracts.findIndex((c) => c.customerId === id)
    if (contractIdx !== -1 && (input.contractNumber || input.contractStart || input.contractEnd)) {
      s.contracts[contractIdx] = {
        ...s.contracts[contractIdx],
        contractNumber: input.contractNumber ?? s.contracts[contractIdx].contractNumber,
        startDate: input.contractStart ?? s.contracts[contractIdx].startDate,
        endDate: input.contractEnd ?? s.contracts[contractIdx].endDate,
      }
    }
    this.log(actorId, "Customer Edited")
    this.persist()
    return s.customers[idx]
  }

  deleteCustomer(id: string, actorId: string) {
    const s = this.state
    s.customers = s.customers.filter((c) => c.id !== id)
    s.contracts = s.contracts.filter((c) => c.customerId !== id)
    this.log(actorId, "Customer Deleted")
    this.persist()
  }

  // ---------- Products ----------
  addProduct(input: Omit<Product, "id" | "dateAdded" | "lastUpdated">, actorId: string): Product {
    const s = this.state
    const now = new Date().toISOString().slice(0, 10)
    const product: Product = { ...input, id: generateId("prd"), dateAdded: now, lastUpdated: now }
    s.products.unshift(product)
    this.log(actorId, "Inventory Updated")
    this.persist()
    return product
  }

  updateProduct(id: string, input: Partial<Omit<Product, "id" | "dateAdded">>, actorId: string): Product {
    const s = this.state
    const idx = s.products.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error("Product not found")
    s.products[idx] = { ...s.products[idx], ...input, lastUpdated: new Date().toISOString().slice(0, 10) }
    this.log(actorId, "Inventory Updated")
    this.checkStockNotification(s.products[idx])
    this.persist()
    return s.products[idx]
  }

  deleteProduct(id: string, actorId: string) {
    const s = this.state
    s.products = s.products.filter((p) => p.id !== id)
    this.log(actorId, "Inventory Updated")
    this.persist()
  }

  private checkStockNotification(product: Product) {
    const status = getStockStatus(product.stockQuantity, product.minStockLevel)
    if (status === "out-of-stock") {
      this.notify({ type: "out-of-stock", message: `${product.name} is out of stock.`, relatedEntityId: product.id })
    } else if (status === "low-stock") {
      this.notify({ type: "low-stock", message: `${product.name} is running low (${product.stockQuantity} left).`, relatedEntityId: product.id })
    }
  }

  // ---------- Stock Movements ----------
  addStockMovement(input: Omit<StockMovement, "id">, actorId: string): StockMovement {
    const s = this.state
    const movement: StockMovement = { ...input, id: generateId("mov") }
    s.stockMovements.unshift(movement)
    const product = s.products.find((p) => p.id === movement.productId)
    if (product) {
      product.stockQuantity += movement.quantityAdded - movement.quantityRemoved
      product.lastUpdated = new Date().toISOString().slice(0, 10)
      this.checkStockNotification(product)
    }
    this.log(actorId, "Inventory Updated")
    this.persist()
    return movement
  }

  // ---------- Sales ----------
  addSale(input: Omit<Sale, "id" | "invoiceNumber">, actorId: string): Sale {
    const s = this.state
    const invoiceNumber = `INV-${new Date().toISOString().slice(0, 7).replace("-", "")}-${String(1000 + s.sales.length)}`
    const sale: Sale = { ...input, id: generateId("sal"), invoiceNumber }
    s.sales.unshift(sale)

    for (const item of sale.items) {
      const product = s.products.find((p) => p.id === item.productId)
      if (!product) continue
      product.stockQuantity -= item.quantity
      product.lastUpdated = sale.date
      s.stockMovements.unshift({
        id: generateId("mov"),
        date: sale.date,
        productId: item.productId,
        quantityAdded: 0,
        quantityRemoved: item.quantity,
        reason: "Sale",
        userId: actorId,
        referenceNumber: invoiceNumber,
      })
      this.checkStockNotification(product)
    }

    this.log(actorId, "Sale Added")
    this.notify({ type: "new-sale", message: `New sale recorded: ${invoiceNumber}.`, relatedEntityId: sale.id })
    this.persist()
    return sale
  }

  updateSale(id: string, input: Partial<Omit<Sale, "id" | "invoiceNumber">>, actorId: string): Sale {
    const s = this.state
    const idx = s.sales.findIndex((sa) => sa.id === id)
    if (idx === -1) throw new Error("Sale not found")
    s.sales[idx] = { ...s.sales[idx], ...input }
    this.log(actorId, "Sale Edited")
    this.persist()
    return s.sales[idx]
  }

  deleteSale(id: string, actorId: string) {
    const s = this.state
    s.sales = s.sales.filter((sa) => sa.id !== id)
    this.log(actorId, "Sale Deleted")
    this.persist()
  }

  // ---------- Users ----------
  addUser(input: Omit<User, "id" | "createdAt">, actorId: string): User {
    const s = this.state
    const user: User = { ...input, id: generateId("usr"), createdAt: new Date().toISOString().slice(0, 10) }
    s.users.unshift(user)
    this.log(actorId, "User Created")
    this.persist()
    return user
  }

  updateUser(id: string, input: Partial<Omit<User, "id" | "createdAt">>, actorId: string): User {
    const s = this.state
    const idx = s.users.findIndex((u) => u.id === id)
    if (idx === -1) throw new Error("User not found")
    s.users[idx] = { ...s.users[idx], ...input }
    this.log(actorId, "User Edited")
    this.persist()
    return s.users[idx]
  }

  deleteUser(id: string, actorId: string) {
    const s = this.state
    s.users = s.users.filter((u) => u.id !== id)
    this.log(actorId, "User Deleted")
    this.persist()
  }

  // ---------- Notifications ----------
  markNotificationRead(id: string) {
    const s = this.state
    const idx = s.notifications.findIndex((n) => n.id === id)
    if (idx !== -1) s.notifications[idx] = { ...s.notifications[idx], isRead: true }
    this.persist()
  }

  markAllNotificationsRead() {
    const s = this.state
    s.notifications = s.notifications.map((n) => ({ ...n, isRead: true }))
    this.persist()
  }

  // ---------- Settings ----------
  updateSettings(input: Partial<CompanySettings>, actorId: string) {
    const s = this.state
    s.settings = { ...s.settings, ...input }
    this.log(actorId, "Settings Updated")
    this.persist()
    return s.settings
  }

  // ---------- Auth / logging ----------
  recordLogin(actorId: string) {
    this.log(actorId, "Logged in")
    this.persist()
  }

  recordLogout(actorId: string) {
    this.log(actorId, "Logged out")
    this.persist()
  }

  // ---------- Suppliers ----------
  addSupplier(input: Omit<Supplier, "id">, actorId: string): Supplier {
    const s = this.state
    const supplier: Supplier = { ...input, id: generateId("sup") }
    s.suppliers.unshift(supplier)
    this.log(actorId, "Inventory Updated")
    this.persist()
    return supplier
  }
}

export const store = new Store()
