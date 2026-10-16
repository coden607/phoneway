"use client"

import { HolographicCard } from "@/components/effects/holographic-card"
import { Heart, Activity, Droplet, Wind, Unplug } from "lucide-react"
import { useVitals } from "@/lib/hooks/use-vitals"
import { BluetoothVitals } from "@/components/dashboard/bluetooth-vitals"

export function VitalsMonitor() {
  const { vitals, overdoseCheck, status, message } = useVitals(2000)

  if (status === "loading") {
    return (
      <HolographicCard className="p-6" glowIntensity="medium">
        <div className="text-center py-8" role="status" aria-live="polite">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin motion-reduce:animate-none mx-auto" aria-hidden="true" />
          <p className="text-sm text-muted-foreground mt-4">Checking for a verified sensor connection…</p>
        </div>
      </HolographicCard>
    )
  }

  if (!vitals) {
    return (
      <HolographicCard className="p-6" glowIntensity="low">
        <div className="text-center py-8 space-y-2" role="status" aria-live="polite" data-testid="vitals-unavailable">
          <Unplug className="w-8 h-8 mx-auto text-muted-foreground" aria-hidden="true" />
          <p className="font-semibold">{status === "unavailable" ? "No live vitals" : "Vitals unavailable"}</p>
          <p className="text-sm text-muted-foreground text-balance">{message}</p>
          <p className="text-sm text-muted-foreground text-balance">NarcoGuard is not monitoring you. If someone may be overdosing, call 911 and give naloxone if available.</p>
        </div>
        <div className="border-t pt-4">
          <BluetoothVitals />
        </div>
      </HolographicCard>
    )
  }

  const getVitalStatus = (value: number, min: number, max: number) => {
    if (value < min || value > max) return "text-red-500"
    return "text-green-500"
  }

  return (
    <HolographicCard className="p-6" glowIntensity={overdoseCheck?.severity === "critical" ? "high" : "medium"}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold font-orbitron">VITAL SIGNS</h3>
          <div
            className={`w-2 h-2 rounded-full pulse-glow ${overdoseCheck?.isAbnormal ? "bg-red-500" : "bg-green-500"}`}
          />
        </div>

        {/* Overdose Warning */}
        {overdoseCheck?.isAbnormal && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 emergency-pulse">
            <p className="text-sm font-bold text-red-500">⚠️ ABNORMAL VITALS - {overdoseCheck.severity.toUpperCase()}</p>
            <p className="text-xs text-red-400 mt-1">
              Risk score: {overdoseCheck.riskScore}/100 • Fusion confidence: {(overdoseCheck.confidence * 100).toFixed(0)}% • Action:{" "}
              {overdoseCheck.recommendedAction.replace(/_/g, " ")}
            </p>
            <ul className="text-xs text-red-400 mt-1 space-y-1">
              {overdoseCheck.indicators.map((indicator, i) => (
                <li key={i}>• {indicator}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Heart Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500 heartbeat" />
              <span className="text-sm text-muted-foreground">Heart Rate</span>
            </div>
            <span className={`text-2xl font-bold ${getVitalStatus(vitals.heartRate, 60, 100)}`}>
              {Math.round(vitals.heartRate)}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-red-500 to-pink-500 pulse-glow transition-all duration-500"
              style={{ width: `${Math.min(100, (vitals.heartRate / 120) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            BPM - {vitals.heartRate >= 60 && vitals.heartRate <= 100 ? "Normal" : "Abnormal"}
          </p>
        </div>

        {/* SpO2 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Blood Oxygen</span>
            </div>
            <span className={`text-2xl font-bold ${getVitalStatus(vitals.spO2, 95, 100)}`}>
              {Math.round(vitals.spO2)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-blue-500 to-cyan-500 pulse-glow transition-all duration-500"
              style={{ width: `${vitals.spO2}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">SpO2 - {vitals.spO2 >= 95 ? "Optimal" : "Low"}</p>
        </div>

        {/* Respiratory Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wind className="w-5 h-5 text-cyan-500" />
              <span className="text-sm text-muted-foreground">Respiration</span>
            </div>
            <span className={`text-2xl font-bold ${getVitalStatus(vitals.respiratoryRate, 12, 20)}`}>
              {Math.round(vitals.respiratoryRate)}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-cyan-500 to-teal-500 pulse-glow transition-all duration-500"
              style={{ width: `${(vitals.respiratoryRate / 30) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Breaths/min - {vitals.respiratoryRate >= 12 && vitals.respiratoryRate <= 20 ? "Normal" : "Critical"}
          </p>
        </div>

        {/* Temperature */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplet className="w-5 h-5 text-orange-500" />
              <span className="text-sm text-muted-foreground">Temperature</span>
            </div>
            <span className={`text-2xl font-bold ${getVitalStatus(vitals.temperature, 97, 99)}`}>
              {vitals.temperature.toFixed(1)}°F
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-orange-500 to-yellow-500 pulse-glow transition-all duration-500"
              style={{ width: `${((vitals.temperature - 96) / 6) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Body Temp - {vitals.temperature >= 97 && vitals.temperature <= 99 ? "Normal" : "Abnormal"}
          </p>
        </div>

        {/* Waveform visualization */}
        <div className="relative h-20 bg-muted/20 rounded-lg overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-full h-full" viewBox="0 0 200 50">
              <path
                d="M0,25 Q10,25 20,15 T40,25 Q50,25 60,35 T80,25 Q90,25 100,15 T120,25 Q130,25 140,35 T160,25 Q170,25 180,15 T200,25"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`${overdoseCheck?.isAbnormal ? "text-red-500" : "text-primary"} pulse-glow`}
              />
            </svg>
          </div>
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-primary/20 to-transparent animate-pulse" />
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Kalman filtering + confidence-weighted fusion + trend gating • Updated {new Date(vitals.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </HolographicCard>
  )
}
