// Canonical origin for metadata, robots and sitemap. The apex domain 308-redirects to www, so the
// fallback is the www host; NEXT_PUBLIC_APP_URL overrides it per environment.
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://www.narcoguard.app").replace(/\/+$/, "")

/** Public pages worth indexing. Account and API routes are intentionally excluded. */
export const PUBLIC_ROUTES = ["/", "/help", "/angel", "/watch", "/stability", "/constitution", "/fund", "/hero-signup", "/ar", "/privacy", "/terms"] as const
