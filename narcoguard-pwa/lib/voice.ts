// Voice for Angel uses the browser's built-in Web Speech engines: free, no API key, and available
// in Safari (iOS 14.5+), Chrome and Edge. Speech recognition is performed by the browser vendor
// (Apple or Google may process the audio); speech synthesis runs on the device.

export interface SpeechRecognitionResultLike { isFinal: boolean; 0: { transcript: string } }
export interface SpeechRecognitionEventLike { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> }
export interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
export type SpeechRecognitionCtor = new () => SpeechRecognitionLike

export function speechRecognitionCtor(win: unknown): SpeechRecognitionCtor | null {
  const w = win as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor } | undefined
  return w?.SpeechRecognition ?? w?.webkitSpeechRecognition ?? null
}

/** Splits recognition results into the confirmed (final) text and the in-progress (interim) text. */
export function readTranscript(event: SpeechRecognitionEventLike): { final: string; interim: string } {
  let final = ""
  let interim = ""
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const result = event.results[i]
    if (result.isFinal) final += result[0].transcript
    else interim += result[0].transcript
  }
  return { final: final.trim(), interim: interim.trim() }
}

/** Turns a reply into plain speech: safety notices first, without markdown symbols or raw links. */
export function speakableText(notices: string[] | undefined, reply: string): string {
  const cleaned = reply
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "the link on screen")
    .replace(/[*_#>`|~]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  return [...(notices ?? []), cleaned].filter(Boolean).join(" ")
}

/** Splits text into sentence-sized chunks; long single utterances are cut off on some mobile browsers. */
export function speechChunks(text: string, maxLength = 180): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? []
  const chunks: string[] = []
  let current = ""
  for (const sentence of sentences.map((s) => s.trim()).filter(Boolean)) {
    if (sentence.length > maxLength) {
      if (current) { chunks.push(current); current = "" }
      for (let i = 0; i < sentence.length; i += maxLength) chunks.push(sentence.slice(i, i + maxLength).trim())
      continue
    }
    if (current && current.length + sentence.length + 1 > maxLength) { chunks.push(current); current = sentence }
    else current = current ? `${current} ${sentence}` : sentence
  }
  if (current) chunks.push(current)
  return chunks
}

/** Recognition errors that mean "stop trying" rather than "listen again". */
export function isFatalRecognitionError(error: string): boolean {
  return ["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported"].includes(error)
}
