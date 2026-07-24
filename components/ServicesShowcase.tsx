const services = [
  {
    number: "01",
    title: "Property Management",
    text: "Tenant coordination, rent monitoring, inspections, maintenance, vacancy checks and regular owner reporting.",
    points: ["Tenant & rent oversight", "Inspection photo reports", "Maintenance coordination"],
    className: "management",
    icon: "⌂",
  },
  {
    number: "02",
    title: "Property Sale",
    text: "Valuation guidance, document readiness, buyer coordination, negotiation, TDS, capital gains and repatriation support.",
    points: ["Sale-readiness review", "Buyer & negotiation support", "Tax and repatriation pathway"],
    className: "sale",
    icon: "↗",
  },
  {
    number: "03",
    title: "Purchase & Investment",
    text: "Location research, project comparison, legal verification, negotiation, registration and post-purchase support.",
    points: ["Location and project research", "Legal verification", "Negotiation and registration"],
    className: "investment",
    icon: "◇",
  },
]

const teamRoles = [
  "Relationship Manager",
  "Property Consultant",
  "Chartered Accountant",
  "Legal Team",
  "Local Inspection",
]

export default function ServicesShowcase() {
  return (
    <section className="services-showcase" id="services">
      <div className="services-showcase-inner">
        <div className="services-intro-panel services-real-team-panel">
          <div className="services-intro-copy">
            <p className="eyebrow">Our main focus</p>
            <h2>
              Property-first support across the
              <span> ownership lifecycle.</span>
            </h2>
            <p>
              One accountable team coordinates property execution, legal work,
              taxation and local reporting across Australia and India.
            </p>
          </div>

          <div className="services-team-photo">
            <img
              src="/images/property-team-real.jpg"
              alt="A professional property services team working together in a modern office"
            />
            <div className="services-team-photo-shade" />

            <div className="services-team-badge services-team-badge-real">
              <strong>One accountable team</strong>
              <span>Australia client support + India execution</span>
            </div>

            <div className="services-team-role-cloud" aria-label="Coordinated specialists">
              {teamRoles.map((role) => (
                <span key={role}>✓ {role}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="services-card-stack">
          {services.map((service) => (
            <article
              className={`service-popup-card ${service.className}`}
              key={service.title}
            >
              <div className="service-popup-number">{service.number}</div>
              <div className="service-popup-icon">{service.icon}</div>

              <div className="service-popup-copy">
                <h3>{service.title}</h3>
                <p>{service.text}</p>
                <div className="service-popup-points">
                  {service.points.map((point) => (
                    <span key={point}>✓ {point}</span>
                  ))}
                </div>
              </div>

              <a href="#contact" aria-label={`Discuss ${service.title}`}>
                Discuss service <span>→</span>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
