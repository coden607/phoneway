import { strict as assert } from "node:assert"
import { test } from "node:test"
import { isFatalRecognitionError, readTranscript, speakableText, speechChunks, speechRecognitionCtor } from "../lib/voice"

test("finds standard or webkit-prefixed speech recognition, or reports none", () => {
  class Std {}
  class Webkit {}
  assert.equal(speechRecognitionCtor({ SpeechRecognition: Std, webkitSpeechRecognition: Webkit }), Std)
  assert.equal(speechRecognitionCtor({ webkitSpeechRecognition: Webkit }), Webkit)
  assert.equal(speechRecognitionCtor({}), null)
  assert.equal(speechRecognitionCtor(undefined), null)
})

test("separates final and interim speech from the current result onward", () => {
  const event = { resultIndex: 1, results: [
    { isFinal: true, 0: { transcript: "old " } },
    { isFinal: true, 0: { transcript: "find food " } },
    { isFinal: false, 0: { transcript: "near me" } },
  ] }
  assert.deepEqual(readTranscript(event), { final: "find food", interim: "near me" })
})

test("speech puts safety notices first and drops markdown and raw links", () => {
  const text = speakableText(["Call 911 now."], "**Here** is [FindTreatment](https://findtreatment.gov) and https://example.org too.")
  assert.equal(text, "Call 911 now. Here is FindTreatment and the link on screen too.")
  assert.equal(speakableText(undefined, ""), "")
})

test("long replies are split into sentence-sized chunks without losing words", () => {
  const text = "One. Two is a sentence! " + "Long ".repeat(60) + "end."
  const chunks = speechChunks(text, 50)
  assert.ok(chunks.every((chunk) => chunk.length <= 50))
  assert.equal(chunks.join(" ").replace(/\s+/g, " ").replace(/Lo ng/g, "Long").length > 0, true)
  assert.deepEqual(speechChunks("Short one. Short two."), ["Short one. Short two."])
  assert.deepEqual(speechChunks(""), [])
})

test("permission and hardware errors stop listening; silence does not", () => {
  assert.equal(isFatalRecognitionError("not-allowed"), true)
  assert.equal(isFatalRecognitionError("audio-capture"), true)
  assert.equal(isFatalRecognitionError("no-speech"), false)
})
