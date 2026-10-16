import { strict as assert } from "node:assert"
import { test } from "node:test"
import { isSealedVault, openVault, sealVault } from "../lib/vault-crypto"

const data = { senderName: "Sam", contacts: [{ id: "1", name: "Alex", masked: "•••• 1234", status: "confirmed", proof: "p" }] }

test("a sealed vault opens only with the same passphrase and hides the content", async () => {
  const sealed = await sealVault(data, "correct horse battery", 100_000)
  assert.ok(isSealedVault(sealed))
  assert.ok(!JSON.stringify(sealed).includes("Alex"))
  assert.deepEqual(await openVault(sealed, "correct horse battery"), data)
  assert.equal(await openVault(sealed, "wrong passphrase!!"), null)
})

test("tampered ciphertext is rejected, and each seal uses a fresh salt and IV", async () => {
  const a = await sealVault(data, "correct horse battery", 100_000)
  const b = await sealVault(data, "correct horse battery", 100_000)
  assert.notEqual(a.salt, b.salt)
  assert.notEqual(a.iv, b.iv)
  const bytes = Uint8Array.from(atob(a.ciphertext), (c) => c.charCodeAt(0))
  bytes[0] ^= 1
  const tampered = { ...a, ciphertext: btoa(String.fromCharCode(...bytes)) }
  assert.equal(await openVault(tampered, "correct horse battery"), null)
})

test("short passphrases and malformed vaults are refused", async () => {
  await assert.rejects(sealVault(data, "short"))
  assert.equal(isSealedVault({ v: 1 }), false)
  assert.equal(isSealedVault({ v: 1, kdf: "PBKDF2-SHA-256", iterations: 10, salt: "AA==", iv: "AA==", ciphertext: "AA==" }), false)
  assert.equal(isSealedVault({ v: 1, kdf: "PBKDF2-SHA-256", iterations: 600000, salt: "AA==", iv: "AA==", ciphertext: "AA==", extra: 1 }), false)
})
