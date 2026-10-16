// <CHANGE> Added grants directory documentation
# NarcoGuard Grant Applications

This directory contains automated grant application materials for Broome Estates LLC's NarcoGuard project.

## Structure

- **templates/**: Master copies of grant proposals
- **prepared/**: Date-stamped proposals ready for submission
- **showcase/**: Marketing and showcase materials for grant applications
- **tracking/**: Submission records and status tracking

## Current Applications

### 1. SAMHSA/OASAS Partnership (SOR Grant TI-24-008)
- **Amount**: $250,000
- **Purpose**: Deploy 100 NarcoGuard watches in Broome County
- **Status**: Template prepared, ready for submission
- **Contact**: OPIOIDSOR@samhsa.hhs.gov

### 2. DARPA TALON Program (DARPA-PA-24-04)
- **Amount**: $1.5M (Phase 1)
- **Purpose**: Military dual-use autonomous lifesaving operations
- **Status**: White paper prepared
- **Contact**: Via DARPA submissions portal

### 3. Arnold Ventures Overdose Prevention
- **Amount**: $150,000
- **Purpose**: 80-watch pilot in Broome County
- **Status**: Application prepared
- **Contact**: Via arnoldventures.org/grants portal

## Automation

GitHub Actions workflows automatically:
- Prepare grant proposals with current dates
- Track submission status
- Update tracking summaries
- Generate showcase materials
- Run twice daily to check for new opportunities

## Manual Steps Required

While the system prepares proposals automatically, actual submission requires:
1. Manual email/portal submission (grant portals don't accept API submissions)
2. Gathering supporting documents (letters of support, budget details)
3. Following up with grant officers
4. Updating status in tracking files

## Applicant Information

**Organization**: Broome Estates LLC
**DOS ID**: 4789234
**Principal Investigator**: Stephen R. Blanford
**Email**: stephen.r.blanford@gmail.com
**Address**: 112 South Washington St, Binghamton, NY 13903

## How to Use

### Prepare All Proposals
\`\`\`bash
npm run grants:prepare
\`\`\`

### Generate Showcase Materials
\`\`\`bash
npm run grants:showcase
\`\`\`

### View Tracking Summary
\`\`\`bash
cat grants/tracking/SUMMARY.md
\`\`\`

## Supporting the Mission

In addition to grants, NarcoGuard is funded through:
- **GoFundMe**: https://gofund.me/ac8905cc
- **Direct partnerships**: Contact stephen.r.blanford@gmail.com
- **Hero Network**: Community volunteer program

---

**Every grant brings us closer to saving lives in Broome County and beyond.**
\`\`\`

\`\`\`json file="" isHidden
