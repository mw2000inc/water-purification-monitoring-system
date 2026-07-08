import { store } from "@/lib/mock/store"
import { delay } from "@/lib/api/delay"
import type { Customer } from "@/lib/types"

export async function listCustomers(): Promise<Customer[]> {
  return delay([...store.state.customers])
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  return delay(store.state.customers.find((c) => c.id === id))
}

export async function createCustomer(
  input: Omit<Customer, "id" | "createdAt" | "orderNumber">,
  actorId: string
): Promise<Customer> {
  return delay(store.addCustomer(input, actorId))
}

export async function updateCustomer(
  id: string,
  input: Partial<Omit<Customer, "id" | "createdAt" | "orderNumber">>,
  actorId: string
): Promise<Customer> {
  return delay(store.updateCustomer(id, input, actorId))
}

export async function deleteCustomer(id: string, actorId: string): Promise<void> {
  store.deleteCustomer(id, actorId)
  return delay(undefined)
}
