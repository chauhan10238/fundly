"use client"

import { useEffect, useRef } from "react"

declare global {
  interface Window {
    L?: any
  }
}

const indiaHub: [number, number] = [28.6139, 77.209]

const overseasCities = [
  { city: "Sydney", country: "Australia", coords: [-33.8688, 151.2093] },
  { city: "Brisbane", country: "Australia", coords: [-27.4698, 153.0251] },
  { city: "Adelaide", country: "Australia", coords: [-34.9285, 138.6007] },
  { city: "Melbourne", country: "Australia", coords: [-37.8136, 144.9631] },
  { city: "Perth", country: "Australia", coords: [-31.9523, 115.8613] },
  { city: "Newcastle", country: "Australia", coords: [-32.9283, 151.7817] },
  { city: "Gold Coast", country: "Australia", coords: [-28.0167, 153.4000] },
  { city: "Cairns", country: "Australia", coords: [-16.9186, 145.7781] },
  { city: "Darwin", country: "Australia", coords: [-12.4634, 130.8456] },
  { city: "Auckland", country: "New Zealand", coords: [-36.8509, 174.7645] },
  { city: "Christchurch", country: "New Zealand", coords: [-43.5321, 172.6362] },
  { city: "Dubai", country: "United Arab Emirates", coords: [25.2048, 55.2708] },
  { city: "New York", country: "United States", coords: [40.7128, -74.0060] },
  { city: "California", country: "United States", coords: [36.7783, -119.4179] },
  { city: "London", country: "United Kingdom", coords: [51.5072, -0.1276] },
  { city: "Paris", country: "France", coords: [48.8566, 2.3522] },
  { city: "Milan", country: "Italy", coords: [45.4642, 9.1900] },
]

const indiaCities = [
  { city: "Delhi", coords: [28.6139, 77.2090] },
  { city: "Noida", coords: [28.5355, 77.3910] },
  { city: "Gurugram", coords: [28.4595, 77.0266] },
  { city: "Ghaziabad", coords: [28.6692, 77.4538] },
  { city: "Lucknow", coords: [26.8467, 80.9462] },
  { city: "Chandigarh", coords: [30.7333, 76.7794] },
  { city: "Amritsar", coords: [31.6340, 74.8723] },
  { city: "Jaipur", coords: [26.9124, 75.7873] },
  { city: "Dehradun", coords: [30.3165, 78.0322] },
  { city: "Haridwar", coords: [29.9457, 78.1642] },
  { city: "Shimla", coords: [31.1048, 77.1734] },
]

function loadLeaflet(): Promise<any> {
  if (window.L) return Promise.resolve(window.L)

  return new Promise((resolve, reject) => {
    const existingCss = document.querySelector(
      'link[data-leaflet-css="true"]',
    )

    if (!existingCss) {
      const css = document.createElement("link")
      css.rel = "stylesheet"
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      css.crossOrigin = ""
      css.dataset.leafletCss = "true"
      document.head.appendChild(css)
    }

    const existingScript = document.querySelector(
      'script[data-leaflet-script="true"]',
    ) as HTMLScriptElement | null

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.L))
      existingScript.addEventListener("error", reject)
      return
    }

    const script = document.createElement("script")
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    script.crossOrigin = ""
    script.dataset.leafletScript = "true"
    script.onload = () => resolve(window.L)
    script.onerror = reject
    document.body.appendChild(script)
  })
}

export default function WorldCoverageMap() {
  const mapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let map: any
    let cancelled = false

    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapRef.current) return

        map = L.map(mapRef.current, {
          center: [12, 45],
          zoom: 2,
          minZoom: 2,
          maxZoom: 8,
          scrollWheelZoom: false,
          zoomControl: true,
          worldCopyJump: true,
        })

        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
          {
            attribution:
              '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: "abcd",
            maxZoom: 20,
          },
        ).addTo(map)

        const overseasIcon = L.divIcon({
          className: "leaflet-custom-icon",
          html: '<span class="map-pin map-pin-overseas"><i></i></span>',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        })

        const indiaIcon = L.divIcon({
          className: "leaflet-custom-icon",
          html: '<span class="map-pin map-pin-india"><i></i></span>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        })

        overseasCities.forEach((location) => {
          const marker = L.marker(location.coords, {
            icon: overseasIcon,
            title: location.city,
          }).addTo(map)

          marker.bindTooltip(
            `<strong>${location.city}</strong><br/>${location.country}<br/><small>Overseas client location</small>`,
            { direction: "top", offset: [0, -10] },
          )

          L.polyline([location.coords, indiaHub], {
            color: "#d97706",
            weight: 1.4,
            opacity: 0.46,
            dashArray: "5 8",
            interactive: false,
          }).addTo(map)
        })

        indiaCities.forEach((location) => {
          const marker = L.marker(location.coords, {
            icon: indiaIcon,
            title: location.city,
          }).addTo(map)

          marker.bindTooltip(
            `<strong>${location.city}</strong><br/><small>Indian service city</small>`,
            { direction: "top", offset: [0, -9] },
          )
        })

        L.circle(indiaHub, {
          radius: 450000,
          color: "#ea580c",
          weight: 2,
          fillColor: "#f59e0b",
          fillOpacity: 0.08,
        }).addTo(map)

        const bounds = L.latLngBounds(
          overseasCities.map((item) => item.coords),
        )
        map.fitBounds(bounds.pad(0.08))
      })
      .catch((error) => {
        console.error("Unable to load interactive map:", error)
      })

    return () => {
      cancelled = true
      if (map) map.remove()
    }
  }, [])

  return (
    <section className="leaflet-coverage-section" id="regions">
      <div className="leaflet-coverage-heading">
        <div>
          <p className="saffron-eyebrow">Global clients, local execution</p>
          <h2>
            Serving overseas Indians across the world.
            <span> Managing property on the ground in India.</span>
          </h2>
          <p>
            Our client network spans Australia, New Zealand, Dubai, the United
            States and Europe, supported by local teams across key North Indian
            cities.
          </p>
        </div>

        <a className="saffron-outline-button" href="#contact">
          Discuss your property →
        </a>
      </div>

      <div className="leaflet-map-shell">
        <div ref={mapRef} className="leaflet-world-map" />

        <div className="leaflet-map-legend">
          <span><i className="legend-pin overseas" /> Overseas client cities</span>
          <span><i className="legend-pin india" /> Indian service cities</span>
          <span><i className="legend-route" /> Coordinated support pathway</span>
        </div>
      </div>

      <div className="leaflet-location-lists">
        <div>
          <p>Overseas client cities</p>
          <div>
            {overseasCities.map((item) => (
              <span key={item.city}>{item.city}</span>
            ))}
          </div>
        </div>

        <div>
          <p>Indian cities currently managed</p>
          <div className="india-list">
            {indiaCities.map((item) => (
              <span key={item.city}>{item.city}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
