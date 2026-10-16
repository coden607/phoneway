"use client"

import { useState, useEffect, useCallback } from "react"
import { interpretVitalsResponse, type VitalsResult } from "@/lib/vitals-response"

export interface VitalSigns {
  heartRate: number
  spO2: number
  temperature: number
  respiratoryRate: number
  bloodPressureSystolic: number
  bloodPressureDiastolic: number
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

export type VitalsStatus = "loading" | VitalsResult["status"]

// Shared by every hook instance so components mounted together issue one request, and so an
// explicit "no provider configured" answer is not re-polled for the rest of the page session.
let inflight: Promise<VitalsResult> | null = null
let unavailable: Extract<VitalsResult, { status: "unavailable" }> | null = null

async function requestVitals(): Promise<VitalsResult> {
  try {
    const response = await fetch("/api/vitals", { cache: "no-store" })
    const body: unknown = await response.json().catch(() => null)
    return interpretVitalsResponse(response.ok, body)
  } catch {
    return { status: "error", message: "Vitals could not be loaded." }
  }
}

function loadVitals(): Promise<VitalsResult> {
  if (unavailable) return Promise.resolve(unavailable)
  inflight ??= requestVitals().then((result) => {
    if (result.status === "unavailable") unavailable = result
    return result
  }).finally(() => {
    inflight = null
  })
  return inflight
}

export function useVitals(pollingInterval = 2000) {
  const [vitals, setVitals] = useState<VitalSigns | null>(null)
  const [overdoseCheck, setOverdoseCheck] = useState<OverdoseCheck | null>(null)
  const [status, setStatus] = useState<VitalsStatus>("loading")
  const [message, setMessage] = useState<string | null>(null)

  const apply = useCallback((result: VitalsResult) => {
    setStatus(result.status)
    if (result.status === "live") {
      setVitals(result.vitals)
      setOverdoseCheck(result.overdoseCheck)
      setMessage(null)
    } else {
      // Never keep showing earlier readings as if they were current.
      setVitals(null)
      setOverdoseCheck(null)
      setMessage(result.message)
    }
  }, [])

  const fetchVitals = useCallback(async () => apply(await loadVitals()), [apply])

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const tick = async () => {
      const result = await loadVitals()
      if (cancelled) return
      apply(result)
      if (result.status !== "unavailable") timer = setTimeout(tick, pollingInterval)
    }
    void tick()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [apply, pollingInterval])

  return {
    vitals,
    overdoseCheck,
    status,
    isLoading: status === "loading",
    error: status === "error" ? message : null,
    message,
    refetch: fetchVitals,
  }
}
