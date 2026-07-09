"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller } from "react-hook-form"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ShieldCheck, UserRound, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Logo } from "@/components/shared/logo"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth/auth-context"
import { store } from "@/lib/mock/store"
import { createUser } from "@/lib/api/misc"
import { usersKey } from "@/lib/hooks/use-misc"
import { cn, hashPassword } from "@/lib/utils"

const signInSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(4, "Password must be at least 4 characters"),
})

const signUpSchema = z
  .object({
    name: z.string().min(2, "Full name is required"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    role: z.enum(["admin", "staff"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type Mode = "signin" | "signup"

const PasswordInput = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(
  function PasswordInput({ className, ...props }, ref) {
    const [visible, setVisible] = React.useState(false)
    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn("pr-9", className)}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    )
  }
)

export default function LoginPage() {
  const { login, user, loading } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [mode, setMode] = React.useState<Mode>("signup")

  React.useEffect(() => {
    if (!loading && user) router.replace("/")
  }, [loading, user, router])

  const signInForm = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  })

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", role: "staff" },
  })

  async function onSignIn(values: z.infer<typeof signInSchema>) {
    const email = values.email.trim().toLowerCase()
    const found = store.state.users.find((u) => u.email.trim().toLowerCase() === email)
    if (!found) {
      toast.error("No account found with that email. Sign up to create one.")
      return
    }
    if (!found.passwordHash) {
      signInForm.setError("password", {
        message: "This account has no password set. Contact an admin to reset it.",
      })
      return
    }
    const enteredHash = await hashPassword(values.password)
    if (enteredHash !== found.passwordHash) {
      signInForm.setError("password", { message: "Incorrect password." })
      return
    }
    login(found.id)
  }

  async function onSignUp(values: z.infer<typeof signUpSchema>) {
    const email = values.email.trim().toLowerCase()
    const existing = store.state.users.find((u) => u.email.trim().toLowerCase() === email)
    if (existing) {
      signUpForm.setError("email", { message: "An account with this email already exists." })
      return
    }
    const passwordHash = await hashPassword(values.password)
    const created = await createUser(
      { name: values.name.trim(), email: values.email.trim(), role: values.role, passwordHash },
      "self-signup"
    )
    queryClient.invalidateQueries({ queryKey: usersKey })
    toast.success("Account created! Welcome to MW2000.")
    login(created.id)
  }

  const signInEmailError = signInForm.formState.errors.email?.message
  const signInPasswordError = signInForm.formState.errors.password?.message

  const signUpNameError = signUpForm.formState.errors.name?.message
  const signUpEmailError = signUpForm.formState.errors.email?.message
  const signUpPasswordError = signUpForm.formState.errors.password?.message
  const signUpConfirmPasswordError = signUpForm.formState.errors.confirmPassword?.message

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo className="h-12 w-12" />
          <h1 className="text-xl font-semibold">MW2000</h1>
          <p className="text-sm text-muted-foreground">
            Customer, Sales &amp; Inventory Management for Water Purification
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{mode === "signin" ? "Sign in" : "Create an account"}</CardTitle>
            <CardDescription>
              {mode === "signin"
                ? "Enter your work email to continue."
                : "Register a new Admin or Staff account for your team."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {mode === "signin" ? (
              // Plain uncontrolled inputs (via register(), not Controller's value/onChange binding) —
              // some browser/extension combinations fight a *controlled* value on login-shaped fields,
              // silently reverting typed text. Letting the DOM own the value sidesteps that entirely.
              <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-4">
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    placeholder="you@yourcompany.com"
                    autoComplete="email"
                    aria-invalid={!!signInEmailError}
                    {...signInForm.register("email")}
                  />
                  {signInEmailError && <p className="text-destructive text-sm">{signInEmailError}</p>}
                </div>
                <div className="grid gap-2">
                  <Label>Password</Label>
                  <PasswordInput
                    placeholder="••••••••"
                    autoComplete="current-password"
                    aria-invalid={!!signInPasswordError}
                    {...signInForm.register("password")}
                  />
                  {signInPasswordError && <p className="text-destructive text-sm">{signInPasswordError}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={signInForm.formState.isSubmitting}>
                  Sign in
                </Button>
              </form>
            ) : (
              <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4">
                <div className="grid gap-2">
                  <Label>Full Name</Label>
                  <Input
                    placeholder="Juan Dela Cruz"
                    autoComplete="name"
                    aria-invalid={!!signUpNameError}
                    {...signUpForm.register("name")}
                  />
                  {signUpNameError && <p className="text-destructive text-sm">{signUpNameError}</p>}
                </div>
                <div className="grid gap-2">
                  <Label>Work Email</Label>
                  <Input
                    placeholder="you@yourcompany.com"
                    autoComplete="email"
                    aria-invalid={!!signUpEmailError}
                    {...signUpForm.register("email")}
                  />
                  {signUpEmailError && <p className="text-destructive text-sm">{signUpEmailError}</p>}
                </div>
                <div className="grid gap-2">
                  <Label>Password</Label>
                  <PasswordInput
                    placeholder="••••••••"
                    autoComplete="new-password"
                    aria-invalid={!!signUpPasswordError}
                    {...signUpForm.register("password")}
                  />
                  {signUpPasswordError && <p className="text-destructive text-sm">{signUpPasswordError}</p>}
                </div>
                <div className="grid gap-2">
                  <Label>Confirm Password</Label>
                  <PasswordInput
                    placeholder="••••••••"
                    autoComplete="new-password"
                    aria-invalid={!!signUpConfirmPasswordError}
                    {...signUpForm.register("confirmPassword")}
                  />
                  {signUpConfirmPasswordError && (
                    <p className="text-destructive text-sm">{signUpConfirmPasswordError}</p>
                  )}
                </div>
                <Controller
                  control={signUpForm.control}
                  name="role"
                  render={({ field }) => (
                    <div className="grid gap-2">
                      <Label>Account Type</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => field.onChange("admin")}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-md border py-3 text-xs transition-colors",
                            field.value === "admin"
                              ? "border-primary bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted"
                          )}
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Admin
                        </button>
                        <button
                          type="button"
                          onClick={() => field.onChange("staff")}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-md border py-3 text-xs transition-colors",
                            field.value === "staff"
                              ? "border-primary bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted"
                          )}
                        >
                          <UserRound className="h-4 w-4" />
                          Staff
                        </button>
                      </div>
                    </div>
                  )}
                />
                <Button type="submit" className="w-full" disabled={signUpForm.formState.isSubmitting}>
                  {signUpForm.formState.isSubmitting ? "Creating account..." : "Sign up"}
                </Button>
              </form>
            )}

            <div className="text-center text-sm">
              {mode === "signin" ? (
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setMode("signup")}
                >
                  Don&apos;t have an account? Sign up
                </button>
              ) : (
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setMode("signin")}
                >
                  Already have an account? Sign in
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
