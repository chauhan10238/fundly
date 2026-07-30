import type { Metadata } from "next"
import { Lora, Manrope } from "next/font/google"
import { DiosProvider } from "@/components/dios/store"
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
  title: "DIOS | Investment Decision Intelligence",
  description:
    "Portfolio tracking, market intelligence, analysis and Stake transaction sync powered by Financial Modeling Prep.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${lora.variable}`}>
      <body>
        <DiosProvider>{children}</DiosProvider>
      </body>
    </html>
  )
}
