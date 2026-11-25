/* versionCheck.js — classic script, must run BEFORE ES modules load.
 * Purges the service-worker cache when the app version changes.
 * Keep the version in sync with js/version.js / manifest.json / sw.js —
 * scripts/check-static.mjs enforces this in CI. */
'use strict';

var PHONEWAY_VERSION = '5.3.5';
var storedVersion = null;
try { storedVersion = localStorage.getItem('phoneway_version'); } catch (e) {}

if (storedVersion && storedVersion !== PHONEWAY_VERSION) {
  if ('caches' in window) {
    caches.keys().then(function (keys) {
      keys.forEach(function (key) { caches.delete(key); });
    });
  }
  try { localStorage.setItem('phoneway_version', PHONEWAY_VERSION); } catch (e) {}
  console.log('[Phoneway] Updated to version', PHONEWAY_VERSION);
  // Reload once so the page cannot keep running a mix of old and new
  // modules after the caches were purged. The session flag guards against a
  // reload loop; sessionStorage is wrapped in try/catch because Brave
  // private mode can throw on access.
  var reloaded = false;
  try { reloaded = sessionStorage.getItem('phoneway_version_reloaded') === PHONEWAY_VERSION; } catch (e) {}
  if (!reloaded) {
    try { sessionStorage.setItem('phoneway_version_reloaded', PHONEWAY_VERSION); } catch (e) {}
    setTimeout(function () { location.reload(); }, 300);
  }
} else if (!storedVersion) {
  try { localStorage.setItem('phoneway_version', PHONEWAY_VERSION); } catch (e) {}
}
