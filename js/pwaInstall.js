'use strict';

/* pwaInstall.js — one-click desktop & mobile PWA installation.
 * Extracted from index.html (foundation v5). */

let _dip = null;
let _isDesktop = !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Detect platform and update install text
const _platform = (() => {
  if (/Windows/i.test(navigator.userAgent)) return 'windows';
  if (/Mac/i.test(navigator.userAgent) && !/iPhone|iPad/i.test(navigator.userAgent)) return 'mac';
  if (/Linux/i.test(navigator.userAgent)) return 'linux';
  if (/Android/i.test(navigator.userAgent)) return 'android';
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return 'ios';
  return 'desktop';
})();

// Update install subtitle based on platform
const _installSub = document.getElementById('installSubText');
if (_installSub) {
  const _platformText = {
    windows: 'Install on Windows — Desktop shortcut — Works offline',
    mac: 'Install on Mac — Dock icon — Works offline',
    linux: 'Install on Linux — Desktop entry — Works offline',
    android: 'Add to home screen — Works offline — No app store',
    ios: 'Add to home screen — Works offline — No app store',
    desktop: 'One-click install — Desktop icon — Works offline'
  };
  _installSub.textContent = _platformText[_platform] || _platformText.desktop;
}

// Handle install prompt
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _dip = e;

  // Show desktop modal for desktop users, banner for mobile
  if (_isDesktop && _platform !== 'android') {
    setTimeout(() => {
      const modal = document.getElementById('desktopInstallModal');
      if (modal) modal.style.display = 'flex';
    }, 1500);
  } else {
    const b = document.getElementById('installBanner');
    if (b) b.classList.add('show');
  }

  // Auto-show install banner/modal but DON'T auto-prompt (requires user gesture)
  const shown = sessionStorage.getItem('installPromptShown');
  if (!shown) {
    sessionStorage.setItem('installPromptShown', '1');
    if (_isDesktop) {
      // Desktop: show modal after delay
      setTimeout(() => {
        if (!sessionStorage.getItem('installPromptAutoShown')) {
          sessionStorage.setItem('installPromptAutoShown', '1');
          const modal = document.getElementById('desktopInstallModal');
          if (modal) modal.style.display = 'flex';
        }
      }, 8000);
    }
    // Mobile: banner shows automatically, user must click install
  }
});

// Mobile banner install button - MUST be user gesture
const installBtn = document.getElementById('installBtn');
if (installBtn) installBtn.addEventListener('click', async () => {
  if (!_dip) {
    _showManualInstallInstructions();
    return;
  }
  try {
    _dip.prompt();
    const { outcome } = await _dip.userChoice;
    if (outcome === 'accepted') {
      document.getElementById('installBanner').classList.remove('show');
      if ('vibrate' in navigator) navigator.vibrate([30, 20, 100]);
      _showInstallSuccess();
    }
    _dip = null;
  } catch (e) {
    console.log('Install prompt failed:', e);
    _showManualInstallInstructions();
  }
});

// Desktop modal install button
const desktopInstallBtn = document.getElementById('desktopInstallBtn');
if (desktopInstallBtn) desktopInstallBtn.addEventListener('click', async () => {
  if (!_dip) {
    _showManualInstallInstructions();
    return;
  }
  try {
    _dip.prompt();
    const { outcome } = await _dip.userChoice;
    if (outcome === 'accepted') {
      document.getElementById('desktopInstallModal').style.display = 'none';
      document.getElementById('installBanner').classList.remove('show');
      _showInstallSuccess();
    }
    _dip = null;
  } catch (e) {
    console.log('Install prompt failed:', e);
    _showManualInstallInstructions();
  }
});

const desktopInstallCancel = document.getElementById('desktopInstallCancel');
if (desktopInstallCancel) desktopInstallCancel.addEventListener('click', () => {
  document.getElementById('desktopInstallModal').style.display = 'none';
});

const installDismiss = document.getElementById('installDismiss');
if (installDismiss) installDismiss.addEventListener('click', () => {
  document.getElementById('installBanner').classList.remove('show');
});

// Success message
function _showInstallSuccess() {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = _isDesktop ?
      '✓ Installed! Look for Phoneway on your desktop/dock' :
      '✓ Installed! Check your home screen';
    toast.className = 'toast toast-show';
    setTimeout(() => { toast.className = 'toast'; }, 4000);
  }
}

// Manual install instructions for unsupported browsers
function _showManualInstallInstructions() {
  const modal = document.getElementById('desktopInstallModal');
  if (modal) {
    modal.innerHTML = `
      <div style="background:#161616; border:2px solid var(--gold); border-radius:16px; padding:32px; max-width:420px; text-align:center;">
        <div style="font-size:48px; margin-bottom:16px;">⚙️</div>
        <div style="font-size:18px; font-weight:bold; color:var(--gold); margin-bottom:16px;">MANUAL INSTALL</div>
        <div style="font-size:12px; color:#888; line-height:1.8; margin-bottom:20px; text-align:left;">
          <p style="margin-bottom:12px;"><strong style="color:#ccc;">Chrome/Edge:</strong></p>
          <ol style="margin-bottom:16px; padding-left:20px;">
            <li>Click the <strong style="color:var(--gold);">⊕</strong> icon in the address bar</li>
            <li>Click <strong style="color:var(--gold);">"Install Phoneway..."</strong></li>
          </ol>
          <p style="margin-bottom:12px;"><strong style="color:#ccc;">Safari (Mac):</strong></p>
          <ol style="padding-left:20px;">
            <li>Click <strong style="color:var(--gold);">Share</strong> in the toolbar</li>
            <li>Select <strong style="color:var(--gold);">"Add to Dock"</strong></li>
          </ol>
        </div>
        <button onclick="document.getElementById('desktopInstallModal').style.display='none'" style="background:var(--gold); color:#000; border:none; padding:12px 32px; border-radius:8px; font-weight:bold; cursor:pointer;">GOT IT</button>
      </div>
    `;
    modal.style.display = 'flex';
  }
}

// Installed event
window.addEventListener('appinstalled', () => {
  var _ib = document.getElementById('installBanner');
  if (_ib) _ib.classList.remove('show');
  var _dm = document.getElementById('desktopInstallModal');
  if (_dm) _dm.style.display = 'none';
  var _ih = document.getElementById('iosHint');
  if (_ih) _ih.remove();
  _showInstallSuccess();
  if ('vibrate' in navigator) navigator.vibrate([50, 30, 50, 30, 200]);
});

// iOS Safari detection
const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;

if (isIos && isSafari && !isStandalone) {
  setTimeout(() => {
    const h = document.getElementById('iosHint');
    if (h) h.classList.add('show');
  }, 3500);
}

// Check if already installed (for returning users)
if (isStandalone) {
  // Already installed - hide all prompts
  const installBanner = document.getElementById('installBanner');
  if (installBanner) installBanner.remove();
  const desktopInstallModal2 = document.getElementById('desktopInstallModal');
  if (desktopInstallModal2) desktopInstallModal2.remove();
  const iosHint = document.getElementById('iosHint');
  if (iosHint) iosHint.remove();
}
