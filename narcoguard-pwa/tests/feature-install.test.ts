import { strict as assert } from "node:assert"
import { test } from "node:test"
import { installMethod, isAppleMobile } from "../lib/install-platform"

const IPHONE_SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1"
const IPHONE_INSTAGRAM = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0"
const IPAD_DESKTOP_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15"
const MAC_CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
const ANDROID_FIREFOX = "Mozilla/5.0 (Android 15; Mobile; rv:143.0) Gecko/143.0 Firefox/143.0"

test("Chromium's one-tap prompt wins whenever it is available", () => {
  assert.equal(installMethod({ userAgent: MAC_CHROME, maxTouchPoints: 0, canPrompt: true }), "prompt")
})

test("iPhone and iPad Safari get Add to Home Screen steps; in-app browsers are sent to Safari", () => {
  assert.equal(installMethod({ userAgent: IPHONE_SAFARI, maxTouchPoints: 5, canPrompt: false }), "ios")
  assert.equal(installMethod({ userAgent: IPAD_DESKTOP_UA, maxTouchPoints: 5, canPrompt: false }), "ios")
  assert.equal(installMethod({ userAgent: IPHONE_INSTAGRAM, maxTouchPoints: 5, canPrompt: false }), "ios-in-app")
  assert.equal(isAppleMobile({ userAgent: IPAD_DESKTOP_UA, maxTouchPoints: 0 }), false)
})

test("desktop Safari uses Add to Dock; browsers that cannot install show nothing", () => {
  assert.equal(installMethod({ userAgent: IPAD_DESKTOP_UA, maxTouchPoints: 0, canPrompt: false }), "mac-safari")
  assert.equal(installMethod({ userAgent: MAC_CHROME, maxTouchPoints: 0, canPrompt: false }), "none")
  assert.equal(installMethod({ userAgent: ANDROID_FIREFOX, maxTouchPoints: 5, canPrompt: false }), "none")
})
