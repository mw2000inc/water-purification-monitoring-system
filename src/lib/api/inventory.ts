import { supabase } from "@/lib/supabase/client"
import { logActivity } from "@/lib/api/activity"
import type { Product, StockMovement, Supplier } from "@/lib/types"

type ProductRow = {
  id: string
  name: string
  category: string
  supplier_id: string
  sku: string
  barcode: string | null
  stock_quantity: number
  min_stock_level: number
  purchase_price: number
  selling_price: number
  date_added: string
  last_updated: string
}

function productFromRow(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    supplierId: row.supplier_id,
    sku: row.sku,
    barcode: row.barcode ?? undefined,
    stockQuantity: row.stock_quantity,
    minStockLevel: row.min_stock_level,
    purchasePrice: Number(row.purchase_price),
    sellingPrice: Number(row.selling_price),
    dateAdded: row.date_added,
    lastUpdated: row.last_updated,
  }
}

function productToRow(input: Partial<Omit<Product, "id" | "dateAdded" | "lastUpdated">>) {
  const row: Record<string, unknown> = {}
  if (input.name !== undefined) row.name = input.name
  if (input.category !== undefined) row.category = input.category
  if (input.supplierId !== undefined) row.supplier_id = input.supplierId
  if (input.sku !== undefined) row.sku = input.sku
  if (input.barcode !== undefined) row.barcode = input.barcode || null
  if (input.stockQuantity !== undefined) row.stock_quantity = input.stockQuantity
  if (input.minStockLevel !== undefined) row.min_stock_level = input.minStockLevel
  if (input.purchasePrice !== undefined) row.purchase_price = input.purchasePrice
  if (input.sellingPrice !== undefined) row.selling_price = input.sellingPrice
  return row
}

export async function listProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from("products").select("*").order("date_added", { ascending: false })
  if (error) throw error
  return (data as ProductRow[]).map(productFromRow)
}

export async function createProduct(
  input: Omit<Product, "id" | "dateAdded" | "lastUpdated">,
  actorId: string
): Promise<Product> {
  const { data, error } = await supabase.from("products").insert(productToRow(input)).select().single()
  if (error) throw error
  await logActivity(actorId, "Inventory Updated")
  return productFromRow(data as ProductRow)
}

export async function updateProduct(
  id: string,
  input: Partial<Omit<Product, "id" | "dateAdded">>,
  actorId: string
): Promise<Product> {
  const row = { ...productToRow(input), last_updated: new Date().toISOString().slice(0, 10) }
  const { data, error } = await supabase.from("products").update(row).eq("id", id).select().single()
  if (error) throw error
  await logActivity(actorId, "Inventory Updated")
  return productFromRow(data as ProductRow)
}

export async function deleteProduct(id: string, actorId: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id)
  if (error) throw error
  await logActivity(actorId, "Inventory Updated")
}

export async function listSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase.from("suppliers").select("*").order("name")
  if (error) throw error
  return data as Supplier[]
}

export async function createSupplier(input: Omit<Supplier, "id">, actorId: string): Promise<Supplier> {
  const { data, error } = await supabase.from("suppliers").insert(input).select().single()
  if (error) throw error
  await logActivity(actorId, "Inventory Updated")
  return data as Supplier
}

type StockMovementRow = {
  id: string
  date: string
  product_id: string
  quantity_added: number
  quantity_removed: number
  reason: string
  user_id: string
  reference_number: string
}

function movementFromRow(row: StockMovementRow): StockMovement {
  return {
    id: row.id,
    date: row.date,
    productId: row.product_id,
    quantityAdded: row.quantity_added,
    quantityRemoved: row.quantity_removed,
    reason: row.reason as StockMovement["reason"],
    userId: row.user_id,
    referenceNumber: row.reference_number,
  }
}

export async function listStockMovements(): Promise<StockMovement[]> {
  const { data, error } = await supabase.from("stock_movements").select("*").order("date", { ascending: false })
  if (error) throw error
  return (data as StockMovementRow[]).map(movementFromRow)
}

export async function addStockMovement(input: Omit<StockMovement, "id">, actorId: string): Promise<StockMovement> {
  const { data, error } = await supabase
    .from("stock_movements")
    .insert({
      date: input.date,
      product_id: input.productId,
      quantity_added: input.quantityAdded,
      quantity_removed: input.quantityRemoved,
      reason: input.reason,
      user_id: input.userId,
      reference_number: input.referenceNumber,
    })
    .select()
    .single()
  if (error) throw error
  await logActivity(actorId, "Inventory Updated")
  return movementFromRow(data as StockMovementRow)
}
