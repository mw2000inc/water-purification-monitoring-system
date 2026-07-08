import {
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isSameWeek,
  isSameYear,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns"
import type { Contract, Customer, Product, Sale, StockMovement } from "@/lib/types"
import { getContractStatus, getStockStatus } from "@/lib/utils"

export function dashboardSummary(
  customers: Customer[],
  contracts: Contract[],
  sales: Sale[],
  products: Product[],
  now: Date = new Date()
) {
  const activeContracts = contracts.filter((c) => getContractStatus(c.endDate, now) === "active").length
  const expiringContracts = contracts.filter((c) => getContractStatus(c.endDate, now) === "expiring").length
  const salesToday = sales.filter((s) => isSameDay(parseISO(s.date), now)).reduce((sum, s) => sum + s.totalAmount, 0)
  const salesThisMonth = sales
    .filter((s) => isSameMonth(parseISO(s.date), now))
    .reduce((sum, s) => sum + s.totalAmount, 0)
  const lowStock = products.filter((p) => getStockStatus(p.stockQuantity, p.minStockLevel) === "low-stock").length
  const outOfStock = products.filter((p) => getStockStatus(p.stockQuantity, p.minStockLevel) === "out-of-stock").length

  return {
    totalCustomers: customers.length,
    activeContracts,
    expiringContracts,
    salesToday,
    salesThisMonth,
    totalProducts: products.length,
    lowStock,
    outOfStock,
  }
}

export function monthlySalesSeries(sales: Sale[], months = 6, now: Date = new Date()) {
  const range = eachMonthOfInterval({ start: subMonths(now, months - 1), end: now })
  return range.map((m) => {
    const total = sales
      .filter((s) => isSameMonth(parseISO(s.date), m))
      .reduce((sum, s) => sum + s.totalAmount, 0)
    return { month: format(m, "MMM"), total }
  })
}

export function customerRegistrationSeries(customers: Customer[], months = 6, now: Date = new Date()) {
  const range = eachMonthOfInterval({ start: subMonths(now, months - 1), end: now })
  return range.map((m) => {
    const count = customers.filter((c) => isSameMonth(parseISO(c.createdAt), m)).length
    return { month: format(m, "MMM"), count }
  })
}

export function inventoryMovementSeries(movements: StockMovement[], months = 6, now: Date = new Date()) {
  const range = eachMonthOfInterval({ start: subMonths(now, months - 1), end: now })
  return range.map((m) => {
    const inRange = movements.filter((mv) => isSameMonth(parseISO(mv.date), m))
    return {
      month: format(m, "MMM"),
      added: inRange.reduce((sum, mv) => sum + mv.quantityAdded, 0),
      removed: inRange.reduce((sum, mv) => sum + mv.quantityRemoved, 0),
    }
  })
}

export function topSellingProducts(sales: Sale[], products: Product[], limit = 5) {
  const qtyByProduct = new Map<string, number>()
  sales.forEach((s) =>
    s.items.forEach((it) => {
      qtyByProduct.set(it.productId, (qtyByProduct.get(it.productId) ?? 0) + it.quantity)
    })
  )
  return Array.from(qtyByProduct.entries())
    .map(([productId, qty]) => ({
      name: products.find((p) => p.id === productId)?.name ?? "Unknown",
      qty,
    }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit)
}

export function topCustomers(sales: Sale[], customers: Customer[], limit = 5) {
  const totalByCustomer = new Map<string, number>()
  sales.forEach((s) => totalByCustomer.set(s.customerId, (totalByCustomer.get(s.customerId) ?? 0) + s.totalAmount))
  return Array.from(totalByCustomer.entries())
    .map(([customerId, total]) => ({
      name: customers.find((c) => c.id === customerId)?.fullName ?? "Unknown",
      total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

export function salesPeriodTotals(sales: Sale[], now: Date = new Date()) {
  const daily = sales.filter((s) => isSameDay(parseISO(s.date), now)).reduce((sum, s) => sum + s.totalAmount, 0)
  const weekly = sales
    .filter((s) => isSameWeek(parseISO(s.date), now, { weekStartsOn: 1 }))
    .reduce((sum, s) => sum + s.totalAmount, 0)
  const monthly = sales.filter((s) => isSameMonth(parseISO(s.date), now)).reduce((sum, s) => sum + s.totalAmount, 0)
  const annual = sales.filter((s) => isSameYear(parseISO(s.date), now)).reduce((sum, s) => sum + s.totalAmount, 0)
  return { daily, weekly, monthly, annual }
}

export function salesTrendSeries(sales: Sale[], days = 30, now: Date = new Date()) {
  const range = eachDayOfInterval({ start: subDays(now, days - 1), end: now })
  return range.map((d) => ({
    date: format(d, "MMM d"),
    total: sales.filter((s) => isSameDay(parseISO(s.date), d)).reduce((sum, s) => sum + s.totalAmount, 0),
  }))
}

export function revenueSeries(sales: Sale[], months = 6, now: Date = new Date()) {
  const range = eachMonthOfInterval({ start: subMonths(now, months - 1), end: now })
  return range.map((m) => {
    const inMonth = sales.filter((s) => isSameMonth(parseISO(s.date), m))
    return {
      month: format(m, "MMM"),
      revenue: inMonth.reduce((sum, s) => sum + s.totalAmount, 0),
      discount: inMonth.reduce((sum, s) => sum + s.discount, 0),
    }
  })
}

export function productSalesDistribution(sales: Sale[], products: Product[], limit = 6) {
  const revenueByProduct = new Map<string, number>()
  sales.forEach((s) =>
    s.items.forEach((it) => {
      revenueByProduct.set(it.productId, (revenueByProduct.get(it.productId) ?? 0) + it.subtotal)
    })
  )
  const sorted = Array.from(revenueByProduct.entries())
    .map(([productId, revenue]) => ({ name: products.find((p) => p.id === productId)?.name ?? "Unknown", revenue }))
    .sort((a, b) => b.revenue - a.revenue)
  const top = sorted.slice(0, limit)
  const rest = sorted.slice(limit).reduce((sum, x) => sum + x.revenue, 0)
  return rest > 0 ? [...top, { name: "Others", revenue: rest }] : top
}

export function isWithinCurrentMonth(dateStr: string, now: Date = new Date()) {
  return isSameMonth(parseISO(dateStr), now)
}

export function monthBounds(now: Date = new Date()) {
  return { start: startOfMonth(now), end: endOfMonth(now) }
}
