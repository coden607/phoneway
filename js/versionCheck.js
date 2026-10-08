/* versionCheck.js — classic script, must run BEFORE ES modules load.
 * Purges the service-worker cache when the app version changes.
 * Keep the version in sync with js/version.js / manifest.json / sw.js —
 * scripts/check-static.mjs enforces this in CI. */
'use strict';

var PHONEWAY_VERSION = '5.1.0';
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
} else if (!storedVersion) {
  try { localStorage.setItem('phoneway_version', PHONEWAY_VERSION); } catch (e) {}
}
