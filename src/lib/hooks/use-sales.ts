import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as api from "@/lib/api/sales"
import type { Sale } from "@/lib/types"
import { toast } from "sonner"

export const salesKey = ["sales"] as const

export function useSales() {
  return useQuery({ queryKey: salesKey, queryFn: api.listSales })
}

export function useSale(id: string | undefined) {
  return useQuery({
    queryKey: [...salesKey, id],
    queryFn: () => api.getSale(id as string),
    enabled: !!id,
  })
}

function invalidateSaleRelated(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: salesKey })
  qc.invalidateQueries({ queryKey: ["products"] })
  qc.invalidateQueries({ queryKey: ["stockMovements"] })
  qc.invalidateQueries({ queryKey: ["notifications"] })
  qc.invalidateQueries({ queryKey: ["activityLogs"] })
}

export function useCreateSale(actorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<Sale, "id" | "invoiceNumber">) => api.createSale(input, actorId),
    onSuccess: () => {
      invalidateSaleRelated(qc)
      toast.success("Sale recorded successfully")
    },
    onError: () => toast.error("Failed to record sale"),
  })
}

export function useUpdateSale(actorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Omit<Sale, "id" | "invoiceNumber">> }) =>
      api.updateSale(id, input, actorId),
    onSuccess: () => {
      invalidateSaleRelated(qc)
      toast.success("Sale updated successfully")
    },
    onError: () => toast.error("Failed to update sale"),
  })
}

export function useDeleteSale(actorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteSale(id, actorId),
    onSuccess: () => {
      invalidateSaleRelated(qc)
      toast.success("Sale deleted")
    },
    onError: () => toast.error("Failed to delete sale"),
  })
}
