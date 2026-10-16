import { strict as assert } from "node:assert"
import { test } from "node:test"
import {
  INVITE_TTL_MS,
  alertMessage,
  alertsConfig,
  cleanName,
  createRateLimiter,
  deliveryLabel,
  inviteExpired,
  locationLink,
  maskPhone,
  normalizeUsPhone,
  pairingCode,
  pairingCodeMatches,
  peekInvite,
  signToken,
  verifyToken,
} from "../lib/contact-alerts"

const SECRET = "x".repeat(40)

test("alerts stay off unless every setting is present and explicitly enabled", () => {
  const full = { TWILIO_ACCOUNT_SID: "AC1", TWILIO_AUTH_TOKEN: "t", TWILIO_PHONE_NUMBER: "+16075550100", TWILIO_VERIFY_SERVICE_SID: "VA1", CONTACT_ALERTS_SECRET: SECRET, SMS_ALERTS_ENABLED: "true" }
  assert.ok(alertsConfig(full))
  assert.equal(alertsConfig({ ...full, SMS_ALERTS_ENABLED: "false" }), null)
  assert.equal(alertsConfig({ ...full, CONTACT_ALERTS_SECRET: "short" }), null)
  assert.equal(alertsConfig({ ...full, TWILIO_VERIFY_SERVICE_SID: "" }), null)
  assert.equal(alertsConfig({ ...full, TWILIO_PHONE_NUMBER: "" }), null)
  assert.ok(alertsConfig({ ...full, TWILIO_PHONE_NUMBER: "", TWILIO_MESSAGING_SERVICE_SID: "MG1" }))
})

test("only valid US numbers are accepted and they are masked for display", () => {
  assert.equal(normalizeUsPhone("(607) 772-1234"), "+16077721234")
  assert.equal(normalizeUsPhone("+1 607 772 1234"), "+16077721234")
  for (const bad of ["123", "0607772123", "607 072 1234", "+44 20 7946 0000", "607-555-0123", 6077721234]) assert.equal(normalizeUsPhone(bad), null, String(bad))
  assert.equal(maskPhone("+16077721234"), "(•••) •••-1234")
})

test("names are plain text without links or control characters", () => {
  assert.equal(cleanName("  Mary  Ann  "), "Mary Ann")
  assert.equal(cleanName("José O'Neil-Smith"), "José O'Neil-Smith")
  assert.equal(cleanName("Bob\u0007"), "Bob", "control characters are stripped")
  for (const bad of ["", "x".repeat(41), "visit evil.com", "http://x", "Win $100!", "\u0007", 5]) assert.equal(cleanName(bad), null, String(bad))
})

test("tokens are signed, kind-checked and tamper-evident", () => {
  const invite = { k: "invite" as const, v: 1 as const, p: "+16077721234", n: "Mary", s: "Steve", iat: Date.now() }
  const token = signToken(invite, SECRET)
  assert.deepEqual(verifyToken(token, SECRET, "invite"), invite)
  assert.equal(verifyToken(token, SECRET, "consent"), null, "an invite is not a consent proof")
  assert.equal(verifyToken(token, "y".repeat(40), "invite"), null)
  const [body, sig] = token.split(".")
  const forged = Buffer.from(JSON.stringify({ ...invite, p: "+12125550199" })).toString("base64url")
  assert.equal(verifyToken(`${forged}.${sig}`, SECRET, "invite"), null)
  assert.equal(verifyToken(`${body}.${sig}.x`, SECRET, "invite"), null)
  assert.equal(verifyToken(42, SECRET, "invite"), null)
  assert.deepEqual(peekInvite(token), { n: "Mary", s: "Steve", iat: invite.iat })
  assert.equal(inviteExpired(invite), false)
  assert.equal(inviteExpired({ ...invite, iat: Date.now() - INVITE_TTL_MS - 1 }), true)
})

test("pairing codes are 8 digits tied to the invite and the secret", () => {
  const code = pairingCode("invite-a", SECRET)
  assert.match(code, /^\d{8}$/)
  assert.equal(pairingCodeMatches("invite-a", `${code.slice(0, 4)} ${code.slice(4)}`, SECRET), true)
  assert.equal(pairingCodeMatches("invite-b", code, SECRET), pairingCode("invite-b", SECRET) === code)
  assert.equal(pairingCodeMatches("invite-a", code, "z".repeat(40)), pairingCode("invite-a", "z".repeat(40)) === code)
  assert.equal(pairingCodeMatches("invite-a", "1234", SECRET), false)
  assert.equal(pairingCodeMatches("invite-a", undefined, SECRET), false)
})

test("alert text is fixed, says to call 911, explains STOP and only adds a valid location link", () => {
  const alert = alertMessage({ senderName: "Steve", locationUrl: locationLink(42.09876543, -75.91234567) })
  assert.match(alert, /^NarcoGuard alert: Steve pressed their help button/)
  assert.match(alert, /https:\/\/maps\.google\.com\/\?q=42\.09877,-75\.91235/)
  assert.match(alert, /call 911/)
  assert.match(alert, /Reply STOP/)
  assert.doesNotMatch(alertMessage({ senderName: "Steve" }), /Location/)
  assert.match(alertMessage({ senderName: "Steve", test: true }), /^NarcoGuard test: .*No action needed/)
  assert.equal(locationLink(91, 0), undefined)
  assert.equal(locationLink("42", "-75"), undefined)
  assert.ok(alert.length <= 306, `alert is ${alert.length} characters (2 SMS segments max)`)
})

test("delivery labels treat STOP as opted out and failures plainly", () => {
  assert.equal(deliveryLabel("delivered").state, "delivered")
  assert.equal(deliveryLabel("undelivered").state, "failed")
  assert.equal(deliveryLabel("failed", 21610).state, "opted-out")
  assert.equal(deliveryLabel("queued").state, "pending")
})

test("the rate limiter allows a fixed number of hits per window", () => {
  const limit = createRateLimiter(2, 1000)
  assert.equal(limit("a", 0), true)
  assert.equal(limit("a", 10), true)
  assert.equal(limit("a", 20), false)
  assert.equal(limit("b", 20), true)
  assert.equal(limit("a", 1500), true)
})
