"use client"

import * as React from "react"
import { parseISO } from "date-fns"
import { Plus, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { SummaryCard } from "@/components/shared/summary-card"
import { ChartCard } from "@/components/charts/chart-card"
import { SalesTrendChart, RevenueChart } from "@/components/charts/sales-charts"
import { ProductPieChart } from "@/components/charts/dashboard-charts"
import { DataTable } from "@/components/data-table/data-table"
import { MonthYearFilter, type MonthYearValue } from "@/components/data-table/month-year-filter"
import { ExportButtons } from "@/components/shared/export-buttons"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { SaleFormDialog } from "@/components/sales/sale-form-dialog"
import { getSalesColumns, type SaleRow } from "@/components/sales/sales-columns"
import { useDeleteSale, useSales } from "@/lib/hooks/use-sales"
import { useCustomers } from "@/lib/hooks/use-customers"
import { useProducts } from "@/lib/hooks/use-inventory"
import { useUsers } from "@/lib/hooks/use-misc"
import { useAuth } from "@/lib/auth/auth-context"
import {
  productSalesDistribution,
  revenueSeries,
  salesPeriodTotals,
  salesTrendSeries,
  topCustomers,
  topSellingProducts,
} from "@/lib/aggregations"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Sale } from "@/lib/types"

export default function SalesPage() {
  const { user, can } = useAuth()
  const { data: sales = [], isPending: p1 } = useSales()
  const { data: customers = [], isPending: p2 } = useCustomers()
  const { data: products = [], isPending: p3 } = useProducts()
  const { data: users = [], isPending: p4 } = useUsers()
  const deleteSale = useDeleteSale(user?.id ?? "")

  const [customerFilter, setCustomerFilter] = React.useState<string>("all")
  const [monthYear, setMonthYear] = React.useState<MonthYearValue>({ month: "all", year: "all" })
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Sale | undefined>(undefined)
  const [deleting, setDeleting] = React.useState<Sale | undefined>(undefined)
  const [filteredRows, setFilteredRows] = React.useState<SaleRow[]>([])

  const isPending = p1 || p2 || p3 || p4

  const rows: SaleRow[] = React.useMemo(() => {
    return sales.map((s) => {
      const customer = customers.find((c) => c.id === s.customerId)
      const rep = users.find((u) => u.id === s.salesRepId)
      const itemsSummary = s.items
        .map((it) => {
          const p = products.find((prod) => prod.id === it.productId)
          return `${p?.name ?? "Unknown"} x${it.quantity}`
        })
        .join(", ")
      return {
        ...s,
        customerName: customer?.fullName ?? "Unknown",
        salesRepName: rep?.name ?? "Unknown",
        itemsSummary,
      }
    })
  }, [sales, customers, products, users])

  const years = React.useMemo(
    () => Array.from(new Set(sales.map((s) => parseISO(s.date).getFullYear()))).sort((a, b) => b - a),
    [sales]
  )

  const scopedRows = React.useMemo(() => {
    return rows.filter((r) => {
      if (customerFilter !== "all" && r.customerId !== customerFilter) return false
      const d = parseISO(r.date)
      if (monthYear.month !== "all" && d.getMonth() !== Number(monthYear.month)) return false
      if (monthYear.year !== "all" && d.getFullYear() !== Number(monthYear.year)) return false
      return true
    })
  }, [rows, customerFilter, monthYear])

  const columns = React.useMemo(
    () =>
      getSalesColumns({
        canEdit: can("sales:edit"),
        canDelete: can("sales:delete"),
        onEdit: (s) => {
          setEditing(s)
          setFormOpen(true)
        },
        onDelete: (s) => setDeleting(s),
      }),
    [can]
  )

  const exportColumns = [
    { header: "Invoice #", key: "invoiceNumber" },
    { header: "Date", key: "date" },
    { header: "Customer", key: "customerName" },
    { header: "Sales Rep", key: "salesRepName" },
    { header: "Products", key: "itemsSummary" },
    { header: "Discount", key: "discount" },
    { header: "Total Amount", key: "totalAmount" },
    { header: "Payment Method", key: "paymentMethod" },
    { header: "Payment Status", key: "paymentStatus" },
  ]

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  const periodTotals = salesPeriodTotals(sales)
  const trend = salesTrendSeries(sales)
  const revenue = revenueSeries(sales)
  const productDist = productSalesDistribution(sales, products)
  const bestCustomers = topCustomers(sales, customers)
  const bestProducts = topSellingProducts(sales, products)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" /> Sales
          </h1>
          <p className="text-sm text-muted-foreground">Track transactions, revenue and sales performance.</p>
        </div>
        {can("sales:add") && (
          <Button
            onClick={() => {
              setEditing(undefined)
              setFormOpen(true)
            }}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add Sale
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Daily Sales" value={formatCurrency(periodTotals.daily)} icon={ShoppingCart} tone="primary" />
        <SummaryCard label="Weekly Sales" value={formatCurrency(periodTotals.weekly)} icon={ShoppingCart} tone="secondary" />
        <SummaryCard label="Monthly Sales" value={formatCurrency(periodTotals.monthly)} icon={ShoppingCart} tone="success" />
        <SummaryCard label="Annual Sales" value={formatCurrency(periodTotals.annual)} icon={ShoppingCart} tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Sales Trend" description="Daily revenue, last 30 days">
          <SalesTrendChart data={trend} />
        </ChartCard>
        <ChartCard title="Revenue" description="Revenue vs. discounts, last 6 months">
          <RevenueChart data={revenue} />
        </ChartCard>
        <ChartCard title="Product Sales" description="Revenue share by product">
          <ProductPieChart data={productDist} />
        </ChartCard>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Top Customers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {bestCustomers.map((c, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="truncate">{c.name}</span>
                  <span className="font-medium">{formatCurrency(c.total)}</span>
                </div>
              ))}
              {bestCustomers.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Top Selling Products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {bestProducts.map((p, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="truncate">{p.name}</span>
                  <span className="font-medium">{p.qty} units</span>
                </div>
              ))}
              {bestProducts.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={scopedRows}
            searchPlaceholder="Search by invoice number..."
            onFilteredRowsChange={setFilteredRows}
            emptyMessage="No sales found."
            toolbar={
              <>
                <Select value={customerFilter} onValueChange={setCustomerFilter}>
                  <SelectTrigger className="h-9 w-[170px]">
                    <SelectValue placeholder="Customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <MonthYearFilter value={monthYear} onChange={setMonthYear} years={years} />
                <ExportButtons
                  title="Sales Report"
                  subtitle={`Generated ${formatDate(new Date().toISOString())}`}
                  fileName="sales"
                  columns={exportColumns}
                  rows={filteredRows}
                />
              </>
            }
          />
        </CardContent>
      </Card>

      <SaleFormDialog open={formOpen} onOpenChange={setFormOpen} sale={editing} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title="Delete sale?"
        description={`This will permanently remove invoice ${deleting?.invoiceNumber ?? ""}. Stock quantities will not be restored automatically.`}
        loading={deleteSale.isPending}
        onConfirm={async () => {
          if (!deleting) return
          await deleteSale.mutateAsync(deleting.id)
          setDeleting(undefined)
        }}
      />
    </div>
  )
}
