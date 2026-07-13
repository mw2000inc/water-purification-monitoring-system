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
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { STOCK_MOVEMENT_REASONS } from "@/lib/constants"
import { useAuth } from "@/lib/auth/auth-context"
import { useAddStockMovement, useProducts, useUpdateStockMovement } from "@/lib/hooks/use-inventory"
import { generateId } from "@/lib/utils"
import type { StockMovement } from "@/lib/types"

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

function directionOf(m?: StockMovement): "in" | "out" {
  if (!m) return "in"
  if (m.quantityRemoved > 0) return "out"
  if (m.quantityAdded > 0) return "in"
  return m.secondHandQuantity < 0 ? "out" : "in"
}

function defaultValues(m?: StockMovement): FormValues {
  if (!m) {
    return { productId: "", direction: "in", reason: "Restock", quantity: 1, secondHandQuantity: 0 }
  }
  return {
    productId: m.productId,
    direction: directionOf(m),
    // "Sale" movements never reach this dialog (the actions menu hides them), but the
    // reason field only accepts the manually-selectable reasons — fall back defensively.
    reason: m.reason === "Sale" ? "Adjustment" : m.reason,
    quantity: m.quantityAdded || m.quantityRemoved || 0,
    secondHandQuantity: Math.abs(m.secondHandQuantity),
  }
}

export function StockMovementFormDialog({
  open,
  onOpenChange,
  movement,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  movement?: StockMovement
}) {
  const { user } = useAuth()
  const { data: products = [] } = useProducts()
  const addMovement = useAddStockMovement(user?.id ?? "")
  const updateMovement = useUpdateStockMovement(user?.id ?? "")
  const isEdit = !!movement

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(movement),
  })

  React.useEffect(() => {
    if (open) form.reset(defaultValues(movement))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, movement])

  async function onSubmit(values: FormValues) {
    const quantityAdded = values.direction === "in" ? values.quantity : 0
    const quantityRemoved = values.direction === "out" ? values.quantity : 0
    // Direction applies to 2nd hand stock too — Stock Out subtracts from the
    // running 2nd hand total instead of always adding to it.
    const secondHandQuantity = values.direction === "out" ? -values.secondHandQuantity : values.secondHandQuantity

    if (isEdit) {
      await updateMovement.mutateAsync({
        id: movement.id,
        input: { quantityAdded, quantityRemoved, secondHandQuantity, reason: values.reason },
      })
    } else {
      await addMovement.mutateAsync({
        date: new Date().toISOString().slice(0, 10),
        productId: values.productId,
        quantityAdded,
        quantityRemoved,
        secondHandQuantity,
        reason: values.reason,
        userId: user?.id ?? "",
        referenceNumber: generateId("ADJ").toUpperCase(),
      })
    }
    onOpenChange(false)
  }

  const pending = addMovement.isPending || updateMovement.isPending
  const selectedProductId = form.watch("productId")
  const selectedProduct = products.find((p) => p.id === selectedProductId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Stock Movement" : "Add Stock Movement"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this stock movement." : "Record a manual stock adjustment."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isEdit ? (
              <div className="grid gap-2">
                <Label>Product</Label>
                <Input value={selectedProduct?.name ?? "Unknown product"} disabled />
                <p className="text-xs text-muted-foreground">The product on a movement can&apos;t be changed.</p>
              </div>
            ) : (
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {selectedProduct && (
              <p className="text-sm text-muted-foreground">
                Current stock: <span className="font-medium text-foreground">{selectedProduct.stockQuantity}</span> units
              </p>
            )}
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
                        onFocus={(e) => e.target.select()}
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
                        onFocus={(e) => e.target.select()}
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
                {pending ? "Saving..." : isEdit ? "Save Changes" : "Add Movement"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
