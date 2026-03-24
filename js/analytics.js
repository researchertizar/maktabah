'use strict';
/**
 * js/analytics.js — Maktabah User Analytics v1
 *
 * 100% local-first. All data stays in localStorage unless user
 * explicitly requests the AI report (which sends anonymised aggregate stats).
 *
 * Tracks:
 *  · Page dwell times            · Verse interactions
 *  · Chapter/Surah openings      · Adhkar completions
 *  · Search queries (terms only) · Feature toggles
 *  · Session length & frequency  · Time-of-day patterns
 *  · Audio playbacks             · Theme / lang preferences
 *
 * Two-section report:
 *  1. Usage Analytics  — charts + stats (pure local)
 *  2. AI Portrait      — personality insight via backend AI
 *                        (opt-in, sends anonymised aggregate JSON)
 */

/* ═══════════════════════════
   CONSTANTS & HELPERS
═══════════════════════════ */
const AK = {                         /* localStorage keys */
  consent:  'an_consent',
  sessions: 'an_sessions',
  events:   'an_events',
  dwell:    'an_dwell',
};
const MAX_EVENTS   = 2000;           /* rolling window */
const MAX_SESSIONS = 90;             /* ~3 months of daily use */
const SESSION_GAP  = 30 * 60 * 1000; /* 30 min idle → new session */

let _sessionStart = Date.now();
let _lastActivity = Date.now();
let _pageStart    = {};              /* view → timestamp */
let _consent      = ls(AK.consent) === '1';
let _sessionId    = null;
let _dwellMap     = gj(AK.dwell, {});   /* view → total ms */
let _events       = [];             /* hot cache, flushed to LS periodically */
let _flushTimer   = null;

/* ═══════════════════════════
   SESSION MANAGEMENT
═══════════════════════════ */
function _startSession() {
  const sessions = gj(AK.sessions, []);
  const last     = sessions[sessions.length - 1];
  const now      = Date.now();

  if (last && (now - last.end) < SESSION_GAP) {
    /* Resume existing session */
    _sessionId = last.id;
    last.end   = now;
  } else {
    /* New session */
    _sessionId = 'S' + now.toString(36);
    sessions.push({
      id:    _sessionId,
      start: now,
      end:   now,
      views: {},
      date:  new Date(now).toISOString().slice(0, 10),
      hour:  new Date(now).getHours(),
    });
    if (sessions.length > MAX_SESSIONS) sessions.splice(0, sessions.length - MAX_SESSIONS);
  }
  sj(AK.sessions, sessions);
  return _sessionId;
}

function _heartbeat() {
  const now = Date.now();
  _lastActivity = now;
  const sessions = gj(AK.sessions, []);
  const s = sessions.find(x => x.id === _sessionId);
  if (s) { s.end = now; sj(AK.sessions, sessions); }
}

/* ═══════════════════════════
   EVENT TRACKING (public API)
═══════════════════════════ */
function trackEvent(category, action, value) {
  if (!_consent) return;
  _events.push({
    t: Date.now(),
    c: category,   /* 'verse' | 'chapter' | 'adhkar' | 'audio' | 'feature' | 'search' | 'nav' */
    a: action,
    v: value != null ? String(value).slice(0, 100) : undefined,
    s: _sessionId,
  });
  _lastActivity = Date.now();
  if (_events.length >= 50) _flushEvents();
  else { clearTimeout(_flushTimer); _flushTimer = setTimeout(_flushEvents, 3000); }
}
window.trackEvent = trackEvent;

function _flushEvents() {
  if (!_events.length) return;
  const stored = gj(AK.events, []);
  stored.push(..._events);
  _events = [];
  if (stored.length > MAX_EVENTS) stored.splice(0, stored.length - MAX_EVENTS);
  sj(AK.events, stored);
}

/* ── Page dwell tracker ── */
function trackPageEnter(view) {
  if (!_consent) return;
  _pageStart[view] = Date.now();
  trackEvent('nav', 'enter', view);
}
function trackPageLeave(view) {
  if (!_consent || !_pageStart[view]) return;
  const ms = Date.now() - _pageStart[view];
  if (ms < 500) return;
  _dwellMap[view] = (_dwellMap[view] || 0) + ms;
  sj(AK.dwell, _dwellMap);
  delete _pageStart[view];
}
window.trackPageEnter = trackPageEnter;
window.trackPageLeave = trackPageLeave;

/* ═══════════════════════════
   INIT — hooks into existing app
═══════════════════════════ */
function initAnalytics() {
  if (_consent) _startSession();

  /* Patch navigate() to track page transitions */
  const _origNavigate = window.navigate;
  window.navigate = function(view, opts) {
    if (_consent) {
      if (window.G?.view) trackPageLeave(window.G.view);
      trackPageEnter(view);
    }
    return _origNavigate(view, opts);
  };

  /* Patch openChapter() */
  const _origOpen = window.openChapter;
  window.openChapter = async function(id) {
    trackEvent('chapter', 'open', id);
    return _origOpen ? _origOpen(id) : undefined;
  };

  /* Patch playVerse() */
  const _origPlay = window.playVerse;
  window.playVerse = async function(key) {
    trackEvent('audio', 'play_verse', key);
    return _origPlay ? _origPlay(key) : undefined;
  };

  /* Patch bmToggle (bookmark) */
  const _origBm = window.bmToggle;
  window.bmToggle = function(key, text) {
    trackEvent('verse', 'bookmark', key);
    return _origBm ? _origBm(key, text) : undefined;
  };

  /* Patch tapAdhkar */
  const _origTap = window.tapAdhkar;
  window.tapAdhkar = function(id, target) {
    trackEvent('adhkar', 'tap', id);
    return _origTap ? _origTap(id, target) : undefined;
  };

  /* Patch handleSearch */
  const _origSearch = window.handleSearch;
  window.handleSearch = function(q, dropId) {
    if (q && q.trim().length > 1) {
      clearTimeout(window._anSearchTimer);
      window._anSearchTimer = setTimeout(() => trackEvent('search', 'query', q.trim().slice(0,40)), 800);
    }
    return _origSearch ? _origSearch(q, dropId) : undefined;
  };

  /* Heartbeat every 60s */
  setInterval(_heartbeat, 60000);
  /* Flush on unload */
  window.addEventListener('beforeunload', () => {
    if (window.G?.view) trackPageLeave(window.G.view);
    _flushEvents();
  });
}
window.initAnalytics = initAnalytics;

/* ═══════════════════════════
   CONSENT MANAGEMENT
═══════════════════════════ */
function enableAnalytics() {
  _consent = true;
  ss(AK.consent, '1');
  _startSession();
  showToast('Analytics enabled — your data stays on this device');
  renderAnalyticsPage();
}
function disableAnalytics() {
  _consent = false;
  ss(AK.consent, '0');
  showToast('Analytics disabled');
  renderAnalyticsPage();
}
function clearAnalyticsData() {
  [AK.sessions, AK.events, AK.dwell].forEach(k => rm(k));
  _events   = [];
  _dwellMap = {};
  _sessionId = null;
  showToast('All analytics data cleared');
  renderAnalyticsPage();
}
window.enableAnalytics  = enableAnalytics;
window.disableAnalytics = disableAnalytics;
window.clearAnalyticsData = clearAnalyticsData;

/* ═══════════════════════════
   DATA AGGREGATION
═══════════════════════════ */
function _aggregate() {
  const events   = gj(AK.events, []);
  const sessions = gj(AK.sessions, []);
  const dwell    = gj(AK.dwell, {});

  /* Session stats */
  const totalSessions = sessions.length;
  const totalMinutes  = sessions.reduce((s, x) => s + Math.max(0, (x.end - x.start) / 60000), 0);
  const avgMinutes    = totalSessions ? (totalMinutes / totalSessions) : 0;

  /* Hour histogram */
  const hourMap = {};
  sessions.forEach(s => { hourMap[s.hour] = (hourMap[s.hour] || 0) + 1; });
  const peakHour = Object.entries(hourMap).sort((a,b) => b[1]-a[1])[0]?.[0];

  /* Date activity (last 30 days) */
  const today   = new Date().toISOString().slice(0,10);
  const dayMap  = {};
  sessions.forEach(s => { if (s.date) dayMap[s.date] = (dayMap[s.date] || 0) + 1; });

  /* Event breakdowns */
  const chapters   = events.filter(e => e.c === 'chapter' && e.a === 'open');
  const plays      = events.filter(e => e.c === 'audio'   && e.a === 'play_verse');
  const bookmarks  = events.filter(e => e.c === 'verse'   && e.a === 'bookmark');
  const adhkarTaps = events.filter(e => e.c === 'adhkar'  && e.a === 'tap');
  const searches   = events.filter(e => e.c === 'search');

  /* Most-visited surahs */
  const surahCount = {};
  chapters.forEach(e => { if (e.v) surahCount[e.v] = (surahCount[e.v] || 0) + 1; });
  const topSurahs = Object.entries(surahCount).sort((a,b) => b[1]-a[1]).slice(0,5);

  /* Dwell — format */
  const dwellFormatted = {};
  Object.entries(dwell).forEach(([k,v]) => { dwellFormatted[k] = Math.round(v/60000); });

  /* First use date */
  const firstSession = sessions[0];
  const firstDate    = firstSession ? firstSession.date : today;
  const daysSince    = Math.max(1, Math.round((Date.now() - new Date(firstDate)) / 86400000));

  return {
    totalSessions,
    totalMinutes: Math.round(totalMinutes),
    avgMinutes:   Math.round(avgMinutes),
    peakHour:     peakHour != null ? +peakHour : null,
    dayMap,
    chaptersOpened: chapters.length,
    versesPlayed:   plays.length,
    bookmarks:      bookmarks.length,
    adhkarTaps:     adhkarTaps.length,
    searches:       searches.length,
    topSurahs,
    dwell:          dwellFormatted,
    daysSince,
    firstDate,
    eventCount:     events.length,
  };
}

/* ═══════════════════════════
   ANALYTICS PAGE RENDER
═══════════════════════════ */
function renderAnalyticsPage() {
  const pg = document.getElementById('pg-analytics');
  if (!pg) return;

  if (!_consent) {
    pg.innerHTML = _buildConsentGate();
    return;
  }

  const D = _aggregate();
  pg.innerHTML = _buildAnalyticsUI(D);
}
window.renderAnalyticsPage = renderAnalyticsPage;

function _buildConsentGate() {
  return `<div class="an-wrap">
  <div class="an-consent-card">
    <div class="an-consent-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    </div>
    <h2 class="an-consent-title">Usage Insights</h2>
    <p class="an-consent-desc">
      Understand your Quran journey — how you read, what you recite, and when you engage. 
      All data is stored <strong>only on this device</strong>. Nothing is uploaded without your explicit action.
    </p>
    <div class="an-consent-points">
      <div class="an-cp"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> Stored locally in your browser</div>
      <div class="an-cp"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> Never shared without your consent</div>
      <div class="an-cp"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> Delete anytime with one tap</div>
      <div class="an-cp"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> AI report is opt-in only</div>
    </div>
    <button class="an-enable-btn" onclick="window.enableAnalytics()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      Enable Insights
    </button>
    <p class="an-consent-note">You can turn this off and clear all data at any time.</p>
  </div>
</div>`;
}

function _buildAnalyticsUI(D) {
  const peakLabel = D.peakHour != null
    ? (['Midnight','1am','2am','3am','4am','5am','6am','7am','8am','9am','10am','11am',
        'Noon','1pm','2pm','3pm','4pm','5pm','6pm','7pm','8pm','9pm','10pm','11pm'][D.peakHour] || `${D.peakHour}:00`)
    : '—';

  const dwellItems = Object.entries(D.dwell)
    .sort((a,b) => b[1]-a[1])
    .map(([view, min]) =>
      `<div class="an-dwell-row">
        <span class="an-dwell-view">${_viewLabel(view)}</span>
        <div class="an-dwell-bar-wrap"><div class="an-dwell-bar" style="width:${Math.min(100,(min/Math.max(1,...Object.values(D.dwell)))*100)}%"></div></div>
        <span class="an-dwell-time">${min < 1 ? '<1m' : min + 'm'}</span>
      </div>`
    ).join('') || '<div class="an-empty">No dwell data yet</div>';

  const topSurahItems = D.topSurahs.map(([id, count]) => {
    const ch = window.G?.chapters?.find(c => String(c.id) === id);
    return `<div class="an-surah-item">
      <div class="an-surah-num">${id}</div>
      <div class="an-surah-name">${ch ? ch.name_simple : 'Surah ' + id}</div>
      <div class="an-surah-count">${count}×</div>
    </div>`;
  }).join('') || '<div class="an-empty">Open some surahs to see your favorites</div>';

  /* 30-day streak grid */
  const today   = new Date();
  const cells   = [];
  for (let i = 29; i >= 0; i--) {
    const d   = new Date(today); d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0,10);
    const cnt = D.dayMap[key] || 0;
    const lvl = cnt === 0 ? 0 : cnt === 1 ? 1 : cnt <= 3 ? 2 : 3;
    cells.push(`<div class="an-day lvl${lvl}" title="${key}: ${cnt} session(s)"></div>`);
  }

  return `<div class="an-wrap">

    <!-- Header -->
    <div class="an-hdr">
      <div>
        <h2 class="an-title">Your Quran Journey</h2>
        <p class="an-subtitle">Since ${D.firstDate} · ${D.daysSince} days</p>
      </div>
      <div class="an-hdr-actions">
        <button class="an-action-btn an-action-ai" id="an-ai-btn" onclick="window.requestAIPortrait()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="12" r="10"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          AI Portrait
        </button>
        <button class="an-action-btn" onclick="window.clearAnalyticsData()" title="Clear all data">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          Clear
        </button>
        <button class="an-action-btn" onclick="window.disableAnalytics()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          Disable
        </button>
      </div>
    </div>

    <!-- AI Portrait section (hidden until requested) -->
    <div id="an-portrait" class="an-portrait-wrap" style="display:none"></div>

    <!-- Stats grid -->
    <div class="an-stats-grid">
      <div class="an-stat">
        <div class="an-stat-num">${D.totalMinutes < 60 ? D.totalMinutes + 'm' : Math.round(D.totalMinutes/60) + 'h'}</div>
        <div class="an-stat-lbl">Total time</div>
      </div>
      <div class="an-stat">
        <div class="an-stat-num">${D.totalSessions}</div>
        <div class="an-stat-lbl">Sessions</div>
      </div>
      <div class="an-stat">
        <div class="an-stat-num">${D.chaptersOpened}</div>
        <div class="an-stat-lbl">Surahs opened</div>
      </div>
      <div class="an-stat">
        <div class="an-stat-num">${D.versesPlayed}</div>
        <div class="an-stat-lbl">Verses played</div>
      </div>
      <div class="an-stat">
        <div class="an-stat-num">${D.adhkarTaps}</div>
        <div class="an-stat-lbl">Dhikr counts</div>
      </div>
      <div class="an-stat">
        <div class="an-stat-num">${D.bookmarks}</div>
        <div class="an-stat-lbl">Bookmarks</div>
      </div>
    </div>

    <!-- 30-day activity grid -->
    <div class="an-section">
      <div class="an-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        30-Day Activity
      </div>
      <div class="an-day-grid">${cells.join('')}</div>
      <div class="an-day-legend">
        <span>Less</span>
        <div class="an-day lvl0"></div>
        <div class="an-day lvl1"></div>
        <div class="an-day lvl2"></div>
        <div class="an-day lvl3"></div>
        <span>More</span>
      </div>
    </div>

    <!-- Time of day -->
    <div class="an-section">
      <div class="an-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Most Active Time
      </div>
      <div class="an-peak-time">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
        <div>
          <div class="an-peak-label">${peakLabel}</div>
          <div class="an-peak-sub">Peak usage hour · avg ${D.avgMinutes}min/session</div>
        </div>
      </div>
    </div>

    <!-- Dwell time -->
    <div class="an-section">
      <div class="an-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        Time per Feature
      </div>
      <div class="an-dwell-list">${dwellItems}</div>
    </div>

    <!-- Favorite surahs -->
    <div class="an-section">
      <div class="an-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
        Most Visited Surahs
      </div>
      <div class="an-surah-list">${topSurahItems}</div>
    </div>

    <p class="an-privacy-note">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      All data is stored only on this device. The AI Portrait sends anonymised usage statistics to generate insights — no personal info, no Quran text.
    </p>
  </div>`;
}

function _viewLabel(v) {
  return { home:'Home', reader:'Reader', mushaf:'Mushaf', radio:'Audio', ai:'AI Tools',
           dhikr:'Adhkar', corpus:'Corpus', settings:'Settings' }[v] || v;
}

/* ═══════════════════════════
   AI PORTRAIT  (opt-in)
═══════════════════════════ */
async function requestAIPortrait() {
  const el = document.getElementById('an-portrait');
  const btn = document.getElementById('an-ai-btn');
  if (!el) return;

  el.style.display = 'block';
  el.innerHTML = `<div class="an-portrait-loading">
    <div class="an-portrait-spinner"></div>
    <div>Analysing your Quran journey…</div>
  </div>`;
  if (btn) btn.disabled = true;

  const D = _aggregate();

  /* Build anonymised summary for AI */
  const summary = {
    daysActive: D.daysSince,
    totalSessions: D.totalSessions,
    totalHours: +(D.totalMinutes / 60).toFixed(1),
    avgSessionMin: D.avgMinutes,
    peakHour: D.peakHour,
    chaptersOpened: D.chaptersOpened,
    versesPlayed: D.versesPlayed,
    bookmarksAdded: D.bookmarks,
    adhkarCounts: D.adhkarTaps,
    searchesPerformed: D.searches,
    topSurahIds: D.topSurahs.map(s => s[0]),
    mostUsedFeature: Object.entries(D.dwell).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'none',
    dwellByFeature: D.dwell,
  };

  const prompt = `You are a thoughtful Islamic scholar and spiritual counsellor. 
Based ONLY on this Quran app usage data, write a warm, insightful personal portrait of this user. 
Be specific to the numbers. Mention their patterns. Give spiritual encouragement aligned with Quran/Sunnah.
Do NOT guess demographics. Focus on their spiritual character and habits.

Usage data (anonymised): ${JSON.stringify(summary)}

Structure your response with these sections:
## Your Quran Personality
## Your Reading Patterns  
## Spiritual Strengths
## Gentle Suggestions
## A Personal Note

Keep it personal, warm, scholarly. 250-350 words total.`;

  try {
    const r = await callAIBackend(
      [{ role: 'user', content: prompt }],
      'You are an Islamic scholar writing personalised spiritual insights. Be warm, accurate and encouraging.'
    );
    el.innerHTML = `<div class="an-portrait-card">
      <div class="an-portrait-hdr">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="12" r="10"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span>Your AI Portrait</span>
        <small>Based on ${D.totalSessions} sessions · ${D.daysSince} days</small>
      </div>
      <div class="an-portrait-body">${renderMD ? renderMD(r.text) : r.text}</div>
      <p class="an-portrait-note">This portrait is generated from anonymised usage statistics only.</p>
    </div>`;
  } catch(e) {
    el.innerHTML = `<div class="an-portrait-err">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      AI Portrait unavailable — check your connection or set up the backend.
    </div>`;
  }
  if (btn) btn.disabled = false;
}
window.requestAIPortrait = requestAIPortrait;

/* ═══════════════════════════
   OPEN ANALYTICS PAGE
═══════════════════════════ */
function openAnalytics() {
  if (window.navigate) navigate('analytics');
  else {
    const pg = document.getElementById('pg-analytics');
    if (pg) { pg.classList.add('active'); renderAnalyticsPage(); }
  }
}
window.openAnalytics = openAnalytics;

/* Auto-init when DOM ready */
document.addEventListener('DOMContentLoaded', initAnalytics);
