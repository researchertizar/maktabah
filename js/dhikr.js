'use strict';
/**
 * js/dhikr.js — Adhkar & Du'a v3
 *
 * Dataset: Complete Authentic Adhkar & Dua — 250 entries, 15 categories
 * Sources: Hisnul Muslim, Sahih Bukhari, Muslim, Abu Dawud, Tirmidhi,
 *          An-Nasai, Ibn Majah, Ahmad — all entries sahih/hasan only.
 *
 * UI: Category grid (boxy) → opens in-page list
 * URL: #dhikr, #dhikr/morning-adhkar, etc.
 * Counter: dedicated Tasbih with presets and custom label
 */

var ADHKAR_DB = null;  /* loaded lazily from dhikr-db.json (Fix #1: saves ~86KB on initial load) */

async function _ensureAdhkarDB() {
  if (ADHKAR_DB) return ADHKAR_DB;
  try {
    const r = await fetch('/js/dhikr-db.json');
    if (!r.ok) throw new Error('status ' + r.status);
    ADHKAR_DB = await r.json();
  } catch(e) {
    console.error('[dhikr-db]', e);
    ADHKAR_DB = [];
  }
  return ADHKAR_DB;
}

/* ════════════════════════
   STATE
════════════════════════ */
var _adhkarInited    = false;
var _activeDhikrCat  = null;   // null = grid view, slug = detail view
var _adhkarCounts    = gj('qAdhkarCounts', {});
var _adhkarFavs      = new Set(gj('qAdhkarFavs', []));
var _showTranslit = ls('qDhikrTranslit') === '1'; // Default: Arabic only

/* Tasbih state */
var _tasbihCount  = parseInt(ls('qTasbihCount')  || '0');
var _tasbihTarget = parseInt(ls('qTasbihTarget') || '33');
var _tasbihLabel  = ls('qTasbihLabel')           || 'SubhanAllah';
var _tasbihLaps   = parseInt(ls('qTasbihLaps')   || '0');

/* ════════════════════════
   INIT & URL ROUTING
════════════════════════ */
async function initDhikr() {
  if (_adhkarInited) return;
  _adhkarInited = true;
  var pg = document.getElementById('pg-dhikr');
  if (!pg) return;
  pg.innerHTML = _buildShell();
  _renderTasbih();

  /* Fix #1: lazy load DB before using it */
  await _ensureAdhkarDB();

  /* Restore from URL */
  var hash  = location.hash.replace(/^#/, '').split('/');
  var slug  = (hash[0] === 'dhikr' && hash[1]) ? hash[1] : null;
  if (slug && ADHKAR_DB.find(function(c){ return c.slug === slug; })) {
    _openCat(slug, false);
  } else {
    _showGrid();
  }
}
window.initDhikr = initDhikr;

/* Navigate to a category — pushes URL */
async function openAdhkarCat(slug) {
  if (!_adhkarInited) { await initDhikr(); }
  else { await _ensureAdhkarDB(); }
  _openCat(slug, true);
  if (window.haptic) haptic('light');
}
window.openAdhkarCat = openAdhkarCat;

/* Go back to the category grid */
function dhikrBack() {
  if (window.replaceURL) replaceURL('dhikr', {});
  _showGrid();
  if (window.haptic) haptic('light');
  /* Scroll adhkar page to top */
  var pg = document.getElementById('pg-dhikr');
  if (pg) pg.scrollTop = 0;
}
window.dhikrBack = dhikrBack;

/* Expose _activeDhikrCat for app.js goBack() — simple getter, safe on re-init */
window.getDhikrCat = function() { return _activeDhikrCat; };

/* Called by app.js restoreStateFromParams */
window.showAdhkarCat = function(slug, btn) {
  if (!_adhkarInited) return;
  _openCat(slug, false);
};

/* ════════════════════════
   TIME-BASED REMINDER BANNER
════════════════════════ */
function _getAdhkarTimeBanner(slug) {
  var hour = new Date().getHours();
  var isMorning = (hour >= 4  && hour < 10);   /* Fajr → before Dhuhr */
  var isEvening = (hour >= 15 && hour < 20);   /* After Asr → Maghrib */
  var isNight   = (hour >= 20 || hour < 4);    /* After Isha → Fajr */

  var msg = '';
  var icon = '';

  if (slug === 'morning-adhkar' && isMorning) {
    msg  = 'Now is the best time for Morning Adhkar — after Fajr until sunrise.';
    icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>';
  } else if (slug === 'evening-adhkar' && isEvening) {
    msg  = 'Now is the best time for Evening Adhkar — between Asr and Maghrib.';
    icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/></svg>';
  } else if (slug === 'adhkar-before-sleep' && isNight) {
    msg  = 'Time for sleep adhkar — recite before sleeping for protection and peace.';
    icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  } else if (slug === 'adhkar-upon-waking' && isMorning) {
    msg  = 'Say these adhkar as soon as you wake — before anything else.';
    icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  }

  if (!msg) return '';
  return '<div class="adhkar-time-banner">'
    + '<span class="adhkar-time-icon">' + icon + '</span>'
    + '<span>' + msg + '</span>'
    + '</div>';
}

/* ════════════════════════
   SHELL HTML
════════════════════════ */
function _buildShell() {
  return '<div class="adhkar-wrap" id="adhkar-wrap">'

    /* ── Page header ── */
    + '<div class="adhkar-page-hdr">'
      + '<div class="adhkar-page-title">'
        + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>'
        + 'Adhkar &amp; Du\'a'
      + '</div>'
      + '<p class="adhkar-page-sub">250 authenticated supplications · Hisnul Muslim &amp; Sunnah</p>'
    + '</div>'

    /* ── Tasbih counter — shown in grid view only ── */
    + '<div id="tasbih-section-wrap">' + _buildTasbihHTML() + '</div>'

    /* ── Grid / Detail — dynamic slot ── */
    + '<div id="adhkar-main"></div>'

  + '</div>';
}

/* ════════════════════════
   GRID VIEW  (category boxes)
════════════════════════ */
async function _showGrid() {
  await _ensureAdhkarDB();
  _activeDhikrCat = null;
  var tw2 = document.getElementById('tasbih-section-wrap');
  if (tw2) tw2.style.display = '';
  var main = document.getElementById('adhkar-main');
  if (!main) return;

  var html = '<div class="adhkar-section-title">Categories</div>'
    + '<div class="adhkar-grid">';

  ADHKAR_DB.forEach(function(c) {
    var doneCount = c.entries.filter(function(e){ return (_adhkarCounts[e.id]||0) >= e.count; }).length;
    var pct = Math.round(doneCount / c.entries.length * 100);
    html += '<button class="adhkar-cat-card" onclick="window.openAdhkarCat(\'' + c.slug + '\')" aria-label="' + c.label + '">'
      + '<div class="acc-icon">' + c.icon + '</div>'
      + '<div class="acc-label">' + c.label.split(' (')[0] + '</div>'
      + '<div class="acc-ar" dir="rtl" lang="ar">' + c.ar + '</div>'
      + '<div class="acc-count">' + c.entries.length + ' adhkar</div>'
      + '<div class="acc-prog"><div class="acc-prog-fill" style="width:' + pct + '%"></div></div>'
    + '</button>';
  });

  html += '</div>';
  main.innerHTML = html;
}

/* ════════════════════════
   DETAIL VIEW  (adhkar list)
════════════════════════ */
function _openCat(slug, pushUrl) {
  var cat = ADHKAR_DB.find(function(c){ return c.slug === slug; });
  if (!cat) { _showGrid(); return; }
  _activeDhikrCat = slug;
  /* Hide tasbih section in detail view for focused reading */
  var tw = document.getElementById('tasbih-section-wrap');
  if (tw) tw.style.display = 'none';
  if (pushUrl && window.pushURL) pushURL('dhikr', { cat: slug });

  var doneCount = cat.entries.filter(function(e){ return (_adhkarCounts[e.id]||0) >= e.count; }).length;
  var catPct    = Math.round(doneCount / cat.entries.length * 100);

  var main = document.getElementById('adhkar-main');
  if (!main) return;

  var he = function(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };

  var cards = cat.entries.map(function(item) {
    var cur  = _adhkarCounts[item.id] || 0;
    var phases = _parsePhases(item.count_notes);
    var activePhase = 0;
    if (phases) {
      var _cum = 0;
      for (var _pi = 0; _pi < phases.length; _pi++) {
        _cum += phases[_pi];
        if (cur < _cum) { activePhase = _pi; break; }
        if (_pi === phases.length - 1) activePhase = _pi;
      }
    }
    var done = cur >= item.count;
    var pct  = Math.min(100, Math.round(cur / item.count * 100));
    var fav  = _adhkarFavs.has(item.id);
    return '<article class="adhkar-card' + (done ? ' done' : '') + '" id="adc-' + item.id + '">'
      + '<div class="adhkar-top">'
        + '<div>'
          + '<h3 class="adhkar-title">' + he(item.title) + '</h3>'
          + (item.grade ? '<div class="adhkar-grade">' + he(item.grade) + '</div>' : '')
        + '</div>'
        + '<button class="adhkar-fav' + (fav ? ' on' : '') + '" onclick="window.toggleAdhkarFav(\'' + item.id + '\')" aria-label="Favourite" title="Favourite">'
          + '<svg viewBox="0 0 24 24" fill="' + (fav ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>'
        + '</button>'
      + '</div>'
      + (item.ar ? '<p class="adhkar-ar" dir="rtl" lang="ar">' + he(String(item.ar)) + '</p>' : '')
      + (item.tr_en ? '<p class="adhkar-translit' + (_showTranslit ? '' : ' adhkar-hidden') + '">' + he(String(item.tr_en)) + '</p>' : '')
      + (item.tr ? '<p class="adhkar-tr' + (_showTranslit ? '' : ' adhkar-hidden') + '">' + he(String(item.tr)) + '</p>' : '')
      + (item.ref ? '<p class="adhkar-ref">' + he(String(item.ref)) + '</p>' : '')
      + (item.count_notes ? '<p class="adhkar-count-note">' + he(String(item.count_notes)) + '</p>' : '')
      + (item.benefit ? (function(b){
          var txt = Array.isArray(b) ? b.join(' ') : String(b);
          return txt.trim() ? '<details class="adhkar-details"><summary></summary><p class="adhkar-benefit">' + he(txt) + '</p></details>' : '';
        })(item.benefit) : '')
      + '<div class="adhkar-footer">'
        + '<button class="adhkar-reset" onclick="window.resetAdhkar(\'' + item.id + '\',' + item.count + ')" title="Reset" aria-label="Reset">'
          + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.09"/></svg>'
        + '</button>'
        + '<div class="adhkar-count">'
          + (phases ? '<span class="adhkar-phase" id="aph-' + item.id + '">Set ' + (activePhase+1) + ' of ' + phases.length + '</span>' : '')
          + '<span class="adhkar-num" id="an-' + item.id + '">' + (phases ? ((cur - phases.slice(0,activePhase).reduce(function(s,n){return s+n;},0)) + ' / ' + phases[activePhase]) : cur) + '</span>'
          + (phases ? '' : '<span class="adhkar-target"> / ' + item.count + '</span>')
        + '</div>'
        + '<button class="adhkar-tap' + (done ? ' done' : '') + '" id="atap-' + item.id + '" onclick="window.tapAdhkar(\'' + item.id + '\',' + item.count + ',\'' + (item.count_notes||'') + '\')">'
          + (done ? '✓ Done' : 'Count' + (item.count > 1 ? ' ×' + item.count : ''))
        + '</button>'
      + '</div>'
      + '<div class="adhkar-bar"><div class="adhkar-fill" id="af-' + item.id + '" style="width:' + pct + '%"></div></div>'
    + '</article>';
  }).join('');

  main.innerHTML = ''
    /* Back + controls row */
    + '<div class="adhkar-detail-hdr">'
      + '<button class="adhkar-back-btn" onclick="window.dhikrBack()" aria-label="Back to categories">'
        + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>'
        + ' Back'
      + '</button>'
      + '<div class="adhkar-detail-title">' + he(cat.label.split(' (')[0]) + '</div>'
      + '<button class="adhkar-translit-btn' + (_showTranslit ? ' on' : '') + '" id="translit-toggle-btn" onclick="window.toggleTranslit()" title="Show/hide translation">'
        + (_showTranslit ? 'Hide TR' : 'Show TR')
      + '</button>'
    + '</div>'
    /* Time-aware reminder banner */
    + _getAdhkarTimeBanner(cat.slug)
    /* Category progress */
    + '<div class="adhkar-progress-row">'
      + '<div class="adhkar-progress-bar"><div class="adhkar-progress-fill" id="adhkar-cat-fill" style="width:' + catPct + '%"></div></div>'
      + '<span class="adhkar-progress-label" id="adhkar-cat-label">' + doneCount + ' / ' + cat.entries.length + ' done</span>'
    + '</div>'
    + (cat.desc ? '<p class="adhkar-cat-desc">' + he(cat.desc) + '</p>' : '')
    /* Reset all */
    + '<div style="text-align:right;margin-bottom:10px">'
      + '<button class="adhkar-reset-all-btn" onclick="window.resetAllAdhkar()">'
        + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.09"/></svg>'
        + ' Reset all'
      + '</button>'
    + '</div>'
    /* Cards */
    + '<div class="adhkar-list">' + cards + '</div>';

  /* Init slider dots after DOM update */
  requestAnimationFrame(function() { if (window.initAdhkarDots) initAdhkarDots(); });
}

/* ════════════════════════
   COUNTER ACTIONS
════════════════════════ */
/* Parse phase splits from count_notes: "33+33+34" → [33,33,34] */
function _parsePhases(countNotes) {
  if (!countNotes) return null;
  var m = String(countNotes).match(/^(\d+[\+\d]*)$/);
  if (!m) return null;
  var parts = m[1].split('+').map(Number).filter(function(n){ return n > 0; });
  return parts.length > 1 ? parts : null;
}

function tapAdhkar(id, target, countNotes) {
  _adhkarCounts[id] = (_adhkarCounts[id] || 0) + 1;
  var count = _adhkarCounts[id];
  sj('qAdhkarCounts', _adhkarCounts);

  var numEl   = document.getElementById('an-'    + id);
  var fillEl  = document.getElementById('af-'    + id);
  var tapEl   = document.getElementById('atap-'  + id);
  var card    = document.getElementById('adc-'   + id);
  var phaseEl = document.getElementById('aph-'   + id);

  var phases = _parsePhases(countNotes);

  if (phases) {
    /* Phase counting: show which group the user is on */
    var cumulative = 0;
    var phaseIdx = 0;
    for (var i = 0; i < phases.length; i++) {
      cumulative += phases[i];
      if (count <= cumulative) { phaseIdx = i; break; }
      if (i === phases.length - 1) phaseIdx = i;
    }
    var phaseTotal = phases[phaseIdx];
    var phaseStart = phases.slice(0, phaseIdx).reduce(function(s,n){ return s+n; }, 0);
    var phaseCount = count - phaseStart;
    if (numEl) numEl.textContent = phaseCount + ' / ' + phaseTotal;
    if (phaseEl) phaseEl.textContent = 'Set ' + (phaseIdx+1) + ' of ' + phases.length;
    if (fillEl) fillEl.style.width = Math.min(100, Math.round(count / target * 100)) + '%';

    /* Phase milestone */
    if (phaseCount === phaseTotal && phaseIdx < phases.length - 1) {
      showToast('Set ' + (phaseIdx+1) + ' complete — continue!');
      haptic && haptic('success');
    }
  } else {
    if (numEl)  numEl.textContent  = count;
    if (fillEl) fillEl.style.width = Math.min(100, Math.round(count / target * 100)) + '%';
  }

  if (count >= target) {
    if (card)  card.classList.add('done');
    if (tapEl) {
      tapEl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg> Done';
      tapEl.classList.add('done');
    }
    showToast('Alhamdulillah! Complete.');
    haptic && haptic('success');
    _updateCatProgress();
  }
  if (navigator.vibrate) navigator.vibrate(18);
  if (window.trackEvent) trackEvent('adhkar', 'tap', id);
}
window.tapAdhkar = tapAdhkar;

function resetAdhkar(id, target) {
  _adhkarCounts[id] = 0;
  sj('qAdhkarCounts', _adhkarCounts);
  var numEl  = document.getElementById('an-'   + id);
  var fillEl = document.getElementById('af-'   + id);
  var tapEl  = document.getElementById('atap-' + id);
  var card   = document.getElementById('adc-'  + id);

  var cat  = _activeDhikrCat && ADHKAR_DB.find(function(c){ return c.slug===_activeDhikrCat; });
  var item = cat && cat.entries.find(function(e){ return e.id===id; });

  var phaseEl = document.getElementById('aph-' + id);
  var phases  = item ? _parsePhases(item.count_notes) : null;
  if (numEl)  numEl.textContent  = phases ? ('0 / ' + phases[0]) : '0';
  if (phaseEl) phaseEl.textContent = phases ? ('Set 1 of ' + phases.length) : '';
  if (fillEl) fillEl.style.width = '0%';
  if (card)   card.classList.remove('done');
  if (tapEl) {
    tapEl.innerHTML = item ? ('Count' + (item.count>1 ? ' ×'+item.count : '')) : 'Count';
    tapEl.classList.remove('done');
  }
  _updateCatProgress();
}
window.resetAdhkar = resetAdhkar;

function resetAllAdhkar() {
  var cat = _activeDhikrCat && ADHKAR_DB.find(function(c){ return c.slug===_activeDhikrCat; });
  if (!cat) return;
  if (!confirm('Reset all ' + cat.entries.length + ' counters for ' + cat.label.split(' (')[0] + '?')) return;
  cat.entries.forEach(function(e){ resetAdhkar(e.id, e.count); });
  showToast('All counters reset');
}
window.resetAllAdhkar = resetAllAdhkar;

function toggleAdhkarFav(id) {
  if (_adhkarFavs.has(id)) _adhkarFavs.delete(id);
  else                     _adhkarFavs.add(id);
  sj('qAdhkarFavs', [..._adhkarFavs]);
  var btn = document.querySelector('#adc-' + id + ' .adhkar-fav');
  if (btn) btn.classList.toggle('on', _adhkarFavs.has(id));
}
window.toggleAdhkarFav = toggleAdhkarFav;

function toggleTranslit() {
  _showTranslit = !_showTranslit;
  ss('qDhikrTranslit', _showTranslit ? '1' : '0');
  if (window.haptic) haptic('light');
  /* Toggle all currently-rendered translit/tr paragraphs without full re-render */
  document.querySelectorAll('.adhkar-translit, .adhkar-tr').forEach(function(el) {
    el.classList.toggle('adhkar-hidden', !_showTranslit);
  });
  var btn = document.getElementById('translit-toggle-btn');
  if (btn) {
    btn.textContent = _showTranslit ? 'Hide TR' : 'Show TR';
    btn.classList.toggle('on', _showTranslit);
  }
}
window.toggleTranslit = toggleTranslit;

function _updateCatProgress() {
  var cat = _activeDhikrCat && ADHKAR_DB.find(function(c){ return c.slug===_activeDhikrCat; });
  if (!cat) return;
  var done = cat.entries.filter(function(e){ return (_adhkarCounts[e.id]||0) >= e.count; }).length;
  var pct  = Math.round(done / cat.entries.length * 100);
  var fill = document.getElementById('adhkar-cat-fill');
  var lbl  = document.getElementById('adhkar-cat-label');
  if (fill) fill.style.width = pct + '%';
  if (lbl)  lbl.textContent  = done + ' / ' + cat.entries.length + ' complete';
}

/* ════════════════════════
   TASBIH COUNTER
════════════════════════ */
function _buildTasbihHTML() {
  return '<section class="tasbih-section" aria-label="Tasbih counter">'
    + '<div class="tasbih-header">'
      + '<div class="tasbih-title-row">'
        + '<span class="tasbih-icon"><span class="material-symbols-outlined">avg_pace</span></span>'
        + '<div>'
          + '<div class="tasbih-heading">Tasbih Counter</div>'
          + '<div class="tasbih-label-display" id="tasbih-label-disp"></div>'
        + '</div>'
      + '</div>'
      + '<button class="tasbih-settings-btn" onclick="window.openTasbihSettings()" aria-label="Counter settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>'
    + '</div>'
    + '<div class="tasbih-body">'
      + '<div class="tasbih-ring-wrap">'
        + '<svg class="tasbih-ring-svg" viewBox="0 0 120 120">'
          + '<circle class="tasbih-ring-bg" cx="60" cy="60" r="50"/>'
          + '<circle class="tasbih-ring-fill" id="tasbih-ring-fill" cx="60" cy="60" r="50"/>'
        + '</svg>'
        + '<button class="tasbih-tap-btn" id="tasbih-tap-btn" onclick="window.tapTasbih()" aria-label="Count">'
          + '<span class="tasbih-count-num" id="tasbih-count-num">0</span>'
          + '<span class="tasbih-count-target" id="tasbih-count-target">/ 33</span>'
        + '</button>'
      + '</div>'
      + '<div class="tasbih-actions">'
        + '<button class="tasbih-reset-btn" onclick="window.resetTasbih()">↺ Reset</button>'
        + '<div class="tasbih-laps" id="tasbih-laps">0 rounds</div>'
      + '</div>'
    + '</div>'
  + '</section>';
}

function _renderTasbih() {
  var numEl   = document.getElementById('tasbih-count-num');
  var tarEl   = document.getElementById('tasbih-count-target');
  var ringEl  = document.getElementById('tasbih-ring-fill');
  var lapsEl  = document.getElementById('tasbih-laps');
  var lblDisp = document.getElementById('tasbih-label-disp');
  var tapBtn  = document.getElementById('tasbih-tap-btn');

  if (numEl)   numEl.textContent   = _tasbihCount;
  if (tarEl)   tarEl.textContent   = '/ ' + _tasbihTarget;
  if (lblDisp) lblDisp.textContent = _tasbihLabel;
  if (lapsEl) {
    lapsEl.textContent = _tasbihLaps === 0 ? '0 rounds'
      : _tasbihLaps === 1 ? '1 round' : _tasbihLaps + ' rounds';
  }
  if (ringEl) {
    var circ = 2 * Math.PI * 50;
    var pct  = Math.min(1, _tasbihCount / _tasbihTarget);
    ringEl.style.strokeDasharray  = circ;
    ringEl.style.strokeDashoffset = circ * (1 - pct);
  }
  if (tapBtn) tapBtn.classList.toggle('tasbih-done', _tasbihCount >= _tasbihTarget);
}

function tapTasbih() {
  _tasbihCount++;
  if (_tasbihCount > _tasbihTarget) {
    _tasbihLaps++;
    _tasbihCount = 1;
    ss('qTasbihLaps', _tasbihLaps);
    showToast('Round ' + _tasbihLaps + ' complete!');
  }
  ss('qTasbihCount', _tasbihCount);
  _renderTasbih();
  if (navigator.vibrate) navigator.vibrate(12);
}
window.tapTasbih = tapTasbih;

function resetTasbih() {
  _tasbihCount = 0; _tasbihLaps = 0;
  ss('qTasbihCount', 0); ss('qTasbihLaps', 0);
  _renderTasbih();
}
window.resetTasbih = resetTasbih;

function openTasbihSettings() {
  var existing = document.getElementById('tasbih-settings-modal');
  if (existing) { existing.remove(); return; }

  var PRESETS = [
    { label:'SubhanAllah',       count:33  },
    { label:'Alhamdulillah',     count:33  },
    { label:'Allahu Akbar',      count:34  },
    { label:'Astaghfirullah',    count:100 },
    { label:'La ilaha illallah', count:100 },
  ];

  var modal = document.createElement('div');
  modal.id  = 'tasbih-settings-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:900;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.7);backdrop-filter:blur(6px)';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

  var card = document.createElement('div');
  card.style.cssText = 'background:var(--sf);border-radius:18px;width:100%;max-width:380px;overflow:hidden;box-shadow:var(--sh3)';

  var hdr = document.createElement('div');
  hdr.style.cssText = 'background:var(--em);padding:14px 18px;display:flex;align-items:center;justify-content:space-between';
  hdr.innerHTML = '<h3 style="color:#fff;font-size:15px;font-weight:700">Counter Settings</h3>';
  var x = document.createElement('button');
  x.textContent = '✕';
  x.style.cssText = 'color:rgba(255,255,255,.8);font-size:18px;cursor:pointer;background:none;border:none;padding:4px 8px';
  x.onclick = function() { modal.remove(); };
  hdr.appendChild(x);
  card.appendChild(hdr);

  var body = document.createElement('div');
  body.style.cssText = 'padding:18px;display:flex;flex-direction:column;gap:10px';

  var pl = document.createElement('div');
  pl.textContent = 'Quick Presets';
  pl.style.cssText = 'font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.08em';
  body.appendChild(pl);

  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px';
  PRESETS.forEach(function(p) {
    var btn = document.createElement('button');
    btn.textContent = p.label + ' ×' + p.count;
    btn.style.cssText = 'padding:9px 10px;background:var(--sf2);border:1px solid var(--bd);border-radius:var(--r-sm);font-size:12px;color:var(--t2);cursor:pointer;text-align:left;transition:all .15s';
    btn.onmouseover = function(){ this.style.borderColor='var(--em)'; this.style.color='var(--t1)'; };
    btn.onmouseout  = function(){ this.style.borderColor='var(--bd)'; this.style.color='var(--t2)'; };
    btn.onclick = function() {
      _tasbihLabel = p.label; _tasbihTarget = p.count;
      _tasbihCount = 0; _tasbihLaps = 0;
      ss('qTasbihLabel', p.label); ss('qTasbihTarget', p.count);
      ss('qTasbihCount', 0);       ss('qTasbihLaps', 0);
      _renderTasbih(); modal.remove();
      showToast('Counter: ' + p.label + ' ×' + p.count);
    };
    grid.appendChild(btn);
  });
  body.appendChild(grid);

  var cl = document.createElement('div');
  cl.textContent = 'Custom';
  cl.style.cssText = 'font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.08em;margin-top:4px';
  body.appendChild(cl);

  var row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px';
  var labelInp = document.createElement('input');
  labelInp.type = 'text'; labelInp.value = _tasbihLabel; labelInp.placeholder = 'Dhikr name';
  labelInp.style.cssText = 'flex:1;padding:8px 10px;background:var(--sf2);border:1px solid var(--bd);border-radius:var(--r-sm);font-size:13px;color:var(--t1);outline:none';
  var targetInp = document.createElement('input');
  targetInp.type='number'; targetInp.value=_tasbihTarget; targetInp.min='1'; targetInp.max='1000';
  targetInp.style.cssText = 'width:60px;padding:8px 10px;background:var(--sf2);border:1px solid var(--bd);border-radius:var(--r-sm);font-size:13px;color:var(--t1);outline:none';
  row.appendChild(labelInp); row.appendChild(targetInp);
  body.appendChild(row);

  var applyBtn = document.createElement('button');
  applyBtn.textContent = 'Apply';
  applyBtn.style.cssText = 'margin-top:4px;padding:11px;background:var(--em);color:#fff;border-radius:var(--r);font-size:14px;font-weight:700;border:none;cursor:pointer;width:100%';
  applyBtn.onclick = function() {
    var lbl = labelInp.value.trim() || 'Dhikr';
    var tgt = Math.max(1, Math.min(1000, parseInt(targetInp.value) || 33));
    _tasbihLabel = lbl; _tasbihTarget = tgt;
    _tasbihCount = 0;   _tasbihLaps   = 0;
    ss('qTasbihLabel', lbl); ss('qTasbihTarget', tgt);
    ss('qTasbihCount', 0);   ss('qTasbihLaps', 0);
    _renderTasbih(); modal.remove();
    showToast('Counter: ' + lbl + ' ×' + tgt);
  };
  body.appendChild(applyBtn);

  card.appendChild(body);
  modal.appendChild(card);
  document.body.appendChild(modal);
}
window.openTasbihSettings = openTasbihSettings;
