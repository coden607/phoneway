import { coarsen, fallbackLinks, findTreatmentUrl, MAX_RESULTS_PER_KIND, OSM_QUERY_GROUPS, overpassNeedsQuery, overpassQuery, parseFindTreatment, parseOverpass, parseOverpassNeeds, RESOURCE_KINDS, type NearbyResource, type ResourceKind } from "@/lib/resource-finder"

const USER_AGENT = "NarcoGuard/2.0 (+https://www.narcoguard.app)"

export type ResourceOrigin = { lat: number; lon: number } | { zip: string }

export interface ResourceLookup {
  status: "ok" | "unavailable"
  message?: string
  fetchedAt?: string
  results: NearbyResource[]
  fallback: { title: string; url: string }[]
}

// Public Overpass instances. They are often busy, so a request that has not answered within
// OVERPASS_HEDGE_MS is backed up by the next instance and the first good answer wins.
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
]
const OVERPASS_HEDGE_MS = 6_000
const OVERPASS_TIMEOUT_MS = 25_000

async function fetchJson(url: string, init?: RequestInit, timeoutMs = 12_000, cancel?: AbortSignal): Promise<unknown> {
  const signal = cancel ? AbortSignal.any([AbortSignal.timeout(timeoutMs), cancel]) : AbortSignal.timeout(timeoutMs)
  const response = await fetch(url, { ...init, headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...init?.headers }, signal, cache: "no-store" })
  if (!response.ok) throw new Error(`${new URL(url).hostname} responded ${response.status}`)
  return response.json()
}

async function geocodeZip(zip: string): Promise<{ lat: number; lon: number } | undefined> {
  const body = await fetchJson(`https://nominatim.openstreetmap.org/search?${new URLSearchParams({ postalcode: zip, countrycodes: "us", format: "json", limit: "1" })}`)
  const first = Array.isArray(body) ? (body[0] as { lat?: string; lon?: string } | undefined) : undefined
  const lat = Number(first?.lat), lon = Number(first?.lon)
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat: coarsen(lat), lon: coarsen(lon) } : undefined
}

class OverpassUnavailable extends Error {
  constructor(readonly failures: string[]) {
    super(failures.join("; "))
    this.name = "OverpassUnavailable"
  }
}

/** Staggered requests across the public instances; resolves with the first successful answer. */
export function fetchOverpass(query: string, endpoints = OVERPASS_ENDPOINTS, hedgeMs = OVERPASS_HEDGE_MS, timeoutMs = OVERPASS_TIMEOUT_MS): Promise<unknown> {
  const body = new URLSearchParams({ data: query }).toString()
  return new Promise((resolve, reject) => {
    const done = new AbortController()
    const failures: string[] = []
    let next = 0
    let pending = 0
    let settled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const launch = () => {
      clearTimeout(timer)
      if (settled || next >= endpoints.length) return
      const endpoint = endpoints[next++]
      pending++
      fetchJson(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body }, timeoutMs, done.signal).then(
        (data) => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          done.abort()
          resolve(data)
        },
        (error) => {
          pending--
          if (settled) return
          // Host and status or error name only; never the query, which contains the location.
          failures.push(error instanceof Error && /responded \d+$/.test(error.message) ? error.message : `${new URL(endpoint).hostname} ${error instanceof Error ? error.name : "failed"}`)
          if (next < endpoints.length) launch()
          else if (pending === 0) {
            settled = true
            reject(new OverpassUnavailable(failures))
          }
        },
      )
      timer = setTimeout(launch, hedgeMs)
    }
    launch()
  })
}

async function resolveOrigin(origin: ResourceOrigin) {
  return "zip" in origin ? geocodeZip(origin.zip) : { lat: coarsen(origin.lat), lon: coarsen(origin.lon) }
}

function failureReason(error: unknown) {
  if (error instanceof OverpassUnavailable) return error.message
  return error instanceof Error && /responded \d+$/.test(error.message) ? error.message : error instanceof Error ? error.name : "unknown"
}

/** Looks up live listings. Never logs the location; failures are reported by kind only. */
export async function lookupResources(kind: ResourceKind, origin: ResourceOrigin): Promise<ResourceLookup> {
  const fallback = fallbackLinks(kind)
  try {
    const point = await resolveOrigin(origin)
    if (!point) return { status: "unavailable", message: "That ZIP code could not be located.", results: [], fallback }
    let results: NearbyResource[]
    if (kind === "treatment") {
      results = parseFindTreatment(await fetchJson(findTreatmentUrl(point.lat, point.lon)))
    } else {
      results = parseOverpass(kind, await fetchOverpass(overpassQuery(kind, point.lat, point.lon)), point)
    }
    return { status: "ok", fetchedAt: new Date().toISOString(), results, fallback }
  } catch (error) {
    // Only the upstream host and status are logged, never the location or query.
    console.warn(`[resources] ${kind} lookup unavailable: ${failureReason(error)}`)
    return { status: "unavailable", message: "The live directory did not respond. Use the links below.", results: [], fallback }
  }
}

export interface KindLookup {
  status: "ok" | "unavailable"
  results: NearbyResource[]
  fallback: { title: string; url: string }[]
}

export interface NeedsLookup {
  status: "ok" | "partial" | "unavailable"
  message?: string
  fetchedAt?: string
  kinds: Record<ResourceKind, KindLookup>
}

/**
 * Searches every need at once: one FindTreatment request and one combined Overpass request, run in
 * parallel. If one source fails, the other's listings are still returned and the failed kinds say so.
 */
export async function lookupNeeds(origin: ResourceOrigin): Promise<NeedsLookup> {
  const unavailable = (kind: ResourceKind): KindLookup => ({ status: "unavailable", results: [], fallback: fallbackLinks(kind) })
  const allUnavailable = () => Object.fromEntries(RESOURCE_KINDS.map((kind) => [kind, unavailable(kind)])) as Record<ResourceKind, KindLookup>
  let point: { lat: number; lon: number } | undefined
  try {
    point = await resolveOrigin(origin)
  } catch (error) {
    console.warn(`[resources] needs lookup geocoding unavailable: ${failureReason(error)}`)
    return { status: "unavailable", message: "The ZIP code could not be looked up right now. Use the directories below.", kinds: allUnavailable() }
  }
  if (!point) return { status: "unavailable", message: "That ZIP code could not be located.", kinds: allUnavailable() }
  const here = point

  const [treatment, ...osm] = await Promise.allSettled([
    fetchJson(findTreatmentUrl(here.lat, here.lon)).then((body) => parseFindTreatment(body).slice(0, MAX_RESULTS_PER_KIND)),
    ...OSM_QUERY_GROUPS.map((group) => fetchOverpass(overpassNeedsQuery(here.lat, here.lon, group)).then((body) => parseOverpassNeeds(body, here))),
  ])
  if (treatment.status === "rejected") console.warn(`[resources] treatment lookup unavailable: ${failureReason(treatment.reason)}`)

  const kinds = allUnavailable()
  if (treatment.status === "fulfilled") kinds.treatment = { status: "ok", results: treatment.value, fallback: fallbackLinks("treatment") }
  OSM_QUERY_GROUPS.forEach((group, index) => {
    const result = osm[index]
    if (result.status === "rejected") {
      console.warn(`[resources] OpenStreetMap group ${index + 1} unavailable: ${failureReason(result.reason)}`)
      return
    }
    for (const kind of group) kinds[kind] = { status: "ok", results: result.value[kind], fallback: fallbackLinks(kind) }
  })

  const sources = [treatment, ...osm]
  const failures = sources.filter((result) => result.status === "rejected").length
  const status = failures === 0 ? "ok" : failures === sources.length ? "unavailable" : "partial"
  const message = status === "ok" ? undefined : status === "partial" ? "Some directories did not respond, so those needs show directory links instead of listings." : "The live directories did not respond. Use the directories below."
  return { status, message, fetchedAt: new Date().toISOString(), kinds }
}
