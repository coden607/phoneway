import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    await request.json()
    return NextResponse.json(
      { available: false, recorded: false, message: "Emergency analytics storage is not configured." },
      { status: 503 },
    )
  } catch {
    console.error("[Analytics] Emergency analytics unavailable")
    return NextResponse.json({ error: "Emergency analytics unavailable" }, { status: 503 })
  }
}
