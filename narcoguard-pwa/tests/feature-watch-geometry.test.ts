import { strict as assert } from "node:assert"
import { test } from "node:test"
import { watchDesignModel } from "../lib/watch-design"
import { ENVELOPE, LAYERS, PARTS, planInterferences } from "../lib/watch-geometry"
import { WATCH_COMPONENTS, calloutNumber } from "../lib/watch-components"

test("the layer stack runs from the case back to the full case thickness without overlaps", () => {
  assert.equal(LAYERS[0].z0, 0)
  assert.equal(LAYERS.at(-1)!.z1, watchDesignModel.caseThicknessMm)
  for (let i = 1; i < LAYERS.length; i++) assert.ok(LAYERS[i].z0 >= LAYERS[i - 1].z1, `${LAYERS[i].id} overlaps ${LAYERS[i - 1].id}`)
})

test("no board part crosses the usable internal radius and visible parts do not overlap", () => {
  assert.deepEqual(planInterferences(), [])
  const visible = PARTS.filter((part) => !part.hidden && part.id !== "pcb" && part.id !== "pod")
  for (let i = 0; i < visible.length; i++) {
    for (let j = i + 1; j < visible.length; j++) {
      const [a, b] = [visible[i], visible[j]]
      const overlap = Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.d + b.d) / 2
      assert.ok(!overlap, `${a.id} overlaps ${b.id}`)
    }
  }
  assert.deepEqual(planInterferences([{ id: "x", label: "", x: 18, y: 8, z: 0, w: 4, d: 4, h: 1 }]), ["x"])
})

test("parts sit inside their layers and the medication pod stays outside the sealed core", () => {
  const compute = LAYERS.find((layer) => layer.id === "compute")!
  for (const id of ["soc", "connectivity", "mcu"]) {
    const part = PARTS.find((entry) => entry.id === id)!
    assert.ok(part.z >= compute.z0 && part.z + part.h <= compute.z1 + 1e-9, `${id} leaves the compute plane`)
  }
  const pod = PARTS.find((entry) => entry.id === "pod")!
  assert.ok(Math.abs(pod.y) - pod.d / 2 >= ENVELOPE.caseRadius - 1.5, "pod must sit in the lug, outside the core")
  assert.equal(pod.h, watchDesignModel.medicationPod.targetMaximumHeightMm)
  assert.equal(ENVELOPE.displayDiameter, 36.8)
})

test("every part callout refers to a numbered component", () => {
  for (const part of PARTS) if (part.callout) assert.ok(calloutNumber(part.callout) > 0, part.callout)
  assert.equal(calloutNumber("snapdragon"), 1)
  assert.equal(new Set(WATCH_COMPONENTS.map((component) => component.id)).size, WATCH_COMPONENTS.length)
})
