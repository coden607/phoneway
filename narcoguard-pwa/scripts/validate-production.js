const fs = require("node:fs")
const path = require("node:path")

const root = path.join(__dirname, "..")
const requiredFiles = [
  "package.json", "package-lock.json", "next.config.mjs", "vercel.json",
  "app/manifest.ts", "public/sw.js", "app/page.tsx", "app/layout.tsx",
  ".github/workflows/ci.yml",
]

const failures = []
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) failures.push("missing required file: " + file)
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"))
if (pkg.name !== "narcoguard-pwa" || !pkg.version) failures.push("package identity or version is invalid")

const manifest = fs.readFileSync(path.join(root, "app/manifest.ts"), "utf8")
for (const required of ["name:", "short_name:", "start_url:", "display:", "icon-192.png", "icon-512.png"]) {
  if (!manifest.includes(required)) failures.push("manifest is missing " + required)
}

const envExample = fs.readFileSync(path.join(root, ".env.example"), "utf8")
for (const required of ["NEXT_PUBLIC_APP_NAME", "NEXT_PUBLIC_APP_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY"]) {
  if (!envExample.includes(required)) failures.push(".env.example is missing " + required)
}

const vercel = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"))
if (vercel.framework !== "nextjs" || vercel.buildCommand !== "npm run build") failures.push("Vercel configuration does not use the repository build")

const workflows = fs.readdirSync(path.join(root, ".github", "workflows")).filter((file) => file.endsWith(".yml"))
if (!workflows.includes("ci.yml")) failures.push("CI workflow is missing")

if (failures.length) {
  console.error("[production] validation failed")
  failures.forEach((failure) => console.error("- " + failure))
  process.exit(1)
}

console.log("[production] validation passed (" + requiredFiles.length + " required files, " + workflows.length + " workflows)")
