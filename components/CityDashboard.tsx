"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import type { CityProfile } from "@/lib/city-research"
import type { NewsArticle } from "@/lib/news-intelligence"

export default function CityDashboard({ profile }: { profile: CityProfile }) {
  const [tab, setTab] = useState<"overview" | "corridors" | "risk" | "news">("overview")
  const [news, setNews] = useState<NewsArticle[]>([])

  useEffect(() => {
    const query = encodeURIComponent(profile.searchTerms.join(" OR "))
    fetch(`/api/property-news?limit=8&q=${query}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setNews(data.articles || []))
      .catch(() => setNews([]))
  }, [profile])

  const visibleNews = useMemo(() => news.slice(0, 4), [news])

  return (
    <main className="city-dashboard-page">
      <header className="city-dashboard-header">
        <Link href="/" className="city-dashboard-brand"><span>NPC</span><strong>NRI Property Connect</strong></Link>
        <nav>
          <Link href="/">Home</Link>
          <Link href="/knowledge-hub">Knowledge Hub</Link>
          <Link href="/investment-research">City Research</Link>
          <Link href="/#contact" className="city-dashboard-cta">Free consultation</Link>
        </nav>
      </header>

      <section className="city-dashboard-hero">
        <div>
          <p className="city-dashboard-eyebrow">City Property Profile · {profile.region}</p>
          <h1>{profile.city}</h1>
          <h2>{profile.tagline}</h2>
          <p>{profile.summary}</p>
          <div className="city-dashboard-actions">
            <Link href="/#contact">Discuss {profile.city} property</Link>
            <Link href="/investment-research" className="secondary">Explore city profiles</Link>
          </div>
        </div>
        <aside className="city-score-card">
          <small>Property Intelligence Score™</small>
          <strong>{profile.score}<span>/100</span></strong>
          <div className="city-score-track"><i style={{ width: `${profile.score}%` }} /></div>
          <b>{profile.recommendation}</b>
          <p>{profile.nriFit}</p>
        </aside>
      </section>

      <section className="city-indicator-grid">
        {profile.indicators.map((item) => (
          <article key={item.label} className={item.tone || "blue"}>
            <small>{item.label}</small><strong>{item.value}</strong><span>{item.note}</span>
          </article>
        ))}
      </section>

      <div className="city-dashboard-tabs" role="tablist">
        {(["overview", "corridors", "risk", "news"] as const).map((item) => (
          <button key={item} type="button" className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item === "risk" ? "Risks & checks" : item}</button>
        ))}
      </div>

      {tab === "overview" && (
        <section className="city-dashboard-content two-column">
          <article>
            <p className="city-dashboard-eyebrow">Demand drivers</p>
            <h2>What supports the market</h2>
            <ul>{profile.drivers.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article>
            <p className="city-dashboard-eyebrow">Property strategy</p>
            <h2>Which product fits</h2>
            <div className="city-product-list">{profile.propertyTypes.map((item) => <div key={item.type}><strong>{item.type}</strong><span>{item.fit}</span><p>{item.note}</p></div>)}</div>
          </article>
        </section>
      )}

      {tab === "corridors" && (
        <section className="city-corridor-grid">
          {profile.corridors.map((item) => <article key={item.name}><small>{item.fit}</small><h3>{item.name}</h3><p>{item.note}</p></article>)}
        </section>
      )}

      {tab === "risk" && (
        <section className="city-dashboard-content two-column">
          <article className="risk-panel"><p className="city-dashboard-eyebrow urgent">Key risks</p><h2>What can go wrong</h2><ul>{profile.risks.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article><p className="city-dashboard-eyebrow">NRI due diligence</p><h2>Before you commit</h2><ol>{profile.nriChecklist.map((item) => <li key={item}>{item}</li>)}</ol></article>
        </section>
      )}

      {tab === "news" && (
        <section className="city-news-grid">
          {visibleNews.length ? visibleNews.map((article) => <article key={article.url}><div><span>{article.source}</span><time>{new Date(article.publishedAt).toLocaleDateString("en-AU")}</time></div><h3>{article.title}</h3><p>{article.nriImpact || article.description}</p><a href={article.url} target="_blank" rel="noreferrer">Read original source →</a></article>) : <p className="city-empty-news">No current matching stories were returned. The dashboard still uses official and professional source links below.</p>}
        </section>
      )}

      <section className="city-source-section">
        <div><p className="city-dashboard-eyebrow">Sources and verification</p><h2>Where to check the data</h2><p>Dashboard signals are qualitative and indicative. Verify current prices, approvals and tax rules before acting.</p></div>
        <div>{profile.sources.map((source) => <a key={source.name} href={source.url} target="_blank" rel="noreferrer"><strong>{source.name}</strong><span>{source.note}</span><small>Open source ↗</small></a>)}</div>
      </section>

      <section className="city-dashboard-final-cta"><div><p className="city-dashboard-eyebrow">Need a property-specific view?</p><h2>Turn city intelligence into a practical plan to buy, sell or manage your property.</h2></div><Link href="/#contact">Request a free consultation →</Link></section>
    </main>
  )
}
