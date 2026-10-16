"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

export function CalmingAudio() {
  const contextRef = useRef<AudioContext | null>(null)
  const nodesRef = useRef<OscillatorNode[]>([])
  const [playing, setPlaying] = useState(false)

  const stop = () => {
    nodesRef.current.forEach((node) => { try { node.stop() } catch {} })
    nodesRef.current = []
    contextRef.current?.close().catch(() => {})
    contextRef.current = null
    setPlaying(false)
  }

  useEffect(() => stop, [])

  const start = () => {
    if (playing) return stop()
    const AudioContextClass = window.AudioContext
    const context = new AudioContextClass()
    const gain = context.createGain()
    gain.gain.value = 0.035
    gain.connect(context.destination)
    const left = context.createOscillator()
    const right = context.createOscillator()
    const leftPan = context.createStereoPanner()
    const rightPan = context.createStereoPanner()
    left.frequency.value = 200
    right.frequency.value = 206
    leftPan.pan.value = -1
    rightPan.pan.value = 1
    left.connect(leftPan).connect(gain)
    right.connect(rightPan).connect(gain)
    left.start()
    right.start()
    contextRef.current = context
    nodesRef.current = [left, right]
    setPlaying(true)
  }

  return <div className="space-y-2">
    <Button type="button" variant="outline" onClick={start}>{playing ? "Stop calming audio" : "Play optional calming audio"}</Button>
    <p className="text-sm text-muted-foreground">Stereo headphones are needed for the binaural effect. This is an optional relaxation tool, not treatment and not an overdose intervention. Keep volume low; stop if uncomfortable.</p>
  </div>
}
