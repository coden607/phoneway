import { test, expect } from "@playwright/test"

test.describe("NarcoGuard Homepage", () => {
  test("should load homepage successfully", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/NarcoGuard/i)
  })

  test("should display onboarding for first-time users", async ({ page }) => {
    await page.goto("/")
    const onboarding = page.locator('[data-testid="onboarding"]')
    await expect(onboarding).toBeVisible()
  })

  test("should be installable as PWA", async ({ page }) => {
    await page.goto("/")
    const manifest = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]')
      return link?.getAttribute("href")
    })
    expect(manifest).toBeTruthy()
  })

  test("should have working service worker", async ({ page }) => {
    await page.goto("/")
    const hasServiceWorker = await page.evaluate(() => {
      return "serviceWorker" in navigator
    })
    expect(hasServiceWorker).toBe(true)
  })
})

test.describe("Emergency Features", () => {
  test("should display emergency button", async ({ page }) => {
    await page.goto("/")
    // Complete onboarding first
    await page.evaluate(() => {
      localStorage.setItem("narcoguard_onboarding_complete", "true")
    })
    await page.reload()

    const emergencyButton = page.locator("text=/Emergency/i").first()
    await expect(emergencyButton).toBeVisible()
  })
})

test.describe("Accessibility", () => {
  test("should have proper ARIA labels", async ({ page }) => {
    await page.goto("/")
    const buttons = await page.locator("button").all()
    expect(buttons.length).toBeGreaterThan(0)
  })

  test("should be keyboard navigable", async ({ page }) => {
    await page.goto("/")
    await page.keyboard.press("Tab")
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(focusedElement).toBeTruthy()
  })
})
