'use strict';
/**
 * js/offline.js — Offline support + Native-like storage
 * Uses IndexedDB via a small wrapper for persistent user data.
 * Service Worker caches the app shell for full offline use.
 */

/* ══════════════════════════════════════════
   INDEXEDDB — persistent device-like storage
   Stores: notes, bookmarks, reading progress,
           cached chapter text, user settings
══════════════════════════════════════════ */

const DB_NAME    = 'maktabah-db';
const DB_VERSION = 2;
let   _db        = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise(function(resolve, reject) {
    if (!('indexedDB' in window)) { resolve(null); return; }
    var req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = function(e) {
      var db = e.target.result;
      // User data store
      if (!db.objectStoreNames.contains('userData')) {
        db.createObjectStore('userData', { keyPath: 'key' });
      }
      // Cached Quran chapter text (offline reading)
      if (!db.objectStoreNames.contains('chapters')) {
        db.createObjectStore('chapters', { keyPath: 'id' });
      }
      // Cached verse pages
      if (!db.objectStoreNames.contains('verses')) {
        db.createObjectStore('verses', { keyPath: 'key' });
      }
    };

    req.onsuccess  = function(e) { _db = e.target.result; resolve(_db); };
    req.onerror    = function()  { resolve(null); };
  });
}

/** Save any value to IndexedDB userData store */
async function dbSet(key, value) {
  try {
    var db = await openDB(); if (!db) return;
    var tx = db.transaction('userData', 'readwrite');
    tx.objectStore('userData').put({ key: key, value: value, ts: Date.now() });
  } catch(e) { console.warn('[db]', e); }
}
window.dbSet = dbSet;

/** Get value from IndexedDB */
async function dbGet(key) {
  try {
    var db = await openDB(); if (!db) return null;
    return new Promise(function(resolve) {
      var tx  = db.transaction('userData', 'readonly');
      var req = tx.objectStore('userData').get(key);
      req.onsuccess = function() { resolve(req.result ? req.result.value : null); };
      req.onerror   = function() { resolve(null); };
    });
  } catch(e) { return null; }
}
window.dbGet = dbGet;

/** Cache a chapter's verse text for offline reading */
async function cacheChapterText(chapterId, verses) {
  try {
    var db = await openDB(); if (!db) return;
    var tx = db.transaction('chapters', 'readwrite');
    tx.objectStore('chapters').put({
      id:      chapterId,
      verses:  verses,
      cached:  Date.now()
    });
  } catch(e) { console.warn('[db cache chapter]', e); }
}
window.cacheChapterText = cacheChapterText;

/** Get cached chapter verses */
async function getCachedChapter(chapterId) {
  try {
    var db = await openDB(); if (!db) return null;
    return new Promise(function(resolve) {
      var tx  = db.transaction('chapters', 'readonly');
      var req = tx.objectStore('chapters').get(chapterId);
      req.onsuccess = function() { resolve(req.result || null); };
      req.onerror   = function() { resolve(null); };
    });
  } catch(e) { return null; }
}
window.getCachedChapter = getCachedChapter;

/** Persist all user data to IndexedDB (called periodically) */
async function persistUserData() {
  try {
    await dbSet('bookmarks',       G.bookmarks);
    await dbSet('notes',           G.notes);
    await dbSet('lastRead',        G.lastRead);
    await dbSet('verseKeys',       [...G.verseKeys]);
    await dbSet('aiChatHistory',   G.aiChatHistory);
    await dbSet('aiReflHistory',   G.aiReflHistory);
    await dbSet('streak',          G.streak);
    await dbSet('daysRead',        G.daysRead);
  } catch(e) { console.warn('[persist]', e); }
}
window.persistUserData = persistUserData;

/** Load user data from IndexedDB on startup */
async function loadUserData() {
  try {
    var bm  = await dbGet('bookmarks');
    var no  = await dbGet('notes');
    var lr  = await dbGet('lastRead');
    var vk  = await dbGet('verseKeys');
    var str = await dbGet('streak');
    var dr  = await dbGet('daysRead');

    if (bm  !== null) { G.bookmarks = bm;  sj('qBM', bm); }
    if (no  !== null) { G.notes = no;       sj('qNotes', no); }
    if (lr  !== null) { G.lastRead = lr;    sj('qLR', lr); }
    if (vk  !== null) { G.verseKeys = new Set(vk); sj('qVRSet', vk); }
    if (str !== null) { G.streak = str;    ss('qStreak', str); }
    if (dr  !== null) { G.daysRead = dr;   ss('qDR', dr); }
  } catch(e) { console.warn('[load user data]', e); }
}
window.loadUserData = loadUserData;

// Persist every 60 seconds and on page hide
setInterval(persistUserData, 60000);
document.addEventListener('visibilitychange', function() {
  if (document.hidden) persistUserData();
});
window.addEventListener('beforeunload', function() { persistUserData(); });

/* ══════════════════════════════════════════
   NETWORK + OFFLINE DETECTION
══════════════════════════════════════════ */

function updateNetworkStatus() {
  var pill = document.getElementById('offline-pill');
  if (navigator.onLine) {
    document.body.classList.remove('is-offline');
    if (pill) pill.classList.remove('show');
  } else {
    document.body.classList.add('is-offline');
    if (pill) pill.classList.add('show');
  }
}

window.addEventListener('online',  updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
document.addEventListener('DOMContentLoaded', updateNetworkStatus);

/* ══════════════════════════════════════════
   CACHE ESSENTIAL CHAPTERS (Offline Reading)
   Caches Surahs 1, 36, 55, 67, 112, 113, 114
   plus the last-read chapter
══════════════════════════════════════════ */

const ESSENTIAL_SURAHS = [1, 36, 55, 67, 112, 113, 114];

async function cacheEssentials() {
  var toCache = new Set(ESSENTIAL_SURAHS);
  if (G.lastRead && G.lastRead.id) toCache.add(G.lastRead.id);

  for (var id of toCache) {
    try {
      // Check if already cached
      var cached = await getCachedChapter(id);
      if (cached && (Date.now() - cached.cached) < 7 * 24 * 60 * 60 * 1000) continue; // 7 days

      var d = await apiFetch('/verses/by_chapter/' + id + '?translations=131&fields=text_uthmani&per_page=300&page=1');
      if (d.verses) await cacheChapterText(id, d.verses);
    } catch(e) { /* skip */ }
  }
}
window.cacheEssentials = cacheEssentials;

async function clearCache() {
  try {
    var db = await openDB();
    if (db) {
      var tx = db.transaction(['chapters','verses'], 'readwrite');
      tx.objectStore('chapters').clear();
      tx.objectStore('verses').clear();
    }
    if ('caches' in window) {
      var keys = await caches.keys();
      await Promise.all(keys.map(function(k){ return caches.delete(k); }));
    }
    showToast('Cache cleared');
  } catch(e) { showToast('Clear failed'); }
}
window.clearCache = clearCache;
