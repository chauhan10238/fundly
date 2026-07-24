import type { Metadata } from "next"
import Link from "next/link"
import styles from "./knowledge-hub.module.css"
import KnowledgeNewsHub from "@/components/KnowledgeNewsHub"
import { trustedSources } from "@/lib/news-intelligence"

export const metadata: Metadata = {
  title: "NRI Property Knowledge Hub | NRI Property Connect",
  description:
    "Practical guides for overseas Indians managing, buying or selling property in India, including tax, TDS, repatriation, Power of Attorney and inheritance.",
}

const featuredGuides = [
  {
    tag: "Selling Property",
    title: "Selling Indian property while living overseas",
    description:
      "Understand the sale-readiness process, document checks, buyer coordination, tax withholding and the steps commonly required before transferring funds overseas.",
    readTime: "8 min read",
    href: "#selling-property",
    urgent: false,
  },
  {
    tag: "Tax & TDS",
    title: "TDS and capital-gains planning for NRI property sellers",
    description:
      "A practical overview of why withholding can affect cash flow, when specialist advice may help and which records should be organised before settlement.",
    readTime: "7 min read",
    href: "#tax-and-tds",
    urgent: true,
  },
  {
    tag: "Repatriation",
    title: "Bringing property-sale proceeds from India to Australia",
    description:
      "Learn about NRO banking, tax clearance, supporting documents and the professionals usually involved in a compliant remittance process.",
    readTime: "9 min read",
    href: "#repatriation",
    urgent: false,
  },
]

const categories = [
  {
    icon: "🏠",
    title: "Property Management",
    description:
      "Tenant coordination, rent monitoring, inspections, maintenance, vacancy and owner reporting.",
    href: "#property-management",
  },
  {
    icon: "🏷️",
    title: "Selling Property",
    description:
      "Valuation, sale-readiness, buyer coordination, documentation, settlement and exit planning.",
    href: "#selling-property",
  },
  {
    icon: "🏢",
    title: "Buying & Investing",
    description:
      "Location research, developer due diligence, rental demand, negotiation and registration.",
    href: "#buying-investing",
  },
  {
    icon: "⚖️",
    title: "Legal & Power of Attorney",
    description:
      "Title review, PoA, agreements, registration, mutation and dispute-prevention fundamentals.",
    href: "#legal-poa",
  },
  {
    icon: "📊",
    title: "Tax, TDS & Repatriation",
    description:
      "Indian tax, withholding, capital gains, NRO/NRE accounts, Form 15CA/15CB and remittance.",
    href: "#tax-and-tds",
  },
  {
    icon: "📜",
    title: "Inheritance & Family Property",
    description:
      "Succession documents, legal-heir issues, co-owner coordination, mutation and sale preparation.",
    href: "#inheritance",
  },
]

const stepGuides = [
  {
    number: "01",
    title: "Define the property objective",
    text: "Clarify whether the priority is rental income, sale, family transfer, personal use or long-term investment.",
  },
  {
    number: "02",
    title: "Verify ownership and documents",
    text: "Review title, registration papers, tax receipts, society records, encumbrances and any Power of Attorney.",
  },
  {
    number: "03",
    title: "Build the professional workstream",
    text: "Identify which property, legal, tax, banking and local-execution specialists are actually required.",
  },
  {
    number: "04",
    title: "Execute with written milestones",
    text: "Use a documented scope, clear timelines, evidence-based updates and transaction-specific advice.",
  },
]

const faqs = [
  {
    question: "Can an NRI buy property in India without travelling?",
    answer:
      "Many parts of a transaction can be coordinated remotely. Depending on the property, state requirements and lender, an appropriately prepared and accepted Power of Attorney may be used. Registration and PoA requirements should be confirmed with the relevant lawyer and sub-registrar.",
  },
  {
    question: "Can NRIs purchase agricultural land in India?",
    answer:
      "NRIs and OCIs are generally restricted from purchasing agricultural land, plantation property and farmhouses, subject to limited exceptions such as inheritance. Obtain current legal advice before proceeding.",
  },
  {
    question: "How is TDS handled when an NRI sells property?",
    answer:
      "The buyer may have withholding obligations based on the seller’s residential status and the applicable tax rules. The correct rate and any lower-deduction application should be reviewed by a qualified Indian tax professional before settlement.",
  },
  {
    question: "Can property-sale money be transferred to Australia?",
    answer:
      "Repatriation may be possible after taxes and banking requirements are satisfied. The process commonly involves an NRO account, tax documentation and bank review. The exact pathway depends on how the property was acquired and the source of funds.",
  },
  {
    question: "What should an overseas landlord receive from a property manager?",
    answer:
      "A written scope, inspection evidence, tenant and rent updates, maintenance approvals, expense records and a clear escalation process. Important decisions should not depend only on verbal updates.",
  },
  {
    question: "Is property investment advice the same as legal or tax advice?",
    answer:
      "No. Property research, legal advice, Indian tax advice and Australian tax advice are separate professional areas. Each should be provided by an appropriately qualified specialist.",
  },
]

export default function KnowledgeHubPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          <span className={styles.brandMark}>NPC</span>
          <span>
            <strong>NRI Property Connect</strong>
            <small>Australia–India Property Services</small>
          </span>
        </Link>

        <nav className={styles.nav}>
          <Link href="/">Home</Link>
          <Link href="/#services">Services</Link>
          <Link href="/knowledge-hub" aria-current="page">
            Knowledge Hub
          </Link>
          <Link href="/investment-research">City Research</Link>
          <Link href="/#property-news">News</Link>
          <Link className={styles.headerButton} href="/#contact">
            Free consultation
          </Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>NRI Property Knowledge Hub</p>
          <h1>
            Clear property guidance for overseas Indians.
            <span> Before you manage, buy or sell.</span>
          </h1>
          <p>
            Practical guides covering Indian property management, purchase,
            sale, legal documentation, taxation and repatriation—written to help
            you ask better questions and avoid preventable delays.
          </p>

          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="#guides">
              Explore the guides
            </Link>
            <Link className={styles.secondaryButton} href="/#contact">
              Ask a property question
            </Link>
          </div>

          <div className={styles.heroTrust}>
            <span>✓ Property-first guidance</span>
            <span>✓ Legal and CA coordination</span>
            <span>✓ Written for overseas owners</span>
          </div>
        </div>

        <aside className={styles.heroPanel}>
          <p>Start with your situation</p>
          <h2>What are you trying to do?</h2>

          <div className={styles.quickLinks}>
            <a href="#property-management">Manage an existing property</a>
            <a href="#selling-property">Sell property in India</a>
            <a href="#buying-investing">Buy or compare investments</a>
            <a href="#repatriation">Transfer sale proceeds overseas</a>
            <a href="#inheritance">Resolve inherited property</a>
          </div>

          <div className={styles.responseBox}>
            <strong>Need case-specific help?</strong>
            <span>Response target within 30 minutes during business hours.</span>
          </div>
        </aside>
      </section>

      <KnowledgeNewsHub />

      <section className={styles.sourceDirectory}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Trusted source directory</p>
          <h2>Publishers and research teams worth following.</h2>
          <p>Use news publications for current developments and primary government or professional sources when a rule or transaction decision must be verified.</p>
        </div>
        <div className={styles.sourceGrid}>
          {trustedSources.map((source) => (
            <a key={source.name} href={source.url} target="_blank" rel="noreferrer">
              <strong>{source.name}</strong>
              <span>{source.focus}</span>
              <small>Visit source ↗</small>
            </a>
          ))}
        </div>
      </section>


      <section className={styles.cityResearchPreview}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>City-wise investment research</p>
          <h2>Compare markets before you compare projects.</h2>
          <p>Open NRI-focused dashboards covering market drivers, rental depth, liquidity, key corridors, risks and due diligence.</p>
        </div>
        <div className={styles.cityPreviewGrid}>
          {[
            ["Noida", "noida", "86/100"],
            ["Gurugram", "gurugram", "88/100"],
            ["Lucknow", "lucknow", "78/100"],
            ["Jaipur", "jaipur", "80/100"],
            ["Chandigarh Tricity", "chandigarh-tricity", "83/100"],
            ["Dehradun", "dehradun", "76/100"],
          ].map(([name, slug, score]) => (
            <Link href={`/investment-research/${slug}`} key={slug}>
              <span>{score}</span><strong>{name}</strong><small>Open dashboard →</small>
            </Link>
          ))}
        </div>
        <Link className={styles.cityResearchButton} href="/investment-research">View all city dashboards →</Link>
      </section>

      <section className={styles.featured} id="guides">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Featured guides</p>
          <h2>Start with the decisions that create the most risk.</h2>
          <p>
            These guides explain the common workstreams without replacing
            transaction-specific legal, tax or financial advice.
          </p>
        </div>

        <div className={styles.featuredGrid}>
          {featuredGuides.map((guide) => (
            <article
              className={`${styles.featuredCard} ${
                guide.urgent ? styles.urgentCard : ""
              }`}
              key={guide.title}
            >
              <div className={styles.cardMeta}>
                <span>{guide.tag}</span>
                <small>{guide.readTime}</small>
              </div>
              <h3>{guide.title}</h3>
              <p>{guide.description}</p>
              <a href={guide.href}>Read the guide →</a>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.categories}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Browse by topic</p>
          <h2>One hub for the full property lifecycle.</h2>
        </div>

        <div className={styles.categoryGrid}>
          {categories.map((category) => (
            <a className={styles.categoryCard} href={category.href} key={category.title}>
              <span>{category.icon}</span>
              <h3>{category.title}</h3>
              <p>{category.description}</p>
              <strong>Explore topic →</strong>
            </a>
          ))}
        </div>
      </section>

      <section className={styles.guideSection} id="property-management">
        <div className={styles.guideIntro}>
          <p className={styles.eyebrow}>Property Management</p>
          <h2>Managing Indian property from overseas</h2>
          <p>
            Remote property management should provide evidence, accountability
            and control—not just occasional verbal updates.
          </p>
        </div>

        <div className={styles.guideBody}>
          <article>
            <h3>What a strong management scope should include</h3>
            <ul>
              <li>Initial condition and document review</li>
              <li>Tenant, lease and rent-position verification</li>
              <li>Scheduled inspections with photographs</li>
              <li>Maintenance quotations and owner approval limits</li>
              <li>Rent, expense and issue reporting</li>
              <li>Clear escalation for legal or tenant disputes</li>
            </ul>
          </article>

          <article>
            <h3>Warning signs</h3>
            <ul>
              <li>No written scope or defined reporting frequency</li>
              <li>Cash expenses without supporting records</li>
              <li>Maintenance completed without prior approval</li>
              <li>Unclear tenant status or missing lease documents</li>
              <li>One informal contact controlling all information</li>
            </ul>
          </article>
        </div>
      </section>

      <section className={styles.guideSection} id="selling-property">
        <div className={styles.guideIntro}>
          <p className={styles.eyebrow}>Selling Property</p>
          <h2>Prepare the property before going to market</h2>
          <p>
            The fastest sale is rarely achieved by listing first. Document,
            ownership, tax and property-condition issues should be identified
            before negotiations begin.
          </p>
        </div>

        <div className={styles.processGrid}>
          {stepGuides.map((step) => (
            <article key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.splitGuide} id="buying-investing">
        <div>
          <p className={styles.eyebrow}>Buying & Investing</p>
          <h2>Compare the exit before buying the entry.</h2>
          <p>
            A good property decision should consider more than the developer’s
            brochure or the emotional connection to a city.
          </p>
        </div>

        <div className={styles.checklist}>
          <span>Local employment and infrastructure</span>
          <span>Rental demand and vacancy risk</span>
          <span>Developer and title due diligence</span>
          <span>Maintenance and remote-management burden</span>
          <span>Resale liquidity and buyer depth</span>
          <span>Tax, financing and repatriation implications</span>
        </div>
      </section>

      <section className={styles.guideSection} id="tax-and-tds">
        <div className={styles.guideIntro}>
          <p className={`${styles.eyebrow} ${styles.urgentText}`}>
            Time-sensitive tax planning
          </p>
          <h2>TDS, capital gains and settlement planning</h2>
          <p>
            Tax and withholding questions should be reviewed before the sale
            deed or settlement date. Last-minute advice can delay settlement or
            reduce available sale proceeds.
          </p>
        </div>

        <div className={styles.taxNotice}>
          <strong>Review before accepting a settlement timeline</strong>
          <p>
            Confirm the seller’s residential status, ownership history, cost
            records, proposed withholding and whether any lower-deduction
            process is appropriate.
          </p>
        </div>
      </section>

      <section className={styles.splitGuide} id="repatriation">
        <div>
          <p className={styles.eyebrow}>Repatriation</p>
          <h2>Transferring sale proceeds outside India</h2>
          <p>
            The banking and tax pathway depends on the ownership, acquisition
            source, account structure and transaction documentation.
          </p>
        </div>

        <div className={styles.repatriationSteps}>
          <article>
            <strong>1</strong>
            <span>Sale and tax records</span>
          </article>
          <article>
            <strong>2</strong>
            <span>NRO banking pathway</span>
          </article>
          <article>
            <strong>3</strong>
            <span>CA certificates and declarations</span>
          </article>
          <article>
            <strong>4</strong>
            <span>Bank compliance review</span>
          </article>
          <article>
            <strong>5</strong>
            <span>Foreign remittance and local declaration</span>
          </article>
        </div>
      </section>

      <section className={styles.guideSection} id="legal-poa">
        <div className={styles.guideIntro}>
          <p className={styles.eyebrow}>Legal & Power of Attorney</p>
          <h2>Remote transactions require the right authority—not a generic form.</h2>
          <p>
            A Power of Attorney should be prepared for the actual transaction,
            accepted by the relevant parties and completed according to current
            legal and registration requirements.
          </p>
        </div>
      </section>

      <section className={styles.guideSection} id="inheritance">
        <div className={styles.guideIntro}>
          <p className={styles.eyebrow}>Inheritance</p>
          <h2>Inherited property often needs a document pathway before a sale pathway.</h2>
          <p>
            Legal-heir, succession, probate, mutation and co-owner questions may
            need to be resolved before the property can be managed, transferred
            or sold.
          </p>
        </div>
      </section>

      <section className={styles.faqSection}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Frequently asked questions</p>
          <h2>Common questions from overseas property owners</h2>
        </div>

        <div className={styles.faqList}>
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.cta}>
        <div>
          <p className={styles.eyebrow}>Need transaction-specific guidance?</p>
          <h2>Turn the information into a clear property action plan.</h2>
          <p>
            Tell us where you are based, where the property is and what outcome
            you need. We will identify the likely workstream and specialists.
          </p>
        </div>

        <Link className={styles.ctaButton} href="/#contact">
          Get a free 30-minute consultation →
        </Link>
      </section>

      <footer className={styles.footer}>
        <div>
          <Link className={styles.brand} href="/">
            <span className={styles.brandMark}>NPC</span>
            <span>
              <strong>NRI Property Connect</strong>
              <small>Australia–India Property Services</small>
            </span>
          </Link>
          <p>
            Property management, sale, purchase and investment guidance for
            overseas Indians.
          </p>
        </div>

        <div>
          <strong>Knowledge Hub</strong>
          <a href="#property-management">Management</a>
          <a href="#selling-property">Selling</a>
          <a href="#buying-investing">Buying</a>
          <a href="#tax-and-tds">Tax & TDS</a>
        </div>

        <div>
          <strong>Company</strong>
          <Link href="/">Home</Link>
          <Link href="/#services">Services</Link>
          <Link href="/#contact">Contact</Link>
        </div>

        <small>
          General information only. It does not constitute legal, tax,
          financial or investment advice.
        </small>
      </footer>
    </main>
  )
}
