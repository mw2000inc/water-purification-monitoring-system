"use client"

import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { formatDate } from "@/lib/utils"
import type { Contract, MonitoringStatus } from "@/lib/types"

export type ContractRow = Contract & {
  orderNumber: string
  customerName: string
  companyName?: string
  nextEndDate: string
  status: MonitoringStatus
}

export function getContractColumns(): ColumnDef<ContractRow, unknown>[] {
  return [
    {
      accessorKey: "orderNumber",
      header: "Order #",
      cell: ({ row }) => <span className="font-medium">{row.original.orderNumber}</span>,
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => (
        <Link href={`/customers/${row.original.customerId}`} className="hover:underline">
          <div className="font-medium">{row.original.customerName}</div>
          {row.original.companyName && (
            <div className="text-xs text-muted-foreground">{row.original.companyName}</div>
          )}
        </Link>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) =>
        row.original.status === "active" ? (
          <StatusBadge tone="success" label="Active" />
        ) : (
          <StatusBadge tone="danger" label="For Replacement" />
        ),
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) => formatDate(row.original.startDate),
    },
    {
      accessorKey: "nextEndDate",
      header: "End Date",
      cell: ({ row }) => formatDate(row.original.nextEndDate),
    },
  ]
}
