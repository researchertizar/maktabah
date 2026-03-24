'use strict';
/**
 * js/mushaf.js — Mushaf (Traditional Page) Viewer
 * Uthmanic font rendering, 604-page navigation, juz jumps,
 * verse tooltips, night mode, offline caching per page.
 */

const MUSHAF = {
  page:       1,
  totalPages: 604,
  verses:     [],
  loading:    false,
  fontLoaded: false,
  nightMode:  ls('qMNight') === '1',
  fontSize:   parseInt(ls('qMSz') || '28'),
};
window.MUSHAF = MUSHAF;

const JUZ_PAGES = [
  1,22,42,62,82,102,121,142,162,182,
  201,221,241,261,281,301,321,341,361,381,
  401,421,442,462,482,502,522,542,562,582,
];

/* ── Init (lazy, called once) ── */
let _mushafInited = false;

async function initMushaf() {
  if (_mushafInited) return;
  _mushafInited = true;

  const pg = document.getElementById('pg-mushaf');
  if (!pg) return;

  pg.innerHTML = `
  <div class="mc" id="mc-controls">
    <!-- Navigation row -->
    <div class="mc-nav">
      <button class="mc-btn mc-nav-btn" id="mc-prev" onclick="window.mushafStep(-1)" aria-label="Previous page">‹</button>
      <div class="mc-page-inp-wrap">
        <input class="mc-page-inp" id="mc-pg-inp" type="number" min="1" max="604" value="1"
          onchange="mushafGoPage(+this.value)" aria-label="Page number"/>
        <span class="mc-page-of">/ 604</span>
      </div>
      <button class="mc-btn mc-nav-btn" id="mc-next" onclick="window.mushafStep(1)" aria-label="Next page">›</button>
    </div>

    <!-- Options row -->
    <div class="mc-opts">
      <div class="mc-size-grp">
        <span class="mc-lbl">Size:</span>
        <button class="mc-btn mc-sz" onclick="mushafSz(-2)" aria-label="Smaller">A−</button>
        <button class="mc-btn mc-sz" onclick="mushafSz(+2)" aria-label="Larger">A+</button>
      </div>
      <select class="mc-sel" onchange="mushafChangeFont(this.value)" aria-label="Font">
        <option value="uthmani">Uthmanic Hafs</option>
        <option value="amiri">Amiri Quran</option>
        <option value="sch">Scheherazade</option>
      </select>
      <select class="mc-sel" id="mc-reciter-sel" onchange="G.reciter=+this.value;ss('qReciter',this.value);showToast('Reciter: '+this.options[this.selectedIndex].text)" aria-label="Reciter">
        <option value="7">Alafasy</option>
        <option value="1">Abdul Basit (Murattal)</option>
        <option value="2">Abdul Basit (Mujawwad)</option>
        <option value="5">Al-Hussary</option>
        <option value="3">As-Sudais</option>
        <option value="4">Abu Bakr al-Shatri</option>
        <option value="6">Hani ar-Rifai</option>
        <option value="13">Saad al-Ghamdi</option>
        <option value="9">Minshawi</option>
      </select>
      <button class="mc-btn${MUSHAF.nightMode?' on':''}" id="mc-night" onclick="mushafToggleNight()" title="Night mode"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> Night</button>
      <button class="mc-btn" onclick="window.cacheMushafPage()" title="Save for offline">Cache</button>
      <button class="mc-btn" id="mc-fs-btn" onclick="window.mushafToggleFullscreen()" title="Fullscreen">Full</button>
    </div>

    <!-- Juz jump bar -->
    <div class="mc-jmp" aria-label="Jump to Juz">
      <span class="mc-lbl">Juz:</span>
      ${JUZ_PAGES.map((p, i) =>
        `<button class="mc-btn mc-jbtn" onclick="mushafGoPage(${p})" title="Juz ${i+1}">J${i+1}</button>`
      ).join('')}
    </div>
  </div>

  <!-- Page display -->
  <div id="mc-display" class="mc-display${MUSHAF.nightMode?' mc-night':''}">
    <div class="mc-loading">Loading Mushaf…</div>
  </div>

  <!-- Verse tooltip (hidden) -->
  <div id="mc-tip" class="mc-tip" style="display:none"></div>`;

  await loadMushafFont();
  await loadMushafPage(MUSHAF.page);
  /* Sync reciter select to current G.reciter */
  const recSel = document.getElementById('mc-reciter-sel');
  if (recSel) recSel.value = G.reciter;
}
window.initMushaf = initMushaf;

/* ── Load Uthmanic font (CDN, no SRI for simplicity — add hash for production) ── */
async function loadMushafFont() {
  if (MUSHAF.fontLoaded) return;
  // Scheherazade New is already loaded via <link> in index.html
  // Just wait for fonts to be ready, no extra fetch needed
  try {
    await document.fonts.ready;
    MUSHAF.fontLoaded = true;
  } catch (e) {
    MUSHAF.fontLoaded = true; // proceed anyway with fallback
  }
}
window.loadMushafFont = loadMushafFont;

/* ── Load a page ── */
async function loadMushafPage(page, targetEl) {
  if (page < 1 || page > 604 || MUSHAF.loading) return;
  MUSHAF.loading = true;
  MUSHAF.page    = page;
  if (window.updateMushafURL) updateMushafURL(page);

  const display = targetEl || document.getElementById('mc-display');
  if (!display) { MUSHAF.loading = false; return; }
  display.innerHTML = '<div class="mc-loading">Loading…</div>';

  const inp = document.getElementById('mc-pg-inp');
  if (inp) inp.value = page;
  document.getElementById('mc-prev')?.toggleAttribute('disabled', page <= 1);
  document.getElementById('mc-next')?.toggleAttribute('disabled', page >= 604);

  try {
    const d = await apiFetch(`/verses/by_page/${page}?fields=text_uthmani,verse_key&per_page=50&word_fields=code_v2`);
    MUSHAF.verses = d.verses || [];
    if (!MUSHAF.verses.length) {
      display.innerHTML = '<div class="mc-error">Page data unavailable.</div>';
      MUSHAF.loading = false;
      return;
    }
    renderMushafPage(display, MUSHAF.verses, page);
  } catch (e) {
    display.innerHTML = `<div class="mc-error"> Error loading page: ${e.message}</div>`;
  }
  MUSHAF.loading = false;
}
window.loadMushafPage = loadMushafPage;

/* ── Touch/Swipe support for page navigation ── */
function initMushafSwipe() {
  const display = document.getElementById('mc-display');
  if (!display || display._swipeInited) return;
  display._swipeInited = true;

  let startX = 0, startY = 0, startTime = 0;

  display.addEventListener('touchstart', e => {
    startX    = e.touches[0].clientX;
    startY    = e.touches[0].clientY;
    startTime = Date.now();
  }, { passive: true });

  display.addEventListener('touchend', e => {
    const dx   = e.changedTouches[0].clientX - startX;
    const dy   = e.changedTouches[0].clientY - startY;
    const dt   = Date.now() - startTime;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Horizontal swipe: min 60px, faster than 400ms, more horizontal than vertical
    if (dt < 400 && absDx > 60 && absDx > absDy * 1.5) {
      if (dx < 0) {
        // Swipe left → next page (Arabic reading direction: right to left)
        mushafStepAnimated(1);
      } else {
        // Swipe right → previous page
        mushafStepAnimated(-1);
      }
    }
  }, { passive: true });
}
window.initMushafSwipe = initMushafSwipe;

/* ── Animated page turn ── */
function mushafStepAnimated(dir) {
  const display = document.getElementById('mc-display');
  if (!display || MUSHAF.loading) return;
  if (dir > 0 && MUSHAF.page >= 604) return;
  if (dir < 0 && MUSHAF.page <= 1)   return;

  const exitClass  = dir > 0 ? 'mc-exit-left'  : 'mc-exit-right';
  const enterClass = dir > 0 ? 'mc-enter-right' : 'mc-enter-left';

  display.classList.add(exitClass);
  setTimeout(async () => {
    display.classList.remove(exitClass);
    display.classList.add(enterClass);
    await loadMushafPage(MUSHAF.page + dir);
    // Small delay then remove enter class
    setTimeout(() => display.classList.remove(enterClass), 350);
  }, 200);
}
window.mushafStepAnimated = mushafStepAnimated;


/* ── Expose jump helper for sidebar ── */
function openMushafPage(p) {
  MUSHAF.page = p;
  if (_mushafInited) loadMushafPage(p);
}
window.openMushafPage = openMushafPage;

/* ── Render page ── */
function renderMushafPage(el, verses, page) {
  /* BUG-36 fix: escape Arabic text_uthmani from API before injecting into innerHTML.
     Arabic characters are safe but escaping is correct defensive practice. */
  const heAr = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  let html = '';
  let lastSurah = null;

  verses.forEach(v => {
    const [ch, vn] = v.verse_key.split(':').map(Number);
    if (ch !== lastSurah) {
      lastSurah = ch;
      const chObj = G.chapters?.find(c => c.id === ch);
      html += `<span class="mp-surah-name">${heAr(chObj?.name_arabic || '')}</span>`;
      if (chObj?.bismillah_pre && ch !== 1 && ch !== 9) {
        html += `<span class="mp-bism">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</span>`;
      }
    }
    html += `<span class="mp-ayah" id="mp-${v.verse_key}"
      onclick="window.showMushafTip('${v.verse_key}',event)"
      data-key="${v.verse_key}">${heAr(v.text_uthmani)}
      <span class="mp-ayah-end">﴿${toANum(vn)}﴾</span></span> `;
  });

  const fontStack = MUSHAF.fontLoaded ? "'Scheherazade New', var(--font-ar)" : 'var(--font-ar)';
  el.innerHTML = `
    <div class="mp-page" style="font-size:${MUSHAF.fontSize}px !important;font-family:${fontStack}">${html}</div>
    <div class="mp-bottom">
      <button class="mp-nav-btn" onclick="window.mushafStep(-1)" ${page<=1?'disabled':''}>‹ Prev</button>
      <div class="mp-prog-wrap"><div class="mp-prog-fill" style="width:${(page/604*100).toFixed(1)}%"></div></div>
      <span class="mp-page-num">Page ${page} / 604</span>
      <button class="mp-nav-btn" onclick="window.mushafStep(1)"  ${page>=604?'disabled':''}>Next ›</button>
    </div>`;

  // Highlight verse currently playing
  if (AUDIO?.verseKey) {
    document.getElementById('mp-' + AUDIO.verseKey)?.classList.add('active');
  }
  // Init swipe on every render (element may have been re-created)
  requestAnimationFrame(initMushafSwipe);
}

/* ── Navigation ── */
function mushafStep(dir)  { mushafStepAnimated(dir); }
function mushafGoPage(p)  { loadMushafPage(Math.max(1, Math.min(604, Math.round(p)))); }
window.mushafStep   = mushafStep;
window.mushafGoPage = mushafGoPage;

/* ── Font size ── */
function mushafSz(delta) {
  MUSHAF.fontSize = Math.max(18, Math.min(56, MUSHAF.fontSize + delta));
  ss('qMSz', MUSHAF.fontSize);
  /* Apply to .mp-page via inline style (overrides the media-query !important)
     AND update the CSS variable so the media query rule has no effect */
  const page = document.querySelector('.mp-page');
  if (page) {
    page.style.setProperty('font-size', MUSHAF.fontSize + 'px', 'important');
  }
  /* Also update the mc-display data attribute so future renders use the right size */
  const display = document.getElementById('mc-display');
  if (display) display.dataset.fontSize = MUSHAF.fontSize;
  showToast('Font: ' + MUSHAF.fontSize + 'px');
}
window.mushafSz = mushafSz;

/* ── Font family ── */
function mushafChangeFont(font) {
  const map = {
    uthmani: `'Scheherazade New', var(--font-ar)`,
    amiri:   `'Amiri Quran', serif`,
    sch:     `'Scheherazade New', serif`,
  };
  const page = document.querySelector('.mp-page');
  if (page) page.style.fontFamily = map[font] || map.uthmani;
}
window.mushafChangeFont = mushafChangeFont;

/* ── Night mode ── */
function mushafToggleNight() {
  MUSHAF.nightMode = !MUSHAF.nightMode;
  ss('qMNight', MUSHAF.nightMode ? '1' : '0');
  document.getElementById('mc-display')?.classList.toggle('mc-night', MUSHAF.nightMode);
  document.getElementById('mc-night')?.classList.toggle('on', MUSHAF.nightMode);
}
window.mushafToggleNight = mushafToggleNight;

/* ── Fullscreen ── */
function mushafToggleFullscreen() {
  const el  = document.getElementById('pg-mushaf');
  const btn = document.getElementById('mc-fs-btn');
  if (!el) return;

  if (!document.fullscreenElement) {
    el.requestFullscreen?.().then(() => {
      if (btn) btn.textContent = ' Exit';
      document.getElementById('mc-controls')?.style.setProperty('position','fixed');
      document.getElementById('mc-controls')?.style.setProperty('top','0');
      document.getElementById('mc-controls')?.style.setProperty('z-index','1000');
    }).catch(() => {
      // Fallback: CSS-only fullscreen
      el.classList.add('mc-fullscreen');
      if (btn) btn.textContent = ' Exit';
    });
  } else {
    document.exitFullscreen?.().catch(() => {});
    el.classList.remove('mc-fullscreen');
    if (btn) btn.textContent = 'Full';
  }
}
window.mushafToggleFullscreen = mushafToggleFullscreen;

document.addEventListener('fullscreenchange', () => {
  const btn = document.getElementById('mc-fs-btn');
  if (!document.fullscreenElement && btn) btn.textContent = 'Full';
});

/* ── Verse tooltip on click ── */
async function showMushafTip(key, e) {
  e?.stopPropagation();
  const tip = document.getElementById('mc-tip');
  if (!tip) return;

  // Toggle off if same verse
  if (tip.dataset.key === key && tip.style.display !== 'none') {
    tip.style.display = 'none';
    tip.dataset.key   = '';
    return;
  }
  tip.dataset.key   = key;
  tip.style.display = 'block';
  tip.innerHTML     = `
    <button class="mc-tip-close" onclick="document.getElementById('mc-tip').style.display='none'"></button>
    <div class="mc-tip-ar">…</div>
    <div style="color:var(--t3);font-size:12px">Loading ${key}…</div>`;

  try {
    const d  = await apiFetch(`/verses/by_key/${key}?translations=${G.translation}&fields=text_uthmani`);
    const v  = d.verse;
    const heAr = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const tr = (v?.translations?.[0]?.text || '').replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').slice(0, 200);
    const trDisplay = tr + (tr.length >= 200 ? '…' : '');

    /* Build reciter options for the tip — all 9 reciters available */
    const reciterOpts = (window.RECITERS || []).map(r =>
      `<option value="${r.id}"${r.id === G.reciter ? ' selected' : ''}>${r.name} (${r.style})</option>`
    ).join('');

    tip.innerHTML = `
      <button class="mc-tip-close" onclick="document.getElementById('mc-tip').style.display='none'" aria-label="Close"></button>
      <div class="mc-tip-ar" lang="ar" dir="rtl">${heAr(v?.text_uthmani || '')}</div>
      <div class="mc-tip-tr">${heAr(trDisplay)}</div>
      <div class="mc-tip-ref" style="font-size:11px;font-weight:700;color:var(--em2);margin:6px 0 10px">— Quran ${heAr(key)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <button class="va" onclick="window.openVerseInReader('${key}')"> Reader</button>
        <button class="va" id="mc-tip-play-btn" onclick="window._mushafTipPlay('${key}')">▶ Play</button>
        <button class="va" onclick="window.bmToggle('${key}','')"> Save</button>
        <select class="rtb-sel" id="mc-tip-reciter"
          onchange="G.reciter=+this.value;ss('qReciter',this.value)"
          style="font-size:11px;padding:4px 6px;max-width:150px;margin-left:auto">
          ${reciterOpts}
        </select>
      </div>`;
  } catch {
    tip.innerHTML = `<div style="color:var(--t3);font-size:12px">Could not load verse ${key}.</div>`;
  }
}
window.showMushafTip = showMushafTip;

/* Play verse from mushaf tip — uses the reciter currently selected in the tip dropdown */
window._mushafTipPlay = function(key) {
  const sel = document.getElementById('mc-tip-reciter');
  if (sel) { G.reciter = +sel.value; ss('qReciter', sel.value); }
  if (window.playVerse) playVerse(key);
  const btn = document.getElementById('mc-tip-play-btn');
  if (btn) btn.textContent = '▶ Playing…';
};

/* ── Offline cache this page ── */
async function cacheMushafPage() {
  if (!('caches' in window)) { showToast('Caching unavailable'); return; }
  showToast('Caching page…');
  try {
    const c   = await caches.open('maktabah-mushaf-v1');
    const url = `${QURAN_API}/verses/by_page/${MUSHAF.page}?fields=text_uthmani,verse_key&per_page=50&word_fields=code_v2`;
    await c.add(url);
    showToast(` Page ${MUSHAF.page} cached offline`);
  } catch (e) { showToast('Cache failed: ' + e.message); }
}
window.cacheMushafPage = cacheMushafPage;

/* ── Sidebar page jump helper ── */
function jumpToMushafPage(p) {
  openMushafPage(p);
  navigate('mushaf');
}
window.jumpToMushafPage = jumpToMushafPage;

/* ── Open verse in Reader (Mushaf → Reader integration) ── */
function openVerseInReader(key) {
  /* Close the mushaf tip popup immediately */
  const tip = document.getElementById('mc-tip');
  if (tip) { tip.style.display = 'none'; tip.dataset.key = ''; }

  const chId = parseInt(key.split(':')[0]);
  const vn   = parseInt(key.split(':')[1]);

  if (window.openChapter) {
    openChapter(chId).then(() => {
      /* After chapter loads, navigate to the right page then scroll */
      if (G.vpp && Math.ceil(vn / G.vpp) !== G.page) {
        G.page = Math.ceil(vn / G.vpp);
        if (window.loadVerses) loadVerses();
      }
      /* Wait for render then scroll the #pg-reader container */
      setTimeout(() => {
        const el = document.getElementById('vr-' + key);
        const pg = document.getElementById('pg-reader');
        if (el && pg) {
          el.classList.add('hi');
          const pgRect = pg.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          const centre = (elRect.top - pgRect.top) + pg.scrollTop - pg.clientHeight / 2 + elRect.height / 2;
          pg.scrollTo({ top: Math.max(0, centre), behavior: 'smooth' });
          setTimeout(() => el.classList.remove('hi'), 2500);
        }
      }, 500);
    });
  }
}
window.openVerseInReader = openVerseInReader;
