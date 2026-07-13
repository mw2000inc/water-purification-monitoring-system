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
import { formatDateTime } from "@/lib/utils"
import type { StockMovement } from "@/lib/types"

export type StockMovementRow = StockMovement & {
  productName: string
  sku: string
  actualStock: number
  currentStock: number
  userName: string
}

export function getStockMovementsColumns({
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  canEdit: boolean
  canDelete: boolean
  onEdit: (movement: StockMovementRow) => void
  onDelete: (movement: StockMovementRow) => void
}): ColumnDef<StockMovementRow, unknown>[] {
  const columns: ColumnDef<StockMovementRow, unknown>[] = [
    {
      accessorKey: "createdAt",
      header: "Date & Time",
      // The exact timestamp (not just the day) an entry was recorded — lets the admin
      // tell which movement happened first when several land on the same day.
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.sku}</span>,
    },
    {
      accessorKey: "productName",
      header: "Product",
    },
    {
      accessorKey: "currentStock",
      header: "Current Stock",
      cell: ({ row }) => <span className="font-medium">{row.original.currentStock}</span>,
    },
    {
      accessorKey: "quantityAdded",
      header: "Qty Added",
      cell: ({ row }) =>
        row.original.quantityAdded > 0 ? (
          <span className="text-success font-medium">+{row.original.quantityAdded}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      accessorKey: "quantityRemoved",
      header: "Qty Removed",
      cell: ({ row }) =>
        row.original.quantityRemoved > 0 ? (
          <span className="text-danger font-medium">-{row.original.quantityRemoved}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      accessorKey: "secondHandQuantity",
      header: "2nd Hand",
      cell: ({ row }) => {
        const qty = row.original.secondHandQuantity
        if (qty > 0) return <span className="text-success font-medium">+{qty}</span>
        if (qty < 0) return <span className="text-danger font-medium">{qty}</span>
        return <span className="text-muted-foreground">-</span>
      },
    },
    {
      accessorKey: "actualStock",
      header: "Actual Stock",
    },
    {
      accessorKey: "reason",
      header: "Reason",
    },
    {
      accessorKey: "userName",
      header: "User",
    },
  ]

  if (canEdit || canDelete) {
    columns.push({
      id: "actions",
      header: "",
      cell: ({ row }) => {
        // Auto-generated from a real sale — editing/deleting it independently would
        // desync the stock ledger from that invoice, so it's not touched here.
        if (row.original.reason === "Sale") return null
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
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
        )
      },
    })
  }

  return columns
}
