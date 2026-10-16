const axios = require("axios")
const fs = require("fs")
const path = require("path")

const configPath = path.join(__dirname, "../marketing/campaign-config.json")
const config = JSON.parse(fs.readFileSync(configPath, "utf8"))

const campaignThemes = [
  {
    day: 1,
    key: "launch",
    title: "Live demo and funding launch",
    hook: "The public app demo and watch concept are ready to explore.",
    story:
      "NarcoGuard has a public PWA demo and engineering concept pages intended to support prototype development and community feedback in Broome County.",
    proof: "The installable demo presents candidate components and marks the watch as a concept pending engineering, clinical, and regulatory validation.",
    cta: "Explore the demo and help fund responsible prototype development.",
    visual: "Homepage + watch blueprint split-screen",
    hashtags: ["NarcoGuard", "SaveLives", "HarmReduction", "BroomeCounty"],
  },
  {
    day: 2,
    key: "hero-network",
    title: "Community response network",
    hook: "A wearable is only useful if help can reach the user fast.",
    story:
      "The Hero Network concept connects emergency contacts, nearby responders, and recovery support into one coordinated flow.",
    proof: "The demo includes onboarding, contacts, naloxone-location information, and a proposed emergency-response flow; these features are not a substitute for emergency services or medical care.",
    cta: "Share this with community organizers and local responders.",
    visual: "Hero network diagram and onboarding flow",
    hashtags: ["HeroNetwork", "OverdosePrevention", "CommunityCare"],
  },
  {
    day: 3,
    key: "recovery",
    title: "Recovery resources on the wrist",
    hook: "Prevention is not enough without recovery support.",
    story:
      "NarcoGuard pairs overdose response with recovery resources, support routing, and practical next steps for people who need help right now.",
    proof: "The app surfaces treatment, support, and follow-up flows instead of treating the device like a one-purpose widget.",
    cta: "Help us reach people who need support before the next crisis.",
    visual: "Recovery resources screen and support cards",
    hashtags: ["RecoverySupport", "AddictionRecovery", "RatPark"],
  },
  {
    day: 4,
    key: "share-request",
    title: "Share request",
    hook: "Distribution improves when the message is repeated in the right places.",
    story:
      "A single share can move the project from private buildout into public awareness, donations, and introductions to local partners.",
    proof: "The app is available as a public demonstration and the concept materials and funding page can be reviewed openly.",
    cta: "Share the demo with one person who actually understands community health.",
    visual: "Short demo clip + donation card",
    hashtags: ["ShareToSaveLives", "CommunitySupport", "NarcoGuard"],
  },
  {
    day: 5,
    key: "technology",
    title: "Technology spotlight",
    hook: "This is not a generic smartwatch mockup.",
    story:
      "The concept page shows an engineering stack built around commercially available processors, sensors, and connectivity parts that could support a real prototype path.",
    proof: "The blueprint now labels candidate parts, component callouts, and development status instead of pretending the device is already certified.",
    cta: "Use this when talking to technical partners or investors.",
    visual: "Blueprint diagram with part-number callouts",
    hashtags: ["MedicalTechnology", "Smartwatch", "HealthTech", "Innovation"],
  },
  {
    day: 6,
    key: "local",
    title: "Local community focus",
    hook: "Broome County is the point of origin and the community this early work is intended to serve.",
    story:
      "The campaign is grounded in a specific community so local advocates, clinicians, engineers, and people with lived experience can help shape a responsible validation path.",
    proof: "The site and marketing materials are localized for Binghamton and Broome County users.",
    cta: "Tag local groups, advocates, and qualified reviewers who can help guide the project.",
    visual: "Local map + funding progress",
    hashtags: ["Binghamton", "BroomeCounty", "LocalSupport", "NarcoGuard"],
  },
  {
    day: 7,
    key: "weekly-recap",
    title: "Weekly recap",
    hook: "The work is iterative and public.",
    story:
      "Each weekly cycle should show visible progress: software demo, blueprint, validation planning, community feedback, and funding traction.",
    proof: "The public software demo is available; hardware, medical performance, and deployment readiness remain unvalidated.",
    cta: "Use this post to summarize progress and restate the mission.",
    visual: "Progress dashboard + install prompt",
    hashtags: ["WeekOneDown", "Grateful", "KeepSharing", "NarcoGuard"],
  },
]

const platformRules = {
  x: {
    label: "X/Twitter",
    maxLength: 280,
    cadence: [0, 1, 2, 3, 4, 5, 6],
    hashtagCount: 3,
    style: "compact",
  },
  facebook: {
    label: "Facebook",
    maxLength: 900,
    cadence: [0, 1, 2, 3, 4, 5, 6],
    hashtagCount: 4,
    style: "story",
  },
  instagram: {
    label: "Instagram",
    maxLength: 1200,
    cadence: [0, 1, 2, 3, 4, 5, 6],
    hashtagCount: 8,
    style: "caption",
  },
  linkedin: {
    label: "LinkedIn",
    maxLength: 1400,
    cadence: [1, 3, 5],
    hashtagCount: 2,
    style: "professional",
  },
  reddit: {
    label: "Reddit",
    maxLength: 2400,
    cadence: [2, 4, 6],
    hashtagCount: 0,
    style: "community",
  },
  tiktok: {
    label: "TikTok",
    maxLength: 600,
    cadence: [0, 2, 4, 6],
    hashtagCount: 4,
    style: "shortform",
  },
  youtube: {
    label: "YouTube Shorts",
    maxLength: 800,
    cadence: [1, 4, 6],
    hashtagCount: 3,
    style: "shorts",
  },
}

function zonedDateParts(date = new Date()) {
  const timeZone = config.social.timezone || "UTC"
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date)
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]))
}

function getCampaignDay(today = new Date()) {
  const forceDay = process.env.FORCE_DAY
  if (forceDay) {
    const parsed = Number.parseInt(forceDay, 10)
    if (!Number.isNaN(parsed) && parsed > 0) return parsed
  }

  const dateStamp = currentDateStamp(today)
  const startDate = new Date(`${config.campaign.startDate || "2025-01-01"}T00:00:00Z`)
  const campaignDate = new Date(`${dateStamp}T00:00:00Z`)
  const diffMs = campaignDate.getTime() - startDate.getTime()
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  return (diffDays % campaignThemes.length) + 1
}

function currentDateStamp(date = new Date()) {
  const { year, month, day } = zonedDateParts(date)
  return `${year}-${month}-${day}`
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function trimText(text, maxLength) {
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

function pickHashtags(theme, count) {
  const merged = [...theme.hashtags, ...config.social.hashtags.primary, ...config.social.hashtags.secondary]
  const unique = Array.from(new Set(merged.map((tag) => tag.replace(/^#/, ""))))
  return unique.slice(0, count).map((tag) => `#${tag}`).join(" ")
}

function trackedUrl(url, platform, content) {
  if (!url) return ""
  const tracked = new URL(url)
  tracked.searchParams.set("utm_source", platform)
  tracked.searchParams.set("utm_medium", "organic_social")
  tracked.searchParams.set("utm_campaign", "ng_prototype_fund_2026")
  tracked.searchParams.set("utm_content", content)
  return tracked.toString()
}

function formatLinks(platform, theme) {
  return [
    trackedUrl(config.links.app, platform, `${theme.key}_demo`),
    trackedUrl(config.links.gofundme, platform, `${theme.key}_fund`),
  ].filter(Boolean)
}

function renderTwitter(theme) {
  const fundingUrl = trackedUrl(config.links.gofundme, "x", `${theme.key}_fund`)
  const text = [
    `NarcoGuard NG: ${theme.title}.`,
    "Explore and help fund responsible prototype development in Broome County.",
    fundingUrl,
    "#NarcoGuard",
  ]
    .filter(Boolean)
    .join("\n")
  return trimText(text, platformRules.x.maxLength)
}

function renderFacebook(theme) {
  const hashtags = pickHashtags(theme, platformRules.facebook.hashtagCount)
  const text = [
    `NarcoGuard NG update: ${theme.title}`,
    "",
    theme.story,
    "",
    theme.proof,
    "",
    `${theme.cta} ${formatLinks("facebook", theme).join(" | ")}`,
    hashtags,
  ]
    .filter(Boolean)
    .join("\n")
  return trimText(text, platformRules.facebook.maxLength)
}

function renderInstagram(theme) {
  const hashtags = pickHashtags(theme, platformRules.instagram.hashtagCount)
  const text = [
    `NarcoGuard NG ${theme.title}`,
    "",
    theme.hook,
    theme.story,
    "",
    theme.proof,
    "",
    `Visual: ${theme.visual}`,
    "",
    `${theme.cta} ${trackedUrl(config.links.app, "instagram", `${theme.key}_demo`)}`,
    hashtags,
  ]
    .filter(Boolean)
    .join("\n")
  return trimText(text, platformRules.instagram.maxLength)
}

function renderLinkedIn(theme) {
  const hashtags = pickHashtags(theme, platformRules.linkedin.hashtagCount)
  const text = [
    `NarcoGuard NG | ${theme.title}`,
    "",
    theme.story,
    "",
    `Engineering note: ${theme.proof}`,
    "",
    `This release is focused on practical execution, credible parts, and clear validation status. ${theme.cta}`,
    "",
    formatLinks("linkedin", theme).join(" | "),
    hashtags,
  ]
    .filter(Boolean)
    .join("\n")
  return trimText(text, platformRules.linkedin.maxLength)
}

function renderReddit(theme) {
  const body = [
    `Title: NarcoGuard NG - ${theme.title}`,
    "",
    "Context:",
    theme.story,
    "",
    "Why this matters:",
    theme.proof,
    "",
    "What I am asking for:",
    theme.cta,
    "",
    `Links: ${formatLinks("reddit", theme).join(" | ")}`,
    "",
    "Disclosure: this is a public prototype/demo and the blueprint page is marked as a concept design until validation is complete.",
  ]
    .join("\n")
  return trimText(body, platformRules.reddit.maxLength)
}

function renderTikTok(theme) {
  const hashtags = pickHashtags(theme, platformRules.tiktok.hashtagCount)
  const text = [
    `Hook: ${theme.hook}`,
    `Scene 1: Show the app or blueprint page.`,
    `Scene 2: Explain ${theme.story.toLowerCase()}`,
    `Scene 3: ${theme.cta}`,
    `On-screen text: NarcoGuard NG`,
    `Caption: ${hashtags} ${trackedUrl(config.links.app, "tiktok", `${theme.key}_demo`)}`,
  ]
    .join("\n")
  return trimText(text, platformRules.tiktok.maxLength)
}

function renderYouTube(theme) {
  const hashtags = pickHashtags(theme, platformRules.youtube.hashtagCount)
  const text = [
    `Title: NarcoGuard NG - ${theme.title}`,
    "",
    `Description: ${theme.story}`,
    "",
    `Proof: ${theme.proof}`,
    "",
    `CTA: ${theme.cta}`,
    "",
    `Links: ${formatLinks("youtube", theme).join(" | ")}`,
    hashtags,
  ]
    .filter(Boolean)
    .join("\n")
  return trimText(text, platformRules.youtube.maxLength)
}

function buildPlatformPost(platform, theme) {
  switch (platform) {
    case "x":
      return renderTwitter(theme)
    case "facebook":
      return renderFacebook(theme)
    case "instagram":
      return renderInstagram(theme)
    case "linkedin":
      return renderLinkedIn(theme)
    case "reddit":
      return renderReddit(theme)
    case "tiktok":
      return renderTikTok(theme)
    case "youtube":
      return renderYouTube(theme)
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}

function shouldPublishToday(platform, date) {
  const weekday = zonedDateParts(date).weekday
  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday)
  return platformRules[platform].cadence.includes(dayIndex)
}

async function pushToRelay(relayUrl, payload) {
  if (!relayUrl) return { status: "skipped" }
  if (process.env.ALLOW_MARKETING_PUBLISH !== "true") return { status: "approval-required" }
  await axios.post(relayUrl, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
  })
  return { status: "sent", relayUrl }
}

async function main() {
  const today = new Date()
  const dayNumber = getCampaignDay(today)
  const theme = campaignThemes[(dayNumber - 1) % campaignThemes.length]
  const dateStamp = currentDateStamp(today)
  const outboxDir = path.join(__dirname, "../marketing/posts", dateStamp)
  ensureDir(outboxDir)

  const bundle = {
    generatedAt: today.toISOString(),
    dayNumber,
    theme,
    appUrl: config.links.app,
    gofundmeUrl: config.links.gofundme,
    platforms: {},
  }

  const relayUrl = process.env.MARKETING_RELAY_URL || ""
  const published = []
  const drafts = []

  for (const [platform, rules] of Object.entries(platformRules)) {
    const post = buildPlatformPost(platform, theme)
    const publishToday = shouldPublishToday(platform, today)
    const payload = {
      platform,
      label: rules.label,
      publishToday,
      style: rules.style,
      post,
      theme,
      links: config.links,
      generatedAt: today.toISOString(),
    }

    bundle.platforms[platform] = payload
    fs.writeFileSync(path.join(outboxDir, `${platform}.md`), post)
    fs.writeFileSync(path.join(outboxDir, `${platform}.json`), JSON.stringify(payload, null, 2))

    if (publishToday) {
      const relayResult = await pushToRelay(relayUrl, payload)
      published.push({ platform, ...relayResult })
      if (relayResult.status !== "sent") drafts.push(platform)
    } else {
      drafts.push(platform)
    }
  }

  fs.writeFileSync(path.join(outboxDir, "campaign-bundle.json"), JSON.stringify(bundle, null, 2))

  console.log(`[marketing] Generated campaign bundle for day ${dayNumber}: ${theme.title}`)
  console.log(`[marketing] Saved drafts to ${outboxDir}`)
  console.log(`[marketing] Platforms published today: ${published.filter((item) => item.status === "sent").map((item) => item.platform).join(", ") || "none"}`)
  console.log(`[marketing] Draft-only platforms: ${drafts.join(", ") || "none"}`)

  if (!relayUrl) {
    console.log("[marketing] No MARKETING_RELAY_URL configured, so the workflow generated publish-ready drafts only.")
  }
  if (relayUrl && process.env.ALLOW_MARKETING_PUBLISH !== "true") {
    console.log("[marketing] Relay configured, but publishing is locked until ALLOW_MARKETING_PUBLISH=true is supplied for an approved run.")
  }
}

main().catch((error) => {
  console.error("[marketing] Error generating campaign bundle:", error)
  process.exit(1)
})
