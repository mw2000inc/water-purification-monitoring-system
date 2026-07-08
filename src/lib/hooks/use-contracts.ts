import { useQuery } from "@tanstack/react-query"
import * as api from "@/lib/api/contracts"

export const contractsKey = ["contracts"] as const

export function useContracts() {
  return useQuery({ queryKey: contractsKey, queryFn: api.listContracts })
}
