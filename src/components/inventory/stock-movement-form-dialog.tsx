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
import { STOCK_MOVEMENT_REASONS } from "@/lib/constants"
import { useAuth } from "@/lib/auth/auth-context"
import { useAddStockMovement, useProducts } from "@/lib/hooks/use-inventory"
import { generateId } from "@/lib/utils"

const schema = z
  .object({
    productId: z.string().min(1, "Select a product"),
    direction: z.enum(["in", "out"]),
    reason: z.enum(STOCK_MOVEMENT_REASONS),
    quantity: z.number().int().min(0),
    secondHandQuantity: z.number().int().min(0),
  })
  .refine((data) => data.quantity > 0 || data.secondHandQuantity > 0, {
    message: "Enter a quantity or a 2nd hand quantity",
    path: ["quantity"],
  })

type FormValues = z.infer<typeof schema>

export function StockMovementFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user } = useAuth()
  const { data: products = [] } = useProducts()
  const addMovement = useAddStockMovement(user?.id ?? "")

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      productId: "",
      direction: "in",
      reason: "Restock",
      quantity: 1,
      secondHandQuantity: 0,
    },
  })

  React.useEffect(() => {
    if (open) {
      form.reset({ productId: "", direction: "in", reason: "Restock", quantity: 1, secondHandQuantity: 0 })
    }
  }, [open, form])

  async function onSubmit(values: FormValues) {
    await addMovement.mutateAsync({
      date: new Date().toISOString().slice(0, 10),
      productId: values.productId,
      quantityAdded: values.direction === "in" ? values.quantity : 0,
      quantityRemoved: values.direction === "out" ? values.quantity : 0,
      // Direction applies to 2nd hand stock too — Stock Out subtracts from the
      // running 2nd hand total instead of always adding to it.
      secondHandQuantity: values.direction === "out" ? -values.secondHandQuantity : values.secondHandQuantity,
      reason: values.reason,
      userId: user?.id ?? "",
      referenceNumber: generateId("ADJ").toUpperCase(),
    })
    onOpenChange(false)
  }

  const pending = addMovement.isPending
  const selectedProductId = form.watch("productId")
  const selectedProduct = products.find((p) => p.id === selectedProductId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Stock Movement</DialogTitle>
          <DialogDescription>Record a manual stock adjustment.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.stockQuantity} in stock)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedProduct && (
                    <p className="text-sm text-muted-foreground">
                      Current stock: <span className="font-medium text-foreground">{selectedProduct.stockQuantity}</span> units
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="direction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Direction</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="in">Stock In (+)</SelectItem>
                        <SelectItem value="out">Stock Out (-)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STOCK_MOVEMENT_REASONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
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
                name="secondHandQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>2nd Hand Qty (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        value={field.value}
                        onChange={(e) => {
                          const value = e.target.valueAsNumber || 0
                          field.onChange(value)
                          // A movement is either regular stock or 2nd hand stock, not both —
                          // entering a 2nd hand quantity clears the regular Quantity field.
                          if (value > 0) form.setValue("quantity", 0)
                        }}
                      />
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
                {pending ? "Saving..." : "Add Movement"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
