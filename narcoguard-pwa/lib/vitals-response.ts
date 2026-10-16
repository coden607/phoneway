import type { OverdoseCheck, VitalSigns } from "@/lib/hooks/use-vitals"

export type VitalsResult =
  | { status: "live"; vitals: VitalSigns; overdoseCheck: OverdoseCheck | null }
  | { status: "unavailable"; message: string }
  | { status: "error"; message: string }

const UNAVAILABLE_FALLBACK = "No verified wearable sensor connection is configured."

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null

const isVitals = (value: unknown): value is VitalSigns =>
  isObject(value) &&
  ["heartRate", "spO2", "temperature", "respiratoryRate", "bloodPressureSystolic", "bloodPressureDiastolic", "timestamp"].every(
    (key) => typeof value[key] === "number" && Number.isFinite(value[key]),
  )

/**
 * Interpret a /api/vitals response. "unavailable" means the server explicitly reported that no
 * verified sensor provider is configured, which is a stable state rather than a transient failure.
 * Anything else that does not carry complete numeric vitals is an error; readings are never guessed.
 */
export function interpretVitalsResponse(ok: boolean, body: unknown): VitalsResult {
  if (isObject(body) && body.available === false) {
    return { status: "unavailable", message: typeof body.message === "string" && body.message ? body.message : UNAVAILABLE_FALLBACK }
  }
  if (!ok) return { status: "error", message: "Vitals could not be loaded." }
  if (!isObject(body) || !isVitals(body.vitals)) return { status: "error", message: "Vitals response was incomplete." }
  return { status: "live", vitals: body.vitals, overdoseCheck: isObject(body.overdoseCheck) ? (body.overdoseCheck as unknown as OverdoseCheck) : null }
}
