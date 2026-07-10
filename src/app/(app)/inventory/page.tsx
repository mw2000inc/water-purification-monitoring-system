"use client"

import * as React from "react"
import { parseISO } from "date-fns"
import { Package, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/data-table/data-table"
import { MonthYearFilter, type MonthYearValue } from "@/components/data-table/month-year-filter"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { ExportButtons } from "@/components/shared/export-buttons"
import { ProductFormDialog } from "@/components/inventory/product-form-dialog"
import { getInventoryColumns, type ProductRow } from "@/components/inventory/inventory-columns"
import { useDeleteProduct, useProducts, useStockMovements, useSuppliers } from "@/lib/hooks/use-inventory"
import { useAuth } from "@/lib/auth/auth-context"
import { formatDate, getStockStatus } from "@/lib/utils"
import { PRODUCT_CATEGORIES } from "@/lib/constants"
import type { Product, StockStatus } from "@/lib/types"

export default function InventoryPage() {
  const { user, can } = useAuth()
  const { data: products = [], isPending: p1 } = useProducts()
  const { data: suppliers = [], isPending: p2 } = useSuppliers()
  const { data: movements = [], isPending: p3 } = useStockMovements()
  const deleteProduct = useDeleteProduct(user?.id ?? "")
  const isAdmin = user?.role === "admin"

  const [categoryFilter, setCategoryFilter] = React.useState<string>("all")
  const [statusFilter, setStatusFilter] = React.useState<"all" | StockStatus>("all")
  const [monthYear, setMonthYear] = React.useState<MonthYearValue>({ month: "all", year: "all" })
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Product | undefined>(undefined)
  const [deleting, setDeleting] = React.useState<Product | undefined>(undefined)
  const [filteredRows, setFilteredRows] = React.useState<ProductRow[]>([])

  const isPending = p1 || p2 || p3

  const secondHandTotals = React.useMemo(() => {
    const totals = new Map<string, number>()
    for (const m of movements) {
      totals.set(m.productId, (totals.get(m.productId) ?? 0) + m.secondHandQuantity)
    }
    return totals
  }, [movements])

  const rows: ProductRow[] = React.useMemo(
    () =>
      products.map((p) => {
        const secondHandQuantity = secondHandTotals.get(p.id) ?? 0
        return {
          ...p,
          stockStatus: getStockStatus(p.stockQuantity, p.minStockLevel),
          supplierName: suppliers.find((s) => s.id === p.supplierId)?.name ?? "Unknown",
          secondHandQuantity,
          brandNewQuantity: p.stockQuantity,
          // Stock Qty is the combined total shown in this table — Brand New + 2nd Hand.
          stockQuantity: p.stockQuantity + secondHandQuantity,
        }
      }),
    [products, suppliers, secondHandTotals]
  )

  const years = React.useMemo(
    () => Array.from(new Set(products.map((p) => parseISO(p.dateAdded).getFullYear()))).sort((a, b) => b - a),
    [products]
  )

  const scopedRows = React.useMemo(() => {
    return rows.filter((r) => {
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false
      if (statusFilter !== "all" && r.stockStatus !== statusFilter) return false
      const d = parseISO(r.dateAdded)
      if (monthYear.month !== "all" && d.getMonth() !== Number(monthYear.month)) return false
      if (monthYear.year !== "all" && d.getFullYear() !== Number(monthYear.year)) return false
      return true
    })
  }, [rows, categoryFilter, statusFilter, monthYear])

  const columns = React.useMemo(
    () =>
      getInventoryColumns({
        isAdmin: user?.role === "admin",
        canEdit: can("inventory:edit"),
        canDelete: can("inventory:delete"),
        // Stock Qty on the row is the combined (Brand New + 2nd Hand) display value —
        // restore the true raw stock quantity before handing the product to the
        // edit/delete flows, so we never write the combined number back as if it
        // were the real stockQuantity.
        onEdit: (p) => {
          setEditing({ ...p, stockQuantity: p.brandNewQuantity })
          setFormOpen(true)
        },
        onDelete: (p) => setDeleting({ ...p, stockQuantity: p.brandNewQuantity }),
      }),
    [can, user?.role]
  )

  const exportColumns = [
    { header: "SKU", key: "sku" },
    { header: "Product Name", key: "name" },
    { header: "Date Added", key: "dateAdded" },
    { header: "Category", key: "category" },
    { header: "Supplier", key: "supplierName" },
    { header: "Stock Qty", key: "stockQuantity" },
    { header: "Brand New", key: "brandNewQuantity" },
    { header: "2nd Hand", key: "secondHandQuantity" },
    { header: "Min Level", key: "minStockLevel" },
    { header: "Status", key: "stockStatus" },
    ...(isAdmin ? [{ header: "Purchase Price", key: "purchasePrice" }] : []),
    { header: "Selling Price", key: "sellingPrice" },
  ]

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" /> Inventory
          </h1>
          <p className="text-sm text-muted-foreground">Track stock levels, pricing and suppliers.</p>
        </div>
        {can("inventory:add") && (
          <Button
            onClick={() => {
              setEditing(undefined)
              setFormOpen(true)
            }}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={scopedRows}
            searchPlaceholder="Search by name, SKU, barcode..."
            onFilteredRowsChange={setFilteredRows}
            emptyMessage="No products found."
            toolbar={
              <>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 w-[150px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {PRODUCT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <SelectTrigger className="h-9 w-[150px]">
                    <SelectValue placeholder="Stock Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="in-stock">In Stock</SelectItem>
                    <SelectItem value="low-stock">Low Stock</SelectItem>
                    <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
                <MonthYearFilter value={monthYear} onChange={setMonthYear} years={years} />
                <ExportButtons
                  title="Inventory Report"
                  subtitle={`Generated ${formatDate(new Date().toISOString())}`}
                  fileName="inventory"
                  columns={exportColumns}
                  rows={filteredRows}
                />
              </>
            }
          />
        </CardContent>
      </Card>

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editing} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title="Delete product?"
        description={`This will permanently remove ${deleting?.name ?? "this product"} from inventory.`}
        loading={deleteProduct.isPending}
        onConfirm={async () => {
          if (!deleting) return
          await deleteProduct.mutateAsync(deleting.id)
          setDeleting(undefined)
        }}
      />
    </div>
  )
}
