import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

console.log("=== Arnold Ventures Grant Submission ===")
console.log(`Applicant: ${process.env.APPLICANT_NAME || "Stephen R. Blanford"}`)
console.log(`Company: ${process.env.COMPANY_NAME || "Broome Estates LLC"} (DOS ID: ${process.env.DOS_ID || "4789234"})`)
console.log("")

// Read the prepared proposal
const preparedDir = path.join(__dirname, "..", "grants", "prepared")
const files = fs.readdirSync(preparedDir).filter((f) => f.startsWith("arnold-ventures"))

if (files.length === 0) {
  console.error("❌ No Arnold Ventures proposal found. Run prepare-grant-proposals.js first.")
  process.exit(1)
}

const latestProposal = files.sort().reverse()[0]
const proposalPath = path.join(preparedDir, latestProposal)
fs.accessSync(proposalPath, fs.constants.R_OK)

console.log(`✓ Loaded proposal: ${latestProposal}`)
console.log("")

// Create submission record
const submissionsDir = path.join(__dirname, "..", "grants", "tracking")
if (!fs.existsSync(submissionsDir)) {
  fs.mkdirSync(submissionsDir, { recursive: true })
}

const submissionRecord = {
  type: "Arnold Ventures Overdose Prevention",
  grantId: "To be assigned",
  amount: 150000,
  submittedAt: new Date().toISOString(),
  submittedBy: process.env.APPLICANT_NAME || "Stephen R. Blanford",
  company: process.env.COMPANY_NAME || "Broome Estates LLC",
  dosId: process.env.DOS_ID || "4789234",
  recipients: ["Via arnoldventures.org online portal"],
  status: "prepared",
  proposalFile: latestProposal,
  nextSteps: [
    "Submit application via arnoldventures.org/grants portal",
    "Prepare budget breakdown spreadsheet",
    "Gather letters of support from STAP, Broome County Health Dept",
    "Prepare evaluation plan with local university partner",
    "Note: May need 501(c)(3) fiscal sponsor - investigate options",
  ],
}

const submissionFile = path.join(submissionsDir, `arnold-submission-${Date.now()}.json`)
fs.writeFileSync(submissionFile, JSON.stringify(submissionRecord, null, 2))

console.log("✓ Submission record created")
console.log("")
console.log("📧 NEXT STEPS (Manual Action Required):")
console.log("")
console.log("1. Submit application online:")
console.log("   URL: https://www.arnoldventures.org/grants")
console.log("   Program: Overdose Prevention Initiative")
console.log("")
console.log("2. Prepare supporting materials:")
console.log(`   - ${latestProposal}`)
console.log("   - Detailed budget breakdown ($150K)")
console.log("   - Letters of support (STAP, Broome County Health)")
console.log("   - Evaluation methodology")
console.log("   - Broome County overdose data (2020-2024)")
console.log("")
console.log("3. Consider 501(c)(3) fiscal sponsor if required")
console.log("   (Arnold Ventures may prefer non-profit applicants)")
console.log("")
console.log(`✓ Full submission details saved to: ${submissionFile}`)
