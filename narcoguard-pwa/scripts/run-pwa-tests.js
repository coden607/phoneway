const { spawnSync } = require("node:child_process")

const useHttpSmoke = process.platform === "android" || (process.arch === "arm64" && process.env.PWA_BROWSER !== "1")
const script = useHttpSmoke ? "test-pwa-android.js" : null

if (!script) {
  const build = spawnSync(process.execPath, [require.resolve("./run-next-build.js")], { stdio: "inherit", env: process.env })
  if (build.error) throw build.error
  if (build.status !== 0) process.exit(build.status ?? 1)
}
const args = script
  ? [require.resolve(`./${script}`)]
  : [require.resolve("@playwright/test/cli"), "test", "tests/pwa.spec.ts", "--project=chromium"]

if (script) {
  console.log("[pwa] Browser unavailable on this ARM runtime; running the HTTP production PWA smoke suite.")
}

const result = spawnSync(process.execPath, args, { stdio: "inherit", env: process.env })
if (result.error) throw result.error
process.exit(result.status ?? 1)
