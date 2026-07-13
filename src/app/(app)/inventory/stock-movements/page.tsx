"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { ArrowLeftRight, CalendarIcon, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/data-table/data-table"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { StockMovementFormDialog } from "@/components/inventory/stock-movement-form-dialog"
import { getStockMovementsColumns, type StockMovementRow } from "@/components/inventory/stock-movements-columns"
import { useDeleteStockMovement, useProducts, useStockMovements } from "@/lib/hooks/use-inventory"
import { useUsers } from "@/lib/hooks/use-misc"
import { useAuth } from "@/lib/auth/auth-context"
import { cn, formatDate } from "@/lib/utils"

export default function StockMovementsPage() {
  const { user, can } = useAuth()
  const { data: movements = [], isPending: p1 } = useStockMovements()
  const { data: products = [], isPending: p2 } = useProducts()
  const { data: users = [], isPending: p3 } = useUsers()
  const deleteMovement = useDeleteStockMovement(user?.id ?? "")

  const [productFilter, setProductFilter] = React.useState<string>("all")
  const [userFilter, setUserFilter] = React.useState<string>("all")
  const [selectedDate, setSelectedDate] = React.useState<string | undefined>(undefined)
  const [calendarOpen, setCalendarOpen] = React.useState(false)
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<StockMovementRow | undefined>(undefined)
  const [deleting, setDeleting] = React.useState<StockMovementRow | undefined>(undefined)

  const isPending = p1 || p2 || p3

  const rows: StockMovementRow[] = React.useMemo(() => {
    // Group per product so we can walk each product's own history in true creation
    // order (via createdAt, not array position — Postgres doesn't guarantee same-day
    // rows come back in insertion order) and rebuild the stock level as it was at
    // each point in time, rather than stamping every row with today's live quantity.
    const byProduct = new Map<string, (typeof movements)[number][]>()
    movements.forEach((m) => {
      const list = byProduct.get(m.productId) ?? []
      list.push(m)
      byProduct.set(m.productId, list)
    })

    // Current Stock = the combined balance going INTO a movement (opening); Actual
    // Stock = the combined balance coming OUT of it (Current Stock + Qty Added -
    // Qty Removed + 2nd Hand). Both pools count toward this single running total —
    // only the product's own stock_quantity column tracks the regular pool, so we
    // back-solve the combined opening balance from the live totals of both.
    const actualStockByMovementId = new Map<string, number>()
    const currentStockByMovementId = new Map<string, number>()
    byProduct.forEach((entries, productId) => {
      const product = products.find((p) => p.id === productId)
      const netRegular = entries.reduce((sum, e) => sum + e.quantityAdded - e.quantityRemoved, 0)
      const liveRegular = product?.stockQuantity ?? netRegular
      // 2nd hand has no persisted anchor on the product row (it starts at 0), so only
      // the regular pool's change needs to be reversed out of the live value here.
      const opening = liveRegular - netRegular

      const chronological = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt))

      let running = opening
      for (const entry of chronological) {
        currentStockByMovementId.set(entry.id, running)
        running += entry.quantityAdded - entry.quantityRemoved + entry.secondHandQuantity
        actualStockByMovementId.set(entry.id, running)
      }
    })

    return movements.map((m) => {
      const product = products.find((p) => p.id === m.productId)
      const actualStock = actualStockByMovementId.get(m.id) ?? product?.stockQuantity ?? 0
      return {
        ...m,
        productName: product?.name ?? "Unknown",
        sku: product?.sku ?? "-",
        actualStock,
        currentStock: currentStockByMovementId.get(m.id) ?? actualStock,
        minStockLevel: product?.minStockLevel ?? 0,
        userName: users.find((u) => u.id === m.userId)?.name ?? "Unknown",
      }
    })
  }, [movements, products, users])

  const scopedRows = React.useMemo(() => {
    return rows.filter((r) => {
      if (productFilter !== "all" && r.productId !== productFilter) return false
      if (userFilter !== "all" && r.userId !== userFilter) return false
      if (selectedDate && r.date !== selectedDate) return false
      return true
    })
  }, [rows, productFilter, userFilter, selectedDate])

  const columns = React.useMemo(
    () =>
      getStockMovementsColumns({
        canEdit: can("inventory:edit"),
        canDelete: can("inventory:delete"),
        onEdit: (m) => {
          setEditing(m)
          setFormOpen(true)
        },
        onDelete: (m) => setDeleting(m),
      }),
    [can]
  )

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
            <ArrowLeftRight className="h-6 w-6 text-primary" /> Stock Movements
          </h1>
          <p className="text-sm text-muted-foreground">
            Full history of stock added and removed, including automatic sale deductions.
          </p>
        </div>
        {can("inventory:add") && (
          <Button
            onClick={() => {
              setEditing(undefined)
              setFormOpen(true)
            }}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add Stock Movement
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-col sm:flex-row sm:items-end gap-3 pt-6">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Look up stock movement history by date
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                className="w-[170px]"
                value={selectedDate ?? ""}
                onChange={(e) => setSelectedDate(e.target.value || undefined)}
              />
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("gap-2 justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {selectedDate ? formatDate(selectedDate) : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate ? parseISO(selectedDate) : undefined}
                    onSelect={(d) => {
                      setSelectedDate(d ? format(d, "yyyy-MM-dd") : undefined)
                      setCalendarOpen(false)
                    }}
                  />
                </PopoverContent>
              </Popover>
              {selectedDate && (
                <Button variant="ghost" size="icon" onClick={() => setSelectedDate(undefined)} aria-label="Clear date">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={scopedRows}
            searchPlaceholder="Search by SKU, product name, or date..."
            emptyMessage="No stock movements found."
            toolbar={
              <>
                <Select value={productFilter} onValueChange={setProductFilter}>
                  <SelectTrigger className="h-9 w-[180px]">
                    <SelectValue placeholder="Product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="h-9 w-[160px]">
                    <SelectValue placeholder="User" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            }
          />
        </CardContent>
      </Card>

      <StockMovementFormDialog open={formOpen} onOpenChange={setFormOpen} movement={editing} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title="Delete stock movement?"
        description={`This will permanently remove this movement and adjust ${deleting?.productName ?? "the product"}'s stock accordingly.`}
        loading={deleteMovement.isPending}
        onConfirm={async () => {
          if (!deleting) return
          await deleteMovement.mutateAsync(deleting.id)
          setDeleting(undefined)
        }}
      />
    </div>
  )
}
