"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { formatDate } from "@/lib/utils"
import type { StockMovement } from "@/lib/types"

export type StockMovementRow = StockMovement & {
  productName: string
  sku: string
  actualStock: number
  userName: string
}

export const stockMovementsColumns: ColumnDef<StockMovementRow, unknown>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => formatDate(row.original.date),
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
    accessorKey: "actualStock",
    header: "Actual Stock",
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
    accessorKey: "userName",
    header: "User",
  },
  {
    accessorKey: "referenceNumber",
    header: "Reference #",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.referenceNumber}</span>,
  },
]
