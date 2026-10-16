import { InstallPrompt } from "@/components/pwa/install-prompt"
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register"
import type React from "react"
import type { Metadata, Viewport } from "next"
import { Orbitron, Inter } from "next/font/google"
import Script from "next/script"
import { Analytics } from "@vercel/analytics/next"
import { SiteChrome } from "@/components/site-chrome"
import { SITE_URL } from "@/lib/site-url"
import "./globals.css"

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron-face",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter-face",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "NarcoGuard NG - Overdose-Prevention Wearable Concept",
  description:
    "Explore the NarcoGuard NG public software demo and early overdose-prevention wearable concept. Hardware and medical capabilities require engineering, clinical, and regulatory validation.",
  generator: "v0.app",
  manifest: "/manifest.webmanifest",
  keywords: [
    "naloxone",
    "overdose prevention",
    "auto-injection",
    "wearable technology",
    "NG",
    "NarcoGuard",
    "harm reduction",
    "life-saving",
    "AI health monitoring",
  ],
  authors: [{ name: "Stephen Blanford" }],
  creator: "Stephen Blanford",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NarcoGuard NG",
  },
  openGraph: {
    title: "NarcoGuard NG - Overdose-Prevention Wearable Concept",
    description: "Explore the public demo and help support responsible prototype development and validation.",
    type: "website",
    siteName: "NarcoGuard",
  },
  twitter: {
    card: "summary_large_image",
    title: "NarcoGuard NG - Overdose-Prevention Wearable Concept",
    description: "Explore the public demo and help support responsible prototype development and validation.",
  },
}

export const viewport: Viewport = {
  themeColor: "#00d9ff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${orbitron.variable}`}>
      <head>
        <Script id="narcoguard-sw" strategy="beforeInteractive">{`if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined)`}</Script>
        {/* Chromium fires beforeinstallprompt once, often before React hydrates; keep it for the install button. */}
        <Script id="narcoguard-install" strategy="beforeInteractive">{`addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); window.__ngInstallPrompt = e; dispatchEvent(new Event("ng-installprompt")) })`}</Script>
        <link rel="icon" href="/icon-dark-32x32.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/icon-192.png" sizes="192x192" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-sans antialiased">
        <SiteChrome>{children}</SiteChrome>
        {process.env.VERCEL ? <Analytics /> : null}
        <InstallPrompt />
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
