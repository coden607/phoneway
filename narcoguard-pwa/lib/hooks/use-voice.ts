"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { isFatalRecognitionError, readTranscript, speechChunks, speechRecognitionCtor, type SpeechRecognitionLike } from "@/lib/voice"

const noSubscription = () => () => undefined

export type ListenEnd = { text: string } | { error: string } | { cancelled: true }

/** Browser speech-to-text and text-to-speech. Nothing is recorded or stored by NarcoGuard. */
export function useVoice() {
  const sttSupported = useSyncExternalStore(noSubscription, () => speechRecognitionCtor(window) !== null, () => false)
  const ttsSupported = useSyncExternalStore(noSubscription, () => "speechSynthesis" in window, () => false)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [interim, setInterim] = useState("")
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  const stopListening = useCallback(() => {
    recognitionRef.current?.abort()
    recognitionRef.current = null
    setListening(false)
    setInterim("")
  }, [])

  const cancelSpeech = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  useEffect(() => () => { recognitionRef.current?.abort(); if ("speechSynthesis" in window) window.speechSynthesis.cancel() }, [])

  /** Listens for one spoken message and resolves with its text, an error code, or cancellation. */
  const listen = useCallback((): Promise<ListenEnd> => {
    const Ctor = speechRecognitionCtor(window)
    if (!Ctor) return Promise.resolve({ error: "unsupported" })
    recognitionRef.current?.abort()
    if ("speechSynthesis" in window) window.speechSynthesis.cancel()
    return new Promise((resolve) => {
      const recognition = new Ctor()
      recognition.lang = navigator.language || "en-US"
      recognition.continuous = false
      recognition.interimResults = true
      let finalText = ""
      let failure: string | null = null
      recognition.onresult = (event) => {
        const { final, interim: partial } = readTranscript(event)
        if (final) finalText = `${finalText} ${final}`.trim()
        setInterim(partial || finalText)
      }
      recognition.onerror = (event) => { failure = event.error }
      recognition.onend = () => {
        const cancelled = recognitionRef.current !== recognition
        if (!cancelled) recognitionRef.current = null
        setListening(false)
        setInterim("")
        if (cancelled) resolve({ cancelled: true })
        else if (finalText) resolve({ text: finalText })
        else resolve({ error: failure ?? "no-speech" })
      }
      recognitionRef.current = recognition
      setListening(true)
      try {
        recognition.start()
      } catch {
        recognitionRef.current = null
        setListening(false)
        resolve({ error: "start-failed" })
      }
    })
  }, [])

  /** Speaks text sentence by sentence; resolves when finished or interrupted. */
  const speak = useCallback((text: string): Promise<void> => {
    if (!("speechSynthesis" in window) || !text) return Promise.resolve()
    const synth = window.speechSynthesis
    synth.cancel()
    const chunks = speechChunks(text)
    setSpeaking(true)
    return new Promise((resolve) => {
      let index = 0
      const next = () => {
        if (index >= chunks.length) { setSpeaking(false); resolve(); return }
        const utterance = new SpeechSynthesisUtterance(chunks[index++])
        utterance.lang = navigator.language || "en-US"
        utterance.rate = 1
        utterance.onend = next
        utterance.onerror = () => { setSpeaking(false); resolve() }
        synth.speak(utterance)
      }
      next()
    })
  }, [])

  /** iOS only allows speech after a user gesture; a silent utterance during a tap unlocks it. */
  const primeSpeech = useCallback(() => {
    if (!("speechSynthesis" in window)) return
    const utterance = new SpeechSynthesisUtterance(" ")
    utterance.volume = 0
    window.speechSynthesis.speak(utterance)
  }, [])

  return { sttSupported, ttsSupported, listening, speaking, interim, listen, stopListening, speak, cancelSpeech, primeSpeech, isFatalRecognitionError }
}
