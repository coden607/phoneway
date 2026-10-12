/**
 * soundEffects.js — Realistic digital scale acoustic feedback for PhoneWeigh
 * 
 * Synthesizes laboratory digital scale audio feedback via Web Audio API:
 *   - Stable lock chime (clean sine wave)
 *   - Mechanical relay tare double-click
 *   - Soft keypad acoustic pop
 *   - Overload / motion alarm
 *   - Power boot & shutdown musical chords
 */

'use strict';

class SoundEffects {
  constructor() {
    this._ctx = null;
    this._muted = false;
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        this._muted = localStorage.getItem('phoneweigh_muted') === 'true';
      } catch {}
    }
  }

  _getCtx() {
    if (this._muted || typeof window === 'undefined') return null;
    if (!this._ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this._ctx = new AudioCtx();
      }
    }
    if (this._ctx && this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
    return this._ctx;
  }

  toggleMute() {
    this._muted = !this._muted;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('phoneweigh_muted', String(this._muted));
      } catch {}
    }
    return !this._muted;
  }

  isMuted() {
    return this._muted;
  }

  playBeepStable() {
    const ctx = this._getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  playTareClick() {
    const ctx = this._getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [750, 380].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + idx * 0.025;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.03);
      });
    } catch {}
  }

  playKeyClick() {
    const ctx = this._getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.015);
    } catch {}
  }

  playOverload() {
    const ctx = this._getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + i * 0.08;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(520, t);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
      }
    } catch {}
  }

  playPowerChime(on = true) {
    const ctx = this._getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const freqs = on ? [440, 880] : [880, 440];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + idx * 0.09;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.12);
      });
    } catch {}
  }
}

export const soundEffects = new SoundEffects();
export { SoundEffects };
