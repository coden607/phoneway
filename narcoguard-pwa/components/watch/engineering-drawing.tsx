"use client"

import { useRef } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WATCH_COMPONENTS, calloutNumber } from "@/lib/watch-components"
import { ANTENNAS, ENVELOPE, LAYERS, OPEN_ISSUES, PARTS, type Box } from "@/lib/watch-geometry"

// A to-scale concept drawing generated from lib/watch-geometry.ts. Units are millimetres on an
// A4-landscape sheet (297 × 210), so the SVG prints and downloads at true drawing scale.

const SHEET = { w: 297, h: 210 }
const PLAN = { cx: 72, cy: 94, s: 1.5 }
const SECTION = { x0: 135, z0: 96, s: 2.3, yMax: ENVELOPE.topLug.y1 }

const C = {
  paper: "#0b2a4a",
  grid: "#123a63",
  line: "#e6f1ff",
  faint: "#9fb8d6",
  accent: "#7dd3fc",
  board: "#1f6f4a",
  copper: "#d08b4b",
  glass: "#9fd8ff",
  battery: "#5b7fa6",
  pod: "#ff6b6b",
}

const P = (x: number, y: number) => [PLAN.cx + x * PLAN.s, PLAN.cy - y * PLAN.s] as const
const S = (y: number, z: number) => [SECTION.x0 + (SECTION.yMax - y) * SECTION.s, SECTION.z0 - z * SECTION.s] as const
const part = (id: string) => PARTS.find((entry) => entry.id === id) as Box
const fmt = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1))

function planRect(box: Box) {
  const [x, y] = P(box.x - box.w / 2, box.y + box.d / 2)
  return { x, y, width: box.w * PLAN.s, height: box.d * PLAN.s }
}

/** Section rectangle spanning y0..y1 (mm, any order) and z0..z1. */
function sectionRect(y0: number, y1: number, z0: number, z1: number) {
  const [xa, za] = S(Math.max(y0, y1), Math.max(z0, z1))
  return { x: xa, y: za, width: Math.abs(y1 - y0) * SECTION.s, height: Math.abs(z1 - z0) * SECTION.s }
}

function arcPath(radius: number, fromDeg: number, toDeg: number) {
  const point = (deg: number) => P(radius * Math.cos((deg * Math.PI) / 180), radius * Math.sin((deg * Math.PI) / 180))
  const [x0, y0] = point(fromDeg)
  const [x1, y1] = point(toDeg)
  const large = toDeg - fromDeg > 180 ? 1 : 0
  return `M ${x0} ${y0} A ${radius * PLAN.s} ${radius * PLAN.s} 0 ${large} 0 ${x1} ${y1}`
}

function wrap(text: string, max: number) {
  const lines: string[] = []
  let current = ""
  for (const word of text.split(" ")) {
    if ((current + " " + word).trim().length > max) {
      lines.push(current.trim())
      current = word
    } else current = `${current} ${word}`
  }
  if (current.trim()) lines.push(current.trim())
  return lines
}

interface CalloutSpec {
  id: string
  /** Anchor on the part, already in sheet coordinates. */
  anchor: readonly [number, number]
  bubble: readonly [number, number]
}

const polar = (deg: number, radius: number) => P(radius * Math.cos((deg * Math.PI) / 180), radius * Math.sin((deg * Math.PI) / 180))

const PLAN_CALLOUTS: CalloutSpec[] = [
  { id: "snapdragon", anchor: P(-9, 3), bubble: polar(152, 36) },
  { id: "nordic", anchor: P(-3, 13), bubble: polar(112, 36) },
  { id: "gps", anchor: polar(70, 21.5), bubble: polar(62, 36) },
  { id: "cellular", anchor: P(13, 4), bubble: polar(24, 36) },
  { id: "crown", anchor: P(26, -1), bubble: polar(-12, 36) },
  { id: "battery", anchor: P(12, -11), bubble: polar(-48, 36) },
  { id: "naloxone", anchor: P(5, -30), bubble: polar(-42, 45) },
  { id: "nfc", anchor: P(-6, -15), bubble: polar(-128, 36) },
]

const SECTION_CALLOUTS: CalloutSpec[] = [
  { id: "display", anchor: S(-12, 11.2), bubble: S(-12, 19) },
  { id: "ppg-ecg", anchor: S(4, 1.15), bubble: S(4, -8) },
  { id: "sealed-charge", anchor: S(-12, 0.75), bubble: S(-12, -8) },
  { id: "snapdragon", anchor: S(-2, 9), bubble: S(2, 19) },
  { id: "battery", anchor: S(8, 4.5), bubble: S(12, 19) },
  { id: "naloxone", anchor: S(-28, 5.5), bubble: S(-28, 19) },
]

function Callout({ spec, selected, onSelect }: { spec: CalloutSpec; selected: string | null; onSelect: (id: string) => void }) {
  const component = WATCH_COMPONENTS.find((entry) => entry.id === spec.id)!
  const active = selected === spec.id
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${calloutNumber(spec.id)}. ${component.name}`}
      aria-pressed={active}
      onClick={() => onSelect(spec.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onSelect(spec.id)
        }
      }}
      style={{ cursor: "pointer" }}
      className="drawing-callout"
    >
      <line x1={spec.anchor[0]} y1={spec.anchor[1]} x2={spec.bubble[0]} y2={spec.bubble[1]} stroke={active ? component.color : C.line} strokeWidth={0.2} />
      <circle cx={spec.anchor[0]} cy={spec.anchor[1]} r={0.55} fill={active ? component.color : C.line} />
      <circle cx={spec.bubble[0]} cy={spec.bubble[1]} r={3.1} fill={active ? component.color : C.paper} stroke={active ? "#fff" : C.line} strokeWidth={active ? 0.45 : 0.3} />
      <text x={spec.bubble[0]} y={spec.bubble[1] + 1.05} textAnchor="middle" fontSize={3} fontWeight={700} fill={active ? "#000" : C.line}>
        {calloutNumber(spec.id)}
      </text>
    </g>
  )
}

function HDim({ x1, x2, y, label, ext }: { x1: number; x2: number; y: number; label: string; ext?: [number, number] }) {
  return (
    <g stroke={C.accent} strokeWidth={0.18} fill="none">
      {ext && <line x1={x1} y1={ext[0]} x2={x1} y2={y + 1} />}
      {ext && <line x1={x2} y1={ext[1]} x2={x2} y2={y + 1} />}
      <line x1={x1} y1={y} x2={x2} y2={y} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
      <text x={(x1 + x2) / 2} y={y - 0.9} textAnchor="middle" fontSize={2.4} fill={C.accent} stroke="none">{label}</text>
    </g>
  )
}

function VDim({ y1, y2, x, label, ext }: { y1: number; y2: number; x: number; label: string; ext?: [number, number] }) {
  return (
    <g stroke={C.accent} strokeWidth={0.18} fill="none">
      {ext && <line x1={ext[0]} y1={y1} x2={x - 1} y2={y1} />}
      {ext && <line x1={ext[1]} y1={y2} x2={x - 1} y2={y2} />}
      <line x1={x} y1={y1} x2={x} y2={y2} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
      <text x={x - 1} y={(y1 + y2) / 2} textAnchor="middle" fontSize={2.4} fill={C.accent} stroke="none" transform={`rotate(-90 ${x - 1} ${(y1 + y2) / 2})`}>{label}</text>
    </g>
  )
}

function PlanView() {
  const { caseRadius, internalRadius, strapWidth, topLug, podLug, crown, opticalWindowDiameter, qiCoil } = ENVELOPE
  const [cx, cy] = P(0, 0)
  const visible = PARTS.filter((entry) => !entry.hidden && entry.id !== "pcb" && entry.id !== "pod")
  const hidden = PARTS.filter((entry) => entry.hidden)
  const pod = part("pod")
  const lugTop = planRect({ id: "lug", label: "", x: 0, y: (topLug.y0 + topLug.y1) / 2, z: 0, w: strapWidth, d: topLug.y1 - topLug.y0, h: 0 })
  const lugPod = planRect({ id: "lug", label: "", x: 0, y: (podLug.y0 + podLug.y1) / 2, z: 0, w: strapWidth + 2, d: podLug.y1 - podLug.y0, h: 0 })
  return (
    <g>
      <text x={PLAN.cx} y={22} textAnchor="middle" fontSize={3.2} fontWeight={700} fill={C.line}>PLAN VIEW — CRYSTAL AND DISPLAY REMOVED</text>
      <text x={PLAN.cx} y={26} textAnchor="middle" fontSize={2.3} fill={C.faint}>SCALE 1.5 : 1 · HIDDEN PARTS DASHED</text>

      <rect {...lugTop} rx={2} fill={C.paper} stroke={C.line} strokeWidth={0.4} />
      <rect {...lugPod} rx={2.5} fill={C.paper} stroke={C.line} strokeWidth={0.4} />
      <rect {...planRect(pod)} fill={C.pod} fillOpacity={0.15} stroke={C.pod} strokeWidth={0.3} strokeDasharray="1.2 0.8" />
      <text x={P(0, pod.y)[0]} y={P(0, pod.y)[1] + 0.8} textAnchor="middle" fontSize={2} fill={C.pod}>POD (RESEARCH)</text>

      <rect x={P(crown.x0, crown.radius)[0]} y={P(crown.x0, crown.radius)[1]} width={(crown.x1 - crown.x0) * PLAN.s} height={crown.radius * 2 * PLAN.s} rx={0.6} fill={C.paper} stroke={C.line} strokeWidth={0.35} />
      {[-1.6, -0.8, 0, 0.8, 1.6].map((offset) => (
        <line key={offset} x1={P(crown.x1 - 2.4, offset)[0]} y1={P(0, offset)[1]} x2={P(crown.x1, offset)[0]} y2={P(0, offset)[1]} stroke={C.faint} strokeWidth={0.12} />
      ))}

      <circle cx={cx} cy={cy} r={caseRadius * PLAN.s} fill={C.paper} stroke={C.line} strokeWidth={0.55} />
      <circle cx={cx} cy={cy} r={internalRadius * PLAN.s} fill={C.board} fillOpacity={0.35} stroke={C.line} strokeWidth={0.25} />

      {hidden.map((box) => (
        <rect key={box.id} {...planRect(box)} fill="none" stroke={C.faint} strokeWidth={0.22} strokeDasharray="1.2 0.8" />
      ))}
      <circle cx={cx} cy={cy} r={(opticalWindowDiameter / 2) * PLAN.s} fill="none" stroke={C.faint} strokeWidth={0.2} strokeDasharray="1.2 0.8" />
      <circle cx={cx} cy={cy} r={(qiCoil.inner / 2) * PLAN.s} fill="none" stroke={C.copper} strokeWidth={0.2} strokeDasharray="1.2 0.8" />
      <circle cx={cx} cy={cy} r={(qiCoil.outer / 2) * PLAN.s} fill="none" stroke={C.copper} strokeWidth={0.2} strokeDasharray="1.2 0.8" />

      {visible.map((box) => {
        const rect = planRect(box)
        const short = box.label.split(" (")[0].split(" ")[0]
        return (
          <g key={box.id}>
            <rect {...rect} rx={0.3} fill="#0f1a2b" stroke={C.line} strokeWidth={0.3} />
            {box.w >= 6 && (
              <text x={rect.x + rect.width / 2} y={rect.y + rect.height / 2 + 0.8} textAnchor="middle" fontSize={box.w >= 12 ? 2.3 : 1.7} fill={C.line}>{short}</text>
            )}
          </g>
        )
      })}

      {ANTENNAS.map((antenna) => (
        <path key={antenna.id} d={arcPath(21.5, antenna.from, antenna.to)} fill="none" stroke={C.copper} strokeWidth={0.6} strokeLinecap="round" />
      ))}

      <g stroke={C.faint} strokeWidth={0.15} strokeDasharray="4 1 0.6 1">
        <line x1={P(-31, 0)[0]} y1={cy} x2={P(31, 0)[0]} y2={cy} />
        <line x1={cx} y1={P(0, 31)[1]} x2={cx} y2={P(0, -42)[1]} />
      </g>
      <g fill={C.line} fontSize={3} fontWeight={700}>
        <path d={`M ${cx} ${P(0, 31.5)[1]} l 4 0`} stroke={C.line} strokeWidth={0.5} markerEnd="url(#arrow-solid)" />
        <text x={cx - 3.5} y={P(0, 31.5)[1] + 1}>B</text>
        <path d={`M ${cx} ${P(0, -43)[1]} l 4 0`} stroke={C.line} strokeWidth={0.5} markerEnd="url(#arrow-solid)" />
        <text x={cx - 3.5} y={P(0, -43)[1] + 1}>B</text>
      </g>

      <HDim x1={P(-strapWidth / 2, 0)[0]} x2={P(strapWidth / 2, 0)[0]} y={P(0, topLug.y1 + 6)[1]} label={`${strapWidth} STRAP`} ext={[lugTop.y, lugTop.y]} />
      <VDim y1={P(0, topLug.y1)[1]} y2={P(0, podLug.y0)[1]} x={P(-33, 0)[0]} label={`${fmt(topLug.y1 - podLug.y0)} LUG TO LUG`} ext={[lugTop.x, lugPod.x]} />
      <HDim x1={P(-caseRadius, 0)[0]} x2={P(caseRadius, 0)[0]} y={P(0, -caseRadius - 16.5)[1]} label={`Ø${caseRadius * 2} CASE`} ext={[cy, cy]} />
      <text x={P(-17, 17.5)[0]} y={P(-17, 17.5)[1]} fontSize={2.1} fill={C.accent} textAnchor="end">Ø{internalRadius * 2} BOARD</text>
    </g>
  )
}

function SectionView() {
  const { caseRadius, internalRadius, topLug, podLug, opticalWindowDiameter, qiCoil, displayDiameter } = ENVELOPE
  const caseBack = LAYERS[0]
  const display = LAYERS.find((layer) => layer.id === "display")!
  const crystal = LAYERS.find((layer) => layer.id === "crystal")!
  const battery = part("battery")
  const pcb = part("pcb")
  const soc = part("soc")
  const mcu = part("mcu")
  const emmc = part("emmc")
  const flex = part("sensor-flex")
  const pod = part("pod")
  const bezelTop = crystal.z0 + 0.8
  const metal = { fill: "url(#hatch-metal)", stroke: C.line, strokeWidth: 0.3 }
  const [lx] = S(topLug.y1 + 4, 0)
  const [, zTop] = S(0, ENVELOPE.caseThickness)
  const [, zBottom] = S(0, 0)
  return (
    <g>
      <text x={S(-4, 0)[0]} y={36} textAnchor="middle" fontSize={3.2} fontWeight={700} fill={C.line}>SECTION B–B</text>
      <text x={S(-4, 0)[0]} y={40} textAnchor="middle" fontSize={2.3} fill={C.faint}>SCALE 2.3 : 1 · CUT THROUGH CENTRE, 12 → 6 O'CLOCK</text>

      <rect {...sectionRect(topLug.y0, topLug.y1, topLug.z0, topLug.z1)} rx={0.8} {...metal} />
      <circle cx={S((topLug.y0 + topLug.y1) / 2 + 1.5, 7.5)[0]} cy={S(0, 7.5)[1]} r={0.9 * SECTION.s} fill={C.paper} stroke={C.line} strokeWidth={0.25} />
      <rect {...sectionRect(podLug.y0, podLug.y1, podLug.z0, podLug.z1)} rx={0.8} {...metal} />
      <rect {...sectionRect(pod.y - pod.d / 2, pod.y + pod.d / 2, pod.z, pod.z + pod.h)} fill="url(#hatch-pod)" stroke={C.pod} strokeWidth={0.35} />

      <rect {...sectionRect(internalRadius, caseRadius, caseBack.z1, bezelTop)} {...metal} />
      <rect {...sectionRect(-caseRadius, -internalRadius, caseBack.z1, bezelTop)} {...metal} />
      <rect {...sectionRect(-caseRadius + 1.5, caseRadius - 1.5, 0, caseBack.z1)} {...metal} />
      <rect {...sectionRect(-opticalWindowDiameter / 2, opticalWindowDiameter / 2, 0, caseBack.z1)} fill={C.glass} fillOpacity={0.35} stroke={C.line} strokeWidth={0.25} />
      {[1, -1].map((side) => (
        <rect key={side} {...sectionRect((side * qiCoil.inner) / 2, (side * qiCoil.outer) / 2, 0.45, 0.95)} fill={C.copper} stroke="none" />
      ))}
      <rect {...sectionRect(flex.y - flex.d / 2, flex.y + flex.d / 2, flex.z, flex.z + flex.h)} fill="#ff69b4" fillOpacity={0.7} stroke="none" />

      <rect {...sectionRect(battery.y - battery.d / 2, battery.y + battery.d / 2, battery.z, battery.z + battery.h)} fill="url(#hatch-battery)" stroke={C.line} strokeWidth={0.3} rx={0.6} />
      <rect {...sectionRect(emmc.y - emmc.d / 2, emmc.y + emmc.d / 2, emmc.z, emmc.z + emmc.h)} fill="#0f1a2b" stroke={C.line} strokeWidth={0.2} />
      <rect {...sectionRect(-pcb.d / 2, pcb.d / 2, pcb.z, pcb.z + pcb.h)} fill={C.board} stroke={C.line} strokeWidth={0.25} />
      <rect {...sectionRect(soc.y - soc.d / 2, soc.y + soc.d / 2, soc.z, soc.z + soc.h)} fill="#0f1a2b" stroke={C.line} strokeWidth={0.25} />
      <rect {...sectionRect(mcu.y - mcu.d / 2, mcu.y + mcu.d / 2, mcu.z, mcu.z + mcu.h)} fill="#0f1a2b" stroke={C.line} strokeWidth={0.25} />

      <rect {...sectionRect(-displayDiameter / 2, displayDiameter / 2, display.z0, display.z1)} fill="#d9c84a" fillOpacity={0.55} stroke={C.line} strokeWidth={0.25} />
      <path
        d={(() => {
          const [x0, z0] = S(internalRadius, crystal.z0)
          const [x1] = S(-internalRadius, crystal.z0)
          const [, zt] = S(0, crystal.z1)
          return `M ${x0} ${z0} L ${x0} ${z0 - 1.6 * SECTION.s} Q ${(x0 + x1) / 2} ${zt - 1.2} ${x1} ${z0 - 1.6 * SECTION.s} L ${x1} ${z0} Z`
        })()}
        fill={C.glass}
        fillOpacity={0.25}
        stroke={C.line}
        strokeWidth={0.3}
      />
      {[internalRadius + 0.6, -internalRadius - 0.6].map((y) => (
        <g key={y}>
          <circle cx={S(y, caseBack.z1)[0]} cy={S(0, caseBack.z1)[1]} r={0.45 * SECTION.s} fill="#000" stroke={C.line} strokeWidth={0.2} />
          <circle cx={S(y, crystal.z0 + 0.3)[0]} cy={S(0, crystal.z0 + 0.3)[1]} r={0.35 * SECTION.s} fill="#000" stroke={C.line} strokeWidth={0.2} />
        </g>
      ))}

      <line x1={S(0, 0)[0]} y1={zTop - 6} x2={S(0, 0)[0]} y2={zBottom + 4} stroke={C.faint} strokeWidth={0.15} strokeDasharray="4 1 0.6 1" />
      <VDim y1={zTop} y2={zBottom} x={lx - 2} label={`${ENVELOPE.caseThickness}`} ext={[S(topLug.y1, 0)[0], S(topLug.y1, 0)[0]]} />
      <HDim x1={S(displayDiameter / 2, 0)[0]} x2={S(-displayDiameter / 2, 0)[0]} y={zBottom + 5} label={`Ø${displayDiameter} DISPLAY · Ø${internalRadius * 2} BOARD · Ø${caseRadius * 2} CASE`} ext={[S(0, display.z0)[1], S(0, display.z0)[1]]} />
    </g>
  )
}

function CaseBackDetail() {
  const scale = 0.78
  const cx = 169
  const cy = 181
  const r = (mm: number) => mm * scale
  const { caseRadius, opticalWindowDiameter, qiCoil } = ENVELOPE
  const textRadius = r(18.3)
  const arc = `M ${cx - textRadius} ${cy} A ${textRadius} ${textRadius} 0 1 1 ${cx + textRadius} ${cy} A ${textRadius} ${textRadius} 0 1 1 ${cx - textRadius} ${cy}`
  return (
    <g>
      <text x={135} y={155} fontSize={2.6} fontWeight={700} fill={C.line}>DETAIL C — CASE BACK MARKING</text>
      <text x={135} y={158.6} fontSize={2} fill={C.faint}>SCALE 0.78 : 1 · OWNER LOCK, SERIAL IS AN EXAMPLE</text>
      <circle cx={cx} cy={cy} r={r(caseRadius)} fill="none" stroke={C.line} strokeWidth={0.45} />
      <circle cx={cx} cy={cy} r={r(caseRadius - 1.5)} fill="#2a4a6e" fillOpacity={0.5} stroke={C.line} strokeWidth={0.25} />
      <circle cx={cx} cy={cy} r={r(qiCoil.outer / 2)} fill="none" stroke={C.copper} strokeWidth={0.2} strokeDasharray="1.2 0.8" />
      <circle cx={cx} cy={cy} r={r(qiCoil.inner / 2)} fill="none" stroke={C.copper} strokeWidth={0.2} strokeDasharray="1.2 0.8" />
      <circle cx={cx} cy={cy} r={r(opticalWindowDiameter / 2)} fill={C.glass} fillOpacity={0.35} stroke={C.line} strokeWidth={0.25} />
      <path id="case-back-arc" d={arc} fill="none" />
      <text fontSize={1.55} fill={C.line} letterSpacing={0.12}>
        <textPath href="#case-back-arc" startOffset="2%">NG-7K2P-Q9XD · REGISTERED TO ITS OWNER · NOT FOR RESALE · NARCOGUARD.APP</textPath>
      </text>
      <text x={cx} y={cy + r(9.5)} textAnchor="middle" fontSize={1.6} fill={C.faint}>LASER MARK, DEPTH TBD</text>
    </g>
  )
}

function Table({ x, y, title, columns, rows, widths }: { x: number; y: number; title: string; columns: string[]; rows: string[][]; widths: number[] }) {
  const rowH = 4.1
  const total = widths.reduce((a, b) => a + b, 0)
  return (
    <g fontSize={2.1} fill={C.line}>
      <text x={x} y={y - 1.4} fontSize={2.6} fontWeight={700}>{title}</text>
      <rect x={x} y={y} width={total} height={rowH * (rows.length + 1)} fill="none" stroke={C.line} strokeWidth={0.3} />
      {columns.map((column, index) => (
        <text key={column} x={x + widths.slice(0, index).reduce((a, b) => a + b, 0) + 1} y={y + 2.9} fontWeight={700}>{column}</text>
      ))}
      {rows.map((row, r) => (
        <g key={r}>
          <line x1={x} y1={y + rowH * (r + 1)} x2={x + total} y2={y + rowH * (r + 1)} stroke={C.line} strokeWidth={0.12} />
          {row.map((cell, index) => (
            <text key={index} x={x + widths.slice(0, index).reduce((a, b) => a + b, 0) + 1} y={y + rowH * (r + 1) + 2.9}>{cell}</text>
          ))}
        </g>
      ))}
      {widths.slice(0, -1).map((_, index) => {
        const cx = x + widths.slice(0, index + 1).reduce((a, b) => a + b, 0)
        return <line key={index} x1={cx} y1={y} x2={cx} y2={y + rowH * (rows.length + 1)} stroke={C.line} strokeWidth={0.12} />
      })}
    </g>
  )
}

export function EngineeringDrawing({ selected, onSelect }: { selected: string | null; onSelect: (id: string | null) => void }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const select = (id: string) => onSelect(selected === id ? null : id)
  const layerRows = [...LAYERS].reverse().map((layer) => [layer.label, `${layer.z0.toFixed(1)}–${layer.z1.toFixed(1)}`, (layer.z1 - layer.z0).toFixed(1)])
  const partRows = WATCH_COMPONENTS.map((component, index) => [String(index + 1), component.name.slice(0, 30), component.partNumber.slice(0, 27)])

  const download = () => {
    if (!svgRef.current) return
    const source = new XMLSerializer().serializeToString(svgRef.current)
    const url = URL.createObjectURL(new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${source}`], { type: "image/svg+xml" }))
    const link = document.createElement("a")
    link.href = url
    link.download = "narcoguard-ng-rev4.2-concept-drawing.svg"
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="space-y-3" data-testid="engineering-drawing">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">To-scale concept drawing generated from the design model. Tap a numbered callout for part details; scroll sideways on small screens.</p>
        <Button type="button" variant="outline" size="sm" onClick={download}><Download className="mr-2 h-4 w-4" aria-hidden="true" />Download SVG</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-primary/30">
        <svg
          ref={svgRef}
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${SHEET.w} ${SHEET.h}`}
          width="100%"
          className="block min-w-[900px]"
          role="group"
          aria-labelledby="drawing-title drawing-desc"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
        >
          <title id="drawing-title">NarcoGuard NG Rev 4.2 concept engineering drawing</title>
          <desc id="drawing-desc">Plan view and section B-B of the 46 mm watch case with numbered component callouts, a layer stack table, a parts list and open engineering issues. Dimensions in millimetres; concept only, not for manufacture.</desc>
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke={C.grid} strokeWidth={0.2} />
            </pattern>
            <pattern id="hatch-metal" width="1.6" height="1.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="1.6" height="1.6" fill="#2a4a6e" />
              <line x1="0" y1="0" x2="0" y2="1.6" stroke={C.faint} strokeWidth={0.25} />
            </pattern>
            <pattern id="hatch-battery" width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="2" height="2" fill={C.battery} fillOpacity={0.5} />
              <line x1="0" y1="0" x2="0" y2="2" stroke={C.line} strokeWidth={0.15} />
              <line x1="0" y1="0" x2="2" y2="0" stroke={C.line} strokeWidth={0.15} />
            </pattern>
            <pattern id="hatch-pod" width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
              <rect width="2" height="2" fill={C.pod} fillOpacity={0.18} />
              <line x1="0" y1="0" x2="0" y2="2" stroke={C.pod} strokeWidth={0.25} />
            </pattern>
            <marker id="arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
              <path d="M0 0 L6 3 L0 6 Z" fill={C.accent} />
            </marker>
            <marker id="arrow-solid" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="2.5" markerHeight="2.5" orient="auto">
              <path d="M0 0 L6 3 L0 6 Z" fill={C.line} />
            </marker>
          </defs>

          <rect width={SHEET.w} height={SHEET.h} fill={C.paper} />
          <rect width={SHEET.w} height={SHEET.h} fill="url(#grid)" />
          <rect x={5} y={5} width={SHEET.w - 10} height={SHEET.h - 10} fill="none" stroke={C.line} strokeWidth={0.6} />
          <rect x={7} y={7} width={SHEET.w - 14} height={SHEET.h - 14} fill="none" stroke={C.line} strokeWidth={0.2} />

          <PlanView />
          <SectionView />

          {PLAN_CALLOUTS.map((spec) => <Callout key={`p-${spec.id}`} spec={spec} selected={selected} onSelect={select} />)}
          {SECTION_CALLOUTS.map((spec) => <Callout key={`s-${spec.id}`} spec={spec} selected={selected} onSelect={select} />)}

          <Table x={135} y={124} title="LAYER STACK (z FROM CASE BACK, mm)" columns={["LAYER", "z", "THK"]} widths={[44, 15, 9]} rows={layerRows} />
          <CaseBackDetail />
          <Table x={207} y={124} title="PARTS LIST (CANDIDATE)" columns={["#", "ITEM", "PART NO."]} widths={[5, 40, 37]} rows={partRows} />

          <g fontSize={2.15} fill={C.line}>
            <text x={12} y={160} fontSize={2.6} fontWeight={700}>NOTES AND OPEN ISSUES</text>
            {(() => {
              let line = 0
              return OPEN_ISSUES.flatMap((issue, index) =>
                wrap(`${index + 1}. ${issue}`, 92).map((text, part) => (
                  <text key={`${index}-${part}`} x={part ? 15.5 : 12} y={165 + line++ * 3.3}>{text}</text>
                )),
              )
            })()}
            <text x={12} y={199.5} fill={C.accent}>ALL DIMENSIONS IN MM. CONCEPT LAYOUT FOR DISCUSSION — NOT FOR MANUFACTURE, NOT A MEDICAL DEVICE.</text>
          </g>

          <g fontSize={2.2} fill={C.line}>
            <rect x={207} y={175} width={82} height={28} fill="none" stroke={C.line} strokeWidth={0.4} />
            <line x1={207} y1={185} x2={289} y2={185} stroke={C.line} strokeWidth={0.2} />
            <line x1={207} y1={194} x2={289} y2={194} stroke={C.line} strokeWidth={0.2} />
            <line x1={248} y1={185} x2={248} y2={203} stroke={C.line} strokeWidth={0.2} />
            <text x={209} y={180} fontSize={3.4} fontWeight={700}>NARCOGUARD NG</text>
            <text x={209} y={183.6} fontSize={2}>WEARABLE CONCEPT · CASE + CORE LAYOUT</text>
            <text x={209} y={189} fill={C.faint}>DRAWING</text>
            <text x={209} y={192.4}>NG-CON-001</text>
            <text x={250} y={189} fill={C.faint}>REV</text>
            <text x={250} y={192.4}>4.2 CONCEPT</text>
            <text x={209} y={198} fill={C.faint}>UNITS / PROJECTION</text>
            <text x={209} y={201.4}>MM · THIRD ANGLE</text>
            <text x={250} y={198} fill={C.faint}>STATUS</text>
            <text x={250} y={201.4} fill={C.pod}>UNVERIFIED</text>
          </g>
        </svg>
      </div>
    </div>
  )
}
