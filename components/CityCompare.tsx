"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import type { CityProfile } from "@/lib/city-research"

const metricValue = (city: CityProfile, label: string) => city.indicators.find((item) => item.label === label)?.value || "—"

export default function CityCompare({ cities }: { cities: CityProfile[] }) {
  const defaults = ["noida", "gurugram", "mohali", "lucknow"]
  const [selected, setSelected] = useState(defaults)
  const compared = useMemo(() => selected.map((slug) => cities.find((city) => city.slug === slug)).filter(Boolean) as CityProfile[], [cities, selected])

  const update = (index: number, slug: string) => setSelected((current) => current.map((item, itemIndex) => itemIndex === index ? slug : item))

  return (
    <main className="city-compare-page">
      <header className="city-dashboard-header">
        <Link href="/" className="city-dashboard-brand"><span>NPC</span><strong>NRI Property Connect</strong></Link>
        <nav><Link href="/">Home</Link><Link href="/investment-research">City Research</Link><Link href="/knowledge-hub">Knowledge Hub</Link><Link href="/#contact" className="city-dashboard-cta">Free consultation</Link></nav>
      </header>

      <section className="city-research-hero compact">
        <p className="city-dashboard-eyebrow">Compare North India markets</p>
        <h1>Put up to four cities side by side.</h1>
        <p>Use the comparison as a screening tool, then open the detailed dashboard for corridors, risks, property strategy and current news.</p>
      </section>

      <section className="city-compare-controls">
        {selected.map((slug, index) => (
          <label key={index}><span>City {index + 1}</span><select value={slug} onChange={(event) => update(index, event.target.value)}>{cities.map((city) => <option key={city.slug} value={city.slug}>{city.city} · {city.region}</option>)}</select></label>
        ))}
      </section>

      <section className="city-compare-table-wrap">
        <table className="city-compare-table">
          <thead><tr><th>Metric</th>{compared.map((city) => <th key={city.slug}><Link href={`/investment-research/${city.slug}`}>{city.city}</Link></th>)}</tr></thead>
          <tbody>
            <tr><th>NRI opportunity score</th>{compared.map((city) => <td key={city.slug}><strong>{city.score}/100</strong></td>)}</tr>
            <tr><th>Recommendation</th>{compared.map((city) => <td key={city.slug}>{city.recommendation}</td>)}</tr>
            <tr><th>Growth profile</th>{compared.map((city) => <td key={city.slug}>{metricValue(city, "Growth profile")}</td>)}</tr>
            <tr><th>Rental depth</th>{compared.map((city) => <td key={city.slug}>{metricValue(city, "Rental depth")}</td>)}</tr>
            <tr><th>Liquidity</th>{compared.map((city) => <td key={city.slug}>{metricValue(city, "Liquidity")}</td>)}</tr>
            <tr><th>Best suited to</th>{compared.map((city) => <td key={city.slug}>{city.nriFit}</td>)}</tr>
            <tr><th>Leading corridors</th>{compared.map((city) => <td key={city.slug}>{city.corridors.slice(0, 3).map((item) => item.name).join(", ")}</td>)}</tr>
            <tr><th>Principal risks</th>{compared.map((city) => <td key={city.slug}>{city.risks.slice(0, 3).join(", ")}</td>)}</tr>
          </tbody>
        </table>
      </section>

      <section className="city-dashboard-final-cta"><div><p className="city-dashboard-eyebrow">Need a tailored shortlist?</p><h2>Compare a specific budget, property type and holding period.</h2></div><Link href="/#contact">Request a free consultation →</Link></section>
    </main>
  )
}
