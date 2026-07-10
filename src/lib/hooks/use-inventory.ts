import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as api from "@/lib/api/inventory"
import type { Product, StockMovement, Supplier } from "@/lib/types"
import { toast } from "sonner"

export const productsKey = ["products"] as const
export const suppliersKey = ["suppliers"] as const
export const stockMovementsKey = ["stockMovements"] as const

export function useProducts() {
  return useQuery({ queryKey: productsKey, queryFn: api.listProducts })
}

export function useSuppliers() {
  return useQuery({ queryKey: suppliersKey, queryFn: api.listSuppliers })
}

export function useStockMovements() {
  return useQuery({ queryKey: stockMovementsKey, queryFn: api.listStockMovements })
}

export function useCreateProduct(actorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<Product, "id" | "dateAdded" | "lastUpdated">) => api.createProduct(input, actorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productsKey })
      qc.invalidateQueries({ queryKey: ["activityLogs"] })
      toast.success("Product added successfully")
    },
    onError: () => toast.error("Failed to add product"),
  })
}

export function useUpdateProduct(actorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Omit<Product, "id" | "dateAdded">> }) =>
      api.updateProduct(id, input, actorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productsKey })
      qc.invalidateQueries({ queryKey: ["notifications"] })
      qc.invalidateQueries({ queryKey: ["activityLogs"] })
      toast.success("Product updated successfully")
    },
    onError: () => toast.error("Failed to update product"),
  })
}

export function useDeleteProduct(actorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteProduct(id, actorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productsKey })
      qc.invalidateQueries({ queryKey: ["activityLogs"] })
      toast.success("Product deleted")
    },
    onError: (error: Error) => toast.error(error.message || "Failed to delete product"),
  })
}

export function useCreateSupplier(actorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<Supplier, "id">) => api.createSupplier(input, actorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: suppliersKey })
      toast.success("Supplier added successfully")
    },
    onError: () => toast.error("Failed to add supplier"),
  })
}

export function useAddStockMovement(actorId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<StockMovement, "id" | "createdAt">) => api.addStockMovement(input, actorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: stockMovementsKey })
      qc.invalidateQueries({ queryKey: productsKey })
      qc.invalidateQueries({ queryKey: ["notifications"] })
      qc.invalidateQueries({ queryKey: ["activityLogs"] })
      toast.success("Stock movement recorded")
    },
    onError: () => toast.error("Failed to record stock movement"),
  })
}
