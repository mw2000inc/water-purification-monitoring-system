import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { addMonths, differenceInCalendarDays, format, parseISO } from "date-fns"
import type { ContractStatus, StockStatus } from "@/lib/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const EXPIRY_WINDOW_DAYS = 30

export function getContractStatus(endDate: string, today: Date = new Date()): ContractStatus {
  const days = differenceInCalendarDays(parseISO(endDate), today)
  if (days < 0) return "expired"
  if (days <= EXPIRY_WINDOW_DAYS) return "expiring"
  return "active"
}

export function daysUntil(date: string, today: Date = new Date()): number {
  return differenceInCalendarDays(parseISO(date), today)
}

// Rolls a date forward in 3-month increments so it always reflects the next quarterly checkpoint.
// Compares by calendar day (not exact timestamp) so "today" itself counts as reached, not before.
export function getNextQuarterlyDate(anchorDate: string, today: Date = new Date()): Date {
  let next = parseISO(anchorDate)
  while (differenceInCalendarDays(next, today) < 0) {
    next = addMonths(next, 3)
  }
  return next
}

export function getStockStatus(quantity: number, minLevel: number): StockStatus {
  if (quantity <= 0) return "out-of-stock"
  if (quantity <= minLevel) return "low-stock"
  return "in-stock"
}

export function formatCurrency(value: number, currency = "PHP"): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatDate(date: string | Date, pattern = "MMM d, yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date
  return format(d, pattern)
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date
  return format(d, "MMM d, yyyy h:mm a")
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("")
}

export function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`
}

// SHA-256 via the browser's Web Crypto API — there's no real backend here, but
// passwords still shouldn't sit in localStorage as plain text.
export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

const ORDER_NUMBER_PREFIX = "SK001"

export function formatOrderNumber(sequence: number): string {
  return `${ORDER_NUMBER_PREFIX}-${String(sequence).padStart(4, "0")}`
}

// Reads the numeric sequence back out of a "SK001-0001" style order number.
export function parseOrderNumberSequence(orderNumber: string): number {
  const match = orderNumber.match(/(\d+)$/)
  return match ? parseInt(match[1], 10) : 0
}
