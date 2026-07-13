"use client"

import * as React from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import { useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2, UserPlus } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Label } from "@/components/ui/label"
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

const serviceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  quantity: z.number().int().min(1, "Min 1"),
  unitPrice: z.number().min(0),
})

const schema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  salesRepId: z.string().min(1, "Select a sales representative"),
  date: z.string().min(1, "Date is required"),
  items: z.array(itemSchema).min(1, "Add at least one product"),
  hasServices: z.boolean(),
  services: z.array(serviceSchema),
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

  const grossOf = (s?: Sale) =>
    s ? s.items.reduce((sum, it) => sum + it.subtotal, 0) + s.services.reduce((sum, sv) => sum + sv.subtotal, 0) : 0
  const gross0 = grossOf(sale)

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
      hasServices: !!sale && sale.services.length > 0,
      services: sale?.services.map((sv) => ({
        name: sv.name,
        quantity: sv.quantity,
        unitPrice: sv.unitPrice,
      })) ?? [{ name: "Installation/Delivery", quantity: 1, unitPrice: 0 }],
      discountPercent: sale && gross0 > 0 ? Math.round((sale.discount / gross0) * 100) : 0,
      paymentMethod: sale?.paymentMethod ?? "Cash",
      paymentStatus: sale?.paymentStatus ?? "Paid",
    },
  })

  React.useEffect(() => {
    if (open) {
      const gross = grossOf(sale)
      form.reset({
        customerId: sale?.customerId ?? "",
        salesRepId: sale?.salesRepId ?? user?.id ?? "",
        date: sale?.date ?? new Date().toISOString().slice(0, 10),
        items: sale?.items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })) ?? [{ productId: "", quantity: 1, unitPrice: 0 }],
        hasServices: !!sale && sale.services.length > 0,
        services: sale?.services.map((sv) => ({
          name: sv.name,
          quantity: sv.quantity,
          unitPrice: sv.unitPrice,
        })) ?? [{ name: "Installation/Delivery", quantity: 1, unitPrice: 0 }],
        discountPercent: sale && gross > 0 ? Math.round((sale.discount / gross) * 100) : 0,
        paymentMethod: sale?.paymentMethod ?? "Cash",
        paymentStatus: sale?.paymentStatus ?? "Paid",
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sale])

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" })
  const {
    fields: serviceFields,
    append: appendService,
    remove: removeService,
  } = useFieldArray({ control: form.control, name: "services" })
  const watchedItems = form.watch("items")
  const watchedServices = form.watch("services")
  const watchedHasServices = form.watch("hasServices")
  const watchedDiscountPercent = form.watch("discountPercent")

  const itemsGrossLive = watchedItems.reduce((sum, it) => sum + (it.quantity || 0) * (it.unitPrice || 0), 0)
  const servicesGrossLive = watchedHasServices
    ? watchedServices.reduce((sum, sv) => sum + (sv.quantity || 0) * (sv.unitPrice || 0), 0)
    : 0
  const gross = itemsGrossLive + servicesGrossLive
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
    const services = values.hasServices
      ? values.services.map((sv) => ({
          id: sale?.services.find((x) => x.name === sv.name)?.id ?? `svc-${Math.random().toString(36).slice(2, 9)}`,
          name: sv.name,
          quantity: sv.quantity,
          unitPrice: sv.unitPrice,
          subtotal: sv.quantity * sv.unitPrice,
        }))
      : []
    const itemsGross = items.reduce((s, it) => s + it.subtotal, 0) + services.reduce((s, sv) => s + sv.subtotal, 0)
    const discount = Math.round(itemsGross * (values.discountPercent / 100))
    const totalAmount = itemsGross - discount

    const payload = {
      customerId: values.customerId,
      salesRepId: values.salesRepId,
      date: values.date,
      items,
      services,
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
      <DialogContent
        className="sm:max-w-3xl max-h-[85vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
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
              <div className="hidden sm:flex gap-2 px-2 text-xs font-medium text-muted-foreground">
                <span className="w-6 shrink-0" />
                <span className="flex-1">Product Name</span>
                <span className="w-24">Quantity</span>
                <span className="w-32">Price</span>
                <span className="w-28 text-right pr-1">Subtotal</span>
                <span className="w-9 shrink-0" />
              </div>
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center border rounded-md p-2">
                    <span className="hidden sm:flex h-8 w-6 shrink-0 items-center justify-center text-sm text-muted-foreground">
                      {index + 1}
                    </span>
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
                    <div className="w-full sm:w-24">
                      <Input
                        type="number"
                        min={1}
                        placeholder="Qty"
                        aria-invalid={!!form.formState.errors.items?.[index]?.quantity}
                        onFocus={(e) => e.target.select()}
                        {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                      />
                      {form.formState.errors.items?.[index]?.quantity && (
                        <p className="text-destructive text-sm">
                          {form.formState.errors.items[index]?.quantity?.message}
                        </p>
                      )}
                    </div>
                    <div className="w-full sm:w-32">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Unit Price"
                        aria-invalid={!!form.formState.errors.items?.[index]?.unitPrice}
                        onFocus={(e) => e.target.select()}
                        {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                      />
                      {form.formState.errors.items?.[index]?.unitPrice && (
                        <p className="text-destructive text-sm">
                          {form.formState.errors.items[index]?.unitPrice?.message}
                        </p>
                      )}
                    </div>
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

            <FormField
              control={form.control}
              name="hasServices"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(v) => {
                      const checked = v === true
                      field.onChange(checked)
                      if (checked && serviceFields.length === 0) {
                        appendService({ name: "Installation/Delivery", quantity: 1, unitPrice: 0 })
                      }
                    }}
                  />
                  Add a service (Installation/Delivery, etc.)
                </label>
              )}
            />

            {watchedHasServices && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel>Services</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => appendService({ name: "", quantity: 1, unitPrice: 0 })}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Service
                  </Button>
                </div>
                <div className="hidden sm:flex gap-2 px-2 text-xs font-medium text-muted-foreground">
                  <span className="w-6 shrink-0" />
                  <span className="flex-1">Service Name</span>
                  <span className="w-24">Quantity</span>
                  <span className="w-32">Price</span>
                  <span className="w-28 text-right pr-1">Subtotal</span>
                  <span className="w-9 shrink-0" />
                </div>
                <div className="space-y-2">
                  {serviceFields.map((field, index) => (
                    <div key={field.id} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center border rounded-md p-2">
                      <span className="hidden sm:flex h-8 w-6 shrink-0 items-center justify-center text-sm text-muted-foreground">
                        {index + 1}
                      </span>
                      <FormField
                        control={form.control}
                        name={`services.${index}.name`}
                        render={({ field: f }) => (
                          <FormItem className="flex-1 w-full">
                            <FormControl>
                              <Input placeholder="Service name" {...f} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="w-full sm:w-24">
                        <Input
                          type="number"
                          min={1}
                          placeholder="Qty"
                          aria-invalid={!!form.formState.errors.services?.[index]?.quantity}
                          onFocus={(e) => e.target.select()}
                          {...form.register(`services.${index}.quantity`, { valueAsNumber: true })}
                        />
                        {form.formState.errors.services?.[index]?.quantity && (
                          <p className="text-destructive text-sm">
                            {form.formState.errors.services[index]?.quantity?.message}
                          </p>
                        )}
                      </div>
                      <div className="w-full sm:w-32">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="Price"
                          aria-invalid={!!form.formState.errors.services?.[index]?.unitPrice}
                          onFocus={(e) => e.target.select()}
                          {...form.register(`services.${index}.unitPrice`, { valueAsNumber: true })}
                        />
                        {form.formState.errors.services?.[index]?.unitPrice && (
                          <p className="text-destructive text-sm">
                            {form.formState.errors.services[index]?.unitPrice?.message}
                          </p>
                        )}
                      </div>
                      <div className="w-full sm:w-28 text-sm font-medium text-right pr-1">
                        {formatCurrency((watchedServices[index]?.quantity || 0) * (watchedServices[index]?.unitPrice || 0))}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-danger shrink-0"
                        disabled={serviceFields.length === 1}
                        onClick={() => removeService(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Discount (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  aria-invalid={!!form.formState.errors.discountPercent}
                  onFocus={(e) => e.target.select()}
                  {...form.register("discountPercent", { valueAsNumber: true })}
                />
                {form.formState.errors.discountPercent && (
                  <p className="text-destructive text-sm">{form.formState.errors.discountPercent.message}</p>
                )}
              </div>
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
