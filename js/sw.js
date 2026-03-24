/**
 * sw.js — Maktabah Service Worker v8.0
 * Fix #2: Google Fonts served with font-display:swap via SW fetch intercept
 * Fix #3: Scheherazade New woff2 cached during install for offline Arabic
 */

const CACHE_VER  = 'v8.1.0';
const SHELL_KEY  = `maktabah-shell-${CACHE_VER}`;
const API_KEY    = `maktabah-api-${CACHE_VER}`;
const FONT_KEY   = 'maktabah-fonts-v1'; /* stable key — fonts rarely change */

/* Scheherazade New woff2 — both weights. Fetch at install for offline Arabic. */
const ARABIC_FONT_URLS = [
  'https://fonts.gstatic.com/s/scheherazadenew/v17/4UacrEBBsBhlBjvfkQjt96nD37LIh7fP5A.woff2',
  'https://fonts.gstatic.com/s/scheherazadenew/v17/4UaZrEBBsBhlBjvfkQjt96nD37LIh7fPnHmq.woff2',
];

const SHELL_URLS = [
  '/',
  '/index.html',
  '/sw.js',
  '/manifest.json',
  '/assets/icons/icon.svg',
  '/css/tokens.css',
  '/css/base.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/reader.css',
  '/css/player.css',
  '/css/mobile.css',
  '/css/ai.css',
  '/js/state.js',
  '/js/api.js',
  '/js/i18n.js',
  '/js/search.js',
  '/js/audio.js',
  '/js/reader.js',
  '/js/mushaf.js',
  '/js/ai.js',
  '/js/corpus.js',
  '/js/radio.js',
  '/js/home.js',
  '/js/settings.js',
  '/js/offline.js',
  '/js/pwa.js',
  '/js/dhikr.js',
  '/js/dhikr-db.json',
  '/js/analytics.js',
  '/js/madhab.js',
  '/js/demo.js',
  '/js/app.js',
  '/css/fixes.css',
];

/* ── Install: pre-cache shell + Arabic fonts ── */
self.addEventListener('install', e => {
  e.waitUntil(
    Promise.all([
      caches.open(SHELL_KEY).then(c => c.addAll(SHELL_URLS)).catch(err => console.warn('[SW shell]', err)),
      /* Fix #3: cache Arabic fonts at install so they work offline */
      caches.open(FONT_KEY).then(async c => {
        for (const url of ARABIC_FONT_URLS) {
          try {
            const cached = await c.match(url);
            if (!cached) {
              const resp = await fetch(url, { mode: 'cors', credentials: 'omit' });
              if (resp.ok) await c.put(url, resp);
            }
          } catch(e) { console.warn('[SW font cache]', url, e.message); }
        }
      }),
    ]).then(() => self.skipWaiting())
  );
});

/* ── Activate: purge old caches ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k =>
          k !== SHELL_KEY && k !== API_KEY && k !== FONT_KEY &&
          !k.startsWith('maktabah-chapters') && !k.startsWith('maktabah-mushaf')
        ).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: routing strategy ── */
self.addEventListener('fetch', e => {
  const { url } = e.request;

  if (e.request.method !== 'GET')      return;
  if (url.includes('verses.quran.com')) return; // audio CDN — network only
  if (url.includes('/api/ai/'))         return; // never cache AI

  /* Fix #2/#3: serve Arabic fonts from cache first, fallback network */
  if (url.includes('fonts.gstatic.com')) {
    e.respondWith(cacheFirst(e.request, FONT_KEY));
    return;
  }

  /* Fix #2: intercept Google Fonts CSS — inject font-display:swap */
  if (url.includes('fonts.googleapis.com')) {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          if (!resp.ok) return resp;
          return resp.text().then(css => {
            const patched = css.replace(/font-display:[^;]+;/g, 'font-display:swap;')
                              .replace(/(src:[^}]+})/g, m =>
                                m.includes('font-display') ? m : m.replace('}', '
  font-display: swap;
}')
                              );
            return new Response(patched, { headers: { 'Content-Type': 'text/css', 'Cache-Control': 'max-age=86400' } });
          });
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  /* Quran API: network-first */
  if (url.includes('api.quran.com')) {
    e.respondWith(networkFirst(e.request, API_KEY));
    return;
  }

  /* App shell: cache-first */
  e.respondWith(cacheFirst(e.request, SHELL_KEY));
});

async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const resp = await fetch(req);
    if (resp.ok) { const c = await caches.open(cacheName); c.put(req, resp.clone()); }
    return resp;
  } catch { return new Response('Offline', { status: 503 }); }
}

async function networkFirst(req, cacheName) {
  try {
    const resp = await fetch(req);
    if (resp.ok) { const c = await caches.open(cacheName); c.put(req, resp.clone()); }
    return resp;
  } catch {
    const cached = await caches.match(req);
    return cached || new Response(JSON.stringify({ error: 'offline' }), {
      headers: { 'Content-Type': 'application/json' }, status: 503,
    });
  }
}
