"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import {
  Mail,
  MapPin,
  Phone,
  Wrench,
  Droplet,
  FileText,
  Receipt,
  Package,
  Building2,
  ShieldCheck,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { ContractStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge"
import { Logo } from "@/components/shared/logo"
import { usePortalProfile } from "@/lib/hooks/use-portal"
import { formatCurrency, formatDate, getContractStatus, initials, daysUntil } from "@/lib/utils"
import { getServiceHistory } from "@/lib/service-history"

export default function CustomerPortalPage() {
  const params = useParams<{ id: string }>()
  const { data: profile, isPending } = usePortalProfile(params.id)
  const customer = profile?.customer
  const customerSales = profile?.sales ?? []
  const products = profile?.products ?? []
  const settings = profile?.settings

  const content = (() => {
    if (isPending) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      )
    }

    if (!customer) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <p className="text-lg font-medium">We couldn&apos;t find this profile</p>
          <p className="text-sm text-muted-foreground">The QR code may be invalid or the record no longer exists.</p>
        </div>
      )
    }

    const status = getContractStatus(customer.contractEnd)
    const serviceHistory = getServiceHistory(customer)
    const installedProducts = new Map<string, { name: string; qty: number; lastPurchased: string }>()
    customerSales.forEach((s) => {
      s.items.forEach((it) => {
        const product = products.find((p) => p.id === it.productId)
        if (!product) return
        const existing = installedProducts.get(product.id)
        if (existing) {
          existing.qty += it.quantity
          if (s.date > existing.lastPurchased) existing.lastPurchased = s.date
        } else {
          installedProducts.set(product.id, { name: product.name, qty: it.quantity, lastPurchased: s.date })
        }
      })
    })
    const daysLeft = daysUntil(customer.contractEnd)

    return (
      <>
        <Card>
          <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 pt-6">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {initials(customer.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold">{customer.fullName}</h1>
                <ContractStatusBadge status={status} />
              </div>
              {customer.companyName && <p className="text-sm text-muted-foreground">{customer.companyName}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                Order #: <span className="font-mono">{customer.orderNumber}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/40 border-dashed">
          <CardContent className="flex items-start gap-3 py-4">
            <ShieldCheck className="h-4 w-4 text-success shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              This is a read-only view of your account. Only MW2000 staff can make changes — contact us below if
              anything needs updating.
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="personal">
          <TabsList className="flex-wrap h-auto group-data-horizontal/tabs:h-auto">
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="contract">Contract Details</TabsTrigger>
            <TabsTrigger value="service">Service History</TabsTrigger>
            <TabsTrigger value="payments">Payment History</TabsTrigger>
            <TabsTrigger value="products">Installed Products</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <InfoRow icon={Mail} label="Email Address" value={customer.email} />
                <InfoRow icon={Phone} label="Contact Number" value={customer.contactNumber} />
                <InfoRow icon={MapPin} label="Address" value={customer.address} className="sm:col-span-2" />
                <InfoRow icon={Droplet} label="Water Purification Type" value={customer.dispenserType} />
                <InfoRow
                  icon={Droplet}
                  label="Water Filter Installed"
                  value={customer.filterInstalled ? "Yes" : "No"}
                />
                <InfoRow icon={Wrench} label="Assigned Technician" value={customer.assignedTechnician || "N/A"} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contract">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contract Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <InfoRow icon={FileText} label="Contract Number" value={customer.contractNumber} />
                <InfoRow icon={FileText} label="Status" value={<ContractStatusBadge status={status} />} />
                <InfoRow icon={FileText} label="Contract Start" value={formatDate(customer.contractStart)} />
                <InfoRow icon={FileText} label="Contract End" value={formatDate(customer.contractEnd)} />
                <InfoRow
                  icon={FileText}
                  label="Time Remaining"
                  value={daysLeft >= 0 ? `${daysLeft} day(s) left` : `Expired ${Math.abs(daysLeft)} day(s) ago`}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="service">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Service History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {serviceHistory.length === 0 && (
                  <p className="text-sm text-muted-foreground">No service visits recorded yet.</p>
                )}
                {serviceHistory.map((visit, i) => (
                  <div key={i} className="flex gap-3 border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Wrench className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{visit.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(visit.date)} &middot; {visit.technician}
                      </p>
                      <p className="text-sm mt-1">{visit.notes}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {customerSales.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sales recorded for this customer yet.</p>
                ) : (
                  <div className="space-y-3">
                    {customerSales.map((s) => (
                      <div key={s.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                            <Receipt className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{s.invoiceNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(s.date)} &middot; {s.paymentMethod}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatCurrency(s.totalAmount)}</p>
                          <PaymentStatusBadge status={s.paymentStatus} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Installed Products</CardTitle>
              </CardHeader>
              <CardContent>
                {installedProducts.size === 0 ? (
                  <p className="text-sm text-muted-foreground">No products purchased/installed yet.</p>
                ) : (
                  <div className="space-y-3">
                    {Array.from(installedProducts.values()).map((p, i) => (
                      <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success/10 text-success">
                            <Package className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">Last purchased {formatDate(p.lastPurchased)}</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold">x{p.qty}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Need help? Contact us
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow icon={MapPin} label="Location" value={settings?.address || "N/A"} />
            {(settings?.contactNumbers ?? []).map((entry, i) => (
              <InfoRow key={`num-${i}`} icon={Phone} label={entry.label} value={entry.value} />
            ))}
            {(settings?.contactEmails ?? []).map((entry, i) => (
              <InfoRow key={`email-${i}`} icon={Mail} label={entry.label} value={entry.value} />
            ))}
          </CardContent>
        </Card>
      </>
    )
  })()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-2xl mx-auto flex items-center gap-2 px-4 py-4">
          <Logo className="h-9 w-9 shrink-0" />
          <div className="leading-tight">
            <p className="font-semibold text-sm">{settings?.companyName ?? "MW2000"}</p>
            <p className="text-xs text-muted-foreground">Customer Profile</p>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">{content}</main>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <div className="font-medium">{value}</div>
    </div>
  )
}
