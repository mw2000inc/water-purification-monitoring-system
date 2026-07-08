"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Download, Plus, Settings as SettingsIcon, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AdminGuard } from "@/components/shared/admin-guard"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { useSettings, useUpdateSettings } from "@/lib/hooks/use-misc"
import { useAuth } from "@/lib/auth/auth-context"
import { exportBackup, restoreBackup } from "@/lib/api/misc"
import type { ContactEntry } from "@/lib/types"

function ContactEntryList({
  title,
  entries,
  onChange,
  labelPlaceholder,
  valuePlaceholder,
}: {
  title: string
  entries: ContactEntry[]
  onChange: (entries: ContactEntry[]) => void
  labelPlaceholder: string
  valuePlaceholder: string
}) {
  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      <div className="space-y-2">
        {entries.map((entry, i) => (
          <div key={i} className="flex gap-2">
            <Input
              className="w-36"
              placeholder={labelPlaceholder}
              value={entry.label}
              onChange={(e) => onChange(entries.map((it, idx) => (idx === i ? { ...it, label: e.target.value } : it)))}
            />
            <Input
              placeholder={valuePlaceholder}
              value={entry.value}
              onChange={(e) => onChange(entries.map((it, idx) => (idx === i ? { ...it, value: e.target.value } : it)))}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-danger shrink-0"
              onClick={() => onChange(entries.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => onChange([...entries, { label: "", value: "" }])}
      >
        <Plus className="h-3.5 w-3.5" /> Add
      </Button>
    </div>
  )
}

export default function SettingsPage() {
  const { user } = useAuth()
  const { data: settings, isPending } = useSettings()
  const updateSettings = useUpdateSettings(user?.id ?? "")
  const queryClient = useQueryClient()

  const [companyName, setCompanyName] = React.useState("")
  const [logoUrl, setLogoUrl] = React.useState<string | undefined>(undefined)
  const [supportEmail, setSupportEmail] = React.useState("")
  const [emailNotifications, setEmailNotifications] = React.useState(true)
  const [currency, setCurrency] = React.useState("")
  const [taxRate, setTaxRate] = React.useState(0)
  const [address, setAddress] = React.useState("")
  const [contactNumbers, setContactNumbers] = React.useState<ContactEntry[]>([])
  const [contactEmails, setContactEmails] = React.useState<ContactEntry[]>([])
  const [restoreFile, setRestoreFile] = React.useState<File | undefined>(undefined)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const restoreInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    // One-time sync from the fetched settings record into editable local form state.
    if (settings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCompanyName(settings.companyName)
      setLogoUrl(settings.companyLogoUrl)
      setSupportEmail(settings.supportEmail)
      setEmailNotifications(settings.emailNotificationsEnabled)
      setCurrency(settings.currency)
      setTaxRate(settings.taxRate)
      setAddress(settings.address)
      setContactNumbers(settings.contactNumbers)
      setContactEmails(settings.contactEmails)
    }
  }, [settings])

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setLogoUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  function handleSave() {
    updateSettings.mutate({
      companyName,
      companyLogoUrl: logoUrl,
      supportEmail,
      emailNotificationsEnabled: emailNotifications,
      currency,
      taxRate,
      address,
      contactNumbers,
      contactEmails,
    })
  }

  function handleBackup() {
    const json = exportBackup()
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `aquatrack-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Backup downloaded")
  }

  function handleRestoreConfirm() {
    if (!restoreFile) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        restoreBackup(reader.result as string)
        queryClient.invalidateQueries()
        toast.success("Database restored successfully")
      } catch {
        toast.error("Invalid backup file")
      } finally {
        setRestoreFile(undefined)
      }
    }
    reader.readAsText(restoreFile)
  }

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <AdminGuard>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-primary" /> Settings
          </h1>
          <p className="text-sm text-muted-foreground">Manage company information, preferences, and data.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company Information</CardTitle>
            <CardDescription>Shown on invoices and throughout the app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={logoUrl} alt="Company logo" />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {companyName.slice(0, 2).toUpperCase() || "AT"}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                  <Upload className="h-3.5 w-3.5" /> Upload Logo
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                <p className="text-xs text-muted-foreground">PNG or JPG, square recommended.</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Support Email</Label>
              <Input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="cursor-pointer">Email Notifications</Label>
                <p className="text-xs text-muted-foreground">Send email alerts for low stock and expiring contracts.</p>
              </div>
              <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company Contact Details</CardTitle>
            <CardDescription>Our own company&apos;s contact info, shown to staff from customer profiles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Office Address</Label>
              <Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <ContactEntryList
              title="Mobile Numbers"
              entries={contactNumbers}
              onChange={setContactNumbers}
              labelPlaceholder="Department"
              valuePlaceholder="0917 000 0000"
            />
            <ContactEntryList
              title="Email Addresses"
              entries={contactEmails}
              onChange={setContactEmails}
              labelPlaceholder="Department"
              valuePlaceholder="dept@aquatrack.ph"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Billing Preferences</CardTitle>
            <CardDescription>Applied to new sales and invoices.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="PHP" />
            </div>
            <div className="space-y-2">
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.valueAsNumber || 0)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Backup &amp; Restore</CardTitle>
            <CardDescription>Download a full snapshot of the database, or restore from a backup file.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={handleBackup} className="gap-1.5">
              <Download className="h-4 w-4" /> Backup Database
            </Button>
            <Button variant="outline" onClick={() => restoreInputRef.current?.click()} className="gap-1.5">
              <Upload className="h-4 w-4" /> Restore Database
            </Button>
            <input
              ref={restoreInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => setRestoreFile(e.target.files?.[0])}
            />
          </CardContent>
        </Card>

        <ConfirmDialog
          open={!!restoreFile}
          onOpenChange={(o) => !o && setRestoreFile(undefined)}
          title="Restore database?"
          description={`This will replace all current data with the contents of "${restoreFile?.name ?? ""}". This cannot be undone.`}
          confirmLabel="Restore"
          onConfirm={handleRestoreConfirm}
        />
      </div>
    </AdminGuard>
  )
}
