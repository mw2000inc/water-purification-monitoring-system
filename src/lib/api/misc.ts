import { store } from "@/lib/mock/store"
import { delay } from "@/lib/api/delay"
import type { CompanySettings, User } from "@/lib/types"

export async function listUsers(): Promise<User[]> {
  return delay([...store.state.users])
}

export async function createUser(input: Omit<User, "id" | "createdAt">, actorId: string): Promise<User> {
  return delay(store.addUser(input, actorId))
}

export async function updateUser(id: string, input: Partial<Omit<User, "id" | "createdAt">>, actorId: string): Promise<User> {
  return delay(store.updateUser(id, input, actorId))
}

export async function deleteUser(id: string, actorId: string): Promise<void> {
  store.deleteUser(id, actorId)
  return delay(undefined)
}

export async function listNotifications() {
  return delay([...store.state.notifications])
}

export async function markNotificationRead(id: string) {
  store.markNotificationRead(id)
  return delay(undefined)
}

export async function markAllNotificationsRead() {
  store.markAllNotificationsRead()
  return delay(undefined)
}

export async function getSettings(): Promise<CompanySettings> {
  return delay(store.state.settings)
}

export async function updateSettings(input: Partial<CompanySettings>, actorId: string): Promise<CompanySettings> {
  return delay(store.updateSettings(input, actorId))
}

export function exportBackup(): string {
  return JSON.stringify(store.state, null, 2)
}

export function restoreBackup(json: string) {
  const parsed = JSON.parse(json)
  store.replaceAll(parsed)
}
