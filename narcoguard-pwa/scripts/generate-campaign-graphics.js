const fs = require("fs")
const path = require("path")

async function generateGraphics() {
  console.log("[v0] Generating campaign graphics...")

  const graphicsDir = path.join(__dirname, "../marketing/graphics")
  if (!fs.existsSync(graphicsDir)) {
    fs.mkdirSync(graphicsDir, { recursive: true })
  }

  // Read current stats
  const statsPath = path.join(__dirname, "../marketing/stats/current-stats.json")
  let stats = { amountRaised: 0, goal: 50000, donors: 0, percentComplete: 0 }

  if (fs.existsSync(statsPath)) {
    stats = JSON.parse(fs.readFileSync(statsPath, "utf8"))
  }

  // Generate social media graphics metadata
  const graphics = [
    {
      name: "progress-update",
      text: `$${stats.amountRaised} raised of $${stats.goal} goal`,
      type: "progress",
      timestamp: new Date().toISOString(),
    },
    {
      name: "hero-network",
      text: "Join the Hero Network - Save Lives in Your Community",
      type: "feature",
      timestamp: new Date().toISOString(),
    },
    {
      name: "ng-watch",
      text: "NarcoGuard 2 Watch - Proposed Delivery Concept",
      type: "product",
      timestamp: new Date().toISOString(),
    },
  ]

  fs.writeFileSync(path.join(graphicsDir, "graphics-metadata.json"), JSON.stringify(graphics, null, 2))

  console.log("[v0] Campaign graphics metadata generated")
}

generateGraphics()
