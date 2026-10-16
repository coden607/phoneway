// Numbered callouts shared by the engineering drawing, the 3D model and the component legend on
// /watch. Part numbers are candidates that still need supplier confirmation.

export interface WatchComponent {
  id: string
  name: string
  partNumber: string
  color: string
  description: string
}

export const WATCH_COMPONENTS: readonly WatchComponent[] = [
  { id: "snapdragon", name: "Snapdragon W5+ Gen 2", partNumber: "W5+ Gen 2 (SKU TBD)", color: "#FF4136", description: "Qualcomm's current wearable platform (2025): 4nm, Wear OS, always-on co-processor, GNSS and satellite SOS messaging. NarcoGuard firmware does not exist yet." },
  { id: "nordic", name: "nRF5340 Safety MCU", partNumber: "NRF5340-QKAA-R7", color: "#FF851B", description: "Independent microcontroller intended to keep sensing and local alarms running if the main OS fails; firmware not written." },
  { id: "display", name: '1.45" LTPO AMOLED', partNumber: "466×466 LTPO (vendor TBD)", color: "#FFDC00", description: "466x466 round display, 1-120Hz adaptive. Always-on mode would show status without waking the main processor. Brightness and vendor are unconfirmed." },
  { id: "ppg-ecg", name: "MAX86178 PPG+ECG+BioZ", partNumber: "MAX86178", color: "#FF69B4", description: "Optical + electrical front end: heart rate, SpO2 estimate, single-lead ECG and skin contact. Wrist accuracy for overdose detection is unproven." },
  { id: "naloxone", name: "Naloxone Module (research)", partNumber: "Not specified", color: "#FF0000", description: "Future research only: drug container, needle and actuator would need clinical engineering, a pharmaceutical partner and FDA review. Not functional." },
  { id: "battery", name: "500mAh Li-ion + Qi Charging", partNumber: "500 mAh cell (TBD)", color: "#7FDBFF", description: "Certified cell with sealed Qi charging; runtime must be measured on a prototype." },
  { id: "cellular", name: "5G RedCap + eSIM", partNumber: "SDX35 + ST4SIM-200M", color: "#39CCCC", description: "Snapdragon X35 RedCap modem with LTE fallback and an ST4SIM eSIM; carrier certification and antenna performance unverified." },
  { id: "gps", name: "GNSS + Satellite SOS", partNumber: "Platform GNSS + LDS antenna", color: "#01FF70", description: "Location from the platform/modem GNSS (no separate chip); satellite SOS via the W5+ Gen 2 platform. Field accuracy unverified." },
  { id: "crown", name: "Crown + SOS Button", partNumber: "Custom crown + seal + switch", color: "#AAAAAA", description: "Physical button to start a manual SOS or cancel a false alarm; sealing and press force require qualification." },
  { id: "sealed-charge", name: "Sealed Qi / Service Boundary", partNumber: "Qi receiver coil (TBD)", color: "#FFFFFF", description: "No external charging opening; Qi charging and gasketed internal service access are design targets." },
  { id: "nfc", name: "NFC + secure element", partNumber: "ST54K", color: "#0074D9", description: "STMicro ST54K: NFC for an opt-in emergency medical-ID tap and pairing, plus the embedded secure element that holds the watch's private key and its owner record for the owner lock. Secure-element firmware is not written yet." },
]

export const calloutNumber = (id: string) => WATCH_COMPONENTS.findIndex((component) => component.id === id) + 1
