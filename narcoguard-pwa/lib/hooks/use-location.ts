"use client"

import { useState, useEffect, useCallback } from "react"
import { LocationService, type Location } from "@/lib/geolocation"

const locationService = new LocationService()

export function useLocation(trackContinuously = false) {
  const [location, setLocation] = useState<Location | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [permissionState, setPermissionState] = useState<"granted" | "denied" | "prompt">("prompt")

  const updateLocation = useCallback(async (loc: Location) => {
    // Only accept a verified browser-provided location
    setLocation(loc)
    setError(null)
    setIsLoading(false)

    // Send location to backend (silent fail)
    try {
      await fetch("/api/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loc),
      })
    } catch {
      // Silent fail for backend sync
    }
  }, [])

  // Requests a location. Every state update happens in a promise callback, never synchronously
  // in the caller; isLoading starts true, so the initial request needs no state change first.
  const requestLocation = useCallback(
    () =>
      locationService
        .getCurrentLocation()
        .then(async (loc) => {
          if (!loc) {
            setLocation(null)
            setError("Location unavailable")
            return
          }

          await updateLocation(loc)

          // Only set permission granted if we got real coordinates
          if (loc.accuracy < 1000) {
            setPermissionState("granted")
          }

          setError(null)
        })
        .catch((err: unknown) => {
          // The provider can be unavailable or permission may be denied
          const errorMessage = err instanceof Error ? err.message : "Location unavailable"

          if (errorMessage.includes("denied") || errorMessage.includes("permission")) {
            setPermissionState("denied")
          }

          // Preserve only a previously verified location
          setError(errorMessage)
          setLocation(locationService.getLastLocation())
        })
        .finally(() => {
          setIsLoading(false)
        }),
    [updateLocation],
  )

  const refresh = useCallback(() => {
    setIsLoading(true)
    return requestLocation()
  }, [requestLocation])

  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          setPermissionState(result.state as "granted" | "denied" | "prompt")

          result.addEventListener("change", () => {
            setPermissionState(result.state as "granted" | "denied" | "prompt")
          })
        })
        .catch(() => {
          // Permission API not supported, assume prompt
          setPermissionState("prompt")
        })
    }

    // Get initial location
    void requestLocation()

    if (trackContinuously) {
      const startDelay = setTimeout(() => {
        locationService.startTracking(updateLocation)
      }, 3000) // Give time for initial location request

      return () => {
        clearTimeout(startDelay)
        locationService.stopTracking()
      }
    }
  }, [trackContinuously, requestLocation, updateLocation])

  return {
    location,
    isLoading,
    error,
    permissionState,
    refresh,
    locationService,
  }
}
