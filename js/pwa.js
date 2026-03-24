'use strict';
/**
 * js/pwa.js — Progressive Web App v3
 * Native install prompt (Android/Desktop Chrome)
 * Manual guide modal for iOS + other browsers
 */

window._deferredPrompt  = null;
let _deferredPrompt     = null;
let _pwaDeclinedForever = ls('qPWANever') === '1';
let _isInstalled = window.matchMedia('(display-mode: standalone)').matches
                || window.navigator.standalone === true;

/* ── Chromium install prompt (Android Chrome + Desktop) ── */
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredPrompt = e;
  window._deferredPrompt = e;
  if (!_pwaDeclinedForever && !_isInstalled) {
    const isMob = window.innerWidth <= 960;
    setTimeout(showPWABanner, isMob ? 1500 : 4000);
  }
});

window.addEventListener('appinstalled', () => {
  _deferredPrompt = null;
  window._deferredPrompt = null;
  _isInstalled = true;
  hidePWABanner();
  showToast(' Maktabah installed! Find it on your home screen.');
  document.getElementById('pwa-install-btn')?.setAttribute('disabled','');
  if (document.getElementById('pwa-install-btn'))
    document.getElementById('pwa-install-btn').textContent = ' Installed';
});

/* ── Banner functions ── */
function showPWABanner() {
  if (_isInstalled) return;
  document.getElementById('pwa-toast')?.classList.add('show');
}
function hidePWABanner() {
  document.getElementById('pwa-toast')?.classList.remove('show');
}

/* ── Install action ── */
async function pwaInstall() {
  // Case 1: Chromium native prompt available
  if (_deferredPrompt) {
    try {
      _deferredPrompt.prompt();
      const { outcome } = await _deferredPrompt.userChoice;
      _deferredPrompt = null;
      window._deferredPrompt = null;
      hidePWABanner();
      if (outcome === 'accepted') showToast(' Installing Maktabah…');
    } catch (e) {
      console.warn('[pwa]', e);
    }
    return;
  }
  // Case 2: Already installed
  if (_isInstalled) {
    showToast(' Maktabah is already installed!');
    return;
  }
  // Case 3: Show install guide modal
  showInstallGuide();
}

/* ── Install Guide Modal ── */
function showInstallGuide() {
  let m = document.getElementById('pwa-guide-modal');
  if (!m) {
    m = document.createElement('div');
    m.id = 'pwa-guide-modal';
    m.style.cssText = 'position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.8);backdrop-filter:blur(8px)';
    m.onclick = e => { if (e.target === m) m.remove(); };
    document.body.appendChild(m);
  }

  const ua     = navigator.userAgent;
  const isIOS  = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);

  const steps = isIOS ? [
    { icon: '⬆️', text: 'Tap the <strong>Share</strong> button at the bottom of Safari' },
    { icon: '', text: 'Scroll down and tap <strong>"Add to Home Screen"</strong>' },
    { icon: '', text: 'Tap <strong>"Add"</strong> — Maktabah appears on your home screen' },
  ] : isAndroid ? [
    { icon: '⋮',  text: 'Tap the <strong>menu (⋮)</strong> button in Chrome' },
    { icon: '', text: 'Tap <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong>' },
    { icon: '', text: 'Tap <strong>"Add"</strong> — Maktabah installs like a native app' },
  ] : [
    { icon: '️', text: 'Look for the <strong>install icon</strong> (⊕) in your browser address bar' },
    { icon: '', text: 'Or click the browser <strong>menu → "Install Maktabah"</strong>' },
    { icon: '', text: 'Click <strong>"Install"</strong> — runs as a standalone app' },
  ];

  m.innerHTML = `
    <div style="background:var(--sf);border-radius:20px;width:100%;max-width:400px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.6)">
      <div style="background:linear-gradient(135deg,var(--em),var(--em2));padding:24px;text-align:center">
        <div style="font-size:48px;margin-bottom:8px"></div>
        <div style="font-size:18px;font-weight:800;color:#fff">Install Maktabah</div>
        <div style="font-size:13px;color:rgba(255,255,255,.8);margin-top:4px">Add to your Home Screen for the best experience</div>
      </div>
      <div style="padding:20px">
        ${steps.map(s => `
          <div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--bd)">
            <div style="width:36px;height:36px;background:var(--em-dim);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${s.icon}</div>
            <div style="font-size:14px;color:var(--t2);line-height:1.5">${s.text}</div>
          </div>`).join('')}
        <div style="margin-top:16px;text-align:center">
          <div style="font-size:12px;color:var(--t3);margin-bottom:12px">Works offline · No app store needed · Free forever</div>
          <button onclick="document.getElementById('pwa-guide-modal').remove()" 
            style="width:100%;padding:12px;background:var(--em);color:#fff;border-radius:10px;font-size:15px;font-weight:700;border:none;cursor:pointer">
            Got it!
          </button>
        </div>
      </div>
    </div>`;
}
window.showInstallGuide = showInstallGuide;

function pwaLater() { hidePWABanner(); }
function pwaNever()  { hidePWABanner(); ss('qPWANever','1'); _pwaDeclinedForever = true; }

window.showPWABanner = showPWABanner;
window.hidePWABanner = hidePWABanner;
window.pwaInstall    = pwaInstall;
window.pwaLater      = pwaLater;
window.pwaNever      = pwaNever;
// Legacy aliases
window.showPWAToast = showPWABanner;
window.hidePWAToast = hidePWABanner;
window.installPWAFromSettings = pwaInstall;

/* ── FAB scroll-to-top ── */
function setupFAB() {
  document.querySelectorAll('.page').forEach(pg => {
    pg.addEventListener('scroll', () => {
      document.getElementById('fab-top')?.classList.toggle('show', pg.scrollTop > 300);
    }, { passive: true });
  });
}

function scrollToTop() {
  const active = document.querySelector('.page.active');
  active?.scrollTo({ top: 0, behavior: 'smooth' });
}
window.scrollToTop = scrollToTop;

/* ── VH fix (iOS Safari) ── */
function fixVH() {
  document.documentElement.style.setProperty('--vh', window.innerHeight * 0.01 + 'px');
}
window.addEventListener('resize', fixVH, { passive: true });
fixVH();

/* ── Service Worker ── */
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(setupFAB, 500);
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(e => console.warn('[SW]', e.message));
    navigator.serviceWorker.addEventListener('controllerchange', () =>
      showToast(' Updated — reload to apply', 5000));
  }
});
