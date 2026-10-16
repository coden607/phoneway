import { NextResponse } from "next/server"
import { z } from "zod"

const locationSchema = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), accuracy: z.number().nonnegative().max(100000).optional() })

export async function POST(request: Request) {
  try {
    locationSchema.parse(await request.json())

    return NextResponse.json({
      available: false,
      persisted: false,
      message: "No authenticated location provider is configured; location was not stored.",
    }, { status: 503 })
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: status === 400 ? "Invalid location" : "Failed to update location" }, { status })
  }
}

export async function GET() {
  return NextResponse.json({ available: false, source: "unavailable", message: "No verified location-data provider is configured.", nearbyHeroes: [], naloxoneLocations: [], hospitals: [] }, { status: 503 })
}
