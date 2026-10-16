import { NextResponse } from "next/server"
import { z } from "zod"
import { lookupNeeds } from "@/lib/resource-lookup"

// Two upstream directories are queried in parallel, with one Overpass fallback attempt.
export const maxDuration = 60

const querySchema = z.union([
  z.object({ lat: z.coerce.number().min(-90).max(90), lon: z.coerce.number().min(-180).max(180) }),
  z.object({ zip: z.string().regex(/^\d{5}$/) }),
])

// Location never goes in logs or cached responses.
const noStore = { "Cache-Control": "private, no-store" }

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!parsed.success) return NextResponse.json({ error: "Provide a 5-digit ZIP or lat and lon." }, { status: 400, headers: noStore })
  const result = await lookupNeeds(parsed.data)
  return NextResponse.json(result, { status: result.status === "unavailable" ? 502 : 200, headers: noStore })
}
