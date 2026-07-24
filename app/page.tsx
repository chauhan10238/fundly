import ConsultationBanner from "@/components/ConsultationBanner"
import FounderCarousel from "@/components/FounderCarousel"
import PropertyNews from "@/components/PropertyNews"
import SituationRouter from "@/components/SituationRouter"
import GlobalClientNetworkMap from "@/components/GlobalClientNetworkMap"
import GovernmentSupport from "@/components/GovernmentSupport"
import LiveDeliveryFeed from "@/components/LiveDeliveryFeed"
import InteractiveTrustBand from "@/components/InteractiveTrustBand"
import ServicesShowcase from "@/components/ServicesShowcase"
import PropertyCalculator from "@/components/PropertyCalculator"
import AustraliaIndiaHero from "@/components/AustraliaIndiaHero"
import PropertyCommandCentre from "@/components/PropertyCommandCentre"

const services = [
  {
    title: "Property Management",
    text: "Tenant coordination, rent monitoring, inspections, maintenance, vacancy checks and regular owner reporting.",
  },
  {
    title: "Property Sale",
    text: "Valuation guidance, document readiness, buyer coordination, negotiation, TDS, capital gains and repatriation support.",
  },
  {
    title: "Purchase & Investment",
    text: "Location research, project comparison, legal verification, negotiation, registration and post-purchase support.",
  },
]

const professionals = [
  ["Property Lawyers", "Title checks, agreements, Power of Attorney, inheritance, mutation, registration and sale documentation."],
  ["Chartered Accountants", "Indian tax, TDS, capital gains, NRO/NRE, Form 15CA/15CB and repatriation coordination."],
  ["On-ground Property Team", "Inspections, tenant and buyer coordination, local market checks, maintenance and transaction support."],
  ["Builder Channel Partners", "Access to established developers while keeping client suitability, risk and exit potential central."],
]

function Check() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Home() {
  return (
    <main>
      <div className="announcement">
        <span className="announcement-country"><b>🇦🇺</b> Australia-based support</span>
        <i />
        <span className="announcement-bridge">One accountable property relationship</span>
        <i />
        <span className="announcement-country"><b>🇮🇳</b> On-ground India network</span>
      </div>

      <header className="site-header">
        <a className="brand" href="#top">
          <span className="brand-mark">
            <span>AU</span>
            <i />
            <span>IN</span>
          </span>
          <span>
            <strong>NRI Property Connect</strong>
            <small>Australia ↔ India Property Services</small>
          </span>
        </a>

        <nav>
          <a href="#services">Services</a>
          <a href="#property-calculator">Calculator</a>
          <a href="#help-router">How we help</a>
          <a href="#regions">Global reach</a>
          <a href="/knowledge-hub">Knowledge Hub</a>
          <a href="/investment-research">City Research</a>
          <a href="#property-news">News</a>
          <a href="#contact">Contact</a>
        </nav>

        <a className="button button-small" href="#contact">
          Free consultation
        </a>
      </header>

      <section className="hero compact-hero" id="top">
        <div className="hero-copy-column">
          <div className="hero-country-line">
            <span><b>🇦🇺</b> Australia</span>
            <i />
            <strong>NRI Property Connect</strong>
            <i />
            <span><b>🇮🇳</b> India</span>
          </div>
          <p className="eyebrow">Property support for overseas Indians</p>
          <h1>
            Your property in India.
            <em> Managed from Australia with confidence.</em>
          </h1>
          <p className="hero-text">
            One coordinated Australia–India team for property management, sale,
            purchase, legal documentation, Indian taxation and repatriation
            across India.
          </p>

          <LiveDeliveryFeed />

          <div className="hero-actions">
            <a className="button" href="#contact">
              Tell us about your property
            </a>
            <a className="button button-secondary" href="https://wa.me/61401362980">
              Speak on WhatsApp
            </a>
          </div>

          <div className="audience-line">
            {["Australian citizens", "PR holders", "Visa holders", "NRIs & OCIs"].map((item) => (
              <span key={item}>
                <Check />
                {item}
              </span>
            ))}
          </div>
        </div>

        <AustraliaIndiaHero />
      </section>

      <InteractiveTrustBand />

      <PropertyCommandCentre />

      <section className="section situation-section" id="help-router">
        <div className="section-heading center">
          <p className="eyebrow">Choose your property situation</p>
          <h2>Start with the outcome you need.</h2>
        </div>
        <SituationRouter />
      </section>

      <PropertyCalculator />

      <ServicesShowcase />
      <GlobalClientNetworkMap />

      <GovernmentSupport />

      <section className="section white">
        <div className="section-heading center">
          <p className="eyebrow">Professional network</p>
          <h2>The right specialist around one property objective.</h2>
        </div>

        <div className="professional-grid">
          {professionals.map(([title, text], index) => (
            <article key={title}>
              <span>0{index + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>

        <div className="disclaimer">
          <strong>Clear professional boundaries</strong>
          <p>
            Legal advice is provided by appropriately qualified lawyers.
            Indian tax advice is provided by Chartered Accountants. Australian
            tax advice is coordinated with appropriately qualified Australian
            professionals. Investment returns are not guaranteed.
          </p>
        </div>
      </section>

      <FounderCarousel />

      <PropertyNews />

      <ConsultationBanner />

      <section className="contact-section" id="contact">
        <div>
          <p className="eyebrow gold">Free 30-minute consultation</p>
          <h2>Tell us about your property or investment objective.</h2>
          <p>
            Share the city, property type and outcome you need. We will identify
            the likely workstream, documents and professionals required.
          </p>
        </div>

        <form className="contact-form" action="/api/enquiry" method="post">
          <label>
            Full name
            <input name="name" required placeholder="Your name" />
          </label>

          <label>
            Email
            <input name="email" type="email" required placeholder="you@example.com" />
          </label>

          <label>
            Phone / WhatsApp
            <input name="phone" placeholder="+61..." />
          </label>

          <label>
            Current status
            <select name="status" defaultValue="">
              <option value="" disabled>Select one</option>
              <option>Australian citizen</option>
              <option>Permanent resident</option>
              <option>Temporary visa holder</option>
              <option>NRI</option>
              <option>OCI</option>
            </select>
          </label>

          <label>
            Service
            <select name="service" defaultValue="">
              <option value="" disabled>Select a service</option>
              <option>Property management</option>
              <option>Selling a property</option>
              <option>Buying a property</option>
              <option>Investment guidance</option>
              <option>Inherited property</option>
              <option>Legal or tax coordination</option>
            </select>
          </label>

          <label>
            Property location
            <input name="location" placeholder="Noida, Jaipur, Dehradun..." />
          </label>

          <label className="full">
            Briefly describe the situation
            <textarea name="message" rows={5} />
          </label>

          <button className="button full" type="submit">
            Request free consultation
          </button>
        </form>
      </section>

      <footer className="site-footer">
        <div>
          <a className="brand" href="#top">
            <span className="brand-mark">
              <span>AU</span>
              <i />
              <span>IN</span>
            </span>
            <span>
              <strong>NRI Property Connect</strong>
              <small>Australia ↔ India Property Services</small>
            </span>
          </a>
          <p>
            Property management, sale, purchase and investment guidance for
            overseas Indians.
          </p>
        </div>

        <div>
          <strong>Services</strong>
          <a href="#services">Property management</a>
          <a href="#services">Sell property</a>
          <a href="#services">Buy property</a>
        </div>

        <div>
          <strong>Company</strong>
          <a href="#regions">Global reach</a>
          <a href="/knowledge-hub">Knowledge Hub</a>
          <a href="/investment-research">City Research</a>
          <a href="#property-news">News</a>
          <a href="#contact">Contact</a>
        </div>

        <div>
          <strong>Legal</strong>
          <a href="#">Privacy policy</a>
          <a href="#">Terms</a>
          <a href="#">Complaints</a>
        </div>

        <small>
          Information is general and does not constitute legal, tax, financial
          or investment advice. © {new Date().getFullYear()} NRI Property Connect.
        </small>
      </footer>

      <a className="floating-whatsapp" href="https://wa.me/61401362980">
        WhatsApp
      </a>
    </main>
  )
}
