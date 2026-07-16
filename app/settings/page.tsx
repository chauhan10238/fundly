"use client"

import { useDios } from "@/components/dios/store"
import { SCORE_LABELS } from "@/lib/dios/scoring"
import type { ScoringWeights } from "@/lib/dios/types"
import { Panel } from "@/components/dios/ui-bits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { RotateCcw, Database, ShieldCheck } from "lucide-react"
import { MODEL_VERSION, SCORING_VERSION } from "@/lib/dios/universe"

const WEIGHT_KEYS = Object.keys(SCORE_LABELS) as (keyof ScoringWeights)[]

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useDios()

  const weightTotal = WEIGHT_KEYS.reduce((s, k) => s + settings.weights[k], 0)

  const setNum = (key: keyof typeof settings, value: string) => {
    const n = Number(value)
    if (!Number.isNaN(n)) updateSettings({ [key]: n } as never)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tune the scoring model, risk thresholds and position limits. Changes apply immediately across the app.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            resetSettings()
            toast.success("Settings reset to defaults")
          }}
        >
          <RotateCcw className="h-4 w-4" />
          Reset defaults
        </Button>
      </div>

      <Panel
        title="Scoring weights"
        description="How much each of the 12 factors contributes to the overall score. Weights are normalized, so relative size is what matters."
        action={
          <Badge variant="outline" className="font-mono">
            Σ {weightTotal}
          </Badge>
        }
      >
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 p-4 md:grid-cols-2">
          {WEIGHT_KEYS.map((key) => (
            <div key={key}>
              <div className="mb-1.5 flex items-center justify-between">
                <Label className="text-sm text-foreground">{SCORE_LABELS[key]}</Label>
                <span className="font-mono text-xs text-muted-foreground">{settings.weights[key]}</span>
              </div>
              <Slider
                value={[settings.weights[key]]}
                min={0}
                max={20}
                step={1}
                onValueChange={(v) =>
                  updateSettings({ weights: { ...settings.weights, [key]: Array.isArray(v) ? v[0] : v } })
                }
              />
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Decision thresholds" description="Score cutoffs that drive the Buy / Strong Buy labels.">
          <div className="space-y-4 p-4">
            <Field label="Minimum Buy score" hint="Below this, calls are Hold or lower.">
              <Input type="number" value={settings.minBuyScore} onChange={(e) => setNum("minBuyScore", e.target.value)} />
            </Field>
            <Field label="Minimum Strong Buy score" hint="High-conviction threshold.">
              <Input
                type="number"
                value={settings.minStrongBuyScore}
                onChange={(e) => setNum("minStrongBuyScore", e.target.value)}
              />
            </Field>
            <Field label="Risk tolerance" hint="Caps risk-adjusted sizing for higher-volatility names.">
              <div className="flex gap-2">
                {(["low", "medium", "high"] as const).map((r) => (
                  <Button
                    key={r}
                    type="button"
                    variant={settings.riskTolerance === r ? "default" : "outline"}
                    size="sm"
                    className="flex-1 capitalize"
                    onClick={() => updateSettings({ riskTolerance: r })}
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </Field>
          </div>
        </Panel>

        <Panel title="Position limits" description="Concentration guardrails used by portfolio-fit scoring and risk warnings.">
          <div className="space-y-4 p-4">
            <Field label="Max single stock weight (%)">
              <Input
                type="number"
                value={settings.maxStockWeight}
                onChange={(e) => setNum("maxStockWeight", e.target.value)}
              />
            </Field>
            <Field label="Max sector-ETF weight (%)">
              <Input
                type="number"
                value={settings.maxSectorEtfWeight}
                onChange={(e) => setNum("maxSectorEtfWeight", e.target.value)}
              />
            </Field>
            <Field label="Max sector exposure incl. look-through (%)">
              <Input
                type="number"
                value={settings.maxSectorExposure}
                onChange={(e) => setNum("maxSectorExposure", e.target.value)}
              />
            </Field>
            <Field label="Max leveraged / tactical weight (%)">
              <Input
                type="number"
                value={settings.maxLeveragedWeight}
                onChange={(e) => setNum("maxLeveragedWeight", e.target.value)}
              />
            </Field>
          </div>
        </Panel>
      </div>

      <Panel title="Data & environment" description="Where market and reference data comes from.">
        <div className="space-y-4 p-4">
          <div className="flex items-start gap-3 rounded-md border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-3">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Running in demo mode</p>
              <p className="mt-0.5 text-muted-foreground text-pretty">
                All prices, scores, earnings and outcomes are illustrative sample data generated by a deterministic engine.
                Connect a market-data provider and Postgres (Neon) to run on live data. Nothing here is investment advice.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Base currency">
              <Input value={settings.currency} onChange={(e) => updateSettings({ currency: e.target.value })} />
            </Field>
            <Field label="Default horizon">
              <Input
                value={settings.defaultHorizon}
                onChange={(e) => updateSettings({ defaultHorizon: e.target.value })}
              />
            </Field>
            <Field label="Market-data provider">
              <Input
                value={settings.marketDataProvider}
                onChange={(e) => updateSettings({ marketDataProvider: e.target.value })}
              />
            </Field>
            <Field label="Data refresh (minutes)">
              <Input
                type="number"
                value={settings.dataRefreshMinutes}
                onChange={(e) => setNum("dataRefreshMinutes", e.target.value)}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Model
            </span>
            <Badge variant="outline" className="font-mono">
              {MODEL_VERSION}
            </Badge>
            <Badge variant="outline" className="font-mono">
              {SCORING_VERSION}
            </Badge>
          </div>
        </div>
      </Panel>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm text-foreground">{label}</Label>
      {hint ? <p className="mb-1.5 mt-0.5 text-xs text-muted-foreground">{hint}</p> : <div className="mb-1.5" />}
      {children}
    </div>
  )
}
