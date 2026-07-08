"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StockStatusBadge } from "@/components/shared/status-badge"
import { formatCurrency } from "@/lib/utils"
import type { Product, StockStatus } from "@/lib/types"

export type ProductRow = Product & { stockStatus: StockStatus; supplierName: string }

export function getInventoryColumns({
  isAdmin,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  isAdmin: boolean
  canEdit: boolean
  canDelete: boolean
  onEdit: (product: ProductRow) => void
  onDelete: (product: ProductRow) => void
}): ColumnDef<ProductRow, unknown>[] {
  const columns: ColumnDef<ProductRow, unknown>[] = [
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.sku}</span>,
    },
    {
      accessorKey: "name",
      header: "Product Name",
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: "stockQuantity",
      header: "Stock Qty",
    },
    {
      accessorKey: "minStockLevel",
      header: "Min Level",
    },
    {
      accessorKey: "stockStatus",
      header: "Status",
      cell: ({ row }) => <StockStatusBadge status={row.original.stockStatus} />,
    },
  ]

  if (isAdmin) {
    columns.push({
      accessorKey: "purchasePrice",
      header: "Purchase Price",
      cell: ({ row }) => formatCurrency(row.original.purchasePrice),
    })
  }

  columns.push({
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canEdit && (
            <DropdownMenuItem onClick={() => onEdit(row.original)}>
              <Pencil className="h-4 w-4" /> Edit
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(row.original)}>
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  })

  return columns
}
