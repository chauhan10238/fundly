"use client";

import { useEffect, useState } from "react";

const links = [
  ["Services", "#services"],
  ["Opportunities", "#opportunities"],
  ["Process", "#process"],
  ["FAQ", "#faq"],
];

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-header ${scrolled ? "scrolled" : ""}`}>
      <a className="brand" href="#top">
        <span className="brand-mark" aria-hidden="true">
          NPC
        </span>
        NRI Property Connect
      </a>
      <nav className="site-nav" aria-label="Primary">
        {links.map(([label, href]) => (
          <a key={href} href={href}>
            {label}
          </a>
        ))}
      </nav>
      <a className="button primary small header-cta" href="#contact">
        Book a call
      </a>
    </header>
  );
}
