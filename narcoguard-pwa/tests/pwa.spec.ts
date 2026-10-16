import { expect, test } from "@playwright/test"

test.describe("PWA production flow", () => {
  test("primary navigation links resolve to existing pages", async ({ page, request }) => {
    await page.goto("/privacy")

    const hrefs = await page.locator('nav[aria-label="Primary navigation"] a').evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")),
    )
    expect(hrefs.length).toBeGreaterThan(0)

    for (const href of hrefs) {
      const response = await request.get(href!)
      expect(response.status(), `${href} should not 404`).toBe(200)
    }
  })

  test("emergency and outline buttons keep their own readable backgrounds", async ({ page }) => {
    await page.goto("/ar")

    const cpr = page.getByRole("button", { name: "Start CPR Guide" })
    await expect(cpr).toBeVisible()
    const cprStyle = await cpr.evaluate((element) => {
      const style = getComputedStyle(element)
      return { image: style.backgroundImage, color: style.backgroundColor }
    })
    expect(cprStyle.image, "emergency button must not be covered by the default gradient").toBe("none")
    expect(cprStyle.color).not.toBe("rgba(0, 0, 0, 0)")

    await page.goto("/hero-signup")
    const outline = page.getByRole("button", { name: "Preview Training Modules" })
    await expect(outline).toBeVisible()
    expect(await outline.evaluate((element) => getComputedStyle(element).backgroundImage)).toBe("none")
  })

  test("dashboard states that no live vitals exist and stops polling an unconfigured provider", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("narcoguard_preferences", JSON.stringify({ hasCompletedOnboarding: true })))
    let vitalsRequests = 0
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/vitals") vitalsRequests++
    })

    await page.goto("/")
    const unavailable = page.getByTestId("vitals-unavailable")
    await expect(unavailable).toBeVisible()
    await expect(unavailable).toContainText("No live vitals")
    await expect(unavailable).toContainText("call 911")
    await expect(page.getByText("Initializing sensors")).toHaveCount(0)

    await page.waitForTimeout(5000)
    expect(vitalsRequests).toBe(1)
  })

  test("decorative motion stops when the person asks for reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/fund")
    const pulse = page.getByText("Overdose prevention deserves careful, evidence-led innovation").locator("..")
    await expect(pulse).toBeVisible()

    const samples: string[] = []
    for (let i = 0; i < 4; i++) {
      samples.push(await pulse.evaluate((element) => getComputedStyle(element).transform))
      await page.waitForTimeout(300)
    }
    expect(new Set(samples).size, `transform changed over time: ${samples.join(" | ")}`).toBe(1)
  })

  test("skipping and resuming setup follows saved preferences across reloads", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Skip Setup (Demo Mode)" }).click()
    await page.getByRole("button", { name: "Continue to Demo Mode" }).click()
    await expect(page.getByText("Demo Mode Active")).toBeVisible()

    await page.reload()
    await expect(page.getByText("Demo Mode Active")).toBeVisible()

    await page.getByRole("button", { name: "Complete Setup" }).click()
    await expect(page.getByRole("button", { name: "Skip Setup (Demo Mode)" })).toBeVisible()
  })

  test("the emergency button offers real actions and texts confirmed contacts only after a preview", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.addInitScript(() => localStorage.setItem("narcoguard_preferences", JSON.stringify({ hasCompletedOnboarding: true })))
    await page.goto("/")
    const trigger = page.getByRole("button", { name: /emergency options/i })
    await trigger.click()
    const modal = page.getByTestId("emergency-modal")
    await expect(modal.getByRole("link", { name: "Call 911" })).toHaveAttribute("href", "tel:911")
    await expect(modal).toContainText("Give naloxone (Narcan): one spray in one nostril.")
    await expect(modal.getByRole("link", { name: "Set them up" })).toHaveAttribute("href", "/contacts")
    await expect(modal).not.toContainText(/demo/i)
    await page.keyboard.press("Escape")

    const sent: unknown[] = []
    await page.route("**/api/contacts", (route) => route.fulfill({ json: { available: true } }))
    await page.route("**/api/alerts", async (route) => {
      sent.push(route.request().postDataJSON())
      await route.fulfill({ json: { results: [{ name: "Mary", masked: "(•••) •••-1234", state: "pending", label: "Sending…", statusToken: "t1" }] } })
    })
    await page.route("**/api/alerts/status", (route) => route.fulfill({ json: { statuses: [{ token: "t1", state: "delivered", label: "Delivered" }] } }))
    await page.evaluate(() => localStorage.setItem("narcoguard_emergency_contacts_v1", JSON.stringify({ senderName: "Steve", contacts: [{ id: "1", name: "Mary", masked: "(•••) •••-1234", status: "confirmed", proof: "proof-1", addedAt: 1 }] })))
    await page.reload()
    await trigger.click()
    await page.getByRole("button", { name: "Text Mary" }).click()
    await expect(page.getByTestId("emergency-alert-preview")).toContainText("NarcoGuard alert: Steve pressed their help button")
    await page.getByLabel("Include my current location").uncheck()
    expect(sent).toHaveLength(0)
    await page.getByRole("button", { name: "Send now" }).click()
    await expect(page.getByTestId("emergency-deliveries")).toContainText("Delivered", { timeout: 10_000 })
    expect(sent).toEqual([{ proofs: ["proof-1"], test: false }])
  })

  test("mobile navigation closes after navigating", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/privacy")
    const toggle = page.getByRole("button", { name: "Toggle navigation" })
    await toggle.click()
    await expect(toggle).toHaveAttribute("aria-expanded", "true")

    await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Training" }).click()
    await expect(page).toHaveURL(/\/ar$/)
    await expect(toggle).toHaveAttribute("aria-expanded", "false")
  })

  test("robots and sitemap list only real public pages on the canonical host", async ({ page, request }) => {
    const robots = await request.get("/robots.txt")
    expect(robots.ok()).toBeTruthy()
    const robotsText = await robots.text()
    expect(robotsText).toContain("Disallow: /api/")
    expect(robotsText).toContain("Sitemap: https://www.narcoguard.app/sitemap.xml")

    const sitemap = await request.get("/sitemap.xml")
    expect(sitemap.ok()).toBeTruthy()
    const urls = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
    expect(urls.length).toBeGreaterThan(5)
    for (const url of urls) {
      expect(url.startsWith("https://www.narcoguard.app")).toBeTruthy()
      const path = new URL(url).pathname
      expect((await request.get(path)).status(), `${path} should load`).toBe(200)
    }

    // A site-wide canonical of "/" would mark every page as a duplicate of the homepage.
    await page.goto("/watch")
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
  })

  test("serves a valid install manifest and icons", async ({ page, request }) => {
    await page.goto("/")

    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href")
    expect(manifestHref).toBe("/manifest.webmanifest")

    const response = await request.get(manifestHref!)
    expect(response.ok()).toBeTruthy()
    expect(response.headers()["content-type"]).toContain("application/manifest+json")

    const manifest = await response.json()
    expect(manifest.start_url).toBe("/")
    expect(manifest.display).toBe("standalone")
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: "/icon-192.png", sizes: "192x192" }),
        expect.objectContaining({ src: "/icon-512.png", sizes: "512x512" }),
        expect.objectContaining({ src: "/icon-maskable-512.png", sizes: "512x512", purpose: "maskable" }),
      ]),
    )

    for (const icon of manifest.icons) {
      const iconResponse = await request.get(icon.src)
      expect(iconResponse.ok(), `${icon.src} should load`).toBeTruthy()
      expect(iconResponse.headers()["content-type"]).toContain("image/png")
    }
  })

  test("registers and activates the root service worker", async ({ page }) => {
    await page.goto("/")
    const registration = await page.evaluate(async () => {
      const timeoutPromise: Promise<never> = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Service worker registration timeout")), 10000),
      )
      try {
        const ready = (await Promise.race([navigator.serviceWorker.ready, timeoutPromise])) as ServiceWorkerRegistration
        return { scope: ready.scope, scriptURL: ready.active?.scriptURL }
      } catch (error) {
        console.error("Service worker error:", error)
        const registrations = await navigator.serviceWorker.getRegistrations()
        console.error("Registrations found:", registrations.length)
        throw error
      }
    })

    expect(registration.scope).toBe("http://localhost:3000/")
    expect(registration.scriptURL).toBe("http://localhost:3000/sw.js")
  })

  test("serves the offline fallback after installation", async ({ page, context }) => {
    await page.goto("/")
    await page.evaluate(async () => {
      const timeoutPromise: Promise<never> = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Service worker registration timeout")), 10000),
      )
      try {
        await Promise.race([navigator.serviceWorker.ready, timeoutPromise])
      } catch (error) {
        console.error("Service worker error:", error)
        const registrations = await navigator.serviceWorker.getRegistrations()
        console.error("Registrations found:", registrations.length)
        throw error
      }
    })
    await page.reload()
    // A ready registration can exist before this page is controlled by it.
    await page.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.endsWith("/sw.js"))
    expect(await page.evaluate(async () => Boolean(await caches.match("/offline.html")))).toBe(true)

    await context.setOffline(true)
    await page.goto("/offline-check")
    await expect(page.getByRole("heading", { name: "You're Offline" })).toBeVisible()
    await context.setOffline(false)
  })

  test("Guardian needs planner requires consent and can be paused and erased", async ({ page }) => {
    await page.goto("/stability")
    await expect(page.getByRole("heading", { name: "Guardian Stability" })).toBeVisible()
    await expect(page.getByLabel("Food status")).toHaveCount(0)

    await page.getByRole("button", { name: "Enable my private planner" }).click()
    await page.getByLabel("Food status").selectOption("needs-help")
    await page.getByLabel("Hours slept last night").fill("7")
    const nextStep = page.locator("section", { has: page.getByRole("heading", { name: "Find a next step" }) })
    await expect(nextStep.getByRole("link", { name: /Find local help through 211/ })).toBeVisible()
    await page.getByLabel("Task or appointment").fill("Visit pantry")
    await page.getByLabel("Plan time").fill("09:00")
    await page.getByLabel("Plan location").fill("Community pantry")
    await page.getByLabel("Plan need").selectOption("food")
    await page.getByRole("button", { name: "Add to plan" }).click()
    await expect(page.getByText(/Visit pantry/)).toBeVisible()
    await expect(page.getByText(/appointment at/)).toBeVisible()

    await page.getByRole("button", { name: "Pause" }).click()
    await expect(page.getByLabel("Food status")).toBeDisabled()
    await page.reload()
    await expect(page.getByLabel("Food status")).toBeDisabled()
    await page.getByRole("button", { name: "Resume" }).click()
    await expect(page.getByLabel("Food status")).toHaveValue("needs-help")

    page.once("dialog", (dialog) => dialog.accept())
    await page.getByRole("button", { name: "Erase all Guardian data" }).click()
    await expect(page.getByRole("button", { name: "Enable my private planner" })).toBeVisible()
  })

  test("meal log is optional, calorie-free, survives reload, pauses and erases with the planner", async ({ page }) => {
    await page.goto("/stability")
    await page.getByRole("button", { name: "Enable my private planner" }).click()
    const meals = page.getByRole("list", { name: "Meals logged today" })

    await expect(page.getByRole("heading", { name: "Meals today (optional)" })).toBeVisible()
    await expect(page.getByText(/calorie/i)).toContainText("no calories")
    // Food help is shown without logging anything first.
    const mealSection = page.getByRole("region", { name: "Meals today (optional)" })
    await expect(mealSection.getByRole("link", { name: /Find local help through 211/ })).toBeVisible()

    await page.getByLabel("Meal type").selectOption("lunch")
    await page.getByLabel("What you had (optional)").fill("Soup at the center")
    await page.getByRole("button", { name: "Add meal" }).click()
    await expect(meals).toContainText("Lunch: Soup at the center")
    await expect(page.getByTestId("meal-summary")).toContainText("checked in on 1 day and logged a meal on 1 of them")
    await expect(page.getByLabel("Food status")).toHaveValue("")

    await page.reload()
    await expect(meals).toContainText("Lunch: Soup at the center")

    await page.getByRole("button", { name: "Pause" }).click()
    await expect(page.getByRole("button", { name: "Add meal" })).toBeDisabled()
    await page.getByRole("button", { name: "Resume" }).click()

    await page.getByRole("button", { name: "Remove Lunch: Soup at the center" }).click()
    await expect(meals).toHaveCount(0)
    await page.getByRole("button", { name: "Add meal" }).click()
    page.once("dialog", (dialog) => dialog.accept())
    await page.getByRole("button", { name: "Erase all Guardian data" }).click()
    await page.getByRole("button", { name: "Enable my private planner" }).click()
    await expect(meals).toHaveCount(0)
  })

  test("one search finds every level of need, shows sourced listings with call-first notes, and keeps directory fallbacks", async ({ page }) => {
    const requested: string[] = []
    const fallback = [{ title: "Find local help through 211", url: "https://www.211.org/get-help" }]
    await page.route("**/api/resources/needs**", async (route) => {
      requested.push(new URL(route.request().url()).search)
      await route.fulfill({ json: {
        status: "partial",
        message: "One directory did not respond, so some needs show directories instead of listings.",
        fetchedAt: new Date().toISOString(),
        kinds: {
          food: { status: "ok", fallback, results: [{ name: "Test Food Pantry", kind: "food", address: "1 Main St", phone: "518-555-0100", hours: "Mo-Fr 09:00-17:00", distanceMiles: 0.8, lat: 42.65, lon: -73.75, source: "OpenStreetMap contributors" }] },
          water: { status: "ok", fallback, results: [] },
          treatment: { status: "unavailable", fallback: [{ title: "Search FindTreatment.gov", url: "https://findtreatment.gov/" }, ...fallback], results: [] },
        },
      } })
    })
    await page.goto("/help")
    const search = page.getByTestId("needs-finder")
    await search.getByLabel("ZIP code").fill("122")
    await search.getByRole("button", { name: "Search" }).click()
    await expect(search.getByText("Enter a five-digit US ZIP code.")).toBeVisible()
    expect(requested).toHaveLength(0)

    await search.getByLabel("ZIP code").fill("12207")
    await search.getByRole("button", { name: "Search" }).click()
    for (const level of ["Basic needs", "Health and safety", "Recovery and connection", "Growth and goals"]) {
      await expect(search.getByRole("heading", { name: level })).toBeVisible()
    }
    await expect(search.getByText("One directory did not respond")).toBeVisible()
    const food = search.getByTestId("need-food")
    await expect(food).toContainText("1 nearby · closest 0.8 mi")
    await food.locator("summary").click()
    await expect(food.getByText("Test Food Pantry")).toBeVisible()
    await expect(food.getByText("Listed hours: Mo-Fr 09:00-17:00 (may be out of date)")).toBeVisible()
    await expect(food.getByRole("link", { name: "Call 518-555-0100" })).toHaveAttribute("href", "tel:5185550100")
    await expect(food.getByText(/Source: OpenStreetMap contributors\. .*call first/)).toBeVisible()
    await expect(search.getByTestId("need-water")).toContainText("none listed nearby")
    const treatment = search.getByTestId("need-treatment")
    await treatment.locator("summary").click()
    await expect(treatment.getByText("Live listings are unavailable right now.")).toBeVisible()
    await expect(treatment.getByRole("link", { name: "Search FindTreatment.gov" })).toBeVisible()
    // Kinds missing from the response still offer 211.
    const jobs = search.getByTestId("need-jobs")
    await jobs.locator("summary").click()
    await expect(jobs.getByRole("link", { name: "Find local help through 211" })).toBeVisible()
    expect(requested).toEqual(["?zip=12207"])
  })

  test("Find everything near me uses one location reading and says when permission is denied", async ({ page, context }) => {
    const requested: string[] = []
    await page.route("**/api/resources/needs**", async (route) => {
      requested.push(new URL(route.request().url()).search)
      await route.fulfill({ json: { status: "ok", fetchedAt: new Date().toISOString(), kinds: {} } })
    })
    // Headless Chromium never answers a permission prompt, so the denial is simulated.
    await page.addInitScript(() => {
      const real = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation)
      let calls = 0
      navigator.geolocation.getCurrentPosition = (success, failure, options) => {
        if (calls++ === 0) failure?.({ code: 1, message: "denied", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError)
        else real(success, failure, options)
      }
    })
    await page.goto("/help")
    const search = page.getByTestId("needs-finder")
    await search.getByRole("button", { name: "Find everything near me" }).click()
    await expect(search.getByText("Location permission was not given. Enter a ZIP code instead.")).toBeVisible()
    expect(requested).toHaveLength(0)

    await context.grantPermissions(["geolocation"])
    await context.setGeolocation({ latitude: 42.6526, longitude: -73.7562 })
    await search.getByRole("button", { name: "Find everything near me" }).click()
    await expect(search.getByRole("heading", { name: "Basic needs" })).toBeVisible()
    expect(requested).toEqual(["?lat=42.6526&lon=-73.7562"])
  })

  test("Angel AI says when it is not configured and the search still works without it", async ({ page }) => {
    await page.goto("/angel")
    await expect(page.getByTestId("angel-unavailable")).toBeVisible()
    await expect(page.getByTestId("needs-finder")).toBeVisible()
  })

  test("Angel AI requires consent and shows the 911 notice for an overdose message regardless of the reply", async ({ page }) => {
    let body: { messages?: { role: string; content: string }[] } | undefined
    await page.route("**/api/angel", async (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: { available: true, provider: "Groq" } })
      body = route.request().postDataJSON()
      await route.fulfill({ json: { available: true, notices: ["If someone may be overdosing or isn't breathing: call 911 now, give naloxone (Narcan) if you have it, and stay with them."], reply: "Call 911 now." } })
    })
    await page.goto("/angel")
    await expect(page.getByLabel("Message Angel")).toHaveCount(0)
    await page.getByRole("button", { name: "I understand, talk to Angel" }).click()
    await page.getByLabel("Message Angel").fill("my friend is overdosing")
    await page.getByRole("button", { name: "Send message" }).click()
    const conversation = page.getByLabel("Conversation with Angel")
    await expect(conversation.getByRole("alert")).toContainText("call 911 now")
    expect(body?.messages).toEqual([{ role: "user", content: "my friend is overdosing" }])
    await page.getByRole("button", { name: "Clear conversation" }).click()
    await expect(conversation.getByRole("alert")).toHaveCount(0)
  })

  test("dashboard offers a Bluetooth device connection without claiming detection", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("narcoguard_preferences", JSON.stringify({ hasCompletedOnboarding: true })))
    await page.goto("/")
    const ble = page.getByTestId("bluetooth-vitals")
    await expect(ble).toBeVisible()
    await expect(ble).toContainText("does not use these readings to detect overdoses")
  })

  test("Good Samaritan step shows the selected state's statute and limits, not a blanket promise", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText("You Are Protected")).toHaveCount(0)
    for (let i = 0; i < 10; i++) {
      const nameInput = page.getByPlaceholder("Enter your name")
      if (await nameInput.isVisible()) await nameInput.fill("Sam")
      await page.getByRole("button", { name: "Continue" }).click()
    }
    await expect(page.getByRole("heading", { name: "Good Samaritan Laws" })).toBeVisible()
    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "Texas" }).click()
    const law = page.getByTestId("state-law")
    await expect(law).toContainText("Tex. Health & Safety Code § 481.115(g)")
    await expect(law).toContainText("defense in court, not immunity")
    await expect(page.getByText("not legal advice", { exact: false })).toBeVisible()
  })

  test("the NarcoGuard logo appears in the header of every public page", async ({ page }) => {
    for (const path of ["/", "/angel", "/watch", "/stability", "/constitution", "/fund", "/hero-signup", "/ar", "/privacy", "/terms"]) {
      await page.goto(path)
      const logo = page.locator(".site-header .brand-mark img")
      await expect(logo, path).toBeVisible()
      expect(await logo.evaluate((img) => (img as HTMLImageElement).naturalWidth), path).toBeGreaterThan(0)
    }
  })

  test("the Constitution is linked from the footer of every page", async ({ page }) => {
    await page.goto("/privacy")
    const link = page.locator(".site-footer").getByRole("link", { name: "Constitution" })
    await expect(link).toHaveAttribute("href", "/constitution")
    await link.click()
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Constitution")
  })

  test("hands-free voice sends what was heard and speaks the 911 notice first", async ({ page }) => {
    await page.addInitScript(() => {
      const spoken: string[] = []
      ;(window as unknown as { __spoken: string[] }).__spoken = spoken
      class FakeRecognition {
        lang = ""; continuous = false; interimResults = false
        onresult: ((e: unknown) => void) | null = null
        onerror: ((e: unknown) => void) | null = null
        onend: (() => void) | null = null
        static turns = 0
        start() {
          const turn = FakeRecognition.turns++
          setTimeout(() => {
            if (turn === 0) this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: "my friend is overdosing" }], { isFinal: true })] })
            else this.onerror?.({ error: "not-allowed" })
            this.onend?.()
          }, 50)
        }
        stop() { this.onend?.() }
        abort() { this.onend?.() }
      }
      // Replace both names: current Chromium ships an unprefixed SpeechRecognition that would win.
      for (const name of ["SpeechRecognition", "webkitSpeechRecognition"]) Object.defineProperty(window, name, { value: FakeRecognition, configurable: true, writable: true })
      const synth = {
        speak(u: { text: string; onend?: () => void }) { if (u.text.trim()) spoken.push(u.text); setTimeout(() => u.onend?.(), 10) },
        cancel() {},
      }
      Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true })
      ;(window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class { text: string; lang = ""; rate = 1; volume = 1; onend?: () => void; onerror?: () => void; constructor(t: string) { this.text = t } }
    })
    let body: { messages?: { content: string }[] } | undefined
    await page.route("**/api/angel", async (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: { available: true, provider: "Vercel AI Gateway" } })
      body = route.request().postDataJSON()
      await route.fulfill({ json: { available: true, notices: ["Call 911 now."], reply: "Stay with them." } })
    })
    await page.goto("/angel")
    await page.getByRole("button", { name: "I understand, talk to Angel" }).click()
    await page.getByRole("button", { name: "Hands-free conversation" }).click()
    await expect(page.getByLabel("Conversation with Angel").getByRole("alert")).toContainText("Call 911 now.")
    expect(body?.messages?.at(-1)?.content).toBe("my friend is overdosing")
    await expect.poll(() => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.join(" "))).toBe("Call 911 now. Stay with them.")
    // The second turn's permission error ends hands-free with an explanation.
    await expect(page.getByText("Microphone access was not allowed. You can still type.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Hands-free conversation" })).toHaveAttribute("aria-pressed", "false")
  })

  test("when the AI provider rejects access, Angel switches off but keeps the 911 notice visible", async ({ page }) => {
    await page.route("**/api/angel", async (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: { available: true, provider: "Vercel AI Gateway" } })
      await route.fulfill({ status: 503, json: { available: false, notices: ["Call 911 now."], message: "Angel AI is not switched on yet." } })
    })
    await page.goto("/angel")
    await page.getByRole("button", { name: "I understand, talk to Angel" }).click()
    await page.getByLabel("Message Angel").fill("my friend is overdosing")
    await page.getByRole("button", { name: "Send message" }).click()
    await expect(page.getByTestId("angel-unavailable")).toBeVisible()
    await expect(page.locator("main").getByRole("alert")).toContainText("Call 911 now.")
  })

  test("donations fall back to GoFundMe until Stripe is configured", async ({ page }) => {
    await page.goto("/fund")
    await expect(page.getByTestId("donate-fallback")).toBeVisible()
    await expect(page.getByRole("link", { name: "Donate on GoFundMe" })).toHaveAttribute("href", /gofund\.me/)
    await expect(page.locator("#donation-policy")).toContainText("not tax-deductible")
  })

  test("in test mode a chosen amount opens Stripe checkout", async ({ page }) => {
    let requested: unknown
    await page.route("**/api/donate", async (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: { available: true, mode: "test" } })
      requested = route.request().postDataJSON()
      await route.fulfill({ json: { url: "/fund/thanks?session_id=cs_test_123", mode: "test" } })
    })
    await page.goto("/fund")
    const form = page.getByTestId("donate-form")
    await expect(form).toContainText("Test mode")
    await form.getByRole("button", { name: "$50", exact: true }).click()
    await form.getByRole("button", { name: "Donate $50" }).click()
    await expect(page).toHaveURL(/\/fund\/thanks/)
    expect(requested).toEqual({ amount: 50 })
    await expect(page.getByRole("heading", { name: "Thank you for your donation" })).toBeVisible()
  })

  test("Chromium installs in one tap from the header once the browser offers it", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __promptCalls: number }).__promptCalls = 0
      window.addEventListener("load", () => {
        const event = new Event("beforeinstallprompt") as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
        event.prompt = async () => { (window as unknown as { __promptCalls: number }).__promptCalls++ }
        event.userChoice = Promise.resolve({ outcome: "accepted" })
        window.dispatchEvent(event)
      })
    })
    await page.goto("/privacy")
    const install = page.locator("header").getByRole("button", { name: "Install" })
    await expect(install).toHaveAttribute("data-install-method", "prompt")
    await install.click()
    await expect.poll(() => page.evaluate(() => (window as unknown as { __promptCalls: number }).__promptCalls)).toBe(1)
    await expect(install).toHaveCount(0)
  })
})

test.describe("Emergency contact texts", () => {
  test("stay off and send nothing until the texting service is configured", async ({ page, request }) => {
    const send = await request.post("/api/alerts", { data: { proofs: ["x"] } })
    expect(send.status()).toBe(503)
    expect(await send.json()).toMatchObject({ available: false })
    expect((await request.post("/api/contacts/invite", { data: { phone: "6077721234", contactName: "Mary", senderName: "Steve" } })).status()).toBe(503)
    await page.goto("/contacts")
    await expect(page.getByTestId("alerts-unavailable")).toBeVisible()
    await expect(page.getByRole("button", { name: "Create invite" })).toBeDisabled()
    await expect(page.getByRole("link", { name: "Call 911" })).toHaveAttribute("href", "tel:911")
  })

  test("invite, pair, preview and send only after confirmation, then show delivery", async ({ page }) => {
    const sent: unknown[] = []
    await page.route("**/api/contacts", (route) => route.fulfill({ json: { available: true } }))
    await page.route("**/api/contacts/invite", (route) => route.fulfill({ json: { token: "invite-1", link: "https://www.narcoguard.app/consent#invite-1", masked: "(•••) •••-1234" } }))
    await page.route("**/api/contacts/pair", async (route) => {
      const body = route.request().postDataJSON()
      if (body.code !== "1234 5678") return route.fulfill({ status: 400, json: { error: "That code doesn't match." } })
      await route.fulfill({ json: { proof: "proof-1", contact: { name: "Mary", masked: "(•••) •••-1234" } } })
    })
    await page.route("**/api/alerts", async (route) => {
      sent.push(route.request().postDataJSON())
      await route.fulfill({ json: { results: [{ name: "Mary", masked: "(•••) •••-1234", state: "pending", label: "Sending…", statusToken: "sid-1" }] } })
    })
    await page.route("**/api/alerts/status", (route) => route.fulfill({ json: { statuses: [{ token: "sid-1", state: "delivered", label: "Delivered" }] } }))

    await page.goto("/contacts")
    const contacts = page.getByTestId("emergency-contacts")
    await contacts.getByLabel("Contact's name").fill("Mary")
    await contacts.getByLabel("Their US mobile number").fill("(607) 772-1234")
    await contacts.getByRole("button", { name: "Create invite" }).click()
    await expect(contacts.getByRole("alert")).toContainText("Add your name first")
    await contacts.getByLabel("Your name, as your contacts know you").fill("Steve")
    await contacts.getByRole("button", { name: "Create invite" }).click()
    const contact = contacts.getByTestId("contact")
    await expect(contact).toContainText("Waiting for them to agree")
    await expect(contact.getByRole("link", { name: "Text it from my phone" })).toHaveAttribute("href", /^sms:\?&body=Steve%20would%20like%20you/)

    await contact.getByLabel("8-digit code from Mary").fill("1111 2222")
    await contact.getByRole("button", { name: "Confirm contact" }).click()
    await expect(contact.getByRole("alert")).toContainText("doesn't match")
    await contact.getByLabel("8-digit code from Mary").fill("1234 5678")
    await contact.getByRole("button", { name: "Confirm contact" }).click()
    await expect(contact).toContainText("Agreed to alerts")

    await page.reload()
    await expect(page.getByTestId("contact")).toContainText("Agreed to alerts")
    await expect(page.getByTestId("alert-preview")).toContainText("NarcoGuard alert: Steve pressed their help button")
    await page.getByRole("button", { name: "Send alert to 1 contact" }).click()
    const dialog = page.getByRole("alertdialog")
    await expect(dialog).toContainText("Mary will get the text shown above")
    await dialog.getByRole("button", { name: "Cancel" }).click()
    expect(sent).toHaveLength(0)

    await page.getByRole("button", { name: "Send alert to 1 contact" }).click()
    await page.getByRole("alertdialog").getByRole("button", { name: "Send alert" }).click()
    await expect(page.getByTestId("deliveries")).toContainText("Mary (•••) •••-1234: Sending…")
    await expect(page.getByTestId("deliveries")).toContainText("Delivered", { timeout: 10_000 })
    expect(sent).toEqual([{ proofs: ["proof-1"], test: false }])
  })

  test("a contact reads the invite, verifies their number and gets a pairing code, or declines", async ({ page }) => {
    const payload = Buffer.from(JSON.stringify({ k: "invite", v: 1, p: "+16077721234", n: "Mary", s: "Steve", iat: Date.now() })).toString("base64url")
    const token = `${payload}.signature`
    const calls: unknown[] = []
    await page.route("**/api/contacts/verify", async (route) => {
      const body = route.request().postDataJSON()
      calls.push(body)
      await route.fulfill({ json: body.code ? { verified: true, pairingCode: "1234 5678" } : { sent: true, masked: "(•••) •••-1234" } })
    })
    await page.goto(`/consent#${token}`)
    const flow = page.getByTestId("consent-flow")
    await expect(flow.getByRole("heading", { name: "Be Steve's emergency contact?" })).toBeVisible()
    await expect(flow).toContainText("NarcoGuard alert: Steve pressed their help button")
    await expect(flow).toContainText("Reply STOP")
    await flow.getByRole("button", { name: "I agree, text me a code" }).click()
    await expect(flow).toContainText("We texted a code to (•••) •••-1234")
    await flow.getByLabel("Code from the text").fill("654321")
    await flow.getByRole("button", { name: "Confirm" }).click()
    await expect(flow.getByTestId("pairing-code")).toHaveText("1234 5678")
    expect(calls).toEqual([{ token }, { token, code: "654321" }])

    await page.goto(`/consent#${token}x`)
    await page.reload()
    await page.getByRole("button", { name: "No thanks" }).click()
    await expect(page.getByRole("status")).toContainText("Nothing was saved")
  })
})

test.describe("Watch blueprint", () => {
  test("the engineering drawing lists every part and callouts open part details", async ({ page }) => {
    await page.goto("/watch")
    const drawing = page.getByTestId("engineering-drawing")
    await expect(drawing.getByRole("group", { name: /concept engineering drawing/ })).toBeVisible()
    await expect(drawing.getByText("PARTS LIST (CANDIDATE)")).toBeVisible()
    await expect(drawing.getByText("NRF5340-QKAA-R7")).toBeVisible()
    await expect(drawing.getByText("UNVERIFIED")).toBeVisible()
    await drawing.getByRole("button", { name: "5. Naloxone Module (research)" }).first().click()
    await expect(page.getByText(/Future research only/).first()).toBeVisible()
    const download = page.waitForEvent("download")
    await drawing.getByRole("button", { name: "Download SVG" }).click()
    expect((await download).suggestedFilename()).toBe("narcoguard-ng-rev4.2-concept-drawing.svg")
  })

  test("the 3D tab loads a model or explains why it cannot", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/watch")
    await page.getByRole("tab", { name: "3D View" }).click()
    const viewer = page.getByTestId("watch-3d")
    await expect(viewer).not.toHaveAttribute("data-status", "loading", { timeout: 30_000 })
    if ((await viewer.getAttribute("data-status")) === "ready") {
      await expect(viewer.getByRole("img", { name: /3D model of the NarcoGuard NG/ })).toBeVisible()
      await viewer.getByRole("slider").fill("100")
      await expect(viewer.getByRole("slider")).toHaveAttribute("aria-valuetext", "100 percent apart")
      await expect(viewer.getByRole("button", { name: "Auto-rotate" })).toHaveAttribute("aria-pressed", "false")
    } else {
      await expect(viewer.getByText(/3D needs WebGL/)).toBeVisible()
    }
  })

  test("the owner lock keeps safety functions on a locked watch and never allows sale as a transfer", async ({ page }) => {
    await page.goto("/watch")
    await page.getByRole("tab", { name: "Owner Lock" }).click()
    const lock = page.getByTestId("owner-lock")
    await expect(lock.getByRole("img", { name: /Owner lock flow/ })).toBeVisible()
    const locked = lock.locator("div").filter({ has: page.getByRole("heading", { name: "Locked", exact: true }) }).last()
    await expect(locked.getByText("Works: SOS button")).toBeAttached()
    await expect(locked.getByText("Off: Vitals monitoring")).toBeAttached()
    await expect(lock.getByText("A sale or trade is never a reason.", { exact: false })).toBeVisible()
  })
})

test.describe("Hero certification", () => {
  test("the test runs in lockdown mode and leaving the screen voids the attempt", async ({ page }) => {
    await page.goto("/hero-signup")
    await page.getByRole("button", { name: "Start the test in lockdown mode" }).click()
    const running = page.getByTestId("hero-test-running")
    await expect(running.getByText("Question 1 of 12")).toBeVisible()
    await running.getByRole("radio").first().check()
    await running.getByRole("button", { name: "Next" }).click()
    await expect(running.getByText("Question 2 of 12")).toBeVisible()
    await page.evaluate(() => window.dispatchEvent(new Event("blur")))
    await expect(page.getByTestId("hero-test-voided")).toContainText("Attempt voided")
    await expect(page.getByRole("button", { name: "Take a new test" })).toBeVisible()
  })

  test("a perfect score earns a certificate; anything less shows what to review", async ({ page }) => {
    const questions = Array.from({ length: 12 }, (_, i) => ({ id: `q${i}`, topic: "Topic", prompt: `Question ${i}`, options: [{ id: "a", text: "Right" }, { id: "b", text: "Wrong" }] }))
    let graded = 0
    await page.route("**/api/heroes/test", (route) => route.request().method() === "GET"
      ? route.fulfill({ json: { version: 1, questions, attempt: "attempt-token", expiresAt: Date.now() + 1_200_000, certifying: true } })
      : route.fulfill({ json: graded++ === 0
        ? { passed: false, correct: 11, total: 12, missed: [{ id: "q0", topic: "Topic", prompt: "Question 0", why: "Because of the reason." }], certificate: null, recorded: false }
        : { passed: true, correct: 12, total: 12, missed: [], certificate: "cert-token", recorded: false } }))
    await page.route("**/api/heroes", (route) => route.fulfill({ json: { enrollment: false, certification: true, nearbyRequests: false } }))
    await page.goto("/hero-signup")
    for (const attempt of [0, 1]) {
      await page.getByRole("button", { name: attempt === 0 ? "Start the test in lockdown mode" : "Take a new test" }).click()
      const running = page.getByTestId("hero-test-running")
      for (let i = 0; i < 12; i++) {
        await running.getByRole("radio", { name: "Right" }).check()
        await running.getByRole("button", { name: i === 11 ? "Submit for grading" : "Next" }).click()
      }
      const result = page.getByTestId("hero-test-result")
      if (attempt === 0) {
        await expect(result).toContainText("Not passed: 11 of 12")
        await expect(result).toContainText("Because of the reason.")
      } else {
        await expect(result).toContainText("Passed: 12 of 12")
      }
    }
    await expect(page.getByTestId("hero-enroll")).toContainText("You have a certificate on this device")
    expect(await page.evaluate(() => localStorage.getItem("narcoguard_hero_certificate_v1"))).toBe("cert-token")
  })
})

test.describe("Account", () => {
  test("the account page says plainly when accounts are off and never blocks help", async ({ page }) => {
    await page.route("**/api/auth", (route) => route.fulfill({ json: { available: false, authenticated: false, user: null } }))
    await page.goto("/account")
    await expect(page.getByTestId("account-unavailable")).toContainText("Everything works on this device without an account")
  })

  test("a signed-in person can back up and restore contacts with a passphrase", async ({ page }) => {
    let stored: unknown = null
    await page.route("**/api/auth", (route) => route.fulfill({ json: { available: true, authenticated: true, user: { email: "sam@example.com" } } }))
    await page.route("**/api/account/vault", async (route) => {
      if (route.request().method() === "PUT") {
        stored = (route.request().postDataJSON() as { sealed: unknown }).sealed
        return route.fulfill({ json: { saved: true } })
      }
      return route.fulfill({ json: { vault: stored ? { sealed: stored, version: 1, updatedAt: new Date().toISOString() } : null } })
    })
    await page.addInitScript(() => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem("narcoguard_emergency_contacts_v1", JSON.stringify({ senderName: "Sam", contacts: [{ id: "c1", name: "Alex", masked: "•••• 1234", status: "confirmed", proof: "p", addedAt: 1 }] }))
        sessionStorage.setItem("seeded", "1")
      }
    })
    await page.goto("/account")
    const panel = page.getByTestId("account-signed-in")
    await expect(panel).toContainText("sam@example.com")
    await panel.getByLabel("Passphrase", { exact: true }).fill("correct horse battery")
    await panel.getByLabel(/Repeat passphrase/).fill("correct horse battery")
    await panel.getByRole("button", { name: "Back up now" }).click()
    await expect(page.getByText(/Backed up\. Only your passphrase/)).toBeVisible({ timeout: 20_000 })
    expect(JSON.stringify(stored)).not.toContain("Alex")

    await page.evaluate(() => localStorage.removeItem("narcoguard_emergency_contacts_v1"))
    await panel.getByLabel("Passphrase", { exact: true }).fill("wrong passphrase!!")
    await panel.getByRole("button", { name: "Restore to this device" }).click()
    await expect(page.getByText("That passphrase does not open this backup.")).toBeVisible({ timeout: 20_000 })
    await panel.getByLabel("Passphrase", { exact: true }).fill("correct horse battery")
    await panel.getByRole("button", { name: "Restore to this device" }).click()
    await expect(page.getByText(/Restored 1 contact/)).toBeVisible({ timeout: 20_000 })
    expect(await page.evaluate(() => localStorage.getItem("narcoguard_emergency_contacts_v1"))).toContain("Alex")
  })
})

test.describe("Install on iPhone", () => {
  test.use({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1", viewport: { width: 390, height: 844 }, hasTouch: true })

  test("shows Add to Home Screen steps, and Later hides the banner across reloads", async ({ page }) => {
    await page.goto("/privacy")
    const banner = page.getByTestId("install-banner")
    await expect(banner).toContainText("a few taps")
    await banner.getByRole("button", { name: "Show me how" }).click()
    const guide = page.getByRole("dialog", { name: "Install NarcoGuard" })
    await expect(guide).toContainText("Add to Home Screen")
    await expect(guide).toContainText("Open as Web App")
    await page.keyboard.press("Escape")
    await banner.getByRole("button", { name: "Later" }).click()
    await expect(banner).toHaveCount(0)
    await page.reload()
    await page.waitForTimeout(2500)
    await expect(page.getByTestId("install-banner")).toHaveCount(0)

    await page.locator("header").getByRole("button", { name: "Install" }).click()
    await expect(page.getByRole("dialog", { name: "Install NarcoGuard" })).toContainText("Share")
  })

  test("hides install once running from the home screen", async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, "standalone", { value: true }))
    await page.goto("/privacy")
    await page.waitForTimeout(2500)
    await expect(page.locator("header").getByRole("button", { name: "Install" })).toHaveCount(0)
    await expect(page.getByTestId("install-banner")).toHaveCount(0)
  })
})

test.describe("Hero practical offers", () => {
  const offer = {
    id: "11111111-2222-3333-4444-555555555555",
    category: "transportation",
    title: "Rides to the clinic",
    description: "Weekday mornings, within 15 miles.",
    contact: { method: "text", value: "+16075550123" },
    active: false,
    updatedAt: new Date().toISOString(),
  }

  // The offers API is mocked so these cases exercise the UI contract without an
  // account or Supabase. Practical offers must work with no certificate.
  const mockOffers = async (page: import("@playwright/test").Page, state: { offers: typeof offer[] }) => {
    await page.route("**/api/heroes/offers**", async (route) => {
      const method = route.request().method()
      if (method === "GET") return route.fulfill({ json: { offers: state.offers } })
      if (method === "POST") {
        const body = route.request().postDataJSON() as Record<string, unknown>
        const saved = { ...offer, ...body, id: (body.id as string) ?? offer.id }
        state.offers = [saved as typeof offer]
        return route.fulfill({ json: { offer: saved } })
      }
      state.offers = []
      return route.fulfill({ json: { removed: offer.id } })
    })
    await page.route("**/api/heroes", (route) => route.fulfill({ json: { enrollment: false, certification: true, nearbyRequests: false } }))
  }

  test("an offer can be created, activated, paused and deleted without any certificate", async ({ page }) => {
    const state = { offers: [] as typeof offer[] }
    await mockOffers(page, state)
    await page.goto("/hero-signup")

    const offers = page.getByTestId("hero-offers")
    await expect(offers).toContainText("do not need certification")
    await expect(offers).toContainText("You have no offers yet.")

    await offers.getByLabel("Category").selectOption("transportation")
    await offers.getByLabel("What are you offering?").fill("Rides to the clinic")
    await offers.getByLabel("Scope and limits").fill("Weekday mornings, within 15 miles.")
    await offers.getByLabel("Contact for this offer").selectOption("text")
    await offers.getByLabel("Number to publish").fill("+16075550123")
    await expect(offers).toContainText("Anyone who can see the offer can text it directly.")
    await offers.getByRole("button", { name: "Save offer" }).click()

    const card = page.getByTestId("hero-offer-card")
    await expect(card).toContainText("Rides to the clinic")
    await expect(card).toContainText("Paused")

    await card.getByRole("button", { name: "Activate" }).click()
    await expect(card).toContainText("Active")
    await card.getByRole("button", { name: "Pause" }).click()
    await expect(card).toContainText("Paused")

    await card.getByRole("button", { name: "Delete" }).click()
    await expect(page.getByTestId("hero-offers")).toContainText("You have no offers yet.")
  })

  test("a published contact renders a direct link; no contact method renders none", async ({ page }) => {
    const state = { offers: [offer] }
    await mockOffers(page, state)
    await page.goto("/hero-signup")
    const link = page.getByTestId("hero-offer-card").getByRole("link", { name: /Text \+16075550123/ })
    await expect(link).toHaveAttribute("href", "sms:+16075550123")

    const withoutContact = { offers: [{ ...offer, contact: null }] }
    await page.unrouteAll()
    await mockOffers(page, withoutContact as unknown as { offers: typeof offer[] })
    await page.reload()
    await expect(page.getByTestId("hero-offer-card")).toContainText("No contact method published.")
    await expect(page.getByTestId("hero-offer-card").getByRole("link")).toHaveCount(0)
  })

  test("an offers API failure still leaves emergency guidance and the directory reachable", async ({ page }) => {
    await page.route("**/api/heroes/offers**", (route) => route.fulfill({ status: 503, json: { error: "Offers are not switched on yet." } }))
    await page.route("**/api/heroes", (route) => route.fulfill({ json: { enrollment: false, certification: true, nearbyRequests: false } }))
    await page.goto("/hero-signup")
    await expect(page.getByTestId("hero-offers")).toContainText("not switched on yet")
    await expect(page.getByTestId("hero-offers")).toContainText("resource directory still work")
    // Emergency guidance on this page, and the directory itself, must survive the failure.
    await expect(page.getByText("Heroes never replace 911.")).toBeVisible()
    await page.goto("/help")
    await expect(page.getByTestId("needs-finder")).toBeVisible()
  })
})
