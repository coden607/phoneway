// How this browser can install the app. Only Chromium browsers (Chrome, Edge, Samsung Internet,
// Android) expose a one-tap install prompt; Safari on iPhone and iPad has no API for it, so those
// people get step-by-step Add to Home Screen instructions instead.

export type InstallMethod = "prompt" | "ios" | "ios-in-app" | "mac-safari" | "none"

export interface BrowserInfo {
  userAgent: string
  maxTouchPoints: number
  /** Whether a beforeinstallprompt event has been captured. */
  canPrompt: boolean
}

const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|Snapchat|TikTok|musical_ly|Line\/|LinkedInApp|Twitter|GSA\//

export function isAppleMobile({ userAgent, maxTouchPoints }: Pick<BrowserInfo, "userAgent" | "maxTouchPoints">): boolean {
  // iPadOS reports a Mac user agent, so a touch screen is what tells them apart.
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
}

export function installMethod(info: BrowserInfo): InstallMethod {
  if (info.canPrompt) return "prompt"
  if (isAppleMobile(info)) return IN_APP.test(info.userAgent) ? "ios-in-app" : "ios"
  const desktopSafari = /Macintosh/.test(info.userAgent) && /Version\/\d+.*Safari\//.test(info.userAgent) && !/Chrome|Chromium|CriOS|Edg|OPR|Firefox/.test(info.userAgent)
  if (desktopSafari) return "mac-safari"
  return "none"
}
