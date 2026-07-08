"use client"

import * as React from "react"
import { QRCodeCanvas } from "qrcode.react"
import { Copy, Download, Printer } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import type { Customer } from "@/lib/types"

export function CustomerQrDialog({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [portalUrl, setPortalUrl] = React.useState("")

  React.useEffect(() => {
    // window.location.origin is a client-only external value, unavailable during SSR.
    if (open && typeof window !== "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPortalUrl(`${window.location.origin}/portal/${customer.id}`)
    }
  }, [open, customer.id])

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) return
    const url = canvas.toDataURL("image/png")
    const a = document.createElement("a")
    a.href = url
    a.download = `${customer.orderNumber}-qr.png`
    a.click()
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(portalUrl)
    toast.success("Portal link copied")
  }

  function handlePrint() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL("image/png")
    const printWindow = window.open("", "_blank", "width=400,height=500")
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head><title>${customer.orderNumber} QR Code</title></head>
        <body style="font-family: Arial, sans-serif; text-align:center; padding:24px;">
          <h2 style="margin-bottom:4px;">${customer.fullName}</h2>
          <p style="color:#64748B; margin-top:0;">Order #: ${customer.orderNumber}</p>
          <img src="${dataUrl}" style="width:220px;height:220px;" />
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 300)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Customer QR Code</DialogTitle>
          <DialogDescription>
            Scan to view a read-only profile for order #{customer.orderNumber}. No login required.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-2">
          {portalUrl && (
            <div className="rounded-lg border p-4 bg-white">
              <QRCodeCanvas ref={canvasRef} value={portalUrl} size={200} level="M" marginSize={2} />
            </div>
          )}
          <p className="text-xs font-mono text-muted-foreground break-all text-center">{portalUrl}</p>
        </div>
        <DialogFooter className="grid grid-cols-3 gap-2 sm:grid-cols-3">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopyLink}>
            <Copy className="h-3.5 w-3.5" /> Copy Link
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5" /> Download
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
