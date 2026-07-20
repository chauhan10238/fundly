import {
  Document,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer"
import type { DiosShareableReport, ReportMetric } from "@/lib/reports/types"

const C = {
  navy: "#0A1220",
  navy2: "#111C2F",
  green: "#28C98B",
  white: "#FFFFFF",
  text: "#172033",
  muted: "#657086",
  border: "#DCE2EA",
  light: "#F5F7FA",
  red: "#D94A56",
  amber: "#C88B18",
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingBottom: 48,
    paddingHorizontal: 42,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.text,
  },
  cover: {
    backgroundColor: C.navy,
    color: C.white,
    padding: 54,
  },
  logo: { width: 260, height: 69, objectFit: "contain" },
  coverSpacer: { height: 90 },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.8,
    color: "#9BA9BD",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  coverTitle: { fontSize: 30, fontWeight: 700, lineHeight: 1.15 },
  ticker: { fontSize: 16, color: C.green, marginTop: 8 },
  coverGrid: {
    marginTop: 50,
    borderTopWidth: 1,
    borderTopColor: "#344158",
    paddingTop: 18,
    flexDirection: "row",
  },
  coverCell: { width: "33.33%" },
  coverLabel: { fontSize: 8, color: "#9BA9BD", marginBottom: 5 },
  coverValue: { fontSize: 15, fontWeight: 700, color: C.white },
  footer: {
    position: "absolute",
    left: 42,
    right: 42,
    bottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    color: C.muted,
    fontSize: 7,
  },
  header: {
    marginBottom: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brand: { fontSize: 13, fontWeight: 700, color: C.navy },
  reportMeta: { fontSize: 7, color: C.muted, textAlign: "right" },
  h1: { fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 12 },
  h2: {
    fontSize: 12,
    fontWeight: 700,
    color: C.navy,
    marginTop: 15,
    marginBottom: 8,
  },
  paragraph: { fontSize: 9, lineHeight: 1.5, color: C.text, marginBottom: 6 },
  callout: {
    backgroundColor: C.navy,
    color: C.white,
    padding: 16,
    borderRadius: 5,
    marginBottom: 16,
  },
  calloutTop: { flexDirection: "row", justifyContent: "space-between" },
  calloutLabel: { fontSize: 8, color: "#AAB6C9" },
  calloutValue: { fontSize: 22, fontWeight: 700, color: C.green },
  score: { fontSize: 18, fontWeight: 700 },
  bullets: { marginTop: 5 },
  bullet: { flexDirection: "row", marginBottom: 5 },
  bulletMark: { width: 13, color: C.green, fontWeight: 700 },
  bulletText: { flex: 1, fontSize: 9, lineHeight: 1.4 },
  twoCol: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  card: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  cardLabel: { fontSize: 7, color: C.muted, marginBottom: 4 },
  cardValue: { fontSize: 14, fontWeight: 700, color: C.navy },
  metricGrid: { flexDirection: "row", flexWrap: "wrap" },
  metricCell: {
    width: "33.33%",
    borderWidth: 0.5,
    borderColor: C.border,
    padding: 8,
    minHeight: 46,
  },
  metricLabel: { fontSize: 7, color: C.muted, marginBottom: 4 },
  metricValue: { fontSize: 10, fontWeight: 700 },
  pillarRow: { marginBottom: 9 },
  pillarHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  pillarName: { fontSize: 8, fontWeight: 700 },
  pillarScore: { fontSize: 8, fontWeight: 700 },
  barBg: { height: 5, backgroundColor: "#E7EBF1", borderRadius: 3 },
  barFill: { height: 5, backgroundColor: C.green, borderRadius: 3 },
  small: { fontSize: 7, color: C.muted, marginTop: 3, lineHeight: 1.3 },
  tableHead: {
    flexDirection: "row",
    backgroundColor: C.navy,
    color: C.white,
    paddingVertical: 6,
    paddingHorizontal: 7,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  c1: { width: "22%" },
  c2: { width: "58%" },
  c3: { width: "20%", textAlign: "right" },
  link: { color: "#2169B5", textDecoration: "none" },
  disclaimer: {
    marginTop: 16,
    padding: 10,
    backgroundColor: C.light,
    color: C.muted,
    fontSize: 7,
    lineHeight: 1.45,
  },
})

function Header({ report }: { report: DiosShareableReport }) {
  return (
    <View style={styles.header} fixed>
      <Text style={styles.brand}>DIOS Investment Intelligence</Text>
      <Text style={styles.reportMeta}>
        {report.ticker} | Generated {new Date(report.generatedAt).toLocaleDateString("en-AU")}
      </Text>
    </View>
  )
}

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text>DIOS - Confidential investment intelligence report</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  )
}

function MetricGrid({ metrics }: { metrics: ReportMetric[] }) {
  return (
    <View style={styles.metricGrid}>
      {metrics.map((item) => (
        <View key={item.label} style={styles.metricCell} wrap={false}>
          <Text style={styles.metricLabel}>{item.label}</Text>
          <Text style={styles.metricValue}>{item.value}</Text>
          {item.note ? <Text style={styles.small}>{item.note}</Text> : null}
        </View>
      ))}
    </View>
  )
}

export function DiosReportPdf({ report }: { report: DiosShareableReport }) {
  return (
    <Document
      title={`${report.ticker} DIOS Investment Intelligence Report`}
      author="DIOS Investment Intelligence Engine"
      subject={`${report.companyName} investment analysis`}
      keywords={`DIOS, ${report.ticker}, investment analysis`}
    >
      <Page size="A4" style={[styles.page, styles.cover]}>
        <Image src="/dios-report-logo.png" style={styles.logo} />
        <View style={styles.coverSpacer} />
        <Text style={styles.eyebrow}>Professional investment intelligence report</Text>
        <Text style={styles.coverTitle}>{report.companyName}</Text>
        <Text style={styles.ticker}>{report.ticker}</Text>

        <View style={styles.coverGrid}>
          <View style={styles.coverCell}>
            <Text style={styles.coverLabel}>Recommendation</Text>
            <Text style={[styles.coverValue, { color: C.green }]}>{report.recommendation}</Text>
          </View>
          <View style={styles.coverCell}>
            <Text style={styles.coverLabel}>Confidence</Text>
            <Text style={styles.coverValue}>{report.confidence}%</Text>
          </View>
          <View style={styles.coverCell}>
            <Text style={styles.coverLabel}>Current price</Text>
            <Text style={styles.coverValue}>
              {report.price !== undefined
                ? `${report.currency ?? "USD"} ${report.price.toFixed(2)}`
                : "Not available"}
            </Text>
          </View>
        </View>

        <View style={{ position: "absolute", left: 54, bottom: 55 }}>
          <Text style={{ fontSize: 8, color: "#9BA9BD" }}>
            Generated {new Date(report.generatedAt).toLocaleString("en-AU")}
          </Text>
          <Text style={{ fontSize: 8, color: "#9BA9BD", marginTop: 5 }}>
            Prepared by the DIOS Decision Intelligence Engine
          </Text>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Header report={report} />
        <Text style={styles.h1}>Executive Summary</Text>

        <View style={styles.callout}>
          <View style={styles.calloutTop}>
            <View>
              <Text style={styles.calloutLabel}>DIOS RECOMMENDATION</Text>
              <Text style={styles.calloutValue}>{report.recommendation}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.calloutLabel}>CONFIDENCE</Text>
              <Text style={styles.score}>{report.confidence}%</Text>
              {report.overallScore !== undefined ? (
                <Text style={{ fontSize: 8, color: "#AAB6C9", marginTop: 3 }}>
                  Overall score {report.overallScore}/100
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {report.executiveSummary.map((line) => (
          <Text key={line} style={styles.paragraph}>{line}</Text>
        ))}

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.h2}>Investment Reasons</Text>
            <View style={styles.bullets}>
              {report.investmentReasons.map((item) => (
                <View key={item} style={styles.bullet}>
                  <Text style={styles.bulletMark}>+</Text>
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.col}>
            <Text style={styles.h2}>Key Risks</Text>
            <View style={styles.bullets}>
              {report.risks.map((item) => (
                <View key={item} style={styles.bullet}>
                  <Text style={[styles.bulletMark, { color: C.red }]}>!</Text>
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <Text style={styles.h2}>Source Confidence</Text>
        <View style={styles.twoCol}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Confidence score</Text>
            <Text style={styles.cardValue}>{report.sourceConfidence.score}/100</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Connected providers</Text>
            <Text style={[styles.cardValue, { fontSize: 10 }]}>
              {report.sourceConfidence.connected.join(", ") || "Not available"}
            </Text>
          </View>
        </View>

        <View style={styles.disclaimer}>
          <Text>{report.disclaimer}</Text>
        </View>
        <Footer />
      </Page>

      <Page size="A4" style={styles.page}>
        <Header report={report} />
        <Text style={styles.h1}>Financial Health</Text>

        {report.financialHealth ? (
          <>
            <View style={styles.twoCol}>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Financial health score</Text>
                <Text style={styles.cardValue}>
                  {report.financialHealth.score}/100 - {report.financialHealth.label}
                </Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Suggested allocation</Text>
                <Text style={styles.cardValue}>
                  {report.suggestedWeight !== undefined
                    ? `${report.suggestedWeight.toFixed(1)}%`
                    : "Not specified"}
                </Text>
              </View>
            </View>

            <Text style={styles.h2}>Quality Pillars</Text>
            {report.financialHealth.pillars.map((pillar) => (
              <View key={pillar.name} style={styles.pillarRow} wrap={false}>
                <View style={styles.pillarHead}>
                  <Text style={styles.pillarName}>{pillar.name}</Text>
                  <Text style={styles.pillarScore}>{pillar.score}/100</Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${pillar.score}%` }]} />
                </View>
                <Text style={styles.small}>{pillar.explanation}</Text>
              </View>
            ))}
          </>
        ) : (
          <Text style={styles.paragraph}>Financial health data was not available for this instrument.</Text>
        )}

        <Text style={styles.h2}>Normalized Financial Metrics</Text>
        <MetricGrid metrics={report.financialMetrics} />
        <Footer />
      </Page>

      <Page size="A4" style={styles.page}>
        <Header report={report} />
        <Text style={styles.h1}>Earnings & News Intelligence</Text>

        <Text style={styles.h2}>Earnings</Text>
        <MetricGrid metrics={report.earnings} />

        <Text style={styles.h2}>News Sentiment</Text>
        <View style={styles.twoCol}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Overall sentiment</Text>
            <Text style={styles.cardValue}>{report.news.sentiment.toUpperCase()}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Sentiment score</Text>
            <Text style={styles.cardValue}>
              {report.news.sentimentScore}/100 ({report.news.confidence}% confidence)
            </Text>
          </View>
        </View>

        <Text style={styles.h2}>Top Themes</Text>
        <View style={styles.metricGrid}>
          {report.news.themes.map((theme) => (
            <View key={theme.theme} style={styles.metricCell}>
              <Text style={styles.metricLabel}>{theme.theme}</Text>
              <Text style={styles.metricValue}>{theme.mentions} mentions</Text>
              <Text style={styles.small}>{theme.sentiment}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.h2}>Key Headlines</Text>
        <View>
          <View style={styles.tableHead}>
            <Text style={styles.c1}>Source</Text>
            <Text style={styles.c2}>Headline</Text>
            <Text style={styles.c3}>Date</Text>
          </View>
          {report.news.headlines.map((headline) => (
            <View key={`${headline.url}-${headline.title}`} style={styles.tableRow} wrap={false}>
              <Text style={styles.c1}>{headline.source}</Text>
              <Link src={headline.url} style={[styles.c2, styles.link]}>{headline.title}</Link>
              <Text style={styles.c3}>
                {new Date(headline.publishedAt).toLocaleDateString("en-AU")}
              </Text>
            </View>
          ))}
        </View>
        <Footer />
      </Page>

      <Page size="A4" style={styles.page}>
        <Header report={report} />
        <Text style={styles.h1}>Filings, Scenarios & Sources</Text>

        <Text style={styles.h2}>Latest SEC Filings</Text>
        {report.filings.map((filing) => (
          <View key={`${filing.form}-${filing.url}`} style={styles.tableRow} wrap={false}>
            <Text style={styles.c1}>{filing.form}</Text>
            <Link src={filing.url} style={[styles.c2, styles.link]}>
              {filing.description || `${filing.form} filing`}
            </Link>
            <Text style={styles.c3}>{filing.filingDate}</Text>
          </View>
        ))}

        {report.scenarios?.length ? (
          <>
            <Text style={styles.h2}>DIOS Scenarios</Text>
            {report.scenarios.map((scenario) => (
              <View key={scenario.name} style={styles.card} wrap={false}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 9, fontWeight: 700 }}>{scenario.name}</Text>
                  <Text style={{ fontSize: 9, fontWeight: 700 }}>
                    {scenario.returnPct !== undefined
                      ? `${scenario.returnPct >= 0 ? "+" : ""}${scenario.returnPct.toFixed(1)}%`
                      : scenario.target !== undefined
                        ? `${report.currency ?? "USD"} ${scenario.target.toFixed(2)}`
                        : ""}
                  </Text>
                </View>
                {scenario.description ? <Text style={styles.small}>{scenario.description}</Text> : null}
              </View>
            ))}
          </>
        ) : null}

        <Text style={styles.h2}>Sources</Text>
        {report.sources.map((source, index) => (
          <View key={`${source.name}-${index}`} style={styles.tableRow} wrap={false}>
            <Text style={{ width: "8%" }}>{index + 1}</Text>
            {source.url ? (
              <Link src={source.url} style={[styles.link, { width: "72%" }]}>
                {source.name}
              </Link>
            ) : (
              <Text style={{ width: "72%" }}>{source.name}</Text>
            )}
            <Text style={{ width: "20%", textAlign: "right" }}>{source.date ?? ""}</Text>
          </View>
        ))}

        <View style={styles.disclaimer}>
          <Text>{report.disclaimer}</Text>
        </View>
        <Footer />
      </Page>
    </Document>
  )
}
