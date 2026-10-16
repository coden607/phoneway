const path = require("node:path")
const { spawnSync } = require("node:child_process")

const env = { ...process.env }

const shouldUseWasmCompiler =
  !env.NEXT_TEST_WASM_DIR &&
  (process.platform === "android" || (process.platform === "linux" && process.arch === "arm64"))

if (shouldUseWasmCompiler) {
  env.NEXT_TEST_WASM_DIR = path.dirname(require.resolve("@next/swc-wasm-nodejs/wasm.js"))
  console.log("[build] ARM64/WASM build environment detected; using the matching Next.js WASM compiler.")
}

// Turbopack (the default builder) needs native SWC bindings; the WASM compiler only works with webpack.
const buildArgs = shouldUseWasmCompiler ? ["build", "--webpack"] : ["build"]

const result = spawnSync(process.execPath, [require.resolve("next/dist/bin/next"), ...buildArgs], {
  env,
  stdio: "inherit",
})

if (result.error) throw result.error
process.exit(result.status ?? 1)
