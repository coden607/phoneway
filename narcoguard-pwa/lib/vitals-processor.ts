import { SensorFusion } from "./kalman-filter"

export interface VitalSigns {
  heartRate: number
  spO2: number
  temperature: number
  respiratoryRate: number
  bloodPressureSystolic: number
  bloodPressureDiastolic: number
  timestamp: number
}

export interface SensorReading {
  type: "ppg" | "ecg" | "accelerometer" | "thermometer" | "oximeter"
  value: number
  confidence: number
  timestamp: number
}

export interface OverdoseCheck {
  isAbnormal: boolean
  severity: "none" | "low" | "medium" | "high" | "critical"
  indicators: string[]
  riskScore: number
  confidence: number
  recommendedAction: "monitor" | "increase_observation" | "prepare_response" | "activate_emergency"
  supportingSignals: number
}

export class VitalsProcessor {
  private sensorFusion: SensorFusion
  private currentVitals: VitalSigns
  private baselineHeartRate = 72
  private baselineTemp = 98.6
  private history: VitalSigns[] = []
  private lastRiskScore = 0
  private lastSeverity: OverdoseCheck["severity"] = "none"

  constructor() {
    this.sensorFusion = new SensorFusion()

    // Initialize Kalman filters for each vital sign
    this.sensorFusion.initSensor("heartRate", 72, 0.01, 2.0)
    this.sensorFusion.initSensor("spO2", 98, 0.001, 0.5)
    this.sensorFusion.initSensor("temperature", 98.6, 0.0001, 0.1)
    this.sensorFusion.initSensor("respiratoryRate", 16, 0.01, 1.0)
    this.sensorFusion.initSensor("bpSystolic", 120, 0.1, 3.0)
    this.sensorFusion.initSensor("bpDiastolic", 80, 0.1, 2.0)

    this.currentVitals = {
      heartRate: 72,
      spO2: 98,
      temperature: 98.6,
      respiratoryRate: 16,
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      timestamp: Date.now(),
    }
  }

  // Process raw sensor readings and update vitals
  processSensorReadings(readings: SensorReading[]): VitalSigns {
    const latestByType = new Map<SensorReading["type"], SensorReading[]>()

    readings.forEach((reading) => {
      const bucket = latestByType.get(reading.type) || []
      bucket.push(reading)
      latestByType.set(reading.type, bucket)
    })

    const fuse = (type: SensorReading["type"], sensorId: string, fallback: number) => {
      const grouped = latestByType.get(type)
      if (!grouped || !grouped.length) return fallback

      return this.sensorFusion.fuseSensors(
        grouped.map((reading, index) => ({
          sensorId: `${sensorId}-${index}`,
          value: reading.value,
          weight: reading.confidence,
          confidence: reading.confidence,
        })),
      )
    }

    const hasCardio = latestByType.has("ppg") || latestByType.has("ecg")
    if (hasCardio) {
      this.currentVitals.heartRate = fuse("ppg", "heartRate-ppg", this.currentVitals.heartRate)
      if (latestByType.has("ecg")) {
        this.currentVitals.heartRate = fuse("ecg", "heartRate-ecg", this.currentVitals.heartRate)
      }
    }

    if (latestByType.has("oximeter")) {
      this.currentVitals.spO2 = fuse("oximeter", "spO2", this.currentVitals.spO2)
    }

    if (latestByType.has("thermometer")) {
      this.currentVitals.temperature = fuse("thermometer", "temperature", this.currentVitals.temperature)
    }

    if (latestByType.has("accelerometer")) {
      this.currentVitals.respiratoryRate = fuse("accelerometer", "respiratoryRate", this.currentVitals.respiratoryRate)
    }

    this.currentVitals.timestamp = Date.now()
    this.history.push({ ...this.currentVitals })
    if (this.history.length > 10) {
      this.history.shift()
    }

    return { ...this.currentVitals }
  }

  // Detect overdose indicators
  detectOverdoseIndicators(): OverdoseCheck {
    const indicators: string[] = []
    let riskScore = 0

    const recentVitals = this.history.slice(-5)
    const baselineHeartRate =
      recentVitals.length > 1 ? recentVitals.reduce((sum, item) => sum + item.heartRate, 0) / recentVitals.length : this.baselineHeartRate
    const baselineSpO2 =
      recentVitals.length > 1 ? recentVitals.reduce((sum, item) => sum + item.spO2, 0) / recentVitals.length : this.currentVitals.spO2
    const baselineRespiration =
      recentVitals.length > 1
        ? recentVitals.reduce((sum, item) => sum + item.respiratoryRate, 0) / recentVitals.length
        : this.currentVitals.respiratoryRate

    const respiratoryBreaches = recentVitals.filter((item) => item.respiratoryRate < 12).length
    const oxygenBreaches = recentVitals.filter((item) => item.spO2 < 95).length
    const heartBreaches = recentVitals.filter((item) => item.heartRate < 50 || item.heartRate > 120).length
    const temperatureBreaches = recentVitals.filter((item) => item.temperature < 95).length
    const persistenceSignals = [respiratoryBreaches, oxygenBreaches, heartBreaches, temperatureBreaches].filter((count) => count >= 2).length

    const addIndicator = (message: string, score: number) => {
      indicators.push(message)
      riskScore += score
    }

    // Check for dangerously low respiratory rate (primary opioid overdose indicator)
    if (this.currentVitals.respiratoryRate < 8) {
      addIndicator("Severely depressed respiration (< 8 breaths/min)", 55)
    } else if (this.currentVitals.respiratoryRate < 12) {
      addIndicator("Low respiratory rate", 28)
    }

    // Check for low oxygen saturation
    if (this.currentVitals.spO2 < 90) {
      addIndicator("Low blood oxygen (< 90%)", 42)
    } else if (this.currentVitals.spO2 < 95) {
      addIndicator("Reduced oxygen saturation", 18)
    }

    // Check for abnormal heart rate
    if (this.currentVitals.heartRate < 50) {
      addIndicator("Bradycardia (slow heart rate)", 12)
    } else if (this.currentVitals.heartRate > 120) {
      addIndicator("Tachycardia (rapid heart rate)", 10)
    }

    // Check for abnormal temperature
    if (this.currentVitals.temperature < 95) {
      addIndicator("Hypothermia detected", 8)
    }

    // Trend-based confidence boost or suppression
    if (recentVitals.length >= 2) {
      const heartDrop = baselineHeartRate - this.currentVitals.heartRate
      const spo2Drop = baselineSpO2 - this.currentVitals.spO2
      const respDrop = baselineRespiration - this.currentVitals.respiratoryRate

      if (heartDrop > 15) addIndicator("Heart rate trending downward", 8)
      if (spo2Drop > 3) addIndicator("Oxygen saturation trending downward", 12)
      if (respDrop > 2) addIndicator("Respiration trending downward", 12)
    }

    // Sensor-fusion support rule: require multiple independent signals before escalating hard.
    const supportingSignals = indicators.length
    const consecutiveHighRisk = this.history
      .slice(-3)
      .filter((reading) => reading.respiratoryRate < 12 || reading.spO2 < 95)
      .length

    if (supportingSignals === 1 && riskScore < 35) {
      riskScore -= 8
      indicators.push("Single-signal warning suppressed by fusion gate")
    }

    if (supportingSignals === 1 && persistenceSignals === 0 && recentVitals.length >= 3) {
      riskScore = Math.max(0, riskScore - 12)
      indicators.push("Transient spike rejected by persistence gate")
    }

    if (supportingSignals >= 2 && persistenceSignals >= 1) {
      riskScore += 10
      indicators.push("Multiple sustained signals confirmed")
    }

    if (consecutiveHighRisk >= 2 && persistenceSignals >= 1) {
      riskScore += 14
      indicators.push("Persistent abnormal trend across samples")
    }

    riskScore = Math.max(0, Math.min(100, Math.round(riskScore)))

    let severity: OverdoseCheck["severity"] = "none"
    if (this.currentVitals.respiratoryRate < 8) {
      severity = "critical"
    } else if (riskScore >= 82 && consecutiveHighRisk >= 2 && persistenceSignals >= 1) {
      severity = "critical"
    } else if (riskScore >= 60) {
      severity = "high"
    } else if (riskScore >= 35) {
      severity = "medium"
    } else if (riskScore > 0) {
      severity = "low"
    }

    // Hysteresis: do not fall directly from critical to none on one good sample.
    if (this.lastSeverity === "critical" && severity === "high" && riskScore < 70) {
      severity = "medium"
    }

    this.lastRiskScore = riskScore
    this.lastSeverity = severity

    const confidence = Math.max(
      0.25,
      Math.min(
        0.98,
        0.42 + supportingSignals * 0.09 + consecutiveHighRisk * 0.08 + persistenceSignals * 0.07 + (severity === "critical" ? 0.1 : 0),
      ),
    )

    const recommendedAction: OverdoseCheck["recommendedAction"] =
      severity === "critical"
        ? "activate_emergency"
        : severity === "high"
          ? "prepare_response"
          : severity === "medium"
            ? "increase_observation"
            : "monitor"

    return {
      isAbnormal: severity !== "none",
      severity,
      indicators,
      riskScore,
      confidence: Number(confidence.toFixed(2)),
      recommendedAction,
      supportingSignals,
    }
  }

  // Get current vitals
  getCurrentVitals(): VitalSigns {
    return { ...this.currentVitals }
  }

  // Test fixtures belong in scripts/test-signal-fusion.ts; production never fabricates sensor data.
}
