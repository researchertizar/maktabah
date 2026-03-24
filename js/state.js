'use strict';
/**
 * js/state.js v8 — Haptic + Sound engine + Global State
 *
 * haptic(type) → vibration (Android) + Web Audio tone (where appropriate)
 * Global fallback listener covers ALL clicks/taps/selects/swipes/long-press.
 * Dedup: explicit haptic() stamps _lastHapticMs; fallback skips if < 60ms ago.
 *
 * Sound policy (v8):
 *   swipe  → vibration ONLY  (no sound — distracting)
 *   dhikr  → vibration ONLY  (silence preferred during dhikr)
 *   back   → vibration ONLY  (double-pulse feels native)
 *   tap    → improved click  (sharper attack, short harmonic body)
 */

/* ── localStorage helpers ── */
const ls  = k     => { try { return localStorage.getItem(k); }              catch { return null; } };
const ss  = (k,v) => { try { localStorage.setItem(k, String(v)); }          catch {} };
const rm  = k     => { try { localStorage.removeItem(k); }                  catch {} };
const gj  = (k,d) => { try { const v = ls(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const sj  = (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); }   catch {} };
window.ls = ls; window.ss = ss; window.rm = rm; window.gj = gj; window.sj = sj;

/* Fix #4: HTML-escape — use on ALL API data injected via innerHTML */
const he = (s) => (s == null ? '' : String(s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;'));
window.he = he;

/* ════════════════════════════════════════
   HAPTIC + SOUND ENGINE
════════════════════════════════════════ */
var _hapticReady  = false;
var _audioCtx     = null;
var _soundEnabled = ls('qSoundFX') !== '0';
var _lastHapticMs = 0;

function _armHaptic() {
  _hapticReady = true;
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
  } catch(e) {}
}
['click','touchstart','keydown','pointerdown'].forEach(function(ev) {
  document.addEventListener(ev, _armHaptic, { once:true, passive:true });
});

/* ── Vibration patterns ──
   back:    double-pulse — distinct "going back" feel
   swipe:   short burst only — no sound
   dhikr:   single medium pulse — focused, silent
   success: 3-pulse — reward feel
   heavy:   long single — confirm feel
*/
var _VIB = {
  tap:     [6],
  light:   [8],
  medium:  [18],
  heavy:   [32],
  success: [8, 24, 8],
  error:   [18, 36, 18],
  select:  [6],
  swipe:   [8, 12, 8],        /* vibration only — no sound */
  dhikr:   [12],              /* vibration only — no sound */
  counter: [5],
  back:    [10, 16, 22],      /* ascending double-pulse — feels like "pop back" */
  long:    [10, 20, 10],
  copy:    [5, 10, 5],
  warning: [15, 25, 15],
};

/* ── Web Audio sounds ── */
function _snd(type) {
  if (!_soundEnabled || !_audioCtx) return;

  /* These types are vibration-only — intentionally silent */
  if (type === 'swipe' || type === 'dhikr' || type === 'back') return;

  try {
    var ctx = _audioCtx, now = ctx.currentTime;
    var M = ctx.createGain(); M.gain.value = 0.14; M.connect(ctx.destination);

    /* ── Helpers ── */
    function sine(f0, f1, dur, vol) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f0, now);
      if (f1) o.frequency.exponentialRampToValueAtTime(f1, now + dur);
      g.gain.setValueAtTime(vol || 0.4, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.004);
      o.connect(g); g.connect(M); o.start(now); o.stop(now + dur + 0.008);
    }

    function bandNoise(f0, f1, dur) {
      var len = Math.floor(ctx.sampleRate * dur);
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d   = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/len, 1.5);
      var src = ctx.createBufferSource();
      var flt = ctx.createBiquadFilter();
      var g   = ctx.createGain();
      src.buffer = buf;
      flt.type = 'bandpass'; flt.Q.value = 0.8;
      flt.frequency.setValueAtTime(f0, now);
      flt.frequency.exponentialRampToValueAtTime(f1, now + dur);
      g.gain.setValueAtTime(0.55, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(flt); flt.connect(g); g.connect(M);
      src.start(now); src.stop(now + dur + 0.01);
    }

    switch (type) {

      /* ── tap: sharp click with a hint of body
         Attack: very fast gain spike then immediate decay.
         Two partials: fundamental + octave at 50% gives it
         physicality without sounding like a pure sine beep. ── */
      case 'tap':
      case 'light': {
        var f    = type === 'tap' ? 980 : 820;
        var dur  = 0.042;
        /* Fundamental */
        var o1 = ctx.createOscillator(), g1 = ctx.createGain();
        o1.type = 'sine'; o1.frequency.value = f;
        g1.gain.setValueAtTime(0, now);
        g1.gain.linearRampToValueAtTime(0.50, now + 0.003);   /* fast attack */
        g1.gain.exponentialRampToValueAtTime(0.001, now + dur);
        o1.connect(g1); g1.connect(M); o1.start(now); o1.stop(now + dur + 0.005);
        /* Octave harmonic at lower gain for body */
        var o2 = ctx.createOscillator(), g2 = ctx.createGain();
        o2.type = 'sine'; o2.frequency.value = f * 2;
        g2.gain.setValueAtTime(0, now);
        g2.gain.linearRampToValueAtTime(0.18, now + 0.002);
        g2.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.6);
        o2.connect(g2); g2.connect(M); o2.start(now); o2.stop(now + dur);
        break;
      }

      /* ── select: crisp upward tick — confirms a choice ── */
      case 'select': {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(900, now);
        o.frequency.linearRampToValueAtTime(1400, now + 0.030);
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.38, now + 0.003);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.048);
        o.connect(g); g.connect(M); o.start(now); o.stop(now + 0.052);
        break;
      }

      /* ── medium: smooth bandpass whoosh (panel open / navigate) ── */
      case 'medium': {
        bandNoise(260, 2600, 0.10);
        break;
      }

      /* ── heavy: sub thud (confirm / destructive action) ── */
      case 'heavy': {
        var ho = ctx.createOscillator(), hg = ctx.createGain();
        ho.type = 'triangle';
        ho.frequency.setValueAtTime(120, now);
        ho.frequency.exponentialRampToValueAtTime(38, now + 0.14);
        hg.gain.setValueAtTime(0, now);
        hg.gain.linearRampToValueAtTime(0.70, now + 0.005);
        hg.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        ho.connect(hg); hg.connect(M); ho.start(now); ho.stop(now + 0.17);
        break;
      }

      /* ── success: clean major-triad bell ── */
      case 'success': {
        [[880, 0], [1108, 0.055], [1320, 0.110]].forEach(function(p) {
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'sine'; o.frequency.value = p[0];
          var t = now + p[1];
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.34, t + 0.010);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
          o.connect(g); g.connect(M); o.start(t); o.stop(t + 0.23);
        });
        break;
      }

      /* ── error: two descending tones — clearly "wrong" ── */
      case 'error': {
        [[380, 0], [260, 0.10]].forEach(function(p) {
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'triangle'; o.frequency.value = p[0];
          var t = now + p[1];
          g.gain.setValueAtTime(0.28, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
          o.connect(g); g.connect(M); o.start(t); o.stop(t + 0.10);
        });
        break;
      }

      /* ── warning: attention double-beep ── */
      case 'warning': {
        [0, 0.105].forEach(function(d) {
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'triangle'; o.frequency.value = 600;
          g.gain.setValueAtTime(0.26, now + d);
          g.gain.exponentialRampToValueAtTime(0.001, now + d + 0.07);
          o.connect(g); g.connect(M); o.start(now + d); o.stop(now + d + 0.075);
        });
        break;
      }

      /* ── counter: ultra-short crisp tick ── */
      case 'counter': {
        var co = ctx.createOscillator(), cg = ctx.createGain();
        co.type = 'sine'; co.frequency.value = 1600;
        cg.gain.setValueAtTime(0, now);
        cg.gain.linearRampToValueAtTime(0.30, now + 0.002);
        cg.gain.exponentialRampToValueAtTime(0.001, now + 0.022);
        co.connect(cg); cg.connect(M); co.start(now); co.stop(now + 0.025);
        break;
      }

      /* ── long: gentle swell hum ── */
      case 'long': {
        var lo = ctx.createOscillator(), lg = ctx.createGain();
        lo.type = 'sine'; lo.frequency.value = 160;
        lg.gain.setValueAtTime(0, now);
        lg.gain.linearRampToValueAtTime(0.28, now + 0.07);
        lg.gain.setValueAtTime(0.28, now + 0.14);
        lg.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        lo.connect(lg); lg.connect(M); lo.start(now); lo.stop(now + 0.26);
        break;
      }

      /* ── copy: double-tick confirms "copied" ── */
      case 'copy': {
        [0, 0.072].forEach(function(d) {
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(1200, now + d);
          o.frequency.exponentialRampToValueAtTime(800, now + d + 0.038);
          g.gain.setValueAtTime(0, now + d);
          g.gain.linearRampToValueAtTime(0.32, now + d + 0.003);
          g.gain.exponentialRampToValueAtTime(0.001, now + d + 0.048);
          o.connect(g); g.connect(M); o.start(now + d); o.stop(now + d + 0.052);
        });
        break;
      }
    }
  } catch(e) {}
}

/* ── Main haptic() ── */
function haptic(type) {
  if (!_hapticReady) return;
  _lastHapticMs = Date.now();
  if (navigator.vibrate) { try { navigator.vibrate(_VIB[type] || _VIB.light); } catch(e) {} }
  _snd(type);
}
window.haptic = haptic;

/* ── Sound FX toggle ── */
function toggleSoundFX() {
  _soundEnabled = !_soundEnabled;
  ss('qSoundFX', _soundEnabled ? '1' : '0');
  var btn = document.getElementById('tog-soundfx');
  if (btn) { btn.classList.toggle('active', _soundEnabled); btn.setAttribute('aria-checked', String(_soundEnabled)); }
  if (_soundEnabled) { haptic('success'); if (window.showToast) showToast('Sound effects on'); }
  else               { haptic('light');   if (window.showToast) showToast('Sound effects off'); }
}
window.toggleSoundFX = toggleSoundFX;

/* ════════════════════════════════════════
   GLOBAL FALLBACK LISTENER
   Fires for any element not already handled by explicit haptic() call.
   Deduped: skips if haptic() was called < 60ms ago.
════════════════════════════════════════ */
document.addEventListener('click', function(e) {
  if (!_hapticReady) return;
  if (Date.now() - _lastHapticMs < 60) return;

  var el = e.target;
  for (var i = 0; i < 4; i++) {
    if (!el || el === document.body || el === document.documentElement) break;
    var tag  = (el.tagName  || '').toLowerCase();
    var role = (el.getAttribute('role') || '').toLowerCase();
    var cls  = (typeof el.className === 'string' ? el.className : '');
    var dh   = el.dataset && el.dataset.haptic;

    /* data-haptic override */
    if (dh) { haptic(dh); return; }

    /* Navigation tabs / bottom nav */
    if (cls.includes('mnt') || cls.includes('sb-link') || cls.includes('ai-tab') ||
        cls.includes('taf-tab') || cls.includes('corpus-tab')) {
      haptic('medium'); return;
    }
    /* Back buttons */
    if (cls.includes('rtb-back') || cls.includes('adhkar-back') || cls.includes('back-btn')) {
      haptic('back'); return;
    }
    /* Bookmark / save / gold CTA */
    if (cls.includes('btn-gold') || cls.includes('bmbtn') || cls.includes('adhkar-fav') ||
        cls.includes('save-btn')) {
      haptic('success'); return;
    }
    /* Dhikr / tasbih counter */
    if (cls.includes('adhkar-tap') || cls.includes('tasbih-tap-btn') || cls.includes('tasbih-ring')) {
      haptic('dhikr'); return;
    }
    /* Toggles / switches */
    if (cls.includes('tog') || cls.includes('pl-opt') || role === 'switch' ||
        (tag === 'input' && (el.type === 'checkbox' || el.type === 'radio'))) {
      haptic('light'); return;
    }
    /* Cards / surah / pop items */
    if (cls.includes('pop-card') || cls.includes('ch-item') || cls.includes('adhkar-cat-card') ||
        cls.includes('vod-btn') || cls.includes('rec-c') || cls.includes('sq-card')) {
      haptic('tap'); return;
    }
    /* Verse action buttons / reader toolbar */
    if (cls.includes('va') || cls.includes('rtb-btn') || cls.includes('pgb')) {
      haptic('tap'); return;
    }
    /* Player controls */
    if (cls.includes('pl-btn') || cls.includes('pl-dismiss')) { haptic('tap'); return; }
    /* Panel / settings openers */
    if (cls.includes('ibtn') || cls.includes('sb-toggle')) { haptic('medium'); return; }
    /* Copy / share */
    if (cls.includes('copy') || cls.includes('share')) { haptic('copy'); return; }
    /* Reset / danger */
    if (cls.includes('reset') || cls.includes('btn-danger')) { haptic('heavy'); return; }
    /* Catch-all: any button / link */
    if (tag === 'button' || tag === 'a' || role === 'button' || role === 'link') {
      haptic('tap'); return;
    }
    el = el.parentElement;
  }
}, { passive:true });

/* select/change → select sound */
document.addEventListener('change', function(e) {
  if (!_hapticReady) return;
  if (Date.now() - _lastHapticMs < 60) return;
  var tag = (e.target && e.target.tagName || '').toLowerCase();
  if (tag === 'select' || tag === 'input') haptic('select');
}, { passive:true });

/* range input → counter tick */
document.addEventListener('input', function(e) {
  if (!_hapticReady) return;
  if (e.target && e.target.type === 'range') haptic('counter');
}, { passive:true });

/* horizontal swipe → vibration only */
(function(){
  var sx=0, sy=0, st=0;
  document.addEventListener('touchstart', function(e){ sx=e.touches[0].clientX; sy=e.touches[0].clientY; st=Date.now(); }, {passive:true});
  document.addEventListener('touchend', function(e){
    if (!_hapticReady) return;
    var dx = e.changedTouches[0].clientX - sx;
    var dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)*1.8 && Date.now()-st < 400) haptic('swipe');
  }, {passive:true});
})();

/* long-press (500ms) → long sound */
(function(){
  var t = null;
  document.addEventListener('pointerdown', function(e){
    if (e.pointerType === 'mouse') return;
    t = setTimeout(function(){ if(_hapticReady) haptic('long'); t=null; }, 500);
  }, {passive:true});
  ['pointerup','pointercancel','pointermove'].forEach(function(ev){
    document.addEventListener(ev, function(){ if(t){clearTimeout(t);t=null;} }, {passive:true});
  });
})();

/* ════════════════════════════════════════
   GLOBAL STATE
════════════════════════════════════════ */
const G = {
  chapters:[],  chapter:null,  page:1,  totalPages:1,
  reciter:      parseInt(ls('qReciter')  ||'7'),
  translation:  parseInt(ls('qTrans')    ||'131'),
  vpp:          parseInt(ls('qVPP')      ||'15'),
  arabicSz:     parseInt(ls('qASz')      ||'34'),
  wbwSz:        parseInt(ls('qWBWSz')    ||'20'),
  arabicFont:   (function(){ const _FONTS=["'Scheherazade New',serif","'Noto Naskh Arabic',serif","'Amiri',serif"]; const _f=ls('qAFont'); return (_FONTS.includes(_f)?_f:"'Scheherazade New',serif"); })(),
  showTrans:    ls('qShowTrans')        !=='0',
  showWBW:      ls('qShowWBW')         ==='1',
  showNums:     ls('qShowNums')        !=='0',
  autoPlay:     ls('qAutoPlay')        ==='1',
  autoNextAyah: ls('qAutoNext')        ==='1',
  tafsirId:     parseInt(ls('qTafId')   ||'169'),
  tajweed:      ls('qTajweed')         ==='1',
  malayalamMode:ls('qMalayalam')       ==='1',
  theme:        ls('qTheme')    ||'light',
  uiLang:       ls('qUILang')  ||'en',
  sortBy:       ls('qSortBy')  ||'surah',
  sortOrder:    ls('qSortOrder')||'asc',
  sideTab:      ls('qSideTab') ||'surah',
  bookmarks:    gj('qBM',   []),
  notes:        gj('qNotes',{}),
  lastRead:     gj('qLR',   null),
  highlights:   gj('qHL',   {}),
  verseKeys:    new Set(gj('qVRSet',[])),
  daysRead:     parseInt(ls('qDR')    ||'0'),
  streak:       parseInt(ls('qStreak')||'0'),
  lastDate:     ls('qLD')             ||'',
  offlineChapters: gj('qOffline',[]),
  aiChatHistory:   gj('qChatHist',[]),
  aiReflHistory:   gj('qRefHist', []),
  view:'home', noteKey:null, tafsirMode:false,
};
window.G = G; window.TOTAL_AYAHS = 6236;

const saveBookmarks  = ()=>sj('qBM',   G.bookmarks);
const saveNotes      = ()=>sj('qNotes',G.notes);
const saveLastRead   = ()=>sj('qLR',   G.lastRead);
const saveHighlights = ()=>sj('qHL',   G.highlights);
window.saveBookmarks=saveBookmarks; window.saveNotes=saveNotes;
window.saveLastRead=saveLastRead;   window.saveHighlights=saveHighlights;

function markVerseRead(key) {
  if (G.verseKeys.has(key)) return;
  G.verseKeys.add(key); sj('qVRSet',[...G.verseKeys]); updateProgressUI();
}
window.markVerseRead = markVerseRead;

function markDay() {
  const today = new Date().toISOString().slice(0,10);
  if (G.lastDate === today) return;
  if (G.lastDate) {
    const gap = Math.round((new Date(today+'T00:00:00Z')-new Date(G.lastDate+'T00:00:00Z'))/86400000);
    if (gap>1) { G.streak=0; ss('qStreak',0); }
  }
  G.lastDate=today; G.daysRead++; G.streak++;
  ss('qLD',today); ss('qDR',G.daysRead); ss('qStreak',G.streak);
  updateProgressUI(); updateStreakUI();
}
window.markDay = markDay;

function updateProgressUI() {
  const pct = Math.min(100,Math.round((G.verseKeys.size/window.TOTAL_AYAHS)*100));
  const q = id=>document.getElementById(id);
  if(q('rp-pf'))  q('rp-pf').style.width  = pct+'%';
  if(q('rp-pct')) q('rp-pct').textContent = pct+'%';
  if(q('rp-vr'))  q('rp-vr').textContent  = G.verseKeys.size.toLocaleString();
  if(q('rp-dr'))  q('rp-dr').textContent  = G.daysRead;
  const sc = document.getElementById('stat-verses');
  if(sc) sc.textContent = G.verseKeys.size.toLocaleString();
}
function updateStreakUI() {
  const sn = document.getElementById('stat-streak');
  if(sn) sn.textContent = G.streak;
}
window.updateProgressUI = updateProgressUI;
window.updateStreakUI   = updateStreakUI;

/* Fix #11: Respect system dark/light mode preference */
(function() {
  var mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  function _applySystemTheme(isDark) {
    /* Only auto-switch if user hasn't manually chosen a theme */
    var saved = ls('qTheme');
    if (saved && saved !== 'auto') return;
    if (window.applyTheme) {
      applyTheme(isDark ? 'dark' : 'light');
      /* Don't persist auto-theme as a choice */
      rm('qTheme');
    }
  }
  if (mq) {
    mq.addEventListener('change', function(e) { _applySystemTheme(e.matches); });
    /* Set initial if no saved preference */
    if (!ls('qTheme')) _applySystemTheme(mq.matches);
  }
})();
