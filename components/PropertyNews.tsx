"use client"

import { useEffect, useState } from "react"
import type { NewsArticle } from "@/lib/news-intelligence"

export default function PropertyNews() {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [live, setLive] = useState(false)
  const [provider, setProvider] = useState("Curated feed")

  useEffect(() => {
    fetch("/api/property-news?limit=6", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setArticles(data.articles || [])
        setLive(Boolean(data.live))
        setProvider(data.provider || "Curated feed")
      })
      .catch(() => setArticles([]))
  }, [])

  return (
    <section className="property-news-section" id="property-news">
      <div className="property-news-heading">
        <div>
          <p>NRI property intelligence</p>
          <h2>Latest property, investment and tax news for overseas Indians</h2>
          <span>Every card includes a practical NRI impact note and links back to the original publisher.</span>
        </div>
        <div className="property-news-status"><i className={live ? "live" : ""} />{live ? `Live via ${provider}` : provider}</div>
      </div>

      <div className="property-news-grid">
        {articles.map((article) => (
          <article className={`property-news-card ${article.urgency}`} key={article.url}>
            <div className="property-news-source"><span>● ● ●</span><strong>{article.source}</strong><a href={article.url} target="_blank" rel="noreferrer">↗</a></div>
            <div className="property-news-content">
              <div className="property-news-meta"><span>{article.category}</span><time>{new Date(article.publishedAt).toLocaleDateString("en-AU")}</time></div>
              <h3>{article.title}</h3>
              <p>{article.description}</p>
              <div className="property-news-impact"><strong>Why it matters</strong><span>{article.nriImpact}</span></div>
              <a href={article.url} target="_blank" rel="noreferrer">Read source →</a>
            </div>
          </article>
        ))}
      </div>
      <div className="property-news-more"><a href="/knowledge-hub#latest-nri-news">Open the full Knowledge Hub →</a></div>
      <p className="property-news-disclaimer">Headlines and summaries link to third-party publishers. Inclusion does not imply endorsement or media coverage of NRI Property Connect.</p>
    </section>
  )
}
