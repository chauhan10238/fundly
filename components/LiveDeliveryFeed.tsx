"use client"

import { useEffect, useMemo, useState } from "react"

type DeliveryItem = {
  location: string
  problem: string
  solution: string
  result: string
  duration: string
  service: string
  initials: string
}

const deliveryItems: DeliveryItem[] = [
  {
    location: "Sydney → Noida",
    problem: "Owner was unable to manage a vacant apartment from Australia.",
    solution:
      "Local inspection completed, maintenance organised and a verified tenant shortlisted.",
    result: "Property made rent-ready",
    duration: "4 days",
    service: "Property Management",
    initials: "RM",
  },
  {
    location: "Melbourne → Gurugram",
    problem:
      "Seller had incomplete paperwork and was unsure how to manage TDS and sale proceeds.",
    solution:
      "Legal document review, CA coordination and buyer-process support arranged end-to-end.",
    result: "Sale pathway clarified",
    duration: "3 days",
    service: "Property Sale",
    initials: "AS",
  },
  {
    location: "Dubai → Delhi NCR",
    problem:
      "Family wanted to purchase property but had no trusted local team to compare projects.",
    solution:
      "Three locations and five projects compared on rental demand, developer strength and exit potential.",
    result: "Shortlist completed",
    duration: "6 days",
    service: "Investment Guidance",
    initials: "NK",
  },
  {
    location: "London → Jaipur",
    problem:
      "Inherited property had ownership confusion between family members.",
    solution:
      "Ownership documents reviewed and mutation, co-owner and sale-readiness steps mapped.",
    result: "Action plan delivered",
    duration: "5 days",
    service: "Inherited Property",
    initials: "PS",
  },
  {
    location: "Auckland → Dehradun",
    problem:
      "Holiday home required urgent repairs before the owner's annual visit.",
    solution:
      "Inspection, contractor quotes and repair supervision completed with photo updates.",
    result: "Property ready before arrival",
    duration: "8 days",
    service: "Property Management",
    initials: "DV",
  },
  {
    location: "New York → Lucknow",
    problem:
      "NRI seller needed clarity on capital gains, TDS and transferring funds overseas.",
    solution:
      "Indian CA, lawyer and banking workflow coordinated around the proposed sale.",
    result: "Tax and repatriation plan ready",
    duration: "7 days",
    service: "Tax & Repatriation",
    initials: "SA",
  },
  {
    location: "Perth → Chandigarh",
    problem:
      "Landlord had rental arrears and no reliable local person to follow up.",
    solution:
      "Tenant contacted, payment position documented and lease-renewal options presented.",
    result: "Rental issue resolved",
    duration: "48 hours",
    service: "Property Management",
    initials: "VK",
  },
  {
    location: "Paris → Uttarakhand",
    problem:
      "Buyer wanted a hill-station investment but was concerned about maintenance and seasonal demand.",
    solution:
      "Locations compared for access, occupancy, operating costs and future resale liquidity.",
    result: "Investment recommendation issued",
    duration: "9 days",
    service: "Investment Guidance",
    initials: "MA",
  },
]

export default function LiveDeliveryFeed() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % deliveryItems.length)
    }, 6500)

    return () => window.clearInterval(timer)
  }, [])

  const item = useMemo(() => deliveryItems[index], [index])

  return (
    <section className="live-delivery-section" aria-label="Recent client outcomes">
      <div className="live-delivery-card">
        <div className="live-delivery-top">
          <div className="live-delivery-status">
            <span className="live-delivery-pulse" />
            <strong>Live delivery</strong>
          </div>

          <div className="live-delivery-progress" aria-hidden="true">
            <span
              key={index}
              style={{
                animationDuration: "6500ms",
              }}
            />
          </div>
        </div>

        <div className="live-delivery-content">
          <div className="live-delivery-avatar">{item.initials}</div>

          <div className="live-delivery-copy">
            <div className="live-delivery-meta">
              <span>{item.location}</span>
              <i />
              <span>{item.service}</span>
            </div>

            <p>
              <strong>Problem:</strong> {item.problem}
              <span className="live-delivery-separator"> → </span>
              <strong>Solution:</strong> {item.solution}
            </p>

            <div className="live-delivery-result">
              <span>{item.result}</span>
              <strong>Completed in {item.duration}</strong>
            </div>
          </div>
        </div>

        <div className="live-delivery-controls">
          <button
            type="button"
            onClick={() =>
              setIndex((current) =>
                current === 0 ? deliveryItems.length - 1 : current - 1,
              )
            }
            aria-label="Show previous delivery"
          >
            ←
          </button>

          <div>
            {deliveryItems.map((delivery, deliveryIndex) => (
              <button
                type="button"
                key={`${delivery.location}-${deliveryIndex}`}
                className={deliveryIndex === index ? "active" : ""}
                onClick={() => setIndex(deliveryIndex)}
                aria-label={`Show delivery ${deliveryIndex + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setIndex((current) => (current + 1) % deliveryItems.length)
            }
            aria-label="Show next delivery"
          >
            →
          </button>
        </div>
      </div>

      <div className="live-delivery-actions">
        <a className="live-delivery-primary" href="#contact">
          Get Free Consultation <span aria-hidden="true">→</span>
        </a>

        <a className="live-delivery-secondary" href="#help-router">
          How it works
        </a>
      </div>

      <div className="live-delivery-proof">
        <span>
          <i className="proof-online" />
          <strong>Australia-based team</strong>
          <small>coordinating now</small>
        </span>

        <span>
          <i className="proof-bolt">⚡</i>
          <small>Response target</small>
          <strong>within 30 mins</strong>
        </span>

        <span>
          <i className="proof-star">★</i>
          <strong>Results in days</strong>
          <small>not weeks</small>
        </span>
      </div>
    </section>
  )
}
