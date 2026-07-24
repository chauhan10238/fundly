"use client"

import { useEffect, useMemo, useState } from "react"
import type { NewsArticle, NewsCategory } from "@/lib/news-intelligence"

const categories: Array<"All" | NewsCategory> = [
  "All",
  "Tax & TDS",
  "FEMA & RBI",
  "Property Sale",
  "Buying & Investment",
  "Rental & Management",
  "Legal & Documentation",
  "Market & Infrastructure",
  "Home Loans",
]

export default function KnowledgeNewsHub() {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [category, setCategory] = useState<(typeof categories)[number]>("All")
  const [search, setSearch] = useState("")
  const [live, setLive] = useState(false)
  const [provider, setProvider] = useState("Loading")

  useEffect(() => {
    fetch("/api/property-news?limit=24", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setArticles(data.articles || [])
        setLive(Boolean(data.live))
        setProvider(data.provider || "News feed")
      })
      .catch(() => setProvider("Unavailable"))
  }, [])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return articles.filter((article) => {
      const matchesCategory = category === "All" || article.category === category
      const matchesSearch = !q || `${article.title} ${article.description} ${article.source} ${article.regions.join(" ")}`.toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    })
  }, [articles, category, search])

  return (
    <section className="knowledge-news" id="latest-nri-news">
      <div className="knowledge-news-heading">
        <div>
          <p className="eyebrow">Latest NRI property intelligence</p>
          <h2>News translated into what it means for an overseas property owner.</h2>
          <span>Original headlines remain linked to the publisher. Our impact note helps you identify which updates may require action.</span>
        </div>
        <div className={`knowledge-news-live ${live ? "is-live" : ""}`}>
          <i /> {live ? `Live via ${provider}` : provider}
        </div>
      </div>

      <div className="knowledge-news-toolbar">
        <label>
          <span>Search updates</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="TDS, Noida, FEMA, home loan..." />
        </label>
        <div className="knowledge-news-filters" aria-label="News categories">
          {categories.map((item) => (
            <button key={item} type="button" className={category === item ? "active" : ""} onClick={() => setCategory(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="knowledge-news-grid">
        {visible.map((article) => (
          <article className={`knowledge-news-card ${article.urgency}`} key={article.url}>
            <div className="knowledge-news-card-top">
              <span>{article.source}</span>
              <time>{new Date(article.publishedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</time>
            </div>
            <div className="knowledge-news-badges">
              <span>{article.category}</span>
              {article.urgency === "time-sensitive" && <strong>Time-sensitive</strong>}
            </div>
            <h3>{article.title}</h3>
            <p>{article.description}</p>
            <div className="knowledge-news-impact">
              <strong>Why it matters to NRIs</strong>
              <span>{article.nriImpact}</span>
            </div>
            <div className="knowledge-news-regions">
              {article.regions.map((region) => <span key={region}>{region}</span>)}
            </div>
            <a href={article.url} target="_blank" rel="noreferrer">Read original source →</a>
          </article>
        ))}
      </div>

      {!visible.length && <p className="knowledge-news-empty">No updates match the selected filters.</p>}
      <p className="knowledge-news-disclaimer">News summaries are general information, not legal, tax, financial or investment advice. Verify important changes with the original source and an appropriately qualified professional.</p>
    </section>
  )
}
