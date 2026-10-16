import { NextResponse } from "next/server"
import { z } from "zod"

const readingsSchema = z.array(z.object({ type: z.enum(["ppg", "ecg", "accelerometer", "thermometer", "oximeter"]), value: z.number(), unit: z.string().min(1).max(20), confidence: z.number().min(0).max(1), timestamp: z.number().default(() => Date.now()) })).min(1).max(100)

export async function GET() {
  return NextResponse.json({ available: false, source: "unavailable", message: "No verified wearable sensor connection is configured.", timestamp: Date.now() }, { status: 503 })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    readingsSchema.parse(body?.readings)

    return NextResponse.json({
      available: false,
      processed: false,
      message: "No authenticated wearable ingest provider is configured; readings were not processed.",
    }, { status: 503 })

  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: status === 400 ? "Invalid sensor readings" : "Failed to process vitals" }, { status })
  }
}
