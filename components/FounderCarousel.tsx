"use client"

import { useEffect, useState } from "react"

const founders = [
  {
    initials: "DC",
    name: "Deepak Chauhan",
    role: "Founder · Australia",
    paragraphs: [
      "Many overseas Indians depend on parents, relatives, tenants or informal agents to manage valuable property. That arrangement becomes difficult when maintenance is delayed, documents are incomplete or the property must be sold.",
      "NRI Property Connect is being built as one accountable relationship between overseas clients and a coordinated professional network in India.",
    ],
  },
  {
    initials: "DA",
    name: "Divya Arora",
    role: "Co-Founder · India",
    paragraphs: [
      "Having lived with the realities of Indian property transactions, we understand how difficult it can be for overseas owners to get clear updates, reliable execution and accountable local support.",
      "Our role is to make property management, sale and purchase more transparent by coordinating the right local professionals and keeping the client informed at every important stage.",
    ],
  },
]

export default function FounderCarousel() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % founders.length)
    }, 6500)

    return () => window.clearInterval(interval)
  }, [])

  const founder = founders[index]

  return (
    <section className="founder-carousel-section">
      <div className="founder-carousel-heading">
        <p>Why we built NRI Property Connect</p>
        <h2>Two countries. One accountable property relationship.</h2>
      </div>

      <div className="founder-carousel-card">
        <div className="founder-carousel-copy">
          {founder.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <div className="founder-carousel-person">
          <span>{founder.initials}</span>
          <div>
            <strong>{founder.name}</strong>
            <small>{founder.role}</small>
          </div>
        </div>

        <div className="founder-carousel-controls">
          <button
            type="button"
            onClick={() =>
              setIndex((current) =>
                current === 0 ? founders.length - 1 : current - 1,
              )
            }
            aria-label="Previous founder"
          >
            ←
          </button>

          <div className="founder-carousel-dots">
            {founders.map((item, itemIndex) => (
              <button
                key={item.name}
                type="button"
                className={itemIndex === index ? "active" : ""}
                onClick={() => setIndex(itemIndex)}
                aria-label={`Show ${item.name}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setIndex((current) => (current + 1) % founders.length)
            }
            aria-label="Next founder"
          >
            →
          </button>
        </div>
      </div>
    </section>
  )
}
