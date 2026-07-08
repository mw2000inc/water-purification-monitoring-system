import { store } from "@/lib/mock/store"
import { delay } from "@/lib/api/delay"
import type { Product, StockMovement, Supplier } from "@/lib/types"

export async function listProducts(): Promise<Product[]> {
  return delay([...store.state.products])
}

export async function createProduct(input: Omit<Product, "id" | "dateAdded" | "lastUpdated">, actorId: string): Promise<Product> {
  return delay(store.addProduct(input, actorId))
}

export async function updateProduct(
  id: string,
  input: Partial<Omit<Product, "id" | "dateAdded">>,
  actorId: string
): Promise<Product> {
  return delay(store.updateProduct(id, input, actorId))
}

export async function deleteProduct(id: string, actorId: string): Promise<void> {
  store.deleteProduct(id, actorId)
  return delay(undefined)
}

export async function listSuppliers(): Promise<Supplier[]> {
  return delay([...store.state.suppliers])
}

export async function listStockMovements(): Promise<StockMovement[]> {
  return delay([...store.state.stockMovements])
}

export async function addStockMovement(
  input: Omit<StockMovement, "id">,
  actorId: string
): Promise<StockMovement> {
  return delay(store.addStockMovement(input, actorId))
}
