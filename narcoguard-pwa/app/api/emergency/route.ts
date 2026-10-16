import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    await request.json()

    return NextResponse.json({ available: false, dispatched: false, message: "No emergency-dispatch provider is configured. Call 911 for immediate help." }, { status: 503 })
  } catch {
    return NextResponse.json({ error: "Failed to process emergency" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json(
    { available: false, emergencies: [], message: "Emergency status is unavailable until an authenticated provider is configured." },
    { status: 503 },
  )
}
