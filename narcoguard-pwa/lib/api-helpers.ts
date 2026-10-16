import { NextResponse } from "next/server"

export const noStore = { "Cache-Control": "private, no-store" }

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: noStore })

/** First hop of x-forwarded-for, used only as an in-memory rate-limit key and never logged. */
export const clientKey = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"

export const readJson = async (request: Request) => (await request.json().catch(() => null)) as Record<string, unknown> | null

/** Rejects cross-site writes to cookie-authenticated routes. Requests without Origin are same-site navigations or tools. */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin")
  if (!origin) return true
  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}
