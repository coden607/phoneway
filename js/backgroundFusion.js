/* BackgroundSensorFusion — coordinates optional sensor channels while Phoneway is active. */

import { AudioAnalyzer } from "./audio.js";
import { CameraSensor } from "./cameraSensor.js";

class BackgroundSensorFusion {
  constructor({ onUpdate } = {}) {
    this.onUpdate = onUpdate;
    this.active = false;
    this.channels = new Map();
    this.touchQuality = 1;
    this.gyroQuality = 1;
    this.audio = new AudioAnalyzer();
    this.camera = new CameraSensor();
    this._touchHandler = () => { this.touchQuality = 0.35; };
    this._touchEndHandler = () => { this.touchQuality = 1; };
    this._orientationHandler = (event) => {
      const rate = Math.hypot(event.alpha || 0, event.beta || 0, event.gamma || 0);
      this.gyroQuality = Math.max(0, 1 - rate / 45);
    };

    this.audio.onWeight = (grams, confidence) => this._feed("microphone", grams, confidence);
    this.camera.onWeight = (grams, confidence) => this._feed("camera", grams, confidence);
  }

  async start() {
    if (this.active) return;
    this.active = true;
    window.addEventListener("touchstart", this._touchHandler, { passive: true });
    window.addEventListener("touchend", this._touchEndHandler, { passive: true });
    window.addEventListener("deviceorientation", this._orientationHandler, { passive: true });

    // Optional channels must never prevent the accelerometer scale from working.
    try {
      await this.audio.init();
      this.audio.start();
      setTimeout(() => this.audio.recordBaseline(false).catch(() => {}), 1200);
    } catch (_) {}

    try {
      await this.camera.start();
      setTimeout(() => this.camera.recordBaseline(), 1600);
    } catch (_) {}
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    window.removeEventListener("touchstart", this._touchHandler);
    window.removeEventListener("touchend", this._touchEndHandler);
    window.removeEventListener("deviceorientation", this._orientationHandler);
    this.audio.destroy();
    this.camera.stop();
    this.channels.clear();
  }

  fusePrimary(grams, confidence, stable) {
    this._feed("motion", grams, confidence * this.gyroQuality);
    const now = Date.now();
    const candidates = [...this.channels.values()].filter(channel => now - channel.timestamp < 2500 && Number.isFinite(channel.grams));
    if (!candidates.length) return { grams, confidence, stable, channelCount: 0 };

    const primary = candidates.find(channel => channel.name === "motion") || candidates[0];
    const agreeing = candidates.filter(channel => Math.abs(channel.grams - primary.grams) <= Math.max(0.5, Math.abs(primary.grams) * 0.25));
    const weightSum = agreeing.reduce((sum, channel) => sum + Math.max(0.05, channel.confidence), 0);
    const fusedGrams = primary.grams;
    // Optional channels validate the primary estimate; they never move grams.
    const agreement = agreeing.length / candidates.length;
    const fusedConfidence = Math.max(0, Math.min(0.99, (confidence * 0.85 + agreement * 0.15) * this.gyroQuality * this.touchQuality));

    return { grams: fusedGrams, confidence: fusedConfidence, stable: stable && agreement >= 0.5, channelCount: agreeing.length };
  }

  _feed(name, grams, confidence) {
    if (!this.active || !Number.isFinite(grams) || !Number.isFinite(confidence)) return;
    this.channels.set(name, { name, grams: Math.max(0, grams), confidence: Math.max(0, Math.min(1, confidence)), timestamp: Date.now() });
    if (this.onUpdate) this.onUpdate(this.channels.size, name);
  }
}

export { BackgroundSensorFusion };
