"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Users, ShoppingCart, Package, FileText, Search } from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { useCustomers } from "@/lib/hooks/use-customers"
import { useSales } from "@/lib/hooks/use-sales"
import { useProducts } from "@/lib/hooks/use-inventory"
import { useContracts } from "@/lib/hooks/use-contracts"
import { formatCurrency } from "@/lib/utils"

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  const { data: customers = [] } = useCustomers()
  const { data: sales = [] } = useSales()
  const { data: products = [] } = useProducts()
  const { data: contracts = [] } = useContracts()

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <Button
        variant="outline"
        className="h-9 w-full max-w-sm justify-start text-muted-foreground gap-2 px-3 hidden sm:flex"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="text-sm">Search everything...</span>
        <kbd className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded border">Ctrl K</kbd>
      </Button>
      <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setOpen(true)} aria-label="Search">
        <Search className="h-4 w-4" />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Global Search" description="Search customers, sales, products, contracts">
        <CommandInput placeholder="Search customers, invoices, products, contracts..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Customers">
            {customers.slice(0, 30).map((c) => (
              <CommandItem key={c.id} value={`customer ${c.fullName} ${c.contractNumber} ${c.companyName ?? ""}`} onSelect={() => go(`/customers/${c.id}`)}>
                <Users className="text-secondary" />
                <span>{c.fullName}</span>
                <span className="ml-auto text-xs text-muted-foreground">{c.contractNumber}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Sales">
            {sales.slice(0, 30).map((s) => (
              <CommandItem key={s.id} value={`sale ${s.invoiceNumber}`} onSelect={() => go(`/sales`)}>
                <ShoppingCart className="text-primary" />
                <span>{s.invoiceNumber}</span>
                <span className="ml-auto text-xs text-muted-foreground">{formatCurrency(s.totalAmount)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Products">
            {products.slice(0, 30).map((p) => (
              <CommandItem key={p.id} value={`product ${p.name} ${p.sku}`} onSelect={() => go(`/inventory`)}>
                <Package className="text-success" />
                <span>{p.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{p.sku}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Quarterly Monitoring">
            {contracts.slice(0, 30).map((c) => (
              <CommandItem key={c.id} value={`contract ${c.contractNumber}`} onSelect={() => go(`/contracts`)}>
                <FileText className="text-warning" />
                <span>{c.contractNumber}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
