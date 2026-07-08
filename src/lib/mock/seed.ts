import type {
  ActivityLog,
  AppNotification,
  Contract,
  Customer,
  Product,
  Sale,
  SaleItem,
  StockMovement,
  Supplier,
  User,
} from "@/lib/types"
import { formatOrderNumber, generateId, getContractStatus } from "@/lib/utils"
import { addDays, format, subDays, subMonths } from "date-fns"

// Deterministic PRNG so seed data is stable within a session.
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(42)
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min
const iso = (d: Date) => format(d, "yyyy-MM-dd")

const NOW = new Date()

// ---------- Users ----------
export const USERS: User[] = [
  { id: "usr-001", name: "Marco Villanueva", email: "admin@aquatrack.ph", role: "admin", createdAt: iso(subMonths(NOW, 18)) },
  { id: "usr-002", name: "Bea Santos", email: "staff@aquatrack.ph", role: "staff", createdAt: iso(subMonths(NOW, 15)) },
  { id: "usr-003", name: "Carlo Reyes", email: "carlo.reyes@aquatrack.ph", role: "staff", createdAt: iso(subMonths(NOW, 12)) },
  { id: "usr-004", name: "Dianne Cruz", email: "dianne.cruz@aquatrack.ph", role: "staff", createdAt: iso(subMonths(NOW, 10)) },
  { id: "usr-005", name: "Erwin Tan", email: "erwin.tan@aquatrack.ph", role: "staff", createdAt: iso(subMonths(NOW, 8)) },
  { id: "usr-006", name: "Grace Mendoza", email: "grace.mendoza@aquatrack.ph", role: "admin", createdAt: iso(subMonths(NOW, 20)) },
]

// ---------- Suppliers ----------
export const SUPPLIERS: Supplier[] = [
  { id: "sup-001", name: "PureFlow Industries", contact: "0917 555 0101", email: "sales@pureflow.ph", address: "12 Del Pilar St, Makati City" },
  { id: "sup-002", name: "AquaTech Philippines", contact: "0917 555 0202", email: "orders@aquatech.ph", address: "88 Aurora Blvd, Quezon City" },
  { id: "sup-003", name: "HydroSource Supply Co.", contact: "0917 555 0303", email: "info@hydrosource.ph", address: "45 Ortigas Ave, Pasig City" },
  { id: "sup-004", name: "Crystal Clear Traders", contact: "0917 555 0404", email: "support@crystalclear.ph", address: "9 Roxas Blvd, Manila" },
  { id: "sup-005", name: "BlueWave Distributors", contact: "0917 555 0505", email: "sales@bluewave.ph", address: "21 Marcos Hwy, Antipolo" },
]

// ---------- Products ----------
export const PRODUCTS: Product[] = [
  { id: "prd-001", name: "Bottom Load Water Dispenser", category: "Dispensers", supplierId: "sup-001", sku: "DSP-BL-001", barcode: "4801234567890", stockQuantity: 42, minStockLevel: 10, purchasePrice: 3200, sellingPrice: 4999, dateAdded: iso(subMonths(NOW, 14)), lastUpdated: iso(subDays(NOW, 3)) },
  { id: "prd-002", name: "Top Load Hot & Cold Dispenser", category: "Dispensers", supplierId: "sup-001", sku: "DSP-TL-002", barcode: "4801234567891", stockQuantity: 18, minStockLevel: 8, purchasePrice: 2800, sellingPrice: 4399, dateAdded: iso(subMonths(NOW, 14)), lastUpdated: iso(subDays(NOW, 5)) },
  { id: "prd-003", name: "Countertop Firehose Purifier", category: "Purifiers", supplierId: "sup-002", sku: "PUR-CT-003", barcode: "4801234567892", stockQuantity: 6, minStockLevel: 8, purchasePrice: 5200, sellingPrice: 7999, dateAdded: iso(subMonths(NOW, 12)), lastUpdated: iso(subDays(NOW, 1)) },
  { id: "prd-004", name: "5-Stage RO Filter System", category: "Filters", supplierId: "sup-002", sku: "FLT-RO-004", barcode: "4801234567893", stockQuantity: 25, minStockLevel: 10, purchasePrice: 4100, sellingPrice: 6499, dateAdded: iso(subMonths(NOW, 13)), lastUpdated: iso(subDays(NOW, 2)) },
  { id: "prd-005", name: "Replacement Carbon Filter Cartridge", category: "Filters", supplierId: "sup-003", sku: "FLT-CB-005", barcode: "4801234567894", stockQuantity: 120, minStockLevel: 30, purchasePrice: 180, sellingPrice: 349, dateAdded: iso(subMonths(NOW, 16)), lastUpdated: iso(subDays(NOW, 1)) },
  { id: "prd-006", name: "Sediment Pre-Filter Cartridge", category: "Filters", supplierId: "sup-003", sku: "FLT-SD-006", barcode: "4801234567895", stockQuantity: 95, minStockLevel: 25, purchasePrice: 150, sellingPrice: 299, dateAdded: iso(subMonths(NOW, 16)), lastUpdated: iso(subDays(NOW, 4)) },
  { id: "prd-007", name: "RO Membrane 75 GPD", category: "Filters", supplierId: "sup-002", sku: "FLT-MB-007", barcode: "4801234567896", stockQuantity: 14, minStockLevel: 15, purchasePrice: 950, sellingPrice: 1599, dateAdded: iso(subMonths(NOW, 11)), lastUpdated: iso(subDays(NOW, 6)) },
  { id: "prd-008", name: "Alkaline Mineral Filter", category: "Filters", supplierId: "sup-004", sku: "FLT-AK-008", barcode: "4801234567897", stockQuantity: 33, minStockLevel: 12, purchasePrice: 620, sellingPrice: 999, dateAdded: iso(subMonths(NOW, 9)), lastUpdated: iso(subDays(NOW, 2)) },
  { id: "prd-009", name: "UV Sterilizer Unit", category: "Purifiers", supplierId: "sup-002", sku: "PUR-UV-009", barcode: "4801234567898", stockQuantity: 9, minStockLevel: 10, purchasePrice: 2400, sellingPrice: 3799, dateAdded: iso(subMonths(NOW, 10)), lastUpdated: iso(subDays(NOW, 3)) },
  { id: "prd-010", name: "Ozone Generator Add-on", category: "Purifiers", supplierId: "sup-004", sku: "PUR-OZ-010", barcode: "4801234567899", stockQuantity: 0, minStockLevel: 6, purchasePrice: 1800, sellingPrice: 2999, dateAdded: iso(subMonths(NOW, 7)), lastUpdated: iso(subDays(NOW, 9)) },
  { id: "prd-011", name: "5-Gallon Water Container (Refillable)", category: "Accessories", supplierId: "sup-005", sku: "ACC-GL-011", barcode: "4801234567800", stockQuantity: 210, minStockLevel: 50, purchasePrice: 90, sellingPrice: 180, dateAdded: iso(subMonths(NOW, 17)), lastUpdated: iso(subDays(NOW, 1)) },
  { id: "prd-012", name: "Dispenser Power Adapter", category: "Accessories", supplierId: "sup-005", sku: "ACC-PW-012", barcode: "4801234567801", stockQuantity: 47, minStockLevel: 15, purchasePrice: 220, sellingPrice: 399, dateAdded: iso(subMonths(NOW, 15)), lastUpdated: iso(subDays(NOW, 8)) },
  { id: "prd-013", name: "Water Quality Testing Kit", category: "Accessories", supplierId: "sup-003", sku: "ACC-TK-013", barcode: "4801234567802", stockQuantity: 3, minStockLevel: 10, purchasePrice: 260, sellingPrice: 499, dateAdded: iso(subMonths(NOW, 6)), lastUpdated: iso(subDays(NOW, 2)) },
  { id: "prd-014", name: "Ceramic Filter Candle", category: "Filters", supplierId: "sup-004", sku: "FLT-CR-014", barcode: "4801234567803", stockQuantity: 58, minStockLevel: 20, purchasePrice: 210, sellingPrice: 379, dateAdded: iso(subMonths(NOW, 12)), lastUpdated: iso(subDays(NOW, 5)) },
  { id: "prd-015", name: "Faucet Mount Filter", category: "Filters", supplierId: "sup-001", sku: "FLT-FM-015", barcode: "4801234567804", stockQuantity: 8, minStockLevel: 10, purchasePrice: 340, sellingPrice: 599, dateAdded: iso(subMonths(NOW, 8)), lastUpdated: iso(subDays(NOW, 3)) },
]

// ---------- Customers + Contracts ----------
const FIRST_NAMES = ["Juan", "Maria", "Jose", "Ana", "Pedro", "Carmen", "Antonio", "Rosa", "Manuel", "Elena", "Ricardo", "Luz", "Fernando", "Josefa", "Rafael", "Teresita", "Miguel", "Corazon", "Eduardo", "Remedios", "Roberto", "Imelda", "Alfredo", "Leonor", "Danilo", "Perla", "Arturo", "Susana", "Ramon", "Victoria", "Ernesto", "Gloria", "Vicente", "Adoracion", "Nestor", "Fe", "Rodrigo", "Salve", "Bayani", "Milagros"]
const LAST_NAMES = ["Dela Cruz", "Reyes", "Bautista", "Ocampo", "Garcia", "Mendoza", "Torres", "Ramos", "Flores", "Villanueva", "Castillo", "Santos", "Aquino", "Del Rosario", "Pascual", "Gonzales", "Manalo", "Fernandez", "Domingo", "Salazar"]
const COMPANY_SUFFIX = ["Corp.", "Trading Inc.", "Enterprises", "Holdings", "Foods Co.", "Realty Inc.", "Logistics Corp.", "Services Inc."]
const COMPANY_ROOT = ["Golden Harvest", "Metro", "Sunrise", "Pacific Rim", "Emerald", "Skyline", "Northstar", "Union", "Prime", "Coastal"]
const DISPENSER_TYPES = ["Bottom Load", "Top Load Hot & Cold", "Countertop POU", "Under-sink RO", "Whole-house System"]
const TECHNICIANS = ["Kevin Aguilar", "Mark Villaruel", "Jerome Sison", "Paolo Ignacio", "Rico Bautista"]
const BARANGAYS = ["San Isidro", "Santo Nino", "Poblacion", "San Antonio", "Bagong Silang", "Malanday", "San Roque", "Santa Cruz", "Bagumbayan", "San Jose"]
const CITIES = ["Quezon City", "Makati City", "Pasig City", "Taguig City", "Manila", "Antipolo City", "Cainta", "Marikina City", "Muntinlupa City", "Paranaque City"]

export const CUSTOMERS: Customer[] = Array.from({ length: 48 }).map((_, i) => {
  const first = pick(FIRST_NAMES)
  const last = pick(LAST_NAMES)
  const fullName = `${first} ${last}`
  const isCompany = rand() < 0.32
  const companyName = isCompany ? `${pick(COMPANY_ROOT)} ${pick(COMPANY_SUFFIX)}` : undefined
  const createdAt = subDays(NOW, int(3, 540))
  // Contract length 12-24 months, start near registration, spread end dates across expired/expiring/active
  const contractStart = addDays(createdAt, int(0, 14))
  const contractLengthDays = int(365, 730)
  const contractEnd = addDays(contractStart, contractLengthDays)
  const id = `cus-${String(i + 1).padStart(3, "0")}`
  return {
    id,
    orderNumber: formatOrderNumber(i + 1),
    fullName,
    companyName,
    contractNumber: `CN-${format(contractStart, "yyyy")}-${String(1000 + i)}`,
    contractStart: iso(contractStart),
    contractEnd: iso(contractEnd),
    address: `${int(1, 999)} ${pick(BARANGAYS)} St., Brgy. ${pick(BARANGAYS)}, ${pick(CITIES)}`,
    email: `${first.toLowerCase()}.${last.toLowerCase().replace(/\s+/g, "")}${i}@mail.com`,
    contactNumber: `09${int(150000000, 999999999)}`,
    dispenserType: pick(DISPENSER_TYPES),
    filterInstalled: rand() < 0.78,
    installedDate: iso(contractStart),
    assignedTechnician: pick(TECHNICIANS),
    notes: rand() < 0.25 ? pick([
      "Prefers morning maintenance visits.",
      "Requested filter upgrade next cycle.",
      "Gate code needed for access.",
      "Long-time customer, priority support.",
      "Follow up on late payment.",
    ]) : undefined,
    createdAt: iso(createdAt),
  }
})

export const CONTRACTS: Contract[] = CUSTOMERS.map((c) => ({
  id: `con-${c.id.split("-")[1]}`,
  customerId: c.id,
  contractNumber: c.contractNumber,
  startDate: c.contractStart,
  endDate: c.contractEnd,
}))

// ---------- Sales ----------
const PAYMENT_METHODS: Sale["paymentMethod"][] = ["Cash", "Bank Transfer", "Credit Card", "GCash", "Check"]
const STAFF_IDS = USERS.filter((u) => u.role === "staff" || u.role === "admin").map((u) => u.id)

function buildSaleItems(): SaleItem[] {
  const count = int(1, 3)
  const usedProducts = new Set<string>()
  const items: SaleItem[] = []
  for (let i = 0; i < count; i++) {
    let product = pick(PRODUCTS)
    let guard = 0
    while (usedProducts.has(product.id) && guard < 10) {
      product = pick(PRODUCTS)
      guard++
    }
    usedProducts.add(product.id)
    const quantity = int(1, 4)
    items.push({
      id: generateId("sit"),
      productId: product.id,
      quantity,
      unitPrice: product.sellingPrice,
      subtotal: quantity * product.sellingPrice,
    })
  }
  return items
}

export const SALES: Sale[] = Array.from({ length: 130 }).map((_, i) => {
  const date = subDays(NOW, int(0, 182))
  const items = buildSaleItems()
  const gross = items.reduce((s, it) => s + it.subtotal, 0)
  const discountPct = pick([0, 0, 0, 5, 10])
  const discount = Math.round(gross * (discountPct / 100))
  const totalAmount = gross - discount
  const paymentStatus: Sale["paymentStatus"] = rand() < 0.8 ? "Paid" : rand() < 0.6 ? "Pending" : rand() < 0.5 ? "Overdue" : "Partial"
  return {
    id: `sal-${String(i + 1).padStart(4, "0")}`,
    invoiceNumber: `INV-${format(date, "yyyyMM")}-${String(1000 + i)}`,
    date: iso(date),
    customerId: pick(CUSTOMERS).id,
    salesRepId: pick(STAFF_IDS),
    items,
    discount,
    totalAmount,
    paymentMethod: pick(PAYMENT_METHODS),
    paymentStatus,
  }
}).sort((a, b) => (a.date < b.date ? 1 : -1))

// ---------- Stock Movements ----------
export const STOCK_MOVEMENTS: StockMovement[] = []
SALES.forEach((sale) => {
  sale.items.forEach((item) => {
    STOCK_MOVEMENTS.push({
      id: generateId("mov"),
      date: sale.date,
      productId: item.productId,
      quantityAdded: 0,
      quantityRemoved: item.quantity,
      reason: "Sale",
      userId: sale.salesRepId,
      referenceNumber: sale.invoiceNumber,
    })
  })
})
// Historic restocks + an opening-stock entry per product. The opening amount is
// sized so the running total never dips negative even while sales are drawing
// down ahead of a later restock, and a final adjustment (if any gap remains)
// reconciles the ledger to exactly match the product's current stockQuantity.
PRODUCTS.forEach((p) => {
  const salesForProduct = STOCK_MOVEMENTS.filter((m) => m.productId === p.id && m.reason === "Sale")

  const restockCount = int(2, 4)
  const restocks = Array.from({ length: restockCount }, () => ({
    date: subDays(NOW, int(15, 170)),
    quantity: int(20, 80),
  }))

  const events = [
    ...salesForProduct.map((m) => ({ date: m.date, delta: -m.quantityRemoved })),
    ...restocks.map((r) => ({ date: iso(r.date), delta: r.quantity })),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  const MIN_OPENING = 15
  let running = 0
  let minRunning = 0
  for (const e of events) {
    running += e.delta
    if (running < minRunning) minRunning = running
  }
  const opening = Math.max(MIN_OPENING, MIN_OPENING - minRunning)
  const totalDelta = events.reduce((sum, e) => sum + e.delta, 0)
  const adjustment = p.stockQuantity - (opening + totalDelta)

  STOCK_MOVEMENTS.push({
    id: generateId("mov"),
    date: p.dateAdded,
    productId: p.id,
    quantityAdded: opening,
    quantityRemoved: 0,
    reason: "Restock",
    userId: pick(USERS.filter((u) => u.role === "admin")).id,
    referenceNumber: `PO-${int(10000, 99999)}`,
  })

  restocks.forEach((r) => {
    STOCK_MOVEMENTS.push({
      id: generateId("mov"),
      date: iso(r.date),
      productId: p.id,
      quantityAdded: r.quantity,
      quantityRemoved: 0,
      reason: "Restock",
      userId: pick(USERS.filter((u) => u.role === "admin")).id,
      referenceNumber: `PO-${int(10000, 99999)}`,
    })
  })

  if (adjustment !== 0) {
    STOCK_MOVEMENTS.push({
      id: generateId("mov"),
      date: iso(NOW),
      productId: p.id,
      quantityAdded: adjustment > 0 ? adjustment : 0,
      quantityRemoved: adjustment < 0 ? -adjustment : 0,
      reason: "Adjustment",
      userId: pick(USERS.filter((u) => u.role === "admin")).id,
      referenceNumber: `ADJ-${int(1000, 9999)}`,
    })
  }
})
STOCK_MOVEMENTS.sort((a, b) => (a.date < b.date ? 1 : -1))

// ---------- Notifications ----------
export const NOTIFICATIONS: AppNotification[] = []
PRODUCTS.forEach((p) => {
  if (p.stockQuantity <= 0) {
    NOTIFICATIONS.push({ id: generateId("ntf"), type: "out-of-stock", message: `${p.name} is out of stock.`, isRead: false, createdAt: iso(subDays(NOW, int(0, 3))), relatedEntityId: p.id })
  } else if (p.stockQuantity <= p.minStockLevel) {
    NOTIFICATIONS.push({ id: generateId("ntf"), type: "low-stock", message: `${p.name} is running low (${p.stockQuantity} left).`, isRead: false, createdAt: iso(subDays(NOW, int(0, 3))), relatedEntityId: p.id })
  }
})
CONTRACTS.forEach((c) => {
  if (getContractStatus(c.endDate, NOW) === "expiring") {
    const cust = CUSTOMERS.find((x) => x.id === c.customerId)
    NOTIFICATIONS.push({ id: generateId("ntf"), type: "expiring-contract", message: `Contract ${c.contractNumber} for ${cust?.fullName} expires soon.`, isRead: false, createdAt: iso(subDays(NOW, int(0, 5))), relatedEntityId: c.id })
  }
})
SALES.slice(0, 5).forEach((s) => {
  NOTIFICATIONS.push({ id: generateId("ntf"), type: "new-sale", message: `New sale recorded: ${s.invoiceNumber}.`, isRead: true, createdAt: s.date, relatedEntityId: s.id })
})
CUSTOMERS.slice(0, 3).forEach((c) => {
  NOTIFICATIONS.push({ id: generateId("ntf"), type: "new-customer", message: `${c.fullName} registered as a new customer.`, isRead: true, createdAt: c.createdAt, relatedEntityId: c.id })
})
NOTIFICATIONS.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

// ---------- Activity Logs ----------
const ACTIONS = [
  "Logged in",
  "Logged out",
  "Customer Edited",
  "Customer Added",
  "Sale Added",
  "Inventory Updated",
  "User Created",
  "Report Generated",
]
export const ACTIVITY_LOGS: ActivityLog[] = Array.from({ length: 45 }).map(() => {
  const date = subDays(NOW, int(0, 90))
  return {
    id: generateId("log"),
    userId: pick(USERS).id,
    action: pick(ACTIONS),
    date: iso(date),
    time: `${String(int(7, 19)).padStart(2, "0")}:${String(int(0, 59)).padStart(2, "0")}`,
    ipAddress: `192.168.1.${int(2, 254)}`,
  }
}).sort((a, b) => (a.date === b.date ? (a.time < b.time ? 1 : -1) : a.date < b.date ? 1 : -1))
