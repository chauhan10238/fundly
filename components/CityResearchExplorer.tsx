"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import type { CityProfile } from "@/lib/city-research"

export default function CityResearchExplorer({ cities }: { cities: CityProfile[] }) {
  const regions = ["All", ...Array.from(new Set(cities.map((city) => city.region)))]
  const [region, setRegion] = useState("All")
  const [query, setQuery] = useState("")

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return cities
      .filter((city) => region === "All" || city.region === region)
      .filter((city) => !needle || `${city.city} ${city.state} ${city.region} ${city.tagline}`.toLowerCase().includes(needle))
      .sort((a, b) => b.score - a.score)
  }, [cities, query, region])

  return (
    <>
      <section className="city-explorer-toolbar">
        <label>
          <span>Find your property city</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Delhi, Noida, Jaipur, Punjab…" />
        </label>
        <div className="city-region-filters" aria-label="Filter city research by region">
          {regions.map((item) => (
            <button key={item} type="button" onClick={() => setRegion(item)} className={region === item ? "active" : ""}>{item}</button>
          ))}
        </div>
        <Link href="/investment-research/compare" className="city-compare-link">Compare city profiles →</Link>
      </section>

      <section className="city-research-grid">
        {visible.map((city) => (
          <Link href={`/investment-research/${city.slug}`} key={city.slug} className="city-research-card">
            <div><span>{city.region}</span><b>{city.score}/100</b></div>
            <h2>{city.city}</h2><p>{city.tagline}</p>
            <div className="city-mini-track"><i style={{ width: `${city.score}%` }} /></div>
            <small>{city.recommendation}</small><strong>Explore city profile →</strong>
          </Link>
        ))}
      </section>
    </>
  )
}
