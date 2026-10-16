const fs = require("node:fs")
const path = require("node:path")

const roots = ["app", "components", "marketing", "scripts", "README.md"]
const extensions = new Set([".js", ".mjs", ".ts", ".tsx", ".md"])
const forbidden = [
  /94%/i,
  /medical[- ]grade/i,
  /HIPAA[- ]compliant/i,
  /in compliance with HIPAA regulations/i,
  /health data is encrypted in transit and at rest/i,
  /share location and vitals with 911/i,
  /FDA Class II Medical Device/i,
  /automatically injects naloxone/i,
  /No human intervention required/i,
  /certification ready/i,
  // Capabilities that do not exist today (monitoring, detection, automatic alerts) must not be described as live.
  /monitor you continuously/i,
  /monitors your vitals 24\/7/i,
  /detects? overdose signs automatically/i,
  /Call 911 Automatically/i,
  /Automatically call emergency services/i,
  /emergency protocol activates/i,
  /notified immediately/i,
  /always watching over you/i,
  /We comply with HIPAA/i,
  /emergency coordination/i,
  /24\/7 Protection Activated/i,
  /is now monitoring/i,
  /nearby heroes are ready/i,
  /Patent[- ]Pending/i,
  /Compliant data handling/i,
  /Same class as Apple/i,
  /is designed to administer naloxone automatically/i,
]

function filesIn(target) {
  if (!fs.existsSync(target)) return []
  if (fs.statSync(target).isFile()) return [target]
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) =>
    filesIn(path.join(target, entry.name)),
  )
}

const failures = []
for (const root of roots) {
  for (const file of filesIn(path.join(process.cwd(), root))) {
    if (!extensions.has(path.extname(file)) || file.endsWith("validate-claims.js")) continue
    const content = fs.readFileSync(file, "utf8")
    for (const pattern of forbidden) {
      if (pattern.test(content)) failures.push(`${path.relative(process.cwd(), file)} matches ${pattern}`)
    }
  }
}

// Renders cannot be scanned for claims, so they are governed by where they appear.
// ng-modular-exploded, ng-exploded-view and ng-blueprint-detailed predate the
// 2026-10-05 watch-only revision and still show a solar cell, a thermoelectric
// generator, a micro-dosing motor and a filled naloxone cartridge. Any page that
// renders one must say so in view, or a reader takes the picture as the design.
const supersededRenders = ["ng-modular-exploded.jpg", "ng-exploded-view.jpg", "ng-blueprint-detailed.jpg"]
const disclosure = /not the current design|predate the 2026-10-05|images are earlier illustrative renders/i
for (const root of roots) {
  for (const file of filesIn(path.join(process.cwd(), root))) {
    if (!extensions.has(path.extname(file)) || file.endsWith("validate-claims.js")) continue
    const content = fs.readFileSync(file, "utf8")
    const shown = supersededRenders.filter((render) => content.includes(render))
    if (shown.length && !disclosure.test(content)) {
      failures.push(`${path.relative(process.cwd(), file)} renders ${shown.join(", ")} without saying the render is superseded`)
    }
  }
}

if (failures.length) {
  console.error("[claims] unsupported public claim(s) found")
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log("[claims] public and generated content passed the unsupported-claim scan")
