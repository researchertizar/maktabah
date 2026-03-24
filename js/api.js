'use strict';
/**
 * js/api.js — All External Data Fetching
 * Quran.com API v4 (public, no key required for basic use)
 * AI calls proxied through backend server (keys server-side only)
 */

const QURAN_API = 'https://api.quran.com/api/v4';
const AUDIO_CDN = 'https://verses.quran.com/';

/**
 * Backend URL — reads from MAKTABAH_BACKEND_URL injected at build/deploy time,
 * or falls back to localhost for development.
 *
 * HOW TO SET FOR PRODUCTION (pick one):
 *  A) Replace the PRODUCTION_BACKEND_URL string below with your deployed URL
 *     e.g. 'https://maktabah-api.railway.app'
 *  B) If you use a build step, inject: window.MAKTABAH_BACKEND_URL = 'https://...'
 *     in a <script> tag before this file loads in index.html.
 *
 * Zero-cost hosting: Railway · Render · Fly.io (all have free tiers)
 */
const PRODUCTION_BACKEND_URL = 'https://maktabah-production.up.railway.app'; // <-- SET THIS before going live

const BACKEND = (() => {
  if (window.MAKTABAH_BACKEND_URL) return window.MAKTABAH_BACKEND_URL.replace(/\/$/, '');
  if (PRODUCTION_BACKEND_URL)       return PRODUCTION_BACKEND_URL.replace(/\/$/, '');
  const { hostname } = location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:3001';
  console.error('[Maktabah] BACKEND URL is not configured. AI features will not work.\nSet PRODUCTION_BACKEND_URL in js/api.js or inject window.MAKTABAH_BACKEND_URL.');
  return ''; // safe empty — fetch calls will fail visibly rather than silently hitting wrong endpoint
})();

window.QURAN_API = QURAN_API;
window.AUDIO_CDN = AUDIO_CDN;
window.BACKEND   = BACKEND;

/* ── Session cache (LRU, max 300 entries) ── */
const _cache = new Map();

function cacheSet(k, v) {
  if (_cache.size >= 300) _cache.delete(_cache.keys().next().value);
  _cache.set(k, v);
}

window._apiCache = _cache;

/* ── Main Quran API fetch ── */
async function apiFetch(path) {
  const url = QURAN_API + path;
  if (_cache.has(url)) return _cache.get(url);

  const r = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${path}`);

  const json = await r.json();
  cacheSet(url, json);
  return json;
}

window.apiFetch = apiFetch;

/* ── AI via secure backend proxy ── */
async function callAIBackend(messages, systemPrompt = '', preferProvider = '') {
  const clean = messages
    .filter(m => m && typeof m.role === 'string' && typeof m.content === 'string')
    .map(m => ({ role: m.role.slice(0, 15), content: m.content.slice(0, 4000) }))
    .slice(-30);  // BUG-20 fix: max 30 messages

  const r = await fetch(`${BACKEND}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: clean, systemPrompt, preferProvider }),
    signal: AbortSignal.timeout(25_000),
  });

  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${r.status}`);
  }

  return r.json(); // { text, provider, model }
}

window.callAIBackend = callAIBackend;

/* ── Check backend availability ── */
async function checkAIStatus() {
  try {
    const r = await fetch(`${BACKEND}/api/health`, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) return false;
    const d = await r.json();
    return d.ok && d.aiEnabled;
  } catch {
    return false;
  }
}

window.checkAIStatus = checkAIStatus;
