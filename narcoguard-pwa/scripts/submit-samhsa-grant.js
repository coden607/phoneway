import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SAMHSA_EMAIL = process.env.SAMHSA_EMAIL || "OPIOIDSOR@samhsa.hhs.gov"
const OASAS_EMAIL = process.env.OASAS_EMAIL || "info@oasas.ny.gov"
const STAP_EMAIL = process.env.STAP_EMAIL || "info@stapinc.org"

console.log("=== SAMHSA/OASAS Grant Submission ===")
console.log(`Applicant: ${process.env.APPLICANT_NAME}`)
console.log(`Company: ${process.env.COMPANY_NAME} (DOS ID: ${process.env.DOS_ID})`)
console.log(`Email: ${process.env.APPLICANT_EMAIL}`)
console.log("")
console.log("Target Recipients:")
console.log(`  Primary: ${SAMHSA_EMAIL}`)
console.log(`  CC: ${OASAS_EMAIL}`)
console.log(`  CC: ${STAP_EMAIL}`)
console.log("")

// Read the prepared proposal
const preparedDir = path.join(__dirname, "..", "grants", "prepared")
const files = fs.readdirSync(preparedDir).filter((f) => f.startsWith("samhsa-oasas"))

if (files.length === 0) {
  console.error("❌ No SAMHSA proposal found. Run prepare-grant-proposals.js first.")
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
  type: "SAMHSA/OASAS Partnership",
  grantId: "TI-24-008",
  amount: 250000,
  submittedAt: new Date().toISOString(),
  submittedBy: process.env.APPLICANT_NAME,
  company: process.env.COMPANY_NAME,
  dosId: process.env.DOS_ID,
  recipients: [SAMHSA_EMAIL, OASAS_EMAIL, STAP_EMAIL],
  status: "prepared",
  proposalFile: latestProposal,
  nextSteps: [
    "Email proposal to SAMHSA, OASAS, and STAP",
    "Request 30-minute partnership discussion",
    "Prepare technical specifications and budget",
    "Gather letters of support from Broome County stakeholders",
  ],
}

const submissionFile = path.join(submissionsDir, `samhsa-submission-${Date.now()}.json`)

fs.writeFileSync(submissionFile, JSON.stringify(submissionRecord, null, 2))

console.log("✓ Submission record created")
console.log("")
console.log("📧 NEXT STEPS (Manual Action Required):")
console.log("")
console.log("1. Email the proposal to:")
console.log(`   To: ${SAMHSA_EMAIL}`)
console.log(`   CC: ${OASAS_EMAIL}, ${STAP_EMAIL}`)
console.log(`   Subject: Subrecipient Partnership Request – SAMHSA SOR Grant TI-24-008`)
console.log("")
console.log("2. Attach the following from grants/prepared/:")
console.log(`   - ${latestProposal}`)
console.log("   - Technical specifications (to be created)")
console.log("   - Budget breakdown (to be created)")
console.log("   - Broome County overdose data (to be gathered)")
console.log("")
console.log("3. Request follow-up call within 2 weeks")
console.log("")
console.log(`✓ Full submission details saved to: ${submissionFile}`)
