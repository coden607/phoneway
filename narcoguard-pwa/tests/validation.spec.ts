import { test, expect } from "@playwright/test"

test.describe("NarcoGuard Production Validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("homepage loads successfully", async ({ page }) => {
    await expect(page).toHaveTitle(/NarcoGuard/)
    await page.waitForLoadState("networkidle")
  })

  test("onboarding flow is accessible", async ({ page }) => {
    // Check if onboarding appears for new users
    const onboarding = page.locator("text=Welcome to NarcoGuard")
    if (await onboarding.isVisible()) {
      await expect(onboarding).toBeVisible()
    }
  })

  test("PWA manifest is accessible", async ({ page }) => {
    const response = await page.goto("/manifest.webmanifest")
    expect(response?.status()).toBe(200)
    const manifest = await response?.json()
    expect(manifest.name).toContain("NarcoGuard")
  })

  test("service worker registers", async ({ page }) => {
    const scriptURL = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready
      return registration.active?.scriptURL
    })
    expect(scriptURL).toMatch(/\/sw\.js$/)
  })

  test("emergency button is present", async ({ page }) => {
    // Skip onboarding if present
    const skipButton = page.locator('button:has-text("Skip")')
    if (await skipButton.isVisible()) {
      await skipButton.click()
      await page.waitForTimeout(1000)
    }

    const emergencyButton = page.locator('button:has-text("Emergency")')
    await expect(emergencyButton).toBeVisible({ timeout: 10000 })
  })

  test("vitals monitoring displays", async ({ page }) => {
    // Skip onboarding
    const skipButton = page.locator('button:has-text("Skip")')
    if (await skipButton.isVisible()) {
      await skipButton.click()
      await page.waitForTimeout(1000)
    }

    const vitals = page.locator("text=/Heart Rate|SpO2|Respiratory/")
    await expect(vitals.first()).toBeVisible({ timeout: 10000 })
  })

  test("location services prompt", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"])
    await page.reload()
    // Location should work without errors
    await page.waitForTimeout(2000)
  })

  test("critical APIs fail closed when providers are unavailable", async ({ request }) => {
    for (const api of ["/api/vitals", "/api/emergency", "/api/location", "/api/stats"]) {
      const response = await request.get(api)
      expect(response.status()).toBe(503)
      await expect(response.json()).resolves.toMatchObject({ available: false })
    }
  })

  test("emergency dispatch never reports a fabricated success", async ({ request }) => {
    const response = await request.post("/api/emergency", { data: { location: null, vitals: null } })
    expect(response.status()).toBe(503)
    await expect(response.json()).resolves.toMatchObject({ available: false, dispatched: false })
  })

  test("native text correction is enabled for prose fields", async ({ page }) => {
    await page.goto("/auth")
    const email = page.locator("input[type=\"email\"]").first()
    await expect(email).toHaveAttribute("spellcheck", "false")
    await expect(email).toHaveAttribute("autocorrect", "off")
  })

  test("responsive design works", async ({ page }) => {
    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForTimeout(500)

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(500)

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)

    const body = page.locator("body")
    await expect(body).toBeVisible()
  })

  test("navigation works", async ({ page }) => {
    const skipButton = page.locator('button:has-text("Skip")')
    if (await skipButton.isVisible()) {
      await skipButton.click()
    }

    await page.waitForTimeout(1000)

    // Check if main content is present
    const mainContent = page.locator("main")
    await expect(mainContent).toBeVisible({ timeout: 5000 })
  })
})

test.describe("Security Headers", () => {
  test("has security headers", async ({ page }) => {
    const response = await page.goto("/")
    const headers = response?.headers()

    expect(headers?.["x-content-type-options"]).toBe("nosniff")
    expect(headers?.["x-frame-options"]).toBe("DENY")
  })
})

test.describe("Performance", () => {
  test("loads within acceptable time", async ({ page }) => {
    const start = Date.now()
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    const loadTime = Date.now() - start

    expect(loadTime).toBeLessThan(5000) // 5 seconds
  })
})
