// Analytics and tracking for production

export class Analytics {
  private static instance: Analytics

  private constructor() {}

  static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics()
    }
    return Analytics.instance
  }

  // Track page views
  trackPageView(page: string) {
    if (typeof window !== "undefined" && (window as any).gtag) {
      ;(window as any).gtag("config", process.env.NEXT_PUBLIC_GA_ID, {
        page_path: page,
      })
    }
  }

  // Track emergency activations (critical metric)
  trackEmergency(data: {
    type: string
    location?: { latitude: number; longitude: number }
    responseTime?: number
  }) {
    if (typeof window !== "undefined") {
      // Send to analytics
      if ((window as any).gtag) {
        ;(window as any).gtag("event", "emergency_activation", {
          event_category: "Emergency",
          event_label: data.type,
          value: data.responseTime || 0,
        })
      }

      // Log to API for monitoring
      fetch("/api/analytics/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).catch(console.error)
    }
  }

  // Track hero responses
  trackHeroResponse(heroId: string, responseTime: number) {
    if (typeof window !== "undefined" && (window as any).gtag) {
      ;(window as any).gtag("event", "hero_response", {
        event_category: "Hero Network",
        event_label: heroId,
        value: responseTime,
      })
    }
  }

  // Track vitals anomalies
  trackVitalsAnomaly(type: string, severity: "low" | "medium" | "high" | "critical") {
    if (typeof window !== "undefined" && (window as any).gtag) {
      ;(window as any).gtag("event", "vitals_anomaly", {
        event_category: "Vitals",
        event_label: type,
        value: severity === "critical" ? 4 : severity === "high" ? 3 : severity === "medium" ? 2 : 1,
      })
    }
  }

  // Track training completion
  trackTrainingComplete(module: string) {
    if (typeof window !== "undefined" && (window as any).gtag) {
      ;(window as any).gtag("event", "training_complete", {
        event_category: "Training",
        event_label: module,
      })
    }
  }
}

export const analytics = Analytics.getInstance()
