const fs = require("fs")
const path = require("path")

const apiKey = process.env.BUFFER_API_KEY
if (!apiKey) throw new Error("BUFFER_API_KEY is required")

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "../marketing/campaign-config.json"), "utf8"))
const dateParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: config.social.timezone || "UTC",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).formatToParts(new Date())
const dateValues = Object.fromEntries(dateParts.map(({ type, value }) => [type, value]))
const dateStamp = `${dateValues.year}-${dateValues.month}-${dateValues.day}`
const postsDir = path.join(__dirname, "../marketing/posts", dateStamp)
const publishingApproved = process.env.ALLOW_MARKETING_PUBLISH === "true"
const publishNow = publishingApproved && process.env.MARKETING_PUBLISH_NOW === "true"
const mode = !publishingApproved ? "draft" : publishNow ? "shareNow" : "addToQueue"
const imageUrl = process.env.MARKETING_IMAGE_URL || "https://narcoguard-pwa-iota.vercel.app/images/ng-watch-hero.jpg"
const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }

async function graphql(query) {
  const response = await fetch("https://api.buffer.com", {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
  })
  const result = await response.json()
  if (!response.ok || result.errors) throw new Error(JSON.stringify(result.errors || result))
  return result.data
}

async function main() {
  if (!fs.existsSync(postsDir)) {
    throw new Error(`No campaign drafts found for ${dateStamp}; run npm run marketing:run first`)
  }
  const account = await graphql("{ account { organizations { id } } }")
  const organizationId = account.account.organizations[0]?.id
  if (!organizationId) throw new Error("No Buffer organization found")
  const data = await graphql(`{ channels(input:{organizationId:${JSON.stringify(organizationId)}}) { id service } }`)
  const supported = data.channels.filter((channel) => ["instagram", "linkedin"].includes(channel.service))
  if (!supported.length) throw new Error("No supported Buffer channels are connected")

  for (const channel of supported) {
    const file = path.join(postsDir, `${channel.service}.md`)
    if (!fs.existsSync(file)) continue
    const text = fs.readFileSync(file, "utf8")
    const instagram = channel.service === "instagram"
      ? `,assets:[{image:{url:${JSON.stringify(imageUrl)}}}],metadata:{instagram:{type:post,shouldShareToFeed:true,isAiGenerated:false}}`
      : ""
    const scheduling = mode === "draft" ? "mode:addToQueue,saveToDraft:true" : `mode:${mode}`
    const result = await graphql(`mutation { createPost(input:{text:${JSON.stringify(text)},channelId:${JSON.stringify(channel.id)},schedulingType:automatic,${scheduling}${instagram}}) { ... on PostActionSuccess { post { id status dueAt } } ... on MutationError { message } } }`)
    if (result.createPost.message) throw new Error(`${channel.service}: ${result.createPost.message}`)
    console.log(JSON.stringify({ service: channel.service, mode, ...result.createPost.post }))
  }
}

main().catch((error) => {
  console.error(`[buffer] ${error.message}`)
  process.exit(1)
})
