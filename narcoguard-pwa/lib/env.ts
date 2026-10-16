import { SITE_URL } from "@/lib/site-url"

export const env = {
  // App Configuration
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || "NarcoGuard",
  APP_URL: SITE_URL,
  API_URL: process.env.NEXT_PUBLIC_API_URL || "/api",
  GOFUNDME_URL: process.env.NEXT_PUBLIC_GOFUNDME_URL || "https://gofund.me/9acf270ea",
  INVESTOR_URL:
    process.env.NEXT_PUBLIC_INVESTOR_CONTACT_URL ||
    "mailto:narcoguard607@gmail.com?subject=NarcoGuard%20investment%20inquiry",

  // Feature Flags
  ENABLE_LOCATION: process.env.NEXT_PUBLIC_ENABLE_LOCATION_TRACKING !== "false",
  ENABLE_VITALS: process.env.NEXT_PUBLIC_ENABLE_VITALS_MONITORING !== "false",
  ENABLE_EMERGENCY: process.env.NEXT_PUBLIC_ENABLE_EMERGENCY_ALERTS !== "false",
  ENABLE_HERO_NETWORK: process.env.NEXT_PUBLIC_ENABLE_HERO_NETWORK !== "false",
  ENABLE_AR: process.env.NEXT_PUBLIC_ENABLE_AR_GUIDANCE !== "false",

  // Demo mode is UI-only; production APIs return unavailable until real providers connect.
  MOCK_MODE:
    !(
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.SUPABASE_DB_URL
    ) && !process.env.NG_WATCH_API_KEY,

  // External Services (with mock fallbacks) - Server-side only
  TWILIO_SID: process.env.TWILIO_ACCOUNT_SID || "",
  TWILIO_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
  TWILIO_PHONE: process.env.TWILIO_PHONE_NUMBER || "",
  SENDGRID_KEY: process.env.SENDGRID_API_KEY || "",
  OPENAI_KEY: process.env.OPENAI_API_KEY || "",

  // Database
  DATABASE_URL:
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.SUPABASE_DB_URL ||
    "",

  // NG Watch Integration
  NG_WATCH_KEY: process.env.NG_WATCH_API_KEY || "",
  NG_WATCH_ENDPOINT: process.env.NG_WATCH_ENDPOINT || "",

  // Hero Network
  HERO_NETWORK_KEY: process.env.HERO_NETWORK_API_KEY || "",

  // Environment
  IS_PRODUCTION: process.env.NODE_ENV === "production",
  IS_DEVELOPMENT: process.env.NODE_ENV === "development",
} as const

// Helper to check if running with mock data
export const isMockMode = () => env.MOCK_MODE

// Helper to get safe env values for client
export const getClientEnv = () => ({
  APP_NAME: env.APP_NAME,
  APP_URL: env.APP_URL,
  ENABLE_LOCATION: env.ENABLE_LOCATION,
  ENABLE_VITALS: env.ENABLE_VITALS,
  ENABLE_EMERGENCY: env.ENABLE_EMERGENCY,
  ENABLE_HERO_NETWORK: env.ENABLE_HERO_NETWORK,
  ENABLE_AR: env.ENABLE_AR,
  MOCK_MODE: env.MOCK_MODE,
})
