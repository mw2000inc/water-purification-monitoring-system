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
import { StockMovementFormDialog } from "@/components/inventory/stock-movement-form-dialog"
import { stockMovementsColumns, type StockMovementRow } from "@/components/inventory/stock-movements-columns"
import { useProducts, useStockMovements } from "@/lib/hooks/use-inventory"
import { useUsers } from "@/lib/hooks/use-misc"
import { useAuth } from "@/lib/auth/auth-context"
import { cn, formatDate } from "@/lib/utils"

export default function StockMovementsPage() {
  const { can } = useAuth()
  const { data: movements = [], isPending: p1 } = useStockMovements()
  const { data: products = [], isPending: p2 } = useProducts()
  const { data: users = [], isPending: p3 } = useUsers()

  const [productFilter, setProductFilter] = React.useState<string>("all")
  const [userFilter, setUserFilter] = React.useState<string>("all")
  const [selectedDate, setSelectedDate] = React.useState<string | undefined>(undefined)
  const [calendarOpen, setCalendarOpen] = React.useState(false)
  const [formOpen, setFormOpen] = React.useState(false)

  const isPending = p1 || p2 || p3

  const rows: StockMovementRow[] = React.useMemo(() => {
    // Movements are stored newest-created-first; group per product so we can walk
    // each product's own history chronologically and rebuild the stock level as it
    // was on each date, rather than stamping every row with today's live quantity.
    const byProduct = new Map<string, { movement: (typeof movements)[number]; index: number }[]>()
    movements.forEach((m, index) => {
      const list = byProduct.get(m.productId) ?? []
      list.push({ movement: m, index })
      byProduct.set(m.productId, list)
    })

    const actualStockByMovementId = new Map<string, number>()
    byProduct.forEach((entries, productId) => {
      const product = products.find((p) => p.id === productId)
      const netTotal = entries.reduce((sum, e) => sum + e.movement.quantityAdded - e.movement.quantityRemoved, 0)
      const currentStock = product?.stockQuantity ?? netTotal
      const opening = currentStock - netTotal

      const chronological = [...entries].sort((a, b) => {
        const dateDiff = a.movement.date.localeCompare(b.movement.date)
        if (dateDiff !== 0) return dateDiff
        return b.index - a.index // higher original index = created earlier = comes first
      })

      let running = opening
      for (const entry of chronological) {
        running += entry.movement.quantityAdded - entry.movement.quantityRemoved
        actualStockByMovementId.set(entry.movement.id, running)
      }
    })

    return movements.map((m) => {
      const product = products.find((p) => p.id === m.productId)
      return {
        ...m,
        productName: product?.name ?? "Unknown",
        sku: product?.sku ?? "-",
        actualStock: actualStockByMovementId.get(m.id) ?? product?.stockQuantity ?? 0,
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
          <Button onClick={() => setFormOpen(true)} className="gap-1.5">
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
            columns={stockMovementsColumns}
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

      <StockMovementFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
