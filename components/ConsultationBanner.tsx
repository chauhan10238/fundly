export default function ConsultationBanner() {
  return (
    <section className="consultation-banner" id="consultation">
      <div className="consultation-inner">
        <div className="consultation-copy">
          <p className="consultation-eyebrow">
            <span aria-hidden="true" />
            Free 30-minute consultation
          </p>

          <h2>
            Need help with an Indian property matter?
            <strong> Let&apos;s talk.</strong>
          </h2>

          <p>
            Speak with our Australia-based property team. Where required, we
            coordinate experienced Indian property lawyers, Chartered
            Accountants and local real-estate professionals.
          </p>

          <div className="consultation-badges">
            <span>Australia-based support</span>
            <span>Legal & CA network</span>
            <span>No-obligation discussion</span>
          </div>
        </div>

        <div className="consultation-actions">
          <a className="consultation-primary" href="#contact">
            Get Free Consultation →
          </a>

          <a className="consultation-secondary" href="#property-news">
            Read latest property news
          </a>
        </div>
      </div>
    </section>
  )
}
