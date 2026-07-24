"use client"

import { useEffect, useState } from "react"

const steps = [
  {
    number: "01",
    title: "Written scope",
    short: "Clear deliverables, costs and milestones",
    detail:
      "Your property objective is converted into a written scope with responsibilities, expected documents, fees and clear delivery milestones.",
    output: "Agreed action plan",
  },
  {
    number: "02",
    title: "Professional coordination",
    short: "Lawyers, CAs and property specialists",
    detail:
      "We coordinate the relevant property team, lawyer, Chartered Accountant, bank, tenant, buyer or builder around one shared outcome.",
    output: "One accountable team",
  },
  {
    number: "03",
    title: "On-ground reporting",
    short: "Updates, documents and photographs",
    detail:
      "You receive evidence-based updates, photographs, documents, risks and next actions without chasing several people in India.",
    output: "Visible progress",
  },
]

export default function InteractiveTrustBand() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return

    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % steps.length)
    }, 4500)

    return () => window.clearInterval(timer)
  }, [paused])

  const selected = steps[active]

  return (
    <section
      className="interactive-trust-band"
      aria-label="How our accountable property service works"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="interactive-trust-heading">
        <p className="eyebrow">A safer remote property process</p>
        <h2>One accountable team between where you live and where your property is.</h2>

        <div className="interactive-trust-route" aria-label="Australia to India service connection">
          <span className="route-location">Australia</span>
          <div className="route-track">
            <i className="route-moving-dot" />
          </div>
          <strong>NRI Property Connect</strong>
          <div className="route-track reverse">
            <i className="route-moving-dot" />
          </div>
          <span className="route-location">India</span>
        </div>
      </div>

      <div className="interactive-trust-content">
        <div className="interactive-trust-grid" role="tablist" aria-label="Service process steps">
          {steps.map((step, index) => (
            <button
              type="button"
              key={step.title}
              role="tab"
              aria-selected={active === index}
              className={`interactive-trust-item ${active === index ? "active" : ""}`}
              onClick={() => setActive(index)}
              onFocus={() => setActive(index)}
            >
              <span className="interactive-step-number">{step.number}</span>
              <span className="interactive-step-copy">
                <strong>{step.title}</strong>
                <small>{step.short}</small>
              </span>
              <span className="interactive-step-status" aria-hidden="true">
                {active === index ? "✓" : "→"}
              </span>
            </button>
          ))}
        </div>

        <div className="interactive-trust-detail" role="tabpanel" key={selected.title}>
          <div>
            <p>Currently highlighted</p>
            <h3>{selected.title}</h3>
            <span>{selected.detail}</span>
          </div>
          <aside>
            <small>Client outcome</small>
            <strong>{selected.output}</strong>
          </aside>
        </div>

        <div className="interactive-trust-dots" aria-label="Choose service step">
          {steps.map((step, index) => (
            <button
              type="button"
              key={step.number}
              className={active === index ? "active" : ""}
              onClick={() => setActive(index)}
              aria-label={`Show ${step.title}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
