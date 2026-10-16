import { strict as assert } from "node:assert"
import { test } from "node:test"
import {
  SAFETY_FUNCTIONS,
  acceptBinding,
  allowedFunctions,
  evaluateActivation,
  generateKeyPair,
  isValidSerial,
  issueBinding,
  issueGrant,
  ownerTag,
  randomNonce,
  signDeviceChallenge,
  signRecord,
  verifyDeviceResponse,
  verifyRecord,
  type OwnerBinding,
} from "../lib/watch-ownership"

const SERIAL = "NG-7K2P-Q9XD"

async function setup() {
  const registry = await generateKeyPair()
  const bound = await issueBinding({ registryPrivateKey: registry.privateKey, serial: SERIAL, accountId: "owner-account" })
  assert.ok(bound)
  const secure = await acceptBinding({ serial: SERIAL, highestGeneration: 0 }, bound.token, registry.publicKey)
  assert.ok(secure)
  return { registry, binding: bound.binding, secure }
}

test("safety functions work in every lock state; connected features only for the owner", () => {
  for (const state of ["unbound", "active", "locked"] as const) {
    for (const fn of SAFETY_FUNCTIONS) assert.ok(allowedFunctions(state).includes(fn), `${fn} missing when ${state}`)
  }
  assert.ok(allowedFunctions("active").includes("vitals-monitoring"))
  assert.ok(!allowedFunctions("locked").includes("vitals-monitoring"))
  assert.ok(!allowedFunctions("locked").includes("contact-alerts"))
  assert.ok(allowedFunctions("unbound").includes("owner-setup"))
  assert.ok(!allowedFunctions("locked").includes("owner-setup"), "a locked watch cannot be re-registered by whoever holds it")
})

test("the registered owner unlocks with a fresh grant; anyone else stays locked", async () => {
  const { registry, binding, secure } = await setup()
  const challenge = randomNonce()
  const grant = await issueGrant({ registryPrivateKey: registry.privateKey, binding, accountId: "owner-account", nonce: challenge })
  assert.ok(grant)
  const ok = await evaluateActivation({ registryKey: registry.publicKey, secure, grantToken: grant, challenge })
  assert.equal(ok.state, "active")

  assert.equal(await issueGrant({ registryPrivateKey: registry.privateKey, binding, accountId: "buyer-account", nonce: challenge }), null, "the registry refuses a non-owner")
  const forgedOwner = await signRecord({ k: "grant", v: 1, serial: SERIAL, owner: await ownerTag("buyer-account", SERIAL), generation: 1, nonce: challenge, expiresAt: Date.now() + 60_000 }, registry.privateKey)
  assert.equal((await evaluateActivation({ registryKey: registry.publicKey, secure, grantToken: forgedOwner, challenge })).state, "locked")
  const none = await evaluateActivation({ registryKey: registry.publicKey, secure, challenge })
  assert.equal(none.state, "locked")
  assert.deepEqual(none.functions, [...SAFETY_FUNCTIONS])
})

test("replayed, expired, tampered or foreign grants do not unlock", async () => {
  const { registry, binding, secure } = await setup()
  const challenge = randomNonce()
  const stale = await issueGrant({ registryPrivateKey: registry.privateKey, binding, accountId: "owner-account", nonce: "old-challenge" })
  assert.equal((await evaluateActivation({ registryKey: registry.publicKey, secure, grantToken: stale!, challenge })).state, "locked")
  const expired = await issueGrant({ registryPrivateKey: registry.privateKey, binding, accountId: "owner-account", nonce: challenge, now: Date.now() - 10 * 60_000 })
  assert.equal((await evaluateActivation({ registryKey: registry.publicKey, secure, grantToken: expired!, challenge })).state, "locked")
  const good = (await issueGrant({ registryPrivateKey: registry.privateKey, binding, accountId: "owner-account", nonce: challenge }))!
  const [body, sig] = good.split(".")
  const tampered = `${body.slice(0, -2)}AA.${sig}`
  assert.equal((await evaluateActivation({ registryKey: registry.publicKey, secure, grantToken: tampered, challenge })).state, "locked")
  const otherRegistry = await generateKeyPair()
  const foreign = (await issueGrant({ registryPrivateKey: otherRegistry.privateKey, binding, accountId: "owner-account", nonce: challenge }))!
  assert.equal((await evaluateActivation({ registryKey: registry.publicKey, secure, grantToken: foreign, challenge })).state, "locked")
})

test("rebinding needs an approved release, raises the generation, and old bindings cannot be replayed", async () => {
  const { registry, binding, secure } = await setup()
  assert.equal(await issueBinding({ registryPrivateKey: registry.privateKey, serial: SERIAL, accountId: "buyer-account", previous: binding }), null, "no release, no rebind")
  const release = { k: "release" as const, v: 1 as const, serial: SERIAL, generation: binding.generation, reason: "warranty-replacement" as const, releasedAt: Date.now() }
  const rebound = await issueBinding({ registryPrivateKey: registry.privateKey, serial: SERIAL, accountId: "replacement-owner", previous: binding, release })
  assert.ok(rebound)
  assert.equal(rebound.binding.generation, 2)
  const updated = await acceptBinding(secure, rebound.token, registry.publicKey)
  assert.ok(updated)
  assert.equal(await acceptBinding(updated, secure.bindingToken!, registry.publicKey), null, "an older binding is refused")
  const oldGrant = await issueGrant({ registryPrivateKey: registry.privateKey, binding: binding as OwnerBinding, accountId: "owner-account", nonce: "n" })
  assert.equal((await evaluateActivation({ registryKey: registry.publicKey, secure: { ...updated, bindingToken: secure.bindingToken }, grantToken: oldGrant!, challenge: "n" })).state, "locked")
})

test("an unregistered watch offers owner setup plus safety only", async () => {
  const registry = await generateKeyPair()
  const evaluation = await evaluateActivation({ registryKey: registry.publicKey, secure: { serial: SERIAL, highestGeneration: 0 }, challenge: "c" })
  assert.equal(evaluation.state, "unbound")
})

test("a genuine watch proves its secure-element key; a clone cannot", async () => {
  const registry = await generateKeyPair()
  const device = await generateKeyPair()
  const certificate = await signRecord({ k: "device", v: 1, serial: SERIAL, devicePublicKey: await crypto.subtle.exportKey("jwk", device.publicKey), issuedAt: Date.now() }, registry.privateKey)
  const challenge = randomNonce()
  assert.equal(await verifyDeviceResponse({ registryKey: registry.publicKey, certificateToken: certificate, challenge, signature: await signDeviceChallenge(device.privateKey, SERIAL, challenge) }), SERIAL)
  const clone = await generateKeyPair()
  assert.equal(await verifyDeviceResponse({ registryKey: registry.publicKey, certificateToken: certificate, challenge, signature: await signDeviceChallenge(clone.privateKey, SERIAL, challenge) }), null)
  assert.equal(await verifyRecord(certificate, registry.publicKey, "binding"), null, "record kinds are not interchangeable")
})

test("serials use an unambiguous format", () => {
  assert.equal(isValidSerial("NG-7K2P-Q9XD"), true)
  for (const bad of ["NG-7K2P-Q9X", "ng-7k2p-q9xd", "NG-7K2P-Q9XO", "NG-IIII-1111", 42]) assert.equal(isValidSerial(bad), false, String(bad))
})
