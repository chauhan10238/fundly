"use client"

import { useState } from "react"

type Location = {
  name: string
  country: string
  x: number
  y: number
  type: "client" | "india"
}

const locations: Location[] = [
  { name: "California", country: "United States", x: 10.5, y: 29, type: "client" },
  { name: "New York", country: "United States", x: 23, y: 31.5, type: "client" },
  { name: "London", country: "United Kingdom", x: 45.5, y: 23, type: "client" },
  { name: "Paris", country: "France", x: 47.3, y: 26.2, type: "client" },
  { name: "Milan", country: "Italy", x: 50.3, y: 27.8, type: "client" },
  { name: "Dubai", country: "United Arab Emirates", x: 60.5, y: 39, type: "client" },
  { name: "Sydney", country: "Australia", x: 86.8, y: 72.5, type: "client" },
  { name: "Brisbane", country: "Australia", x: 88.7, y: 67.8, type: "client" },
  { name: "Melbourne", country: "Australia", x: 85.8, y: 76.5, type: "client" },
  { name: "Perth", country: "Australia", x: 79.2, y: 72.2, type: "client" },
  { name: "Auckland", country: "New Zealand", x: 94, y: 79.5, type: "client" },
  { name: "Christchurch", country: "New Zealand", x: 93, y: 84, type: "client" },
  { name: "Delhi NCR", country: "India", x: 69.2, y: 39.5, type: "india" },
  { name: "Noida", country: "India", x: 69.8, y: 40.5, type: "india" },
  { name: "Gurugram", country: "India", x: 68.8, y: 40.3, type: "india" },
  { name: "Jaipur", country: "India", x: 67.7, y: 43, type: "india" },
  { name: "Lucknow", country: "India", x: 72, y: 42.5, type: "india" },
  { name: "Dehradun", country: "India", x: 70, y: 37.4, type: "india" },
]

export default function GlobalClientNetworkMap() {
  const [active, setActive] = useState<Location | null>(locations[12])

  return (
    <section className="dark-network-section" id="regions">
      <div className="dark-network-copy">
        <p className="dark-network-eyebrow">Global clients, local execution</p>
        <h2>
          Overseas Indian clients across the world.
          <span> Property support on the ground in India.</span>
        </h2>
        <p>
          Our clients connect with us from Australia, New Zealand, Dubai,
          the United States and Europe, while our India team coordinates
          property, legal and tax work locally.
        </p>

        <div className="dark-network-stats">
          <article>
            <strong>17</strong>
            <span>overseas client cities</span>
          </article>
          <article>
            <strong>11</strong>
            <span>Indian service cities</span>
          </article>
          <article>
            <strong>5</strong>
            <span>international regions</span>
          </article>
        </div>

        <a href="#contact" className="dark-network-button">
          Discuss your property →
        </a>
      </div>

      <div className="dark-network-map-card">
        <img
          src="/images/global-client-network-map.jpg"
          alt="Dark world map showing global NRI client locations connected to India"
        />

        <div className="dark-network-overlay" aria-label="Interactive locations">
          {locations.map((location) => (
            <button
              type="button"
              key={`${location.name}-${location.country}`}
              className={`dark-network-pin ${location.type}`}
              style={{ left: `${location.x}%`, top: `${location.y}%` }}
              onMouseEnter={() => setActive(location)}
              onFocus={() => setActive(location)}
              onClick={() => setActive(location)}
              aria-label={`${location.name}, ${location.country}`}
            >
              <span />
            </button>
          ))}
        </div>

        {active && (
          <div
            className={`dark-network-tooltip ${active.type}`}
            role="status"
            aria-live="polite"
          >
            <small>
              {active.type === "india"
                ? "India service location"
                : "Overseas client location"}
            </small>
            <strong>{active.name}</strong>
            <span>{active.country}</span>
          </div>
        )}

        <div className="dark-network-legend">
          <span><i className="client" /> Overseas client cities</span>
          <span><i className="india" /> Indian service locations</span>
          <span><i className="route" /> Coordinated support pathway</span>
        </div>
      </div>
    </section>
  )
}
