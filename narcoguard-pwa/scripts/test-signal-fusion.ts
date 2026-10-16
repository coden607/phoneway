import assert from "node:assert/strict"
import { SensorFusion } from "../lib/kalman-filter"
import { VitalsProcessor, type SensorReading } from "../lib/vitals-processor"

const fusion = new SensorFusion()
assert.equal(fusion.fuseSensors([{ sensorId: "first", value: 100, confidence: 0.1 }]), 100)
assert.equal(fusion.fuseSensors([{ sensorId: "second", value: 100, confidence: 1 }]), 100)

const processor = new VitalsProcessor()
const normal: SensorReading[] = [
  { type: "ppg", value: 72, confidence: 0.95, timestamp: 1 },
  { type: "oximeter", value: 98, confidence: 0.95, timestamp: 1 },
  { type: "accelerometer", value: 16, confidence: 0.9, timestamp: 1 },
  { type: "thermometer", value: 98.6, confidence: 0.95, timestamp: 1 },
]
const stable = processor.processSensorReadings(normal)
assert.ok(stable.spO2 >= 95)
assert.ok(stable.respiratoryRate >= 12)

const danger: SensorReading[] = [
  { type: "ppg", value: 42, confidence: 0.95, timestamp: 2 },
  { type: "oximeter", value: 84, confidence: 0.98, timestamp: 2 },
  { type: "accelerometer", value: 5, confidence: 0.95, timestamp: 2 },
  { type: "thermometer", value: 94, confidence: 0.9, timestamp: 2 },
]
let result = processor.detectOverdoseIndicators()
for (let i = 0; i < 4; i += 1) {
  processor.processSensorReadings(danger)
  result = processor.detectOverdoseIndicators()
}
assert.equal(result.severity, "critical")
assert.equal(result.recommendedAction, "activate_emergency")
assert.ok(result.supportingSignals >= 2)
console.log("[signals] Kalman fusion and sustained multi-signal escalation passed")
