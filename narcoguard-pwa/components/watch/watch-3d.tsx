"use client"

import { useEffect, useRef, useState } from "react"
import { RotateCcw, Pause, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { BufferGeometry, Material, Mesh, MeshStandardMaterial, WebGLRenderer } from "three"
import { ENVELOPE, LAYERS, PARTS } from "@/lib/watch-geometry"

// Realistic 3D model of the NG concept, built from the same millimetre geometry as the engineering
// drawing. three.js loads only when this component mounts (the 3D tab), so other pages stay light.
// Axes: three.x = x (3 o'clock), three.y = z (up from case back), three.z = -y (12 o'clock away).

type Status = "loading" | "ready" | "unsupported"

interface SceneApi {
  setExplode: (amount: number) => void
  setSelected: (id: string | null) => void
  setAutoRotate: (on: boolean) => void
  resetView: () => void
}

const layer = (id: string) => LAYERS.find((entry) => entry.id === id)!
const part = (id: string) => PARTS.find((entry) => entry.id === id)!

function drawWatchFace(canvas: HTMLCanvasElement) {
  const size = canvas.width
  const ctx = canvas.getContext("2d")!
  const c = size / 2
  ctx.fillStyle = "#020306"
  ctx.fillRect(0, 0, size, size)
  ctx.save()
  ctx.translate(c, c)
  for (let i = 0; i < 60; i++) {
    ctx.rotate(Math.PI / 30)
    ctx.fillStyle = i % 5 === 4 ? "#e6f1ff" : "#3b4a5c"
    ctx.fillRect(-2, -c * 0.95, 4, i % 5 === 4 ? size * 0.05 : size * 0.025)
  }
  ctx.restore()
  ctx.strokeStyle = "#22d3ee"
  ctx.lineWidth = size * 0.018
  ctx.lineCap = "round"
  ctx.beginPath()
  ctx.arc(c, c, c * 0.72, -Math.PI * 0.75, Math.PI * 0.25)
  ctx.stroke()
  ctx.fillStyle = "#e6f1ff"
  ctx.textAlign = "center"
  ctx.font = `600 ${size * 0.05}px system-ui, sans-serif`
  ctx.fillText("NARCOGUARD", c, c - size * 0.2)
  ctx.font = `700 ${size * 0.13}px system-ui, sans-serif`
  ctx.fillText("10:08", c, c + size * 0.03)
  ctx.fillStyle = "#fbbf24"
  ctx.font = `600 ${size * 0.042}px system-ui, sans-serif`
  ctx.fillText("NO LIVE DATA", c, c + size * 0.13)
  ctx.fillStyle = "#8aa0b8"
  ctx.font = `500 ${size * 0.034}px system-ui, sans-serif`
  ctx.fillText("concept display", c, c + size * 0.19)
}

/** Laser marking on the case back: serial (example) and the owner-lock notice, set around the rim. */
function drawCaseBackMark(canvas: HTMLCanvasElement) {
  const size = canvas.width
  const ctx = canvas.getContext("2d")!
  ctx.clearRect(0, 0, size, size)
  const text = "NG-7K2P-Q9XD · REGISTERED TO ITS OWNER · NOT FOR RESALE · NARCOGUARD.APP · "
  const radius = size * 0.43
  ctx.fillStyle = "rgba(225,230,238,0.9)"
  ctx.font = `600 ${size * 0.03}px ui-monospace, monospace`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  const step = (Math.PI * 2) / text.length
  for (let i = 0; i < text.length; i++) {
    const angle = -Math.PI / 2 + i * step
    ctx.save()
    ctx.translate(size / 2 + Math.cos(angle) * radius, size / 2 + Math.sin(angle) * radius)
    ctx.rotate(angle + Math.PI / 2)
    ctx.fillText(text[i], 0, 0)
    ctx.restore()
  }
}

export function Watch3D({ selected, onSelect }: { selected: string | null; onSelect: (id: string | null) => void }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<SceneApi | null>(null)
  const onSelectRef = useRef(onSelect)
  const [status, setStatus] = useState<Status>("loading")
  const [explode, setExplode] = useState(0)
  const [autoRotate, setAutoRotate] = useState(true)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let disposed = false
    let cleanup = () => {}

    void (async () => {
      const THREE = await import("three")
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js")
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js")
      const { RoundedBoxGeometry } = await import("three/examples/jsm/geometries/RoundedBoxGeometry.js")
      if (disposed) return

      let renderer: WebGLRenderer
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
      } catch {
        setStatus("unsupported")
        return
      }
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.05
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.domElement.setAttribute("role", "img")
      renderer.domElement.setAttribute("aria-label", "3D model of the NarcoGuard NG concept watch. Drag to rotate, pinch or scroll to zoom.")
      renderer.domElement.style.touchAction = "none"
      mount.appendChild(renderer.domElement)

      const scene = new THREE.Scene()
      const pmrem = new THREE.PMREMGenerator(renderer)
      const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
      scene.environment = environment

      const camera = new THREE.PerspectiveCamera(30, 1, 1, 1000)
      const home = new THREE.Vector3(78, 96, 128)
      camera.position.copy(home)
      const controls = new OrbitControls(camera, renderer.domElement)
      controls.target.set(0, 3, 6)
      controls.enableDamping = true
      controls.minDistance = 45
      controls.maxDistance = 260
      controls.autoRotate = !reducedMotion
      controls.autoRotateSpeed = 0.8
      if (reducedMotion) setAutoRotate(false)

      const key = new THREE.DirectionalLight(0xffffff, 1.6)
      key.position.set(60, 120, 80)
      scene.add(key, new THREE.AmbientLight(0xffffff, 0.15))

      const disposables: { dispose: () => void }[] = [environment, pmrem]
      const track = <T extends { dispose: () => void }>(item: T) => (disposables.push(item), item)

      const titanium = track(new THREE.MeshPhysicalMaterial({ color: 0xb9bdc4, metalness: 1, roughness: 0.26, clearcoat: 0.3 }))
      const ceramic = track(new THREE.MeshPhysicalMaterial({ color: 0x16191e, metalness: 0, roughness: 0.32, clearcoat: 0.6 }))
      const solder = track(new THREE.MeshStandardMaterial({ color: 0x1d4f3c, roughness: 0.55, metalness: 0.1 }))
      const shield = track(new THREE.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 0.95, roughness: 0.3 }))
      const chip = track(new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.45 }))
      const pouch = track(new THREE.MeshStandardMaterial({ color: 0xc9ccd1, metalness: 0.65, roughness: 0.42 }))
      const copper = track(new THREE.MeshStandardMaterial({ color: 0xc27a3e, metalness: 1, roughness: 0.35 }))
      const rubber = track(new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.85 }))
      const sensorGlass = track(new THREE.MeshPhysicalMaterial({ color: 0x0b0d10, roughness: 0.05, clearcoat: 1 }))
      const podShell = track(new THREE.MeshPhysicalMaterial({ color: 0xd6403a, metalness: 0.2, roughness: 0.35, clearcoat: 0.5 }))
      // A glossy transparent coat rather than refraction: cheaper on phones and keeps the face legible.
      const crystalMaterial = track(new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0, clearcoat: 1, transparent: true, opacity: 0.16, depthWrite: false }))
      const faceCanvas = document.createElement("canvas")
      faceCanvas.width = faceCanvas.height = 1024
      drawWatchFace(faceCanvas)
      const faceTexture = track(new THREE.CanvasTexture(faceCanvas))
      faceTexture.colorSpace = THREE.SRGBColorSpace
      faceTexture.anisotropy = 8
      const faceMaterial = track(new THREE.MeshStandardMaterial({ map: faceTexture, emissive: 0xffffff, emissiveMap: faceTexture, emissiveIntensity: 0.9, roughness: 0.2 }))
      faceMaterial.userData.isFace = true

      const tagged = new Map<string, Mesh[]>()
      const mesh = (geometry: BufferGeometry, material: Material | Material[], componentId?: string) => {
        track(geometry)
        // Tagged parts get their own material copies so highlighting one part does not light up others.
        const own = componentId ? (Array.isArray(material) ? material.map((entry) => track(entry.clone())) : track(material.clone())) : material
        const m = new THREE.Mesh(geometry, own)
        if (componentId) {
          m.userData.componentId = componentId
          tagged.set(componentId, [...(tagged.get(componentId) ?? []), m])
        }
        return m
      }
      const box = (w: number, h: number, d: number, material: Material, id?: string, radius = 0.25) =>
        mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(radius, Math.min(w, h, d) / 2.01)), material, id)

      const { caseRadius, internalRadius, displayDiameter, topLug, podLug, crown, opticalWindowDiameter, qiCoil, strapWidth } = ENVELOPE
      const caseBack = layer("case-back")
      const displayLayer = layer("display")
      const crystalLayer = layer("crystal")

      // Case middle: a lathe of the wall cross-section.
      const wall = [[internalRadius, caseBack.z1], [caseRadius - 0.3, caseBack.z1], [caseRadius, 2.2], [caseRadius, 11.6], [caseRadius - 0.5, 12.7], [caseRadius - 1.7, 13.05], [internalRadius + 0.15, 13.05], [internalRadius, crystalLayer.z0], [internalRadius, caseBack.z1]]
      const caseMid = mesh(new THREE.LatheGeometry(wall.map(([r, z]) => new THREE.Vector2(r, z)), 160), titanium, "sealed-charge")
      const lugs = new THREE.Group()
      for (const side of [-1, 1]) {
        const horn = box(3.2, topLug.z1 - topLug.z0, topLug.y1 - topLug.y0 + 2, titanium, undefined, 1.2)
        horn.position.set(side * (strapWidth / 2 - 1.6), (topLug.z0 + topLug.z1) / 2, -((topLug.y0 + topLug.y1) / 2) + 1)
        lugs.add(horn)
      }
      const podHousing = box(strapWidth + 2, podLug.z1 - podLug.z0, podLug.y1 - podLug.y0, titanium, undefined, 2)
      podHousing.position.set(0, (podLug.z0 + podLug.z1) / 2, -((podLug.y0 + podLug.y1) / 2))
      lugs.add(podHousing)
      const crownMesh = mesh(new THREE.CylinderGeometry(crown.radius, crown.radius, crown.x1 - crown.x0, 32), titanium, "crown")
      crownMesh.rotation.z = Math.PI / 2
      crownMesh.position.set((crown.x0 + crown.x1) / 2, crown.z, 0)
      const sosRing = mesh(new THREE.TorusGeometry(crown.radius, 0.28, 12, 48), podShell, "crown")
      sosRing.rotation.y = Math.PI / 2
      sosRing.position.set(crown.x1 - 0.4, crown.z, 0)
      const crownGroup = new THREE.Group()
      crownGroup.add(crownMesh, sosRing)

      // Case back with optical window, sensor LEDs and Qi coil.
      const backGroup = new THREE.Group()
      const back = mesh(new THREE.CylinderGeometry(caseRadius - 1.5, caseRadius - 2.3, caseBack.z1, 128), ceramic, "sealed-charge")
      back.position.y = caseBack.z1 / 2
      const opticalWindow = mesh(new THREE.CylinderGeometry(opticalWindowDiameter / 2, opticalWindowDiameter / 2 + 0.4, 0.5, 64), sensorGlass, "ppg-ecg")
      opticalWindow.position.y = -0.1
      const coil = mesh(new THREE.RingGeometry(qiCoil.inner / 2, qiCoil.outer / 2, 96), copper, "sealed-charge")
      coil.rotation.x = -Math.PI / 2
      coil.position.y = caseBack.z1 + 0.02
      const flex = part("sensor-flex")
      const flexMesh = box(flex.w, flex.h, flex.d, track(new THREE.MeshStandardMaterial({ color: 0xc58a2c, roughness: 0.5 })), "ppg-ecg", 0.2)
      flexMesh.position.set(0, caseBack.z1 + 0.35, 0)
      const leds = new THREE.Group()
      for (let i = 0; i < 6; i++) {
        const led = mesh(new THREE.BoxGeometry(1.2, 0.3, 1.2), track(new THREE.MeshStandardMaterial({ color: i % 2 ? 0x22c55e : 0xef4444, emissive: i % 2 ? 0x16a34a : 0xb91c1c, emissiveIntensity: 0.8 })), "ppg-ecg")
        const angle = (i / 6) * Math.PI * 2
        led.position.set(Math.cos(angle) * 3.4, -0.32, Math.sin(angle) * 3.4)
        leds.add(led)
      }
      const markCanvas = document.createElement("canvas")
      markCanvas.width = markCanvas.height = 1024
      drawCaseBackMark(markCanvas)
      const markTexture = track(new THREE.CanvasTexture(markCanvas))
      markTexture.colorSpace = THREE.SRGBColorSpace
      const mark = mesh(new THREE.CircleGeometry(caseRadius - 2.4, 128), track(new THREE.MeshStandardMaterial({ map: markTexture, transparent: true, roughness: 0.6, metalness: 0.2, depthWrite: false })), "nfc")
      mark.rotation.x = Math.PI / 2
      mark.position.y = -0.03
      backGroup.add(back, opticalWindow, coil, flexMesh, leds, mark)

      // Battery and main board.
      const battery = part("battery")
      const batteryMesh = box(battery.w, battery.h, battery.d, pouch, "battery", 1)
      batteryMesh.position.set(battery.x, battery.z + battery.h / 2, -battery.y)
      const boardGroup = new THREE.Group()
      const pcb = part("pcb")
      const board = mesh(new THREE.CylinderGeometry(internalRadius, internalRadius, pcb.h, 128), solder)
      board.position.y = pcb.z + pcb.h / 2
      boardGroup.add(board)
      const materialFor: Record<string, Material> = { soc: shield, connectivity: shield }
      for (const id of ["soc", "connectivity", "mcu", "imu", "baro", "nfc", "emmc"]) {
        const p = part(id)
        const m = box(p.w, p.h, p.d, materialFor[id] ?? chip, p.callout ?? (id === "emmc" ? "snapdragon" : undefined), 0.15)
        m.position.set(p.x, p.z + p.h / 2, -p.y)
        boardGroup.add(m)
      }
      const antennaGroup = new THREE.Group()
      for (const [from, to, id] of [[55, 125, "gps"], [215, 325, "cellular"], [150, 205, "nfc"]] as const) {
        const arc = mesh(new THREE.TorusGeometry(internalRadius - 0.4, 0.35, 8, 64, ((to - from) * Math.PI) / 180), copper, id)
        arc.rotation.x = -Math.PI / 2
        arc.rotation.z = (from * Math.PI) / 180
        arc.position.y = 9.8
        antennaGroup.add(arc)
      }
      boardGroup.add(antennaGroup)

      // Display module and crystal.
      const displayGroup = new THREE.Group()
      const panel = mesh(new THREE.CylinderGeometry(displayDiameter / 2, displayDiameter / 2, displayLayer.z1 - displayLayer.z0, 128), chip, "display")
      panel.position.y = (displayLayer.z0 + displayLayer.z1) / 2
      // CircleGeometry faces +z; tipping it back puts the top of the texture at 12 o'clock.
      const face = mesh(new THREE.CircleGeometry(displayDiameter / 2 - 0.4, 128), faceMaterial)
      face.rotation.x = -Math.PI / 2
      face.position.y = displayLayer.z1 + 0.02
      displayGroup.add(panel, face)
      const crystalProfile = [[0, crystalLayer.z1], [10, crystalLayer.z1 - 0.05], [17, crystalLayer.z1 - 0.3], [internalRadius, crystalLayer.z0 + 0.9], [internalRadius, crystalLayer.z0], [0, crystalLayer.z0]]
      const crystal = mesh(new THREE.LatheGeometry(crystalProfile.map(([r, z]) => new THREE.Vector2(r, z)), 128), crystalMaterial)

      // Medication pod (research) slides out of its lug.
      const pod = part("pod")
      const podGroup = new THREE.Group()
      const podMesh = box(pod.w, pod.h, pod.d, podShell, "naloxone", 1.2)
      podMesh.position.set(pod.x, pod.z + pod.h / 2, -pod.y)
      podGroup.add(podMesh)

      // Straps: rectangles swept along curves that wrap toward the wrist.
      const strapGroup = new THREE.Group()
      const strapShape = new THREE.Shape()
      strapShape.moveTo(-1.3, -strapWidth / 2 + 0.6)
      strapShape.lineTo(1.3, -strapWidth / 2 + 0.6)
      strapShape.lineTo(1.3, strapWidth / 2 - 0.6)
      strapShape.lineTo(-1.3, strapWidth / 2 - 0.6)
      strapShape.closePath()
      for (const [start, dir] of [[-topLug.y1 + 1, -1], [-podLug.y0 - 1, 1]] as const) {
        const path = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 7.5, start),
          new THREE.Vector3(0, 6.5, start + dir * 14),
          new THREE.Vector3(0, -4, start + dir * 26),
          new THREE.Vector3(0, -22, start + dir * 30),
        ])
        const strap = mesh(new THREE.ExtrudeGeometry(strapShape, { steps: 64, extrudePath: path }), rubber)
        strapGroup.add(strap)
      }

      const shadowCanvas = document.createElement("canvas")
      shadowCanvas.width = shadowCanvas.height = 256
      const sctx = shadowCanvas.getContext("2d")!
      const gradient = sctx.createRadialGradient(128, 128, 10, 128, 128, 128)
      gradient.addColorStop(0, "rgba(0,0,0,0.55)")
      gradient.addColorStop(1, "rgba(0,0,0,0)")
      sctx.fillStyle = gradient
      sctx.fillRect(0, 0, 256, 256)
      const shadow = mesh(new THREE.PlaneGeometry(110, 110), track(new THREE.MeshBasicMaterial({ map: track(new THREE.CanvasTexture(shadowCanvas)), transparent: true, depthWrite: false })))
      shadow.rotation.x = -Math.PI / 2
      shadow.position.y = -24

      const watch = new THREE.Group()
      watch.add(caseMid, lugs, crownGroup, backGroup, batteryMesh, boardGroup, displayGroup, crystal, podGroup, strapGroup)
      scene.add(watch, shadow)

      const applyExplode = (t: number) => {
        backGroup.position.y = -16 * t
        batteryMesh.position.y = battery.z + battery.h / 2 - 7 * t
        boardGroup.position.y = 6 * t
        displayGroup.position.y = 16 * t
        crystal.position.y = 26 * t
        crownGroup.position.x = 9 * t
        podGroup.position.z = 16 * t
        strapGroup.visible = t < 0.05
      }
      applyExplode(0)

      const setSelected = (id: string | null) => {
        for (const [componentId, meshes] of tagged) {
          for (const m of meshes) {
            const materials = Array.isArray(m.material) ? m.material : [m.material]
            for (const material of materials) {
              if (!("emissive" in material) || material.userData.isFace) continue
              const standard = material as MeshStandardMaterial
              if (standard.userData.baseEmissive === undefined) standard.userData.baseEmissive = standard.emissive.getHex()
              if (standard.userData.baseIntensity === undefined) standard.userData.baseIntensity = standard.emissiveIntensity
              const on = componentId === id
              standard.emissive.setHex(on ? 0x22d3ee : standard.userData.baseEmissive)
              standard.emissiveIntensity = on ? 0.45 : standard.userData.baseIntensity
            }
          }
        }
      }

      const raycaster = new THREE.Raycaster()
      const pointer = new THREE.Vector2()
      let down: { x: number; y: number } | null = null
      const onPointerDown = (event: PointerEvent) => {
        down = { x: event.clientX, y: event.clientY }
        controls.autoRotate = false
        setAutoRotate(false)
      }
      const onPointerUp = (event: PointerEvent) => {
        if (!down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5) return
        const rect = renderer.domElement.getBoundingClientRect()
        pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
        raycaster.setFromCamera(pointer, camera)
        const hit = raycaster.intersectObjects(watch.children, true).find((entry) => entry.object.visible && entry.object.userData.componentId)
        onSelectRef.current(hit ? (hit.object.userData.componentId as string) : null)
      }
      renderer.domElement.addEventListener("pointerdown", onPointerDown)
      renderer.domElement.addEventListener("pointerup", onPointerUp)

      const resize = () => {
        const width = mount.clientWidth
        const height = mount.clientHeight
        renderer.setSize(width, height, false)
        renderer.domElement.style.width = "100%"
        renderer.domElement.style.height = "100%"
        camera.aspect = width / Math.max(height, 1)
        camera.updateProjectionMatrix()
      }
      const resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(mount)
      resize()

      let visible = true
      const intersection = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting))
      intersection.observe(mount)
      renderer.setAnimationLoop(() => {
        if (!visible || document.hidden) return
        controls.update()
        renderer.render(scene, camera)
      })

      apiRef.current = {
        setExplode: applyExplode,
        setSelected,
        setAutoRotate: (on) => (controls.autoRotate = on && !reducedMotion),
        resetView: () => {
          camera.position.copy(home)
          controls.target.set(0, 3, 6)
          controls.update()
        },
      }
      setStatus("ready")

      cleanup = () => {
        renderer.setAnimationLoop(null)
        resizeObserver.disconnect()
        intersection.disconnect()
        renderer.domElement.removeEventListener("pointerdown", onPointerDown)
        renderer.domElement.removeEventListener("pointerup", onPointerUp)
        controls.dispose()
        for (const item of disposables) item.dispose()
        renderer.dispose()
        renderer.domElement.remove()
        apiRef.current = null
      }
    })().catch(() => {
      if (!disposed) setStatus("unsupported")
    })

    return () => {
      disposed = true
      cleanup()
    }
  }, [])

  useEffect(() => {
    apiRef.current?.setExplode(explode)
  }, [explode, status])

  useEffect(() => {
    apiRef.current?.setSelected(selected)
  }, [selected, status])

  useEffect(() => {
    apiRef.current?.setAutoRotate(autoRotate)
  }, [autoRotate, status])

  return (
    <div className="space-y-3" data-testid="watch-3d" data-status={status}>
      <div ref={mountRef} className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_35%,#1e293b,#05070b_70%)]">
        {status === "loading" && <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground" role="status">Loading 3D model…</p>}
        {status === "unsupported" && (
          <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted-foreground" role="status">
            3D needs WebGL, which this browser has turned off. The engineering drawing on the Blueprint tab shows the same layout.
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex flex-1 min-w-48 items-center gap-3 text-sm">
          <span className="whitespace-nowrap">Exploded view</span>
          <input type="range" min={0} max={100} value={Math.round(explode * 100)} onChange={(event) => setExplode(Number(event.target.value) / 100)} className="flex-1 accent-cyan-400" aria-valuetext={`${Math.round(explode * 100)} percent apart`} />
        </label>
        <Button type="button" size="sm" variant="outline" onClick={() => setAutoRotate((on) => !on)} aria-pressed={autoRotate}>
          {autoRotate ? <Pause className="mr-1 h-4 w-4" aria-hidden="true" /> : <Play className="mr-1 h-4 w-4" aria-hidden="true" />}Auto-rotate
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => apiRef.current?.resetView()}>
          <RotateCcw className="mr-1 h-4 w-4" aria-hidden="true" />Reset view
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Drag to rotate, pinch or scroll to zoom, tap a part for details. Rendered from the concept geometry; materials and finish are illustrative.</p>
    </div>
  )
}
