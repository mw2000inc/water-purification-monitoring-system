import { store } from "@/lib/mock/store"
import { delay } from "@/lib/api/delay"
import type { Contract } from "@/lib/types"

export async function listContracts(): Promise<Contract[]> {
  store.syncExpiringContractNotifications()
  return delay([...store.state.contracts])
}
