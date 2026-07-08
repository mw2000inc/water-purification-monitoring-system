"use client"

import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { exportToExcel } from "@/lib/export/excel"
import { exportToPdf } from "@/lib/export/pdf"
import { printTable } from "@/lib/export/print"

export interface ExportColumn {
  header: string
  key: string
}

interface ExportButtonsProps<T> {
  title: string
  fileName: string
  columns: ExportColumn[]
  rows: T[]
  subtitle?: string
  onExport?: () => void
}

export function ExportButtons<T extends object>({
  title,
  fileName,
  columns,
  rows,
  subtitle,
  onExport,
}: ExportButtonsProps<T>) {
  const asRecords = () => rows as unknown as Record<string, unknown>[]

  const handleExcel = () => {
    const records = asRecords()
    exportToExcel(
      records.map((row) => Object.fromEntries(columns.map((c) => [c.header, row[c.key] ?? ""]))),
      fileName
    )
    onExport?.()
  }

  const handlePdf = () => {
    exportToPdf({ title, subtitle, columns, rows: asRecords(), fileName })
    onExport?.()
  }

  const handlePrint = () => {
    printTable({ title, subtitle, columns, rows: asRecords() })
    onExport?.()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExcel}>
          <FileSpreadsheet className="h-4 w-4 text-success" />
          Export to Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePdf}>
          <FileText className="h-4 w-4 text-danger" />
          Export to PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="h-4 w-4 text-primary" />
          Print
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
