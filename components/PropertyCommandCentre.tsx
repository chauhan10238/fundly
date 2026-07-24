"use client"

import { useState } from "react"

const cities = [
  { name: "Delhi NCR", score: 91, rent: "Strong", liquidity: "High", note: "Deep resale market and broad employment base" },
  { name: "Noida", score: 89, rent: "Strong", liquidity: "High", note: "Infrastructure-led demand with active apartment market" },
  { name: "Gurugram", score: 88, rent: "Very strong", liquidity: "High", note: "Corporate tenant base and premium rental demand" },
  { name: "Chandigarh", score: 86, rent: "Stable", liquidity: "Medium", note: "Limited supply and strong end-user preference" },
  { name: "Lucknow", score: 83, rent: "Improving", liquidity: "Medium", note: "Expanding infrastructure and institutional demand" },
]

export default function PropertyCommandCentre() {
  const [selected, setSelected] = useState(cities[0])

  return (
    <section className="command-centre-section" id="command-centre">
      <div className="command-centre-copy">
        <p className="eyebrow">India Property Command Centre</p>
        <h2>See the market, your property and the next action in one place.</h2>
        <p>
          A premium decision layer for NRIs—combining live market evidence, local execution,
          property management visibility and Australia-friendly reporting.
        </p>

        <div className="command-feature-list">
          <div><span>01</span><strong>Live value and rent intelligence</strong><p>Comparable listings, confidence range and locality context.</p></div>
          <div><span>02</span><strong>Digital property file</strong><p>Documents, inspection history, maintenance and owner updates.</p></div>
          <div><span>03</span><strong>Action recommendation</strong><p>Hold, rent, renovate, sell or investigate further.</p></div>
        </div>
      </div>

      <div className="command-dashboard">
        <div className="dashboard-toolbar">
          <div>
            <small>Market selected</small>
            <strong>{selected.name}</strong>
          </div>
          <span className="dashboard-live"><i /> Live intelligence</span>
        </div>

        <div className="dashboard-score-row">
          <div className="score-orbit">
            <div><strong>{selected.score}</strong><span>/100</span></div>
          </div>
          <div className="score-copy">
            <small>Property Intelligence Score™</small>
            <h3>{selected.score >= 90 ? "Excellent market depth" : selected.score >= 86 ? "Strong market profile" : "Positive emerging profile"}</h3>
            <p>{selected.note}</p>
          </div>
        </div>

        <div className="dashboard-metrics">
          <div><small>Rental demand</small><strong>{selected.rent}</strong><span className="metric-line"><i style={{ width: `${selected.score - 8}%` }} /></span></div>
          <div><small>Liquidity</small><strong>{selected.liquidity}</strong><span className="metric-line"><i style={{ width: `${selected.score - 4}%` }} /></span></div>
          <div><small>NRI suitability</small><strong>{selected.score >= 88 ? "Very good" : "Good"}</strong><span className="metric-line"><i style={{ width: `${selected.score}%` }} /></span></div>
        </div>

        <div className="city-selector" aria-label="Select a city market">
          {cities.map((city) => (
            <button key={city.name} className={selected.name === city.name ? "active" : ""} type="button" onClick={() => setSelected(city)}>
              <span>{city.name}</span><strong>{city.score}</strong>
            </button>
          ))}
        </div>

        <a className="dashboard-link" href="/investment-research">Explore India Property Intelligence Centre →</a>
      </div>
    </section>
  )
}
