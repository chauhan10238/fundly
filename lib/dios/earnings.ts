import type { EarningsEvent } from "./types"

// Illustrative demo earnings calendar and results.
export const EARNINGS: EarningsEvent[] = [
  {
    ticker: "AVGO", name: "Broadcom Inc.", date: "2026-03-06", time: "AMC",
    expectedMove: 8.2, epsConsensus: 1.62, revenueConsensus: "$15.1B",
    affectsPortfolio: false, inEtfs: ["SMH", "SOXX", "QQQ", "XLK", "VOO"],
    recommendation: "Wait for print — implied move is high into a full valuation",
  },
  {
    ticker: "TSM", name: "Taiwan Semiconductor", date: "2026-03-10", time: "BMO",
    expectedMove: 6.5, epsConsensus: 2.31, revenueConsensus: "$26.4B",
    affectsPortfolio: true, inEtfs: ["SMH", "SOXX", "SOXQ", "VT"],
    recommendation: "Hold through print — long-term thesis intact, event risk manageable",
    reported: {
      revenueVsConsensus: 2.4, epsVsConsensus: 3.1, grossMargin: 59.1, operatingMargin: 49.2,
      guidance: "raised",
      commentary: "Management raised full-year revenue growth guidance on sustained AI accelerator demand and strong 3nm/2nm ramp.",
      ripple: [
        { ticker: "NVDA", direction: "positive", impactScore: 7, explanation: "Foundry capacity and yield support NVIDIA's supply outlook.", evidence: "TSM Q4 call, 2026-03-10", duration: "2-3 quarters" },
        { ticker: "AMD", direction: "positive", impactScore: 5, explanation: "Improved leading-edge availability aids AMD's data-center roadmap.", evidence: "TSM Q4 call", duration: "2 quarters" },
        { ticker: "AVGO", direction: "positive", impactScore: 4, explanation: "Custom-silicon demand corroborated by foundry commentary.", evidence: "TSM Q4 call", duration: "2 quarters" },
        { ticker: "ASML", direction: "positive", impactScore: 6, explanation: "Capex plans support EUV / advanced-node tool orders.", evidence: "TSM capex guide", duration: "3-4 quarters" },
        { ticker: "AMAT", direction: "positive", impactScore: 4, explanation: "Leading-edge capex is supportive of deposition/etch demand.", evidence: "TSM capex guide", duration: "2-3 quarters" },
        { ticker: "LRCX", direction: "positive", impactScore: 4, explanation: "Etch intensity rises with advanced nodes.", evidence: "TSM capex guide", duration: "2-3 quarters" },
        { ticker: "SMH", direction: "positive", impactScore: 6, explanation: "Largest holdings NVDA/TSM/AVGO benefit directly.", evidence: "Look-through", duration: "2-3 quarters" },
        { ticker: "SOXX", direction: "positive", impactScore: 5, explanation: "Broad semi index lifts on foundry strength.", evidence: "Look-through", duration: "2-3 quarters" },
      ],
    },
  },
  {
    ticker: "MU", name: "Micron Technology", date: "2026-03-19", time: "AMC",
    expectedMove: 9.4, epsConsensus: 1.05, revenueConsensus: "$8.6B",
    affectsPortfolio: false, inEtfs: ["SMH", "SOXX", "SOXQ"],
    recommendation: "High implied move — size any pre-print exposure small",
  },
  {
    ticker: "ASML", name: "ASML Holding", date: "2026-04-16", time: "BMO",
    expectedMove: 7.1, epsConsensus: 5.42, revenueConsensus: "€7.9B",
    affectsPortfolio: false, inEtfs: ["SMH", "SOXX"],
    recommendation: "Bookings are the key tell for the equipment cycle — wait for print",
  },
  {
    ticker: "INTC", name: "Intel Corporation", date: "2026-04-24", time: "AMC",
    expectedMove: 11.2, epsConsensus: 0.11, revenueConsensus: "$12.9B",
    affectsPortfolio: true, inEtfs: ["SMH", "SOXX", "SOXQ", "XLK"],
    recommendation: "Turnaround remains unproven — do not add before evidence of foundry traction",
  },
  {
    ticker: "AMD", name: "Advanced Micro Devices", date: "2026-04-28", time: "AMC",
    expectedMove: 9.8, epsConsensus: 1.18, revenueConsensus: "$7.7B",
    affectsPortfolio: true, inEtfs: ["SMH", "SOXX", "SOXQ", "QQQ"],
    recommendation: "Hold through print — data-center GPU trajectory is the swing factor",
  },
]

export const AFFECTED_MAP: Record<string, string[]> = {
  TSM: ["AMD", "NVDA", "AVGO", "ASML", "AMAT", "LRCX", "SMH", "SOXX", "SOXQ"],
  MSFT: ["NVDA", "AMD", "AVGO", "QQQ", "XLK", "SMH"],
  ASML: ["AMAT", "LRCX", "TSM", "SMH", "SOXX"],
}
