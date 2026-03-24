'use strict';
/**
 * js/app.js — Application Bootstrap & Navigation v3
 * URL-based routing: every section/state gets its own URL.
 * Browser back/forward + native back button all work correctly.
 *
 * URL scheme:
 *   /                    → Home
 *   /#home               → Home
 *   /#reader/2           → Reader: Surah 2, page 1
 *   /#reader/2/3         → Reader: Surah 2, page 3
 *   /#reader/2:255       → Reader: jump to verse 2:255
 *   /#mushaf/42          → Mushaf: page 42
 *   /#mushaf             → Mushaf: last page
 *   /#radio              → Audio
 *   /#ai                 → AI Tools
 *   /#ai/reflect         → AI Tools, reflect tab
 *   /#corpus             → Corpus
 *   /#corpus/stats       → Corpus, stats tab
 */

const ALL_VIEWS = ['home','reader','mushaf','radio','ai','corpus','dhikr','madhab','analytics','tools'];

/* ═══════════════════════════════════════
   URL ROUTING — build & parse
═══════════════════════════════════════ */

/** Build the URL hash for a given state */
function buildHash(view, params) {
  params = params || {};
  switch (view) {
    case 'reader':
      if (params.verseKey) return '#reader/' + params.verseKey;
      if (params.surah)    return '#reader/' + params.surah + (params.page > 1 ? '/' + params.page : '');
      if (G.chapter)       return '#reader/' + G.chapter.id + (G.page > 1 ? '/' + G.page : '');
      return '#reader';
    case 'mushaf':
      var mp = params.page || (window.MUSHAF && MUSHAF.page) || 1;
      return mp > 1 ? '#mushaf/' + mp : '#mushaf';
    case 'ai':
      return params.tab ? '#ai/' + params.tab : '#ai';
    case 'corpus':
      return params.tab ? '#corpus/' + params.tab : '#corpus';
    case 'dhikr':
      return params.cat ? '#dhikr/' + params.cat : '#dhikr';
    case 'madhab':
      return params.tab ? '#madhab/' + params.tab : '#madhab';
    case 'analytics':
      return '#analytics';
    case 'tools':
      return params.sub ? '#tools/' + params.sub : '#tools';
    default:
      return '#' + view;
  }
}

window.replaceURL = replaceURL;
window.pushURL    = pushURL;

/** Parse the current URL hash into { view, params } */
function parseHash(hash) {
  hash = (hash || location.hash).replace(/^#/, '');
  if (!hash || hash === 'home') return { view: 'home', params: {} };

  var parts = hash.split('/');
  var view  = parts[0];

  if (!ALL_VIEWS.includes(view)) return { view: 'home', params: {} };

  var params = {};

  if (view === 'reader') {
    var seg = parts[1] || '';
    if (seg.includes(':')) {
      params.verseKey = seg;
    } else if (seg) {
      params.surah = parseInt(seg) || 1;
      params.page  = parseInt(parts[2]) || 1;
    }
  }
  if (view === 'mushaf' && parts[1]) {
    params.page = parseInt(parts[1]) || 1;
  }
  if ((view === 'ai' || view === 'corpus') && parts[1]) {
    params.tab = parts[1];
  }
  if (view === 'dhikr' && parts[1]) {
    params.cat = parts[1];
  }
  if (view === 'madhab' && parts[1]) {
    params.tab = parts[1];
  }
  if (view === 'tools' && parts[1]) {
    params.sub = parts[1];
  }

  return { view: view, params: params };
}

/** Push a new URL into browser history */
function pushURL(view, params) {
  var hash = buildHash(view, params);
  try { history.pushState({ view: view, params: params || {} }, '', hash); }
  catch(e) { location.hash = hash; }
}

/** Replace current URL (no new history entry) */
function replaceURL(view, params) {
  var hash = buildHash(view, params);
  try { history.replaceState({ view: view, params: params || {} }, '', hash); }
  catch(e) {}
}

/* ═══════════════════════════════════════
   NAVIGATE — the single source of truth
═══════════════════════════════════════ */
function navigate(view, opts) {
  opts = opts || {};
  var noHistory = opts.noHistory || opts.pushHistory === false;

  /* Close mushaf tip popup on any navigation */
  var tip = document.getElementById('mc-tip');
  if (tip) { tip.style.display = 'none'; tip.dataset.key = ''; }

  /* Save scroll position of current view before leaving */
  if (G.view) {
    var curPg = document.getElementById('pg-' + G.view);
    if (curPg) _scrollPos[G.view] = curPg.scrollTop;
  }

  ALL_VIEWS.forEach(function(v) {
    var pg = document.getElementById('pg-' + v);
    if (pg) pg.classList.remove('active');
  });
  var target = document.getElementById('pg-' + view);
  if (!target) { console.warn('[nav] unknown view:', view); return; }
  target.classList.add('active');

  G.view = view;

  // Push real browser history entry (not replace) so back button works
  if (!noHistory) {
    pushURL(view, opts.params || {});
  } else {
    replaceURL(view, opts.params || {});
  }

  // Sync top-nav
  document.querySelectorAll('[data-nav]').forEach(function(el) {
    var match = el.dataset.nav === view;
    el.classList.toggle('active', match);
    el.setAttribute('aria-current', match ? 'page' : 'false');
  });

  // Sync mobile nav — dhikr now has its own tab
  var navMap = { home:'home', reader:'home', mushaf:'mushaf', radio:'radio', ai:'ai', corpus:'tools', dhikr:'tools', analytics:'tools', madhab:'tools', tools:'tools' };
  document.querySelectorAll('.mnt').forEach(function(b) { b.classList.remove('active'); });
  var mntEl = document.getElementById('mnt-' + (navMap[view] || view));
  if (mntEl) mntEl.classList.add('active');

  // Lazy init feature pages
  if (view === 'mushaf' && window.initMushaf)  initMushaf();
  if (view === 'ai'     && window.initAI)      initAI();
  if (view === 'corpus' && window.initCorpus)  initCorpus();
  if (view === 'radio'  && window.initRadio)   initRadio();
  if (view === 'dhikr'  && window.initDhikr)  initDhikr();
  if (view === 'analytics' && window.renderAnalyticsPage) renderAnalyticsPage();
  if (view === 'madhab'    && window.initMadhab)          initMadhab();
  if (view === 'tools'     && window.initTools)           initTools();

  /* Restore scroll position for this view */
  requestAnimationFrame(function() {
    var pg = document.getElementById('pg-' + view);
    if (pg && _scrollPos[view] != null) {
      pg.scrollTop = _scrollPos[view];
    }
  });

  closeSidebar();
}
window.navigate = navigate;

/* ═══════════════════════════════════════
   POPSTATE — browser back/forward
═══════════════════════════════════════ */
window.addEventListener('popstate', async function(e) {
  var state = e.state || {};
  var hash  = location.hash.replace('#','');

  /* Close any open overlay in priority order — most recently opened first */
  var overlaysClosed = _closeTopOverlay();
  if (overlaysClosed) return;

  /* Handle overlay-URL states */
  if (state.overlay === 'settings' || hash === 'settings') {
    if (window.closeSettings) closeSettings();
    return;
  }
  if (state.overlay === 'bookmarks' || hash === 'bookmarks') {
    if (window.closeBookmarks) closeBookmarks();
    return;
  }

  /* Close any lingering overlays */
  if (window.closeSettings)  closeSettings();
  if (window.closeBookmarks) closeBookmarks();

  var parsed = parseHash(location.hash);
  var view   = state.view || parsed.view;
  var params = state.params || parsed.params;

  /* Dhikr: if going back to #dhikr (no cat), show grid */
  if (view === 'dhikr' && !params.cat && window.dhikrBack) {
    /* Only call dhikrBack if currently in detail view */
    if (window.getDhikrCat && window.getDhikrCat() !== null) {
      /* Just show the page, dhikrBack will update state */
    }
  }

  /* Show the correct page */
  ALL_VIEWS.forEach(function(v) {
    var pg = document.getElementById('pg-' + v);
    if (pg) pg.classList.remove('active');
  });
  var target = document.getElementById('pg-' + view);
  if (target) target.classList.add('active');
  G.view = view;

  /* Sync navs */
  document.querySelectorAll('[data-nav]').forEach(function(el) {
    var match = el.dataset.nav === view;
    el.classList.toggle('active', match);
    el.setAttribute('aria-current', match ? 'page' : 'false');
  });
  var navMap = { home:'home', reader:'home', mushaf:'mushaf', radio:'radio', ai:'ai', corpus:'tools', dhikr:'tools', analytics:'tools', madhab:'tools', tools:'tools' };
  document.querySelectorAll('.mnt').forEach(function(b) { b.classList.remove('active'); });
  var mntEl = document.getElementById('mnt-' + (navMap[view] || view));
  if (mntEl) mntEl.classList.add('active');

  /* Lazy init */
  if (view === 'mushaf' && window.initMushaf)  initMushaf();
  if (view === 'ai'     && window.initAI)      initAI();
  if (view === 'corpus' && window.initCorpus)  initCorpus();
  if (view === 'radio'  && window.initRadio)   initRadio();
  if (view === 'dhikr'  && window.initDhikr)  initDhikr();
  if (view === 'analytics' && window.renderAnalyticsPage) renderAnalyticsPage();
  if (view === 'madhab'    && window.initMadhab)          initMadhab();
  if (view === 'tools'     && window.initTools)           initTools();

  await restoreStateFromParams(view, params);
});

/** Restore app state when navigating via browser back/forward */
async function restoreStateFromParams(view, params) {
  if (!params) return;

  if (view === 'reader') {
    if (params.verseKey) {
      await jumpToVerse(params.verseKey, { noHistory: true });
    } else if (params.surah) {
      var ch = G.chapters.find(function(c) { return c.id === params.surah; });
      if (!ch) {
        // Chapters may not be loaded yet — wait
        await waitForChapters();
        ch = G.chapters.find(function(c) { return c.id === params.surah; });
      }
      if (ch) {
        G.chapter = ch;
        G.page    = params.page || 1;
        if (window.buildReaderShell) buildReaderShell();
        await loadVerses();
        hlSidebar(ch.id);
      }
    }
  }

  if (view === 'mushaf' && params.page) {
    setTimeout(function() {
      if (window.mushafGoPage) mushafGoPage(params.page);
    }, 300);
  }

  if (view === 'ai' && params.tab && window.aiTab) {
    setTimeout(function() {
      var btn = document.querySelector('#pg-ai .ai-tab[data-tab="' + params.tab + '"]');
      aiTab(params.tab, btn);
    }, 200);
  }

  if (view === 'corpus' && params.tab && window.corpusTab) {
    setTimeout(function() {
      var btn = document.querySelector('#pg-corpus .ai-tab[data-tab="' + params.tab + '"]');
      corpusTab(params.tab, btn);
    }, 200);
  }

  if (view === 'dhikr' && window.initDhikr) {
    setTimeout(function() {
      if (!params.cat) {
        /* Back to grid */
        if (window.dhikrBack) dhikrBack();
      } else if (params.cat && window.showAdhkarCat) {
        showAdhkarCat(params.cat, null);
      }
    }, 150);
  }
}

/* ════════════════════════════════════════
   OVERLAY STACK — close any open overlay
   in reverse-open order (most recent first)
════════════════════════════════════════ */
var _overlayStack = []; /* each entry: { id:string, close:fn } */
var _scrollPos   = {}; /* save/restore scroll per view */

function pushOverlay(id, closeFn) {
  /* De-duplicate */
  _overlayStack = _overlayStack.filter(function(o){ return o.id !== id; });
  _overlayStack.push({ id: id, close: closeFn });
  try { history.pushState({ overlay: id }, '', location.hash || '#' + (G.view || 'home')); } catch(e) {}
}
function popOverlay(id) {
  _overlayStack = _overlayStack.filter(function(o){ return o.id !== id; });
}
function _closeTopOverlay() {
  if (!_overlayStack.length) return false;
  var top = _overlayStack[_overlayStack.length - 1];
  _overlayStack.pop();
  try { top.close(); } catch(e) {}
  return true;
}
window.pushOverlay = pushOverlay;
window.popOverlay  = popOverlay;

function waitForChapters() {
  return new Promise(function(resolve) {
    if (G.chapters.length) { resolve(); return; }
    var t = setInterval(function() {
      if (G.chapters.length) { clearInterval(t); resolve(); }
    }, 100);
    setTimeout(function() { clearInterval(t); resolve(); }, 5000);
  });
}

/* ═══════════════════════════════════════
   SIDEBAR
═══════════════════════════════════════ */
function toggleSidebar() {
  var sb  = document.getElementById('sidebar');
  var app = document.getElementById('app');
  var ov  = document.getElementById('sb-touch-ov');
  if (!sb) return;
  if (window.innerWidth <= 960) {
    // Mobile: slide-in drawer
    var opening = !sb.classList.contains('mob-open');
    sb.classList.toggle('mob-open');
    if (ov) ov.style.display = opening ? 'block' : 'none';
  } else {
    // Desktop: collapse/expand sidebar
    var collapsed = sb.classList.toggle('collapsed');
    if (app) app.classList.toggle('sb-collapsed', collapsed);
    if (ov)  ov.style.display = 'none';
    ss('qSBColl', collapsed ? '1' : '0');
  }
}
function closeSidebar() {
  var ov = document.getElementById('sb-touch-ov');
  if (window.innerWidth <= 960) {
    document.getElementById('sidebar')?.classList.remove('mob-open');
    if (ov) ov.style.display = 'none';
  }
}
function restoreSidebarState() {
  if (window.innerWidth > 960 && ls('qSBColl') === '1') {
    document.getElementById('sidebar')?.classList.add('collapsed');
    document.getElementById('app')?.classList.add('sb-collapsed');
  }
}
window.toggleSidebar = toggleSidebar;
window.closeSidebar  = closeSidebar;

/* ═══════════════════════════════════════
   SIDEBAR TABS
═══════════════════════════════════════ */
function setSideTab(tab, btn) {
  G.sideTab = tab; ss('qSideTab', tab);
  document.querySelectorAll('.sb-tab').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  renderSidebar();
}
window.setSideTab = setSideTab;

function renderSidebar(list) {
  var el = document.getElementById('sb-list');
  if (!el) return;

  if (G.sideTab === 'juz') {
    el.innerHTML = Array.from({ length: 30 }, function(_,i) {
      return '<div class="sli" onclick="window.openJuz(' + (i+1) + ')" tabindex="0" role="listitem">' +
        '<div class="sli-num">' + (i+1) + '</div>' +
        '<div class="sli-info"><div class="sli-name">Juz ' + (i+1) + '</div></div>' +
        '</div>';
    }).join('');
    return;
  }
  if (G.sideTab === 'page') {
    /* BUG-30 fix: Math.ceil(604/20) = 31 — was 30, leaving pages 601-604 unreachable */
    el.innerHTML = Array.from({ length: Math.ceil(604 / 20) }, function(_,i) {
      var start = i * 20 + 1;
      var end   = Math.min((i + 1) * 20, 604);
      return '<div class="sli" onclick="window.jumpToMushafPage(' + start + ')" tabindex="0" role="listitem">' +
        '<div class="sli-num">' + start + '</div>' +
        '<div class="sli-info"><div class="sli-name">Pages ' + start + '\u2013' + end + '</div></div>' +
        '</div>';
    }).join('');
    return;
  }
  var src = list || G.chapters;
  if (!src.length) { el.innerHTML = '<div class="sb-offline">Loading\u2026</div>'; return; }
  el.innerHTML = src.map(function(ch) {
    var active = G.chapter && G.chapter.id === ch.id ? ' active' : '';
    return '<div class="sli' + active + '" id="sli-' + ch.id + '" onclick="window.openChapter(' + ch.id + ')" tabindex="0" role="listitem">' +
      '<div class="sli-num">' + ch.id + '</div>' +
      '<div class="sli-info">' +
        '<div class="sli-name">' + ch.name_simple + '</div>' +
        '<div class="sli-meta">' + ((ch.translated_name && ch.translated_name.name) || '') + ' \u00b7 ' + ch.verses_count + '</div>' +
      '</div>' +
      '<div class="sli-ar" dir="rtl" lang="ar">' + ch.name_arabic + '</div>' +
      '</div>';
  }).join('');
}
window.renderSidebar = renderSidebar;

function hlSidebar(id) {
  document.querySelectorAll('.sli').forEach(function(el) { el.classList.remove('active'); });
  var el = document.getElementById('sli-' + id);
  if (el) { el.classList.add('active'); el.scrollIntoView({ block:'nearest', behavior:'smooth' }); }
}
window.hlSidebar = hlSidebar;

/* ═══════════════════════════════════════
   READER NAVIGATION with URL updates
═══════════════════════════════════════ */

/** Open a chapter — updates URL to /#reader/{id} */
async function openChapterNav(id, opts) {
  opts = opts || {};
  var ch = G.chapters.find(function(c) { return c.id === id; });
  if (!ch) { showToast('Chapters not loaded'); return; }
  G.chapter = ch;
  G.page    = 1;

  navigate('reader', {
    noHistory: opts.noHistory,
    params: { surah: id, page: 1 }
  });

  if (window.buildReaderShell) buildReaderShell();
  await loadVerses();
  hlSidebar(id);
  G.lastRead = { id: ch.id, name: ch.name_simple, key: ch.id + ':1', verse: 1, page: 1 };
  saveLastRead();
  updateContinueCard();
  markDay();
}

/** Jump to a specific verse — URL: /#reader/2:255 */
async function jumpToVerse(key, opts) {
  opts = opts || {};
  if (!key) return;
  var parts = key.split(':');
  var chId  = parseInt(parts[0]);
  var vNum  = parseInt(parts[1] || 1);

  if (!G.chapters.length) await waitForChapters();
  var ch = G.chapters.find(function(c) { return c.id === chId; });
  if (!ch) { showToast('Chapter not found'); return; }

  G.chapter = ch;
  G.page    = Math.max(1, Math.ceil(vNum / G.vpp));

  navigate('reader', {
    noHistory: opts.noHistory,
    params: { verseKey: key }
  });

  if (window.buildReaderShell) buildReaderShell();
  await loadVerses();
  hlSidebar(chId);

  G.lastRead = { id: ch.id, name: ch.name_simple, key: key, verse: vNum, page: G.page };
  saveLastRead();
  updateContinueCard();

  // Scroll to verse
  setTimeout(function() {
    var el = document.getElementById('vr-' + key);
    if (!el) return;
    el.classList.add('hi');
    var pg = document.getElementById('pg-reader');
    if (pg) {
      var elTop = el.getBoundingClientRect().top;
      var pgTop = pg.getBoundingClientRect().top;
      pg.scrollTo({ top: Math.max(0, pg.scrollTop + (elTop - pgTop) - (pg.clientHeight / 4)), behavior: 'smooth' });
    }
    setTimeout(function() { el.classList.remove('hi'); }, 3500);
  }, 700);
}
window.jumpToVerse = jumpToVerse;

/** Update URL when reader page changes (pagination) */
function updateReaderURL() {
  if (G.view === 'reader' && G.chapter) {
    replaceURL('reader', { surah: G.chapter.id, page: G.page });
  }
}
window.updateReaderURL = updateReaderURL;

/** Update URL when Mushaf page changes */
function updateMushafURL(page) {
  if (G.view === 'mushaf') {
    replaceURL('mushaf', { page: page });
  }
}
window.updateMushafURL = updateMushafURL;

/* ═══════════════════════════════════════
   CONTINUE & RESUME
═══════════════════════════════════════ */
function updateContinueCard() {
  var cc = document.getElementById('cc'); if (!cc) return;
  if (!G.lastRead) { cc.style.display='none'; return; }
  var lr = G.lastRead;
  cc.style.removeProperty('display');
  var t1 = cc.querySelector('.cc-title');
  var t2 = cc.querySelector('.cc-sub');
  if (t1) t1.textContent = lr.name || '';
  var vn = lr.verse ? 'Verse ' + lr.verse : (lr.key || '');
  if (t2) t2.textContent = 'Last: ' + vn;
}
window.updateContinueCard = updateContinueCard;

async function resumeReading() {
  if (!G.lastRead) return;
  var lr = G.lastRead;
  if (lr.key && lr.key.includes(':') && lr.key.split(':')[1] !== '1') {
    await jumpToVerse(lr.key);
  } else {
    await openChapterNav(lr.id);
  }
}
window.resumeReading = resumeReading;

/* ═══════════════════════════════════════
   JUZ / MUSHAF PAGE NAVIGATION
═══════════════════════════════════════ */
async function openJuz(juz) {
  showToast('Loading Juz ' + juz + '\u2026');
  try {
    var d = await apiFetch('/juzs/' + juz);
    if (d.juz && d.juz.verse_mapping) {
      var firstSurah = Object.keys(d.juz.verse_mapping)[0];
      var firstKey   = firstSurah + ':' + d.juz.verse_mapping[firstSurah].split('-')[0];
      await jumpToVerse(firstKey);
    } else if (d.verses && d.verses[0]) {
      await jumpToVerse(d.verses[0].verse_key);
    }
  } catch(e) { showToast('Could not load Juz'); }
}
window.openJuz = openJuz;

function jumpToMushafPage(p) {
  navigate('mushaf', { params: { page: p } });
  setTimeout(function() {
    if (window.mushafGoPage) mushafGoPage(p);
  }, 300);
}
window.jumpToMushafPage = jumpToMushafPage;

function randomAyah() {
  var ch = G.chapters[Math.floor(Math.random() * G.chapters.length)];
  if (!ch) return;
  var vn = Math.floor(Math.random() * ch.verses_count) + 1;
  jumpToVerse(ch.id + ':' + vn);
}
window.randomAyah = randomAyah;

function goBack() {
  haptic && haptic('light');
  /* Try overlay stack first */
  if (_closeTopOverlay()) return;
  /* Dhikr detail → grid */
  if (G.view === 'dhikr' && window.getDhikrCat && window.getDhikrCat()) {
    if (window.dhikrBack) { dhikrBack(); return; }
  }
  if (window.history.length > 1) history.back();
  else navigate('home');
}
window.goBack = goBack;

/* ═══════════════════════════════════════
   CHAPTERS LOADING
═══════════════════════════════════════ */
async function loadChapters() {
  try {
    var d = await apiFetch('/chapters?language=en');
    G.chapters = d.chapters;
    renderSidebar();
    renderChapterGrid();
    buildPopular();
    var banner = document.getElementById('offline-banner');
    if (banner) banner.style.display = 'none';
  } catch(e) {
    console.error('[loadChapters]', e);
    var sb = document.getElementById('sb-list');
    if (sb) sb.innerHTML = '<div class="sb-offline">\u26a0 Offline</div>';
  }
}

/* ═══════════════════════════════════════
   TOAST
═══════════════════════════════════════ */
var _toastTimer;
function showToast(msg, dur) {
  dur = dur || 2800;
  var el = document.getElementById('toast'); if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() { el.classList.remove('show'); }, dur);
}
window.showToast = showToast;

/* ═══════════════════════════════════════
   ISLAMIC REMINDERS
═══════════════════════════════════════ */
const REMINDERS = [
  { icon:'\u{1f31f}', text:'Indeed, with hardship will be ease.',            ar:'\u0641\u064e\u0625\u0650\u0646\u0651\u064e \u0645\u064e\u0639\u064e \u0671\u0644\u0652\u0639\u064f\u0633\u0652\u0631\u0650 \u064a\u064f\u0633\u0652\u0631\u064b\u0627', src:'Quran',  surah:'94',  ayah:'6',   surah_name:'Ash-Sharh',    cat:'hope' },
  { icon:'\u{1f49a}', text:'Allah does not burden a soul beyond that it can bear.', ar:'\u0644\u0627 \u064a\u064f\u0643\u064e\u0644\u0651\u0650\u0641\u064f \u0671\u0644\u0644\u0651\u064e\u0647\u064f \u0646\u064e\u0641\u0652\u0633\u064b\u0627 \u0625\u0650\u0644\u0651\u064e\u0627 \u0648\u064f\u0633\u0652\u0639\u064e\u0647\u064e\u0627', src:'Quran',  surah:'2',   ayah:'286', surah_name:'Al-Baqarah',   cat:'hope' },
  { icon:'\u{1f319}', text:'Do not despair of the mercy of Allah.',           src:'Quran',  surah:'39',  ayah:'53',  surah_name:'Az-Zumar',     cat:'hope' },
  { icon:'\u2728',    text:'And it is He who is the Forgiving, the Loving.',  ar:'\u0648\u064e\u0647\u064f\u0648\u064e \u0671\u0644\u0652\u063a\u064e\u0641\u064f\u0648\u0631\u064f \u0671\u0644\u0652\u0648\u064e\u062f\u064f\u0648\u062f\u064f', src:'Quran', surah:'85', ayah:'14', surah_name:'Al-Buruj', cat:'hope' },
  { icon:'\u{1f33f}', text:'Your Lord has not forsaken you.',                  ar:'\u0645\u064e\u0627 \u0648\u064e\u062f\u0651\u064e\u0639\u064e\u0643\u064e \u0631\u064e\u0628\u0651\u064f\u0643\u064e \u0648\u064e\u0645\u064e\u0627 \u0642\u064e\u0644\u064e\u0649', src:'Quran', surah:'93', ayah:'3', surah_name:'Ad-Duha', cat:'hope' },
  { icon:'\u{1f3d4}', text:'And Allah loves the patient.',                     ar:'\u0648\u064e\u0671\u0644\u0644\u0651\u064e\u0647\u064f \u064a\u064f\u062d\u0650\u0628\u0651\u064f \u0671\u0644\u0635\u0651\u064e\u0651\u0628\u0650\u0631\u0650\u064a\u0646\u064e', src:'Quran', surah:'3', ayah:'146', surah_name:'Ali-Imran', cat:'sabr' },
  { icon:'\u2693',    text:'Indeed, Allah is with the patient.',               ar:'\u0625\u0650\u0646\u0651\u064e \u0671\u0644\u0644\u0651\u064e\u0647\u064e \u0645\u064e\u0639\u064e \u0671\u0644\u0635\u0651\u064e\u0651\u0628\u0650\u0631\u0650\u064a\u0646\u064e', src:'Quran', surah:'2', ayah:'153', surah_name:'Al-Baqarah', cat:'sabr' },
  { icon:'\u{1f932}', text:'If you are grateful, I will surely increase you.', ar:'\u0644\u064e\u0626\u0650\u0646 \u0634\u064e\u0643\u064e\u0631\u0652\u062a\u064f\u0645\u0652 \u0644\u064e\u0623\u064e\u0632\u0650\u064a\u062f\u064e\u0646\u0651\u064e\u0643\u064f\u0645\u0652', src:'Quran', surah:'14', ayah:'7', surah_name:'Ibrahim', cat:'shukr' },
  { icon:'\u{1f305}', text:'Which of the favours of your Lord will you deny?', ar:'\u0641\u064e\u0628\u0650\u0623\u064e\u0649\u0651\u0650 \u0622\u0644\u064e\u0622\u0621\u0650 \u0631\u064e\u0628\u0651\u0650\u0643\u064f\u0645\u064e\u0627 \u062a\u064f\u0643\u064e\u0630\u0651\u0650\u0628\u064e\u0627\u0646\u0650', src:'Quran', surah:'55', ayah:'13', surah_name:'Ar-Rahman', cat:'shukr' },
  { icon:'\u{1f54a}',  text:'Whoever relies upon Allah \u2014 He is sufficient for him.', ar:'\u0648\u064e\u0645\u064e\u0646 \u064a\u064e\u062a\u064e\u0648\u064e\u0643\u0651\u064e\u0644\u0652 \u0639\u064e\u0644\u064e\u0649 \u0671\u0644\u0644\u0651\u064e\u0647\u0650 \u0641\u064e\u0647\u064f\u0648\u064e \u062d\u064e\u0633\u0652\u0628\u064f\u0647\u064f', src:'Quran', surah:'65', ayah:'3', surah_name:'At-Talaq', cat:'tawakkul' },
  { icon:'\u{1f4ff}', text:'Verily, in the remembrance of Allah do hearts find rest.', ar:'\u0623\u064e\u0644\u064e\u0627 \u0628\u0650\u0630\u0650\u0643\u0652\u0631\u0650 \u0671\u0644\u0644\u0651\u064e\u0647\u0650 \u062a\u064e\u0637\u0652\u0645\u064e\u0626\u0650\u0646\u0651\u064f \u0671\u0644\u0652\u0642\u064f\u0644\u064f\u0648\u0628\u064f', src:'Quran', surah:'13', ayah:'28', surah_name:'Ar-Rad', cat:'dhikr' },
  { icon:'\u{1f338}', text:'So remember Me; I will remember you.',             ar:'\u0641\u064e\u0671\u0630\u0652\u0643\u064f\u0631\u064f\u0648\u0646\u0650\u0649\u0020\u0623\u064e\u0630\u0652\u0643\u064f\u0631\u0652\u0643\u064f\u0645\u0652', src:'Quran', surah:'2', ayah:'152', surah_name:'Al-Baqarah', cat:'dhikr' },
  { icon:'\u{1f4d6}', text:'Say: My Lord, increase me in knowledge.',          ar:'\u0648\u064e\u0642\u064f\u0644 \u0631\u0651\u064e\u0628\u0651\u0650 \u0632\u0650\u062f\u0652\u0646\u0650\u0649 \u0639\u0650\u0644\u0652\u0645\u064b\u0627', src:'Quran', surah:'20', ayah:'114', surah_name:'Ta-Ha', cat:'ilm' },
  { icon:'\u{1f50c}', text:'Read in the name of your Lord who created.',       ar:'\u0671\u0642\u0652\u0631\u064e\u0623\u0652 \u0628\u0650\u0671\u0633\u0652\u0645\u0650 \u0631\u064e\u0628\u0651\u0650\u0643\u064e \u0671\u0644\u0651\u064e\u0630\u0650\u0649 \u062e\u064e\u0644\u064e\u0642\u064e', src:'Quran', surah:'96', ayah:'1', surah_name:'Al-Alaq', cat:'ilm' },
  { icon:'\u{1f4a7}', text:'Ask forgiveness; indeed He is a Perpetual Forgiver.', src:'Quran', surah:'71', ayah:'10', surah_name:'Nuh', cat:'tawbah' },
  { icon:'\u{1f30c}', text:"He who does an atom's weight of good will see it.",  src:'Quran', surah:'99', ayah:'7', surah_name:'Az-Zalzalah', cat:'akhirah' },
  { icon:'\u{1f3e1}', text:'The Hereafter is better for you than the first life.', src:'Quran', surah:'93', ayah:'4', surah_name:'Ad-Duha', cat:'akhirah' },
  { icon:'\u{1f3af}', text:'I did not create jinn and humans except to worship Me.', src:'Quran', surah:'51', ayah:'56', surah_name:'Adh-Dhariyat', cat:'akhirah' },
  { icon:'\u{1f339}', text:'The best of you are those who learn the Quran and teach it.', src:'Hadith', author:'Sahih Bukhari', num:'5027', cat:'hadith' },
  { icon:'\u{1f48e}', text:'Smiling at your brother is an act of charity.',     src:'Hadith', author:'Jami at-Tirmidhi', num:'1956', cat:'hadith' },
  { icon:'\u{1f319}', text:'None of you truly believes until he loves for his brother what he loves for himself.', src:'Hadith', author:'Bukhari & Muslim', num:'13', cat:'hadith' },
  { icon:'\u{1f91d}', text:'The strong man is one who controls himself in anger.', src:'Hadith', author:'Sahih Bukhari', num:'6114', cat:'hadith' },
  { icon:'\u2696',    text:'The best deeds are those done regularly even if few.', src:'Hadith', author:'Sahih Bukhari', num:'6467', cat:'hadith' },
  { icon:'\u{1f33f}', text:'When a person dies, his deeds end except for three: ongoing charity, beneficial knowledge, and a righteous child who prays for him.', src:'Hadith', author:'Sahih Muslim', num:'1631', cat:'hadith' },
  { icon:'\u{1f31f}', text:'Make things easy and do not make them difficult.',   src:'Hadith', author:'Sahih Bukhari', num:'69', cat:'hadith' },
  { icon:'\u{1f932}', text:'Supplication is the essence of worship.',            src:'Hadith', author:'Jami at-Tirmidhi', num:'3370', cat:'hadith' },
  { icon:'\u{1f54a}',  text:'Allah is gentle and loves gentleness in all matters.', src:'Hadith', author:'Sahih Bukhari', num:'6927', cat:'hadith' },
];

var _annIdx = Math.floor(Math.random() * REMINDERS.length);

function renderAnnounceBar() {
  var item   = REMINDERS[_annIdx % REMINDERS.length];
  var iconEl = document.querySelector('#ann .ann-icon');
  var textEl = document.querySelector('#ann .ann-text');
  var srcEl  = document.querySelector('#ann .ann-src');
  /* Use a fixed quill SVG — no emoji */
  if (iconEl) iconEl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M20 8.5c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/><circle cx="11" cy="8" r="2.5" fill="currentColor" stroke="none" opacity=".4"/></svg>';
  if (textEl) textEl.textContent = item.text;
  var aSrc = (item.src === 'Quran')
    ? (item.surah_name + ' ' + item.surah + ':' + item.ayah)
    : (item.author + (item.num ? ' No.' + item.num : ''));
  if (srcEl) srcEl.textContent = aSrc;
}
function annNext() { _annIdx = (_annIdx + 1) % REMINDERS.length; renderAnnounceBar(); }
function annPrev() { _annIdx = (_annIdx - 1 + REMINDERS.length) % REMINDERS.length; renderAnnounceBar(); }
window.annNext = annNext;
window.annPrev = annPrev;
window.renderAnnounceBar = renderAnnounceBar;

function showIslamicNotif() {
  // Don't interrupt active reading or mushaf recitation
  if (G.view === 'reader' || G.view === 'mushaf') return;
  var idx  = Math.floor(Math.random() * REMINDERS.length);
  var item = REMINDERS[idx];
  var notif = document.getElementById('islamic-notif');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'islamic-notif';
    document.body.appendChild(notif);
  }
  var isQ = (item.src === 'Quran');
  var lbl = isQ
    ? (item.surah_name + ' \u00b7 ' + item.surah + ':' + item.ayah)
    : (item.author + (item.num ? ' \u00b7 No.' + item.num : ''));
  var bdg = isQ
    ? '<span class="in-badge in-badge-q">Quran</span>'
    : '<span class="in-badge in-badge-h">Hadith</span>';
  var ar  = (isQ && item.ar)
    ? '<div class="in-arabic" dir="rtl" lang="ar">' + item.ar + '</div>' : '';

  notif.innerHTML =
    '<div class="in-inner">' +
    '<div class="in-icon">' + item.icon + '</div>' +
    '<div class="in-body">' +
      '<div class="in-head">' + bdg + '<span class="in-src">' + lbl + '</span></div>' +
      ar +
      '<div class="in-text">' + item.text + '</div>' +
    '</div>' +
    '<button class="in-close" onclick="document.getElementById(\'islamic-notif\').classList.remove(\'show\')">\xd7</button>' +
    '</div>';

  notif.classList.remove('show');
  requestAnimationFrame(function() {
    requestAnimationFrame(function() { notif.classList.add('show'); });
  });
  setTimeout(function() { notif.classList.remove('show'); }, 9000);
}
window.showIslamicNotif = showIslamicNotif;

var _notifTimer = null;

/* ══════════════════════════════════════════════
   FIX #26 — NOTIFICATION API FOR ADHKAR REMINDERS
   Asks once, schedules via setTimeout based on prayer times
══════════════════════════════════════════════ */
function requestAdhkarNotifications() {
  if (!('Notification' in window)) { showToast('Notifications not supported on this browser'); return; }
  if (Notification.permission === 'granted') {
    showToast(' Notifications already enabled');
    _scheduleAdhkarNotifs();
    return;
  }
  Notification.requestPermission().then(function(perm) {
    if (perm === 'granted') {
      showToast(' Adhkar reminders enabled!');
      ss('qAdhkarNotif','1');
      _scheduleAdhkarNotifs();
    } else {
      showToast('Notifications blocked — enable in browser settings');
    }
  });
}
window.requestAdhkarNotifications = requestAdhkarNotifications;

function _scheduleAdhkarNotifs() {
  /* Show a reminder if it's been at least 20h since last one */
  var lastMs = parseInt(ls('qLastNotifMs')||'0');
  if (Date.now() - lastMs < 20*3600*1000) return;
  setTimeout(function() {
    if (Notification.permission !== 'granted') return;
    new Notification(' Morning Adhkar', {
      body: 'Remember Allah — recite your morning adhkar',
      icon: '/assets/icons/icon.svg',
      tag: 'adhkar-morning',
      silent: false
    });
    ss('qLastNotifMs', Date.now());
  }, 2000);
}

/* Auto-restore notifications on load */
(function() {
  if (ls('qAdhkarNotif') === '1' && Notification.permission === 'granted') {
    _scheduleAdhkarNotifs();
  }
})();

function startIslamicNotifs() {
  if (_notifTimer) return;
  setTimeout(function() {
    showIslamicNotif();
    _notifTimer = setInterval(showIslamicNotif, 4 * 60 * 1000);
  }, 4000);
}
window.startIslamicNotifs = startIslamicNotifs;

/* ═══════════════════════════════════════
   KEYBOARD SHORTCUTS
═══════════════════════════════════════ */
document.addEventListener('keydown', function(e) {
  var tag = document.activeElement && document.activeElement.tagName;
  if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return;
  switch(e.key) {
    case ' ':          e.preventDefault(); if (window.togglePlay) togglePlay(); break;
    case 'ArrowRight': if (G.view==='reader' && window.stepChapter) stepChapter(1);  break;
    case 'ArrowLeft':  if (G.view==='reader' && window.stepChapter) stepChapter(-1); break;
    case 'Backspace':  e.preventDefault(); goBack(); break;
    case 'h': case 'H': navigate('home');   break;
    case 'm': case 'M': navigate('mushaf'); break;
    case 'r': case 'R': randomAyah();       break;
    case 'b': case 'B': if (window.toggleBookmarks) toggleBookmarks(); break;
    case 't': case 'T': if (window.cycleTheme) cycleTheme();  break;
    case ',':           if (window.openSettings) openSettings(); break;
    case '/':           e.preventDefault(); document.getElementById('nav-q')?.focus(); break;
    case 'Escape':
      /* Close top overlay or search dropdown */
      if (!_closeTopOverlay()) {
        if (window.closeSettings)  closeSettings();
        if (window.closeBookmarks) closeBookmarks();
      }
      document.getElementById('nav-sdrop')?.classList.remove('open');
      break;
  }
});

/* ═══════════════════════════════════════
   BOOT — DOMContentLoaded
═══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async function() {

  /* 1. Preferences */
  applyTheme(G.theme);
  setArabicSz(G.arabicSz);
  setArabicFont(G.arabicFont);
  document.body.setAttribute('data-taj', G.tajweed ? 'on' : 'off');
  applyUILang(G.uiLang);
  restoreSidebarState();

  /* 2. Home page shell */
  buildHomePage();

  /* 3. Settings UI */
  syncSettingsUI();
  updateBmDot();
  updateProgressUI();
  updateStreakUI();

  /* 4. Date & greeting */
  var gr = document.getElementById('greeting');
  if (gr) gr.textContent = getGreeting();
  if (window.startDateClock) startDateClock();

  /* 5. Stats & load chapters */
  refreshHomeStats();
  await loadChapters();

  /* 6. Continue card */
  if (G.lastRead) updateContinueCard();

  /* 7. Verse of the Day */
  loadVOD();

  /* 8. Announce bar */
  renderAnnounceBar();

  /* 9. Parse URL — deep link OR restore session from hash */
  var parsed = parseHash(location.hash);
  if (parsed.view !== 'home') {
    // Replace initial state so first back() goes home
    history.replaceState({ view: 'home', params: {} }, '', '#home');
    // Navigate to the target with a real history push
    if (parsed.view === 'reader' && parsed.params.surah) {
      await waitForChapters();
      await jumpToVerse(parsed.params.verseKey || (parsed.params.surah + ':1'));
    } else {
      navigate(parsed.view, { params: parsed.params });
      await restoreStateFromParams(parsed.view, parsed.params);
    }
  } else {
    // Set initial history state for home
    history.replaceState({ view: 'home', params: {} }, '', '#home');
  }

  /* 10. Notifications */
  startIslamicNotifs();

  /* 11. Background caching */
  if ('requestIdleCallback' in window) {
    requestIdleCallback(function() { if (navigator.onLine && window.cacheEssentials) cacheEssentials(); });
  } else {
    setTimeout(function() { if (navigator.onLine && window.cacheEssentials) cacheEssentials(); }, 8000);
  }
});

/* ════════════════════════════════════════════════════════════
   DOUBLE-TAP NAV: tap same nav item twice → scroll to top
════════════════════════════════════════════════════════════ */
(function() {
  var _lastNavTap = { id: null, ts: 0 };
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.mnt[id]');
    if (!btn) return;
    var now = Date.now();
    if (btn.id === _lastNavTap.id && now - _lastNavTap.ts < 400) {
      /* Double-tap detected — scroll active page to top */
      var pg = document.querySelector('.page.active');
      if (pg) pg.scrollTo({ top: 0, behavior: 'smooth' });
      btn.classList.add('dbl-tap-flash');
      setTimeout(function() { btn.classList.remove('dbl-tap-flash'); }, 300);
      if (window.haptic) haptic('medium');
      _lastNavTap.id = null;
    } else {
      _lastNavTap = { id: btn.id, ts: now };
    }
  }, { passive: true });
})();

/* ════════════════════════════════════════════════════════════
   GO TO PLAYING VERSE — click on player track area
════════════════════════════════════════════════════════════ */
function goToPlayingVerse() {
  if (!window.AUDIO) return;
  var key = AUDIO.verseKey;
  var chId = AUDIO.chapterId;
  if (!key && !chId) { showToast('Nothing playing'); return; }
  if (window.haptic) haptic('medium');

  if (key && window.jumpToVerse) {
    jumpToVerse(key);
  } else if (chId && window.openChapter) {
    openChapter(chId);
  }
}
window.goToPlayingVerse = goToPlayingVerse;

/* ════════════════════════════════════════════════════════════
   RECITER AVATAR — update #pl-art with reciter initials + color
════════════════════════════════════════════════════════════ */
var RECITER_COLORS = { 7:'#2d8653', 1:'#1a6b41', 2:'#0e5234', 5:'#1565c0', 3:'#7c3aed', 4:'#b45309', 6:'#0891b2', 13:'#be185d', 9:'#15803d' };

function updateReciterAvatar() {
  var art = document.getElementById('pl-art');
  if (!art || !window.RECITERS || !window.G) return;
  var r = RECITERS.find(function(r){ return r.id === G.reciter; });
  if (!r) return;
  var color = RECITER_COLORS[r.id] || '#2d8653';
  var initials = r.name.split(' ').slice(0,2).map(function(w){ return w[0]; }).join('').toUpperCase();
  art.style.background = color + '22';
  art.style.border = '1.5px solid ' + color + '66';
  art.style.color = color;
  art.textContent = initials;
}
window.updateReciterAvatar = updateReciterAvatar;

/* Hook into reciter change */
(function() {
  var origSS = window.ss;
  if (origSS) {
    window.ss = function(k, v) {
      origSS(k, v);
      if (k === 'qReciter') { G.reciter = +v; updateReciterAvatar(); }
    };
  }
})();

/* ════════════════════════════════════════════════════════════
   READING PROGRESS TRACKER
   Injects a sticky progress bar into #pg-reader
   showing % of current chapter read on this page.
════════════════════════════════════════════════════════════ */
function initReadingProgressBar() {
  var pg = document.getElementById('pg-reader');
  if (!pg || document.getElementById('reading-progress')) return;
  var bar = document.createElement('div');
  bar.className = 'reading-progress-bar';
  bar.id = 'reading-progress';
  bar.innerHTML = '<div class="reading-progress-fill" id="reading-fill"></div>';
  pg.insertBefore(bar, pg.firstChild);
}

function updateReadingProgress() {
  var fill = document.getElementById('reading-fill');
  if (!fill || !window.G?.chapter) return;
  /* Use lastRead verse position vs total verses */
  var total = G.chapter.verses_count || 1;
  var done  = G.lastRead?.verse || 0;
  fill.style.width = Math.min(100, Math.round(done / total * 100)) + '%';
}
window.updateReadingProgress = updateReadingProgress;

/* Call on every lastRead update */
var _origSaveLR = window.saveLastRead;
if (_origSaveLR) {
  window.saveLastRead = function() {
    _origSaveLR();
    updateReadingProgress();
  };
}

/* ════════════════════════════════════════════════════════════
   SLIDE-TO-CLOSE panels (settings, bookmarks)
════════════════════════════════════════════════════════════ */
function initSlideClose(panelId, closeFn) {
  var panel = document.getElementById(panelId);
  if (!panel || panel._slideInited) return;
  panel._slideInited = true;

  /* Add drag handle at top */
  var handle = document.createElement('div');
  handle.className = 'panel-drag-handle';
  panel.insertBefore(handle, panel.firstChild);

  var startY = 0, isDragging = false;

  function onStart(e) {
    startY = (e.touches ? e.touches[0] : e).clientY;
    isDragging = true;
    panel.style.transition = 'none';
  }
  function onMove(e) {
    if (!isDragging) return;
    var dy = (e.touches ? e.touches[0] : e).clientY - startY;
    if (dy > 0) panel.style.transform = 'translateY(' + dy + 'px)';
  }
  function onEnd(e) {
    if (!isDragging) return;
    isDragging = false;
    panel.style.transition = '';
    var dy = (e.changedTouches ? e.changedTouches[0] : e).clientY - startY;
    if (dy > 80) { panel.style.transform = ''; closeFn(); }
    else panel.style.transform = '';
  }

  handle.addEventListener('touchstart', onStart, { passive: true });
  handle.addEventListener('touchmove',  onMove,  { passive: true });
  handle.addEventListener('touchend',   onEnd,   { passive: true });
}

/* Init after panels are built */
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    initSlideClose('settings-panel', function(){ if(window.closeSettings) closeSettings(); });
    initSlideClose('bm-panel',       function(){ if(window.closeBookmarks) closeBookmarks(); });
    updateReciterAvatar();
    initReadingProgressBar();
  }, 800);
});

/* ════════════════════════════════════════════════════════════
   GLOBAL EXCEPTION HANDLER
   Catches unhandled errors and promise rejections,
   logs them silently without crashing the UI.
════════════════════════════════════════════════════════════ */
(function() {
  var _errLog = [];

  function logError(type, msg, source) {
    var entry = { type: type, msg: String(msg).slice(0, 200), ts: Date.now(), source: source || '' };
    _errLog.push(entry);
    if (_errLog.length > 50) _errLog.shift();
    console.warn('[Maktabah]', type, msg);
  }

  window.addEventListener('error', function(e) {
    logError('JS', e.message, e.filename + ':' + e.lineno);
    /* Prevent blank screen on non-critical errors */
    return true;
  });

  window.addEventListener('unhandledrejection', function(e) {
    logError('Promise', e.reason?.message || String(e.reason));
    e.preventDefault(); /* suppress browser console noise */
  });

  /* Expose for diagnostics */
  window.getErrorLog = function() { return _errLog.slice(); };
})();

/* ════════════════════════════════════════════════════════════
   ADHKAR SLIDE DOTS — inject dot indicators after adhkar-list
   and update on scroll
════════════════════════════════════════════════════════════ */
function initAdhkarDots() {
  var list = document.querySelector('.adhkar-list');
  if (!list || list._dotsInited) return;
  list._dotsInited = true;

  var count = list.querySelectorAll('.adhkar-card').length;
  if (count < 2) return;

  var dotsWrap = document.createElement('div');
  dotsWrap.className = 'adhkar-dots';
  for (var i = 0; i < Math.min(count, 12); i++) {
    var d = document.createElement('div');
    d.className = 'adhkar-dot' + (i === 0 ? ' active' : '');
    d.dataset.idx = i;
    (function(idx) {
      d.addEventListener('click', function() {
        var cards = list.querySelectorAll('.adhkar-card');
        if (cards[idx]) cards[idx].scrollIntoView({ behavior:'smooth', block:'nearest', inline:'start' });
      });
    })(i);
    dotsWrap.appendChild(d);
  }
  list.parentNode.insertBefore(dotsWrap, list.nextSibling);

  /* Update active dot on scroll */
  list.addEventListener('scroll', function() {
    var cards = list.querySelectorAll('.adhkar-card');
    var scrollLeft = list.scrollLeft;
    var cardW = cards[0] ? cards[0].offsetWidth + 14 : 1;
    var idx = Math.round(scrollLeft / cardW);
    dotsWrap.querySelectorAll('.adhkar-dot').forEach(function(d, i) {
      d.classList.toggle('active', i === idx);
    });
  }, { passive: true });
}
window.initAdhkarDots = initAdhkarDots;

/* ═══════════════════════════════════════
   DOUBLE-TAP NAV — scroll to top
   On same-view nav tap, scroll pg-{view} to top.
═══════════════════════════════════════ */
(function() {
  var _lastTap  = {};
  var _TAP_GAP  = 320; /* ms */
  document.querySelectorAll('.mnt').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var view = btn.dataset.view;
      if (!view) return;
      var now = Date.now();
      if (G.view === view && (now - (_lastTap[view] || 0)) < _TAP_GAP) {
        /* Double-tap on current view — scroll to top */
        var pg = document.getElementById('pg-' + view);
        if (pg) pg.scrollTo({ top: 0, behavior: 'smooth' });
        btn.classList.add('dbl-tap-flash');
        setTimeout(function() { btn.classList.remove('dbl-tap-flash'); }, 300);
        haptic && haptic('light');
      }
      _lastTap[view] = now;
    });
  });
})();

/* ═══════════════════════════════════════
   SLIDE-TO-CLOSE for settings + bookmarks panel
   Handles touch swipe down > 80px
═══════════════════════════════════════ */
(function() {
  function addSlideClose(elId, closeFn) {
    var el = document.getElementById(elId);
    if (!el || el._slideInited) return;
    el._slideInited = true;
    var sy = 0, dragging = false;
    el.addEventListener('touchstart', function(e) {
      /* Only initiate drag from the handle zone (top 60px) */
      if (e.touches[0].clientY - el.getBoundingClientRect().top < 60) {
        sy = e.touches[0].clientY; dragging = true;
      }
    }, { passive: true });
    el.addEventListener('touchmove', function(e) {
      if (!dragging) return;
      var dy = e.touches[0].clientY - sy;
      if (dy > 0) el.style.transform = 'translateY(' + Math.min(dy, 200) + 'px)';
    }, { passive: true });
    el.addEventListener('touchend', function(e) {
      if (!dragging) return; dragging = false;
      var dy = e.changedTouches[0].clientY - sy;
      if (dy > 80) { el.style.transform = ''; closeFn(); haptic && haptic('medium'); }
      else { el.style.transform = ''; }
    }, { passive: true });
  }
  /* Init after DOM settles */
  setTimeout(function() {
    addSlideClose('settings-panel', function() { if (window.closeSettings) closeSettings(); });
    addSlideClose('bm-panel', function() { if (window.closeBookmarks) closeBookmarks(); });
  }, 1000);
})();

/* ════════════════════════════════════════
   TOOLS HUB PAGE
   Aggregates: Adhkar · Corpus · Madhab · Insights
   AI Chat stays on its own dedicated page.
════════════════════════════════════════ */
var _toolsInited = false;
function initTools() {
  var pg = document.getElementById('pg-tools');
  if (!pg) return;
  if (_toolsInited) return;
  _toolsInited = true;

  pg.innerHTML = `
  <div class="tools-wrap">
    <div class="tools-hdr">
      <h1 class="tools-title">Tools</h1>
      <p class="tools-sub">Islamic study and practice tools</p>
    </div>
    <div class="tools-grid">
      <button class="tool-card" onclick="window.navigate('dhikr')">
        <div class="tool-icon tc-green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="28" height="28"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 3.5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><path d="M12 3v1M12 20v1M3 12H2M22 12h-1M5.6 5.6l-.7-.7M19.1 19.1l-.7-.7M18.4 5.6l.7-.7M4.9 19.1l.7-.7"/></svg>
        </div>
        <div class="tool-body">
          <div class="tool-name">Adhkar</div>
          <div class="tool-desc">Daily remembrances &amp; Tasbih counter</div>
        </div>
        <svg class="tool-arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <button class="tool-card" onclick="window.navigate('corpus')">
        <div class="tool-icon tc-blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="28" height="28"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
        </div>
        <div class="tool-body">
          <div class="tool-name">Corpus</div>
          <div class="tool-desc">Linguistic &amp; grammatical analysis</div>
        </div>
        <svg class="tool-arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <button class="tool-card" onclick="window.navigate('madhab')">
        <div class="tool-icon tc-gold">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="28" height="28"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </div>
        <div class="tool-body">
          <div class="tool-name">Schools of Thought</div>
          <div class="tool-desc">Explore the four Madhabs &amp; find your path</div>
        </div>
        <svg class="tool-arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <button class="tool-card" onclick="window.navigate('analytics')">
        <div class="tool-icon tc-purple">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="28" height="28"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
        </div>
        <div class="tool-body">
          <div class="tool-name">Insights</div>
          <div class="tool-desc">Your reading habits &amp; usage patterns</div>
        </div>
        <svg class="tool-arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  </div>`;
}
window.initTools = initTools;
