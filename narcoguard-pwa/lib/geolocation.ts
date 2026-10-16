export interface Location {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

export interface LocationWithAddress extends Location {
  address?: string
  city?: string
  state?: string
  zipCode?: string
}

export class LocationService {
  private watchId: number | null = null
  private currentLocation: Location | null = null
  private onLocationUpdate?: (location: Location) => void
  private retryCount = 0
  private maxRetries = 3
  private lastSuccessfulUpdate = 0
  private isTracking = false

  // Get current location only from the browser geolocation provider
  async getCurrentLocation(): Promise<Location | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }

      // Return cached location if recent
      if (this.currentLocation && Date.now() - this.lastSuccessfulUpdate < 120000) {
        resolve(this.currentLocation)
        return
      }

      // Set a shorter timeout to fail fast
      const timeoutId = setTimeout(() => {
        resolve(this.currentLocation)
      }, 5000)

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId)
          const location: Location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          }
          this.currentLocation = location
          this.lastSuccessfulUpdate = Date.now()
          resolve(location)
        },
        () => {
          clearTimeout(timeoutId)

          // Always resolve with something - never reject
          resolve(this.currentLocation)
        },
        {
          enableHighAccuracy: false,
          timeout: 4000,
          maximumAge: 120000, // Accept 2-minute-old positions
        },
      )
    })
  }


  // Start continuous location tracking - with graceful degradation
  startTracking(callback: (location: Location) => void) {
    if (!navigator.geolocation) {
      // No browser provider means location is unavailable
      return
    }

    if (this.isTracking) return

    this.isTracking = true
    this.onLocationUpdate = callback

    // Try to get initial location
    this.getCurrentLocation().then((location) => {
      if (location) callback(location)
    })

    // Start watching - but silently handle failures
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        }
        this.currentLocation = location
        this.lastSuccessfulUpdate = Date.now()
        this.retryCount = 0


        callback(location)
      },
      (error) => {
        // Silently handle errors - use cached location only
        if (error.code === error.PERMISSION_DENIED) {
          this.stopTracking()
          return
        } else {
          // For timeout or unavailable errors, use cached location
          const locationToUse = this.currentLocation
          if (locationToUse) callback(locationToUse)
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 60000, // Very long timeout
        maximumAge: 300000, // Accept 5-minute-old positions
      },
    )
  }

  // Stop tracking
  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }
    this.isTracking = false
  }

  // Get last known location, if available
  getLastLocation(): Location | null {
    return this.currentLocation
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(loc1: Location, loc2: Location): number {
    const R = 6371 // Earth's radius in km
    const dLat = this.toRad(loc2.latitude - loc1.latitude)
    const dLon = this.toRad(loc2.longitude - loc1.longitude)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(loc1.latitude)) *
        Math.cos(this.toRad(loc2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c // Distance in km
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  // Get human-readable address (using reverse geocoding)
  async getAddress(location: Location): Promise<LocationWithAddress> {
    try {
      // Using OpenStreetMap Nominatim for reverse geocoding (free, no API key needed)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}&zoom=18&addressdetails=1`,
        { signal: AbortSignal.timeout(5000) }, // 5 second timeout
      )

      if (!response.ok) throw new Error("Geocoding failed")

      const data = await response.json()

      return {
        ...location,
        address: data.display_name,
        city: data.address?.city || data.address?.town || data.address?.village,
        state: data.address?.state,
        zipCode: data.address?.postcode,
      }
    } catch {
      // Silently fail and return location without address
      return location
    }
  }
}
