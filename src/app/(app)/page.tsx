"use client"

import {
  Users,
  FileCheck2,
  FileClock,
  CalendarDays,
  Wallet,
  Package,
  PackageX,
  AlertTriangle,
} from "lucide-react"
import { SummaryCard } from "@/components/shared/summary-card"
import { ChartCard } from "@/components/charts/chart-card"
import {
  MonthlySalesChart,
  CustomerRegistrationsChart,
  InventoryMovementChart,
  TopSellingProductsChart,
} from "@/components/charts/dashboard-charts"
import { Skeleton } from "@/components/ui/skeleton"
import { useCustomers } from "@/lib/hooks/use-customers"
import { useContracts } from "@/lib/hooks/use-contracts"
import { useSales } from "@/lib/hooks/use-sales"
import { useProducts, useStockMovements } from "@/lib/hooks/use-inventory"
import {
  customerRegistrationSeries,
  dashboardSummary,
  inventoryMovementSeries,
  monthlySalesSeries,
  topSellingProducts,
} from "@/lib/aggregations"
import { formatCurrency } from "@/lib/utils"
import { useAuth } from "@/lib/auth/auth-context"

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: customers = [], isPending: p1 } = useCustomers()
  const { data: contracts = [], isPending: p2 } = useContracts()
  const { data: sales = [], isPending: p3 } = useSales()
  const { data: products = [], isPending: p4 } = useProducts()
  const { data: movements = [], isPending: p5 } = useStockMovements()

  const loading = p1 || p2 || p3 || p4 || p5

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    )
  }

  const summary = dashboardSummary(customers, contracts, sales, products)
  const monthly = monthlySalesSeries(sales)
  const registrations = customerRegistrationSeries(customers)
  const movementSeries = inventoryMovementSeries(movements)
  const topProducts = topSellingProducts(sales, products)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user?.name?.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening across your business today.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Customers" value={summary.totalCustomers} icon={Users} tone="primary" href="/customers" />
        <SummaryCard label="Active Contracts" value={summary.activeContracts} icon={FileCheck2} tone="success" href="/contracts" />
        <SummaryCard label="Expiring Contracts (30d)" value={summary.expiringContracts} icon={FileClock} tone="warning" href="/contracts" />
        <SummaryCard label="Sales Today" value={formatCurrency(summary.salesToday)} icon={CalendarDays} tone="secondary" href="/sales" />
        <SummaryCard label="Sales This Month" value={formatCurrency(summary.salesThisMonth)} icon={Wallet} tone="secondary" href="/sales" />
        <SummaryCard label="Total Products" value={summary.totalProducts} icon={Package} tone="primary" href="/inventory" />
        <SummaryCard label="Low Stock Products" value={summary.lowStock} icon={AlertTriangle} tone="warning" href="/inventory" />
        <SummaryCard label="Out of Stock Products" value={summary.outOfStock} icon={PackageX} tone="danger" href="/inventory" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Monthly Sales" description="Total revenue for the last 6 months">
          <MonthlySalesChart data={monthly} />
        </ChartCard>
        <ChartCard title="Customer Registrations" description="New customers per month">
          <CustomerRegistrationsChart data={registrations} />
        </ChartCard>
        <ChartCard title="Inventory Movement" description="Stock added vs. removed per month">
          <InventoryMovementChart data={movementSeries} />
        </ChartCard>
        <ChartCard title="Top Selling Products" description="By units sold">
          <TopSellingProductsChart data={topProducts} />
        </ChartCard>
      </div>
    </div>
  )
}
