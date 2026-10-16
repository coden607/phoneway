// Parsers for standard Bluetooth GATT health measurements, so readings from consumer heart-rate
// straps, watches and pulse oximeters can be shown live. These are readings, not overdose detection:
// consumer devices are not validated for that, and nothing here triggers an alert.
//
// Specs: Heart Rate Service 0x180D / Heart Rate Measurement 0x2A37; Pulse Oximeter Service 0x1822 /
// PLX Spot-Check 0x2A5E and PLX Continuous 0x2A5F (Bluetooth SIG GATT Specification Supplement).

export const HEART_RATE_SERVICE = 0x180d
export const HEART_RATE_MEASUREMENT = 0x2a37
export const PULSE_OXIMETER_SERVICE = 0x1822
export const PLX_SPOT_CHECK = 0x2a5e
export const PLX_CONTINUOUS = 0x2a5f

/** Readings outside these ranges are treated as sensor errors and dropped, never shown. */
export const PLAUSIBLE = { heartRate: [20, 250], spO2: [50, 100] } as const

export interface HeartRateReading {
  heartRate: number
  /** undefined when the device does not report skin contact. */
  contactDetected?: boolean
  rrIntervalsMs: number[]
}

export interface OximeterReading {
  spO2: number
  pulseRate?: number
}

/** Decodes an IEEE-11073 16-bit SFLOAT. Returns undefined for NaN, NRes, ±infinity and reserved values. */
export function readSfloat(view: DataView, offset: number): number | undefined {
  const raw = view.getUint16(offset, true)
  if (raw === 0x07ff || raw === 0x0800 || raw === 0x07fe || raw === 0x0802 || raw === 0x0801) return undefined
  let mantissa = raw & 0x0fff
  let exponent = raw >> 12
  if (mantissa >= 0x0800) mantissa -= 0x1000
  if (exponent >= 0x8) exponent -= 0x10
  return Math.round(mantissa * 10 ** exponent * 100) / 100
}

const inRange = (value: number | undefined, [min, max]: readonly [number, number]) =>
  value !== undefined && Number.isFinite(value) && value >= min && value <= max

export function parseHeartRateMeasurement(view: DataView): HeartRateReading | undefined {
  if (view.byteLength < 2) return undefined
  const flags = view.getUint8(0)
  const wide = (flags & 0x01) !== 0
  if (view.byteLength < (wide ? 3 : 2)) return undefined
  let offset = 1
  const heartRate = wide ? view.getUint16(offset, true) : view.getUint8(offset)
  offset += wide ? 2 : 1
  const contactSupported = (flags & 0x04) !== 0
  const contactDetected = contactSupported ? (flags & 0x02) !== 0 : undefined
  if (flags & 0x08) offset += 2 // energy expended
  const rrIntervalsMs: number[] = []
  if (flags & 0x10) {
    for (; offset + 1 < view.byteLength; offset += 2) rrIntervalsMs.push(Math.round((view.getUint16(offset, true) / 1024) * 1000))
  }
  if (contactDetected === false || !inRange(heartRate, PLAUSIBLE.heartRate)) return undefined
  return { heartRate, ...(contactDetected !== undefined ? { contactDetected } : {}), rrIntervalsMs }
}

/** Parses PLX Spot-Check (0x2A5E) or Continuous (0x2A5F); both start with flags, SpO2, pulse rate. */
export function parsePlxMeasurement(view: DataView): OximeterReading | undefined {
  if (view.byteLength < 5) return undefined
  const spO2 = readSfloat(view, 1)
  const pulseRate = readSfloat(view, 3)
  if (!inRange(spO2, PLAUSIBLE.spO2)) return undefined
  return { spO2: spO2 as number, ...(inRange(pulseRate, PLAUSIBLE.heartRate) ? { pulseRate: pulseRate as number } : {}) }
}

/** A reading older than this is shown as stale instead of current. */
export const STALE_AFTER_MS = 10_000

export function isStale(lastReadingAt: number | undefined, now: number): boolean {
  return lastReadingAt === undefined || now - lastReadingAt > STALE_AFTER_MS
}
