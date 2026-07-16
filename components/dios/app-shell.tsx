"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Search,
  Briefcase,
  ArrowLeftRight,
  Radar,
  CalendarClock,
  History,
  Settings,
  Menu,
  X,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MACRO, MARKET_TAPE } from "@/lib/dios/macro"

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analyse", label: "Analyse", icon: Search },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/scan", label: "Daily Scan", icon: Radar },
  { href: "/earnings", label: "Earnings", icon: CalendarClock },
  { href: "/history", label: "Rec. History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-sidebar transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="leading-none">
            <div className="font-mono text-sm font-semibold tracking-tight text-sidebar-foreground">DIOS</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Fund Manager</div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="rounded-md bg-muted/50 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Market Regime</span>
            </div>
            <div className="mt-1 font-mono text-xs font-medium leading-tight text-sidebar-foreground text-pretty">
              {MACRO.regime}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-primary" style={{ width: `${MACRO.regimeScore}%` }} />
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">{MACRO.regimeScore}</span>
            </div>
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur lg:px-6">
          <button
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--positive)]" />
            <span className="font-mono text-xs text-muted-foreground">
              Demo data · not investment advice
            </span>
          </div>
          <div className="ml-auto hidden items-center gap-4 font-mono text-xs text-muted-foreground sm:flex">
            {MARKET_TAPE.map((t) => (
              <span key={t.label} className="flex items-center gap-1.5">
                <span>{t.label}</span>
                <span className="text-foreground">{t.value}</span>
                <span className={t.change >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}>
                  {t.change >= 0 ? "+" : ""}
                  {t.change.toFixed(2)}%
                </span>
              </span>
            ))}
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
