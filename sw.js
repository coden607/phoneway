/**
 * sw.js — Service Worker for Phoneway Scale v5.0.0
 *
 * Caches ONLY the live module graph (dead modules removed 2026-10-08,
 * see docs/legacy/DEAD-CODE-2026-10-08.md).
 */

const CACHE = 'phoneway-v5.0.0';
const BASE  = self.registration.scope;

const ASSETS = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.json',
  BASE + 'css/style.css',
  BASE + 'js/version.js',
  BASE + 'js/kalman.js',
  BASE + 'js/audio.js',
  BASE + 'js/display.js',
  BASE + 'js/liveUi.js',
  BASE + 'js/cameraSensor.js',
  BASE + 'js/sensorCombinations.js',
  BASE + 'js/referenceWeights.js',
  BASE + 'js/deviceCompat.js',
  BASE + 'js/verificationLedger.js',
  BASE + 'js/telemetry.js',
  BASE + 'js/scaleMath.js',
  BASE + 'js/simpleScale.js',
  BASE + 'js/helpTooltips.js',
  BASE + 'js/swRegister.js',
  BASE + 'js/pwaInstall.js',
  BASE + 'js/app.js',
  BASE + 'data/error-logger.js',
  BASE + 'config/continuity.toml',
  BASE + 'icons/icon.svg',
  BASE + 'icons/icon-192.png',
  BASE + 'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => {
      return Promise.allSettled(
        ASSETS.map(url =>
          fetch(url).then(res => {
            if (res && res.ok) return c.put(url, res);
          }).catch(() => {})
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const isAPI = e.request.url.includes('/api/') || e.request.url.includes('vercel');
  if (isAPI) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) {
        fetch(e.request).then(res => {
          if (res && res.ok) caches.open(CACHE).then(c => c.put(e.request, res));
        }).catch(() => {});
        return cached;
      }
      return fetch(e.request).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
