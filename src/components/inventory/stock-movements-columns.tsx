"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { formatDateTime } from "@/lib/utils"
import type { StockMovement } from "@/lib/types"

export type StockMovementRow = StockMovement & {
  productName: string
  sku: string
  actualStock: number
  currentStock: number
  userName: string
}

export const stockMovementsColumns: ColumnDef<StockMovementRow, unknown>[] = [
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
