
/* Sanitise verse key — some internal paths may produce extra segments */
function _vk(key) {
  if (!key) return key;
  const parts = String(key).split(':');
  return parts.slice(0,2).join(':');  /* always ch:verse only */
}
'use strict';
/**
 * js/reader.js — Verse Reader
 * Verse rendering, notes, bookmarks, tafsir, WBW, pagination
 * BUG-05 fix: AbortController cancels both fetch and audio on chapter switch
 * BUG-09 fix: always abort before creating new controller
 */

let _abortCtrl = null;

async function openChapter(id) {
  // Delegate to app.js URL-aware navigation
  if (window.openChapterNav) { await openChapterNav(id); return; }
  // Fallback (shouldn't happen)
  const ch = G.chapters.find(c => c.id === id);
  if (!ch) { showToast('Chapters not loaded'); return; }
  G.chapter = ch; G.page = 1;
  navigate('reader');
  buildReaderShell();
  await loadVerses();
  hlSidebar(id);
  G.lastRead = { id:ch.id, name:ch.name_simple, key:`${ch.id}:1`, verse:1, page:1 };
  saveLastRead(); updateContinueCard(); markDay();
}
window.openChapter = openChapter;

/* ── Reader shell HTML ── */
function buildReaderShell() {
  const ch = G.chapter;
  const pg = document.getElementById('pg-reader');
  if (!pg) return;

  pg.innerHTML = `
  <div class="rtb" id="rtb" role="toolbar" aria-label="Reader controls">
    <button class="rtb-back" onclick="window.goBack()" aria-label="${t('back')}">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      ${t('back')}
    </button>
    <div class="rtb-div"></div>
    <div class="rtb-title">${he(ch.name_simple)}</div>
    <div class="rtb-meta">${ch.id} · ${ch.verses_count} ${t('ayahs')}</div>
    <div class="rtb-sp"></div>
    <button class="rtb-btn" onclick="window.playChapterFull()">▶ ${t('listen')}</button>
    <button class="rtb-btn" onclick="window.openSurahInfo()">i ${t('info')}</button>
    <button class="rtb-btn${G.showWBW?' on':''}" id="btn-wbw" onclick="window.toggleOpt('showWBW','btn-wbw')" aria-pressed="${G.showWBW}">${t('wordByWord')}</button>
    <button class="rtb-btn${G.showTrans?' on':''}" id="btn-tr"  onclick="window.toggleOpt('showTrans','btn-tr')" aria-pressed="${G.showTrans}">${t('translation')}</button>
    <button class="rtb-btn${G.tafsirMode?' on':''}" id="btn-taf" onclick="window.toggleTafsirMode()" aria-pressed="${G.tafsirMode}">Tafsir</button>
    <button class="rtb-btn${G.hifzMode?' on':''}" id="btn-hifz" onclick="window.toggleHifzMode()" aria-pressed="${G.hifzMode}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/><path d="M12 8v4"/></svg> Hifz</button>
    <select class="rtb-sel" id="rtb-reciter" onchange="G.reciter=+this.value;ss('qReciter',this.value)" aria-label="${t('reciter')}">
      <option value="7">Alafasy</option>
      <option value="1">Abdul Basit</option>
      <option value="2">Abdul Basit (Mujawwad)</option>
      <option value="5">Al-Hussary</option>
      <option value="3">As-Sudais</option>
      <option value="4">Al-Shatri</option>
      <option value="6">Hani ar-Rifai</option>
      <option value="13">Al-Ghamdi</option>
      <option value="9">Minshawi</option>
    </select>
    <select class="rtb-sel" id="rtb-trans" onchange="G.translation=+this.value;ss('qTrans',this.value);loadVerses()" aria-label="${t('translation')}">
      ${typeof _buildTransOptions === 'function' ? _buildTransOptions() : '<option value="131">Saheeh International</option>'}
    </select>
    <div class="rtb-sz-wrap" title="Arabic font size">
      <button class="rtb-btn rtb-sz-btn" onclick="window.setArabicSz(Math.max(20,G.arabicSz-2));window.haptic&&haptic('light')" aria-label="Decrease font size" title="Smaller">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10" height="10"><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <span style="font-size:9px;margin-left:1px">A</span>
      </button>
      <span id="rtb-sz-val" style="font-size:10px;font-weight:700;color:var(--em2);min-width:26px;text-align:center">${G.arabicSz}px</span>
      <button class="rtb-btn rtb-sz-btn" onclick="window.setArabicSz(Math.min(64,G.arabicSz+2));window.haptic&&haptic('light')" aria-label="Increase font size" title="Larger">
        <span style="font-size:12px;margin-right:1px">A</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10" height="10"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </div>
    <button class="rtb-btn" onclick="window.cacheChapter()" title="Save for offline" aria-label="Cache">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
    </button>
    <button class="rtb-btn" onclick="window.openReaderSettings()" title="Reader settings" aria-label="Settings">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    </button>
  </div>
  <div class="ch-hdr">
    <div class="ch-num">Chapter ${ch.id}</div>
    <div class="ch-ar" lang="ar" dir="rtl">${ch.name_arabic}</div>
    <div class="ch-en">${he(ch.name_simple)}</div>
    <div class="ch-sub">${he(ch.translated_name?.name)}</div>
    <div class="ch-read-time">~${Math.ceil(ch.verses_count * 0.35)} min read</div>
    <div class="ch-badges">
      <span class="ch-b">${ch.revelation_place ? cap(ch.revelation_place) : '—'}</span>
      <span class="ch-b">${ch.verses_count} ${t('ayahs')}</span>
      ${ch.revelation_order ? `<span class="ch-b">Revelation #${ch.revelation_order}</span>` : ''}
    </div>
    <div class="ch-acts">
      <button class="btn-gold" onclick="window.playChapterFull()">▶ ${t('listen')}</button>
      <button class="btn-ghost" onclick="window.bmToggle('${ch.id}:1','')">Bookmark</button>
      <button class="btn-ghost" onclick="window.openSurahInfo()">Info</button>
    </div>
  </div>
  ${ch.bismillah_pre && ch.id !== 9 ? `<div class="reader-bism" lang="ar" dir="rtl">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>` : ''}
  <div id="v-skeleton">${skelRows(4)}</div>
  <div id="v-wrap" role="region" aria-label="Verses" aria-live="polite"></div>
  <div id="pgn"  role="navigation" aria-label="Page navigation"></div>
  <div class="ch-nav" id="ch-nav">
    <button class="ch-navbtn" onclick="window.stepChapter(-1)" ${ch.id<=1?'disabled':''}>${t('prev')}</button>
    <span class="ch-navpos">${ch.id} of 114</span>
    <button class="ch-navbtn" onclick="window.stepChapter(1)"  ${ch.id>=114?'disabled':''}>${t('next')}</button>
  </div>`;

  /* Sync selects after DOM settles — requestAnimationFrame ensures values apply */
  requestAnimationFrame(() => {
    /* Init reading progress bar */
  if (window.initReadingProgressBar) initReadingProgressBar();
  if (window.updateReadingProgress) updateReadingProgress();

  const rr = document.getElementById('rtb-reciter'); if (rr) rr.value = G.reciter;
    const rt = document.getElementById('rtb-trans'); if (rt) { if(window._buildTransOptions) rt.innerHTML=_buildTransOptions(); rt.value=String(G.translation); }
    const bh = document.getElementById('btn-hifz');    if (bh) bh.classList.toggle('on', !!G.hifzMode);
    const bt = document.getElementById('btn-taf');     if (bt) bt.classList.toggle('on', !!G.tafsirMode);
    const bw = document.getElementById('btn-wbw');     if (bw) bw.classList.toggle('on', !!G.showWBW);
    const br = document.getElementById('btn-tr');      if (br) br.classList.toggle('on', !!G.showTrans);
  });
}

function skelRows(n) {
  return `<div style="padding:0 20px">${Array.from({length:n}, () => `
    <div style="padding:20px 0;border-bottom:1px solid var(--bd)">
      <div class="skel" style="height:48px;border-radius:8px;margin-bottom:10px"></div>
      <div class="skel" style="height:14px;width:90%;border-radius:4px;margin-bottom:5px"></div>
      <div class="skel" style="height:14px;width:70%;border-radius:4px"></div>
    </div>`).join('')}</div>`;
}

/* ── Load verses ── */
async function loadVerses() {
  if (!G.chapter) return;
  const wrap = document.getElementById('v-wrap');
  const skel = document.getElementById('v-skeleton');
  const pgn  = document.getElementById('pgn');
  if (!wrap) return;

  /* BUG-09 fix: always abort before creating new controller */
  _abortCtrl?.abort();
  _abortCtrl = new AbortController();
  const { signal } = _abortCtrl;

  if (skel) skel.style.display = 'block';
  wrap.innerHTML = '';
  if (pgn) pgn.innerHTML = '';

  const wbw  = G.showWBW ? '&words=true&word_fields=text_uthmani,transliteration,translation,audio' : '';
  const path = `/verses/by_chapter/${G.chapter.id}?translations=${G.translation}&fields=text_uthmani,text_uthmani_tajweed&per_page=${G.vpp}&page=${G.page}${wbw}`;

  try {
    const d = await apiFetch(path);
    if (signal.aborted) return;

    G.totalPages  = d.pagination.total_pages;
    wrap.innerHTML = d.verses.map((v, i) => renderVerse(v, i)).join('');

    /* Set note contents via textContent (XSS-safe) */
    d.verses.forEach(v => {
      const nd = document.getElementById('note-' + v.verse_key);
      if (nd && G.notes[v.verse_key]) {
        const p = document.createElement('p');
        p.textContent = G.notes[v.verse_key];
        nd.appendChild(p);
        nd.classList.add('open');
      }
    });

    d.verses.forEach(v => markVerseRead(v.verse_key));
    renderPgn();
    // Update lastRead with first verse of current page
    if (G.chapter && d.verses.length) {
      const firstKey = d.verses[0].verse_key;
      const firstVN  = parseInt(firstKey.split(':')[1]);
      G.lastRead = { id: G.chapter.id, name: G.chapter.name_simple, key: firstKey, verse: firstVN, page: G.page };
      saveLastRead();
      updateContinueCard();
    }
    // Set up IntersectionObserver to track last visibly-read verse
    _setupVerseObserver();

  } catch (e) {
    if (signal.aborted) return;
    console.error('loadVerses:', e);
    wrap.innerHTML = `<div style="padding:32px;text-align:center;color:var(--t3)">Failed to load. Check your connection.</div>`;
  } finally {
    if (!signal.aborted && skel) skel.style.display = 'none';
    /* Scroll #pg-reader (not window) to first verse, leaving toolbar room.
       If audio is playing and we have a current verse key on this page,
       scroll to that verse instead so the playing ayah stays centred. */
    const pg = document.getElementById('pg-reader');
    if (!pg) return;

    let targetEl = null;
    if (window.AUDIO?.verseKey && AUDIO.chapterId === G.chapter?.id) {
      targetEl = document.getElementById('vr-' + AUDIO.verseKey);
    }
    if (!targetEl) targetEl = document.querySelector('#v-wrap .verse');

    if (targetEl) {
      /* Use requestAnimationFrame so layout is settled */
      requestAnimationFrame(() => {
        const pgRect = pg.getBoundingClientRect();
        const elRect = targetEl.getBoundingClientRect();
        const centre = (elRect.top - pgRect.top) + pg.scrollTop - pg.clientHeight / 2 + elRect.height / 2;
        pg.scrollTo({ top: Math.max(0, centre - 60), behavior: 'smooth' });
        /* Re-highlight if audio is playing */
        if (window.AUDIO?.verseKey && AUDIO.playing) {
          highlightPlayingVerse(AUDIO.verseKey);
        }
      });
    }
  }
}
window.loadVerses = loadVerses;

/* ── Render one verse ── */
function renderVerse(v, i) {
  const _rawTr = v.translations?.[0]?.text || '';
  // Strip footnote superscript numbers and HTML tags cleanly
  const trans = _rawTr
    .replace(/<sup[^>]*>.*?<\/sup>/gi, '')          // remove <sup>1</sup> footnotes
    .replace(/<sub[^>]*>.*?<\/sub>/gi, '')          // remove subscripts
    .replace(/<[^>]+>/g, '')                         // strip remaining tags
    .replace(/[\u00B2\u00B3\u00B9\u2070-\u2079]+/g, '') // strip unicode superscripts ²³¹
    .replace(/\d+(?=\s|$|[.,])/g, (m, off, s) => {  // strip bare footnote numbers (trailing digits after space)
      const before = s.slice(Math.max(0,off-1), off);
      return /[a-zA-Z\u0600-\u06FF]/.test(before) ? m : '';
    })
    .replace(/\s{2,}/g, ' ')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ')
    .replace(/&[a-z]+;/gi, ' ')
    .trim();
  const isBm   = G.bookmarks.some(b => b.key === v.verse_key);
  const hasNote = !!G.notes[v.verse_key];

  const arabicHtml = G.hifzMode
    ? _renderHifzArabic(v, trans)
    : G.showWBW && v.words?.length
    ? renderWBW(v.words)
    : `<span style="font-size:${G.arabicSz}px;font-family:${G.arabicFont}">${G.tajweed && v.text_uthmani_tajweed ? renderTajweed(v.text_uthmani_tajweed) : v.text_uthmani} <span class="v-ayah-mark" aria-label="Verse ${v.verse_number}">﴿${toANum(v.verse_number)}﴾</span></span>`;

  return `
  <div class="verse fade-in" id="vr-${v.verse_key}" data-key="${v.verse_key}" style="animation-delay:${i*12}ms" onclick="window.markVerseActive('${v.verse_key}')">
    <div class="v-ar-wrap">
      <div class="v-ar" lang="ar" dir="rtl">${arabicHtml}</div>
      ${G.showNums ? `<div class="v-num" aria-label="Verse ${v.verse_number}">${v.verse_number}</div>` : ''}
    </div>
    ${G.showTrans && trans ? `<div class="v-tr">${he(trans)}</div>` : ''}
    <div class="v-acts" role="group" aria-label="Actions">
      <button class="va" onclick="window.playVerse('${v.verse_key}')" title="${t('play')}"><svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11"><polygon points="5,3 19,12 5,21"/></svg> ${t('play')}</button>
      <button class="va${isBm?' on':''}" id="bmbtn-${v.verse_key}" onclick="window.bmToggle('${v.verse_key}','${esc(v.text_uthmani)}')" title="${isBm?t('saved'):t('bookmark')}"><svg viewBox="0 0 24 24" fill="${isBm?'currentColor':'none'}" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg> ${isBm?t('saved'):t('bookmark')}</button>
      <button class="va" onclick="window.copyVerse('${v.verse_key}','${esc(v.text_uthmani)}','${esc(trans)}')" title="${t('copy')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> ${t('copy')}</button>
      <button class="va${hasNote?' on':''}" onclick="window.openNoteModal('${v.verse_key}')" title="${t('note')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> ${t('note')}${hasNote?' •':''}</button>
      <button class="va" onclick="window.shareVerse('${v.verse_key}','${esc(trans)}','${esc(v.text_uthmani)}')" title="${t('share')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> ${t('share')}</button>
      ${trans ? `<button class="va va-tts" onclick="window.speakTranslation('${v.verse_key}','${esc(trans)}')" title="Listen (TTS)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg> Listen</button>` : ''}
      ${G.tafsirMode ? `<button class="va va-taf" onclick="window.loadTafsir('${v.verse_key}')" title="${t('tafsir')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg> ${t('tafsir')}</button>` : ''}
      <button class="va va-ai" onclick="window.verseAIReflect('${v.verse_key}')" title="${t('reflect')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="12" r="10"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> ${t('reflect')}</button>
    </div>
    <div class="v-note" id="note-${v.verse_key}"></div>
    <div class="v-taf"  id="taf-${v.verse_key}"  aria-live="polite"></div>
  </div>`;
}
window.renderVerse = renderVerse;

/* ── Word by word ── */
function renderWBW(words) {
  const filtered = words.filter(w => w.char_type_name !== 'end');
  if (!filtered.length) return '';
  const sz = G.wbwSz || 20;
  return `<div class="v-wbw" dir="rtl" lang="ar">${filtered.map(w => {
    const tr = (w.transliteration?.text || '').slice(0, 20);
    const en = (w.translation?.text     || '').slice(0, 18);
    const _wu = w.audio_url ? (w.audio_url.startsWith('http') ? w.audio_url : AUDIO_CDN + w.audio_url) : '';
    return `<div class="ww${_wu?' ww-play':''}" ${_wu?`onclick="window.playWordAudio('${_wu}')" tabindex="0"`:'tabindex="-1"'}>
      <span class="ww-ar" style="font-size:${sz}px;font-family:${G.arabicFont}">${w.text_uthmani||''}</span>
      ${tr?`<span class="ww-tr">${tr}</span>`:''}
      ${en?`<span class="ww-en">${en}</span>`:''}
    </div>`;
  }).join('')}</div>`;
}
window.renderWBW = renderWBW;

/* ── Tajweed ── */
function renderTajweed(html) {
  if (!html) return '';
  return html
    .replace(/<tajweed class="([^"]+)">([\s\S]*?)<\/tajweed>/g, (_, cls, txt) =>
      `<span class="tj tj-${cls}">${txt}</span>`)
    .replace(/<span class="end">([^<]*)<\/span>/g, '<span class="tj-end">$1</span>');
}
window.renderTajweed = renderTajweed;

/* ── IntersectionObserver: track last visible verse for resume ── */
let _verseObserver = null;

function _setupVerseObserver() {
  if (_verseObserver) { _verseObserver.disconnect(); }
  if (!('IntersectionObserver' in window)) return;

  const wrap = document.getElementById('v-wrap');
  if (!wrap) return;

  _verseObserver = new IntersectionObserver((entries) => {
    // Find the topmost visible verse (highest on screen)
    const visible = entries
      .filter(e => e.isIntersecting && e.intersectionRatio > 0.4)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

    if (!visible.length || !G.chapter) return;

    const el  = visible[0].target;
    const key = el.dataset.key;
    if (!key) return;

    const vn = parseInt(key.split(':')[1]);
    // Only update if we've scrolled past first verse (avoid overwriting on initial load)
    if (vn > 1 || G.page > 1) {
      G.lastRead = { id: G.chapter.id, name: G.chapter.name_simple, key, verse: vn, page: G.page };
      saveLastRead();
      updateContinueCard();
    }

    // Visual: mark current verse being read
    document.querySelectorAll('.verse.reading').forEach(v => v.classList.remove('reading'));
    el.classList.add('reading');
  }, {
    root:       wrap.closest('.page') || null,
    rootMargin: '-20% 0px -50% 0px',   // trigger when verse is in upper half of viewport
    threshold:  [0, 0.4, 1.0]
  });

  wrap.querySelectorAll('.verse').forEach(v => _verseObserver.observe(v));
}
window._setupVerseObserver = _setupVerseObserver;

/* ── Verse click also saves lastRead immediately ── */
function markVerseActive(key) {
  if (!G.chapter || !key) return;
  const vn = parseInt(key.split(':')[1]);
  G.lastRead = { id: G.chapter.id, name: G.chapter.name_simple, key, verse: vn, page: G.page };
  saveLastRead();
  updateContinueCard();
  document.querySelectorAll('.verse.reading').forEach(v => v.classList.remove('reading'));
  document.getElementById('vr-' + key)?.classList.add('reading');
}
window.markVerseActive = markVerseActive;


/* ── Toggle options ── */
function toggleOpt(key, btnId) {
  G[key] = !G[key];
  document.getElementById(btnId)?.classList.toggle('on', G[key]);
  const saves = { showTrans:'qShowTrans', showWBW:'qShowWBW', showNums:'qShowNums' };
  if (saves[key]) ss(saves[key], G[key] ? '1' : '0');
  if (['showTrans','showWBW','showNums'].includes(key) && G.chapter) loadVerses();
}
function toggleTafsirMode() {
  G.tafsirMode = !G.tafsirMode;
  ss('qTafsirMode', G.tafsirMode ? '1' : '0');
  document.getElementById('btn-taf')?.classList.toggle('on', G.tafsirMode);
  /* Surgically add/remove tafsir buttons — NO full page reload */
  document.querySelectorAll('.verse').forEach(verseEl => {
    const key    = verseEl.dataset.key;
    if (!key) return;
    const acts   = verseEl.querySelector('.v-acts');
    if (!acts) return;
    const existing = acts.querySelector('.va-taf');
    if (G.tafsirMode && !existing) {
      const btn = document.createElement('button');
      btn.className = 'va va-taf';
      btn.setAttribute('onclick', `window.loadTafsir('${key}')`);
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg> ${t('tafsir')}`;
      /* Insert before the last AI button */
      const aiBtn = acts.querySelector('.va-ai');
      acts.insertBefore(btn, aiBtn || null);
    } else if (!G.tafsirMode && existing) {
      existing.remove();
    }
  });
  showToast(G.tafsirMode ? 'Tafsir enabled' : 'Tafsir disabled');
  haptic && haptic('light');
}
window.toggleOpt        = toggleOpt;
window.toggleTafsirMode = toggleTafsirMode;

/* ── Sidebar highlight ── */
function hlSidebar(id) {
  document.querySelectorAll('.sli').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('sl-' + id);
  if (el) { el.classList.add('active'); el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
}
window.hlSidebar = hlSidebar;

/* ── Surah info modal ── */
async function openSurahInfo() {
  const ch = G.chapter; if (!ch) return;
  if (window.haptic) haptic('light');
  let modal = document.getElementById('sinfo-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'sinfo-modal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.style.cssText = 'position:fixed;inset:0;z-index:800;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.75);backdrop-filter:blur(6px)';
    modal.onclick = e => { if (e.target === modal) _closeSinfo(); };
    document.body.appendChild(modal);
  }
  const _closeSinfo = () => { modal.remove(); if (window.popOverlay) popOverlay('sinfo'); };
  modal.innerHTML = `
    <div style="background:var(--sf);border-radius:20px;width:100%;max-width:500px;max-height:85vh;overflow-y:auto;box-shadow:var(--sh3)">
      <div style="padding:14px 20px;border-bottom:1px solid var(--bd);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--sf)">
        <h3 style="font-size:15px;font-weight:700">${ch.name_simple}</h3>
        <button onclick="document.getElementById('sinfo-modal').remove();if(window.popOverlay)popOverlay('sinfo')" style="width:28px;height:28px;border-radius:50%;background:var(--sf2);border:1px solid var(--bd);color:var(--t2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px" aria-label="Close"></button>
      </div>
      <div style="padding:20px">
        <div style="font-family:var(--font-ar);font-size:48px;color:var(--gd);text-align:center;direction:rtl;margin-bottom:12px;line-height:1.6">${ch.name_arabic}</div>
        <div id="sinfo-body" style="font-size:14px;color:var(--t2);line-height:1.9"><div style="color:var(--t3)">Loading…</div></div>
      </div>
    </div>`;
  if (window.pushOverlay) pushOverlay('sinfo', _closeSinfo);
  try {
    const d = await apiFetch(`/chapters/${ch.id}/info`);
    const raw = d.chapter_info?.text || d.chapter_info?.short_text || '';
    const clean = raw
      .replace(/<[^>]+>/g, m => {
        const tag = (m.match(/^<\/?([a-z][a-z0-9]*)/i) || [])[1]?.toLowerCase();
        if (!tag) return '';
        if (/^\/?(strong|em|br)$/.test(tag)) return m.replace(/\s+[^>]*/,'');
        if (/^h[1-6]$/.test(tag)) return '<strong style="display:block;margin:12px 0 6px;color:var(--t1)">';
        if (/^\/h[1-6]$/.test(tag)) return '</strong>';
        if (tag === 'p')  return '<p style="margin-bottom:10px">';
        if (tag === '/p') return '</p>';
        return '';
      });
    const el = document.getElementById('sinfo-body');
    if (el) el.innerHTML = clean || '<p>No information available.</p>';
  } catch {
    const el = document.getElementById('sinfo-body');
    if (el) el.textContent = 'Information unavailable.';
  }
}
window.openSurahInfo = openSurahInfo;

/* ── Tafsir ── */
const _cleanTafsir = raw =>
  (raw || '').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]+>/g,'')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ')
    .replace(/\n{3,}/g,'\n\n').trim();

/* ══════════════════════════════════════════════════════════
   TAFSIR CATALOGUE — verified quran.com API IDs
   Primary IDs work with /tafsirs/{id}/by_ayah/{ch}:{verse}
   Per-language ordering: native-lang first, then English fallback.
══════════════════════════════════════════════════════════ */
const TAFSIR_CATALOGUE = [
  /* English */
  { id:169,  label:'Ibn Kathir',          lang:'en', script:'latin'  },
  { id:381,  label:'Maarif-ul-Quran',     lang:'en', script:'latin'  },
  { id:776,  label:'Tafsir al-Saadi',     lang:'en', script:'latin'  },
  /* Arabic */
  { id:91,   label:'ابن كثير (عربي)',     lang:'ar', script:'arabic' },
  { id:93,   label:'الجلالين',            lang:'ar', script:'arabic' },
  { id:90,   label:'الطبري',              lang:'ar', script:'arabic' },
  { id:92,   label:'البغوي',              lang:'ar', script:'arabic' },
  /* Urdu */
  { id:160,  label:'ابن كثير (اردو)',     lang:'ur', script:'arabic' },
  { id:167,  label:'معارف القرآن (اردو)', lang:'ur', script:'arabic' },
  /* Turkish */
  { id:77,   label:'Diyanet İşleri',      lang:'tr', script:'latin'  },
  /* Indonesian */
  { id:33,   label:'Tafsir Kemenag',      lang:'id', script:'latin'  },
  /* Bengali */
  { id:164,  label:'তাফসীর ইবনে কাসীর',  lang:'bn', script:'latin'  },
  /* French */
  { id:136,  label:'Tafsir Ibn Kathir FR',lang:'fr', script:'latin'  },
];

/* Map UI lang → preferred tafsir IDs (ordered: best first) */
const LANG_TAFSIR_PREF = {
  en: [169, 381, 776],
  ar: [91, 93, 90],
  ur: [160, 167],
  tr: [77, 169],
  id: [33, 169],
  bn: [164, 169],
  fr: [136, 169],
  ml: [169],  /* No Malayalam tafsir on API — show EN + external links */
};

/* Languages that have no native tafsir on quran.com API */
const NO_NATIVE_TAFSIR = ['ml'];

function _tafsirLabel(id) {
  const found = TAFSIR_CATALOGUE.find(t => t.id === id);
  return found ? found.label : 'Tafsir';
}

/* Return ordered list of tafsirs to show for current UI language */
function _getContextualTafsirs() {
  const lang  = G.uiLang || 'en';
  const prefs = LANG_TAFSIR_PREF[lang] || LANG_TAFSIR_PREF.en;
  const rest  = TAFSIR_CATALOGUE.filter(t => !prefs.includes(t.id));
  return [
    ...prefs.map(id => TAFSIR_CATALOGUE.find(t => t.id === id)).filter(Boolean),
    ...rest,
  ];
}

/* Smart default tafsir for current language */
function _defaultTafsirId() {
  const lang  = G.uiLang || 'en';
  if (NO_NATIVE_TAFSIR.includes(lang)) return 169;
  return (LANG_TAFSIR_PREF[lang] || [169])[0];
}

/* External tafsir/translation resources per language */
const LANG_EXTERNAL = {
  ml: [
    { label:'Al-Quran Malayalam', url:'https://quranmalayalam.com/surah/{ch}' },
    { label:'Malayalam Tafsir (PDF)', url:'https://islamhouse.com/ml/books' },
    { label:'Quran Malayalam Audio', url:'https://islamicstudies.info/malayalam/quran' },
  ],
  bn: [
    { label:'Al-Quran Bengali', url:'https://quran.com/{ch}?translations=120' },
  ],
  ur: [
    { label:'Tafheem ul Quran', url:'https://islamicstudies.info/urdu/quran' },
  ],
};

/* ── Reader settings modal ── */
function openReaderSettings() {
  if (window.haptic) haptic('light');
  let m = document.getElementById('reader-settings-modal');
  if (!m) {
    m = document.createElement('div');
    m.id = 'reader-settings-modal';
    m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true');
    m.style.cssText = 'position:fixed;inset:0;z-index:900;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.6);backdrop-filter:blur(4px)';
    m.onclick = e => { if(e.target===m) _closeRS(); };
    document.body.appendChild(m);
  }

  const _closeRS = () => { m.style.display='none'; if(window.popOverlay) popOverlay('reader-settings'); };

  m.innerHTML = `
    <div style="background:var(--sf);border-radius:20px 20px 0 0;width:100%;max-width:520px;max-height:88vh;overflow-y:auto;box-shadow:var(--sh3);padding-bottom:env(safe-area-inset-bottom,0px)">
      <div style="position:sticky;top:0;background:var(--sf);padding:14px 18px 0;z-index:1">
        <div style="width:36px;height:4px;background:var(--bd2);border-radius:2px;margin:0 auto 14px"></div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--bd)">
          <h3 style="font-size:16px;font-weight:700;color:var(--t1)">Reader Settings</h3>
          <button onclick="this.closest('#reader-settings-modal').style.display='none';if(window.popOverlay)popOverlay('reader-settings')"
            style="width:28px;height:28px;border-radius:50%;background:var(--sf2);border:1px solid var(--bd);color:var(--t2);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center"></button>
        </div>
      </div>
      <div style="padding:0 18px 20px;display:flex;flex-direction:column;gap:20px">

        <!-- Arabic font size -->
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <label style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">Arabic Size</label>
            <span id="rs-ar-sz-val" style="font-size:13px;font-weight:800;color:var(--em2);min-width:32px;text-align:right">${G.arabicSz}px</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">
            ${[24,28,34,40,48,56].map(sz=>`
            <button onclick="window.setArabicSz(${sz});document.getElementById('rs-ar-sz-val').textContent='${sz}px';this.closest('div').querySelectorAll('button').forEach(b=>b.classList.remove('on'));this.classList.add('on');window.haptic&&haptic('light')"
              class="sz-step-btn${G.arabicSz===sz?' on':''}" style="font-size:11px;padding:7px 2px;text-align:center;background:var(--sf2);border:1.5px solid ${G.arabicSz===sz?'var(--em2)':'var(--bd)'};border-radius:8px;font-weight:700;color:${G.arabicSz===sz?'var(--em2)':'var(--t2)'};cursor:pointer;transition:all .15s">${sz}</button>`).join('')}
          </div>
          <div style="display:flex;gap:8px;margin-top:8px">
            <button onclick="var v=Math.max(20,G.arabicSz-2);window.setArabicSz(v);document.getElementById('rs-ar-sz-val').textContent=v+'px';window.haptic&&haptic('light')"
              style="flex:1;padding:8px;background:var(--sf2);border:1px solid var(--bd);border-radius:8px;font-size:18px;color:var(--t2);cursor:pointer;font-weight:300">−</button>
            <button onclick="var v=Math.min(64,G.arabicSz+2);window.setArabicSz(v);document.getElementById('rs-ar-sz-val').textContent=v+'px';window.haptic&&haptic('light')"
              style="flex:1;padding:8px;background:var(--sf2);border:1px solid var(--bd);border-radius:8px;font-size:18px;color:var(--t2);cursor:pointer;font-weight:300">+</button>
          </div>
        </div>

        <!-- WBW font size -->
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <label style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">Word×Word Size</label>
            <span id="rs-wbw-sz-val" style="font-size:13px;font-weight:800;color:var(--em2);min-width:32px;text-align:right">${G.wbwSz||20}px</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">
            ${[14,16,20,24,28,32].map(sz=>`
            <button onclick="G.wbwSz=${sz};ss('qWBWSz','${sz}');document.getElementById('rs-wbw-sz-val').textContent='${sz}px';this.closest('div').querySelectorAll('button').forEach(b=>b.classList.remove('on'));this.classList.add('on');if(G.showWBW&&G.chapter)loadVerses();window.haptic&&haptic('light')"
              class="sz-step-btn${(G.wbwSz||20)===sz?' on':''}" style="font-size:11px;padding:7px 2px;text-align:center;background:var(--sf2);border:1.5px solid ${(G.wbwSz||20)===sz?'var(--em2)':'var(--bd)'};border-radius:8px;font-weight:700;color:${(G.wbwSz||20)===sz?'var(--em2)':'var(--t2)'};cursor:pointer;transition:all .15s">${sz}</button>`).join('')}
          </div>
          <div style="display:flex;gap:8px;margin-top:8px">
            <button onclick="var v=Math.max(12,G.wbwSz-2);G.wbwSz=v;ss('qWBWSz',v);document.getElementById('rs-wbw-sz-val').textContent=v+'px';if(G.showWBW&&G.chapter)loadVerses();window.haptic&&haptic('light')"
              style="flex:1;padding:8px;background:var(--sf2);border:1px solid var(--bd);border-radius:8px;font-size:18px;color:var(--t2);cursor:pointer;font-weight:300">−</button>
            <button onclick="var v=Math.min(40,G.wbwSz+2);G.wbwSz=v;ss('qWBWSz',v);document.getElementById('rs-wbw-sz-val').textContent=v+'px';if(G.showWBW&&G.chapter)loadVerses();window.haptic&&haptic('light')"
              style="flex:1;padding:8px;background:var(--sf2);border:1px solid var(--bd);border-radius:8px;font-size:18px;color:var(--t2);cursor:pointer;font-weight:300">+</button>
          </div>
        </div>

        <!-- Arabic font -->
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:8px">Arabic Font</label>
          <select onchange="window.setArabicFont(this.value)"
            style="width:100%;background:var(--sf2);border:1px solid var(--bd);border-radius:10px;padding:10px 12px;color:var(--t1);font-size:13px;outline:none">
            <option value="'Scheherazade New',serif" ${G.arabicFont.includes('Scheherazade')?' selected':''}>Scheherazade New</option>
            <option value="'Noto Naskh Arabic',serif" ${G.arabicFont.includes('Noto')?' selected':''}>Noto Naskh Arabic</option>
          </select>
        </div>

        <!-- Translation -->
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:8px">Translation</label>
          <select onchange="G.translation=+this.value;ss('qTrans',this.value);if(window.loadVerses&&G.chapter)loadVerses()"
            style="width:100%;background:var(--sf2);border:1px solid var(--bd);border-radius:10px;padding:10px 12px;color:var(--t1);font-size:13px;outline:none">
            <option value="131" ${G.translation===131?' selected':''}>Saheeh International (EN)</option>
            <option value="20"  ${G.translation===20?' selected':''}>Pickthall (EN)</option>
            <option value="57"  ${G.translation===57?' selected':''}>Transliteration (EN)</option>
            <option value="149" ${G.translation===149?' selected':''}>Dr. Mustafa Khattab (EN)</option>
            <option value="85"  ${G.translation===85?' selected':''}>French — Hamidullah</option>
            <option value="79"  ${G.translation===79?' selected':''}>Turkish — Diyanet</option>
            <option value="54"  ${G.translation===54?' selected':''}>Urdu — Junagarhi</option>
            <option value="45"  ${G.translation===45?' selected':''}>Indonesian</option>
            <option value="95"  ${G.translation===95?' selected':''}>Bengali — Muhiuddin</option>
            <option value="149" ${G.translation===149?' selected':''}>Malayalam — Cheriyamundam</option>
          </select>
        </div>

        <!-- Tafsir -->
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:8px">Tafsir Source</label>
          <select onchange="G.tafsirId=+this.value;ss('qTafId',this.value)"
            style="width:100%;background:var(--sf2);border:1px solid var(--bd);border-radius:10px;padding:10px 12px;color:var(--t1);font-size:13px;outline:none">
            <option value="169" ${(G.tafsirId||169)===169?' selected':''}>Ibn Kathir (English)</option>
            <option value="171" ${G.tafsirId===171?' selected':''}>Al-Jalalayn</option>
            <option value="381" ${G.tafsirId===381?' selected':''}>Maarif-ul-Quran</option>
            <option value="817" ${G.tafsirId===817?' selected':''}>Al-Tabari (English)</option>
          </select>
        </div>

        <!-- Verses per page -->
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:8px">Verses Per Page</label>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
            ${[10,15,20,30].map(n=>`<button onclick="window.setVPP(${n});this.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));this.classList.add('on')"
              class="rtb-btn${G.vpp===n?' on':''}" style="justify-content:center">${n}</button>`).join('')}
          </div>
        </div>

        <!-- Toggles -->
        <div style="display:flex;flex-direction:column;gap:1px;border:1px solid var(--bd);border-radius:12px;overflow:hidden">
          ${[
            ['Verse Numbers',     'showNums',    G.showNums],
            ['Tajweed Colours',   'tajweed',     G.tajweed],
            ['Auto-next Ayah',    'autoNextAyah',G.autoNextAyah],
            ['Auto-play Chapter', 'autoPlay',    G.autoPlay],
            ['Malayalam Mode',    'malayalamMode',G.malayalamMode],
          ].map(([label,key,val],i,arr)=>`
          <label style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--sf2);${i<arr.length-1?'border-bottom:1px solid var(--bd)':''}">
            <span style="font-size:13px;color:var(--t2)">${label}</span>
            <button class="tog${val?' active':''}" id="rst-${key}" onclick="window._rsToggle('${key}')" role="switch" aria-checked="${val}"></button>
          </label>`).join('')}
        </div>

      </div>
    </div>`;

  m.style.display = 'flex';
  if (window.pushOverlay) pushOverlay('reader-settings', _closeRS);
  if (window.haptic) haptic('light');
}
window.openReaderSettings = openReaderSettings;

/* Toggle helper for reader-settings modal */
function _rsToggle(key) {
  const btn = document.getElementById('rst-' + key);
  G[key] = !G[key];
  if (btn) { btn.classList.toggle('active', G[key]); btn.setAttribute('aria-checked', String(G[key])); }
  const saves = {showNums:'qShowNums', tajweed:'qTajweed', autoNextAyah:'qAutoNext', autoPlay:'qAutoPlay', malayalamMode:'qMalayalam'};
  if (saves[key]) ss(saves[key], G[key] ? '1' : '0');
  if (key === 'tajweed') document.body.setAttribute('data-taj', G[key] ? 'on' : 'off');
  if (['showNums','tajweed','malayalamMode'].includes(key) && G.chapter && window.loadVerses) loadVerses();
  if (window.haptic) haptic('light');
}
window._rsToggle = _rsToggle;

let _tafsirDebounceTimer = null;
let _tafsirAbort = null;

async function loadTafsir(rawKey) {
  const key = _vk(rawKey);  /* sanitise: 1:1:1 → 1:1 */
  clearTimeout(_tafsirDebounceTimer);
  if (_tafsirAbort) { _tafsirAbort.abort(); _tafsirAbort = null; }
  await new Promise(resolve => { _tafsirDebounceTimer = setTimeout(resolve, 300); });
  _tafsirAbort = new AbortController();

  const panel = document.getElementById('taf-' + key);
  if (!panel) return;

  /* Auto-select contextual default tafsir if never set */
  if (!G.tafsirId || G.tafsirId === 169) {
    const def = _defaultTafsirId();
    if (def !== G.tafsirId) { G.tafsirId = def; ss('qTafId', String(def)); }
  }

  const tid = G.tafsirId || _defaultTafsirId();

  /* Toggle off if already open with same tafsir */
  if (panel.classList.contains('open') && panel.dataset.tafId === String(tid)) {
    panel.classList.remove('open'); panel.dataset.tafId = ''; return;
  }
  panel.dataset.tafId = String(tid);

  const lang = G.uiLang || 'en';
  const noNative = NO_NATIVE_TAFSIR.includes(lang);
  const contextualTafsirs = _getContextualTafsirs().slice(0, 6);
  const [ch] = key.split(':');

  /* Build tab row */
  const switcherTabs = contextualTafsirs.map(tf =>
    `<button class="taf-tab${tid===tf.id?' active':''}"
      onclick="G.tafsirId=${tf.id};ss('qTafId','${tf.id}');document.getElementById('taf-${key}').dataset.tafId='';window.loadTafsir('${key}')"
      title="${tf.label}" lang="${tf.lang}">${tf.label}</button>`
  ).join('');

  /* External links block */
  const extLinks = LANG_EXTERNAL[lang];
  const externalBlock = extLinks ? `
    <div class="taf-ext-section">
      <div class="taf-ext-label">External ${lang.toUpperCase()} Resources</div>
      <div class="taf-ext-links">
        ${extLinks.map(lk => `<a href="${lk.url.replace('{ch}', ch)}" target="_blank" rel="noopener" class="taf-ext-link">${lk.label}</a>`).join('')}
      </div>
    </div>` : '';

  panel.innerHTML = `
    <div class="taf-hdr">
      <div class="taf-hdr-left">
        <span class="taf-src">${_tafsirLabel(tid)}</span>
        <span class="taf-key">${key}</span>
      </div>
      <button class="taf-close-btn" onclick="document.getElementById('taf-${key}').classList.remove('open');document.getElementById('taf-${key}').dataset.tafId=''" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="taf-tabs" role="tablist">${switcherTabs}</div>
    <div class="taf-body"><div class="taf-loading">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></path></svg>
      Loading tafsir…
    </div></div>`;
  panel.classList.add('open');

  try {
    let d;
    try {
      d = await apiFetch('/tafsirs/' + tid + '/by_ayah/' + key);
    } catch(byAyahErr) {
      /* Some tafsirs (e.g. Jalalayn id:93) only support /by_key on newer API — retry */
      if (String(byAyahErr).includes('404')) {
        d = await apiFetch('/tafsirs/' + tid + '/by_key/' + key);
      } else { throw byAyahErr; }
    }
    /* Handle all response shapes quran.com returns across different tafsir IDs */
    const raw = d?.tafsir?.text
             || d?.data?.text
             || d?.text
             || (d?.tafsirs?.[0]?.text)
             || '';
    const text = _cleanTafsir(raw);

    if (!text || text.length < 5) {
      /* Tafsir returned empty — try fallback chain */
      if (noNative) throw new Error('no_native');
      /* Try English fallback */
      const fbId = 169;
      if (tid !== fbId) {
        G.tafsirId = fbId; ss('qTafId', String(fbId));
        return loadTafsir(key);
      }
      throw new Error('empty_tafsir');
    }

    /* Check if text is Arabic when user expects non-Arabic */
    const isArabic = /[\u0600-\u06FF]/.test(text.slice(0,30));
    const wantsLatin = !['ar','ur'].includes(lang) && TAFSIR_CATALOGUE.find(t=>t.id===tid)?.script === 'arabic';
    const langWarning = wantsLatin && isArabic ? `
      <div class="taf-lang-warn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        This tafsir is in Arabic. Select an English tafsir above for a translation.
      </div>` : '';

    const PREV = 800;
    const more = text.length > PREV;
    const paras = t => t.split('\n').filter(l => l.trim())
      .map(l => `<p class="taf-p">${he(l.trim())}</p>`).join('');

    const bodyId = 'tb-' + key;
    panel.querySelector('.taf-body').innerHTML = `
      ${langWarning}
      <div id="${bodyId}">${paras(more ? text.slice(0, PREV) + '…' : text)}</div>
      ${more ? `<button class="va taf-expand-btn" id="tbtn-${key}"
        onclick="window.expandTafsir('${key}',this)"
        data-full="${encodeURIComponent(text)}" data-expanded="0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><polyline points="6 9 12 15 18 9"/></svg>
        Read more
      </button>` : ''}`;

    /* Acts row */
    const actsEl = panel.querySelector('.taf-acts') || (() => {
      const d = document.createElement('div'); d.className = 'taf-acts';
      panel.appendChild(d); return d;
    })();
    actsEl.innerHTML = `
      <a href="https://quran.com/${key.replace(':','/')}" target="_blank" rel="noopener" class="va">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        quran.com
      </a>
      ${externalBlock ? '<span class="va" onclick="this.nextElementSibling.hidden=!this.nextElementSibling.hidden" style="cursor:pointer">More resources</span>' : ''}`;
    if (externalBlock) {
      const ext = document.createElement('div'); ext.hidden = true;
      ext.innerHTML = externalBlock; actsEl.appendChild(ext);
    }

  } catch(e) {
    let msg = 'Tafsir unavailable for this selection.';
    let sub = '';
    if (e.message === 'no_native') {
      msg = `No ${lang.toUpperCase()} tafsir available on this platform yet.`;
      sub = extLinks
        ? `<div class="taf-ext-section">${extLinks.map(lk=>`<a href="${lk.url.replace('{ch}',ch)}" target="_blank" rel="noopener" class="taf-ext-link">${lk.label}</a>`).join('')}</div>`
        : '<p class="taf-p" style="margin-top:8px">Try switching to an English tafsir above.</p>';
    } else if (String(e).includes('404')) {
      msg = 'This tafsir entry was not found. Try another scholar above.';
    }
    panel.querySelector('.taf-body').innerHTML = `
      <div class="taf-err">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>${msg}</span>
      </div>
      ${sub}`;
  }
}
/* ── Expand truncated tafsir text ── */
function expandTafsir(key, btn) {
  if (!btn) return;
  const bodyId = 'tb-' + key;
  const bodyEl = document.getElementById(bodyId);
  if (!bodyEl) return;
  const expanded = btn.dataset.expanded === '1';
  if (!expanded) {
    const full = decodeURIComponent(btn.dataset.full || '');
    const paras = t => t.split('\n').filter(l => l.trim())
      .map(l => `<p class="taf-p">${he(l.trim())}</p>`).join('');
    bodyEl.innerHTML = paras(full);
    btn.dataset.expanded = '1';
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><polyline points="18 15 12 9 6 15"/></svg> Show less`;
  } else {
    const full = decodeURIComponent(btn.dataset.full || '');
    const PREV = 800;
    const paras = t => t.split('\n').filter(l => l.trim())
      .map(l => `<p class="taf-p">${he(l.trim())}</p>`).join('');
    bodyEl.innerHTML = paras(full.slice(0, PREV) + '…');
    btn.dataset.expanded = '0';
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><polyline points="6 9 12 15 18 9"/></svg> Read more`;
  }
}

window.loadTafsir   = loadTafsir;
window.expandTafsir = expandTafsir;

/* ── Notes (XSS-safe via textContent) ── */
let _noteModal = null;
function openNoteModal(key) {
  G.noteKey = key;
  if (window.haptic) haptic('light');
  if (!_noteModal) {
    _noteModal = document.createElement('div');
    _noteModal.setAttribute('role','dialog');
    _noteModal.setAttribute('aria-modal','true');
    _noteModal.style.cssText = 'position:fixed;inset:0;z-index:900;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.75);backdrop-filter:blur(6px)';
    _noteModal.onclick = e => { if (e.target === _noteModal) closeNoteModal(); };
    document.body.appendChild(_noteModal);
  }
  _noteModal.innerHTML = `
    <div style="background:var(--sf);border-radius:16px;width:100%;max-width:440px;box-shadow:var(--sh3)">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 18px;border-bottom:1px solid var(--bd)">
        <h3 style="font-size:14px;font-weight:700">Note — ${key}</h3>
        <button onclick="closeNoteModal()" style="width:28px;height:28px;border-radius:50%;background:var(--sf2);border:1px solid var(--bd);color:var(--t2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px" aria-label="Close"></button>
      </div>
      <div style="padding:16px">
        <textarea id="note-ta" rows="5" style="width:100%;background:var(--bg2);border:1px solid var(--bd);border-radius:10px;padding:10px 12px;color:var(--t1);font-family:var(--fui);font-size:13.5px;resize:vertical;outline:none" placeholder="Your reflection…" aria-label="Note text"></textarea>
        <div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end">
          <button onclick="closeNoteModal()" class="btn-ghost" style="font-size:13px;padding:7px 14px">Cancel</button>
          <button onclick="saveNote()" class="btn-gold" style="font-size:13px;padding:7px 20px">Save</button>
        </div>
      </div>
    </div>`;
  const ta = document.getElementById('note-ta');
  if (ta) ta.value = G.notes[key] || '';
  _noteModal.style.display = 'flex';
  if (window.pushOverlay) pushOverlay('note', closeNoteModal);
  setTimeout(() => ta?.focus(), 80);
}
function closeNoteModal() {
  if (_noteModal) _noteModal.style.display = 'none';
  if (window.popOverlay) popOverlay('note');
}
function saveNote() {
  const text = (document.getElementById('note-ta')?.value || '').trim();
  if (text) G.notes[G.noteKey] = text;
  else delete G.notes[G.noteKey];
  saveNotes();
  closeNoteModal();
  showToast(text ? ' Note saved' : 'Note removed');
  const nd = document.getElementById('note-' + G.noteKey);
  if (nd) {
    nd.innerHTML = '';
    nd.classList.toggle('open', !!text);
    if (text) { const p = document.createElement('p'); p.textContent = text; nd.appendChild(p); }
  }
}
window.openNoteModal  = openNoteModal;
window.closeNoteModal = closeNoteModal;
window.saveNote       = saveNote;

/* ── Bookmarks ── */
function bmToggle(key, arabic) {
  const idx = G.bookmarks.findIndex(b => b.key === key);
  const btn = document.getElementById('bmbtn-' + key);
  if (idx > -1) {
    G.bookmarks.splice(idx, 1);
    showToast('Bookmark removed');
    if (btn) { btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg> ' + t('bookmark'); btn.classList.remove('on'); }
  } else {
    G.bookmarks.push({ key, arabic: arabic.slice(0,100), date: new Date().toISOString().slice(0,10) }); /* BUG-33 fix: was toLocaleDateString() — locale-sensitive and inconsistent */
    showToast(t('saved'));
    if (btn) { btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg> ' + t('saved'); btn.classList.add('on'); }
  }
  saveBookmarks();
  updateBmDot();
}
window.bmToggle = bmToggle;

/* ── Copy & Share ── */
function copyVerse(key, arabic, trans) {
  const text = `${arabic}\n\n${trans}\n\n— Quran ${key} | Maktabah`;
  (navigator.clipboard?.writeText(text) || Promise.reject())
    .then(() => showToast(' Copied!'))
    .catch(() => { fallbackCopy(text); showToast(' Copied!'); });
}
function fallbackCopy(text) {
  const ta = Object.assign(document.createElement('textarea'), { value: text });
  ta.style.cssText = 'position:fixed;top:-999px';
  document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
}
function shareVerse(key, trans, arabic) {
  /* Fix #10: full formatted text includes Arabic + transliteration + translation + reference */
  const ch = G.chapters?.find(c => c.id === parseInt(key));
  const surahName = ch ? ch.name_simple : ('Surah ' + key.split(':')[0]);
  const formatted = `${arabic}\n\n${trans}\n\n— Quran ${key} | ${surahName}\n Maktabah`;
  if (navigator.share) {
    navigator.share({
      title: `Quran ${key} — ${surahName}`,
      text: formatted,
      url: `https://quran.com/${key.replace(':','/')}`
    }).catch(e => { if (e.name !== 'AbortError') copyVerse(key, arabic, trans); });
  } else {
    /* Fix #10: desktop fallback copies full text not just URL */
    (navigator.clipboard?.writeText(formatted) || Promise.reject())
      .then(() => showToast(' Verse copied!'))
      .catch(() => { fallbackCopy(formatted); showToast(' Verse copied!'); });
  }
}
window.copyVerse    = copyVerse;
window.fallbackCopy = fallbackCopy;
window.shareVerse   = shareVerse;

/* ── Pagination ── */
function renderPgn() {
  const bar = document.getElementById('pgn'); if (!bar) return;
  if (G.totalPages <= 1) { bar.innerHTML = ''; return; }
  const cp = G.page, tp = G.totalPages;
  let s = Math.max(1, cp - 2), e = Math.min(tp, s + 4);
  if (e - s < 4) s = Math.max(1, e - 4);
  let h = `<button class="pgb" ${cp<=1?'disabled':''} onclick="window.goPage(${cp-1})" aria-label="Prev">‹</button>`;
  if (s > 1) { h += `<button class="pgb" onclick="window.goPage(1)">1</button>`; if (s > 2) h += `<span class="pgb-ellip">…</span>`; }
  for (let p = s; p <= e; p++) h += `<button class="pgb${p===cp?' on':''}" onclick="window.goPage(${p})" ${p===cp?'aria-current="page"':''}>${p}</button>`;
  if (e < tp) { if (e < tp-1) h += `<span class="pgb-ellip">…</span>`; h += `<button class="pgb" onclick="window.goPage(${tp})">${tp}</button>`; }
  h += `<button class="pgb" ${cp>=tp?'disabled':''} onclick="window.goPage(${cp+1})" aria-label="Next">›</button>`;
  bar.innerHTML = `<div class="pgn">${h}</div>`;
}
async function goPage(p) {
  G.page = p;
  await loadVerses();
  if (window.updateReaderURL) updateReaderURL();
}
window.goPage    = goPage;
window.renderPgn = renderPgn;

/* ── Chapter navigation ── */
function stepChapter(dir) {
  if (!G.chapter) return;
  const nid = G.chapter.id + dir;
  if (nid >= 1 && nid <= 114) openChapter(nid);
}
window.stepChapter = stepChapter;

/* ── AI reflect from verse ── */
function verseAIReflect(key) {
  navigate('ai');
  if (window.initAI) initAI();
  setTimeout(() => {
    const vi = document.getElementById('ref-verse'); if (vi) vi.value = key;
    if (window.aiReflect) aiReflect();
  }, 250);
}
window.verseAIReflect = verseAIReflect;

/* ── Offline cache chapter ── */
async function cacheChapter() {
  if (!G.chapter || !('caches' in window)) { showToast('Caching unavailable'); return; }
  showToast('Caching chapter…');
  try {
    const c = await caches.open('maktabah-chapters-v1');
    const url = `${QURAN_API}/verses/by_chapter/${G.chapter.id}?translations=${G.translation}&fields=text_uthmani&per_page=300`;
    await c.add(url);
    if (!G.offlineChapters.includes(G.chapter.id)) {
      G.offlineChapters.push(G.chapter.id);
      sj('qOffline', G.offlineChapters);
    }
    showToast(G.chapter.name_simple + ' cached offline');
  } catch (e) { showToast('Cache failed: ' + e.message); }
}
window.cacheChapter = cacheChapter;

/* ── Helpers ── */
function toANum(n) { return String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]); }
function esc(s)    { return (s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'\\"').slice(0,400); }
function cap(s)    { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
window.toANum = toANum;
window.esc    = esc;
window.cap    = cap;

/* ── Hifz: render words as hidden/revealed tiles ── */
function _renderHifzArabic(v, trans) {
  /* Split Arabic text into whitespace-separated words */
  const words = (v.text_uthmani || '').split(/\s+/).filter(Boolean);
  const sz = G.arabicSz;
  const tiles = words.map((word, i) =>
    `<span class="hifz-word" data-idx="${i}" onclick="this.classList.toggle('hifz-show')" title="Tap to reveal" style="font-size:${sz}px;font-family:${G.arabicFont}">${word}</span>`
  ).join(' ');
  return `<span class="hifz-wrap">
    ${tiles}
    <button class="hifz-reveal-all" onclick="event.stopPropagation();this.closest('.hifz-wrap').querySelectorAll('.hifz-word').forEach(w=>w.classList.add('hifz-show'));this.style.display='none'" title="Reveal all"> Reveal all</button>
    <button class="hifz-hide-all" onclick="event.stopPropagation();this.closest('.hifz-wrap').querySelectorAll('.hifz-word').forEach(w=>w.classList.remove('hifz-show'))" title="Hide all"> Hide</button>
  </span>`;
}

/* ══════════════════════════════════════════════
   FIX #7 — HIFZ MODE (Memorisation)
   Hides Arabic word-by-word; tap to reveal each word.
   Toggle with G.hifzMode; persisted in localStorage.
══════════════════════════════════════════════ */
function toggleHifzMode() {
  G.hifzMode = !G.hifzMode;
  ss('qHifz', G.hifzMode ? '1' : '0');
  document.getElementById('btn-hifz')?.classList.toggle('on', G.hifzMode);
  showToast(G.hifzMode ? 'Hifz mode ON — tap words to reveal' : 'Hifz mode OFF');
  if (window.haptic) haptic('medium');
  if (G.chapter) loadVerses();   /* re-render with new mode */
}
window.toggleHifzMode = toggleHifzMode;

/* Called from each hidden word span — reveals on tap */
function revealHifzWord(el) {
  el.classList.toggle('hifz-revealed');
  if (window.haptic) haptic('tap');
}
window.revealHifzWord = revealHifzWord;

/* ══════════════════════════════════════
   TRANSLATION CATALOGUE & HELPERS
   (Defined here so reader.js has self-contained access)
══════════════════════════════════════ */
const TRANS_CATALOGUE = [
  { id:131, label:'Saheeh International',      lang:'en', group:'English'    },
  { id:20,  label:'Pickthall',                 lang:'en', group:'English'    },
  { id:149, label:'Dr. Khattab',               lang:'en', group:'English'    },
  { id:57,  label:'Transliteration',           lang:'en', group:'English'    },
  { id:17,  label:'التفسير الميسر',            lang:'ar', group:'Arabic'     },
  { id:84,  label:'Malayalam – ഖുർആൻ',         lang:'ml', group:'Malayalam'  },
  { id:83,  label:'Malayalam (Alt)',            lang:'ml', group:'Malayalam'  },
  { id:54,  label:'Urdu – Junagarhi',          lang:'ur', group:'Urdu'       },
  { id:97,  label:'Urdu – Ahmad Ali',          lang:'ur', group:'Urdu'       },
  { id:151, label:'Urdu – Fateh Muhammad',     lang:'ur', group:'Urdu'       },
  { id:79,  label:'Türkçe – Diyanet',          lang:'tr', group:'Turkish'    },
  { id:77,  label:'Türkçe – Ateş',             lang:'tr', group:'Turkish'    },
  { id:45,  label:'Bahasa Indonesia',          lang:'id', group:'Indonesian' },
  { id:120, label:'বাংলা – মুহিউদ্দিন',        lang:'bn', group:'Bengali'    },
  { id:213, label:'বাংলা – Alt',               lang:'bn', group:'Bengali'    },
  { id:31,  label:'Français – Hamidullah',     lang:'fr', group:'French'     },
  { id:134, label:'Español – Asad',            lang:'es', group:'Spanish'    },
  { id:203, label:'Deutsch – Bubenheim',       lang:'de', group:'German'     },
  { id:74,  label:'Русский – Kuliev',          lang:'ru', group:'Russian'    },
  { id:76,  label:'中文 – Ma Jian',             lang:'zh', group:'Chinese'    },
  { id:158, label:'Swahili',                   lang:'sw', group:'Other'      },
  { id:199, label:'Tagalog',                   lang:'tl', group:'Other'      },
];

const LANG_TRANS_DEFAULT = {
  en:'131', ar:'17', ml:'149', ur:'54', tr:'79', id:'45', bn:'120', fr:'31',
  es:'134', de:'203', ru:'74', zh:'76', sw:'158', tl:'199',
};

function _buildTransOptions() {
  const lang = G.uiLang || 'en';
  const cur  = String(G.translation || 131);
  const nat  = TRANS_CATALOGUE.filter(x => x.lang === lang);
  const rest = TRANS_CATALOGUE.filter(x => x.lang !== lang);
  const opt  = x => `<option value="${x.id}"${cur===String(x.id)?' selected':''}>${x.label}</option>`;
  let html = '';
  if (nat.length) html += `<optgroup label="— ${lang.toUpperCase()} —">${nat.map(opt).join('')}</optgroup>`;
  const grps = {};
  rest.forEach(x => { (grps[x.group]=grps[x.group]||[]).push(x); });
  Object.entries(grps).forEach(([g,items]) => { html += `<optgroup label="${g}">${items.map(opt).join('')}</optgroup>`; });
  return html;
}
window._buildTransOptions = _buildTransOptions;

function syncTranslationToLang(lang) {
  const def = LANG_TRANS_DEFAULT[lang];
  if (!def) return;
  if (G.translation === +def) return;
  G.translation = +def; ss('qTrans', def);
  const el = document.getElementById('rtb-trans');
  if (el) { el.innerHTML = _buildTransOptions(); el.value = def; }
  if (G.chapter && window.loadVerses) loadVerses();
}
window.syncTranslationToLang = syncTranslationToLang;

/* Hook into applyUILang */
const _origApplyLang = window.applyUILang;
window.applyUILang = function(lang) {
  if (_origApplyLang) _origApplyLang(lang);
  syncTranslationToLang(lang);
  /* Also update tafsir default */
  if (!ls('qTafId')) {
    G.tafsirId = _defaultTafsirId ? _defaultTafsirId() : 169;
    ss('qTafId', String(G.tafsirId));
  }
};

/* Add tafsir CSS helpers */
const _tafStyle = document.createElement('style');
_tafStyle.textContent = `
  .taf-lang-warn{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--orange);background:rgba(232,135,76,.1);border:1px solid rgba(232,135,76,.3);border-radius:6px;padding:7px 10px;margin-bottom:10px}
  .taf-err{display:flex;align-items:center;gap:8px;color:var(--t3);font-size:12.5px;padding:12px 0}
  .taf-ext-section{margin-top:10px;padding-top:10px;border-top:1px solid var(--bd)}
  .taf-ext-label{font-size:10.5px;font-weight:700;color:var(--t4);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
  .taf-ext-links{display:flex;flex-wrap:wrap;gap:6px}
  .taf-ext-link{font-size:11.5px;color:var(--em3);text-decoration:none;padding:4px 9px;border:1px solid var(--em-glow);border-radius:99px;transition:background .15s}
  .taf-ext-link:hover{background:var(--em-dim)}
  .taf-expand-btn{margin-top:8px}
  .taf-loading{display:flex;align-items:center;gap:8px;color:var(--t3);font-size:12px;padding:12px 0}
`;
document.head.appendChild(_tafStyle);
