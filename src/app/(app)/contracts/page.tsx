"use client"

import * as React from "react"
import { FileText } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/data-table/data-table"
import { MonthYearFilter, type MonthYearValue } from "@/components/data-table/month-year-filter"
import { getContractColumns, type ContractRow } from "@/components/contracts/contracts-columns"
import { useContracts } from "@/lib/hooks/use-contracts"
import { useCustomers } from "@/lib/hooks/use-customers"
import { daysUntil, getNextQuarterlyDate } from "@/lib/utils"
import type { MonitoringStatus } from "@/lib/types"
import { format, parseISO } from "date-fns"

type StatusTab = "all" | MonitoringStatus

export default function ContractsPage() {
  const { data: contracts = [], isPending: p1 } = useContracts()
  const { data: customers = [], isPending: p2 } = useCustomers()

  const [statusTab, setStatusTab] = React.useState<StatusTab>("all")
  const [monthYear, setMonthYear] = React.useState<MonthYearValue>({ month: "all", year: "all" })

  const isPending = p1 || p2

  const rows: ContractRow[] = React.useMemo(() => {
    return contracts.map((c) => {
      const customer = customers.find((cust) => cust.id === c.customerId)
      const nextEndDate = format(getNextQuarterlyDate(c.startDate), "yyyy-MM-dd")
      const daysRemaining = daysUntil(nextEndDate)
      return {
        ...c,
        orderNumber: customer?.orderNumber ?? "N/A",
        customerName: customer?.fullName ?? "Unknown",
        companyName: customer?.companyName,
        nextEndDate,
        // Automatically flips once the end date has arrived (or passed) today.
        status: daysRemaining <= 0 ? "for-replacement" : "active",
      }
    })
  }, [contracts, customers])

  const counts = React.useMemo(
    () => ({
      all: rows.length,
      active: rows.filter((r) => r.status === "active").length,
      forReplacement: rows.filter((r) => r.status === "for-replacement").length,
    }),
    [rows]
  )

  const years = React.useMemo(
    () => Array.from(new Set(rows.map((c) => parseISO(c.nextEndDate).getFullYear()))).sort((a, b) => b - a),
    [rows]
  )

  const scopedRows = React.useMemo(() => {
    return rows.filter((r) => {
      if (statusTab !== "all" && r.status !== statusTab) return false
      const end = parseISO(r.nextEndDate)
      if (monthYear.month !== "all" && end.getMonth() !== Number(monthYear.month)) return false
      if (monthYear.year !== "all" && end.getFullYear() !== Number(monthYear.year)) return false
      return true
    })
  }, [rows, statusTab, monthYear])

  const columns = React.useMemo(() => getContractColumns(), [])

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> Quarterly Monitoring
        </h1>
        <p className="text-sm text-muted-foreground">Track quarterly monitoring status for every customer.</p>
      </div>

      <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as StatusTab)}>
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="active">🟢 Active ({counts.active})</TabsTrigger>
          <TabsTrigger value="for-replacement">🔴 For Replacement ({counts.forReplacement})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={scopedRows}
            searchPlaceholder="Search by order number or customer..."
            emptyMessage="No records found."
            toolbar={<MonthYearFilter value={monthYear} onChange={setMonthYear} years={years} />}
          />
        </CardContent>
      </Card>
    </div>
  )
}
