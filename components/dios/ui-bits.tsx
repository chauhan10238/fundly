import type { ComponentProps, ReactNode } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import type { VariantProps } from "class-variance-authority"
import type { Recommendation } from "@/lib/dios/types"

// Base UI's Button uses a `render` prop rather than `asChild`, so we provide a
// dedicated link-styled-as-button helper for navigation.
export function ButtonLink({
  href,
  variant,
  size,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant, size, className }))} {...props}>
      {children}
    </Link>
  )
}

const RECO_STYLES: Record<Recommendation, string> = {
  "Strong Buy": "bg-positive text-positive-foreground",
  Buy: "bg-positive/85 text-positive-foreground",
  "Start Small": "bg-positive/15 text-positive border border-positive/30",
  "Buy Watch": "bg-warning/20 text-warning-foreground border border-warning/40",
  Hold: "bg-muted text-muted-foreground border border-border",
  Reduce: "bg-warning/25 text-warning-foreground border border-warning/50",
  Sell: "bg-negative/85 text-negative-foreground",
  Avoid: "bg-negative text-negative-foreground",
  "No Action": "bg-muted text-muted-foreground border border-border",
}

export function RecommendationBadge({ value, className }: { value: Recommendation; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap", RECO_STYLES[value], className)}>
      {value}
    </span>
  )
}

export function scoreColor(score: number) {
  if (score >= 80) return "text-positive"
  if (score >= 65) return "text-positive"
  if (score >= 50) return "text-warning-foreground"
  return "text-negative"
}

export function ScorePill({ score, className }: { score: number; className?: string }) {
  const bg = score >= 80 ? "bg-positive text-positive-foreground"
    : score >= 65 ? "bg-positive/80 text-positive-foreground"
    : score >= 50 ? "bg-warning/30 text-warning-foreground border border-warning/50"
    : "bg-negative/85 text-negative-foreground"
  return (
    <span className={cn("inline-flex min-w-9 items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums", bg, className)}>
      {score}
    </span>
  )
}

export function DeltaText({ value, suffix = "%", className, digits = 2 }: { value: number; suffix?: string; className?: string; digits?: number }) {
  const pos = value >= 0
  return (
    <span className={cn("tabular-nums font-medium", pos ? "text-positive" : "text-negative", className)}>
      {pos ? "+" : ""}
      {value.toFixed(digits)}
      {suffix}
    </span>
  )
}

export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  accent?: "positive" | "negative" | "warning" | "default"
}) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={cn(
          "mt-1.5 text-2xl font-semibold tabular-nums",
          accent === "positive" && "text-positive",
          accent === "negative" && "text-negative",
          accent === "warning" && "text-warning-foreground",
        )}>
          {value}
        </p>
        {sub ? <div className="mt-1 text-xs text-muted-foreground">{sub}</div> : null}
      </CardContent>
    </Card>
  )
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn("gap-0 py-0", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 border-b p-4">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground text-pretty">{description}</p> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  )
}

export function RiskBadge({ band }: { band: "low" | "medium" | "high" }) {
  const style = band === "low"
    ? "bg-positive/15 text-positive border-positive/30"
    : band === "medium"
    ? "bg-warning/20 text-warning-foreground border-warning/40"
    : "bg-negative/15 text-negative border-negative/30"
  return (
    <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", style)}>
      {band}
    </span>
  )
}
