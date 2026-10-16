"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import { ParticleField } from "@/components/effects/particle-field"
import { HolographicCard } from "@/components/effects/holographic-card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Syringe,
  Battery,
  Wifi,
  Heart,
  Cpu,
  Shield,
  Smartphone,
  DollarSign,
  Package,
  ExternalLink,
  Watch,
  Cog,
  Satellite,
  Lock,
} from "lucide-react"
import Link from "next/link"
import { watchDesignCalculations, watchDesignModel } from "@/lib/watch-design"
import { WATCH_COMPONENTS } from "@/lib/watch-components"
import { EngineeringDrawing } from "@/components/watch/engineering-drawing"
import { Watch3D } from "@/components/watch/watch-3d"
import { OwnerLock } from "@/components/watch/owner-lock"

// =============================================================================
// CANDIDATE BILL OF MATERIALS - supplier and part numbers require confirmation.
// This is a research concept, not a manufacturing-ready or medical-device BOM.
// =============================================================================
const billOfMaterials = [
  {
    category: "Main Processing Unit",
    description: "Main Wear OS platform plus an independent safety microcontroller",
    items: [
      {
        name: "Qualcomm Snapdragon W5+ Gen 2",
        description: "Current Qualcomm wearable platform (announced Aug 2025): 4nm SoC with always-on co-processor, Wear OS support, Location ML 3.0 GNSS and Skylo NB-NTN satellite emergency messaging. Requires a Qualcomm customer agreement; price is an estimate.",
        quantity: 1,
        unitPrice: 26.00,
        supplier: "Qualcomm",
        partNumber: "W5+ Gen 2 (confirm SKU with Qualcomm)",
        datasheet: "qualcomm.com/wearables",
      },
      {
        name: "Nordic nRF5340 Safety MCU",
        description: "Independent low-power microcontroller that keeps sensor sampling and local alarms running if the main OS crashes or reboots. Algorithms on it are unvalidated.",
        quantity: 1,
        unitPrice: 8.50,
        supplier: "Nordic Semiconductor",
        partNumber: "NRF5340-QKAA-R7",
        datasheet: "nordicsemi.com/nRF5340",
      },
      {
        name: "32 GB eMMC 5.1 storage",
        description: "Storage for Wear OS, apps and on-device logs. Wear OS needs far more than the 4 Gbit (512 MB) SPI NAND previously listed. Vendor (Samsung, Kioxia or Micron) to be selected by quote.",
        quantity: 1,
        unitPrice: 6.00,
        supplier: "Samsung / Kioxia / Micron (TBD)",
        partNumber: "TBD (32 GB eMMC 5.1)",
        datasheet: "jedec.org (eMMC 5.1)",
      },
      {
        name: "Micron MT53E512M32D2DS-046",
        description: "2GB LPDDR4X RAM",
        quantity: 1,
        unitPrice: 5.80,
        supplier: "Micron Technology",
        partNumber: "MT53E512M32D2DS-046 WT:A",
        datasheet: "micron.com",
      },
    ],
  },
  {
    category: "Health Sensors (Candidate)",
    description: "Candidate sensor array for research; accuracy and overdose-detection performance are unverified",
    items: [
      {
        name: "Analog Devices MAX86178",
        description: "Optical PPG + ECG + bioimpedance analog front end: heart rate, SpO2 estimate, single-lead ECG and skin-contact detection. Wrist SpO2 accuracy, especially across skin tones, must be validated.",
        quantity: 1,
        unitPrice: 12.50,
        supplier: "Analog Devices (Maxim)",
        partNumber: "MAX86178",
        datasheet: "analog.com/MAX86178",
      },
      {
        name: "Bosch BMP390",
        description: "Barometric pressure sensor for altimeter, elevation tracking, weather",
        quantity: 1,
        unitPrice: 2.80,
        supplier: "Bosch Sensortec",
        partNumber: "BMP390",
        datasheet: "bosch-sensortec.com/BMP390",
      },
      {
        name: "STMicro LSM6DSO32X",
        description: "6-axis IMU (32 g accelerometer + gyroscope) for motion, falls, sleep and motion-artifact rejection in the vitals pipeline",
        quantity: 1,
        unitPrice: 4.20,
        supplier: "STMicroelectronics",
        partNumber: "LSM6DSO32XTR",
        datasheet: "st.com/LSM6DSO32X",
      },
      {
        name: "STMicro LIS2MDL",
        description: "3-axis magnetometer/compass for navigation and GPS assist",
        quantity: 1,
        unitPrice: 1.80,
        supplier: "STMicroelectronics",
        partNumber: "LIS2MDLTR",
        datasheet: "st.com/LIS2MDL",
      },
      {
        name: "Melexis MLX90632",
        description: "candidate non-contact infrared skin-temperature sensor; accuracy depends on the selected variant and requires validation",
        quantity: 1,
        unitPrice: 6.50,
        supplier: "Melexis",
        partNumber: "MLX90632SFE-BAA-000-RE",
        datasheet: "melexis.com/MLX90632",
      },
      {
        name: "ams-OSRAM AS7038RB",
        description: "Candidate secondary biosensor front end for electrodermal/stress research; confirm feature set and long-term availability before committing",
        quantity: 1,
        unitPrice: 3.90,
        supplier: "ams-OSRAM",
        partNumber: "AS7038RB",
        datasheet: "ams-osram.com",
      },
    ],
  },
  {
    category: "Connectivity (5G RedCap + eSIM + satellite SOS)",
    description: "Candidate standalone connectivity; carrier and RF integration are unverified",
    items: [
      {
        name: "Qualcomm Snapdragon X35 (SDX35) 5G RedCap modem",
        description: "5G NR-Light (RedCap) modem with LTE Cat 4 fallback and L1+L5 GNSS, designed for wearables. Carrier certification, antenna design and power budget unverified.",
        quantity: 1,
        unitPrice: 18.00,
        supplier: "Qualcomm",
        partNumber: "SDX35",
        datasheet: "qualcomm.com (Snapdragon X35 product brief)",
      },
      {
        name: "STMicro ST54K NFC Controller",
        description: "NFC for an emergency medical-ID tap and pairing. Contactless payments would need Google Wallet certification; Apple Pay is not available on non-Apple watches.",
        quantity: 1,
        unitPrice: 2.80,
        supplier: "STMicroelectronics",
        partNumber: "ST54K",
        datasheet: "st.com/ST54",
      },
      {
        name: "Infineon CYW43022 Wi-Fi/Bluetooth",
        description: "Candidate low-power Wi-Fi + Bluetooth LE combo for phone pairing and Wi-Fi sync; confirm compatibility with the W5+ Gen 2 reference design",
        quantity: 1,
        unitPrice: 4.80,
        supplier: "Infineon (Cypress)",
        partNumber: "CYW43022KUBG",
        datasheet: "infineon.com/CYW43022",
      },
      {
        name: "STMicro ST4SIM-200M eSIM (eUICC)",
        description: "Embedded SIM for standalone cellular with remote carrier provisioning (GSMA). Replaces the previously listed Thales ELS62, which is a separate LTE module, not an eSIM.",
        quantity: 1,
        unitPrice: 2.50,
        supplier: "STMicroelectronics",
        partNumber: "ST4SIM-200M",
        datasheet: "st.com/ST4SIM",
      },
      {
        name: "Cellular/GNSS/Wi-Fi antenna set (custom)",
        description: "Antennas co-designed with the titanium case (for example by Taoglas or Ignion); a metal case needs dedicated antenna slots or a ceramic/sapphire window",
        quantity: 1,
        unitPrice: 3.20,
        supplier: "Taoglas / Ignion (TBD)",
        partNumber: "TBD (custom)",
        datasheet: "taoglas.com",
      },
    ],
  },
  {
    category: "Sealed Power System (battery + Qi)",
    description: "Battery with sealed Qi charging. Solar, kinetic and thermoelectric harvesters were removed: on a wrist they produce microwatts to a few milliwatts, far below a cellular smartwatch's load, and the listed solar supplier (Alta Devices) shut down in 2019.",
    items: [
      {
        name: "500 mAh Li-ion polymer cell (certified)",
        description: "Custom-shape lithium-polymer cell with protection circuit; must hold IEC 62133-2 and UN38.3 certification. Supplier (e.g. ATL, Amperex, or other wearable-cell maker) to be quoted.",
        quantity: 1,
        unitPrice: 8.50,
        supplier: "Qualified wearable-cell supplier (TBD)",
        partNumber: "TBD (500 mAh)",
        datasheet: "iec.ch (IEC 62133-2)",
      },
      {
        name: "Texas Instruments BQ51013B",
        description: "Qi-compatible wireless charging receiver IC, 5W input",
        quantity: 1,
        unitPrice: 2.80,
        supplier: "Texas Instruments",
        partNumber: "BQ51013BRHLR",
        datasheet: "ti.com/BQ51013B",
      },
      {
        name: "Wurth 760308103 Qi Coil",
        description: "Wireless charging receive coil, 20mm diameter",
        quantity: 1,
        unitPrice: 2.80,
        supplier: "Wurth Elektronik",
        partNumber: "760308103",
        datasheet: "we-online.com",
      },
      {
        name: "Texas Instruments BQ25619",
        description: "Single-cell charger with power path and low quiescent current, fed by the Qi receiver",
        quantity: 1,
        unitPrice: 3.50,
        supplier: "Texas Instruments",
        partNumber: "BQ25619RTWR",
        datasheet: "ti.com/BQ25619",
      },
    ],
  },
  {
    category: "Display, Audio & Haptics",
    description: "Candidate display, audio, and haptic modules; brightness, acoustics, ingress, and reliability require qualification",
    items: [
      {
        name: "1.4–1.5 in round LTPO AMOLED module",
        description: "Round always-on-capable AMOLED with touch; resolution, brightness and price from a supplier quote (e.g. BOE, Samsung Display)",
        quantity: 1,
        unitPrice: 32.00,
        supplier: "BOE / Samsung Display (TBD)",
        partNumber: "TBD (quote)",
        datasheet: "boe.com",
      },
      {
        name: "Knowles SPH0645LM4H-B MEMS Mic",
        description: "Digital I2S MEMS microphone for voice input to Angel AI and calls; behind a waterproof acoustic membrane",
        quantity: 1,
        unitPrice: 1.50,
        supplier: "Knowles Corporation",
        partNumber: "SPH0645LM4H-B",
        datasheet: "knowles.com",
      },
      {
        name: "Micro speaker (sealed, wearable-grade)",
        description: "Waterproof micro speaker for alarms and voice; part selected after measuring alarm loudness in the enclosure",
        quantity: 1,
        unitPrice: 2.20,
        supplier: "AAC Technologies / Knowles (TBD)",
        partNumber: "TBD",
        datasheet: "aactechnologies.com",
      },
      {
        name: "TDK PowerHap 1204H018V",
        description: "Piezoelectric haptic actuator for distinct alert vibration patterns",
        quantity: 1,
        unitPrice: 3.80,
        supplier: "TDK Corporation",
        partNumber: "1204H018V",
        datasheet: "tdk.com/PowerHap",
      },
    ],
  },
  {
    category: "Naloxone Delivery Module (future research only)",
    description: "Research-only concept. A wearable that injects a drug is an FDA-regulated drug-device combination product; nothing here is implemented, tested or approved",
    items: [
      {
        name: "Faulhaber 0206B Micro DC Motor",
        description: "1.9 mm coreless micro motor considered for driving a plunger. Force, speed and reliability for an injection must be proven on a bench before any further design.",
        quantity: 1,
        unitPrice: 28.00,
        supplier: "Faulhaber Group",
        partNumber: "0206B-012-SR",
        datasheet: "faulhaber.com/0206B",
      },
      {
        name: "Needle and insertion mechanism (to be specified)",
        description: "Needle gauge, length and insertion speed must be set by clinical engineering for intramuscular naloxone. The 30-gauge, 4 mm micro-needle previously listed does not match how naloxone is injected. (For reference, the discontinued Evzio auto-injector delivered 2 mg in 0.4 mL.)",
        quantity: 1,
        unitPrice: 15.00,
        supplier: "Medical-device contract manufacturer (TBD)",
        partNumber: "TBD",
        datasheet: "fda.gov (combination products)",
      },
      {
        name: "Naloxone primary container (to be specified)",
        description: "Drug container must come from a licensed drug manufacturer with stability, sterility and shelf-life data; it cannot be filled by NarcoGuard",
        quantity: 1,
        unitPrice: 8.00,
        supplier: "Licensed pharmaceutical partner (TBD)",
        partNumber: "TBD",
        datasheet: "fda.gov",
      },
    ],
  },
  {
    category: "Enclosure, Strap & Modular Assembly",
    description: "Titanium case with controlled-service modules; ingress, durability and skin-contact qualification required",
    items: [
      {
        name: "Grade 5 Titanium (Ti-6Al-4V) Case",
        description: "Candidate CNC Ti-6Al-4V enclosure; coating, ingress protection, pressure rating, and thermal/mechanical performance require qualification",
        quantity: 1,
        unitPrice: 38.00,
        supplier: "Custom CNC (Foxconn Interconnect)",
        partNumber: "NG-CASE-TI6AL4V-R4",
        datasheet: "N/A - Custom",
      },
      {
        name: "Sapphire Crystal Watch Glass",
        description: "Lab-grown sapphire with multi-layer AR coating. 9H hardness, scratch-proof. 46mm diameter, 0.8mm thick",
        quantity: 1,
        unitPrice: 16.00,
        supplier: "Swiss Jewel Company",
        partNumber: "SJ-SAP-46-08",
        datasheet: "swissjewel.com",
      },
      {
        name: "Medical Silicone Sport Strap (w/ Quick-Release)",
        description: "Candidate LSR silicone strap with 22mm interface; biocompatibility, skin contact, washability, and sensor integration require qualification",
        quantity: 1,
        unitPrice: 6.00,
        supplier: "Custom (Shin-Etsu Chemical)",
        partNumber: "NG-STRAP-LSR-22MM",
        datasheet: "shinetsu.com",
      },
      {
        name: "10-Layer HDI PCB Assembly",
        description: "High-density interconnect PCB with all SMD components placed. Rigid-flex design connects main board to sensor boards. Lead-free RoHS",
        quantity: 1,
        unitPrice: 28.00,
        supplier: "JLCPCB / PCBWay",
        partNumber: "NG-PCBA-R4-10L",
        datasheet: "N/A - Custom",
      },
      {
        name: "IP68 Gasket Set (Viton)",
        description: "Candidate fluoroelastomer seals for case back, crown, sensor windows, acoustic membranes, and service bay; compression and chemical compatibility require qualification",
        quantity: 1,
        unitPrice: 3.50,
        supplier: "Parker Hannifin",
        partNumber: "NG-GASKET-VITON-SET",
        datasheet: "parker.com",
      },
      {
        name: "Modular Snap-Fit Connector System",
        description: "Internal pogo-pin service interfaces with keyed alignment; any user-serviceable boundary requires a replaceable gasket and post-service pressure test",
        quantity: 1,
        unitPrice: 4.50,
        supplier: "Mill-Max Manufacturing",
        partNumber: "0906-2-15-20-75-14-11-0",
        datasheet: "mill-max.com",
      },
      {
        name: "Ceramic Case Back w/ Sensor Windows",
        description: "Zirconia ceramic case back with optical windows for PPG/SpO2 sensors and thermal contact pad. Engraved with unique device ID and QR code",
        quantity: 1,
        unitPrice: 12.00,
        supplier: "Custom (CoorsTek)",
        partNumber: "NG-BACK-ZRO2",
        datasheet: "coorstek.com",
      },
    ],
  },
]

// Calculate totals
const calculateBOMTotal = () => {
  let total = 0
  billOfMaterials.forEach((category) => {
    category.items.forEach((item) => {
      total += item.quantity * item.unitPrice
    })
  })
  return total
}

const componentBOMTotal = calculateBOMTotal()
const assemblyLabor = 35.00
const qualityTesting = 25.00
const complianceTesting = 15.00
const packaging = 8.00
const naloxoneRefill = 42.00
const totalPerUnit = componentBOMTotal + assemblyLabor + qualityTesting + complianceTesting + packaging
const totalWithNaloxone = totalPerUnit + naloxoneRefill
const fundingGoal80Units = totalWithNaloxone * 80

const coreLayerMarginsMm2 = watchDesignCalculations.coreLayerMarginsMm2
const coreMinimumLayerMarginMm2 = Math.min(...coreLayerMarginsMm2)
const idealizedRuntimeHours = watchDesignCalculations.idealizedRuntimeHours
const componentCount = billOfMaterials.reduce((sum, category) => sum + category.items.length, 0)
const simulationPanels = [
  {
    label: "Sealed core fit",
    value: "Conditional",
    detail: `${watchDesignModel.coreLayers.length} layered planes; minimum ${coreMinimumLayerMarginMm2} mm² planar margin and ${watchDesignCalculations.coreThicknessMarginMm} mm modeled stack margin. Medication pod is separate.`,
  },
  {
    label: "Power margin",
    value: "Unverified",
    detail: "Battery and load figures are design targets, not measured data",
  },
  {
    label: "BOM integrity",
    value: `${componentCount} parts`,
    detail: `$${componentBOMTotal.toFixed(2)} candidate component subtotal before labor`,
  },
]

export default function NGWatchPage() {
  const goFundMeUrl = process.env.NEXT_PUBLIC_GOFUNDME_URL || "https://gofund.me/9acf270ea"
  const investorUrl = process.env.NEXT_PUBLIC_INVESTOR_CONTACT_URL || "mailto:narcoguard607@gmail.com?subject=NarcoGuard%20investment%20inquiry"
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)

  const watchComponents = WATCH_COMPONENTS

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <ParticleField count={80} />
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-background to-secondary/5" />

      <div className="relative z-10 container mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="outline" className="glass neon-border bg-transparent">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold glow-text text-center">NG | NarcoGuard System Blueprint</h1>
          <a href={goFundMeUrl} target="_blank" rel="noopener noreferrer">
            <Button className="bg-green-500 hover:bg-green-600 text-black font-bold">
              <DollarSign className="w-4 h-4 mr-2" />
              Fund This
            </Button>
          </a>
        </header>

        {/* Hero Product Showcase with New Images */}
        <section className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl overflow-hidden neon-border">
            <Image src="/images/ng-modular-exploded.jpg" alt="Earlier NarcoGuard NG concept render. It still shows a solar cell, a thermoelectric generator and a filled naloxone cartridge, none of which are in the current design." width={1200} height={675} priority className="w-full h-auto object-cover" />
          </div>
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl overflow-hidden neon-border flex-1">
              <Image src="/images/ng-blueprint-detailed.jpg" alt="Stylised blueprint-style illustration of the NarcoGuard NG concept. The figures on it are decorative, not measured dimensions." width={600} height={338} className="w-full h-full object-cover" />
            </div>
            <div className="rounded-2xl overflow-hidden neon-border flex-1">
              <Image src="/images/ng-watch-hero.jpg" alt="NarcoGuard NG watch on wrist showing vital signs display" width={600} height={338} className="w-full h-full object-cover" />
            </div>
          </div>
        </section>

        {/* These renders predate the 2026-10-05 watch-only revision. Saying so in
            view matters more than the alt text: a reader who sees a naloxone
            cartridge should not believe this device delivers a dose today. */}
        <p className="mb-8 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm" role="note">
          <strong>These images are earlier illustrative renders, not the current design.</strong> They still show a solar
          cell, a thermoelectric generator, a micro-dosing motor and a filled naloxone cartridge. All of those were removed
          in the 2026-10-05 review: wrist energy harvesting cannot power this device, and the needle, dose and drug
          container are now unspecified and belong to a future research module that requires clinical and FDA review.
          Figures shown on the blueprint are decorative, not measured dimensions. The parts list below is the current one.
        </p>

        {/* Investor-facing engineering summary */}
        <section className="mb-8 grid grid-cols-1 xl:grid-cols-[1.15fr_.85fr] gap-6">
          <HolographicCard className="p-6" glowIntensity="high">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Investor engineering view</p>
                <h2 className="text-2xl font-bold">Numbered NarcoGuard NG System Diagram</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Callouts correspond to the conceptual diagram and the candidate supplier BOM below.
                </p>
              </div>
              <span className="text-xs font-mono rounded-md border border-primary/40 px-3 py-2 whitespace-nowrap">CONCEPT REV 4.2</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-2">
              {watchComponents.map((component, index) => (
                <button
                  key={component.id}
                  type="button"
                  onClick={() => setSelectedComponent(component.id)}
                  className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-3 text-left hover:border-primary/60 hover:bg-primary/5 transition-colors"
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-black"
                    style={{ backgroundColor: component.color }}
                  >
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{component.name}</span>
                    <span className="block text-xs text-muted-foreground line-clamp-2">{component.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </HolographicCard>

          <div className="space-y-6">
            <HolographicCard className="p-6">
              <h3 className="font-bold text-lg mb-4">Current Candidate Parts</h3>
              <div className="space-y-3 text-sm">
                {[
                  ["Compute", "W5+ Gen 2", "Qualcomm Snapdragon (2025)"],
                  ["Health MCU", "NRF5340-QKAA-R7", "Nordic nRF5340"],
                  ["Vitals AFE", "MAX86178", "Analog Devices / Maxim"],
                  ["Motion", "LSM6DSO32XTR", "STMicroelectronics"],
                  ["Cellular", "SDX35", "Snapdragon X35 5G RedCap"],
                  ["Barometer", "BMP390", "Bosch Sensortec"],
                ].map(([system, part, maker]) => (
                  <div key={part} className="grid grid-cols-[.8fr_1fr] gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <span className="text-muted-foreground">{system}</span>
                    <span><span className="block font-mono text-primary">{part}</span><span className="text-xs">{maker}</span></span>
                  </div>
                ))}
              </div>
            </HolographicCard>

            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
              <p className="font-semibold text-amber-300">Engineering status</p>
              <p className="text-muted-foreground mt-1">
                This page documents a concept design assembled from commercially available parts. Parts, pricing, performance, medical claims, enclosure tolerances, and injection architecture are proposed design targets. Final selections require supplier confirmation, prototyping, clinical validation, regulatory review, and design-for-manufacture testing before any production or medical-use claim is made.
              </p>
              <a href={investorUrl} target="_blank" rel="noopener noreferrer" className="inline-flex mt-3 text-primary font-semibold hover:underline">
                Request the investor technical package <ExternalLink className="w-4 h-4 ml-1" />
              </a>
            </div>
          </div>
        </section>

        {/* Simulation / validation summary */}
        <section className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {simulationPanels.map((panel) => (
            <HolographicCard key={panel.label} className="p-5" glowIntensity="medium">
              <p className="text-xs uppercase tracking-[0.18em] text-primary">{panel.label}</p>
              <p className="mt-2 text-3xl font-bold font-mono">{panel.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{panel.detail}</p>
            </HolographicCard>
          ))}
        </section>

        {/* Funding CTA */}
        <section className="mb-8 p-6 rounded-2xl neon-border bg-linear-to-r from-green-500/20 via-primary/10 to-green-500/20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-balance">80 Watches for Field Evaluation</h2>
              <p className="text-muted-foreground mt-1">Each NarcoGuard NG costs <span className="text-green-400 font-bold">${totalWithNaloxone.toFixed(2)}</span> in the current candidate BOM model. Total planning goal: <span className="text-green-400 font-bold">${fundingGoal80Units.toFixed(2)}</span></p>
            </div>
            <div className="flex gap-3">
              <a href={goFundMeUrl} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-green-500 hover:bg-green-600 text-black font-bold">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Donate Now
                </Button>
              </a>
              <a href={investorUrl} target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="neon-border bg-transparent">
                  Partner With Us
                </Button>
              </a>
            </div>
          </div>
        </section>

        <Tabs defaultValue="blueprint" className="gap-8">
          <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-5 glass neon-border">
            <TabsTrigger value="blueprint">Blueprint</TabsTrigger>
            <TabsTrigger value="3d-view">3D View</TabsTrigger>
            <TabsTrigger value="bom">Bill of Materials</TabsTrigger>
            <TabsTrigger value="specs">Full Specifications</TabsTrigger>
            <TabsTrigger value="owner-lock">Owner Lock</TabsTrigger>
          </TabsList>

          {/* Interactive Blueprint - DEFAULT TAB */}
          <TabsContent value="blueprint">
            <HolographicCard className="p-6" glowIntensity="medium">
              <h2 className="text-xl font-bold mb-2 text-center">Engineering Drawing — NarcoGuard NG Rev 4.2</h2>
              <EngineeringDrawing selected={selectedComponent} onSelect={setSelectedComponent} />

              {selectedComponent && (
                <div className="mt-6 p-4 rounded-lg bg-background/50 neon-border max-w-lg mx-auto">
                  {watchComponents
                    .filter((c) => c.id === selectedComponent)
                    .map((comp) => (
                      <div key={comp.id}>
                        <h3 className="font-bold text-lg" style={{ color: comp.color }}>{comp.name}</h3>
                        <p className="text-sm text-muted-foreground mt-2">{comp.description}</p>
                      </div>
                    ))}
                </div>
              )}

                <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {watchComponents.map((comp, index) => (
                  <button
                    key={comp.id}
                    className={`flex items-center gap-2 p-2 rounded text-left transition-all ${
                      selectedComponent === comp.id ? "bg-primary/20 ring-1 ring-primary/50" : "hover:bg-background/50"
                    }`}
                    onClick={() => setSelectedComponent(selectedComponent === comp.id ? null : comp.id)}
                  >
                    <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-black" style={{ backgroundColor: comp.color }}>{index + 1}</div>
                    <span className="text-[11px] leading-tight">{comp.name}</span>
                  </button>
                ))}
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-primary">Core fit margin</p>
                  <p className="mt-1 text-sm text-muted-foreground">Layered core minimum: {coreMinimumLayerMarginMm2} mm² planar margin; modeled stack margin: {watchDesignCalculations.coreThicknessMarginMm} mm. CAD interference and tolerances remain required.</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-primary">Power balance</p>
                  <p className="mt-1 text-sm text-muted-foreground">Battery life and load balance are unverified until measured on a populated prototype.</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-primary">Runtime model</p>
                  <p className="mt-1 text-sm text-muted-foreground">Idealized energy-only estimate: {idealizedRuntimeHours} hours; radio bursts, conversion losses, temperature, battery aging, and safety reserve are not modeled.</p>
                </div>
              </div>
            </HolographicCard>
          </TabsContent>

          {/* 3D Interactive View */}
          <TabsContent value="3d-view">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HolographicCard className="p-6" glowIntensity="high">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Watch className="w-5 h-5 text-primary" />
                  Interactive 3D Model (to scale)
                </h2>

                <Watch3D selected={selectedComponent} onSelect={setSelectedComponent} />
                {selectedComponent && (
                  <div className="mt-4 rounded-lg border border-primary/40 bg-background/50 p-4" aria-live="polite">
                    {watchComponents.filter((c) => c.id === selectedComponent).map((comp) => (
                      <div key={comp.id}>
                        <h3 className="font-bold" style={{ color: comp.color }}>{comp.name}</h3>
                        <p className="text-xs font-mono text-primary mt-1">{comp.partNumber}</p>
                        <p className="text-sm text-muted-foreground mt-2">{comp.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </HolographicCard>

              <div className="space-y-4">
                <HolographicCard className="p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-500" />
                    What would set NG apart (targets)
                  </h3>
                  <div className="space-y-3">
                    {[
                      { icon: Syringe, color: "text-red-500", title: "Proposed Naloxone Delivery", desc: "No production watch currently offers this validated capability" },
                      { icon: Satellite, color: "text-green-500", title: "Satellite SOS", desc: "W5+ Gen 2 platform supports satellite emergency messaging where carriers enable it" },
                      { icon: Cog, color: "text-purple-400", title: "Fully Modular", desc: "Modules are replaceable only through a controlled service procedure; every opened seal requires replacement and pressure retest." },
                      { icon: Heart, color: "text-pink-500", title: "Candidate Sensors", desc: "PPG + SpO2 + ECG + motion + skin temperature; overdose detection from the wrist is unproven" },
                      { icon: Cpu, color: "text-blue-400", title: "Candidate Processing", desc: "Wearable compute architecture; firmware and clinical performance unverified" },
                      ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                        <feature.icon className={`w-5 h-5 ${feature.color} shrink-0`} />
                        <div>
                          <p className="font-semibold text-sm">{feature.title}</p>
                          <p className="text-xs text-muted-foreground">{feature.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </HolographicCard>

                <HolographicCard className="p-6 bg-linear-to-r from-green-500/10 to-primary/10">
                  <h3 className="font-bold text-lg mb-2">Unit Cost Breakdown</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Components ({billOfMaterials.reduce((n, c) => n + c.items.length, 0)} parts)</span><span className="font-mono">${componentBOMTotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Assembly Labor</span><span className="font-mono">${assemblyLabor.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>QA/Testing (10-point)</span><span className="font-mono">${qualityTesting.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Compliance testing allocation (excludes FDA submission costs)</span><span className="font-mono">${complianceTesting.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Packaging + Charger</span><span className="font-mono">${packaging.toFixed(2)}</span></div>
                    <div className="border-t border-primary/30 pt-2 flex justify-between font-bold">
                      <span>Hardware Total</span>
                      <span className="font-mono text-primary">${totalPerUnit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>+ Naloxone Cartridge (0.4mg)</span>
                      <span className="font-mono">${naloxoneRefill.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-primary/30 pt-2 flex justify-between font-bold text-lg">
                      <span>Complete Unit</span>
                      <span className="font-mono text-green-500">${totalWithNaloxone.toFixed(2)}</span>
                    </div>
                    <div className="p-3 bg-green-500/10 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">80 units for Broome County pilot</p>
                      <p className="text-xl font-bold text-green-400">${fundingGoal80Units.toFixed(2)}</p>
                    </div>
                  </div>
                </HolographicCard>
              </div>
            </div>
          </TabsContent>

          {/* Bill of Materials */}
          <TabsContent value="bom">
            <div className="space-y-6">
              {billOfMaterials.map((category, catIndex) => (
                <HolographicCard key={catIndex} className="p-6">
                  <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    {category.category}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">{category.description}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-primary/30">
                          <th className="text-left py-2">Component</th>
                          <th className="text-left py-2 hidden lg:table-cell">Description</th>
                          <th className="text-left py-2 hidden md:table-cell">Supplier</th>
                          <th className="text-center py-2">Qty</th>
                          <th className="text-right py-2">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {category.items.map((item, i) => (
                          <tr key={i} className="border-b border-background/50 hover:bg-background/30">
                            <td className="py-3">
                              <p className="font-medium">{item.name}</p>
                              <p className="text-xs text-primary font-mono">{item.partNumber}</p>
                              <p className="text-xs text-muted-foreground lg:hidden mt-1">{item.description}</p>
                            </td>
                            <td className="py-3 hidden lg:table-cell text-muted-foreground text-xs">{item.description}</td>
                            <td className="py-3 hidden md:table-cell text-xs">{item.supplier}</td>
                            <td className="py-3 text-center">{item.quantity}</td>
                            <td className="py-3 text-right font-mono font-bold">${item.unitPrice.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{category.items.length} components</span>
                    <span className="font-mono font-bold text-primary">
                      ${category.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2)}
                    </span>
                  </div>
                </HolographicCard>
              ))}

              {/* Grand Total */}
              <HolographicCard className="p-6 bg-linear-to-r from-green-500/20 to-primary/20" glowIntensity="high">
                <h3 className="text-xl font-bold mb-4">Prototype Cost Summary - NarcoGuard NG</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-4 rounded-lg bg-background/50">
                    <p className="text-xs text-muted-foreground">Components</p>
                    <p className="text-xl font-bold font-mono">${componentBOMTotal.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">{billOfMaterials.reduce((n, c) => n + c.items.length, 0)} parts</p>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50">
                    <p className="text-xs text-muted-foreground">Labor</p>
                    <p className="text-xl font-bold font-mono">${assemblyLabor.toFixed(2)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50">
                    <p className="text-xs text-muted-foreground">QA + compliance</p>
                    <p className="text-xl font-bold font-mono">${(qualityTesting + complianceTesting).toFixed(2)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50">
                    <p className="text-xs text-muted-foreground">Packaging</p>
                    <p className="text-xl font-bold font-mono">${packaging.toFixed(2)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/20 neon-border">
                    <p className="text-xs text-muted-foreground">Per Unit Total</p>
                    <p className="text-xl font-bold font-mono text-green-500">${totalWithNaloxone.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">incl. naloxone</p>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-lg bg-background/30">
                  <h4 className="font-bold mb-2">Funding Goal: 80 Watches for Broome County Pilot</h4>
                  <div className="flex items-center justify-between">
                    <span>80 units x ${totalWithNaloxone.toFixed(2)}</span>
                    <span className="text-2xl font-bold text-green-500">${fundingGoal80Units.toFixed(2)}</span>
                  </div>
                  <a href={goFundMeUrl} target="_blank" rel="noopener noreferrer" className="block mt-4">
                    <Button className="w-full bg-green-500 hover:bg-green-600 text-black font-bold" size="lg">
                      <DollarSign className="w-5 h-5 mr-2" />
                      Support This Project on GoFundMe
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </a>
                </div>
              </HolographicCard>
            </div>
          </TabsContent>

          {/* Technical Specifications */}
          <TabsContent value="owner-lock">
            <HolographicCard className="p-6" glowIntensity="medium">
              <OwnerLock />
            </HolographicCard>
          </TabsContent>

          <TabsContent value="specs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  icon: Cpu, color: "text-primary", title: "Processing & Memory",
                  specs: [
                    ["Primary SoC", "Qualcomm Snapdragon W5+ Gen 2 (4nm, 2025)"],
                    ["Always-on", "Platform co-processor for low-power sensing"],
                    ["Safety MCU", "Nordic nRF5340 (independent alarm path)"],
                    ["RAM", "2GB LPDDR4X"],
                    ["Storage", "32GB eMMC 5.1"],
                    ["OS", "Wear OS (NarcoGuard app not yet written)"],
                  ]
                },
                {
                  icon: Heart, color: "text-red-500", title: "Health Sensors (candidate)",
                  specs: [
                    ["Optical PPG", "Analog Devices MAX86178 (accuracy to be measured)"],
                    ["ECG", "Single-lead electrocardiogram (on-demand)"],
                    ["SpO2", "Wrist estimate; accuracy across skin tones must be validated"],
                    ["BioZ", "Body impedance analysis (hydration, composition)"],
                    ["Skin Temperature", "Melexis MLX90632 IR (trend only)"],
                    ["EDA (research)", "ams-OSRAM AS7038RB candidate"],
                    ["Motion", "STMicro LSM6DSO32X 6-axis IMU (32g)"],
                    ["Compass", "STMicro LIS2MDL 3-axis magnetometer"],
                    ["Barometer", "Bosch BMP390 (altitude, weather)"],
                    ["Fall Detection", "Planned; algorithm not written"],
                  ]
                },
                {
                  icon: Wifi, color: "text-cyan-400", title: "Connectivity",
                  specs: [
                    ["Cellular", "Snapdragon X35 5G RedCap + LTE fallback; carrier certification unverified"],
                    ["eSIM", "STMicro ST4SIM-200M eUICC; carrier support unverified"],
                    ["Satellite", "SOS messaging via W5+ Gen 2 (Skylo NB-NTN) where available"],
                    ["Wi-Fi", "Infineon CYW43022 candidate; Wi-Fi standard and RF integration unverified"],
                    ["Bluetooth", "Bluetooth LE (version per final radio)"],
                    ["GNSS", "Platform/modem GNSS (L1+L5 capable); no separate chip"],
                    ["NFC", "STMicro ST54K (emergency ID; payments need certification)"],
                  ]
                },
                {
                  icon: Battery, color: "text-green-500", title: "Candidate Sealed Power System",
                  specs: [
                    ["Battery", "500mAh Li-ion polymer, IEC 62133-2 / UN38.3 certified cell required"],
                    ["Battery Life", "Unknown until measured; cellular watches typically need daily charging"],
                    ["Energy harvesting", "Removed: wrist harvesters cannot power a cellular watch"],
                    ["Wireless Charging", "Qi (TI BQ51013B, 5W)"],
                    ["Charging boundary", "No external USB-C port; sealed Qi charging target"],
                    ["Low-battery mode", "Target: keep alarms and SOS working; duration to be measured"],
                  ]
                },
                {
                  icon: Syringe, color: "text-red-500", title: "Naloxone Delivery (future research)",
                  specs: [
                    ["Status", "Not built, not tested, not approved"],
                    ["Regulation", "FDA drug-device combination product (approval required)"],
                    ["Dose & route", "To be set by clinicians (prior auto-injector: 2 mg / 0.4 mL IM or SC)"],
                    ["Needle", "Gauge and length to be specified for intramuscular delivery"],
                    ["Drug supply", "Licensed pharmaceutical partner with stability data"],
                    ["Actuator", "Faulhaber 0206B candidate; force and reliability unproven"],
                    ["Trigger", "Would require validated detection plus a person-confirmable cancel"],
                  ]
                },
                {
                  icon: Smartphone, color: "text-blue-500", title: "Display, Audio & Haptics",
                  specs: [
                    ["Display", "1.4–1.5 in round LTPO AMOLED (supplier quote pending)"],
                    ["Always-On", "Target, with low-power refresh"],
                    ["Glass", "Lab-grown sapphire crystal (9H)"],
                    ["Touch", "Capacitive touch"],
                    ["Speaker", "Sealed micro speaker; alarm loudness to be measured"],
                    ["Microphone", "Knowles SPH0645 MEMS (voice for Angel AI)"],
                    ["Haptics", "TDK PowerHap 1204H piezoelectric"],
                  ]
                },
                {
                  icon: Shield, color: "text-amber-400", title: "Physical & Durability",
                  specs: [
                    ["Case", "Grade 5 Titanium (Ti-6Al-4V) + PVD"],
                    ["Back", "Zirconia ceramic with sensor windows"],
                    ["Dimensions", "Target 46mm case, about 14mm thick (CAD pending)"],
                    ["Weight", "Unknown until a prototype is built"],
                    ["Water Rating", "Target IP68/ISO 22810; qualification unverified"],
                    ["Temp Range", "Target -20C to +55C (untested)"],
                    ["Strap", "22mm quick-release candidate silicone; biocompatibility and ingress effects unverified"],
                    ["Gaskets", "Fluoroelastomer (FKM) seals, supplier TBD"],
                    ["Modular Parts", "Battery, strap, glass; service seals require post-service pressure testing"],
                  ]
                },
                {
                  icon: Lock, color: "text-amber-400", title: "Security & Privacy (targets)",
                  specs: [
                    ["Screen lock", "PIN/pattern via Wear OS"],
                    ["Encryption", "Target: encrypted storage via the platform; not yet verified"],
                    ["Health privacy", "Privacy and security review required; no HIPAA claim is made"],
                    ["Lost device", "Target: remote lock/erase; not implemented"],
                    ["Device ID", "Serial number + device certificate (target)"],
                  ]
                },
              ].map((section, idx) => (
                <HolographicCard key={idx} className="p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <section.icon className={`w-5 h-5 ${section.color}`} />
                    {section.title}
                  </h3>
                  <div className="space-y-2 text-sm">
                    {section.specs.map(([label, value], i) => (
                      <div key={i} className="flex justify-between py-1.5 border-b border-background/50">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium text-right max-w-[55%]">{value}</span>
                      </div>
                    ))}
                  </div>
                </HolographicCard>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
