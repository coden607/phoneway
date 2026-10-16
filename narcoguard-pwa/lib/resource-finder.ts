// Live nearby-resource lookup. Treatment comes from SAMHSA's FindTreatment.gov locator; everything
// else (food, shelter, water, toilets, clinics, libraries and more) comes from OpenStreetMap via the
// Overpass API. Neither source confirms
// hours, openings or eligibility, so every result is labelled with its source and "call first".
// Location is rounded to about 1 km before it leaves the server and is never stored or logged.

export const RESOURCE_KINDS = ["treatment", "food", "shelter", "pharmacy", "water", "toilets", "showers", "laundry", "emergency", "clinic", "community", "library", "jobs"] as const
export type ResourceKind = typeof RESOURCE_KINDS[number]
export type OsmKind = Exclude<ResourceKind, "treatment">

export const RESOURCE_LABELS: Record<ResourceKind, string> = {
  treatment: "Treatment",
  food: "Food",
  shelter: "Shelter",
  pharmacy: "Pharmacy (naloxone is sold without a prescription; call to check stock)",
  water: "Drinking water",
  toilets: "Public toilets",
  showers: "Showers",
  laundry: "Laundry",
  emergency: "Emergency rooms (in an emergency, call 911)",
  clinic: "Clinics and health centers",
  community: "Community centers",
  library: "Libraries (free internet and computers)",
  jobs: "Job help",
}

export const SHORT_LABELS: Record<ResourceKind, string> = {
  treatment: "Treatment", food: "Food", shelter: "Shelter", pharmacy: "Pharmacy", water: "Water", toilets: "Toilets", showers: "Showers",
  laundry: "Laundry", emergency: "Emergency room", clinic: "Clinics", community: "Community centers", library: "Libraries", jobs: "Job help",
}

/**
 * Maslow's hierarchy as a way to organize a search, not a ranking of people or an order anyone must
 * follow: every level is searched at once and any need can come first.
 */
export const NEED_LEVELS = [
  { id: "basic", title: "Basic needs", kinds: ["food", "shelter", "water", "toilets", "showers", "laundry"] },
  { id: "safety", title: "Health and safety", kinds: ["emergency", "clinic", "pharmacy"] },
  { id: "belonging", title: "Belonging and connection", kinds: ["treatment", "community"] },
  { id: "esteem", title: "Esteem and independence", kinds: ["jobs"] },
  { id: "growth", title: "Learning and growth", kinds: ["library"] },
] as const satisfies readonly { id: string; title: string; kinds: readonly ResourceKind[] }[]

export interface NearbyResource {
  name: string
  kind: ResourceKind
  address?: string
  phone?: string
  website?: string
  /** Opening hours as listed by the source; may be out of date. */
  hours?: string
  distanceMiles?: number
  lat?: number
  lon?: number
  source: "SAMHSA FindTreatment.gov" | "OpenStreetMap contributors"
}

export const SEARCH_RADIUS_METERS = 16_000 // about 10 miles
export const MAX_RESULTS = 10
/** Listings shown per kind when every level is searched at once. */
export const MAX_RESULTS_PER_KIND = 5

/** Rounds coordinates to 2 decimals (about 1.1 km) so precise location never leaves the server. */
export function coarsen(value: number): number {
  return Math.round(value * 100) / 100
}

export function haversineMiles(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLon = toRad(bLon - aLon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2
  return Math.round(3958.8 * 2 * Math.asin(Math.sqrt(h)) * 10) / 10
}

interface OsmKindSpec {
  /** Each entry is a set of tags that must all match. */
  filters: Record<string, string>[]
  /** Tag values that rule a place out, e.g. toilets for customers only. */
  exclude?: Record<string, string[]>
  /** Dense kinds use a smaller radius so the nearest places are not crowded out. */
  radius: number
  /** Name shown for places that usually have none, such as a public drinking fountain. */
  unnamed?: string
}

const NOT_PUBLIC = { access: ["private", "no", "customers"] }

export const OSM_KINDS: Record<OsmKind, OsmKindSpec> = {
  food: { filters: [{ social_facility: "food_bank" }, { social_facility: "soup_kitchen" }, { amenity: "food_bank" }], radius: SEARCH_RADIUS_METERS },
  // Hotels contracted as temporary shelters are often mapped this way and go stale when contracts end.
  shelter: { filters: [{ social_facility: "shelter" }], exclude: { tourism: ["hotel"] }, radius: SEARCH_RADIUS_METERS },
  water: { filters: [{ amenity: "drinking_water" }], exclude: NOT_PUBLIC, radius: 2_000, unnamed: "Drinking water" },
  toilets: { filters: [{ amenity: "toilets" }], exclude: NOT_PUBLIC, radius: 2_000, unnamed: "Public toilet" },
  showers: { filters: [{ amenity: "shower" }], exclude: NOT_PUBLIC, radius: SEARCH_RADIUS_METERS, unnamed: "Public shower" },
  laundry: { filters: [{ shop: "laundry" }], radius: 5_000 },
  emergency: { filters: [{ amenity: "hospital", emergency: "yes" }], radius: SEARCH_RADIUS_METERS },
  clinic: { filters: [{ amenity: "clinic" }, { healthcare: "clinic" }, { healthcare: "centre" }], radius: 5_000 },
  pharmacy: { filters: [{ amenity: "pharmacy" }, { healthcare: "pharmacy" }], radius: 5_000 },
  community: { filters: [{ amenity: "community_centre" }, { social_facility: "outreach" }], radius: 5_000 },
  library: { filters: [{ amenity: "library" }], exclude: NOT_PUBLIC, radius: 6_000 },
  jobs: { filters: [{ office: "employment_agency" }], radius: SEARCH_RADIUS_METERS },
}

export const OSM_KIND_ORDER = RESOURCE_KINDS.filter((kind): kind is OsmKind => kind !== "treatment")

const quote = (value: string) => JSON.stringify(value)

/** South, west, north, east of a square around the point; Overpass answers bounding boxes from its spatial index. */
export function boundingBox(lat: number, lon: number, radiusMeters: number): [number, number, number, number] {
  const dLat = radiusMeters / 111_320
  const dLon = radiusMeters / (111_320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01))
  const round = (value: number) => Math.round(value * 10_000) / 10_000
  return [round(lat - dLat), round(lon - dLon), round(lat + dLat), round(lon + dLon)]
}

// A bounding box, not (around:...): with a common tag such as amenity=toilets, "around" makes the
// public servers scan every match worldwide and time out. Corners are trimmed by distance afterwards.
function osmSelectors(kind: OsmKind, lat: number, lon: number, radius = OSM_KINDS[kind].radius): string {
  const { filters, exclude } = OSM_KINDS[kind]
  const excluded = Object.entries(exclude ?? {}).map(([key, values]) => `[${quote(key)}!~${quote(`^(${values.join("|")})$`)}]`).join("")
  const box = boundingBox(lat, lon, radius).join(",")
  return filters.map((filter) => `nwr${Object.entries(filter).map(([key, value]) => `[${quote(key)}=${quote(value)}]`).join("")}${excluded}(${box});`).join("")
}

export function overpassQuery(kind: OsmKind, lat: number, lon: number, radius?: number): string {
  return `[out:json][timeout:20];(${osmSelectors(kind, lat, lon, radius)});out center tags;`
}

/**
 * Two lighter requests instead of one: everyday places close by, and sparser services searched
 * wider. In dense cities a single query for everything is too heavy for the public servers, and
 * splitting means one half can still answer if the other fails.
 */
export const OSM_QUERY_GROUPS: readonly (readonly OsmKind[])[] = [
  ["water", "toilets", "pharmacy", "clinic", "laundry", "community", "library"],
  ["food", "shelter", "showers", "emergency", "jobs"],
]

export function overpassNeedsQuery(lat: number, lon: number, kinds: readonly OsmKind[] = OSM_KIND_ORDER): string {
  return `[out:json][timeout:20][maxsize:67108864];(${kinds.map((kind) => osmSelectors(kind, lat, lon)).join("")});out center tags;`
}

/** The kind a place belongs to, checked in display order; undefined when nothing matches. */
export function osmKindOf(tags: Record<string, string>): OsmKind | undefined {
  return OSM_KIND_ORDER.find((kind) => {
    const { filters, exclude } = OSM_KINDS[kind]
    if (Object.entries(exclude ?? {}).some(([key, values]) => values.includes(tags[key]))) return false
    return filters.some((filter) => Object.entries(filter).every(([key, value]) => tags[key] === value))
  })
}

const str = (value: unknown, max = 160) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined)
const num = (value: unknown) => {
  const parsed = typeof value === "string" ? Number(value) : value
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : undefined
}
const httpUrl = (value: unknown) => {
  const text = str(value, 300)
  if (!text) return undefined
  const withScheme = /^https?:\/\//i.test(text) ? text : `https://${text}`
  try {
    const url = new URL(withScheme)
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined
  } catch {
    return undefined
  }
}

interface OverpassElement { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

function toResource(kind: OsmKind, element: OverpassElement, origin: { lat: number; lon: number }): NearbyResource | undefined {
  const tags = element.tags ?? {}
  const name = str(tags.name) ?? OSM_KINDS[kind].unnamed
  const lat = element.lat ?? element.center?.lat
  const lon = element.lon ?? element.center?.lon
  if (!name || lat === undefined || lon === undefined) return undefined
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ")
  const address = [street, tags["addr:city"], tags["addr:state"], tags["addr:postcode"]].filter(Boolean).join(", ") || undefined
  return {
    name,
    kind,
    address,
    phone: str(tags.phone ?? tags["contact:phone"], 40),
    website: httpUrl(tags.website ?? tags["contact:website"]),
    hours: str(tags.opening_hours, 80),
    lat,
    lon,
    distanceMiles: haversineMiles(origin.lat, origin.lon, lat, lon),
    source: "OpenStreetMap contributors",
  }
}

function nearestUnique(resources: NearbyResource[], limit: number): NearbyResource[] {
  const seen = new Set<string>()
  return resources
    .sort((a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0))
    .filter((resource) => {
      const key = `${resource.name.toLowerCase()}|${resource.lat?.toFixed(3)}|${resource.lon?.toFixed(3)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, limit)
}

const elementsOf = (body: unknown) => {
  const elements = (body as { elements?: OverpassElement[] } | null)?.elements
  return Array.isArray(elements) ? elements : []
}

/** Parses a single-kind query; the query already selected the kind, so tags are not re-checked. */
export function parseOverpass(kind: OsmKind, body: unknown, origin: { lat: number; lon: number }): NearbyResource[] {
  return nearestUnique(elementsOf(body).flatMap((element) => toResource(kind, element, origin) ?? []), MAX_RESULTS)
}

/** Sorts a combined query's places into kinds by their tags, nearest first. */
export function parseOverpassNeeds(body: unknown, origin: { lat: number; lon: number }, limit = MAX_RESULTS_PER_KIND): Record<OsmKind, NearbyResource[]> {
  const grouped = Object.fromEntries(OSM_KIND_ORDER.map((kind) => [kind, [] as NearbyResource[]])) as Record<OsmKind, NearbyResource[]>
  for (const element of elementsOf(body)) {
    const kind = osmKindOf(element.tags ?? {})
    const resource = kind && toResource(kind, element, origin)
    if (kind && resource && (resource.distanceMiles ?? 0) <= OSM_KINDS[kind].radius / 1609.344) grouped[kind].push(resource)
  }
  for (const kind of OSM_KIND_ORDER) grouped[kind] = nearestUnique(grouped[kind], limit)
  return grouped
}

/** FindTreatment needs "lat,lon" in sAddr; a bare ZIP is ignored and silently falls back to a default location. */
export function findTreatmentUrl(lat: number, lon: number, radius = SEARCH_RADIUS_METERS): string {
  const params = new URLSearchParams({ sAddr: `${lat},${lon}`, limitType: "2", limitValue: String(radius), pageSize: String(MAX_RESULTS), page: "1", sort: "0" })
  return `https://findtreatment.gov/locator/exportsAsJson/v2?${params}`
}

export function parseFindTreatment(body: unknown): NearbyResource[] {
  const rows = (body as { rows?: Record<string, unknown>[] } | null)?.rows
  if (!Array.isArray(rows)) return []
  const seen = new Set<string>()
  return rows.flatMap((row) => {
    const name = [str(row.name1), str(row.name2)].filter(Boolean).join(" – ")
    if (!name) return []
    const street = [str(row.street1), str(row.street2)].filter(Boolean).join(", ")
    const address = [street, str(row.city), str(row.state), str(row.zip)].filter(Boolean).join(", ") || undefined
    const resource: NearbyResource = {
      name,
      kind: "treatment",
      address,
      phone: str(row.phone, 40),
      website: httpUrl(row.website),
      lat: num(row.latitude),
      lon: num(row.longitude),
      distanceMiles: num(row.miles) !== undefined ? Math.round((num(row.miles) as number) * 10) / 10 : undefined,
      source: "SAMHSA FindTreatment.gov",
    }
    const key = `${name}|${address ?? ""}`.toLowerCase()
    if (seen.has(key)) return []
    seen.add(key)
    return [resource]
  }).slice(0, MAX_RESULTS)
}

/** Directory pages a person can always use when live results are empty or unavailable. */
export function fallbackLinks(kind: ResourceKind) {
  const directories: Partial<Record<ResourceKind, { title: string; url: string }[]>> = {
    treatment: [{ title: "Search FindTreatment.gov", url: "https://findtreatment.gov/" }],
    food: [
      { title: "Broome County food assistance", url: "https://broomecountyny.gov/foodassistance" },
      { title: "Feeding America food bank locator", url: "https://www.feedingamerica.org/find-your-local-foodbank" },
    ],
    shelter: [{ title: "HUD Find Shelter", url: "https://www.hud.gov/FindShelter" }],
    showers: [{ title: "HUD Find Shelter (shelters often offer showers)", url: "https://www.hud.gov/FindShelter" }],
    clinic: [{ title: "HRSA Find a Health Center (sliding-scale fees)", url: "https://findahealthcenter.hrsa.gov/" }],
    community: [
      { title: "211 Susquehanna River Region (Broome and Tioga)", url: "https://www.helpme211.org/" },
      { title: "Narcotics Anonymous (meeting search on na.org)", url: "https://www.na.org/" },
      { title: "Alcoholics Anonymous meeting finder", url: "https://www.aa.org/find-aa" },
    ],
    jobs: [
      { title: "Broome-Tioga Workforce New York", url: "https://www.workforcebroome.com/" },
      { title: "CareerOneStop American Job Center finder", url: "https://www.careeronestop.org/LocalHelp/AmericanJobCenters/find-american-job-centers.aspx" },
    ],
  }
  return [...(directories[kind] ?? []), { title: "Find local help through 211", url: "https://www.211.org/get-help" }]
}
