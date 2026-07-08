import { store } from "@/lib/mock/store"
import { delay } from "@/lib/api/delay"
import type { Sale } from "@/lib/types"

export async function listSales(): Promise<Sale[]> {
  return delay([...store.state.sales])
}

export async function getSale(id: string): Promise<Sale | undefined> {
  return delay(store.state.sales.find((s) => s.id === id))
}

export async function createSale(input: Omit<Sale, "id" | "invoiceNumber">, actorId: string): Promise<Sale> {
  return delay(store.addSale(input, actorId))
}

export async function updateSale(
  id: string,
  input: Partial<Omit<Sale, "id" | "invoiceNumber">>,
  actorId: string
): Promise<Sale> {
  return delay(store.updateSale(id, input, actorId))
}

export async function deleteSale(id: string, actorId: string): Promise<void> {
  store.deleteSale(id, actorId)
  return delay(undefined)
}
