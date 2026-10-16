// Dependency audit gate. Fails on any high/critical advisory, with one narrow, self-expiring
// exception mechanism for advisories that have no patched release yet. An exception only holds
// while ALL of these are true:
//   - the advisory does not reach production dependencies (`npm audit --omit=dev` stays clean);
//   - no release newer than the listed vulnerable range has been published (checked live);
//   - the review date has not passed.
// When any of them stops being true the gate fails and names the exception to remove or renew.
const { execFileSync } = require("node:child_process")

const exceptions = [
  {
    advisory: "GHSA-vfj7-8cjw-p6xm",
    package: "braces",
    lastVulnerable: "3.0.3",
    reason:
      "No patched braces exists. Reaches the tree only via @next/eslint-plugin-next -> fast-glob -> micromatch, " +
      "used when linting; never bundled or run in production.",
    reviewBy: "2026-11-04",
  },
]

const npm = process.platform === "win32" ? "npm.cmd" : "npm"
const run = (args) => {
  try {
    return execFileSync(npm, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
  } catch (error) {
    // npm audit exits non-zero when it finds vulnerabilities; its JSON is still on stdout.
    if (error.stdout) return error.stdout
    throw error
  }
}
const audit = (extra) => JSON.parse(run(["audit", "--json", ...extra]))
const advisoriesOf = (report) => {
  const found = new Map()
  for (const vuln of Object.values(report.vulnerabilities ?? {})) {
    for (const via of vuln.via) {
      if (typeof via !== "object" || !["high", "critical"].includes(via.severity)) continue
      const id = String(via.url ?? "").split("/").pop()
      found.set(id, { id, package: via.name, severity: via.severity, range: via.range, title: via.title })
    }
  }
  return found
}
const versionGreater = (a, b) => {
  const pa = a.split(/[.+-]/).map(Number), pb = b.split(/[.+-]/).map(Number)
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0)
  return false
}

const failures = []
const production = advisoriesOf(audit(["--omit=dev"]))
for (const adv of production.values()) failures.push(`production dependency advisory ${adv.id} (${adv.package} ${adv.range}, ${adv.severity}): ${adv.title}`)

const all = advisoriesOf(audit([]))
const today = new Date().toISOString().slice(0, 10)
for (const adv of all.values()) {
  if (production.has(adv.id)) continue
  const exception = exceptions.find((entry) => entry.advisory === adv.id && entry.package === adv.package)
  if (!exception) {
    failures.push(`development dependency advisory ${adv.id} (${adv.package} ${adv.range}, ${adv.severity}) has no reviewed exception: ${adv.title}`)
    continue
  }
  if (today > exception.reviewBy) failures.push(`exception for ${adv.id} expired on ${exception.reviewBy}; re-review it and update reviewBy, or remove it`)
  const versions = JSON.parse(run(["view", exception.package, "versions", "--json"]))
  const newer = versions.filter((version) => !version.includes("-") && versionGreater(version, exception.lastVulnerable))
  if (newer.length) failures.push(`${exception.package} ${newer.join(", ")} is now published; update to the fix and remove the ${adv.id} exception`)
  if (!failures.length) console.log(`[audit] allowed ${adv.id} in ${adv.package} (development only, no fix published, review by ${exception.reviewBy})`)
}

for (const exception of exceptions) {
  if (!all.has(exception.advisory)) failures.push(`exception for ${exception.advisory} no longer matches any advisory; remove it`)
}

if (failures.length) {
  console.error("[audit] dependency audit failed")
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log(`[audit] passed: production dependencies clean; ${all.size} development advisory(ies) covered by reviewed exceptions`)
