'use strict';

/* swRegister.js — service worker registration. Extracted from index.html. */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js?v=5.0.0')
      .then(function (registration) {
        console.log('[SW] Registered:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', function () {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', function () {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] New version available');
              // Show update notification
              if (confirm('New version available! Reload to update?')) {
                window.location.reload();
              }
            }
          });
        });
      })
      .catch(function (error) {
        console.log('[SW] Registration failed:', error);
      });
  });
}
