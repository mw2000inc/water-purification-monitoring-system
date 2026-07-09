import { supabase } from "@/lib/supabase/client"
import { logActivity } from "@/lib/api/activity"
import type { Sale, SaleItem } from "@/lib/types"

type SaleItemRow = {
  id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
}

type SaleRow = {
  id: string
  invoice_number: string
  date: string
  customer_id: string
  sales_rep_id: string
  discount: number
  total_amount: number
  payment_method: string
  payment_status: string
  sale_items: SaleItemRow[]
}

function itemFromRow(row: SaleItemRow): SaleItem {
  return {
    id: row.id,
    productId: row.product_id,
    quantity: row.quantity,
    unitPrice: Number(row.unit_price),
    subtotal: Number(row.subtotal),
  }
}

function fromRow(row: SaleRow): Sale {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    date: row.date,
    customerId: row.customer_id,
    salesRepId: row.sales_rep_id,
    items: (row.sale_items ?? []).map(itemFromRow),
    discount: Number(row.discount),
    totalAmount: Number(row.total_amount),
    paymentMethod: row.payment_method as Sale["paymentMethod"],
    paymentStatus: row.payment_status as Sale["paymentStatus"],
  }
}

function saleFieldsToRow(input: Partial<Omit<Sale, "id" | "invoiceNumber" | "items">>) {
  const row: Record<string, unknown> = {}
  if (input.date !== undefined) row.date = input.date
  if (input.customerId !== undefined) row.customer_id = input.customerId
  if (input.salesRepId !== undefined) row.sales_rep_id = input.salesRepId
  if (input.discount !== undefined) row.discount = input.discount
  if (input.totalAmount !== undefined) row.total_amount = input.totalAmount
  if (input.paymentMethod !== undefined) row.payment_method = input.paymentMethod
  if (input.paymentStatus !== undefined) row.payment_status = input.paymentStatus
  return row
}

const SALE_SELECT = "*, sale_items(*)"

export async function listSales(): Promise<Sale[]> {
  const { data, error } = await supabase.from("sales").select(SALE_SELECT).order("date", { ascending: false })
  if (error) throw error
  return (data as SaleRow[]).map(fromRow)
}

export async function getSale(id: string): Promise<Sale | undefined> {
  const { data, error } = await supabase.from("sales").select(SALE_SELECT).eq("id", id).maybeSingle()
  if (error) throw error
  return data ? fromRow(data as SaleRow) : undefined
}

export async function createSale(input: Omit<Sale, "id" | "invoiceNumber">, actorId: string): Promise<Sale> {
  const { data: sale, error } = await supabase
    .from("sales")
    .insert(saleFieldsToRow(input))
    .select()
    .single()
  if (error) throw error

  const itemRows = input.items.map((it) => ({
    sale_id: sale.id,
    product_id: it.productId,
    quantity: it.quantity,
    unit_price: it.unitPrice,
    subtotal: it.subtotal,
  }))
  // Each insert fires a trigger that deducts stock and records a "Sale" stock movement.
  const { error: itemsError } = await supabase.from("sale_items").insert(itemRows)
  if (itemsError) throw itemsError

  await logActivity(actorId, "Sale Added")
  return (await getSale(sale.id)) as Sale
}

// Editing a sale only ever updates existing line items in place (quantity/price),
// matching the mock store's original behavior — stock is never recalculated here.
export async function updateSale(
  id: string,
  input: Partial<Omit<Sale, "id" | "invoiceNumber">>,
  actorId: string
): Promise<Sale> {
  const { items, ...saleFields } = input
  if (Object.keys(saleFields).length > 0) {
    const { error } = await supabase.from("sales").update(saleFieldsToRow(saleFields)).eq("id", id)
    if (error) throw error
  }
  if (items) {
    for (const item of items) {
      if (!item.id) continue
      await supabase
        .from("sale_items")
        .update({ product_id: item.productId, quantity: item.quantity, unit_price: item.unitPrice, subtotal: item.subtotal })
        .eq("id", item.id)
    }
  }
  await logActivity(actorId, "Sale Edited")
  return (await getSale(id)) as Sale
}

export async function deleteSale(id: string, actorId: string): Promise<void> {
  const { error } = await supabase.from("sales").delete().eq("id", id)
  if (error) throw error
  await logActivity(actorId, "Sale Deleted")
}
