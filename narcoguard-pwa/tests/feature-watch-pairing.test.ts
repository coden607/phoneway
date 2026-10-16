import { strict as assert } from "node:assert"
import { test } from "node:test"
import { MAX_GATT_VALUE, type RegistryApi, type WatchLink, pairAndUnlock, parseWatchState } from "../lib/watch-ble"
import {
  SAFETY_FUNCTIONS,
  type WatchSecureState,
  acceptBinding,
  checkRegistrationChallenge,
  compactPublicJwk,
  evaluateActivation,
  generateKeyPair,
  issueBinding,
  issueGrant,
  issueRegistrationChallenge,
  randomNonce,
  registryKeysFromJwk,
  signDeviceChallenge,
  signRecord,
  verifyDeviceResponse,
  verifyRecord,
} from "../lib/watch-ownership"

const SERIAL = "NG-7K2P-Q9XD"

/** Firmware model: what a real watch does with each characteristic. */
async function simulatedWatch(registryPublic: CryptoKey, certificate: string, deviceKey: CryptoKey) {
  let secure: WatchSecureState = { serial: SERIAL, highestGeneration: 0 }
  let nonce = randomNonce()
  let state: "unbound" | "active" | "locked" = "unbound"
  const link: WatchLink = {
    readState: async () => JSON.stringify({ serial: SERIAL, state, nonce, certificate }),
    signChallenge: async (challenge) => JSON.stringify({ signature: await signDeviceChallenge(deviceKey, SERIAL, challenge) }),
    writeGrant: async (value) => {
      assert.ok(new TextEncoder().encode(value).length <= MAX_GATT_VALUE, "every write fits one GATT value")
      const message = JSON.parse(value) as { binding?: string; grant?: string }
      if (message.binding) {
        const next = await acceptBinding(secure, message.binding, registryPublic)
        if (next) secure = next
        state = (await evaluateActivation({ registryKey: registryPublic, secure, challenge: nonce })).state
      }
      if (message.grant) {
        state = (await evaluateActivation({ registryKey: registryPublic, secure, grantToken: message.grant, challenge: nonce })).state
        nonce = randomNonce()
      }
    },
    disconnect: () => undefined,
  }
  return { link, current: () => state }
}

/** Mirrors /api/watch/register and /api/watch/grant against an in-memory table. */
function simulatedRegistry(keys: CryptoKeyPair, table: Map<string, { account: string; token: string }>, account: string): RegistryApi {
  return {
    async post<T>(url: string, body: unknown) {
      const input = body as Record<string, string>
      const reply = (ok: boolean, data: object) => ({ ok, data: data as T & { error?: string } })
      if (url === "/api/watch/register" && input.step === "challenge") {
        const token = await issueRegistrationChallenge(keys.privateKey)
        return reply(true, { challengeToken: token, nonce: (await checkRegistrationChallenge(token, keys.publicKey))!.nonce })
      }
      if (url === "/api/watch/register") {
        const challenge = await checkRegistrationChallenge(input.challengeToken, keys.publicKey)
        if (!challenge) return reply(false, { error: "expired" })
        const serial = await verifyDeviceResponse({ registryKey: keys.publicKey, certificateToken: input.certificate, challenge: challenge.nonce, signature: input.signature })
        if (!serial) return reply(false, { error: "not genuine" })
        const row = table.get(serial)
        if (row && row.account !== account) return reply(false, { error: "registered to its owner" })
        if (row) return reply(true, { bindingToken: row.token })
        const issued = await issueBinding({ registryPrivateKey: keys.privateKey, serial, accountId: account })
        table.set(serial, { account, token: issued!.token })
        return reply(true, { bindingToken: issued!.token })
      }
      const row = table.get(input.serial)
      if (!row || row.account !== account) return reply(false, { error: "This watch is not registered to your account." })
      const binding = (await verifyRecord(row.token, keys.publicKey, "binding"))!
      return reply(true, { grant: await issueGrant({ registryPrivateKey: keys.privateKey, binding, accountId: account, nonce: input.nonce }) })
    },
  }
}

async function factory() {
  const registry = await generateKeyPair()
  const device = await generateKeyPair()
  const certificate = await signRecord({ k: "device", v: 1, serial: SERIAL, devicePublicKey: await compactPublicJwk(device.publicKey), issuedAt: Date.now() }, registry.privateKey)
  return { registry, device, certificate }
}

test("the first owner registers and unlocks over the Bluetooth protocol", async () => {
  const { registry, device, certificate } = await factory()
  const watch = await simulatedWatch(registry.publicKey, certificate, device.privateKey)
  const table = new Map<string, { account: string; token: string }>()
  const steps: string[] = []
  const result = await pairAndUnlock(watch.link, simulatedRegistry(registry, table, "owner"), (step) => steps.push(step))
  assert.ok(result.ok, JSON.stringify(result))
  assert.equal(result.registered, true)
  assert.equal(watch.current(), "active")
  assert.deepEqual(steps, ["reading", "registering", "unlocking", "done"])

  const again = await pairAndUnlock(watch.link, simulatedRegistry(registry, table, "owner"))
  assert.ok(again.ok, "the owner unlocks again on a later connection")
  assert.equal(again.registered, false)
})

test("a buyer who gets the watch cannot register or unlock it; safety stays on", async () => {
  const { registry, device, certificate } = await factory()
  const table = new Map<string, { account: string; token: string }>()
  const watch = await simulatedWatch(registry.publicKey, certificate, device.privateKey)
  assert.ok((await pairAndUnlock(watch.link, simulatedRegistry(registry, table, "owner"), () => undefined)).ok)

  const sold = await pairAndUnlock(watch.link, simulatedRegistry(registry, table, "buyer"))
  assert.equal(sold.ok, false)
  assert.match((sold as { error: string }).error, /not registered to your account/)
  // The next connection without the owner's grant leaves the watch locked with safety functions.
  const locked = await evaluateActivation({ registryKey: registry.publicKey, secure: { serial: SERIAL, highestGeneration: 1, bindingToken: table.get(SERIAL)!.token }, challenge: randomNonce() })
  assert.equal(locked.state, "locked")
  assert.deepEqual(locked.functions, [...SAFETY_FUNCTIONS])
})

test("a buyer cannot claim an unbound watch with a cloned certificate", async () => {
  const { registry, certificate } = await factory()
  const clone = await generateKeyPair()
  const watch = await simulatedWatch(registry.publicKey, certificate, clone.privateKey)
  const result = await pairAndUnlock(watch.link, simulatedRegistry(registry, new Map(), "buyer"))
  assert.equal(result.ok, false)
  assert.equal(watch.current(), "unbound")
})

test("protocol values fit the GATT limit, state parsing rejects junk, and the registry key loads from a JWK", async () => {
  const { certificate } = await factory()
  const state = JSON.stringify({ serial: SERIAL, state: "unbound", nonce: randomNonce(), certificate })
  assert.ok(new TextEncoder().encode(state).length <= MAX_GATT_VALUE, `state is ${state.length} bytes`)
  assert.ok(parseWatchState(state))
  assert.equal(parseWatchState("{}"), null)
  assert.equal(parseWatchState(JSON.stringify({ serial: "NG-OOOO-0000", state: "active", nonce: "x", certificate: "y" })), null)
  assert.equal(parseWatchState("not json"), null)

  const pair = await generateKeyPair()
  const keys = await registryKeysFromJwk(JSON.stringify(await crypto.subtle.exportKey("jwk", pair.privateKey)))
  assert.ok(keys)
  const token = await issueRegistrationChallenge(keys.privateKey)
  assert.ok(await checkRegistrationChallenge(token, keys.publicKey))
  assert.equal(await checkRegistrationChallenge(token, keys.publicKey, Date.now() + 6 * 60_000), null, "challenges expire")
  assert.equal(await registryKeysFromJwk(JSON.stringify(await crypto.subtle.exportKey("jwk", pair.publicKey))), null, "a public key alone is refused")
  assert.equal(await registryKeysFromJwk("nope"), null)
})
