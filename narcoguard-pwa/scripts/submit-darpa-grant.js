import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

console.log("=== DARPA TALON Grant Submission ===")
console.log(`Applicant: ${process.env.APPLICANT_NAME || "Stephen R. Blanford"}`)
console.log(`Company: ${process.env.COMPANY_NAME || "Broome Estates LLC"} (DOS ID: ${process.env.DOS_ID || "4789234"})`)
console.log("")

// Read the prepared proposal
const preparedDir = path.join(__dirname, "..", "grants", "prepared")
const files = fs.readdirSync(preparedDir).filter((f) => f.startsWith("darpa-talon"))

if (files.length === 0) {
  console.error("❌ No DARPA proposal found. Run prepare-grant-proposals.js first.")
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
  type: "DARPA TALON Program",
  grantId: "DARPA-PA-24-04",
  amount: 1500000,
  submittedAt: new Date().toISOString(),
  submittedBy: process.env.APPLICANT_NAME || "Stephen R. Blanford",
  company: process.env.COMPANY_NAME || "Broome Estates LLC",
  dosId: process.env.DOS_ID || "4789234",
  recipients: ["Via DARPA submissions portal"],
  status: "prepared",
  proposalFile: latestProposal,
  nextSteps: [
    "Submit white paper via DARPA submissions portal at darpa.mil",
    "Check for TALON program manager contact information",
    "Request technical exchange meeting",
    "Prepare Phase 1 detailed proposal if white paper accepted",
    "Identify potential DoD/university partners for team",
  ],
}

const submissionFile = path.join(submissionsDir, `darpa-submission-${Date.now()}.json`)
fs.writeFileSync(submissionFile, JSON.stringify(submissionRecord, null, 2))

console.log("✓ Submission record created")
console.log("")
console.log("📧 NEXT STEPS (Manual Action Required):")
console.log("")
console.log("1. Submit white paper via DARPA portal:")
console.log("   URL: https://www.darpa.mil/work-with-us/opportunities")
console.log("   Program: TALON (Trusted Autonomous Lifesaving Operations Network)")
console.log("   Reference: DARPA-PA-24-04")
console.log("")
console.log("2. Prepare supporting materials:")
console.log(`   - ${latestProposal}`)
console.log("   - Technical specifications with MIL-STD compliance data")
console.log("   - Team credentials and DoD partnership letters")
console.log("   - Budget breakdown for Phase 1 ($1.5M)")
console.log("")
console.log("3. Monitor DARPA announcements for TALON program updates")
console.log("")
console.log(`✓ Full submission details saved to: ${submissionFile}`)
