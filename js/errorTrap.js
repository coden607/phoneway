/* errorTrap.js — classic script, must run BEFORE ES modules load.
 * If a module fails to load, a module-based trap would fail with it.
 * Auto-reports JS errors to /api/telemetry and shows an on-device overlay. */
(function () {
  'use strict';

  // ── Auto-report: send error to server immediately, no module needed ──
  function _report(msg, src, line, col) {
    try {
      var ua  = navigator.userAgent;
      var dc  = /Android/i.test(ua) ? 'android' : /iPhone|iPad|iPod/i.test(ua) ? 'ios' : 'desktop';
      var clean = {
        msg:  String(msg || '').slice(0, 150).replace(/https?:\/\/\S+/g, '[url]'),
        src:  String(src || '').split('/').pop().replace(/[?#].*$/, '').slice(0, 50),
        line: Number(line) || 0,
        col:  Number(col)  || 0,
        v:    '5.3.5'
      };
      fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceClass: dc, events: [{ type: 'js_error', data: clean, timestamp: Date.now() }] }),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  // ── Hard reload: unregister service workers and delete caches, then
  // reload. Used when a stale service-worker cache is serving a broken or
  // mixed old/new bundle (a known iOS/Brave failure mode).
  function hardReload() {
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          regs.forEach(function (r) { r.unregister().catch(function () {}); });
        }).catch(function () {});
      }
    } catch (e) {}
    try {
      if (window.caches) {
        caches.keys().then(function (names) {
          names.forEach(function (n) { caches.delete(n).catch(function () {}); });
        }).catch(function () {});
      }
    } catch (e) {}
    setTimeout(function () { location.reload(); }, 400);
  }

  // ── Visible overlay so you can see errors directly on the phone ──
  function showErr(msg, src, line) {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;background:#1a0000;z-index:99999;padding:20px;overflow:auto;font-family:monospace;font-size:13px;color:#ff6666;';
    d.innerHTML = '<b style="font-size:16px">❌ LOAD ERROR</b><br><br>'
      + '<b>Message:</b><br>' + String(msg) + '<br><br>'
      + '<b>File:</b> ' + (src || '') + (line ? ':' + line : '') + '<br><br>'
      + '<button onclick="navigator.clipboard&&navigator.clipboard.writeText(\'' + String(msg).replace(/'/g, "\\'") + '\').then(function(){alert(\'Copied!\')})" style="background:#ff4444;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;margin-right:8px">📋 COPY</button>'
      + '<button onclick="location.reload()" style="background:#aa2200;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;margin-right:8px">↻ RELOAD APP</button>'
      + '<button onclick="window.__phonewayHardReload&&window.__phonewayHardReload()" style="background:#660000;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer">🧹 CLEAR CACHE &amp; RELOAD</button>';
    document.body.appendChild(d);
  }

  // ── Boot watchdog: a failed module import (404 on app.js or any static
  // import) never fires window.onerror, so the page used to sit blank with
  // no message at all — the iPhone SE 3 / Brave no-load. If the app has not
  // exposed itself ~10 s after DOMContentLoaded, show a readable recovery
  // overlay instead of a silent blank screen. The overlay removes itself
  // if the app does boot late (slow network).
  function showBootErr() {
    if (document.getElementById('phoneway-boot-error')) return;
    var d = document.createElement('div');
    d.id = 'phoneway-boot-error';
    d.style.cssText = 'position:fixed;inset:0;background:#1a0000;z-index:99999;padding:20px;overflow:auto;font-family:monospace;font-size:13px;color:#ff6666;';
    d.innerHTML = '<b style="font-size:16px">❌ APP DID NOT LOAD</b><br><br>'
      + 'Phoneway did not finish starting. A required script failed to load or was blocked — this can happen when a browser (e.g. Brave Shields) blocks a resource, or when a stale service-worker cache serves a broken bundle.<br><br>'
      + 'Try clearing the cache and reloading. If it keeps happening, note which browser you are using and what the address bar shows.<br><br>'
      + '<button onclick="location.reload()" style="background:#aa2200;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;margin-right:8px">↻ RELOAD APP</button>'
      + '<button onclick="window.__phonewayHardReload&&window.__phonewayHardReload()" style="background:#660000;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer">🧹 CLEAR CACHE &amp; RELOAD</button>';
    document.body.appendChild(d);
    var iv = setInterval(function () {
      try {
        if (window.phoneway) {
          var el = document.getElementById('phoneway-boot-error');
          if (el) el.remove();
          clearInterval(iv);
        }
      } catch (e) {}
    }, 1000);
  }

  function bootWatchdog() {
    setTimeout(function () {
      try {
        if (window.phoneway) return;
        // The bootstrap's own catch already shows an error screen; do not
        // stack a second overlay on top of it.
        if (document.body && /Initialization Error/.test(document.body.textContent || '')) return;
        _report('Boot watchdog: window.phoneway never appeared', '', 0, 0);
        showBootErr();
      } catch (e) {}
    }, 10000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootWatchdog, { once: true });
  } else {
    bootWatchdog();
  }

  // ── Resource errors: a blocked/failed <script> or <link> (Brave Shields,
  // a bad cache, a 404) fires an error event on the element that never
  // reaches window.onerror. Capture it and report it so a blocked required
  // resource is visible in telemetry instead of a silent half-loaded page.
  // No overlay here — optional resources (e.g. fonts) may be blocked without
  // breaking the app; the boot watchdog covers the fatal case.
  window.addEventListener('error', function (e) {
    var t = e.target;
    if (!t || t === window) return;
    var src = t.src || t.href || '';
    if (!src) return;
    _report('Resource failed to load: ' + src, src, 0, 0);
  }, true);

  window.__phonewayHardReload = hardReload;

  window.onerror = function (msg, src, line, col, err) {
    _report(msg, src, line, col);
    showErr((err && err.stack) ? err.stack : msg, src, line);
    return true;
  };
  window.onunhandledrejection = function (e) {
    var r = e.reason;
    var m = (r && r.message) ? r.message : String(r);
    var s = (r && r.fileName)  ? r.fileName  : '';
    var l = (r && r.lineNumber) ? r.lineNumber : 0;
    _report(m, s, l, 0);
    showErr((r && r.stack) ? r.stack : m, s, l);
    return true;
  };
})();
