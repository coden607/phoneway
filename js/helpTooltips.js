'use strict';

/* helpTooltips.js — button help tooltips + full setup guide.
 * Extracted from index.html (foundation v5). Module scope replaces the
 * old IIFE; window._showBtnTip/_hideBtnTip kept for backward compat. */

/* ── Button help data ──────────────────────────────────── */
var BTN_HELP = {
  btnTare: {
    icon: '⚖️', title: 'TARE / ZERO',
    desc: 'Sets the zero point. Press with NOTHING on the phone so the display reads 0g. During calibration: place your known weight FIRST, then press TARE to register that weight.',
    tips: ['Hold phone perfectly still for ~2 s after pressing', 'CAL MODE: place known weight → press TARE', 'Re-tare if display drifts upward on an empty scale', 'The scale takes 100 sensor samples for its baseline — wait 2s'],
    accuracy: 'Critical — quality tare = accurate zero baseline'
  },
  btnMode: {
    icon: '🔄', title: 'MEASUREMENT MODE',
    desc: 'Cycles through modes: ACCEL (real-time accelerometer), PRECISION (5-second statistical average), STATISTICS (detailed readout).',
    tips: ['ACCEL — fastest, good for most weights', 'PRECISION — averages 5 s, tightest repeatability', 'STATISTICS — shows standard deviation σ and min/max'],
    accuracy: 'PRECISION mode is best for a single critical reading'
  },
  btnUnits: {
    icon: '📏', title: 'UNITS',
    desc: 'Switches the display between grams (g) and ounces (oz). Calibration is stored in grams internally.',
    tips: ['g = grams (default)', 'oz = ounces  (1 oz = 28.35 g)'],
    accuracy: null
  },
  btnPower: {
    icon: '⚡', title: 'POWER ON / OFF',
    desc: 'Turns the scale on and off. When powered on the scale auto-tares. Powering off and on resets the baseline — useful if the display has drifted.',
    tips: ['Power off when not in use to conserve battery', 'If display drifts significantly, power-cycle to re-tare', 'Thermal stability is best in the first few minutes after power-on'],
    accuracy: null
  },
  btnHold: {
    icon: '⏸', title: 'HOLD / FREEZE DISPLAY',
    desc: 'Freezes the current reading on screen so you can remove the object and read the weight at your leisure.',
    tips: ['Wait for STABLE (STB LED green) before pressing HOLD', 'Press HOLD again to release the frozen reading', 'Combine with PRECISION mode for the most stable frozen result'],
    accuracy: 'Always wait for STABLE indicator before freezing'
  },
  btnCal: {
    icon: '🎯', title: 'CALIBRATE',
    desc: 'Opens the calibration wizard. A known-weight object teaches the scale how your specific phone and surface deflect. This is the single most important step for accuracy.',
    tips: [
      'Best combo: nickel (5.000g) + dollar bill (1.00g) for 2-point cal',
      'Phone on mouse pad or 5+ layers of cloth — NOT hard table',
      'Wait 5 min after unplugging charger before calibrating',
      'Each additional cal point improves the curve fit',
      'Recalibrate if you change surfaces or move to a new location'
    ],
    accuracy: 'MOST IMPORTANT STEP — wrong cal = wrong readings no matter what'
  },
  btnVerify: {
    icon: '✓', title: 'VERIFY ACCURACY',
    desc: 'Measures a known reference weight, shows the exact error, and records it in your Verification Ledger — the evidence base for every accuracy claim the app makes.',
    tips: ['Nickel: 5.000g ±0.008g — best verifier', 'Penny: 2.500g ±0.013g', 'Quarter: 5.670g ±0.013g', 'Dollar bill: 1.00g ±0.03g', 'The displayed ±Xg claim = worst error of your last 5 verifies'],
    accuracy: 'Run after every recalibration — this is what makes claims honest'
  },
  btnHammer: {
    icon: '🔨', title: 'VIBRATION ANALYSIS',
    desc: 'Triggers vibration-based resonance measurement. The phone vibrates and analyzes how the added weight shifts its resonant frequency — a physics-based cross-check of the accelerometer reading.',
    tips: ['Works best on a harder, flatter surface (opposite of accelerometer)', 'Use as a cross-check when accelerometer reading seems off', 'Requires vibration/haptics enabled on your device'],
    accuracy: 'Secondary sensor — cross-checks the primary accelerometer'
  },
  btnPrecision: {
    icon: '🎯', title: 'PRECISION MODE (0.1g resolution)',
    desc: 'Takes a 5-second statistical measurement: collects many readings, rejects outliers, and returns the trimmed mean with a standard deviation σ. Resolution 0.1g — accuracy still comes from your verification ledger.',
    tips: [
      'Keep phone COMPLETELY still for the full 5 seconds',
      'Only meaningful after full calibration',
      'The σ value in the result shows how stable your surface is',
      'Place phone on dense foam for lowest σ'
    ],
    accuracy: 'Tightest repeatability mode — use for critical measurements'
  },
  btnLight: {
    icon: '💡', title: 'BACKLIGHT',
    desc: 'Toggles high-contrast display mode for low-light conditions.',
    tips: ['No effect on measurement accuracy'],
    accuracy: null
  },
  btnStats: {
    icon: '📊', title: 'ACCURACY REPORT',
    desc: 'Full calibration audit: curve-fit grade, MEASURED accuracy from your verification ledger, systematic error, verification history, and specific improvement recommendations.',
    tips: [
      'Measured accuracy = worst verify error in your ledger, rounded up — no grade guessing',
      'Check RECOMMENDATIONS section for actionable tips',
      'Export saves full calibration data as JSON for debugging',
      'Tap the ACCURACY display in the header for the full setup guide'
    ],
    accuracy: 'Check after every recalibration'
  }
};

/* ── Show / hide tooltip ───────────────────────────────── */
function showTip(id) {
  var d = BTN_HELP[id];
  if (!d) return;
  document.getElementById('tipIcon').textContent  = d.icon;
  document.getElementById('tipTitle').textContent = d.title;
  document.getElementById('tipDesc').textContent  = d.desc;
  var ul = document.getElementById('tipList');
  ul.innerHTML = (d.tips || []).map(function (t) { return '<li>' + t + '</li>'; }).join('');
  var ae = document.getElementById('tipAccuracy');
  if (d.accuracy) { ae.textContent = '⚡ ' + d.accuracy; ae.style.display = 'block'; }
  else            { ae.style.display = 'none'; }
  document.getElementById('btnTooltip').style.display = 'flex';
  if (navigator.vibrate) navigator.vibrate(30);
}
function hideTip() {
  document.getElementById('btnTooltip').style.display = 'none';
}
window._showBtnTip = showTip;
window._hideBtnTip = hideTip;

/* ── Attach long-press to every button that has help data ─ */
var tipTimer = null;
Object.keys(BTN_HELP).forEach(function (id) {
  var btn = document.getElementById(id);
  if (!btn) return;

  function arm() {
    if (tipTimer) clearTimeout(tipTimer);
    tipTimer = setTimeout(function () { tipTimer = null; showTip(id); }, 500);
  }
  function disarm() {
    if (tipTimer) { clearTimeout(tipTimer); tipTimer = null; }
  }

  btn.addEventListener('touchstart',  arm,    { passive: true });
  btn.addEventListener('touchend',    disarm, { passive: true });
  btn.addEventListener('touchmove',   disarm, { passive: true });
  btn.addEventListener('touchcancel', disarm, { passive: true });
  btn.addEventListener('mousedown',   arm);
  btn.addEventListener('mouseup',     disarm);
  btn.addEventListener('mouseleave',  disarm);
});

/* ── Close tooltip ─────────────────────────────────────── */
document.getElementById('btnTooltip').addEventListener('click', hideTip);
var tc = document.getElementById('tipClose');
if (tc) tc.addEventListener('click', function (e) { e.stopPropagation(); hideTip(); });

/* ── Accuracy block → open guide ──────────────────────── */
function openGuide() {
  var g = document.getElementById('guideOverlay');
  if (!g) return;
  g.style.display = 'block';
  setTimeout(function () { g.classList.add('show'); }, 10);
}
function closeGuide() {
  var g = document.getElementById('guideOverlay');
  if (!g) return;
  g.classList.remove('show');
  setTimeout(function () { g.style.display = 'none'; }, 300);
}

var ab = document.getElementById('accuracyBlock');
if (ab) ab.addEventListener('click', openGuide);

var gc  = document.getElementById('guideClose');
var gcb = document.getElementById('guideCloseBtn');
if (gc)  gc.addEventListener('click',  closeGuide);
if (gcb) gcb.addEventListener('click', closeGuide);
