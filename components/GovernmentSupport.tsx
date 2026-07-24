export default function GovernmentSupport() {
  const verified = process.env.NEXT_PUBLIC_GOVT_PARTNER_VERIFIED === "true"

  return (
    <section className="government-support-section">
      <div>
        <p className="saffron-eyebrow">Government & regulatory coordination</p>
        <h2>Support aligned with Indian property, tax and documentation processes.</h2>
        <p>
          Our team coordinates with relevant government portals, registries, banks and
          qualified professionals where required for property, tax, identity and
          repatriation matters.
        </p>
      </div>

      <div className="government-support-cards">
        <article>
          <span className="gov-emblem">भारत</span>
          <div><strong>Property & identity processes</strong><small>Registration, PoA, mutation, KYC and documentation</small></div>
        </article>
        <article>
          <span className="gov-emblem">NRI</span>
          <div><strong>Cross-border coordination</strong><small>Banking, FEMA, tax and remittance workflows</small></div>
        </article>
      </div>

      <div className={verified ? "gov-status verified" : "gov-status pending"}>
        <i />
        {verified ? "Govt. Verified Partner" : "Government-partner verification pending"}
      </div>
    </section>
  )
}
