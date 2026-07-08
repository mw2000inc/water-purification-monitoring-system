"use client"

import * as React from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import { useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2, UserPlus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "@/lib/constants"
import { useAuth } from "@/lib/auth/auth-context"
import { useCreateSale, useUpdateSale } from "@/lib/hooks/use-sales"
import { useCustomers, customersKey } from "@/lib/hooks/use-customers"
import { useProducts } from "@/lib/hooks/use-inventory"
import { useUsers } from "@/lib/hooks/use-misc"
import { formatCurrency } from "@/lib/utils"
import type { Sale } from "@/lib/types"
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog"

const ADD_NEW_CUSTOMER = "__add_new_customer__"

const itemSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  quantity: z.number().int().min(1, "Min 1"),
  unitPrice: z.number().min(0),
})

const schema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  salesRepId: z.string().min(1, "Select a sales representative"),
  date: z.string().min(1, "Date is required"),
  items: z.array(itemSchema).min(1, "Add at least one product"),
  discountPercent: z.number().min(0).max(100),
  paymentMethod: z.enum(PAYMENT_METHODS),
  paymentStatus: z.enum(PAYMENT_STATUSES),
})

type FormValues = z.infer<typeof schema>

export function SaleFormDialog({
  open,
  onOpenChange,
  sale,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sale?: Sale
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: customers = [] } = useCustomers()
  const { data: products = [] } = useProducts()
  const { data: users = [] } = useUsers()
  const createSale = useCreateSale(user?.id ?? "")
  const updateSale = useUpdateSale(user?.id ?? "")
  const isEdit = !!sale
  const [newCustomerOpen, setNewCustomerOpen] = React.useState(false)

  const gross0 = sale ? sale.items.reduce((s, it) => s + it.subtotal, 0) : 0

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: sale?.customerId ?? "",
      salesRepId: sale?.salesRepId ?? user?.id ?? "",
      date: sale?.date ?? new Date().toISOString().slice(0, 10),
      items: sale?.items.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      })) ?? [{ productId: "", quantity: 1, unitPrice: 0 }],
      discountPercent: sale && gross0 > 0 ? Math.round((sale.discount / gross0) * 100) : 0,
      paymentMethod: sale?.paymentMethod ?? "Cash",
      paymentStatus: sale?.paymentStatus ?? "Paid",
    },
  })

  React.useEffect(() => {
    if (open) {
      const gross = sale ? sale.items.reduce((s, it) => s + it.subtotal, 0) : 0
      form.reset({
        customerId: sale?.customerId ?? "",
        salesRepId: sale?.salesRepId ?? user?.id ?? "",
        date: sale?.date ?? new Date().toISOString().slice(0, 10),
        items: sale?.items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })) ?? [{ productId: "", quantity: 1, unitPrice: 0 }],
        discountPercent: sale && gross > 0 ? Math.round((sale.discount / gross) * 100) : 0,
        paymentMethod: sale?.paymentMethod ?? "Cash",
        paymentStatus: sale?.paymentStatus ?? "Paid",
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sale])

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" })
  const watchedItems = form.watch("items")
  const watchedDiscountPercent = form.watch("discountPercent")

  const gross = watchedItems.reduce((sum, it) => sum + (it.quantity || 0) * (it.unitPrice || 0), 0)
  const discountAmount = Math.round(gross * ((watchedDiscountPercent || 0) / 100))
  const totalAmount = gross - discountAmount

  async function onSubmit(values: FormValues) {
    const items = values.items.map((it) => ({
      id: sale?.items.find((x) => x.productId === it.productId)?.id ?? `sit-${Math.random().toString(36).slice(2, 9)}`,
      productId: it.productId,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      subtotal: it.quantity * it.unitPrice,
    }))
    const itemsGross = items.reduce((s, it) => s + it.subtotal, 0)
    const discount = Math.round(itemsGross * (values.discountPercent / 100))
    const totalAmount = itemsGross - discount

    const payload = {
      customerId: values.customerId,
      salesRepId: values.salesRepId,
      date: values.date,
      items,
      discount,
      totalAmount,
      paymentMethod: values.paymentMethod,
      paymentStatus: values.paymentStatus,
    }

    if (isEdit) {
      await updateSale.mutateAsync({ id: sale.id, input: payload })
    } else {
      await createSale.mutateAsync(payload)
    }
    onOpenChange(false)
  }

  const pending = createSale.isPending || updateSale.isPending

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Sale" : "Add Sale"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this sales transaction." : "Record a new sale. Stock will be deducted automatically."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        if (v === ADD_NEW_CUSTOMER) {
                          setNewCustomerOpen(true)
                          return
                        }
                        field.onChange(v)
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select customer">
                            {customers.find((c) => c.id === field.value)?.fullName}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ADD_NEW_CUSTOMER} className="text-primary font-medium">
                          <UserPlus className="h-4 w-4" /> Add New Customer
                        </SelectItem>
                        <SelectSeparator />
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="salesRepId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sales Representative</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select rep" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Products Sold</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => append({ productId: "", quantity: 1, unitPrice: 0 })}
                >
                  <Plus className="h-3.5 w-3.5" /> Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center border rounded-md p-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.productId`}
                      render={({ field: f }) => (
                        <FormItem className="flex-1 w-full">
                          <Select
                            value={f.value}
                            onValueChange={(v) => {
                              f.onChange(v)
                              const product = products.find((p) => p.id === v)
                              if (product) form.setValue(`items.${index}.unitPrice`, product.sellingPrice)
                            }}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {products.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field: f }) => (
                        <FormItem className="w-full sm:w-24">
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              placeholder="Qty"
                              value={f.value}
                              onChange={(e) => f.onChange(e.target.valueAsNumber || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.unitPrice`}
                      render={({ field: f }) => (
                        <FormItem className="w-full sm:w-32">
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="Unit Price"
                              value={f.value}
                              onChange={(e) => f.onChange(e.target.valueAsNumber || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="w-full sm:w-28 text-sm font-medium text-right pr-1">
                      {formatCurrency((watchedItems[index]?.quantity || 0) * (watchedItems[index]?.unitPrice || 0))}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-danger shrink-0"
                      disabled={fields.length === 1}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              {form.formState.errors.items?.message && (
                <p className="text-sm text-destructive">{form.formState.errors.items.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="discountPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-md bg-muted p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Amount</span>
                <span>{formatCurrency(gross)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base border-t pt-1 mt-1">
                <span>Total Amount</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : isEdit ? "Save Changes" : "Add Sale"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    <CustomerFormDialog
      open={newCustomerOpen}
      onOpenChange={setNewCustomerOpen}
      onCreated={(customer) => {
        // Inject the new customer into the cache so the option exists, then defer
        // setValue to the next tick — Radix's hidden native <select> syncs its value
        // against its rendered <option>s, and that DOM update needs a commit to land
        // before we point the controlled value at an option that didn't exist yet.
        queryClient.setQueryData(customersKey, (old: typeof customers = []) => [customer, ...old])
        setTimeout(() => {
          form.setValue("customerId", customer.id, { shouldValidate: true })
        }, 0)
      }}
    />
    </>
  )
}
