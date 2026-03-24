'use strict';
/**
 * js/home.js — Home Page v4
 * Renders greeting, stats, verse of day, popular surahs, chapter grid.
 * All DOM injection for pg-home lives here exclusively.
 * v4: All emoji icons replaced with SVGs; haptics; improved UX.
 */

const POPULAR_IDS = [1, 2, 18, 36, 55, 67, 56, 112];

/* SVG icon set for popular surahs — geometric/thematic */
const POPULAR_SVG = {
  1:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
  2:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>',
  18:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  36:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
  55:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  67:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  56:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  112: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
};

const POPULAR_META = {
  1:   { label: 'Al-Fatiha',  sub: 'The Opening'     },
  2:   { label: 'Al-Baqarah', sub: 'The Cow'         },
  18:  { label: 'Al-Kahf',    sub: 'The Cave'        },
  36:  { label: 'Ya-Sin',     sub: 'Ya-Sin'          },
  55:  { label: 'Ar-Rahman',  sub: 'The Merciful'    },
  67:  { label: 'Al-Mulk',    sub: 'The Sovereignty' },
  56:  { label: "Al-Waqi'ah", sub: 'The Inevitable'  },
  112: { label: 'Al-Ikhlas',  sub: 'Sincerity'       },
};

/* ── Build the home page shell once ── */
function buildHomePage() {
  const pg = document.getElementById('pg-home');
  if (!pg || pg.dataset.built) return;
  pg.dataset.built = '1';

  pg.innerHTML = `
  <div class="home-wrap">

    <!-- Greeting + Hijri -->
    <div class="greeting-row">
      <div>
        <div class="greeting-text" id="greeting"></div>
        <div class="greeting-sub">Welcome to Maktabah · مكتبة</div>
      </div>
      <div class="hijri-badge" id="hijri-date" style="max-width:none;font-size:11px"></div>
    </div>

    <!-- Hero Search -->
    <div class="hero-search" role="search">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input id="hero-q" type="search" placeholder="Search surah, verse key (2:255), or topic…"
        autocomplete="off" aria-label="Search Quran"
        oninput="handleSearch(this.value,'hero-sdrop')"
        onkeydown="searchKeyNav(event,'hero-sdrop')"/>
      <div class="drop" id="hero-sdrop" role="listbox"></div>
    </div>

    <!-- Offline banner -->
    <div id="offline-banner">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      You are offline. Cached content is available.
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <div class="stat-num" id="stat-streak">0</div>
        <div class="stat-lbl" data-i18n="streak">Day Streak</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
        </div>
        <div class="stat-num" id="stat-verses">0</div>
        <div class="stat-lbl" data-i18n="versesRead">Verses Read</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <div class="stat-num" id="stat-days">0</div>
        <div class="stat-lbl" data-i18n="daysActive">Days Active</div>
      </div>
    </div>

    <!-- Continue card -->
    <div id="cc" onclick="window.resumeReading&&resumeReading();window.haptic&&haptic('medium')" role="button" tabindex="0"
      onkeydown="if(event.key==='Enter')window.resumeReading&&resumeReading()"
      aria-label="Continue reading">
      <div class="cc-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><polyline points="9 10 12 13 15 10"/></svg>
      </div>
      <div class="cc-info">
        <div class="cc-label">Continue Reading</div>
        <div class="cc-title" id="cc-title"></div>
        <div class="cc-sub"   id="cc-sub"></div>
      </div>
      <div class="cc-arrow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </div>

    <!-- Verse of the Day -->
    <div class="sh">
      <h2 data-i18n="verseOf">Verse of the Day</h2>
    </div>
    <div class="vod-card">
      <div class="vod-label">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        Daily Verse
      </div>
      <div id="vod">
        <div class="skel" style="height:52px;margin-bottom:14px;border-radius:8px"></div>
        <div class="skel" style="height:14px;width:85%;border-radius:4px;margin-bottom:6px"></div>
        <div class="skel" style="height:14px;width:60%;border-radius:4px"></div>
      </div>
    </div>

    <!-- Khatm / Juz Tracker -->
    <div class="sh">
      <h3 style="font-size:13px;font-weight:700"> Khatm Tracker</h3>
      <button class="sh-btn" onclick="window.openJuzTracker()">30 Juz</button>
    </div>
    <div id="juz-panel" class="juz-panel-wrap"></div>

    <!-- Popular Surahs -->
    <div class="sh">
      <h2 data-i18n="popular">Popular Surahs</h2>
      <button class="sh-btn" onclick="window.navigate('reader')" data-i18n="read">Read</button>
    </div>
    <div class="pop-grid" id="pop-grid"></div>

    <!-- All Chapters -->
    <div class="sh" style="margin-top:32px">
      <h2 data-i18n="allChapters">All 114 Chapters</h2>
      <div style="display:flex;gap:6px">
        <button class="sort-btn on" data-sort-by="surah"      onclick="window.setSortBy('surah',this)">Surah #</button>
        <button class="sort-btn"    data-sort-by="revelation" onclick="window.setSortBy('revelation',this)">Revelation</button>
        <button class="sort-btn on" data-sort-ord="asc"  onclick="window.setSort('asc',this)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><polyline points="18 15 12 9 6 15"/></svg>
        </button>
        <button class="sort-btn"    data-sort-ord="desc" onclick="window.setSort('desc',this)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>
    </div>
    <div id="ch-grid"></div>

    <!-- Quick Actions -->
    <div class="sh" style="margin-top:28px"><h2>Quick Actions</h2></div>
    <div class="quick-actions">
      <button class="pop-card" onclick="window.randomAyah&&randomAyah();window.haptic&&haptic('light')">
        <span class="pop-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
        </span>
        <div class="pop-name">Random Verse</div>
        <div class="pop-sub">Discover the Quran</div>
      </button>
      <button class="pop-card" onclick="window.navigate('mushaf');window.haptic&&haptic('light')">
        <span class="pop-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
        </span>
        <div class="pop-name">Mushaf View</div>
        <div class="pop-sub">Traditional pages</div>
      </button>
      <button class="pop-card" onclick="window.navigate('ai');window.haptic&&haptic('light')">
        <span class="pop-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22"><path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3h-1v1a4 4 0 0 1-8 0v-1H7a3 3 0 0 1-3-3v-2a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4z"/></svg>
        </span>
        <div class="pop-name">AI Tools</div>
        <div class="pop-sub">Reflect &amp; explore</div>
      </button>
      <button class="pop-card" onclick="window.navigate('corpus');window.haptic&&haptic('light')">
        <span class="pop-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
        </span>
        <div class="pop-name">Corpus</div>
        <div class="pop-sub">Root word analysis</div>
      </button>
    </div>

  </div>`;
}
window.buildHomePage = buildHomePage;

/* ── Verse of the Day ── */
async function loadVOD() {
  try {
    const d  = await apiFetch(`/verses/random?translations=${G.translation}&fields=text_uthmani`);
    const v  = d.verse;
    const rawTr = v.translations?.[0]?.text || '';
    const tr = rawTr
      .replace(/<sup[^>]*>.*?<\/sup>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/[\u00B2\u00B3\u00B9\u2070-\u2079]+/g, '')
      .replace(/&[a-z]+;/gi,' ').trim();
    const vod = document.getElementById('vod');
    if (!vod) return;
    /* BUG-35 fix: escape API text before HTML injection */
    const heAr = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    vod.innerHTML = `
      <div class="vod-ar" lang="ar" dir="rtl" style="font-family:${G.arabicFont};font-size:clamp(20px,4vw,30px)">${heAr(v.text_uthmani)}</div>
      <div class="vod-tr">${heAr(tr).slice(0,220)}${tr.length>220?'…':''}</div>
      <div class="vod-ref">— Quran ${heAr(v.verse_key)}</div>
      <div class="vod-actions">
        <button class="vod-btn" onclick="window.jumpToVerse('${v.verse_key}');window.haptic&&haptic('medium')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
          Read
        </button>
        <button class="vod-btn" onclick="window.playVerse('${v.verse_key}');window.haptic&&haptic('medium')">
          <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><polygon points="5,3 19,12 5,21"/></svg>
          Listen
        </button>
        <button class="vod-btn" onclick="window.verseAIReflect&&verseAIReflect('${v.verse_key}');window.haptic&&haptic('light')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="12" r="10"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Reflect
        </button>
      </div>`;
  } catch {
    const vod = document.getElementById('vod');
    if (vod) vod.innerHTML = '<div class="vod-offline">Verse unavailable offline.</div>';
  }
}
window.loadVOD = loadVOD;

/* ── Popular surahs grid ── */
function buildPopular() {
  const el = document.getElementById('pop-grid');
  if (!el) return;
  el.innerHTML = POPULAR_IDS.map(id => {
    const ch  = G.chapters.find(c => c.id === id);
    const m   = POPULAR_META[id] || {};
    const svg = POPULAR_SVG[id]  || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>';
    if (!ch) return '';
    return `<div class="pop-card" onclick="window.openChapter(${id});window.haptic&&haptic('medium')" tabindex="0" role="button"
      onkeydown="if(event.key==='Enter')window.openChapter(${id})"
      aria-label="${ch.name_simple}">
      <span class="pop-icon">${svg}</span>
      <div class="pop-name">${ch.name_simple}</div>
      <div class="pop-sub">${ch.translated_name?.name || m.sub || ''}</div>
    </div>`;
  }).join('');
}
window.buildPopular = buildPopular;

/* ── Chapter grid ── */
function renderChapterGrid() {
  const el = document.getElementById('ch-grid');
  if (!el) return;

  const list = G.sortBy === 'revelation'
    ? [...G.chapters].sort((a,b) => G.sortOrder === 'asc'
        ? (a.revelation_order||0) - (b.revelation_order||0)
        : (b.revelation_order||0) - (a.revelation_order||0))
    : [...G.chapters].sort((a,b) => G.sortOrder === 'asc' ? a.id - b.id : b.id - a.id);

  el.innerHTML = `<div class="ch-grid-inner">` +
    list.map(ch => `
    <div class="ch-item" onclick="window.openChapter(${ch.id});window.haptic&&haptic('medium')" tabindex="0" role="button"
      id="chi-${ch.id}" aria-label="${ch.name_simple}">
      <div class="chi-num">${ch.id}</div>
      <div class="chi-info">
        <div class="chi-name">${ch.name_simple}</div>
        <div class="chi-sub">${ch.translated_name?.name||''} · ${ch.verses_count} ayahs</div>
      </div>
      <div class="chi-ar" lang="ar" dir="rtl">${ch.name_arabic}</div>
    </div>`).join('') + `</div>`;
}
window.renderChapterGrid = renderChapterGrid;

/* ── Sort ── */
function setSortBy(by, btn) {
  G.sortBy = by; ss('qSortBy', by);
  document.querySelectorAll('[data-sort-by]').forEach(b => b.classList.toggle('on', b.dataset.sortBy === by));
  renderChapterGrid();
  if (window.haptic) haptic('light');
}
function setSort(ord, btn) {
  G.sortOrder = ord; ss('qSortOrder', ord);
  document.querySelectorAll('[data-sort-ord]').forEach(b => b.classList.toggle('on', b.dataset.sortOrd === ord));
  renderChapterGrid();
  if (window.haptic) haptic('light');
}
window.setSortBy = setSortBy;
window.setSort   = setSort;

/* ── Home stats display ── */
function refreshHomeStats() {
  updateProgressUI();
  updateStreakUI();
  const sd = document.getElementById('stat-days');
  if (sd) sd.textContent = G.daysRead;
}
window.refreshHomeStats = refreshHomeStats;

/* ── Continue card ── */
function updateContinueCard() {
  const cc    = document.getElementById('cc');
  const title = document.getElementById('cc-title');
  const sub   = document.getElementById('cc-sub');
  if (!cc) return;
  if (G.lastRead) {
    cc.classList.add('show');
    if (title) title.textContent = G.lastRead.name || '';
    if (sub)   sub.textContent   = `Ayah ${G.lastRead.verse || 1}${G.lastRead.page > 1 ? ' · Page '+G.lastRead.page : ''}`;
  } else {
    cc.classList.remove('show');
  }
}
window.updateContinueCard = updateContinueCard;

function resumeReading() {
  if (!G.lastRead) { navigate('reader'); return; }
  jumpToVerse(G.lastRead.key);
}
window.resumeReading = resumeReading;


/* ── Fix #6: Juz Progress Grid (30 Juz khatm tracker) ── */
function buildJuzGrid() {
  const juzData = gj('qJuzRead', {});
  let html = '<div class="juz-grid">';
  for (let j = 1; j <= 30; j++) {
    const done = !!juzData[j];
    html += '<div class="juz-box' + (done ? ' done' : '') + '" onclick="toggleJuz(' + j + ')" title="Juz ' + j + '">'
          + '<span class="juz-num">' + j + '</span>'
          + (done ? '<span class="juz-check">✓</span>' : '')
          + '</div>';
  }
  html += '</div>';
  const completed = Object.keys(juzData).filter(k => juzData[k]).length;
  html += '<div class="juz-meta">' + completed + '/30 Juz completed' + (completed===30 ? '  Masha Allah!' : '') + '</div>';
  return html;
}
window.buildJuzGrid = buildJuzGrid;

function toggleJuz(n) {
  const juzData = gj('qJuzRead', {});
  juzData[n] = !juzData[n];
  sj('qJuzRead', juzData);
  const panel = document.getElementById('juz-panel');
  if (panel && panel.classList.contains('open')) panel.innerHTML = buildJuzGrid();
  if (window.haptic) haptic('light');
  showToast(juzData[n] ? ' Juz ' + n + ' marked complete' : 'Juz ' + n + ' unmarked');
}
window.toggleJuz = toggleJuz;

function openJuzTracker() {
  const panel = document.getElementById('juz-panel');
  if (!panel) return;
  const isOpen = panel.classList.contains('open');
  if (!isOpen) panel.innerHTML = buildJuzGrid();
  panel.classList.toggle('open');
  if (window.haptic) haptic('light');
}
window.openJuzTracker = openJuzTracker;

