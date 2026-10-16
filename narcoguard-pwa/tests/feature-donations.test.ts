import { strict as assert } from "node:assert"
import { createHmac } from "node:crypto"
import { test } from "node:test"
import { checkoutSessionParams, donationMode, parseDonationAmount, verifyStripeSignature } from "../lib/donations"

test("test keys enable test mode; live keys need the explicit go-live switch", () => {
  assert.equal(donationMode({}), null)
  assert.equal(donationMode({ STRIPE_SECRET_KEY: "sk_test_x" }), "test")
  assert.equal(donationMode({ STRIPE_SECRET_KEY: "sk_live_x" }), null)
  assert.equal(donationMode({ STRIPE_SECRET_KEY: "sk_live_x", DONATIONS_LIVE: "yes" }), null)
  assert.equal(donationMode({ STRIPE_SECRET_KEY: "sk_live_x", DONATIONS_LIVE: "true" }), "live")
  assert.equal(donationMode({ STRIPE_SECRET_KEY: "pk_test_x" }), null)
})

test("only whole-dollar amounts within limits are accepted", () => {
  assert.equal(parseDonationAmount(25), 25)
  assert.equal(parseDonationAmount("307"), 307)
  for (const bad of [4, 10_001, 12.5, "abc", null, undefined, -10, "1e3x"]) assert.equal(parseDonationAmount(bad), null, String(bad))
})

test("checkout asks Stripe for a one-off USD donation in cents with return URLs on this site", () => {
  const params = checkoutSessionParams(25, "https://www.narcoguard.app")
  assert.equal(params.get("mode"), "payment")
  assert.equal(params.get("submit_type"), "donate")
  assert.equal(params.get("line_items[0][price_data][unit_amount]"), "2500")
  assert.equal(params.get("line_items[0][price_data][currency]"), "usd")
  assert.equal(params.get("success_url"), "https://www.narcoguard.app/fund/thanks?session_id={CHECKOUT_SESSION_ID}")
  assert.match(params.get("cancel_url") ?? "", /^https:\/\/www\.narcoguard\.app\/fund/)
})

test("webhook signatures are verified, including timestamp tolerance", () => {
  const secret = "whsec_test"
  const payload = '{"type":"checkout.session.completed"}'
  const now = 1_700_000_000
  const sign = (t: number) => createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")
  assert.equal(verifyStripeSignature(payload, `t=${now},v1=${sign(now)}`, secret, now), true)
  assert.equal(verifyStripeSignature(payload, `t=${now},v1=${sign(now)}`, "other", now), false)
  assert.equal(verifyStripeSignature(payload + " ", `t=${now},v1=${sign(now)}`, secret, now), false)
  assert.equal(verifyStripeSignature(payload, `t=${now - 301},v1=${sign(now - 301)}`, secret, now), false)
  assert.equal(verifyStripeSignature(payload, null, secret, now), false)
  assert.equal(verifyStripeSignature(payload, "t=abc,v1=00", secret, now), false)
})
