import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

export function SummaryCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  hint,
  href,
}: {
  label: string
  value: string | number
  icon: LucideIcon
  tone?: "primary" | "secondary" | "success" | "warning" | "danger"
  hint?: string
  href?: string
}) {
  const toneClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
  }

  const card = (
    <Card
      className={cn(
        href && "transition-colors hover:border-primary/40 hover:shadow-sm cursor-pointer"
      )}
    >
      <CardContent className="flex items-center gap-4 py-2">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {card}
      </Link>
    )
  }

  return card
}
