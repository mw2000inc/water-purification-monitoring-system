"use client"

import * as React from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
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
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DISPENSER_TYPES, TECHNICIANS } from "@/lib/constants"
import { useAuth } from "@/lib/auth/auth-context"
import { useCreateCustomer, useUpdateCustomer } from "@/lib/hooks/use-customers"
import type { Customer } from "@/lib/types"

const schema = z
  .object({
    fullName: z.string().min(2, "Full name is required"),
    companyName: z.string().optional(),
    contractNumber: z.string().min(2, "Contract number is required"),
    contractStart: z.string().min(1, "Start date is required"),
    contractEnd: z.string().min(1, "End date is required"),
    address: z.string().min(5, "Address is required"),
    email: z.string().email("Enter a valid email address"),
    contactNumber: z.string().min(7, "Enter a valid contact number"),
    dispenserType: z.string().min(1, "Select a dispenser type"),
    filterInstalled: z.boolean(),
    assignedTechnician: z.string().min(1, "Select a technician"),
    notes: z.string().optional(),
  })
  .refine((data) => new Date(data.contractEnd) > new Date(data.contractStart), {
    message: "End date must be after start date",
    path: ["contractEnd"],
  })

type FormValues = z.infer<typeof schema>

function defaultValues(customer?: Customer): FormValues {
  return {
    fullName: customer?.fullName ?? "",
    companyName: customer?.companyName ?? "",
    contractNumber: customer?.contractNumber ?? "",
    contractStart: customer?.contractStart ?? new Date().toISOString().slice(0, 10),
    contractEnd: customer?.contractEnd ?? "",
    address: customer?.address ?? "",
    email: customer?.email ?? "",
    contactNumber: customer?.contactNumber ?? "",
    dispenserType: customer?.dispenserType ?? "",
    filterInstalled: customer?.filterInstalled ?? false,
    assignedTechnician: customer?.assignedTechnician ?? "",
    notes: customer?.notes ?? "",
  }
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer
  onCreated?: (customer: Customer) => void
}) {
  const { user } = useAuth()
  const createCustomer = useCreateCustomer(user?.id ?? "")
  const updateCustomer = useUpdateCustomer(user?.id ?? "")
  const isEdit = !!customer

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(customer),
  })

  React.useEffect(() => {
    if (open) form.reset(defaultValues(customer))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customer])

  async function onSubmit(values: FormValues) {
    if (isEdit) {
      await updateCustomer.mutateAsync({ id: customer.id, input: values })
    } else {
      const created = await createCustomer.mutateAsync(values)
      onCreated?.(created)
    }
    onOpenChange(false)
  }

  const pending = createCustomer.isPending || updateCustomer.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Customer" : "Add Customer"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update customer and contract details." : "Register a new customer and their contract."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Juan Dela Cruz" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Golden Harvest Corp." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="juan@mail.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                      <Input placeholder="09171234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St., Quezon City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contractNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Number</FormLabel>
                    <FormControl>
                      <Input placeholder="CN-2026-1001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dispenserType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Water Purification Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DISPENSER_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
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
                name="contractStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contractEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assignedTechnician"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Technician</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select technician" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TECHNICIANS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
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
                name="filterInstalled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-md border p-3">
                    <FormLabel className="cursor-pointer">Water Filter Installed</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Optional notes about this customer..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : isEdit ? "Save Changes" : "Add Customer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
