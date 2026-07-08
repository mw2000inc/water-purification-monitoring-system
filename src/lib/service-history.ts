import { addDays, isBefore, parseISO } from "date-fns"
import type { Customer } from "@/lib/types"

export interface ServiceVisit {
  date: string
  type: string
  technician: string
  notes: string
}

const VISIT_TYPES = [
  "Installation & Setup",
  "Routine Maintenance",
  "Filter Replacement",
  "Water Quality Check",
  "Repair Visit",
]

// Deterministic, derived service schedule (every ~90 days since contract start) — not a persisted entity.
export function getServiceHistory(customer: Customer, now: Date = new Date()): ServiceVisit[] {
  const start = parseISO(customer.contractStart)
  const end = isBefore(now, parseISO(customer.contractEnd)) ? now : parseISO(customer.contractEnd)
  const visits: ServiceVisit[] = []
  let cursor = start
  let i = 0
  while (!isBefore(end, cursor)) {
    visits.push({
      date: cursor.toISOString().slice(0, 10),
      type: i === 0 ? "Installation & Setup" : VISIT_TYPES[i % VISIT_TYPES.length],
      technician: customer.assignedTechnician,
      notes: i === 0 ? `${customer.dispenserType} unit installed.` : "Standard service completed, no issues reported.",
    })
    cursor = addDays(cursor, 90)
    i++
  }
  return visits.reverse()
}
