'use strict';

function installPhonewayLiveUi() {
  try {
    const lab = document.querySelector('#accuracyBlock .acc-label');
    if (lab) lab.textContent = 'ACCURACY';
    if (!document.getElementById('workProgressStyle')) {
      const style = document.createElement('style');
      style.id = 'workProgressStyle';
      style.textContent = '.work-progress{display:none;margin-top:8px;padding:6px 2px 2px}.work-progress.show{display:block}.work-progress-meta{display:flex;justify-content:space-between;font-size:9px;letter-spacing:1.4px;color:#c9a24a;text-transform:uppercase;margin-bottom:4px}.work-progress-track{height:6px;background:#111;border:1px solid #3a2a10;border-radius:3px;overflow:hidden}.work-progress-fill{height:100%;width:0;background:linear-gradient(90deg,#7a5000,#e8c84a,#39ff14);transition:width .15s linear}';
      document.head.appendChild(style);
    }
    if (!document.getElementById('workProgress')) {
      const host = document.getElementById('display-section') || document.body;
      const wrap = document.createElement('div');
      wrap.id = 'workProgress';
      wrap.className = 'work-progress';
      wrap.setAttribute('aria-hidden', 'true');
      wrap.innerHTML = '<div class="work-progress-meta"><span id="workProgressLabel">Working\u2026</span><span id="workProgressPct">0%</span></div><div class="work-progress-track"><div class="work-progress-fill" id="workProgressFill"></div></div>';
      const stab = document.getElementById('stabilityBar');
      if (stab && stab.parentNode) stab.parentNode.insertBefore(wrap, stab.nextSibling);
      else host.appendChild(wrap);
    }
  } catch (e) {}

  const paint = (info) => {
    const wrap = document.getElementById('workProgress');
    if (!wrap || !info) return;
    wrap.classList.add('show');
    wrap.setAttribute('aria-hidden', 'false');
    const pct = Math.round((info.pct || 0) * 100);
    const fill = document.getElementById('workProgressFill');
    const labEl = document.getElementById('workProgressLabel');
    const num = document.getElementById('workProgressPct');
    if (fill) fill.style.width = pct + '%';
    if (num) num.textContent = pct + '%';
    if (labEl && info.message) labEl.textContent = info.message;
    if (pct >= 100) {
      setTimeout(() => {
        wrap.classList.remove('show');
        wrap.setAttribute('aria-hidden', 'true');
      }, 400);
    }
  };

  const hookApp = () => {
    const app = window.phoneway;
    if (!app || !app.scale || app._liveUiHooked) return false;
    app._liveUiHooked = true;
    app.scale.deadbandThreshold = 0.04;
    const prevProgress = app.scale.onProgress;
    app.scale.onProgress = (info) => {
      try { if (typeof prevProgress === 'function') prevProgress(info); } catch (e) {}
      paint(info);
    };
    if (typeof app._onWeight === 'function') {
      const orig = app._onWeight.bind(app);
      app._onWeight = function(grams, confidence, isStable) {
        try { if (typeof app._updateAccuracyDisplay === 'function') app._updateAccuracyDisplay(confidence); } catch (e) {}
        return orig(grams, confidence, isStable);
      };
    }
    if (typeof app.scale.calibrate === 'function') {
      const origCal = app.scale.calibrate.bind(app.scale);
      app.scale.calibrate = function(knownGrams) {
        const result = origCal(knownGrams);
        if (result && result.success) {
          this.displayWeight = knownGrams;
          this.lastDisplayValue = knownGrams;
          this.rawWeight = knownGrams;
          try {
            if (this.emaWeight) { this.emaWeight.reset(); this.emaWeight.update(knownGrams); }
          } catch (e) {}
        }
        return result;
      };
    }
    return true;
  };

  if (!hookApp()) {
    const timer = setInterval(() => { if (hookApp()) clearInterval(timer); }, 40);
    setTimeout(() => clearInterval(timer), 10000);
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installPhonewayLiveUi);
  else installPhonewayLiveUi();
}

export { installPhonewayLiveUi };
