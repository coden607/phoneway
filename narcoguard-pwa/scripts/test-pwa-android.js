const { spawn, spawnSync } = require("node:child_process")

const host = "127.0.0.1"
const port = 3000
const baseUrl = `http://${host}:${port}`
const distDir = process.env.NEXT_DIST_DIR || ".next-pwa-smoke"
process.env.NEXT_DIST_DIR = distDir

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function waitForServer(timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl)
      if (response.ok) return
    } catch {
      // The production server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Production server did not become ready within ${timeoutMs / 1000} seconds`)
}

async function expectResponse(pathname, expectedType) {
  const response = await fetch(`${baseUrl}${pathname}`)
  assert(response.ok, `${pathname} returned HTTP ${response.status}`)
  const contentType = response.headers.get("content-type") || ""
  assert(contentType.includes(expectedType), `${pathname} returned ${contentType}, expected ${expectedType}`)
  return response
}

async function run() {
  const build = spawnSync(process.execPath, [require.resolve("./run-next-build.js")], { stdio: "inherit" })
  assert(build.status === 0, "Production build failed")

  const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "--hostname", host, "--port", String(port)], {
    stdio: ["ignore", "inherit", "inherit"],
  })

  const stopServer = () => {
    if (!server.killed) server.kill("SIGTERM")
  }
  process.once("exit", stopServer)
  process.once("SIGINT", () => {
    stopServer()
    process.exit(130)
  })

  try {
    await waitForServer()

    const home = await expectResponse("/", "text/html")
    const homeHtml = await home.text()
    assert(homeHtml.includes('rel="manifest"'), "Home page does not link to a web app manifest")
    assert(homeHtml.includes("/manifest.webmanifest"), "Home page links to an unexpected manifest")

    const manifestResponse = await expectResponse("/manifest.webmanifest", "application/manifest+json")
    const manifest = await manifestResponse.json()
    assert(manifest.start_url === "/", "Manifest start_url must be /")
    assert(manifest.display === "standalone", "Manifest display must be standalone")
    assert(Array.isArray(manifest.icons) && manifest.icons.length > 0, "Manifest must contain icons")

    for (const expectedIcon of [
      { src: "/icon-192.png", sizes: "192x192" },
      { src: "/icon-512.png", sizes: "512x512" },
    ]) {
      assert(
        manifest.icons.some((icon) => icon.src === expectedIcon.src && icon.sizes === expectedIcon.sizes),
        `Manifest is missing ${expectedIcon.src}`,
      )
      await expectResponse(expectedIcon.src, "image/png")
    }

    const worker = await expectResponse("/sw.js", "javascript")
    const workerSource = await worker.text()
    assert(workerSource.includes('caches.match("/offline.html")'), "Service worker lacks the offline navigation fallback")

    const offline = await expectResponse("/offline.html", "text/html")
    assert((await offline.text()).includes("You're Offline"), "Offline page is missing its status heading")

    console.log("[pwa] Android production smoke suite passed (manifest, icons, service worker, offline fallback).")
  } finally {
    stopServer()
    await new Promise((resolve) => server.once("exit", resolve))
  }
}

run().catch((error) => {
  console.error(`[pwa] ${error.message}`)
  process.exitCode = 1
})
