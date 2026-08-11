import type { Metadata } from "next"
import { notFound } from "next/navigation"
import CityDashboard from "@/components/CityDashboard"
import { cityBySlug, cityProfiles } from "@/lib/city-research"

export function generateStaticParams() {
  return cityProfiles.map((city) => ({ city: city.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params
  const profile = cityBySlug[city]
  if (!profile) return {}
  return {
    title: `${profile.city} Property Investment Dashboard for NRIs | NRI Property Connect`,
    description: `${profile.city} NRI property dashboard covering growth drivers, rental demand, liquidity, key corridors, risks and due diligence.`,
  }
}

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params
  const profile = cityBySlug[city]
  if (!profile) notFound()
  return <CityDashboard profile={profile} />
}
