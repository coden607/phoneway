import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const trackingDir = path.join(__dirname, "..", "grants", "tracking")
const summaryFile = path.join(trackingDir, "SUMMARY.md")

if (!fs.existsSync(trackingDir)) {
  fs.mkdirSync(trackingDir, { recursive: true })
}

// Read all submission records
const submissions = fs
  .readdirSync(trackingDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => {
    const content = fs.readFileSync(path.join(trackingDir, f), "utf-8")
    return JSON.parse(content)
  })
  .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))

// Generate summary
let summary = `# NarcoGuard Grant Applications - Tracking Summary

**Organization**: Broome Estates LLC (DOS ID: 4789234)
**Principal Investigator**: Stephen R. Blanford
**Last Updated**: ${new Date().toLocaleString()}

---

## Active Applications

`

const totalRequested = submissions.reduce((sum, s) => sum + s.amount, 0)

summary += `**Total Funding Requested**: $${totalRequested.toLocaleString()}\n`
summary += `**Number of Applications**: ${submissions.length}\n\n`

submissions.forEach((sub) => {
  summary += `### ${sub.type}\n`
  summary += `- **Grant ID**: ${sub.grantId || "TBD"}\n`
  summary += `- **Amount**: $${sub.amount.toLocaleString()}\n`
  summary += `- **Submitted**: ${new Date(sub.submittedAt).toLocaleDateString()}\n`
  summary += `- **Status**: ${sub.status}\n`
  summary += `- **Recipients**: ${sub.recipients.join(", ")}\n`

  if (sub.nextSteps && sub.nextSteps.length > 0) {
    summary += `\n**Next Steps**:\n`
    sub.nextSteps.forEach((step) => {
      summary += `- [ ] ${step}\n`
    })
  }

  summary += `\n---\n\n`
})

summary += `## Quick Links

- [SAMHSA SOR Grant Info](https://www.samhsa.gov/grants)
- [DARPA TALON Program](https://www.darpa.mil/)
- [Arnold Ventures Grants](https://www.arnoldventures.org/grants)
- [NarcoGuard Live Demo](https://narcoguard.app)
- [GoFundMe Campaign](https://gofund.me/ac8905cc)

## Contact

**Stephen R. Blanford**
stephen.r.blanford@gmail.com
112 South Washington St, Binghamton, NY 13903

---

*This tracking document is automatically updated by GitHub Actions multiple times daily.*
`

fs.writeFileSync(summaryFile, summary)

console.log("✓ Grant tracking summary updated")
console.log(`✓ Total applications: ${submissions.length}`)
console.log(`✓ Total funding requested: $${totalRequested.toLocaleString()}`)
console.log(`✓ Summary saved to: ${summaryFile}`)
