import { NextResponse } from "next/server"
import { z } from "zod"
import { RESOURCE_KINDS } from "@/lib/resource-finder"
import { lookupResources } from "@/lib/resource-lookup"

// Upstream directories and the AI provider can be slow; allow time for one fallback attempt.
export const maxDuration = 60

const querySchema = z.union([
  z.object({ kind: z.enum(RESOURCE_KINDS), lat: z.coerce.number().min(-90).max(90), lon: z.coerce.number().min(-180).max(180) }),
  z.object({ kind: z.enum(RESOURCE_KINDS), zip: z.string().regex(/^\d{5}$/) }),
])

// Location never goes in logs or cached responses.
const noStore = { "Cache-Control": "private, no-store" }

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!parsed.success) return NextResponse.json({ error: "Provide kind plus a 5-digit ZIP or lat and lon." }, { status: 400, headers: noStore })
  const { kind, ...origin } = parsed.data
  const result = await lookupResources(kind, origin)
  return NextResponse.json(result, { status: result.status === "ok" ? 200 : 502, headers: noStore })
}
