"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Droplets, ShieldCheck, UserRound } from "lucide-react"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth/auth-context"
import { store } from "@/lib/mock/store"

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(4, "Password must be at least 4 characters"),
})

export default function LoginPage() {
  const { login, user, loading } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (!loading && user) router.replace("/")
  }, [loading, user, router])

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  function onSubmit(values: z.infer<typeof schema>) {
    const found = store.state.users.find(
      (u) => u.email.toLowerCase() === values.email.toLowerCase()
    )
    if (!found) {
      toast.error("No account found with that email in this demo. Try one of the quick logins below.")
      return
    }
    login(found.id)
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Droplets className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold">AquaTrack</h1>
          <p className="text-sm text-muted-foreground">
            Customer, Sales &amp; Inventory Management for Water Purification
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sign in</CardTitle>
            <CardDescription>Enter your work email to continue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="admin@aquatrack.ph" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  Sign in
                </Button>
              </form>
            </Form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or try a demo account</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="flex-col h-auto py-3 gap-1" onClick={() => login("usr-001")}>
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-xs">Admin</span>
              </Button>
              <Button variant="outline" className="flex-col h-auto py-3 gap-1" onClick={() => login("usr-002")}>
                <UserRound className="h-4 w-4 text-secondary" />
                <span className="text-xs">Staff</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
