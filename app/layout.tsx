import type { Metadata } from "next"
import { Lora, Manrope } from "next/font/google"
import "./globals.css"

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
})

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})

export const metadata: Metadata = {
  title: "NRI Property Connect | Manage, Sell or Buy Property in India",
  description:
    "Australia-based property support for citizens, PR holders, visa holders, NRIs and OCIs across North India.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${lora.variable}`}>
      <body>{children}</body>
    </html>
  )
}
