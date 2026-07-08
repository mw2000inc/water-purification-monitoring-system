"use client"

import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDate } from "@/lib/utils"
import type { Customer, ContractStatus } from "@/lib/types"

export type CustomerRow = Customer & { contractStatus: ContractStatus }

export function getCustomerColumns({
  canDelete,
  onEdit,
  onDelete,
}: {
  canDelete: boolean
  onEdit: (customer: CustomerRow) => void
  onDelete: (customer: CustomerRow) => void
}): ColumnDef<CustomerRow, unknown>[] {
  return [
    {
      accessorKey: "orderNumber",
      header: "Order Number",
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.orderNumber}</span>,
    },
    {
      accessorKey: "fullName",
      header: "Name",
      cell: ({ row }) => (
        <Link href={`/customers/${row.original.id}`} className="hover:underline">
          <div className="font-medium">{row.original.fullName}</div>
          {row.original.companyName && (
            <div className="text-xs text-muted-foreground">{row.original.companyName}</div>
          )}
        </Link>
      ),
    },
    {
      accessorKey: "contactNumber",
      header: "Contact Number",
    },
    {
      accessorKey: "address",
      header: "Address",
    },
    {
      accessorKey: "createdAt",
      header: "Installed Date",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
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
            <DropdownMenuItem asChild>
              <Link href={`/customers/${row.original.id}`}>
                <Eye className="h-4 w-4" /> View Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(row.original)}>
              <Pencil className="h-4 w-4" /> Edit
            </DropdownMenuItem>
            {canDelete && (
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(row.original)}>
                <Trash2 className="h-4 w-4" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
