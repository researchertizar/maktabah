'use strict';
/**
 * js/settings.js — Settings, Themes, Bookmarks
 * Themes: Light (default), Emerald, Dark HC, Custom
 * Custom theme: switching away clears ALL inline CSS vars — no bleed-through bugs
 */

/* ════════════════════════
   SETTINGS PANEL
════════════════════════ */
function openSettings() {
  document.getElementById('settings-panel')?.classList.add('open');
  document.getElementById('settings-ov')?.classList.add('show');
  syncSettingsUI();
  if (window.pushOverlay) pushOverlay('settings', closeSettings);
  if (window.haptic) haptic('light');
}
function closeSettings() {
  document.getElementById('settings-panel')?.classList.remove('open');
  document.getElementById('settings-ov')?.classList.remove('show');
  if (window.popOverlay) popOverlay('settings');
}
window.openSettings  = openSettings;
window.closeSettings = closeSettings;

function syncSettingsUI() {
  document.querySelectorAll('.th-opt').forEach(function(b) {
    b.classList.toggle('active', b.dataset.theme === G.theme);
  });
  document.querySelectorAll('.sz-btn[data-sz]').forEach(function(b) {
    b.classList.toggle('active', parseInt(b.dataset.sz) === G.arabicSz);
  });
  [['tog-tr','showTrans'],['tog-wbw','showWBW'],['tog-nums','showNums'],
   ['tog-taj','tajweed'],['tog-auto','autoPlay']].forEach(function(pair) {
    var btn = document.getElementById(pair[0]); if (!btn) return;
    btn.classList.toggle('active', !!G[pair[1]]);
    btn.setAttribute('aria-checked', String(!!G[pair[1]]));
  });
  var sp = document.getElementById('sp-trans');   if (sp) sp.value = G.translation;
  var sr = document.getElementById('sp-reciter'); if (sr) sr.value = G.reciter;
  var sl = document.getElementById('sp-lang');    if (sl) sl.value = G.uiLang;
  updatePWABtn();
}
window.syncSettingsUI = syncSettingsUI;

/* ════════════════════════
   THEMES
════════════════════════ */
var _CUSTOM_CSS_VARS = [
  '--bg','--bg2','--bg3','--bg4',
  '--sf','--sf2','--sf3',
  '--em','--em2','--em3','--em-dim','--em-glow',
  '--gd','--gd2','--gd3','--gd-dim',
  '--t1','--t2','--t3','--t4',
  '--red','--red-dim','--green','--blue','--orange',
  '--bd','--bd2','--sh','--sh2','--sh3'
];
var _CUSTOM_LS_KEYS = ['qCBg','qCSf','qCEm','qCEm2','qCGd','qCT1'];

function _clearInlineThemeVars() {
  var r = document.documentElement;
  _CUSTOM_CSS_VARS.forEach(function(v){ r.style.removeProperty(v); });
}

var THEMES = [
  { id:'light',   label:'️ Light'   },
  { id:'dark',    label:' Emerald' },
  { id:'dark-hc', label:'⬛ Dark HC' },
  { id:'custom',  label:' Custom'  },
];
window.THEMES = THEMES;

function applyTheme(theme) {
  _clearInlineThemeVars(); /* Always strip inline vars — prevents custom bleed-through */
  G.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  ss('qTheme', theme);
  document.querySelectorAll('.th-opt').forEach(function(b) {
    b.classList.toggle('active', b.dataset.theme === theme);
  });
  var metaEl = document.getElementById('meta-theme');
  var mColors = { light:'#1a6b41', dark:'#111f17', 'dark-hc':'#000000' };
  if (metaEl) metaEl.content = mColors[theme] || (ls('qCustomBg') || '#0d1a12');
  if (theme === 'custom') _applyCustomColors();
  var th = THEMES.find(function(t){ return t.id === theme; });
  showToast('Theme: ' + (th ? th.label : theme));
  if (window.haptic) haptic('medium');
}
window.applyTheme = applyTheme;

function _applyCustomColors() {
  var r = document.documentElement;
  var pairs = [['qCBg','--bg'],['qCSf','--sf'],['qCEm','--em'],
               ['qCEm2','--em2'],['qCGd','--gd'],['qCT1','--t1']];
  pairs.forEach(function(p){ var v = ls(p[0]); if (v) r.style.setProperty(p[1], v); });
}
window._applyCustomColors = _applyCustomColors;

function cycleTheme() {
  var ids  = THEMES.map(function(t){ return t.id; });
  var next = ids[(ids.indexOf(G.theme) + 1) % ids.length];
  applyTheme(next);
}
window.cycleTheme = cycleTheme;

function openCustomThemeEditor() {
  var existing = document.getElementById('custom-theme-modal');
  if (existing) { existing.remove(); return; }

  var fields = [
    { label:'Background',   key:'qCBg',  cssVar:'--bg',  def:'#0d1a12' },
    { label:'Cards/Surface',key:'qCSf',  cssVar:'--sf',  def:'#182b1f' },
    { label:'Accent',       key:'qCEm',  cssVar:'--em',  def:'#2d8653' },
    { label:'Accent Light', key:'qCEm2', cssVar:'--em2', def:'#38a869' },
    { label:'Gold/Arabic',  key:'qCGd',  cssVar:'--gd',  def:'#c8a04a' },
    { label:'Primary Text', key:'qCT1',  cssVar:'--t1',  def:'#eef4ef' },
  ];

  /* Working copy — start from stored or default */
  var live = {};
  fields.forEach(function(f){ live[f.key] = ls(f.key) || f.def; });

  var overlay = document.createElement('div');
  overlay.id = 'custom-theme-modal';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.82);backdrop-filter:blur(8px)';
  overlay.onclick = function(e){ if (e.target === overlay) _cancelCustomEditor(overlay, fields); };

  var card = document.createElement('div');
  card.style.cssText = 'background:#1a2820;border-radius:18px;width:100%;max-width:400px;overflow:hidden;box-shadow:0 12px 60px rgba(0,0,0,.8)';

  /* Header */
  var hdr = document.createElement('div');
  hdr.style.cssText = 'background:#2d8653;padding:15px 20px;display:flex;align-items:center;justify-content:space-between';
  var hTitle = document.createElement('span');
  hTitle.textContent = ' Custom Theme';
  hTitle.style.cssText = 'color:#fff;font-size:15px;font-weight:700';
  var xBtn = document.createElement('button');
  xBtn.textContent = '';
  xBtn.style.cssText = 'color:rgba(255,255,255,.8);font-size:18px;cursor:pointer;background:none;border:none;padding:4px 8px;line-height:1';
  xBtn.onclick = function(){ _cancelCustomEditor(overlay, fields); };
  hdr.appendChild(hTitle); hdr.appendChild(xBtn); card.appendChild(hdr);

  /* Body */
  var body = document.createElement('div');
  body.style.cssText = 'padding:20px;display:flex;flex-direction:column;gap:11px;background:#1a2820';

  fields.forEach(function(f) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px';
    var lbl = document.createElement('label');
    lbl.textContent = f.label;
    lbl.style.cssText = 'flex:1;font-size:13px;color:#a8c0b0';
    lbl.htmlFor = 'cte-' + f.key;
    var hex = document.createElement('code');
    hex.textContent = live[f.key];
    hex.style.cssText = 'font-size:11px;color:#6a8e78;min-width:58px;font-family:monospace';
    var inp = document.createElement('input');
    inp.type = 'color'; inp.id = 'cte-' + f.key; inp.value = live[f.key];
    inp.style.cssText = 'width:48px;height:32px;border:2px solid rgba(255,255,255,.12);border-radius:8px;cursor:pointer;padding:2px;background:none';
    inp.oninput = function() {
      live[f.key] = inp.value;
      hex.textContent = inp.value;
      document.documentElement.style.setProperty(f.cssVar, inp.value); /* live preview */
    };
    row.appendChild(lbl); row.appendChild(hex); row.appendChild(inp);
    body.appendChild(row);
  });

  /* Apply */
  var applyBtn = document.createElement('button');
  applyBtn.textContent = ' Apply Custom Theme';
  applyBtn.style.cssText = 'margin-top:6px;padding:12px;background:#2d8653;color:#fff;border-radius:10px;font-size:14px;font-weight:700;border:none;cursor:pointer;width:100%';
  applyBtn.onclick = function() {
    fields.forEach(function(f){ ss(f.key, live[f.key]); }); /* commit */
    applyTheme('custom');
    overlay.remove();
  };

  /* Reset to Light */
  var resetBtn = document.createElement('button');
  resetBtn.textContent = '↺ Clear custom — reset to Light';
  resetBtn.style.cssText = 'padding:8px;background:none;color:#6a8e78;font-size:12px;border:1px solid rgba(255,255,255,.1);border-radius:8px;cursor:pointer;width:100%;text-align:center';
  resetBtn.onclick = function() {
    _CUSTOM_LS_KEYS.forEach(function(k){ localStorage.removeItem(k); });
    _clearInlineThemeVars();
    applyTheme('light');
    overlay.remove();
    showToast('Custom theme cleared');
  };

  body.appendChild(applyBtn); body.appendChild(resetBtn);
  card.appendChild(body); overlay.appendChild(card); document.body.appendChild(overlay);

  /* Live preview immediately so user sees effect */
  fields.forEach(function(f){ document.documentElement.style.setProperty(f.cssVar, live[f.key]); });
}
window.openCustomThemeEditor = openCustomThemeEditor;

/* Cancel editor — restore whatever theme was active before */
function _cancelCustomEditor(overlay, fields) {
  overlay.remove();
  /* Re-apply the currently-active theme to undo any live-preview inline vars */
  _clearInlineThemeVars();
  if (G.theme === 'custom') _applyCustomColors();
}

/* ════════════════════════
   FONT & READER
════════════════════════ */
function setArabicSz(px) {
  G.arabicSz = px;
  document.documentElement.style.setProperty('--ar-verse', px + 'px');
  ss('qASz', px);
  /* Update toolbar label */
  var lbl = document.getElementById('rtb-sz-val');
  if (lbl) lbl.textContent = px + 'px';
  /* Update settings modal label */
  var slbl = document.getElementById('rs-ar-sz-val');
  if (slbl) slbl.textContent = px + 'px';
  if (G.chapter && window.loadVerses) loadVerses();
}
window.setArabicSz = setArabicSz;
window.applySz     = setArabicSz;

function setArabicFont(font) {
  const ALLOWED_FONTS = ["'Scheherazade New',serif", "'Noto Naskh Arabic',serif", "'Amiri',serif"];
  if (!ALLOWED_FONTS.includes(font)) return;
  G.arabicFont = font; ss('qAFont', font);
  if (G.chapter && window.loadVerses) loadVerses();
}
window.setArabicFont = setArabicFont;

function sdToggle(btn, key) {
  G[key] = !G[key];
  btn.classList.toggle('active', G[key]);
  btn.setAttribute('aria-checked', String(G[key]));
  var map = { tajweed:'qTajweed', showTrans:'qShowTrans', showWBW:'qShowWBW',
              showNums:'qShowNums', autoPlay:'qAutoPlay' };
  if (map[key]) ss(map[key], G[key] ? '1' : '0');
  if (key === 'tajweed') document.body.setAttribute('data-taj', G[key] ? 'on' : 'off');
  if (['showTrans','showWBW','showNums','tajweed'].includes(key) && G.chapter && window.loadVerses)
    loadVerses();
  if (window.haptic) haptic('light');
}
window.sdToggle = sdToggle;

function setVPP(n) {
  G.vpp = n; ss('qVPP', n);
  if (G.chapter && window.loadVerses) { G.page = 1; loadVerses(); }
  if (window.haptic) haptic('light');
}

function setUILang(lang) { applyUILang(lang); ss('qUILang', lang); }
window.setUILang = setUILang;

/* ════════════════════════
   PWA
════════════════════════ */
function updatePWABtn() {
  var btn = document.getElementById('pwa-install-btn');
  if (!btn) return;
  if (window.matchMedia('(display-mode: standalone)').matches) {
    btn.textContent = ' Already Installed'; btn.disabled = true;
  } else if (window._deferredPrompt) {
    btn.textContent = ' Install App'; btn.disabled = false;
  } else {
    btn.textContent = ' Install (use browser menu)'; btn.disabled = false;
  }
}
window.updatePWABtn = updatePWABtn;

function installPWAFromSettings() {
  if (window._deferredPrompt) pwaInstall();
  else showToast('Use browser menu → "Add to Home Screen"');
}
window.installPWAFromSettings = installPWAFromSettings;

/* ════════════════════════
   BOOKMARKS
════════════════════════ */
function openBookmarks() {
  document.getElementById('bm-panel')?.classList.add('open');
  document.getElementById('bm-ov')?.classList.add('show');
  renderBmPanel();
  if (window.pushOverlay) pushOverlay('bookmarks', closeBookmarks);
  if (window.haptic) haptic('light');
}
function closeBookmarks() {
  document.getElementById('bm-panel')?.classList.remove('open');
  document.getElementById('bm-ov')?.classList.remove('show');
  if (window.popOverlay) popOverlay('bookmarks');
}
function toggleBookmarks() {
  var p = document.getElementById('bm-panel');
  if (!p) return;
  if (p.classList.contains('open')) closeBookmarks(); else openBookmarks();
}
window.openBookmarks = openBookmarks; window.closeBookmarks = closeBookmarks;
window.toggleBookmarks = toggleBookmarks;

function renderBmPanel() {
  var list = document.getElementById('bm-list'); if (!list) return;
  if (!G.bookmarks.length) { list.innerHTML = '<div class="bm-empty">' + t('noBookmarks') + '</div>'; return; }
  var esc = window.he || function(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
  var groups = {};
  G.bookmarks.forEach(function(b) {
    var ch = b.key ? b.key.split(':')[0] : '?';
    if (!groups[ch]) groups[ch] = [];
    groups[ch].push(b);
  });
  var html = '';
  Object.keys(groups).sort(function(a,b){ return +a - +b; }).forEach(function(ch) {
    var chObj = G.chapters && G.chapters.find(function(c){ return String(c.id)===ch; });
    var chName = chObj ? esc(chObj.name_simple) : ('Surah ' + ch);
    html += '<div class="bm-group"><div class="bm-group-hdr">' + chName + ' <span class="bm-group-cnt">' + groups[ch].length + '</span></div>';
    groups[ch].forEach(function(b) {
      var k = esc(b.key||'');
      var raw = b.key||'';
      html += '<div class="bm-item" onclick="window.jumpToVerse(\'' + raw + '\');closeBookmarks()" tabindex="0" role="button">'
        + '<span class="bm-key">' + k + '</span>'
        + '<span class="bm-ar" dir="rtl">' + esc(b.arabic||'') + '</span>'
        + '<span class="bm-date">' + esc(b.date||'') + '</span>'
        + '<button class="bm-del" onclick="event.stopPropagation();delBookmark(\'' + raw + '\')" aria-label="Delete"></button>'
        + '</div>';
    });
    html += '</div>';
  });
  list.innerHTML = html;
}
function delBookmark(key) {
  G.bookmarks = G.bookmarks.filter(function(b){ return b.key !== key; });
  saveBookmarks(); updateBmDot(); renderBmPanel();
}
function updateBmDot() {
  document.getElementById('bm-dot')?.classList.toggle('show', G.bookmarks.length > 0);
}
window.renderBmPanel = renderBmPanel;
window.delBookmark   = delBookmark;
window.updateBmDot   = updateBmDot;


/* ════════════════════════
   FIX #9: DATA EXPORT / IMPORT
════════════════════════ */
function exportUserData() {
  var data = {
    version: 1,
    exported: new Date().toISOString(),
    bookmarks: G.bookmarks || [],
    notes:     G.notes     || {},
    streak:    G.streak    || 0,
    readDays:  G.readDays  || [],
    offlineChapters: G.offlineChapters || [],
  };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url;
  a.download = 'maktabah-backup-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast(' Data exported!');
  if (window.haptic) haptic('success');
}
window.exportUserData = exportUserData;

function importUserData() {
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json,application/json';
  inp.onchange = function(e) {
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var data = JSON.parse(ev.target.result);
        if (!data.version) throw new Error('Invalid backup file');
        if (data.bookmarks) { G.bookmarks = data.bookmarks; saveBookmarks(); updateBmDot(); }
        if (data.notes)     { G.notes = data.notes; sj('qNotes', G.notes); }
        if (data.streak)    { G.streak = data.streak; ss('qStreak', G.streak); }
        if (data.readDays)  { G.readDays = data.readDays; sj('qReadDays', G.readDays); }
        showToast(' Data imported — ' + (data.bookmarks?.length || 0) + ' bookmarks restored');
        if (window.haptic) haptic('success');
        if (window.renderBmPanel) renderBmPanel();
      } catch(err) {
        showToast(' Invalid backup file');
        if (window.haptic) haptic('error');
      }
    };
    reader.readAsText(file);
  };
  inp.click();
}
window.importUserData = importUserData;

function clearAllData() {
  if (!confirm('Clear ALL data? This removes bookmarks, notes, streak, and settings. Cannot be undone.')) return;
  try { localStorage.clear(); } catch(e) {}
  showToast('All data cleared — reloading…');
  setTimeout(() => location.reload(), 1200);
}
window.clearAllData = clearAllData;

/* ── Quick navigation links ── */
function openAnalyticsFromSettings() {
  if (window.closeSettings) closeSettings();
  setTimeout(function() { if (window.navigate) navigate('analytics'); }, 200);
}
function openMadhabFromSettings() {
  if (window.closeSettings) closeSettings();
  setTimeout(function() { if (window.navigate) navigate('madhab'); }, 200);
}
window.openAnalyticsFromSettings = openAnalyticsFromSettings;
window.openMadhabFromSettings    = openMadhabFromSettings;
