import { watchDesignModel } from "@/lib/watch-design"

// Concept geometry for the drawing and the 3D model, in millimetres. Axes: x toward 3 o'clock,
// y toward 12 o'clock, z up from the case back. Sizes come from the design model and from public
// package dimensions; positions are a proposed layout, not CAD, and the open issues below are real.

export interface Box {
  id: string
  label: string
  /** Callout id from WATCH_COMPONENTS, when the part has one. */
  callout?: string
  x: number
  y: number
  z: number
  w: number
  d: number
  h: number
  /** Hidden from the plan view (on the board underside or below the board). */
  hidden?: boolean
}

const designModule = (label: string) => {
  const found = [...watchDesignModel.placement].find((entry) => entry.label === label)
  if (!found) throw new Error(`Unknown design module ${label}`)
  return found
}

const caseRadius = watchDesignModel.caseDiameterMm / 2
/** Radius of the usable internal area (1250 mm² → about Ø39.9 mm). */
const internalRadius = Math.round(Math.sqrt(watchDesignModel.usableInternalPlanarAreaMm2 / Math.PI) * 100) / 100
/** 1.45" diagonal of a round panel. */
const displayDiameter = Math.round(1.45 * 25.4 * 10) / 10
const clearance = watchDesignModel.interLayerClearanceMm

const soc = designModule("SoC + co-processor")
const connectivity = designModule("Connectivity stack")
const battery = designModule("Battery cell")
const pod = watchDesignModel.medicationPod

/** Layer stack from the case back up, matching the model's core layers plus case back and crystal. */
export const LAYERS = (() => {
  const caseBack = { id: "case-back", label: "Case back, optical window, Qi coil", z0: 0, z1: 1.4 }
  const batteryPlane = { id: "battery", label: "Battery plane", z0: caseBack.z1 + clearance, z1: caseBack.z1 + clearance + watchDesignModel.coreLayers[2].maximumHeightMm }
  const computePlane = { id: "compute", label: "Main board and components", z0: batteryPlane.z1 + clearance, z1: batteryPlane.z1 + clearance + watchDesignModel.coreLayers[1].maximumHeightMm }
  const displayPlane = { id: "display", label: `Display module (Ø${displayDiameter} mm panel)`, z0: computePlane.z1 + clearance, z1: computePlane.z1 + clearance + watchDesignModel.coreLayers[0].maximumHeightMm }
  const crystal = { id: "crystal", label: "Sapphire crystal", z0: displayPlane.z1, z1: watchDesignModel.caseThicknessMm }
  return [caseBack, batteryPlane, computePlane, displayPlane, crystal].map((layer) => ({ ...layer, z0: round(layer.z0), z1: round(layer.z1) }))
})()

function round(value: number) {
  return Math.round(value * 100) / 100
}

const layer = (id: string) => LAYERS.find((entry) => entry.id === id)!
const pcbTop = layer("compute").z0 + 0.8

/** Lug and pod envelope; the medication pod sits in the 6 o'clock lug behind its own seal. */
export const ENVELOPE = {
  caseRadius,
  internalRadius,
  displayDiameter,
  caseThickness: watchDesignModel.caseThicknessMm,
  strapWidth: 22,
  topLug: { y0: caseRadius - 2, y1: caseRadius + 6, z0: 4, z1: 11 },
  podLug: { y0: -(caseRadius + pod.module.heightMm + 2), y1: -(caseRadius - 2), z0: 0, z1: pod.targetMaximumHeightMm + 1 },
  crown: { x0: caseRadius - 0.5, x1: caseRadius + 4.5, radius: 2.6, z: 7.5 },
  opticalWindowDiameter: 12,
  qiCoil: { inner: 18, outer: 30 },
} as const

export const PARTS: readonly Box[] = [
  { id: "pcb", label: "Main board (HDI, 0.8 mm target)", x: 0, y: 0, z: layer("compute").z0, w: internalRadius * 2, d: internalRadius * 2, h: 0.8 },
  { id: "soc", label: "SoC + co-processor", callout: "snapdragon", x: -5.5, y: -1, z: pcbTop, w: soc.widthMm, d: soc.heightMm, h: 1.2 },
  { id: "connectivity", label: "Connectivity stack", callout: "cellular", x: 11, y: 0, z: pcbTop, w: connectivity.heightMm, d: connectivity.widthMm, h: 1.2 },
  { id: "mcu", label: "nRF5340 (aQFN94 7×7)", callout: "nordic", x: -3, y: 12, z: pcbTop, w: 7, d: 7, h: 0.9 },
  { id: "imu", label: "LSM6DSO32X (LGA-14 2.5×3)", x: 5, y: -13, z: pcbTop, w: 2.5, d: 3, h: 0.86 },
  { id: "baro", label: "BMP390 (LGA-10 2×2)", x: 9, y: -12, z: pcbTop, w: 2, d: 2, h: 0.75 },
  { id: "nfc", label: "ST54K NFC controller", callout: "nfc", x: -6, y: -14.5, z: pcbTop, w: 4.5, d: 4.5, h: 0.6 },
  { id: "emmc", label: "eMMC 32 GB (11.5×13), board underside", x: -5.5, y: -1, z: layer("compute").z0 - 0.6, w: 11.5, d: 13, h: 0.6, hidden: true },
  { id: "battery", label: `Battery ${battery.widthMm}×${battery.heightMm}×${watchDesignModel.coreLayers[2].maximumHeightMm} mm`, callout: "battery", x: 0, y: 0, z: layer("battery").z0, w: battery.widthMm, d: battery.heightMm, h: watchDesignModel.coreLayers[2].maximumHeightMm, hidden: true },
  { id: "sensor-flex", label: "Optical sensor flex (MAX86178, LEDs, photodiodes)", callout: "ppg-ecg", x: 0, y: 0, z: layer("case-back").z1 - 0.5, w: 16, d: 16, h: 0.5, hidden: true },
  { id: "pod", label: `Medication pod ${pod.module.widthMm}×${pod.module.heightMm}×${pod.targetMaximumHeightMm} mm (research)`, callout: "naloxone", x: 0, y: -(caseRadius + pod.module.heightMm / 2 - 1), z: 0.5, w: pod.module.widthMm, d: pod.module.heightMm, h: pod.targetMaximumHeightMm },
]

export const ANTENNAS = [
  { id: "gnss", label: "GNSS/satellite LDS antenna", callout: "gps", from: 55, to: 125 },
  { id: "cellular", label: "Cellular LDS antenna", callout: "cellular", from: 215, to: 325 },
  { id: "nfc", label: "NFC loop", callout: "nfc", from: 150, to: 205 },
] as const

/** Parts that intrude past the internal radius in plan, which a real layout must not allow. */
export function planInterferences(parts: readonly Box[] = PARTS, radius = internalRadius) {
  return parts
    .filter((part) => part.id !== "pcb" && part.id !== "pod")
    .filter((part) => {
      const corners = [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sy]) => Math.hypot(part.x + (sx * part.w) / 2, part.y + (sy * part.d) / 2))
      return Math.max(...corners) > radius + 1e-9
    })
    .map((part) => part.id)
}

export const OPEN_ISSUES = [
  `Display envelope: a 1.45" round panel is Ø${displayDiameter} mm, but the planar model still budgets 31×31 mm. Reconcile in CAD.`,
  "Planar budget is over-allocated in the design model (see the sealed-core fit check); the layout above stacks modules to fit.",
  `The eMMC sits under the board in the ${clearance} mm battery clearance; package height and swelling allowance need verification.`,
  "Medication pod is a separate sealed lug module; actuator, needle path and drug stability are unspecified research items.",
  "Antenna keep-outs, thermal paths and drop/ingress performance are not yet simulated.",
] as const
