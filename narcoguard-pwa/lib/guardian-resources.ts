import type { Need } from "./guardian-stability"

export interface ResourceLink { title: string; description: string; url: string }

export function normalizePostalCode(value: string): string {
  const trimmed = value.trim()
  return /^\d{5}(?:-\d{4})?$/.test(trimmed) ? trimmed : ""
}

const directory: ResourceLink = {
  title: "Find local help through 211",
  description: "Search with your ZIP code for current services. Confirm hours, availability and requirements with the provider.",
  url: "https://www.211.org/get-help",
}
const hud: ResourceLink = {
  title: "HUD Find Shelter",
  description: "Search for nearby shelter, food pantry, health clinic and clothing resources. Confirm availability with the provider.",
  url: "https://www.hud.gov/FindShelter",
}

export function resourcesForNeed(need: Need, postalCode: string): ResourceLink[] {
  const zip = normalizePostalCode(postalCode)
  const localDirectory = { ...directory, description: zip ? `Enter ZIP ${zip} on 211 to search nearby services. Confirm hours, availability and requirements with the provider.` : directory.description }
  if (need === "food") return [
    { title: "Feeding America food locator", description: "Enter your ZIP to find nearby network food banks, pantries and meal programs; verify current hours before traveling.", url: "https://www.feedingamerica.org/find-your-local-foodbank" },
    localDirectory,
    { title: "Check and apply for New York SNAP", description: "Use the state's eligibility screening and application; the app cannot determine eligibility.", url: "https://mybenefits.ny.gov/" },
  ]
  if (need === "safePlace") return [hud, localDirectory]
  if (need === "hygiene" || need === "laundry") return [
    localDirectory,
    { ...hud, description: "HUD can locate shelters and community providers that may offer or refer to hygiene-related services. Call first to confirm the specific service." },
  ]
  if (need === "treatment") return [
    { title: "Find treatment (SAMHSA)", description: "Search the federal treatment directory and contact a program to confirm services, medications, eligibility and openings.", url: "https://findtreatment.gov/" },
    { title: "SAMHSA National Helpline", description: "Free, confidential treatment referral and information: 1-800-662-HELP (4357).", url: "tel:18006624357" },
    localDirectory,
  ]
  return [localDirectory]
}
