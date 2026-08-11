"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"

type Purpose = "rent" | "sell"
type Suggestion = { placeId: string; text: string }
type Comparable = {
  title: string
  society?: string
  price: number
  areaSqft: number
  bedrooms: number
  furnishing: string
  verified: boolean
  url?: string
}
type EstimateResult = {
  currencyRate: number
  location: { formattedAddress: string; city?: string; state?: string; postalCode?: string }
  estimate: {
    lowInr: number
    midInr: number
    highInr: number
    lowAud?: number
    midAud?: number
    highAud?: number
    annualIncome?: number
    annualIncomeAud?: number
    potentialIncrease?: number
    unit: "monthly" | "total"
    confidenceScore: number
    confidenceLabel: string
    comparableCount: number
    sourceLabel: string
    medianPriceSqft: number
    recommendedListing: number
    negotiatedLow: number
    negotiatedHigh: number
    societies: string[]
    sampleComparables: Comparable[]
  }
  growthScenario?: {
    inrAnnualPercent: number
    audAnnualPercent: number
    fiveYearInr: number
    fiveYearAud?: number
    label: string
  }
  costs?: Array<{ label: string; lowInr: number; highInr: number }>
  disclaimer: string
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
const aud = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 })

export default function PropertyCalculator() {
  const [purpose, setPurpose] = useState<Purpose>("rent")
  const [address, setAddress] = useState("")
  const [placeId, setPlaceId] = useState("")
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [suggestionError, setSuggestionError] = useState("")
  const [sessionToken, setSessionToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [progressStep, setProgressStep] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [result, setResult] = useState<EstimateResult | null>(null)
  const [error, setError] = useState("")
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const heading = useMemo(
    () => (purpose === "rent" ? "Estimate rental income" : "Estimate sale value and selling costs"),
    [purpose],
  )

  const progressStages = useMemo(
    () => [
      "Verifying your property location",
      "Searching live 99acres listings",
      "Matching similar properties",
      "Removing outliers and duplicates",
      "Calculating market range and confidence",
      "Preparing your Property Intelligence Report™",
    ],
    [],
  )

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    setPlaceId("")
    setSuggestionError("")

    if (!sessionToken && typeof crypto !== "undefined" && "randomUUID" in crypto) {
      setSessionToken(crypto.randomUUID())
    }

    if (address.trim().length < 3) {
      setSuggestions([])
      return
    }

    debounce.current = setTimeout(async () => {
      setLoadingSuggestions(true)
      try {
        const params = new URLSearchParams({ input: address })
        if (sessionToken) params.set("sessionToken", sessionToken)

        const response = await fetch(`/api/location-suggest?${params.toString()}`)
        const data = await response.json()

        if (!response.ok) {
          setSuggestions([])
          setSuggestionError(data.message || "Address suggestions are temporarily unavailable.")
          return
        }

        setSuggestions(data.suggestions ?? [])
      } catch {
        setSuggestions([])
        setSuggestionError("Address suggestions are temporarily unavailable.")
      } finally {
        setLoadingSuggestions(false)
      }
    }, 350)

    return () => {
      if (debounce.current) clearTimeout(debounce.current)
    }
  }, [address, sessionToken])

  useEffect(() => {
    if (!loading) {
      setProgressStep(0)
      setElapsedSeconds(0)
      return
    }

    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      setElapsedSeconds(elapsed)

      if (elapsed < 4) setProgressStep(0)
      else if (elapsed < 14) setProgressStep(1)
      else if (elapsed < 24) setProgressStep(2)
      else if (elapsed < 34) setProgressStep(3)
      else if (elapsed < 45) setProgressStep(4)
      else setProgressStep(5)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [loading])

  async function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setLoading(true)
    setProgressStep(0)
    setElapsedSeconds(0)
    setError("")
    setResult(null)

    const formData = new FormData(event.currentTarget)
    const payload = Object.fromEntries(formData.entries())

    try {
      const response = await fetch("/api/property-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, purpose, address, placeId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "We could not calculate an estimate right now.")
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not calculate an estimate right now.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="property-calculator-section" id="property-calculator">
      <div className="property-calculator-intro">
        <div className="calculator-version-row">
          <p className="eyebrow">India Property Estimate</p>
          <span className="calculator-version-badge">Calculator V3</span>
        </div>
        <h2>What could your Indian property earn or sell for?</h2>
        <p>
          Receive an indicative estimate from live asking listings in the surrounding market, with comparable evidence,
          confidence scoring and an AUD conversion.
        </p>
        <div className="calculator-trust-row">
          <span>Address verified</span>
          <span>Live market comparables</span>
          <span>INR and AUD results</span>
        </div>
      </div>

      <div className="property-calculator-shell">
        <div className="calculator-purpose" role="tablist" aria-label="Estimate type">
          <button className={purpose === "rent" ? "active" : ""} type="button" onClick={() => { setPurpose("rent"); setResult(null); setError("") }}>Rent my property</button>
          <button className={purpose === "sell" ? "active" : ""} type="button" onClick={() => { setPurpose("sell"); setResult(null); setError("") }}>Sell my property</button>
        </div>

        <form onSubmit={calculate} className={`property-calculator-form ${loading ? "is-calculating" : ""}`}>
          <fieldset disabled={loading}>
          <div className="calculator-form-heading">
            <span>01</span>
            <div><strong>{heading}</strong><small>Live search may take 20–60 seconds</small></div>
          </div>

          <label className="calculator-field full address-field">
            Property address or locality
            <input
              name="addressText"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="e.g. Sector 119, Noida, Uttar Pradesh"
              autoComplete="off"
              required
            />
            {loadingSuggestions && <small>Searching Indian locations…</small>}
            {suggestionError && <small className="calculator-field-error">{suggestionError}</small>}
            {suggestions.length > 0 && (
              <div className="calculator-suggestions">
                {suggestions.map((item) => (
                  <button
                    key={item.placeId}
                    type="button"
                    onClick={() => {
                      setAddress(item.text)
                      setPlaceId(item.placeId)
                      setSuggestions([])
                      setSuggestionError("")
                    }}
                  >
                    {item.text}
                  </button>
                ))}
              </div>
            )}
          </label>

          <label className="calculator-field">
            Property type
            <select name="propertyType" defaultValue="apartment" required>
              <option value="apartment">Apartment</option>
              <option value="independent-house">Independent house</option>
              <option value="villa">Villa</option>
              <option value="builder-floor">Builder floor</option>
            </select>
          </label>

          <label className="calculator-field">
            Bedrooms
            <select name="bedrooms" defaultValue="3" required>
              {[1, 2, 3, 4, 5, 6].map((value) => <option key={value} value={value}>{value} BHK</option>)}
            </select>
          </label>

          <label className="calculator-field">
            Bathrooms
            <select name="bathrooms" defaultValue="2" required>
              {[1, 2, 3, 4, 5, 6].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>

          <label className="calculator-field">
            Built-up area (sq ft)
            <input name="areaSqft" type="number" min="200" max="50000" step="1" placeholder="e.g. 1450" required />
          </label>

          <label className="calculator-field">
            Furnishing
            <select name="furnishing" defaultValue="semi-furnished">
              <option value="unfurnished">Unfurnished</option>
              <option value="semi-furnished">Semi-furnished</option>
              <option value="furnished">Furnished</option>
            </select>
          </label>

          <label className="calculator-field">
            Property condition
            <select name="condition" defaultValue="good">
              <option value="excellent">Excellent / recently renovated</option>
              <option value="good">Good</option>
              <option value="minor-work">Minor work required</option>
              <option value="renovation">Renovation required</option>
            </select>
          </label>

          <label className="calculator-field">
            Approximate property age
            <select name="propertyAge" defaultValue="5-10">
              <option value="0-5">0–5 years</option>
              <option value="5-10">5–10 years</option>
              <option value="10-20">10–20 years</option>
              <option value="20-plus">20+ years</option>
            </select>
          </label>

          {purpose === "rent" ? (
            <>
              <label className="calculator-field">
                Current rental status
                <select name="rentalStatus" defaultValue="vacant">
                  <option value="vacant">Vacant</option>
                  <option value="owner-occupied">Owner occupied</option>
                  <option value="rented">Currently rented</option>
                </select>
              </label>
              <label className="calculator-field">
                Current monthly rent (optional)
                <input name="currentRent" type="number" min="0" step="100" placeholder="₹ per month" />
              </label>
            </>
          ) : (
            <>
              <label className="calculator-field">
                Outstanding home loan (optional)
                <input name="outstandingLoan" type="number" min="0" step="1000" placeholder="₹ outstanding" />
              </label>
              <label className="calculator-field">
                Ownership
                <select name="ownership" defaultValue="sole">
                  <option value="sole">Sole owner</option>
                  <option value="joint">Jointly owned</option>
                  <option value="inherited">Inherited property</option>
                </select>
              </label>
            </>
          )}

          <button className="button calculator-submit full" type="submit" disabled={loading}>
            {loading ? (
              <span className="calculator-button-loading">
                <span className="calculator-mini-spinner" aria-hidden="true" />
                Searching live market…
              </span>
            ) : purpose === "rent" ? "Calculate rental estimate" : "Calculate sale estimate"}
          </button>
          </fieldset>
        </form>

        <div className="calculator-output" aria-live="polite">
          {!loading && !result && !error && (
            <div className="calculator-empty-state">
              <span>₹</span>
              <strong>Your Property Intelligence Report™ will appear here</strong>
              <p>We compare live listings by locality, BHK, area, property type and furnishing.</p>
            </div>
          )}

          {loading && (
            <div className="calculator-progress-panel" role="status" aria-live="polite">
              <div className="calculator-progress-icon" aria-hidden="true">
                <span>₹</span>
              </div>

              <div className="calculator-progress-copy">
                <p className="eyebrow">Property Intelligence Engine™</p>
                <h3>Analysing your property</h3>
                <p>
                  We are checking the location, searching live listings and comparing similar properties.
                  This usually takes 20–60 seconds.
                </p>
              </div>

              <div className="calculator-progress-meta">
                <span>Elapsed: {elapsedSeconds}s</span>
                <span>
                  {elapsedSeconds < 20
                    ? "Usually ready within 20–60s"
                    : elapsedSeconds < 60
                      ? "Live listings are still being analysed"
                      : "This search is taking longer than usual"}
                </span>
              </div>

              <div className="calculator-progress-bar" aria-hidden="true">
                <span style={{ width: `${Math.min(92, 12 + progressStep * 15 + elapsedSeconds * 0.7)}%` }} />
              </div>

              <div className="calculator-progress-steps">
                {progressStages.map((stage, index) => {
                  const complete = index < progressStep
                  const active = index === progressStep
                  return (
                    <div
                      key={stage}
                      className={`calculator-progress-step ${complete ? "complete" : ""} ${active ? "active" : ""}`}
                    >
                      <span className="calculator-step-marker" aria-hidden="true">
                        {complete ? "✓" : active ? <span className="calculator-step-spinner" /> : index + 1}
                      </span>
                      <div>
                        <strong>{stage}</strong>
                        <small>
                          {complete ? "Completed" : active ? "In progress…" : "Waiting"}
                        </small>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="calculator-live-status">
                <span className="calculator-live-dot" aria-hidden="true" />
                Live market calculation in progress
              </div>

              <small className="calculator-progress-note">
                Please keep this page open while the report is being prepared.
              </small>
            </div>
          )}

          {error && (
            <div className="calculator-error">
              <strong>We could not complete the live estimate</strong>
              <p>{error}</p>
              <a href="#contact">Request a verified assessment</a>
            </div>
          )}

          {result && (
            <div className="calculator-result">
              <p className="eyebrow">Property Intelligence Report™</p>
              <h3>{purpose === "rent" ? "Estimated monthly rent" : "Estimated sale value"}</h3>
              <div className="calculator-main-value">
                {inr.format(result.estimate.lowInr)}–{inr.format(result.estimate.highInr)}
              </div>
              {result.estimate.lowAud && result.estimate.highAud && (
                <div className="calculator-aud-value">
                  Approximately {aud.format(result.estimate.lowAud)}–{aud.format(result.estimate.highAud)} {purpose === "rent" ? "per month" : "in total"}
                </div>
              )}

              <div className="calculator-result-grid">
                <div><small>Suggested listing</small><strong>{inr.format(result.estimate.recommendedListing)}</strong></div>
                <div><small>Likely negotiated</small><strong>{inr.format(result.estimate.negotiatedLow)}–{inr.format(result.estimate.negotiatedHigh)}</strong></div>
                <div><small>Confidence</small><strong>{result.estimate.confidenceScore}% · {result.estimate.confidenceLabel}</strong></div>
                <div><small>Comparables used</small><strong>{result.estimate.comparableCount}</strong></div>
                <div><small>Median asking rate</small><strong>₹{result.estimate.medianPriceSqft.toLocaleString("en-IN")} / sq ft{purpose === "rent" ? " / month" : ""}</strong></div>
                <div><small>Market source</small><strong>{result.estimate.sourceLabel}</strong></div>
              </div>

              {purpose === "rent" && result.estimate.annualIncome && (
                <div className="calculator-costs">
                  <h4>Income outlook</h4>
                  <div><span>Estimated annual gross rent</span><strong>{inr.format(result.estimate.annualIncome)}</strong></div>
                  {result.estimate.annualIncomeAud && <div><span>Annual income in AUD</span><strong>{aud.format(result.estimate.annualIncomeAud)}</strong></div>}
                  {result.estimate.potentialIncrease !== undefined && <div><span>Potential increase over current rent</span><strong>{inr.format(result.estimate.potentialIncrease)} / month</strong></div>}
                </div>
              )}

              {result.growthScenario && (
                <div className="calculator-costs">
                  <h4>Illustrative growth scenario</h4>
                  <div><span>INR annual assumption</span><strong>{result.growthScenario.inrAnnualPercent}%</strong></div>
                  <div><span>AUD-adjusted annual assumption</span><strong>{result.growthScenario.audAnnualPercent}%</strong></div>
                  <div><span>5-year INR scenario</span><strong>{inr.format(result.growthScenario.fiveYearInr)}</strong></div>
                  {result.growthScenario.fiveYearAud && <div><span>5-year AUD scenario</span><strong>{aud.format(result.growthScenario.fiveYearAud)}</strong></div>}
                  <small>{result.growthScenario.label}</small>
                </div>
              )}

              {result.costs && result.costs.length > 0 && (
                <div className="calculator-costs">
                  <h4>Estimated selling costs</h4>
                  {result.costs.map((item) => (
                    <div key={item.label}><span>{item.label}</span><strong>{inr.format(item.lowInr)}–{inr.format(item.highInr)}</strong></div>
                  ))}
                </div>
              )}

              {result.estimate.societies?.length > 0 && (
                <div className="calculator-costs">
                  <h4>Societies represented</h4>
                  <p>{result.estimate.societies.join(" · ")}</p>
                </div>
              )}

              {result.estimate.sampleComparables?.length > 0 && (
                <div className="calculator-comparables">
                  <h4>Closest comparable listings</h4>
                  {result.estimate.sampleComparables.map((item, index) => (
                    <div className="calculator-comparable-row" key={`${item.url || item.title}-${index}`}>
                      <div>
                        <strong>{item.society || item.title}</strong>
                        <small>{item.bedrooms} BHK · {item.areaSqft.toLocaleString("en-IN")} sq ft · {item.furnishing}{item.verified ? " · Verified" : ""}</small>
                      </div>
                      <div>
                        <strong>{inr.format(item.price)}</strong>
                        {item.url && <a href={item.url} target="_blank" rel="noreferrer">View listing</a>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="calculator-disclaimer">{result.disclaimer}</p>
              <a className="button full" href="#contact">Get a verified local assessment</a>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
