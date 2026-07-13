import { supabase } from "@/lib/supabase/client"
import { logActivity } from "@/lib/api/activity"
import type { Customer } from "@/lib/types"

type CustomerRow = {
  id: string
  order_number: string
  full_name: string
  company_name: string | null
  contract_number: string
  contract_start: string
  contract_end: string
  address: string
  email: string
  contact_number: string
  dispenser_type: string
  filter_installed: boolean
  installed_date: string | null
  assigned_technician: string
  notes: string | null
  created_at: string
}

function fromRow(row: CustomerRow): Customer {
  return {
    id: row.id,
    orderNumber: row.order_number,
    fullName: row.full_name,
    companyName: row.company_name ?? undefined,
    contractNumber: row.contract_number,
    contractStart: row.contract_start,
    contractEnd: row.contract_end,
    address: row.address,
    email: row.email,
    contactNumber: row.contact_number,
    dispenserType: row.dispenser_type,
    filterInstalled: row.filter_installed,
    installedDate: row.installed_date ?? undefined,
    assignedTechnician: row.assigned_technician,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  }
}

function toRow(input: Partial<Omit<Customer, "id" | "createdAt" | "orderNumber">>) {
  const row: Record<string, unknown> = {}
  if (input.fullName !== undefined) row.full_name = input.fullName
  if (input.companyName !== undefined) row.company_name = input.companyName || null
  if (input.contractNumber !== undefined) row.contract_number = input.contractNumber
  if (input.contractStart !== undefined) row.contract_start = input.contractStart
  if (input.contractEnd !== undefined) row.contract_end = input.contractEnd
  if (input.address !== undefined) row.address = input.address
  if (input.email !== undefined) row.email = input.email
  if (input.contactNumber !== undefined) row.contact_number = input.contactNumber
  if (input.dispenserType !== undefined) row.dispenser_type = input.dispenserType
  if (input.filterInstalled !== undefined) row.filter_installed = input.filterInstalled
  if (input.installedDate !== undefined) row.installed_date = input.installedDate || null
  if (input.assignedTechnician !== undefined) row.assigned_technician = input.assignedTechnician
  if (input.notes !== undefined) row.notes = input.notes || null
  return row
}

export async function listCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return (data as CustomerRow[]).map(fromRow)
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  const { data, error } = await supabase.from("customers").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  return data ? fromRow(data as CustomerRow) : undefined
}

export async function createCustomer(
  // contractNumber is optional on create — the DB auto-fills it from order_number
  // if omitted (see the set_customer_order_number trigger).
  input: Omit<Customer, "id" | "createdAt" | "orderNumber" | "contractNumber"> & { contractNumber?: string },
  actorId: string
): Promise<Customer> {
  const { data, error } = await supabase.from("customers").insert(toRow(input)).select().single()
  if (error) throw error
  await logActivity(actorId, "Customer Added")
  return fromRow(data as CustomerRow)
}

export async function updateCustomer(
  id: string,
  input: Partial<Omit<Customer, "id" | "createdAt" | "orderNumber">>,
  actorId: string
): Promise<Customer> {
  const { data, error } = await supabase.from("customers").update(toRow(input)).eq("id", id).select().single()
  if (error) throw error
  await logActivity(actorId, "Customer Edited")
  return fromRow(data as CustomerRow)
}

export async function deleteCustomer(id: string, actorId: string): Promise<void> {
  const { error } = await supabase.from("customers").delete().eq("id", id)
  if (error) throw error
  await logActivity(actorId, "Customer Deleted")
}
