"use client"

import { useEffect, useState } from "react"

const activity = [
  "Sydney client brief received",
  "Noida market comparables checked",
  "Delhi legal documents reviewed",
  "Property owner update prepared",
]

export default function AustraliaIndiaHero() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((value) => (value + 1) % activity.length)
    }, 2600)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="bridge-visual" aria-label="Australia to India property services network">
      <div className="bridge-glow bridge-glow-blue" />
      <div className="bridge-glow bridge-glow-saffron" />

      <div className="bridge-topline">
        <span><b>🇦🇺</b> Sydney</span>
        <strong>Australia ↔ India</strong>
        <span><b>🇮🇳</b> Delhi NCR</span>
      </div>

      <div className="bridge-scene">
        <div className="skyline-card skyline-sydney">
          <span className="skyline-label">Sydney relationship team</span>
          <svg viewBox="0 0 360 180" role="img" aria-label="Stylised Sydney skyline">
            <path d="M0 147h360v33H0z" className="water" />
            <path d="M0 147c50-16 97-13 142 0s92 15 138 0 66-8 80 0" className="wave" />
            <path d="M77 144c12-45 31-68 58-70-11 13-17 30-18 51 12-24 29-39 52-45-8 15-11 32-8 51 10-18 24-29 43-33-8 15-11 30-10 46H77z" className="opera" />
            <path d="M241 144V53h10v91m-21 0h52m-38-91 2-23 3 23" className="tower" />
            <path d="M300 144V87h27v57m-16-57V66h7v21" className="building" />
          </svg>
        </div>

        <div className="route-layer" aria-hidden="true">
          <svg viewBox="0 0 600 210">
            <defs>
              <linearGradient id="routeGradient" x1="0" x2="1">
                <stop offset="0" stopColor="#2f79ee" />
                <stop offset="0.58" stopColor="#f49a38" />
                <stop offset="1" stopColor="#15905a" />
              </linearGradient>
            </defs>
            <path id="routePath" d="M62 152 C190 30, 405 30, 538 151" fill="none" stroke="url(#routeGradient)" strokeWidth="3" strokeDasharray="8 10" />
            <circle r="7" fill="#fff" stroke="#2f79ee" strokeWidth="3">
              <animateMotion dur="5s" repeatCount="indefinite" path="M62 152 C190 30, 405 30, 538 151" />
            </circle>
          </svg>
          <div className="route-badge">Property intelligence moving securely</div>
        </div>

        <div className="skyline-card skyline-india">
          <span className="skyline-label">India execution network</span>
          <svg viewBox="0 0 360 180" role="img" aria-label="Stylised India Gate and modern skyline">
            <path d="M0 147h360v33H0z" className="ground" />
            <path d="M68 144V91h36v53m-29-53V72h22v19m-12-19V57h4v15" className="building" />
            <path d="M128 144V70h16v74m-8-74V49" className="tower" />
            <path d="M202 144h86v-11h-12V72h-62v61h-12zm25-11V91c0-14 8-24 18-24s18 10 18 24v42" className="india-gate" />
            <path d="M219 72h52m-45-12h38m-31-11h24" className="gate-detail" />
          </svg>
        </div>
      </div>

      <div className="command-panel">
        <div>
          <small>Live coordination status</small>
          <strong>{activity[active]}</strong>
        </div>
        <div className="command-pulse"><i /><span>Connected</span></div>
      </div>

      <div className="hero-metric-row">
        <div><span>Property journey</span><strong>One accountable team</strong></div>
        <div><span>Market intelligence</span><strong>Live comparable data</strong></div>
        <div><span>Owner visibility</span><strong>Australia-friendly reporting</strong></div>
      </div>
    </div>
  )
}
