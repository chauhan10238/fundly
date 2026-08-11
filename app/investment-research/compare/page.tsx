import type { Metadata } from "next"
import CityCompare from "@/components/CityCompare"
import { cityProfiles } from "@/lib/city-research"

export const metadata: Metadata = {
  title: "Compare North India Property Markets for NRIs | NRI Property Connect",
  description: "Compare Delhi NCR, Punjab, Uttar Pradesh, Uttarakhand and Rajasthan property markets through an NRI-focused lens.",
}

export default function CompareCitiesPage() {
  return <CityCompare cities={cityProfiles} />
}
