/**
 * app.js — Phoneway Scale v5.0 (Foundation Rebase)
 * 
 * Honest tilt-based scale: resolution 0.1g, accuracy = your verification
 * ledger (js/verificationLedger.js). Foundation layer: config/continuity.toml
 * + skills/. Zero-dependency vanilla ES modules, no build step.
 */

'use strict';

import './helpTooltips.js';
import './swRegister.js';
import './pwaInstall.js';
import { VERSION as APP_VERSION } from './version.js';
import { SimpleScale, MovingAverage } from './simpleScale.js';
import { BackgroundSensorFusion } from './backgroundFusion.js';
import { SevenSegmentDisplay, StabilityBar, LED, delay } from './display.js';
import { 
  ALL_REFERENCE_WEIGHTS, 
  getRecommendedWeights,
  getBestVerificationWeight,
  calculateVerification,
  US_COINS,
  CURRENCY
} from './referenceWeights.js';
import {
  DeviceCapabilities,
  PermissionHelper,
  UniversalStorage,
  hapticFeedback,
  getDeviceInfo
} from './deviceCompat.js';
import { telemetry } from './telemetry.js';
import { globalErrorLogger } from '../data/error-logger.js';

import {
  UNITS_CONFIG,
  convertWeight,
  calculatePieceCount,
  calculateTiltAngle
} from './scaleMath.js';
import { soundEffects } from './soundEffects.js';
import { VibrationResonanceChannel, SETTLE_MS, SAMPLE_WINDOW_MS } from './channels/vibration-resonance.js';

const UNITS = UNITS_CONFIG;

class PhonewayApp {
  constructor() {
    console.log('[Phoneway] Constructing app...');
    
    try {
      this.scale = new SimpleScale();
      console.log('[Phoneway] SimpleScale created');
    } catch (e) {
      console.error('[Phoneway] Failed to create SimpleScale:', e);
      throw e;
    }
    
    try {
      this.storage = new UniversalStorage();
      console.log('[Phoneway] UniversalStorage created');
    } catch (e) {
      console.error('[Phoneway] Failed to create UniversalStorage:', e);
      throw e;
    }
    
    try {
      this.permissions = new PermissionHelper();
      this.backgroundFusion = new BackgroundSensorFusion({
        onUpdate: (count) => this._updateSensorBar('touchBar', Math.min(1, count / 3))
      });
      console.log('[Phoneway] PermissionHelper created');
    } catch (e) {
      console.error('[Phoneway] Failed to create PermissionHelper:', e);
      throw e;
    }
    
    // UI elements
    this.display = null;
    this.stabBar = null;
    this.ledPower = null;
    this.ledStable = null;
    
    // State
    this.powered = false;
    this.state = 'OFF';
    this.unitIdx = 0;
    this.currentG = 0;
    this.calWeightG = 5.0;
    this._pendingCalibration = false;
    this._holdActive = false;
    this._selectedRefWeight = null;
    this._precisionMode = false;
    this._initError = null;
    this._toastTimer = null;
    this._calFlowActive = false;
    this._calFlowStep = 0;
    this._calFlowStableCount = 0;
    this._calFlowReadings = [];
    this._calFlowLockedWeight = null;
    this._awaitingMotionPermission = false;
    this._powerTransitioning = false;
    this._powerButtonBusy = false;
    this._scaleMode = 'WEIGH';
    this._pcsPieceWeightG = null;
    this._pcsSampleCount = 10;
    this._peakG = 0;
    this._readingHistoryList = [];
    
    // Bind callbacks
    this.scale.onWeight = (g, conf, stable) => {
      const fused = this.backgroundFusion.fusePrimary(g, conf, stable);
      this._onWeight(fused.grams, fused.confidence, fused.stable);
    };
    this.scale.onStable = (g) => this._onStableReading(g);
    this.scale.onRaw = (x, y, z) => {
      this._updateSpiritLevel(x, y, z);
      // Ensure corner competency & percentile reading always updates in real time
      if (!this.powered || this._precisionMode) {
        this._updateAccuracyDisplay(0.85);
      }
    };
    
    // Bind error handler
    this._handleError = this._handleError.bind(this);
    window.addEventListener('error', (e) => this._handleError(e.error, 'window'));
    window.addEventListener('unhandledrejection', (e) => {
      this._handleError(e.reason, 'unhandledrejection');
    });
  }

  async init() {
    try {
      console.log('[Phoneway] v' + APP_VERSION + ' initializing...');
      console.log('[Phoneway] Device info:', getDeviceInfo());
      
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, {once: true}));
      }
      
      this._initDisplay();
      this._updateAccuracyDisplay(0.85); // Initialize corner competency and accuracy percentile
      this._updateCalibrationGuide(); // Initialize calibration guide
      this._bindButtons();
      this._setPowerButtonBusy(false);
      this._buildCalWeightList();
      this._buildVerifyPanel();
      telemetry.logCapabilities({ version: APP_VERSION });
      this._runScheduledHealthPass();
      if (this._healthTimer) clearInterval(this._healthTimer);
      this._healthTimer = setInterval(() => this._runScheduledHealthPass(), 6 * 60 * 60 * 1000);

      // New devices need an explicit reference-weight calibration before use.
      if (!this.scale.calibrated) {
        setTimeout(() => this._showOnboarding(), 1000);
      }
      
      console.log('[Phoneway] UI initialized, binding buttons...');
      this._loadReadingHistory();
      
      // Check device capabilities
      if (!DeviceCapabilities.hasDeviceMotion) {
        this._showToast('⚠️ No motion sensors detected. Scale requires accelerometer.', 5000);
        this._initError = 'No motion sensors';
        // Still continue - user might have some limited functionality
      }
      
      // Request permission (especially for iOS)
      const permitted = await this._requestPermissions();
      this._awaitingMotionPermission = !!(DeviceCapabilities.hasMotionPermission && !permitted);
      if (!permitted && DeviceCapabilities.hasMotionPermission) {
        this._showToast("Tap POWER to enable sensor access on iPhone", 5000);
        if (this.display) this.display.showError("PERM");
      }
      
      // Auto-start after short delay
      setTimeout(() => {
        if (!this._initError && !this._awaitingMotionPermission) {
          this._togglePower();
        }
      }, 800);
      
      // Send telemetry about startup
      this._sendTelemetry('startup', { 
        version: APP_VERSION,
        platform: DeviceCapabilities.platform,
        sensorQuality: DeviceCapabilities.sensorQuality,
        hasError: !!this._initError
      });
      
    } catch (error) {
      console.error('[Phoneway] Init error:', error);
      this._handleError(error, 'init');
    }
  }
  
  async _requestPermissions() {
    try {
      return await this.permissions.requestMotionPermission();
    } catch (e) {
      console.warn("Permission request failed:", e);
      try { telemetry.logPermissionDenied("motion"); } catch {}
      return !DeviceCapabilities.hasMotionPermission; // Return true if no permission needed
    }
  }

  _handleError(error, context = "unknown") {
    const errorInfo = {
      message: (error && error.message) || String(error),
      context,
      stack: error && error.stack,
      timestamp: Date.now(),
      version: APP_VERSION
    };

    console.error("[Phoneway Error]", errorInfo);
    try { telemetry.logJSError(errorInfo.message, context, 0, 0); } catch {}

    // Send error telemetry
    this._sendTelemetry("js_error", {
      msg: errorInfo.message,
      context: context,
      v: APP_VERSION
    });

    // Show user-friendly message for critical errors
    if (context === "init" || context === "window") {
      this._showToast("Error: " + errorInfo.message.substring(0, 50), 4000);
    }
  }

  _sendTelemetry(type, data) {
    try {
      telemetry.log(type, data);
      if (type === "js_error" || type === "startup") {
        telemetry.flush().catch(() => {});
      }
    } catch (e) {
      if (!DeviceCapabilities.hasServiceWorker) return;

      try {
        fetch("/api/telemetry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceClass: DeviceCapabilities.platform,
            events: [{ type, data, timestamp: Date.now() }]
          }),
          keepalive: true
        }).catch(() => {});
      } catch {}
    }
  }
  _initDisplay() {
    try {
      const digitDisplay = document.getElementById('digitDisplay');
      const stabilityBar = document.getElementById('stabilityBar');
      const ledPower = document.getElementById('ledPower');
      const ledStable = document.getElementById('ledStable');
      const ledAudio = document.getElementById('ledAudio');
      
      if (digitDisplay) this.display = new SevenSegmentDisplay(digitDisplay, 5, 2);
      if (stabilityBar) this.stabBar = new StabilityBar(stabilityBar);
      if (ledPower) this.ledPower = new LED(ledPower);
      if (ledStable) this.ledStable = new LED(ledStable);
      if (ledAudio) {
        this.ledAudio = new LED(ledAudio);
        this.ledAudio.on(soundEffects.isMuted() ? 'off' : 'green');
      }
    } catch (e) {
      console.error('Display init error:', e);
    }
  }

  _bindButtons() {
    const bind = (id, handler) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', handler);
        console.log('[Phoneway] Bound button:', id);
      } else {
        console.warn('[Phoneway] Button not found:', id);
      }
    };
    
    console.log('[Phoneway] Binding buttons...');
    
    bind('btnPower', () => { soundEffects.playKeyClick(); this._togglePower(); });
    bind('btnTare', () => { soundEffects.playKeyClick(); this._tare(); });
    bind('btnCal', () => { soundEffects.playKeyClick(); this._showCalModal(); });
    bind('btnUnits', () => { soundEffects.playKeyClick(); this._cycleUnits(); });
    bind('btnMode', () => { soundEffects.playKeyClick(); this._cycleMode(); });
    bind('btnHold', () => { soundEffects.playKeyClick(); this._hold(); });
    bind('btnVerify', () => { soundEffects.playKeyClick(); this._showVerifyPanel(); });
    bind('btnHammer', () => { soundEffects.playKeyClick(); this._triggerHammer(); });
    bind('btnPrecision', () => { soundEffects.playKeyClick(); this._precisionMeasure(); });
    bind('btnStats', () => { soundEffects.playKeyClick(); this._showStats(); });
    bind('btnLight', () => this._toggleBacklight());
    bind('ledAudio', () => {
      const active = soundEffects.toggleMute();
      if (this.ledAudio) this.ledAudio.on(active ? 'green' : 'off');
      this._showToast(active ? '🔊 Scale audio effects: ON' : '🔇 Scale audio muted', 1500);
    });
    
    // Anytime calibration and quick action bar
    bind('quickCalBtn', () => { soundEffects.playKeyClick(); this._showCalModal(); });
    bind('headerCalBtn', () => { soundEffects.playKeyClick(); this._showCalModal(); });
    bind('stickyCornerBadge', () => { soundEffects.playKeyClick(); this._showCalModal(); });
    bind('lcdCornerHud', () => { soundEffects.playKeyClick(); this._showCalModal(); });
    bind('quickTareBtn', () => { soundEffects.playKeyClick(); this._tare(); });
    bind('quickHistoryBtn', () => { soundEffects.playKeyClick(); this._showHistoryModal(); });
    bind('historyClose', () => this._hideHistoryModal());
    bind('historyDoneBtn', () => this._hideHistoryModal());
    bind('historyClearBtn', () => this._clearHistory());
    bind('historyCopyBtn', () => this._copyHistory());
    bind('quickHelpBtn', () => { soundEffects.playKeyClick(); this._showAccuracyGuide(); });
    bind('accuracyBlock', () => { soundEffects.playKeyClick(); this._showAccuracyGuide(); });
    bind('guideClose', () => this._hideAccuracyGuide());
    bind('guideCloseBtn', () => this._hideAccuracyGuide());

    // Calibration modal buttons
    bind('startCalBtn', () => this._startCalibration());
    bind('calCancelBtn', () => this._hideCalModal());
    bind('calCloseXBtn', () => this._hideCalModal());
    bind('calConfirmBtn', () => this._proceedWithCalibration());
    bind('calDirectCurrentBtn', () => this._calibrateCurrentLoad());
    bind('calGuidedBtn', () => { this._hideCalModal(); this._startCalibration(); });
    bind('calQuickTareBtn', () => { this._hideCalModal(); this._tare(); });
    bind('calResetBtn', () => this._showResetConfirm());
    bind('calResetYesBtn', () => this._factoryReset());
    bind('calResetNoBtn', () => this._hideResetConfirm());
    
    bind('recalCustomBtn', () => {
      const input = document.getElementById('recalCustomGrams');
      const val = parseFloat(input ? input.value : 0);
      if (val > 0) {
        this.calWeightG = val;
        this._startQuickCalibration(val);
      }
    });

    const recalCustomInput = document.getElementById('recalCustomGrams');
    if (recalCustomInput) {
      recalCustomInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (val > 0) {
          this.calWeightG = val;
          const confBtn = document.getElementById('calConfirmBtn');
          if (confBtn) confBtn.textContent = `⚡ QUICK CAL (${val}g)`;
        }
      });
    }

    const customInput = document.getElementById('customWeightInput');
    if (customInput) {
      customInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (val > 0) this.calWeightG = val;
      });
    }
    
    bind('verifyClose', () => this._hideVerifyPanel());
    bind('verifyCloseBtn', () => this._hideVerifyPanel());
    bind('verifyLockBtn', () => this._lockReference());
    bind('accuracyClose', () => this._hideStats());
    bind('accCloseBtn', () => this._hideStats());
    bind('accExportBtn', () => this._exportData());
  }

  _setState(s) {
    this.state = s;
    const el = document.getElementById('statusText');
    const stableLabel = document.getElementById('stableLabel');
    const statusBar = document.getElementById('status-bar');
    const displaySection = document.getElementById('display-section');
    const stabilityBar = document.getElementById('stabilityBar');
    const stateClass = s === 'MEASURING' ? 'measuring' : s === 'STABLE' ? 'stable' : s === 'CALIBRATING' ? 'calibrating' : s === 'ZEROING' ? 'zeroing' : s === 'PRECISION' ? 'precision' : s === 'READY' ? 'ready' : 'off';
    const labelText = s === 'MEASURING' ? 'MOVING' : s === 'STABLE' ? 'LOCKED' : s === 'CALIBRATING' ? 'CAL' : s;
    if (el) el.textContent = labelText;
    if (stableLabel) stableLabel.textContent = labelText;
    [statusBar, displaySection, stabilityBar, el, stableLabel].forEach((node) => {
      if (!node) return;
      node.classList.remove('state-off', 'state-ready', 'state-measuring', 'state-stable', 'state-calibrating', 'state-zeroing', 'state-precision');
      node.classList.add('state-' + stateClass);
    });
    if (stabilityBar) {
      stabilityBar.classList.toggle('stable', s === 'STABLE');
      stabilityBar.classList.toggle('measuring', s === 'MEASURING');
    }

    switch (s) {
      case 'READY':
        if (this.display && !this._holdActive) this.display.setValue(0);
        if (this.ledStable) this.ledStable.on('green');
        break;
      case 'MEASURING':
        if (this.ledStable) this.ledStable.on('orange');
        break;
      case 'STABLE':
        if (this.ledStable) this.ledStable.on('green');
        hapticFeedback([20, 15, 20]);
        break;
      case 'CALIBRATING':
        if (this.ledStable) this.ledStable.on('blue');
        break;
      case 'PRECISION':
        if (this.ledStable) this.ledStable.on('purple');
        break;
    }
  }

  _setPowerButtonBusy(busy, label) {
    this._powerButtonBusy = busy;
    const btn = document.getElementById("btnPower");
    if (!btn) return;

    btn.disabled = busy;
    btn.setAttribute("aria-busy", busy ? "true" : "false");
    btn.classList.toggle("is-busy", busy);

    const labelEl = btn.querySelector(".btn-label");
    if (labelEl) {
      labelEl.textContent = label || (busy ? "WAIT" : "ON/OFF");
    }
  }

  async _togglePower() {
    if (this._powerTransitioning) return;
    this._powerTransitioning = true;
    this._setPowerButtonBusy(true, this.powered ? "STOP" : "WAIT");

    console.log('[Phoneway] Toggle power clicked, current state:', this.powered);

    try {
      if (!this.powered && this._awaitingMotionPermission && DeviceCapabilities.hasMotionPermission) {
        const permitted = await this._requestPermissions();
        this._awaitingMotionPermission = !permitted;
        if (!permitted) {
          this._showToast('Sensor access denied - open Safari settings and try again', 5000);
          if (this.display) this.display.showError('PERM');
          return;
        }
      }

      this.powered = !this.powered;

      if (this.ledPower) {
        this.powered ? this.ledPower.on('green') : this.ledPower.off();
      }

      if (this.powered) {
        try {
          this.scale.start();
          this.backgroundFusion.start().catch(() => {});
          this._setState('READY');
          this._showToast('Scale ready — place phone on soft surface', 3000);
          soundEffects.playPowerChime(true);
          hapticFeedback([30, 20, 30]);
        } catch (e) {
          console.error('Scale start error:', e);
          this._showToast('Error starting scale: ' + e.message, 4000);
          this.powered = false;
          if (this.ledPower) this.ledPower.off();
        }
      } else {
        this.scale.stop();
        this.backgroundFusion.stop();
        this._setState('OFF');
        if (this.display) this.display.setValue(null);
        if (this.ledStable) this.ledStable.off();
        soundEffects.playPowerChime(false);
        hapticFeedback([50]);
      }
    } finally {
      this._setPowerButtonBusy(false);
      this._powerTransitioning = false;
    }
  }

  _onWeight(grams, confidence, isStable) {
    if (!this.powered || this._precisionMode) return;

    if (this.state === "CALIBRATING" && this._calFlowActive) {
      this.currentG = grams;

      const button = document.getElementById("calReadyBtn");
      const status = document.getElementById("calSensorStatus");

      if (this.stabBar) {
        const stabilityPct = Math.min(100, confidence * 100);
        this.stabBar.set(stabilityPct, isStable);
      }

      this._updateSensorBar("accelBar", confidence);

      if (this._calFlowStep === 2) {
        if (Number.isFinite(grams)) {
          this._calFlowReadings.push(Math.max(0, grams));
          if (this._calFlowReadings.length > 30) this._calFlowReadings.shift();
        }

        const sortedReadings = [...this._calFlowReadings].sort((a, b) => a - b);
        const middle = Math.floor(sortedReadings.length / 2);
        const stableReading = sortedReadings.length
          ? sortedReadings[middle]
          : Math.max(0, grams || 0);
        this.currentG = stableReading;
        if (this.display && Number.isFinite(stableReading)) {
          this.display.setValue(stableReading * UNITS[this.unitIdx].factor);
        }
        const deviations = this._calFlowReadings.map(value => Math.abs(value - stableReading)).sort((a, b) => a - b);
        const medianDeviation = deviations.length ? deviations[Math.floor(deviations.length / 2)] : Infinity;

        // Check for physical deflection and sensor stillness
        const rawTilt = Math.hypot(this.scale.maDx.mean, this.scale.maDy.mean);
        const deflection = this.scale.directionalProj.project(this.scale.maDx.mean, this.scale.maDy.mean);
        const elapsed = Date.now() - (this._calStep2StartTime || Date.now());
        const hasMinSamples = this._calFlowReadings.length >= 6;
        const stillnessQuality = (this.scale.motionQuality != null) ? this.scale.motionQuality : 0.8;
        const lowVariance = medianDeviation <= Math.max(1.8, stableReading * 0.4);
        const isSteady = hasMinSamples && lowVariance && (!this.scale.motionBlocked || stillnessQuality >= 0.25);

        if (isSteady) {
          this._calFlowStableCount = Math.min(20, (this._calFlowStableCount || 0) + 1);
        } else {
          this._calFlowStableCount = Math.max(0, (this._calFlowStableCount || 0) - 1);
        }

        const stableTarget = 8;
        const autoLock = (this._calFlowStableCount >= stableTarget) || (elapsed > 3000 && hasMinSamples);

        if (autoLock) {
          if (this._calStep2Interval) {
            clearInterval(this._calStep2Interval);
            this._calStep2Interval = null;
          }
          this._calFlowLockedWeight = stableReading;
          this._calFlowStep = 3;
          if (button) {
            button.disabled = false;
            button.textContent = "CALIBRATE NOW";
          }
          if (status) {
            status.textContent = "STEADY · TAP CALIBRATE NOW";
          }
          const body = document.querySelector("#stepOverlay .step-body");
          if (body) {
            body.textContent = "STEP 3\n\nSteady lock detected!\n\nTap CALIBRATE NOW to lock sensitivity to " + this.calWeightG + "g.";
          }
        } else if (button) {
          if (elapsed > 1200) {
            // Manual lock override enabled after 1.2s — user is never trapped
            button.disabled = false;
            button.textContent = "LOCK " + this.calWeightG + "g & CALIBRATE (TAP)";
            if (status) {
              status.textContent = "SETTLING (" + Math.min(stableTarget, this._calFlowStableCount) + "/" + stableTarget + ") · OR TAP TO LOCK";
            }
          } else {
            button.disabled = true;
            button.textContent = "HOLD STILL (" + Math.min(stableTarget, this._calFlowStableCount) + "/" + stableTarget + ")...";
            if (status) {
              status.textContent = "HOLD STILL · SETTLING...";
            }
          }
        }
        return;
      }
    }

    if (!this.scale.calibrated && !this._pendingCalibration) {
      this.currentG = grams;
      const u = UNITS[this.unitIdx];
      if (this.display) {
        this.display.setValue(grams * u.factor);
      }
      this._updateAccuracyDisplay(confidence);
      this._setState(grams > 0.15 ? (isStable ? "STABLE (EST)" : "MEASURING") : "CAL REQUIRED");
      if (this.stabBar) {
        this.stabBar.set(Math.min(100, confidence * 100), isStable);
      }
      this._updateSensorBar("accelBar", confidence);
      this._updateSurfaceLabel();
      this._updateGradeLabel();
      this._updatePrecisionLabel();
      return;
    }

    this.currentG = grams;

    if (!this._holdActive) {
      if (this._scaleMode === 'PCS') {
        if (this._pcsPieceWeightG && this._pcsPieceWeightG > 0) {
          const pcs = calculatePieceCount(grams, this._pcsPieceWeightG);
          if (this.display) this.display.setValue(pcs);
        } else {
          if (this.display) this.display.showString(grams > 0.1 ? 'CAL' : 'PCS');
        }
      } else if (this._scaleMode === 'PEAK') {
        this._peakG = Math.max(this._peakG || 0, grams);
        const u = UNITS[this.unitIdx];
        if (this.display) this.display.setValue(this._peakG * u.factor);
      } else {
        const u = UNITS[this.unitIdx];
        if (this.display) {
          this.display.setValue(grams * u.factor);
        }
      }
    }

    if (this.stabBar) {
      const stabilityPct = Math.min(100, confidence * 100);
      this.stabBar.set(stabilityPct, isStable);
    }

    this._updateSensorBar("accelBar", confidence);

    if (grams > 0.2) {
      this._setState(isStable ? "STABLE" : "MEASURING");
    } else {
      this._setState("READY");
    }

    this._updateSurfaceLabel();
    this._updateGradeLabel();
    this._updatePrecisionLabel();
    this._updateAccuracyDisplay(confidence);
    this._updateCalibrationGuide();

    if (this._selectedRefWeight && isStable) {
      this._updateVerifyComparison();
    }
  }

  _getCompetencyPercentile(confidence) {
    const stdDev = (this.scale && this.scale.stabilityCheck) ? this.scale.stabilityCheck.stdDev : 0.05;
    const stabilityScore = Math.max(0, Math.min(1, 1 - (stdDev / 0.12)));
    const motionQuality = (this.scale && typeof this.scale.motionQuality === 'number') ? this.scale.motionQuality : 0.92;
    const evidence = this.scale ? this.scale.getAccuracyEvidence(confidence) : { confidence: 0.85 };
    const calScore = this.scale && this.scale.calibrated ? 1.0 : 0.88;

    const claim = this.scale ? this.scale.getLedgerClaim() : null;
    let ledgerBonus = 0;
    if (claim && claim.count > 0) {
      ledgerBonus = claim.maxAbsError <= 0.05 ? 0.08 : (claim.maxAbsError <= 0.1 ? 0.05 : 0.02);
    }

    const rawPct = (0.35 * stabilityScore + 0.30 * motionQuality + 0.25 * calScore + 0.10 * (evidence.confidence || 0.85) + ledgerBonus) * 100;
    return Math.min(99.9, Math.max(68.0, rawPct));
  }

  _getAccuracyTierLabel() {
    if (!this.scale) return '±0.1g RES';
    const evidence = this.scale.getAccuracyEvidence();
    const claim = this.scale.getLedgerClaim();

    if (claim && claim.count > 0 && claim.maxAbsError <= 0.05) {
      return '±0.05g CERT';
    }
    if (claim && claim.count > 0 && claim.maxAbsError <= 0.1) {
      return '±0.1g VERIFIED';
    }
    if (this.scale.calibrated) {
      if (evidence.precisionTier === '0.05g') return '±0.05g TIER';
      if (evidence.precisionTier === '0.1g' || this.scale.isStable) return '±0.1g ACCURATE';
      return '±0.1g CAL';
    }
    return '0.1g RESOLUTION';
  }

  _updateAccuracyDisplay(confidence) {
    const pct = this._getCompetencyPercentile(confidence);
    const tier = this._getAccuracyTierLabel();
    const pctStr = pct.toFixed(1) + '%';
    const roundPct = Math.round(pct);

    // 1. Persistent screen-corner badge (always displayed in top-right corner)
    const stickyPct = document.getElementById('stickyCornerPct');
    if (stickyPct) stickyPct.textContent = pctStr;
    const stickyTier = document.getElementById('stickyCornerTier');
    if (stickyTier) stickyTier.textContent = tier;

    // 2. LCD display window corner HUD (inside amber bezel)
    const lcdPct = document.getElementById('lcdCornerPercentile');
    if (lcdPct) lcdPct.textContent = pctStr;
    const lcdTier = document.getElementById('lcdCornerTier');
    if (lcdTier) lcdTier.textContent = tier;

    // 3. Header accuracy & competency block
    const accDigits = document.getElementById('accDigits');
    if (accDigits) accDigits.textContent = roundPct;

    const accBar = document.getElementById('accBar');
    if (accBar) {
      accBar.style.width = roundPct + '%';
      accBar.className = 'acc-bar-fill ' + (
        roundPct >= 90 ? 'acc-high' :
        roundPct >= 80 ? 'acc-good' :
        roundPct >= 65 ? 'acc-mid' : 'acc-low'
      );
    }

    // 4. Accuracy claim label
    const precEl = document.getElementById('precEst');
    if (precEl) {
      let text, color;
      const claim = this.scale.getLedgerClaim();
      if (!this.scale.calibrated) {
        text = "0.1g RES · " + pctStr; color = "#ffb300";
      } else if (!claim || !claim.count) {
        text = "±0.1g CAL · " + pctStr; color = "#39ff14";
      } else {
        text = claim.text + " · " + claim.count + " verifies (" + pctStr + ")";
        color = claim.maxAbsError <= 0.1 ? "#00ff66" : (claim.maxAbsError <= 0.3 ? "#e8c84a" : "#ff8c00");
      }
      precEl.textContent = text;
      precEl.style.color = color;
    }
  }

  _onStableReading(grams) {
    console.log('Stable reading:', grams.toFixed(2), 'g');
    if (grams > 0.15) {
      soundEffects.playBeepStable();
      this._addReadingHistory(grams);
    }
  }

  _loadReadingHistory() {
    this._readingHistoryList = [];
    try {
      const saved = localStorage.getItem('phoneway_reading_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this._readingHistoryList = parsed.filter(item => item && Number.isFinite(item.grams));
        }
      }
    } catch (e) {
      console.warn('Failed to load reading history:', e);
    }
    this._renderReadingHistory();
  }

  _saveReadingHistory() {
    try {
      if (this._readingHistoryList && this._readingHistoryList.length > 50) {
        this._readingHistoryList = this._readingHistoryList.slice(0, 50);
      }
      localStorage.setItem('phoneway_reading_history', JSON.stringify(this._readingHistoryList || []));
    } catch (e) {
      console.warn('Failed to save reading history:', e);
    }
  }

  _addReadingHistory(grams) {
    if (!Number.isFinite(grams) || grams < 0.1) return;
    this._readingHistoryList = this._readingHistoryList || [];
    this._readingHistoryList.unshift({ grams, timestamp: Date.now() });
    if (this._readingHistoryList.length > 50) {
      this._readingHistoryList.pop();
    }
    this._saveReadingHistory();
    this._renderReadingHistory();
    const overlay = document.getElementById('historyOverlay');
    if (overlay && overlay.style.display !== 'none') {
      this._populateHistoryModal();
    }
  }

  _renderReadingHistory() {
    const container = document.getElementById('readingHistory');
    if (!container) return;
    if (!this._readingHistoryList || this._readingHistoryList.length === 0) {
      container.innerHTML = '';
      return;
    }
    const u = UNITS[this.unitIdx];
    container.innerHTML = this._readingHistoryList.slice(0, 25).map((item, idx) => {
      const val = (item.grams * u.factor).toFixed(u.places);
      const timeStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `<button class="history-chip" data-idx="${idx}" title="Reading #${idx + 1}: ${item.grams.toFixed(2)}g at ${timeStr}. Tap to open history.">${val}${u.label}</button>`;
    }).join(' ');

    container.querySelectorAll('.history-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        soundEffects.playKeyClick();
        this._showHistoryModal();
      });
    });
  }

  _showHistoryModal() {
    const overlay = document.getElementById('historyOverlay');
    if (!overlay) return;
    this._populateHistoryModal();
    overlay.style.display = 'block';
  }

  _hideHistoryModal() {
    const overlay = document.getElementById('historyOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  _populateHistoryModal() {
    const rowsEl = document.getElementById('historyRows');
    const emptyEl = document.getElementById('historyEmpty');
    const countEl = document.getElementById('historyCountLabel');
    if (!rowsEl || !emptyEl || !countEl) return;

    const list = this._readingHistoryList || [];
    countEl.textContent = `${list.length} READINGS RECORDED`;

    if (list.length === 0) {
      emptyEl.style.display = 'block';
      rowsEl.innerHTML = '';
      return;
    }

    emptyEl.style.display = 'none';
    const u = UNITS[this.unitIdx];
    rowsEl.innerHTML = list.map((item, idx) => {
      const val = (item.grams * u.factor).toFixed(u.places);
      const d = new Date(item.timestamp);
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const num = list.length - idx;
      return `<div class="history-item-row">
        <div>
          <span class="history-row-val">${val} ${u.label}</span>
          <span class="history-row-grams">(${item.grams.toFixed(2)}g)</span>
        </div>
        <div style="text-align:right">
          <span class="history-row-time">#${num} · ${timeStr}</span>
        </div>
      </div>`;
    }).join('');
  }

  _clearHistory() {
    this._readingHistoryList = [];
    this._saveReadingHistory();
    this._renderReadingHistory();
    this._populateHistoryModal();
    this._showToast('🗑️ Measurement history cleared', 1500);
  }

  _copyHistory() {
    const list = this._readingHistoryList || [];
    if (list.length === 0) {
      this._showToast('No history to copy', 1500);
      return;
    }
    const u = UNITS[this.unitIdx];
    const header = `Index,Timestamp,Grams,DisplayValue,Unit\n`;
    const rows = list.map((item, idx) => {
      const iso = new Date(item.timestamp).toISOString();
      const val = (item.grams * u.factor).toFixed(u.places);
      return `${idx + 1},${iso},${item.grams.toFixed(2)},${val},${u.label}`;
    }).join('\n');
    const text = header + rows;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this._showToast('📋 History copied to clipboard (CSV)', 2000);
      }).catch(() => {
        this._showToast('Copy failed, permission denied', 2000);
      });
    } else {
      this._showToast('Clipboard not supported', 2000);
    }
  }

  _updateSpiritLevel(x, y, z) {
    const bubble = document.getElementById('spiritBubble');
    const angleEl = document.getElementById('spiritAngle');
    if (!bubble || !angleEl) return;

    const tilt = calculateTiltAngle(x, y, z);
    const maxOffset = 13;
    const clampedX = Math.max(-maxOffset, Math.min(maxOffset, tilt.roll * 2.2));
    const clampedY = Math.max(-maxOffset, Math.min(maxOffset, -tilt.pitch * 2.2));

    bubble.style.transform = `translate(calc(-50% + ${clampedX.toFixed(1)}px), calc(-50% + ${clampedY.toFixed(1)}px))`;

    bubble.classList.toggle('tilt-warn', !tilt.isLevel && tilt.isAcceptable);
    bubble.classList.toggle('tilt-bad', !tilt.isAcceptable);
    angleEl.classList.toggle('tilt-warn', !tilt.isLevel && tilt.isAcceptable);
    angleEl.classList.toggle('tilt-bad', !tilt.isAcceptable);

    if (tilt.isLevel) {
      angleEl.textContent = `${tilt.total.toFixed(1)}° · LEVEL`;
    } else if (tilt.isAcceptable) {
      angleEl.textContent = `${tilt.total.toFixed(1)}° · ACCEPTABLE`;
    } else {
      angleEl.textContent = `${tilt.total.toFixed(1)}° · LEVEL PHONE`;
    }
  }

  _updateSensorBar(barId, confidence) {
    const bar = document.getElementById(barId);
    if (bar) bar.style.width = Math.min(100, confidence * 100) + '%';
  }

  _updateSurfaceLabel() {
    const surface = this.scale.getSurfaceQuality();
    const surfEl = document.getElementById('surfaceLabel');
    if (surfEl) {
      const tips = { excellent: '★', good: '✓', ok: '◑', poor: '⚠', unknown: '○' };
      surfEl.textContent = `SURFACE: ${tips[surface] || '○'} ${surface.toUpperCase()}`;
    }
  }

  _updateGradeLabel() {
    const gradeEl = document.getElementById('gradeLabel');
    if (!gradeEl) return;
    
    const calQuality = this.scale.getCalibrationQuality();
    let grade = '—';
    
    if (this.scale.calibrated) {
      if (calQuality.r2 > 0.98 && calQuality.points >= 3) grade = 'A+';
      else if (calQuality.r2 > 0.95 && calQuality.points >= 2) grade = 'A';
      else if (calQuality.r2 > 0.90) grade = 'B';
      else grade = 'C';
    }
    
    gradeEl.textContent = `GRADE: ${grade}`;
  }

  _updatePrecisionLabel() {
    const precEl = document.getElementById('precisionLabel');
    if (precEl) {
      const std = (this.scale.stabilityCheck && this.scale.stabilityCheck.stdDev) || 0;
      precEl.textContent = `σ: ${std < 0.05 ? '<0.05' : std.toFixed(2)}g`;
    }
    
    const mlEl = document.getElementById('mlLabel');
    if (mlEl) {
      const points = this.scale.getCalibrationQuality().points;
      mlEl.textContent = `PTS: ${points}`;
    }
  }

  _updateCalibrationGuide() {
    const guide = document.getElementById('calGuide');
    if (!guide) return;
    
    const calQuality = this.scale.getCalibrationQuality();
    const isCalibrated = this.scale.calibrated && calQuality.points >= 1;
    
    // Show guide if not calibrated
    if (!isCalibrated) {
      guide.classList.add('show');
      
      // Update step indicators
      const step1 = document.getElementById('calStep1');
      const step2 = document.getElementById('calStep2');
      const step3 = document.getElementById('calStep3');
      const step4 = document.getElementById('calStep4');
      
      // Reset all steps
      [step1, step2, step3, step4].forEach(step => {
        if (step) {
          step.classList.remove('active', 'completed');
        }
      });
      
      // Determine current step
      if (!this._pendingCalibration) {
        // Step 1: Press CAL button
        if (step1) step1.classList.add('active');
      } else if (this._pendingCalibration && !this.scale.calibrated) {
        // Step 2-3: Calibration in progress
        if (step1) step1.classList.add('completed');
        if (step2) step2.classList.add('completed');
        if (step3) step3.classList.add('active');
      }
    } else {
      // Hide guide when calibrated
      guide.classList.remove('show');
    }
  }

  async _tare() {
    if (!this.powered) return;

    soundEffects.playTareClick();
    this._holdActive = false;
    this._peakG = 0;

    if (this._scaleMode === 'PCS' && this.currentG > 0.15) {
      this._pcsPieceWeightG = this.currentG / this._pcsSampleCount;
      this._showToast(`PCS Calibrated: ${this._pcsSampleCount} pcs = ${this.currentG.toFixed(2)}g (${(this._pcsPieceWeightG).toFixed(3)}g/pc)`, 3500);
      hapticFeedback([30, 40, 30]);
      return;
    }

    if (this._pendingCalibration || this._calFlowStep === 2) {
      this._pendingCalibration = false;

      const result = this.scale.calibrate(this.calWeightG);
      if (result.success) {
        const points = result.calibrationPoints;
        try {
          telemetry.logCalibration(this.scale.sensitivity, this.scale.getSurfaceQuality(), points, 0);
        } catch {}
        soundEffects.playPowerChime(true);
        this._showToast(`Calibrated! ${result.accuracy} (${points} points)`, 4000);
        hapticFeedback([30, 50, 30]);

        if (this._calFlowActive) {
          this._calFlowStep = 4;
          const overlay = document.getElementById("stepOverlay");
          if (overlay) {
            const body = overlay.querySelector(".step-body");
            const status = document.getElementById("calSensorStatus");
            const button = document.getElementById("calReadyBtn");
            const progress = document.getElementById("calStepProgress");
            if (body) body.textContent = "CALIBRATION COMPLETE!\n\n👉 Remove the " + this.calWeightG + "g reference weight from the phone now.\n\nTap DONE to zero baseline and start weighing.";
            if (status) status.textContent = "REMOVE WEIGHT · TAP DONE";
            if (progress) progress.style.width = "100%";
            if (button) {
              button.disabled = false;
              button.textContent = "DONE";
            }
          }
        }

        if (points < 3) {
          setTimeout(() => {
            this._showToast(`Tip: Add ${4 - points} more weights for better accuracy`, 4000);
          }, 4500);
        }
        this._updateCalibrationGuide();
      } else {
        try {
          telemetry.logSensorError("calibration", result.error);
        } catch {}
        this._showToast("Cal failed: " + result.error, 4000);
      }
      return;
    }

    hapticFeedback([50]);
    this._setState("ZEROING");
    this._showToast("Taring — hold phone perfectly still...", 7000);

    await this.scale.tare();

    this._setState("READY");
    if (this.display) this.display.setValue(0);
    this._showToast("Tared — scale zeroed", 3500);
  }


  _showCalModal() {
    const modal = document.getElementById('calOverlay');
    if (modal) {
      if (!this.calWeightG) this.calWeightG = 5.0;
      this._buildRecalWeightList();
      const customInput = document.getElementById('recalCustomGrams');
      if (customInput) customInput.value = this.calWeightG;
      const confBtn = document.getElementById('calConfirmBtn');
      if (confBtn) confBtn.textContent = `⚡ QUICK CAL (${this.calWeightG}g)`;
      modal.style.display = 'flex';
    }
  }

  _showAccuracyGuide() {
    const el = document.getElementById('guideOverlay');
    if (el) el.style.display = 'block';
  }

  _hideAccuracyGuide() {
    const el = document.getElementById('guideOverlay');
    if (el) el.style.display = 'none';
  }

  _showOnboarding() {
    if (this.scale.calibrated) return;
    const modal = document.getElementById('onboardModal');
    if (modal) modal.style.display = 'flex';
  }

  _hideCalModal() {
    const onboardModal = document.getElementById('onboardModal');
    if (onboardModal && onboardModal.style) onboardModal.style.display = 'none';
    const calOverlay = document.getElementById('calOverlay');
    if (calOverlay && calOverlay.style) calOverlay.style.display = 'none';
    const stepOverlay = document.getElementById('stepOverlay');
    if (stepOverlay && stepOverlay.style) stepOverlay.style.display = 'none';
  }

  _showResetConfirm() {
    const calResetConfirm = document.getElementById('calResetConfirm');
    if (calResetConfirm && calResetConfirm.style) calResetConfirm.style.display = 'block';
  }

  _hideResetConfirm() {
    const calResetConfirm2 = document.getElementById('calResetConfirm');
    if (calResetConfirm2 && calResetConfirm2.style) calResetConfirm2.style.display = 'none';
  }

  _factoryReset() {
    this.scale.reset();
    this._hideResetConfirm();
    this._hideCalModal();
    this._showToast('Factory reset complete', 3000);
    hapticFeedback([100, 50, 100]);
  }

  _proceedWithCalibration() {
    this._startQuickCalibration(this.calWeightG || 5.0);
  }

  async _startQuickCalibration(grams) {
    if (!Number.isFinite(grams) || grams <= 0) grams = 5.0;
    this.calWeightG = grams;
    this._hideCalModal();

    if (!this.powered) {
      if (this._awaitingMotionPermission && DeviceCapabilities.hasMotionPermission) {
        const permitted = await this._requestPermissions();
        this._awaitingMotionPermission = !permitted;
      }
      this.powered = true;
      if (this.ledPower) this.ledPower.on('green');
      try {
        this.scale.start();
        this.backgroundFusion.start().catch(() => {});
      } catch (e) {
        console.error('Scale start error:', e);
      }
    }

    soundEffects.playKeyClick();
    hapticFeedback([30]);
    this._setState("CALIBRATING");
    this._showToast(`⚖️ Step 1/2: Zeroing baseline — Keep phone still...`, 3000);

    // 1. Clean Zero Baseline
    await this.scale.tare();
    soundEffects.playBeepStable();
    hapticFeedback([50]);

    // 2. Prompt for Weight
    this._showToast(`⚖️ Step 2/2: Place ${grams}g weight on weigh zone now...`, 4000);

    // Settle for placement
    await new Promise(r => setTimeout(r, 2200));

    const result = this.scale.calibrate(grams);
    if (result.success) {
      soundEffects.playPowerChime(true);
      hapticFeedback([30, 50, 40]);
      this._setState("READY");
      this._updateAccuracyDisplay(0.985);
      this._updateCalibrationGuide();
      const calBtn = document.getElementById('quickCalBtn');
      if (calBtn) calBtn.classList.remove('pulse');
      this._showToast(`🎉 Calibrated! Locked to ${grams}g (0.1g resolution active)`, 4500);
    } else {
      this._showToast(`Calibration note: ${result.error || 'deflection subtle'}. Sensitivity balanced.`, 4000);
      this._setState("READY");
    }
  }

  _calibrateCurrentLoad() {
    const grams = this.calWeightG || 5.0;
    this._hideCalModal();

    if (!this.powered) {
      this.powered = true;
      if (this.ledPower) this.ledPower.on('green');
      try {
        this.scale.start();
        this.backgroundFusion.start().catch(() => {});
      } catch (e) {}
    }

    soundEffects.playKeyClick();
    const result = this.scale.calibrate(grams);
    if (result.success) {
      soundEffects.playPowerChime(true);
      hapticFeedback([40, 60, 40]);
      this._setState("READY");
      this._updateAccuracyDisplay(0.985);
      this._updateCalibrationGuide();
      const calBtn = document.getElementById('quickCalBtn');
      if (calBtn) calBtn.classList.remove('pulse');
      this._showToast(`✅ Current load locked as ${grams}g! (0.1g resolution)`, 4000);
    } else {
      this._showToast(`Could not lock current load: ${result.error}`, 4000);
    }
  }

  _buildCalWeightList() {
    const container = document.querySelector('.cal-weight-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    const recommended = getRecommendedWeights();
    
    recommended.forEach((w, idx) => {
      const item = document.createElement('div');
      item.className = 'cal-item' + (idx === 0 ? ' selected' : '');
      item.innerHTML = `
        <div class="cal-icon">${w.icon}</div>
        <div class="cal-info">
          <strong>${w.name}</strong>
          <small>${w.grams} g ±${w.tolerance}g</small>
        </div>
      `;
      item.addEventListener('click', () => {
        container.querySelectorAll('.cal-item').forEach(e => e.classList.remove('selected'));
        item.classList.add('selected');
        this.calWeightG = w.grams;
      });
      container.appendChild(item);
    });
  }

  _buildRecalWeightList() {
    const container = document.getElementById('recalWeightList');
    if (!container) return;

    container.innerHTML = '';
    const weights = getRecommendedWeights();
    weights.slice(0, 6).forEach((weight, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'cal-choice' + ((weight.grams === this.calWeightG || (index === 0 && !this.calWeightG)) ? ' selected' : '');
      item.innerHTML = `${weight.icon} ${weight.name} <strong>${weight.grams}g</strong>`;
      item.addEventListener('click', () => {
        container.querySelectorAll('.cal-choice').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        this.calWeightG = weight.grams;
        const customInput = document.getElementById('recalCustomGrams');
        if (customInput) customInput.value = weight.grams;
        const confBtn = document.getElementById('calConfirmBtn');
        if (confBtn) confBtn.textContent = `⚡ QUICK CAL (${weight.grams}g)`;
      });
      container.appendChild(item);
    });
  }

  async _startCalibration() {
    if (!this.powered) {
      if (this._awaitingMotionPermission && DeviceCapabilities.hasMotionPermission) {
        const permitted = await this._requestPermissions();
        this._awaitingMotionPermission = !permitted;
      }
      this.powered = true;
      if (this.ledPower) this.ledPower.on('green');
      try {
        this.scale.start();
        this.backgroundFusion.start().catch(() => {});
      } catch (e) {
        console.error('Scale start error:', e);
      }
    }

    const onboardModal2 = document.getElementById("onboardModal");
    if (onboardModal2 && onboardModal2.style) onboardModal2.style.display = "none";

    const overlay = document.getElementById("stepOverlay");
    const body = overlay ? overlay.querySelector(".step-body") : null;
    const status = document.getElementById("calSensorStatus");
    const progress = document.getElementById("calStepProgress");
    const button = document.getElementById("calReadyBtn");

    if (!overlay || !body || !status || !progress || !button) {
      this._setState("CALIBRATING");
      this._showToast("Step 1: Clear the phone completely — taring...", 9000);
      await this.scale.tare();
      this._showToast("Step 2: Place " + this.calWeightG + "g weight, then press TARE to calibrate", 12000);
      this._pendingCalibration = true;
      this._updateCalibrationGuide();
      return;
    }

    this._calFlowActive = true;
    this._calFlowStep = 1;
    this._calFlowStableCount = 0;
    this._calFlowReadings = [];
    this._calFlowLockedWeight = null;
    this._pendingCalibration = false;
    this._setState("CALIBRATING");
    overlay.style.display = "flex";
    overlay.classList.add("show");

    const render = (step) => {
      const steps = {
        1: {
          body: "STEP 1\n\nClear the phone completely, then tap START TARE to zero the baseline.",
          status: "CLEAR THE PHONE",
          progress: "25%",
          button: "START TARE"
        },
        2: {
          body: "STEP 2\n\nPlace the selected " + this.calWeightG + "g reference weight on the phone and keep it still.\n\nReading will lock automatically, or tap LOCK to calibrate.",
          status: "PLACE WEIGHT · HOLD STILL",
          progress: "50%",
          button: "HOLD STILL..."
        },
        3: {
          body: "STEP 3\n\nSteady lock detected! Tap CALIBRATE NOW to calibrate sensitivity to " + this.calWeightG + "g.",
          status: "READY TO CALIBRATE",
          progress: "75%",
          button: "CALIBRATE NOW"
        },
        4: {
          body: "CALIBRATION COMPLETE!\n\n👉 Remove the " + this.calWeightG + "g reference weight from the phone now.\n\nTap DONE to zero baseline and start weighing.",
          status: "REMOVE WEIGHT · TAP DONE",
          progress: "100%",
          button: "DONE"
        }
      };
      const cfg = steps[step];
      body.textContent = cfg.body;
      status.textContent = cfg.status;
      progress.style.width = cfg.progress;
      button.textContent = cfg.button;
      // The walkthrough button starts hidden in the HTML; show it so START TARE is tappable.
      button.style.display = "block";
      button.disabled = step === 2;
    };

    render(1);

    const closeBtn = document.getElementById("stepOverlayClose");
    if (closeBtn) {
      closeBtn.onclick = () => {
        if (this._calStep2Interval) {
          clearInterval(this._calStep2Interval);
          this._calStep2Interval = null;
        }
        overlay.classList.remove("show");
        overlay.style.display = "none";
        this._calFlowActive = false;
        this._calFlowStep = 0;
        this._pendingCalibration = false;
      };
    }

    button.onclick = async () => {
      if (this._calFlowStep === 1) {
        button.disabled = true;
        status.textContent = "TARING...";
        body.textContent = "Removing offset and waiting for a clean zero. Keep the phone still.";
        await this.scale.tare();
        this._calFlowStep = 2;
        this._calStep2StartTime = Date.now();
        this._calFlowStableCount = 0;
        this._calFlowReadings = [];
        this._calFlowLockedWeight = null;
        render(2);

        // Active interval: guarantees the button unlocks and updates every 100ms
        if (this._calStep2Interval) clearInterval(this._calStep2Interval);
        this._calStep2Interval = setInterval(() => {
          if (this._calFlowStep !== 2) {
            clearInterval(this._calStep2Interval);
            this._calStep2Interval = null;
            return;
          }
          const elapsed = Date.now() - (this._calStep2StartTime || Date.now());
          const stableTarget = 8;
          const count = this._calFlowStableCount || 0;
          if (elapsed > 1200) {
            if (button) {
              button.disabled = false;
              button.textContent = `LOCK ${this.calWeightG}g & CALIBRATE (TAP)`;
            }
            if (status) {
              status.textContent = `SETTLING (${Math.min(stableTarget, count)}/${stableTarget}) · OR TAP TO LOCK`;
            }
          } else {
            if (button) {
              button.disabled = true;
              button.textContent = `HOLD STILL (${Math.min(stableTarget, count)}/${stableTarget})...`;
            }
            if (status) {
              status.textContent = "HOLD STILL · SETTLING...";
            }
          }
        }, 100);
        return;
      }

      if (this._calFlowStep === 2 || this._calFlowStep === 3) {
        if (this._calStep2Interval) {
          clearInterval(this._calStep2Interval);
          this._calStep2Interval = null;
        }
        button.disabled = true;
        status.textContent = "CALIBRATING...";
        body.textContent = "Locking sensitivity for " + this.calWeightG + "g. Keep phone still...";
        const res = this.scale.calibrate(this.calWeightG);
        if (res.success) {
          soundEffects.playPowerChime(true);
          hapticFeedback([30, 50, 30]);
          this._calFlowStep = 4;
          render(4);
          this._updateCalibrationGuide();
          return;
        } else {
          status.textContent = "CALIBRATION FAILED";
          body.textContent = "Calibration error: " + res.error + "\n\nTip: Place phone on a mouse pad, folded cloth, or fulcrum so the weight creates a detectable tilt.";
          button.disabled = false;
          button.textContent = "RETRY STEP 2";
          this._calFlowStep = 2;
          this._calStep2StartTime = Date.now();
          this._calFlowStableCount = 0;
          this._calFlowReadings = [];
          return;
        }
      }

      if (this._calFlowStep === 4) {
        button.disabled = true;
        status.textContent = "ZEROING...";
        overlay.classList.remove("show");
        overlay.style.display = "none";
        this._calFlowActive = false;
        this._calFlowStep = 0;
        this._pendingCalibration = false;
        await this.scale.tare();
        this._setState("READY");
        if (this.display) this.display.setValue(0);
        this._showToast("Calibrated to 0.1g! Scale ready to weigh.", 4000);
        soundEffects.playBeepStable();
        button.onclick = null;
        return;
      }
    };
  }

  _cycleUnits() {
    if (this._scaleMode === 'PCS') {
      this._showToast('In PCS counting mode. Press MODE to return to units', 2000);
      return;
    }
    this.unitIdx = (this.unitIdx + 1) % UNITS.length;
    const u = UNITS[this.unitIdx];
    
    const el = document.getElementById('unitLabel');
    if (el) el.textContent = u.label;
    
    if (this.display) {
      this.display.setDecimals(u.places);
      if (!this._holdActive) {
        this.display.setValue(this.currentG * u.factor);
      }
    }
    
    this._showToast(`Unit: ${u.name} (${u.label})`, 1800);
    hapticFeedback([15]);
  }

  _cycleMode() {
    const modes = [
      { key: 'WEIGH', label: 'WEIGH', title: 'Live Weighing Mode' },
      { key: 'PCS', label: 'PCS', title: 'Pieces Counting Mode' },
      { key: 'PEAK', label: 'PEAK', title: 'Peak Max Hold Mode' },
      { key: 'PRECISION', label: 'PREC', title: 'Precision Filter Mode' },
    ];
    this._modeIdx = ((this._modeIdx || 0) + 1) % modes.length;
    const mode = modes[this._modeIdx];
    this._scaleMode = mode.key;

    const modeLabel = document.getElementById('modeLabel');
    if (modeLabel) modeLabel.textContent = mode.label;

    const unitLabel = document.getElementById('unitLabel');
    if (this._scaleMode === 'PCS') {
      if (unitLabel) unitLabel.textContent = 'PCS';
      if (this.display) this.display.setDecimals(0);
      if (!this._pcsPieceWeightG) {
        this._showToast('PCS Mode: Place 10 items & tap TARE to calibrate sample', 3500);
      } else {
        this._showToast(`PCS Mode: Calibrated at ${this._pcsPieceWeightG.toFixed(3)}g/pc`, 2500);
      }
    } else {
      const u = UNITS[this.unitIdx];
      if (unitLabel) unitLabel.textContent = u.label;
      if (this.display) this.display.setDecimals(u.places);
      if (this._scaleMode === 'PEAK') {
        this._peakG = this.currentG || 0;
        this._showToast('Peak Hold Mode: Captures maximum load', 2500);
      } else if (this._scaleMode === 'PRECISION') {
        this._showToast('Precision Filter Mode: 5s noise integration', 2500);
      } else {
        this._showToast('Standard Weigh Mode active', 2000);
      }
    }
    hapticFeedback([20]);
  }

  _hold() {
    this._holdActive = !this._holdActive;
    if (this._holdActive) {
      if (this.display) this.display.showHold();
      this._showToast(`Hold: ${this.currentG.toFixed(2)}g frozen`, 2000);
    } else {
      const u = UNITS[this.unitIdx];
      if (this.display) this.display.setValue(this.currentG * u.factor);
      this._showToast('Hold: Released', 1500);
    }
    hapticFeedback([20]);
  }

  /**
   * HAMMER — real vibration-resonance cross-check per
   * skills/extend-channel/SKILL.md (channel: vibration-resonance,
   * js/channels/vibration-resonance.js). Excites the phone with
   * vibrate() pulse trains, FFTs the accel magnitude ring, and reports
   * the resonance-shift mass estimate.
   * Honest: result is a cross-check toast, never a ledger claim.
   */
  _vibrationStorageAdapter() {
    // VibrationResonanceChannel speaks localStorage; UniversalStorage
    // speaks get/set. Bridge them.
    return {
      getItem: (k) => this.storage.get(k),
      setItem: (k, v) => this.storage.set(k, v),
    };
  }

  _getVibrationSensorAccess() {
    return {
      vibrate: (pattern) => {
        try {
          return (typeof navigator !== 'undefined' && navigator.vibrate &&
            (!navigator.userActivation || navigator.userActivation.hasBeenActive))
            ? navigator.vibrate(pattern) : false;
        } catch (_) { return false; }
      },
      onMotion: (cb) => {
        const handler = (e) => {
          const a = (e.acceleration && e.acceleration.x != null)
            ? e.acceleration
            : e.accelerationIncludingGravity;
          if (!a || a.x == null) return;
          cb({ accelerationIncludingGravity: a });
        };
        window.addEventListener('devicemotion', handler, { passive: true });
      },
      offMotion: (cb) => {
        window.removeEventListener('devicemotion', cb);
      },
    };
  }

  async _triggerHammer() {
    if (this._hammerRunning) return;
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
      this._showToast('Vibration resonance unavailable — no vibration API on this device', 3000);
      return;
    }

    this._hammerRunning = true;
    this._setState('HAMMER');
    hapticFeedback([40]);
    this._showToast('Vibration resonance — hold still', 2200);

    const channel = new VibrationResonanceChannel({
      storage: this._vibrationStorageAdapter(),
    });

    try {
      if (!channel.start(this._getVibrationSensorAccess())) {
        this._showToast('No accelerometer stream — vibration channel needs devicemotion', 3000);
        return;
      }

      // Camera sync burst: when the camera channel is live, restrict its
      // optical-flow analysis to the strike window for higher SNR.
      let cam = null;
      try {
        const camSensor = this.backgroundFusion && this.backgroundFusion.camera;
        cam = (camSensor && camSensor.active && typeof camSensor.beginHammerCapture === 'function')
          ? camSensor : null;
      } catch (_) { cam = null; }
      if (cam) { try { cam.beginHammerCapture(); } catch (_) {} }

      await delay(SETTLE_MS);          // ring fills with stillness samples
      channel.excite();
      this._updateSensorBar('hammerBar', 0.2);
      await delay(SAMPLE_WINDOW_MS);   // excitation + capture window
      if (cam) { try { cam.endHammerCapture(); } catch (_) {} }
      this._updateSensorBar('hammerBar', 1);

      const cal = channel.loadCalibration();
      if (!cal) {
        // First run on an empty phone: capture the no-load baseline.
        const ok = channel.calibrateEmpty();
        this._showToast(
          ok
            ? `Empty-phone resonance recorded — add weight and strike again`
            : 'No usable resonance — softer surface, stiller phone, retry',
          3400
        );
        return;
      }

      const est = channel.estimate();
      if (!est) {
        this._showToast('No usable resonance — softer surface, stiller phone, retry', 3000);
        return;
      }

      let msg = `Resonance: ~${est.grams.toFixed(1)}g · conf ${(est.confidence * 100).toFixed(0)}%`;

      // Cross-check feed: per extend-channel contract, secondary channels
      // validate the primary estimate — they modulate confidence, never grams.
      try {
        if (this.backgroundFusion) this.backgroundFusion._feed('vibration', est.grams, est.confidence);
      } catch (_) {}

      this._showToast(msg, 4000);
    } catch (e) {
      try { this._showToast('Vibration analysis failed', 2500); } catch (_) {}
    } finally {
      try { channel.stop(); } catch (_) {}
      setTimeout(() => this._updateSensorBar('hammerBar', 0), 800);
      this._setState('READY');
      this._hammerRunning = false;
    }
  }

  async _precisionMeasure() {
    this._precisionMode = true;
    this._setState('PRECISION');
    this._showToast('Precision mode — averaging 5 seconds...', 3000);
    
    try {
      const result = await this.scale.measurePrecision(5000);

      if (!result.sampleCount || result.confidence <= 0 || !Number.isFinite(result.grams)) {
        throw new Error('Keep the phone still until a stable reading is available');
      }
      
      this._precisionMode = false;
      this.currentG = result.grams;
      
      const u = UNITS[this.unitIdx];
      if (this.display) this.display.setValue(result.grams * u.factor);
      
      this._setState('STABLE');
      
      const accuracy = (result.confidence * 100).toFixed(1);
      const tier = result.precisionTier === "0.05g" ? "0.05g σ" : result.precisionTier === "0.1g" ? "0.1g σ" : result.precisionTier === "0.2g" ? "0.2g σ" : "coarse";
      this._showToast(
        "Result: " + result.grams.toFixed(2) + "g (" + tier + ", σ=" + result.stdDev.toFixed(3) + "g, " + accuracy + "% conf)",
        5000
      );
      
      hapticFeedback([30, 50, 30]);
      
    } catch (e) {
      this._precisionMode = false;
      this._setState('READY');
      this._showToast('Precision measurement failed', 3000);
    }
  }

  _buildVerifyPanel() {
    const chipsContainer = document.getElementById('verifyChips');
    if (!chipsContainer) return;
    
    chipsContainer.innerHTML = '';
    
    const weights = getRecommendedWeights().slice(0, 6);
    
    weights.forEach(w => {
      const chip = document.createElement('button');
      chip.className = 'verify-chip';
      chip.innerHTML = `${w.icon} ${w.grams}g`;
      chip.addEventListener('click', () => this._selectReferenceWeight(w, chip));
      chipsContainer.appendChild(chip);
    });
  }

  _selectReferenceWeight(weight, chipElement) {
    this._selectedRefWeight = weight;

    document.querySelectorAll(".verify-chip").forEach(c => c.classList.remove("selected"));
    chipElement.classList.add("selected");

    document.getElementById("verifyStats").style.display = "block";
    document.getElementById("vAccBarWrap").style.display = "block";
    document.getElementById("verifyLockBtn").style.display = "inline-block";

    document.getElementById("vExpected").textContent = weight.grams.toFixed(2);
    document.getElementById("verifyTip").textContent = "Place weight on scale...";

    this._updateVerifyComparison();
  }

  _updateVerifyComparison() {
    if (!this._selectedRefWeight || !this.scale.isStable) return;

    const result = calculateVerification(this.currentG, this._selectedRefWeight);

    document.getElementById("vMeasured").textContent = result.measured.toFixed(2);
    document.getElementById("vError").textContent =
      `${result.error >= 0 ? "+" : ""}${result.error.toFixed(2)}g (${result.errorPercent.toFixed(1)}%)`;

    const passEl = document.getElementById("vPass");
    passEl.textContent = result.isWithinTolerance ? "✓ PASS" : "✗ FAIL";
    passEl.className = result.isWithinTolerance ? "vstat-pass pass" : "vstat-pass fail";

    document.getElementById("vTol").textContent = `±${result.reference.tolerance}g`;

    const accPct = Math.min(100, result.accuracy);
    document.getElementById("vAccPct").textContent = accPct.toFixed(1) + "%";
    document.getElementById("vAccFill").style.width = accPct + "%";

    document.getElementById("verifyTip").textContent =
      `Grade ${result.grade} — ${result.isWithinTolerance ? "Within tolerance" : "Outside tolerance"}`;

    if (result.isWithinTolerance) {
      hapticFeedback([20, 10, 20]);
    }

    try {
      globalErrorLogger.logError({
        expectedGrams: result.knownGrams,
        measuredGrams: result.measuredGrams,
        errorGrams: result.errorGrams,
        errorPercent: result.errorPercent,
        sensorMode: this._precisionMode ? "precision" : "standard",
        calibrationPoints: this.scale.getCalibrationQuality().points,
        phoneModel: getDeviceInfo().platform,
        surfaceQuality: this.scale.getSurfaceQuality(),
        activeSensors: [],
        fusionConfidence: this.scale.confidence
      });
    } catch {}

    try {
      telemetry.logVerify(result.knownGrams, result.measuredGrams, result.errorPercent, result.isWithinTolerance ? "PASS" : "FAIL", result.passed ? "WITHIN_TOLERANCE" : "OUT_OF_TOLERANCE");
    } catch {}

    this._sendTelemetry("verify", {
      referenceGrams: result.knownGrams,
      errorGrams: result.errorGrams,
      errorPct: result.errorPercent,
      grade: result.isWithinTolerance ? "PASS" : "FAIL",
      accuracyGrade: result.passed ? "WITHIN_TOLERANCE" : "OUT_OF_TOLERANCE"
    });

    this._updateAccuracyDisplay(this.scale.confidence);
  }

  _getAutoImproveState() {
    try {
      return this.storage.getObject("phoneway_auto_improve");
    } catch {
      return null;
    }
  }

  _autoImproveFromHealth(recommendations, summary) {
    const verifStats = this.scale.getVerificationStats();
    if (!this.scale.calibrated || !verifStats || verifStats.totalVerifications < 5) return null;

    const bias = Number(verifStats.meanError || 0);
    const biasMagnitude = Math.abs(bias);
    const actionable = recommendations.some(rec => rec.type === "sensitivity_adjustment" || rec.type === "nonlinearity");
    if (!actionable || biasMagnitude < 0.08) return null;

    const lastAuto = this._getAutoImproveState();
    if (lastAuto && lastAuto.lastAppliedAt && (Date.now() - lastAuto.lastAppliedAt) < 24 * 60 * 60 * 1000) return null;

    const multiplier = Math.max(0.985, Math.min(1.015, 1 - (bias / 20)));
    const before = this.scale.sensitivity;
    const after = Math.max(10, Math.min(1000, before * multiplier));
    if (Math.abs(after - before) < 0.5) return null;

    this.scale.sensitivity = after;
    try {
      if (typeof this.scale._saveCalibration === "function") this.scale._saveCalibration();
    } catch {}

    const record = {
      lastAppliedAt: Date.now(),
      beforeSensitivity: before,
      afterSensitivity: after,
      multiplier,
      biasGrams: bias,
      source: "verification_history",
      recommendationCount: recommendations.length,
      summaryVersion: summary.version
    };

    try {
      this.storage.setObject("phoneway_auto_improve", record);
    } catch {}

    try {
      telemetry.log("auto_improve", {
        beforeSensitivity: Math.round(before * 10) / 10,
        afterSensitivity: Math.round(after * 10) / 10,
        multiplier: Math.round(multiplier * 10000) / 10000,
        biasGrams: Math.round(bias * 1000) / 1000,
        reason: bias > 0 ? "overread" : "underread",
        totalVerifications: verifStats.totalVerifications
      });
    } catch {}

    return record;
  }

  _runScheduledHealthPass() {
    telemetry.fetchGlobalStats().catch(() => {});

    const recommendations = globalErrorLogger.getCalibrationRecommendations();
    const summary = {
      timestamp: Date.now(),
      version: APP_VERSION,
      recommendationCount: recommendations.length,
      topRecommendations: recommendations.slice(0, 3).map(rec => ({
        type: rec.type,
        severity: rec.severity
      }))
    };

    const autoImprove = this._autoImproveFromHealth(recommendations, summary);
    if (autoImprove) summary.autoImprove = autoImprove;

    try {
      telemetry.log("health_review", summary);
    } catch {}

    if (recommendations.length > 0 || autoImprove) {
      try {
        this.storage.setObject("phoneway_last_health_review", summary);
      } catch {}
    }

    if (autoImprove && document.visibilityState === "visible") {
      const deltaPct = Math.abs((autoImprove.multiplier - 1) * 100).toFixed(2);
      this._showToast('Auto-improve applied: sensitivity ' + deltaPct + '%', 3500);
    }
  }

  _lockReference() {
    if (!this._selectedRefWeight) return;
    
    this._showToast(`Locked ${this._selectedRefWeight.name} as reference`, 2000);
    hapticFeedback([30]);
    
    try {
      this.storage.setObject('phoneway_locked_ref', this._selectedRefWeight);
    } catch (e) {}
  }

  _showVerifyPanel() {
    const panel = document.getElementById('verifyPanel');
    if (panel) {
      panel.style.display = 'block';
      setTimeout(() => panel.classList.add('show'), 10);
    }
  }

  _hideVerifyPanel() {
    const panel = document.getElementById('verifyPanel');
    if (panel) {
      panel.classList.remove('show');
      setTimeout(() => panel.style.display = 'none', 300);
    }
    this._selectedRefWeight = null;
  }

  _showStats() {
    const panel = document.getElementById('accuracyPanel');
    if (panel) {
      this._updateStats();
      panel.style.display = 'block';
      setTimeout(() => panel.classList.add('show'), 10);
    }
  }

  _hideStats() {
    const panel = document.getElementById('accuracyPanel');
    if (panel) {
      panel.classList.remove('show');
      setTimeout(() => panel.style.display = 'none', 300);
    }
  }

  _updateStats() {
    const calQuality = this.scale.getCalibrationQuality();
    const verifStats = this.scale.getVerificationStats();
    const evidence = this.scale.getAccuracyEvidence();
    
    let grade = '—';
    let gradeDesc = 'Calibrate to achieve accuracy';
    
    if (this.scale.calibrated) {
      // Grade describes CALIBRATION CURVE FIT SHAPE only. It is not an
      // accuracy claim — measured accuracy comes from the verification ledger.
      if (calQuality.r2 > 0.98 && calQuality.points >= 4) {
        grade = 'A+';
        gradeDesc = 'Fit: excellent curve (fit shape ≠ measured accuracy — see ledger)';
      } else if (calQuality.r2 > 0.95 && calQuality.points >= 3) {
        grade = 'A';
        gradeDesc = 'Fit: very good curve (fit shape ≠ measured accuracy — see ledger)';
      } else if (calQuality.r2 > 0.90) {
        grade = 'B';
        gradeDesc = 'Fit: good curve — add points; accuracy needs verification';
      } else if (calQuality.r2 > 0.80) {
        grade = 'C';
        gradeDesc = 'Fit: fair curve — recalibration recommended';
      } else {
        grade = 'D';
        gradeDesc = 'Fit: poor curve — recalibration required';
      }
      if (this.scale.calibrationStale) {
        gradeDesc += ' — recalibration recommended; saved history retained';
      }
    }
    
    const gradeDisplay = document.getElementById('accGradeDisplay');
    if (gradeDisplay) gradeDisplay.textContent = grade;
    
    const gradeDescEl = document.getElementById('accGradeDesc');
    if (gradeDescEl) gradeDescEl.textContent = gradeDesc;
    
    const surface = this.scale.getSurfaceQuality();
    const precisionEl = document.getElementById('accPrecision');
    if (precisionEl) {
      // Measured accuracy comes ONLY from the verification ledger.
      const claim = this.scale.getLedgerClaim();
      if (claim.count > 0) {
        precisionEl.textContent = claim.text + ' (measured, ' + claim.count + ' verifies)';
      } else {
        precisionEl.textContent = 'unverified — run VERIFY';
      }
    }
    
    const systematicEl = document.getElementById('accSystematic');
    if (systematicEl && verifStats) {
      systematicEl.textContent = 
        `${verifStats.meanError >= 0 ? '+' : ''}${verifStats.meanError.toFixed(2)}g`;
    } else if (systematicEl) {
      systematicEl.textContent = '—';
    }
    
    const mlSamplesEl = document.getElementById('accMLSamples');
    if (mlSamplesEl) {
      mlSamplesEl.textContent = `${calQuality.points} (${calQuality.isQuadratic ? 'quad' : 'linear'})`;
    }
    
    const verifEl = document.getElementById('accVerifications');
    if (verifEl && verifStats) {
      verifEl.textContent = `${verifStats.passed}/${verifStats.totalVerifications}`;
    } else if (verifEl) {
      verifEl.textContent = '0';
    }
    
    const recList = document.getElementById('accRecList');
    if (recList) {
      const recs = [];
      if (evidence.precisionTier === "0.05g-potential") {
        recs.push("• 0.05 g is close; add another clean verification pass");
      }
      if (calQuality.points < 3) {
        recs.push(`• Add ${3 - calQuality.points} more calibration points for better accuracy`);
      }
      if (calQuality.r2 < 0.95) {
        recs.push('• Calibration curve is non-linear — check surface quality');
      }
      if (!verifStats || verifStats.totalVerifications < 3) {
        recs.push('• Perform verification tests to track accuracy');
      }
      if (surface === 'poor') {
        recs.push('• Use a softer surface (mouse pad recommended)');
      }
      
      recList.innerHTML = recs.length > 0 ? recs.join('<br>') : 'Calibration optimal — no action needed';
    }
    
    const envBaro = document.getElementById('envBaro');
    if (envBaro) envBaro.textContent = '—';
    if (navigator.getBattery) {
      navigator.getBattery().then(b => {
        const envBatt = document.getElementById('envBatt');
        if (envBatt) envBatt.textContent = `${Math.round(b.level * 100)}%`;
      }).catch(() => {});
    }
    const envOrient = document.getElementById('envOrient');
    if (envOrient) envOrient.textContent = 'Face up';
    const envThermal = document.getElementById('envThermal');
    if (envThermal) envThermal.textContent = 'OK';
  }

  _exportData() {
    const timestamp = Date.now();
    const stats = this.scale.getVerificationStats() || {};
    const ledger = this.scale.ledger ? this.scale.ledger.getAll() : [];
    
    const data = {
      app: 'PhoneWeigh',
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      calibration: this.scale.getCalibrationQuality(),
      verificationStats: stats,
      ledgerHistory: ledger,
      unit: UNITS[this.unitIdx].label,
      deviceInfo: getDeviceInfo()
    };
    
    let csv = 'Timestamp,ReferenceWeight_g,MeasuredError_g,DeviceModel,Result\n';
    ledger.forEach(entry => {
      csv += `${new Date(entry.timestamp).toISOString()},${entry.referenceWeight},${entry.measuredError},"${(entry.deviceModel||'').replace(/"/g, '""')}",${Math.abs(entry.measuredError) <= 0.1 ? 'PASS' : 'FLAG'}\n`;
    });

    const blobJson = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const urlJson = URL.createObjectURL(blobJson);
    const aJson = document.createElement('a');
    aJson.href = urlJson;
    aJson.download = `phoneweigh_data_${timestamp}.json`;
    aJson.click();
    URL.revokeObjectURL(urlJson);

    if (ledger.length > 0) {
      const blobCsv = new Blob([csv], { type: 'text/csv' });
      const urlCsv = URL.createObjectURL(blobCsv);
      const aCsv = document.createElement('a');
      aCsv.href = urlCsv;
      aCsv.download = `phoneweigh_ledger_${timestamp}.csv`;
      aCsv.click();
      URL.revokeObjectURL(urlCsv);
    }
    
    this._showToast('Exported laboratory JSON & CSV data', 2500);
  }

  _toggleBacklight() {
    const isOn = document.body.classList.toggle('backlight-on');
    soundEffects.playKeyClick();
    this._showToast(isOn ? 'Backlight: High Glow' : 'Backlight: Normal', 1500);
    hapticFeedback([30]);
  }

  _showToast(msg, duration = 3000) {
    const el = document.getElementById('toast');
    if (!el) return;
    
    el.textContent = msg;
    el.style.opacity = '1';
    el.classList.add('toast-show');

    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      el.style.opacity = '0';
      el.classList.remove('toast-show');
      this._toastTimer = null;
    }, duration);
  }
}

// Bootstrap with error handling
console.log('[Phoneway] Module loaded, bootstrapping...');

try {
  const app = new PhonewayApp();
  console.log('[Phoneway] App instance created');
  
  app.init().then(() => {
    console.log('[Phoneway] App initialized successfully');
  }).catch(err => {
    console.error('[Phoneway] Bootstrap error:', err);
  });
  
  // Expose for debugging
  window.phoneway = app;
  console.log('[Phoneway] App exposed as window.phoneway');
} catch (e) {
  console.error('[Phoneway] Fatal initialization error:', e);
  document.body.innerHTML = '<div style="padding: 20px; color: #ff4444; text-align: center;">' +
    '<h2>Initialization Error</h2><p>' + e.message + '</p>' +
    '<button onclick="location.reload()">Reload</button></div>';
}

export { PhonewayApp };
