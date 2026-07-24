import type { Metadata } from "next"
import Link from "next/link"
import CityResearchExplorer from "@/components/CityResearchExplorer"
import { cityProfiles } from "@/lib/city-research"

export const metadata: Metadata = {
  title: "India Property Intelligence Centre for NRIs | NRI Property Connect",
  description: "Independent city-level property intelligence helping NRIs make smarter decisions about buying, selling and managing property across India.",
}

export default function InvestmentResearchPage() {
  return (
    <main className="city-research-index">
      <header className="city-dashboard-header">
        <Link href="/" className="city-dashboard-brand"><span>NPC</span><strong>NRI Property Connect</strong></Link>
        <nav><Link href="/">Home</Link><Link href="/knowledge-hub">Knowledge Hub</Link><Link href="/investment-research">City Research</Link><Link href="/investment-research/compare">Compare</Link><Link href="/#contact" className="city-dashboard-cta">Free consultation</Link></nav>
      </header>
      <section className="city-research-hero">
        <p className="city-dashboard-eyebrow">Property intelligence for overseas Indians</p>
        <h1>India Property Intelligence Centre</h1>
        <p>Independent market intelligence helping NRIs make smarter decisions about buying, selling and managing property across India.</p>
        <div className="city-research-hero-support">Explore city profiles covering market trends, rental demand, selling conditions, infrastructure, ownership risks and practical property-management considerations.</div>
      </section>
      <CityResearchExplorer cities={cityProfiles} />
      <section className="city-research-note"><strong>Important:</strong><span>These city profiles are independent screening tools, not property valuations, legal advice or financial advice. Confirm current property-specific evidence before buying, selling, leasing or appointing a manager.</span></section>
    </main>
  )
}
