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
        v:    '5.1.0'
      };
      fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceClass: dc, events: [{ type: 'js_error', data: clean, timestamp: Date.now() }] }),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  // ── Visible overlay so you can see errors directly on the phone ──
  function showErr(msg, src, line) {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;background:#1a0000;z-index:99999;padding:20px;overflow:auto;font-family:monospace;font-size:13px;color:#ff6666;';
    d.innerHTML = '<b style="font-size:16px">❌ LOAD ERROR</b><br><br>'
      + '<b>Message:</b><br>' + String(msg) + '<br><br>'
      + '<b>File:</b> ' + (src || '') + (line ? ':' + line : '') + '<br><br>'
      + '<button onclick="navigator.clipboard&&navigator.clipboard.writeText(\'' + String(msg).replace(/'/g, "\\'") + '\').then(function(){alert(\'Copied!\')})" style="background:#ff4444;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;margin-right:8px">📋 COPY</button>'
      + '<button onclick="location.reload()" style="background:#aa2200;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer">↻ RELOAD APP</button>';
    document.body.appendChild(d);
  }

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
