'use strict';
/**
 * js/audio.js — Audio Player v6 (Production)
 *
 * Controls:  prev/next ayah · prev/next surah · play/pause
 *            loop · repeat-verse · auto-next-ayah
 *            seek (click + touch drag) · volume · speed
 * Sync:      verse highlights · progress bar · verse dot markers
 *            MediaSession (lock screen / headphone buttons)
 *            Mushaf page sync · tafsir auto-load
 * Perf:      rAF-batched DOM writes · binary-search segments
 *            single timeupdate listener · passive touch events
 */

/* ══════════════════════════════════
   STATE
══════════════════════════════════ */
const AUDIO = {
  el: null,
  playing: false,
  verseKey: null,
  chapterId: null,
  verseNum: null,
  segments: [],      /* [{verse_key, timestamp_from, timestamp_to}] */
  loop: ls('qLoop') === '1',
  repeat: ls('qRepeat') === '1',
  speed: parseFloat(ls('qSpeed') || '1'),
  volume: parseFloat(ls('qVol') || '1'),
  _fallback: false,
  _dotsDrawn: false,
  _rafId: null,    /* rAF handle for progress updates */
  _seeking: false,   /* true while user drags progress bar */
  _lastSeg: -1,      /* index of last matched segment — avoids redundant highlight */
};
window.AUDIO = AUDIO;

const RECITERS = [
  { id: 7, name: 'Mishary Alafasy', style: 'Murattal', cdn: 'Alafasy' },
  { id: 1, name: 'Abdul Basit', style: 'Murattal', cdn: 'AbdulBasitAbdulSamad' },
  { id: 2, name: 'Abdul Basit', style: 'Mujawwad', cdn: 'AbdulBasitAbdulSamad' },
  { id: 5, name: 'Al-Hussary', style: 'Murattal', cdn: 'Husary' },
  { id: 3, name: 'As-Sudais', style: 'Murattal', cdn: 'Abdurrahmaan_As-Sudais_192kbps' },
  { id: 4, name: 'Abu Bakr al-Shatri', style: 'Murattal', cdn: 'AbuBakrAlShatri' },
  { id: 6, name: 'Hani ar-Rifai', style: 'Murattal', cdn: 'HaniRifai' },
  { id: 13, name: 'Saad al-Ghamdi', style: 'Murattal', cdn: 'Saad_Al-Ghamdi_128kbps' },
  { id: 9, name: 'Minshawi', style: 'Murattal', cdn: 'Minshawi' },
];
window.RECITERS = RECITERS;

const EVERYAYAH = {
  7: 'Alafasy_128kbps', 1: 'Abdul_Basit_Murattal_192kbps', 2: 'Abdul_Basit_Mujawwad_128kbps',
  5: 'Husary_128kbps', 3: 'Abdurrahmaan_As-Sudais_192kbps', 4: 'Abu_Bakr_Ash-Shaatree_128kbps',
  6: 'Hani_Rifai_64kbps', 13: 'Saad_Al-Ghamdi_128kbps', 9: 'Minshawi_wa_Mujawwad_128kbps',
};

/* ══════════════════════════════════
   INIT
══════════════════════════════════ */
function initAudioEl() {
  if (AUDIO.el) return;
  AUDIO.el = document.getElementById('core-audio') || (() => {
    const a = document.createElement('audio');
    a.id = 'core-audio'; a.preload = 'auto';
    document.body.appendChild(a); return a;
  })();
  AUDIO.el.volume = AUDIO.volume;
  AUDIO.el.playbackRate = AUDIO.speed;

  /* Single timeupdate → rAF loop (better perf than per-event DOM writes) */
  AUDIO.el.addEventListener('timeupdate', _scheduleRaf);
  AUDIO.el.addEventListener('ended', onAudioEnded);
  AUDIO.el.addEventListener('error', onAudioError);
  AUDIO.el.addEventListener('loadstart', () => setPlayIcon('loading'));
  AUDIO.el.addEventListener('canplay', () => setPlayIcon(AUDIO.playing ? 'pause' : 'play'));
  AUDIO.el.addEventListener('loadedmetadata', () => { if (!AUDIO._dotsDrawn) _drawVerseDots(); });

  /* Sync persisted control states to UI */
  _syncOptButtons();

  /* Volume + speed inputs */
  const vol = document.getElementById('pl-vol'); if (vol) vol.value = AUDIO.volume;
  const spd = document.getElementById('pl-spd'); if (spd) spd.value = String(AUDIO.speed);

  /* Seek — click + touch drag */
  _initSeek();
  /* Swipe-down to close */
  _initSwipeClose();
}
window.initAudioEl = initAudioEl;

/* Sync all toggle button visual states from AUDIO/G */
function _syncOptButtons() {
  _setBtn('pl-loop', AUDIO.loop);
  _setBtn('pl-repeat', AUDIO.repeat);
  _setBtn('pl-autonext', G.autoNextAyah);
}

function _setBtn(id, on) {
  const b = document.getElementById(id);
  if (!b) return;
  b.classList.toggle('on', !!on);
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
}

/* ══════════════════════════════════
   SEEK — click + touch drag
══════════════════════════════════ */
function _initSeek() {
  /* Bind to the larger wrapper for an easier tap target */
  const container = document.querySelector('.pl-progress-wrap') || document.getElementById('pl-progress');
  const bar = document.getElementById('pl-progress');
  if (!container || container._seekInited) return;
  container._seekInited = true;

  /* Use the visual bar's bounds for position calculation so dots stay accurate */
  const wrap = bar || container;
  let dragging = false;

  function getPos(e) {
    const r = (bar || container).getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(1, (cx - r.left) / r.width));
  }

  function applySeek(pos) {
    if (!AUDIO.el?.duration) return;
    const t = pos * AUDIO.el.duration;
    AUDIO.el.currentTime = t;
    _updateProgressUI(t, AUDIO.el.duration);
    if (AUDIO.segments.length) {
      const seg = _findSegmentAt(t * 1000);
      if (seg?.verse_key) _setCurrentVerse(seg.verse_key, true);
    }
  }

  /* Mouse */
  container.addEventListener('mousedown', e => {
    dragging = true; AUDIO._seeking = true;
    wrap.classList.add('dragging');
    applySeek(getPos(e));
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => { if (dragging) applySeek(getPos({ clientX: e.clientX })); });
  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false; AUDIO._seeking = false;
    wrap.classList.remove('dragging');
    haptic && haptic('tap');
  });

  /* Touch */
  container.addEventListener('touchstart', e => {
    dragging = true; AUDIO._seeking = true;
    wrap.classList.add('dragging');
    applySeek(getPos(e));
  }, { passive: true });
  container.addEventListener('touchmove', e => {
    if (dragging) { applySeek(getPos(e)); e.preventDefault(); }
  }, { passive: false });
  container.addEventListener('touchend', () => {
    dragging = false; AUDIO._seeking = false;
    wrap.classList.remove('dragging');
    haptic && haptic('tap');
  }, { passive: true });

  /* Keyboard: arrow keys on focused progress bar */
  container.addEventListener('keydown', e => {
    if (!AUDIO.el?.duration) return;
    const step = (e.shiftKey ? 30 : 5);
    if (e.key === 'ArrowRight') { AUDIO.el.currentTime = Math.min(AUDIO.el.duration, AUDIO.el.currentTime + step); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { AUDIO.el.currentTime = Math.max(0, AUDIO.el.currentTime - step); e.preventDefault(); }
  });
}

/* Legacy entry point (onclick in old HTML — kept for safety) */
function seekAudio(e) { /* no-op — handled by _initSeek */ }
window.seekAudio = seekAudio;

/* ══════════════════════════════════
   VERSE URLS
══════════════════════════════════ */
function _verseUrls(key, rid) {
  const [ch, vn] = key.split(':');
  const f = String(+ch).padStart(3, '0') + String(+vn).padStart(3, '0') + '.mp3';
  const r = RECITERS.find(r => r.id === rid) || RECITERS[0];
  return [
    `${AUDIO_CDN}${r.cdn}/mp3/${f}`,
    `https://everyayah.com/data/${EVERYAYAH[rid] || EVERYAYAH[7]}/${f}`,
  ];
}

/* ══════════════════════════════════
   PLAY VERSE (single ayah)
══════════════════════════════════ */
async function playVerse(key) {
  initAudioEl();
  haptic && haptic('light');
  AUDIO.verseKey = key;
  AUDIO.chapterId = parseInt(key);
  AUDIO.verseNum = parseInt(key.split(':')[1]);
  AUDIO.segments = [];
  AUDIO._dotsDrawn = false;
  AUDIO._lastSeg = -1;

  showPlayerInfo(key);
  openPlayer();
  highlightPlayingVerse(key);
  _updateAyahBtns();

  const [cdn1, cdn2] = _verseUrls(key, G.reciter);

  try {
    const d = await apiFetch(`/recitations/${G.reciter}/by_ayah/${key}`);
    const af = d.audio_file || {};
    const url = af.url || af.audio_url;
    if (!url) throw new Error('no url');
    AUDIO.segments = af.verse_timings || af.segments || [];
    await _loadPlay(url.startsWith('http') ? url : AUDIO_CDN + url);
    setMediaSession(key);
    return;
  } catch (e1) { /* try CDN */ }

  AUDIO._fallback = true;
  try { await _loadPlay(cdn1); setMediaSession(key); return; }
  catch (e2) { /* try fallback */ }
  try { await _loadPlay(cdn2); setMediaSession(key); }
  catch (e3) { showToast('Audio unavailable — try another reciter'); setPlayIcon('play'); haptic && haptic('error'); }
  finally { AUDIO._fallback = false; }
}
window.playVerse = playVerse;

/* ══════════════════════════════════
   PLAY FULL CHAPTER
══════════════════════════════════ */
async function startChapterAudio(chId) {
  initAudioEl();
  haptic && haptic('medium');
  if (!chId || chId < 1 || chId > 114) return;

  const ch = G.chapters?.find(c => c.id === chId);
  showToast(`Loading ${ch?.name_simple || 'Surah ' + chId}…`);

  try {
    const d = await apiFetch(`/chapter_recitations/${G.reciter}/${chId}`);
    const af = d.audio_file || {};
    const url = af.audio_url || af.url;
    if (!url) { showToast('Chapter audio unavailable'); return; }

    AUDIO.chapterId = chId;
    AUDIO.verseKey = `${chId}:1`;
    AUDIO.verseNum = 1;
    AUDIO.segments = af.verse_timings || af.segments || [];
    AUDIO._dotsDrawn = false;
    AUDIO._lastSeg = -1;

    /* Fetch verse timings if not included */
    if (!AUDIO.segments.length) {
      try {
        const vt = await apiFetch(`/recitations/${G.reciter}/by_chapter/${chId}`);
        AUDIO.segments = vt.audio_files?.[0]?.verse_timings || [];
      } catch (e) { /* no timing data — play without markers */ }
    }

    const full = url.startsWith('http') ? url : AUDIO_CDN + url;
    showPlayerInfo(`${chId}:1`, ch?.name_simple);
    openPlayer();
    highlightPlayingVerse(`${chId}:1`);
    _loadPlaySync(full);
    setMediaSession(`${chId}:1`);
    _updateAyahBtns();
  } catch (e) { showToast('Chapter audio: ' + e.message); haptic && haptic('error'); }
}
window.startChapterAudio = startChapterAudio;

/* ── Word audio (tap a word in WBW view) ── */
function playWordAudio(url) {
  if (!url) return;
  haptic && haptic('tap');
  const a = new Audio(url.startsWith('http') ? url : AUDIO_CDN + url);
  a.volume = AUDIO.volume;
  a.play().catch(() => { });
}
window.playWordAudio = playWordAudio;

/* ══════════════════════════════════
   INTERNAL LOAD HELPERS
══════════════════════════════════ */
function _loadPlaySync(url) {
  AUDIO.el.src = url; AUDIO.el.load();
  AUDIO.el.play().catch(() => { });
  AUDIO.playing = true; setPlayIcon('pause');
  _startRaf();
}

function _loadPlay(url) {
  return new Promise((res, rej) => {
    AUDIO.el.src = url; AUDIO.el.load();
    const clean = () => { AUDIO.el.removeEventListener('canplay', ok); AUDIO.el.removeEventListener('error', er); };
    const ok = () => { clean(); AUDIO.el.play().then(() => { AUDIO.playing = true; setPlayIcon('pause'); _startRaf(); res(); }).catch(rej); };
    const er = () => { clean(); rej(new Error('load failed')); };
    AUDIO.el.addEventListener('canplay', ok, { once: true });
    AUDIO.el.addEventListener('error', er, { once: true });
    setTimeout(() => { clean(); rej(new Error('timeout')); }, 12000);
  });
}

/* ══════════════════════════════════
   rAF LOOP — batches all DOM writes
   Runs only while audio is playing.
══════════════════════════════════ */
function _startRaf() {
  if (AUDIO._rafId) return;
  function frame() {
    AUDIO._rafId = requestAnimationFrame(frame);
    _tickProgress();
  }
  AUDIO._rafId = requestAnimationFrame(frame);
}
function _stopRaf() {
  if (AUDIO._rafId) { cancelAnimationFrame(AUDIO._rafId); AUDIO._rafId = null; }
}

/* Unified tick — progress bar + segment lookup */
function _tickProgress() {
  const el = AUDIO.el;
  if (!el || AUDIO._seeking) return;
  const cur = el.currentTime;
  const dur = el.duration;
  if (!dur || isNaN(dur)) return;

  _updateProgressUI(cur, dur);

  /* Draw dots once duration is known */
  if (!AUDIO._dotsDrawn) _drawVerseDots();

  /* Segment lookup (only if we have timing data) */
  if (!AUDIO.segments.length) return;
  const curMs = cur * 1000;

  /* Optimistic check: is current segment still valid? */
  const segs = AUDIO.segments;
  const prev = AUDIO._lastSeg >= 0 ? segs[AUDIO._lastSeg] : null;
  if (prev && curMs >= (prev.timestamp_from ?? 0) && curMs < (prev.timestamp_to ?? Infinity)) return;

  /* Binary search for new segment */
  const idx = _findSegmentIdx(curMs);
  if (idx === AUDIO._lastSeg) return;
  AUDIO._lastSeg = idx;
  const seg = idx >= 0 ? segs[idx] : null;
  if (seg?.verse_key && seg.verse_key !== AUDIO.verseKey) {
    _setCurrentVerse(seg.verse_key, false);
  }
}

function _updateProgressUI(cur, dur) {
  const pct = (cur / dur) * 100;
  const fill = document.getElementById('pl-fill');
  const thumb = document.getElementById('pl-thumb');
  const curT = document.getElementById('pl-cur');
  const totT = document.getElementById('pl-tot');
  const bar = document.getElementById('pl-progress');

  if (fill) fill.style.width = pct + '%';
  if (thumb) thumb.style.left = pct + '%';
  if (curT) curT.textContent = fmtTime(cur);
  if (totT) totT.textContent = fmtTime(dur);
  if (bar) bar.setAttribute('aria-valuenow', Math.round(pct));
}

/* ══════════════════════════════════
   TOGGLE PLAY/PAUSE
══════════════════════════════════ */
function togglePlay() {
  initAudioEl(); haptic && haptic('light');
  if (!AUDIO.el.src || AUDIO.el.src === window.location.href) {
    if (G.chapter) startChapterAudio(G.chapter.id);
    else showToast('Select a surah to play');
    return;
  }
  if (AUDIO.playing) {
    AUDIO.el.pause(); AUDIO.playing = false; setPlayIcon('play'); _stopRaf();
  } else {
    AUDIO.el.play().catch(() => { }); AUDIO.playing = true; setPlayIcon('pause'); _startRaf();
  }
}
window.togglePlay = togglePlay;

/* ══════════════════════════════════
   PREV / NEXT — SURAH
══════════════════════════════════ */
function audioPrev() {
  haptic && haptic('medium');
  if (AUDIO.chapterId > 1) startChapterAudio(AUDIO.chapterId - 1);
}
function audioNext() {
  haptic && haptic('medium');
  if (AUDIO.chapterId < 114) startChapterAudio(AUDIO.chapterId + 1);
}
window.audioPrev = audioPrev;
window.audioNext = audioNext;

/* ══════════════════════════════════
   PREV / NEXT — AYAH
══════════════════════════════════ */
function audioPrevAyah() {
  haptic && haptic('light');
  if (!AUDIO.verseNum || !AUDIO.chapterId) { showToast('No ayah playing'); return; }

  if (AUDIO.segments.length && AUDIO.el?.currentTime) {
    /* If >3s into verse — restart current verse */
    const curMs = AUDIO.el.currentTime * 1000;
    const curSeg = AUDIO.segments.find(s => s.verse_key === AUDIO.verseKey);
    if (curSeg && curMs - (curSeg.timestamp_from ?? 0) > 3000) {
      AUDIO.el.currentTime = (curSeg.timestamp_from ?? 0) / 1000;
      return;
    }
  }

  if (AUDIO.verseNum > 1) {
    /* Jump to previous verse within chapter audio (via timestamp) */
    const prevKey = `${AUDIO.chapterId}:${AUDIO.verseNum - 1}`;
    if (AUDIO.segments.length) {
      const seg = AUDIO.segments.find(s => s.verse_key === prevKey);
      if (seg) {
        AUDIO.el.currentTime = (seg.timestamp_from ?? 0) / 1000;
        _setCurrentVerse(prevKey, true);
        return;
      }
    }
    /* Fallback: load as individual verse */
    playVerse(prevKey);
  } else if (AUDIO.chapterId > 1) {
    startChapterAudio(AUDIO.chapterId - 1);
  }
}
function audioNextAyah() {
  haptic && haptic('light');
  if (!AUDIO.verseNum || !AUDIO.chapterId) { showToast('No ayah playing'); return; }
  const ch = G.chapters?.find(c => c.id === AUDIO.chapterId);
  const maxV = ch?.verses_count || 286;

  if (AUDIO.verseNum < maxV) {
    const nextKey = `${AUDIO.chapterId}:${AUDIO.verseNum + 1}`;
    if (AUDIO.segments.length) {
      const seg = AUDIO.segments.find(s => s.verse_key === nextKey);
      if (seg) {
        AUDIO.el.currentTime = (seg.timestamp_from ?? 0) / 1000;
        _setCurrentVerse(nextKey, true);
        return;
      }
    }
    playVerse(nextKey);
  } else if (AUDIO.chapterId < 114) {
    startChapterAudio(AUDIO.chapterId + 1);
  }
}
window.audioPrevAyah = audioPrevAyah;
window.audioNextAyah = audioNextAyah;

/* Update prev/next ayah button disabled state */
function _updateAyahBtns() {
  const ch = G.chapters?.find(c => c.id === AUDIO.chapterId);
  const maxV = ch?.verses_count || 999;
  const prev = document.getElementById('pl-prev-ayah');
  const next = document.getElementById('pl-next-ayah');
  if (prev) prev.disabled = (AUDIO.verseNum <= 1 && AUDIO.chapterId <= 1);
  if (next) next.disabled = (AUDIO.verseNum >= maxV && AUDIO.chapterId >= 114);
}

/* ══════════════════════════════════
   LOOP / REPEAT / AUTO-NEXT
══════════════════════════════════ */
function toggleLoop() {
  AUDIO.loop = !AUDIO.loop; ss('qLoop', AUDIO.loop ? '1' : '0');
  _setBtn('pl-loop', AUDIO.loop);
  showToast(AUDIO.loop ? 'Loop surah on' : 'Loop off'); haptic && haptic('light');
}
function toggleRepeat() {
  AUDIO.repeat = !AUDIO.repeat; ss('qRepeat', AUDIO.repeat ? '1' : '0');
  _setBtn('pl-repeat', AUDIO.repeat);
  showToast(AUDIO.repeat ? 'Repeat ayah on' : 'Repeat off'); haptic && haptic('light');
}
function toggleAutoNext() {
  G.autoNextAyah = !G.autoNextAyah; ss('qAutoNext', G.autoNextAyah ? '1' : '0');
  _setBtn('pl-autonext', G.autoNextAyah);
  showToast(G.autoNextAyah ? 'Auto-next ayah on' : 'Auto-next off'); haptic && haptic('light');
}
window.toggleLoop = toggleLoop;
window.toggleRepeat = toggleRepeat;
window.toggleAutoNext = toggleAutoNext;

/* ══════════════════════════════════
   AUDIO ENDED
══════════════════════════════════ */
async function onAudioEnded() {
  AUDIO.playing = false; setPlayIcon('play'); _stopRaf();

  if (AUDIO.repeat) {
    AUDIO.el.currentTime = 0; AUDIO.el.play().catch(() => { });
    AUDIO.playing = true; setPlayIcon('pause'); _startRaf(); return;
  }

  /* Auto-advance ayah by ayah */
  if (G.autoNextAyah && AUDIO.verseNum && AUDIO.chapterId) {
    const ch = G.chapters?.find(c => c.id === AUDIO.chapterId);
    if (ch && AUDIO.verseNum < ch.verses_count) {
      await playVerse(`${AUDIO.chapterId}:${AUDIO.verseNum + 1}`); return;
    }
    /* End of surah → next surah */
    if (AUDIO.chapterId < 114) { await startChapterAudio(AUDIO.chapterId + 1); return; }
  }

  /* Playlist queue */
  if (window._playlistQueue?.length && window._playlistIdx < window._playlistQueue.length) {
    await window._playNextInPlaylist?.(); return;
  }

  /* Loop surah */
  if (AUDIO.loop && AUDIO.chapterId) {
    AUDIO.el.currentTime = 0; AUDIO.el.play().catch(() => { });
    AUDIO.playing = true; setPlayIcon('pause'); _startRaf(); return;
  }

  /* Auto-play next surah */
  if (G.autoPlay && AUDIO.chapterId && AUDIO.chapterId < 114) {
    await startChapterAudio(AUDIO.chapterId + 1);
  }
}

function onAudioError() {
  if (AUDIO._fallback) return;
  showToast('Audio error — check connection or try another reciter');
  AUDIO.playing = false; setPlayIcon('play'); _stopRaf(); haptic && haptic('error');
}

/* ══════════════════════════════════
   SET CURRENT VERSE (internal)
   Called from rAF loop or seek — single
   function that updates all synced UI.
══════════════════════════════════ */
function _setCurrentVerse(key, scrollToIt) {
  AUDIO.verseKey = key;
  AUDIO.verseNum = parseInt(key.split(':')[1]);
  highlightPlayingVerse(key);
  updatePlayerVerseLabel(key);
  if (scrollToIt) scrollReaderToVerse(key);
  _updateAyahBtns();
  _updateActiveDot(key);
}

/* ══════════════════════════════════
   BINARY SEARCH HELPERS
══════════════════════════════════ */
function _findSegmentAt(ms) {
  const idx = _findSegmentIdx(ms);
  return idx >= 0 ? AUDIO.segments[idx] : null;
}

function _findSegmentIdx(ms) {
  const segs = AUDIO.segments;
  if (!segs.length) return -1;
  let lo = 0, hi = segs.length - 1, found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const from = segs[mid].timestamp_from ?? 0;
    const to = segs[mid].timestamp_to ?? Infinity;
    if (ms >= from && ms < to) { found = mid; break; }
    else if (ms < from) hi = mid - 1;
    else lo = mid + 1;
  }
  /* Last segment has no upper bound */
  if (found < 0 && segs.length) {
    const last = segs[segs.length - 1];
    if (ms >= (last.timestamp_from ?? 0)) found = segs.length - 1;
  }
  return found;
}

/* ══════════════════════════════════
   VERSE DOTS on progress bar
══════════════════════════════════ */
function _drawVerseDots() {
  if (AUDIO._dotsDrawn || !AUDIO.segments.length) return;
  const dur = AUDIO.el?.duration;
  if (!dur || isNaN(dur) || dur < 1) return;

  const bar = document.getElementById('pl-progress');
  if (!bar) return;
  bar.querySelectorAll('.pl-verse-dot').forEach(d => d.remove());

  const durMs = dur * 1000;
  const frag = document.createDocumentFragment();

  AUDIO.segments.forEach((seg, i) => {
    if (i === 0) return;
    const pct = ((seg.timestamp_from ?? 0) / durMs) * 100;
    if (pct < 0.5 || pct > 99.5) return;
    const dot = document.createElement('div');
    dot.className = 'pl-verse-dot';
    dot.style.left = pct + '%';
    const vn = (seg.verse_key || '').split(':')[1] || '';
    dot.title = `Ayah ${vn}`;
    dot.dataset.key = seg.verse_key;
    dot.addEventListener('click', e => {
      e.stopPropagation();
      AUDIO.el.currentTime = (seg.timestamp_from ?? 0) / 1000;
      _setCurrentVerse(seg.verse_key, true);
      haptic && haptic('tap');
    });
    frag.appendChild(dot);
  });

  bar.appendChild(frag);
  AUDIO._dotsDrawn = true;
}

function _updateActiveDot(key) {
  const bar = document.getElementById('pl-progress');
  if (!bar) return;
  bar.querySelectorAll('.pl-verse-dot').forEach(d => {
    d.classList.toggle('active', d.dataset.key === key);
  });
}

/* ══════════════════════════════════
   HIGHLIGHT PLAYING VERSE
══════════════════════════════════ */
function highlightPlayingVerse(key) {
  /* Clear old */
  document.querySelectorAll('.verse.playing-v').forEach(el => el.classList.remove('playing-v'));

  const el = document.getElementById('vr-' + key);
  if (el) {
    el.classList.add('playing-v');

    /* Scroll into view if not visible */
    const pg = document.getElementById('pg-reader');
    if (pg) {
      const pgRect = pg.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const visTop = pgRect.top + 60;
      const visBot = pgRect.bottom - 80;
      if (elRect.top < visTop || elRect.bottom > visBot) {
        const centre = (elRect.top - pgRect.top) + pg.scrollTop
          - pg.clientHeight / 2 + elRect.height / 2;
        pg.scrollTo({ top: Math.max(0, centre), behavior: 'smooth' });
      }
    }

    /* Pulse verse number */
    const vnum = el.querySelector('.v-num');
    if (vnum) { vnum.classList.add('playing-pulse'); setTimeout(() => vnum.classList.remove('playing-pulse'), 700); }

    /* Auto-load tafsir */
    if (G.tafsirMode && window.loadTafsir) {
      const tf = document.getElementById('taf-' + key);
      if (tf && !tf.classList.contains('open')) loadTafsir(key);
    }
  } else {
    scrollReaderToVerse(key);
  }

  /* Mushaf sync */
  document.querySelectorAll('.mp-ayah.active').forEach(e => e.classList.remove('active'));
  document.getElementById('mp-' + key)?.classList.add('active');

  /* Art icon playing state */
  document.getElementById('pl-art')?.classList.add('playing');
}
window.highlightPlayingVerse = highlightPlayingVerse;

/* ══════════════════════════════════
   SCROLL READER TO VERSE
══════════════════════════════════ */
function scrollReaderToVerse(key) {
  const el = document.getElementById('vr-' + key);
  if (el) {
    const pg = document.getElementById('pg-reader');
    if (pg) {
      const offset = (el.getBoundingClientRect().top - pg.getBoundingClientRect().top)
        + pg.scrollTop - pg.clientHeight / 2 + el.offsetHeight / 2;
      pg.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }
  if (!G.chapter) return;
  const vn = parseInt(key.split(':')[1]);
  if (!vn || !G.vpp) return;
  const targetPage = Math.ceil(vn / G.vpp);
  if (targetPage === G.page) return;
  G.page = targetPage;
  if (window.loadVerses) {
    loadVerses().then(() => {
      setTimeout(() => {
        const el2 = document.getElementById('vr-' + key);
        if (!el2) return;
        const pg = document.getElementById('pg-reader');
        if (pg) {
          const offset = (el2.getBoundingClientRect().top - pg.getBoundingClientRect().top)
            + pg.scrollTop - pg.clientHeight / 2 + el2.offsetHeight / 2;
          pg.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
        }
      }, 180);
    });
  }
  if (window.updateReaderURL) updateReaderURL();
}
window.scrollReaderToVerse = scrollReaderToVerse;
window._seekToVerseInReader = scrollReaderToVerse;

/* ══════════════════════════════════
   VOLUME / SPEED
══════════════════════════════════ */
function setVolume(v) {
  AUDIO.volume = Math.max(0, Math.min(1, v));
  if (AUDIO.el) AUDIO.el.volume = AUDIO.volume;
  ss('qVol', AUDIO.volume);
}
function setSpeed(s) {
  AUDIO.speed = s;
  if (AUDIO.el) AUDIO.el.playbackRate = s;
  ss('qSpeed', s);
  showToast(`Speed: ${s}×`); haptic && haptic('light');
}
window.setVolume = setVolume;
window.setSpeed = setSpeed;

/* ══════════════════════════════════
   OPEN / CLOSE PLAYER
══════════════════════════════════ */
function openPlayer() {
  document.getElementById('player')?.classList.add('open');
  document.body.classList.add('player-open');
}
function closePlayer() {
  document.getElementById('player')?.classList.remove('open');
  document.body.classList.remove('player-open');
  if (AUDIO.el) { AUDIO.el.pause(); }
  AUDIO.playing = false; setPlayIcon('play'); _stopRaf();
  document.getElementById('pl-art')?.classList.remove('playing');
  haptic && haptic('light');
}
window.openPlayer = openPlayer;
window.closePlayer = closePlayer;

/* Jump to currently playing verse in reader */
function goToPlayingVerse() {
  if (!AUDIO.verseKey) return;
  if (window.navigate) navigate('reader');
  setTimeout(() => scrollReaderToVerse(AUDIO.verseKey), 120);
}
window.goToPlayingVerse = goToPlayingVerse;

/* ══════════════════════════════════
   PLAYER INFO TEXT
══════════════════════════════════ */
function showPlayerInfo(key, surahName) {
  const chId = parseInt(key);
  const vn = key.split(':')[1];
  const ch = G.chapters?.find(c => c.id === chId) || G.chapter;
  const name = surahName || ch?.name_simple || `Surah ${chId}`;
  const t1 = document.getElementById('pl-title');
  const t2 = document.getElementById('pl-sub');
  if (t1) t1.textContent = name;
  if (t2) t2.textContent = vn ? `Ayah ${vn}` : 'Full Surah';
  if (window.updateReciterAvatar) updateReciterAvatar();
}
function updatePlayerVerseLabel(key) {
  const el = document.getElementById('pl-sub');
  if (el && key) el.textContent = `Ayah ${key.split(':')[1] || ''}`;
}
window.showPlayerInfo = showPlayerInfo;
window.updatePlayerVerseLabel = updatePlayerVerseLabel;

/* ══════════════════════════════════
   PLAY ICON STATE
══════════════════════════════════ */
function setPlayIcon(state) {
  const icon = document.getElementById('pl-play-icon');
  if (!icon) return;
  if (state === 'loading') {
    icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur=".9s" repeatCount="indefinite"/></path></svg>`;
  } else if (state === 'pause') {
    icon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`;
  } else {
    icon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><polygon points="5,3 19,12 5,21"/></svg>`;
  }
}
window.setPlayIcon = setPlayIcon;

/* ══════════════════════════════════
   MEDIA SESSION (lock screen / headphones)
══════════════════════════════════ */
function setMediaSession(key) {
  if (!('mediaSession' in navigator)) return;
  try {
    const chId = parseInt(key);
    const ch = G.chapters?.find(c => c.id === chId) || G.chapter;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: ch?.name_simple || `Surah ${chId}`,
      artist: RECITERS.find(r => r.id === G.reciter)?.name || 'Reciter',
      album: 'Maktabah — Noble Quran',
    });
    navigator.mediaSession.setActionHandler('play', togglePlay);
    navigator.mediaSession.setActionHandler('pause', togglePlay);
    navigator.mediaSession.setActionHandler('previoustrack', audioPrevAyah);
    navigator.mediaSession.setActionHandler('nexttrack', audioNextAyah);
    navigator.mediaSession.setActionHandler('seekbackward', () => { if (AUDIO.el) AUDIO.el.currentTime = Math.max(0, AUDIO.el.currentTime - 10); });
    navigator.mediaSession.setActionHandler('seekforward', () => { if (AUDIO.el) AUDIO.el.currentTime = Math.min(AUDIO.el.duration, AUDIO.el.currentTime + 10); });
  } catch (e) { /* browser doesn't support all handlers */ }
}
window.setMediaSession = setMediaSession;

/* ══════════════════════════════════
   SWIPE DOWN TO CLOSE
══════════════════════════════════ */
function _initSwipeClose() {
  const pl = document.getElementById('player');
  if (!pl || pl._swipeInited) return;
  pl._swipeInited = true;
  let sy = 0;
  pl.addEventListener('touchstart', e => { sy = e.touches[0].clientY; }, { passive: true });
  pl.addEventListener('touchend', e => {
    if (e.changedTouches[0].clientY - sy > 70) { closePlayer(); haptic && haptic('medium'); }
  }, { passive: true });
}

/* ══════════════════════════════════
   TIMEUPDATE → schedules rAF (not used
   directly for DOM — just ensures rAF
   runs when browser triggers timeupdate)
══════════════════════════════════ */
function _scheduleRaf() {
  if (!AUDIO._rafId && AUDIO.playing) _startRaf();
}

/* ══════════════════════════════════
   FORMAT TIME
══════════════════════════════════ */
function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

/* ══════════════════════════════════
   CHAPTER AUDIO ALIASES
══════════════════════════════════ */
async function playChapterAudio() {
  if (!G.chapter) { showToast('No chapter open'); return; }
  await startChapterAudio(G.chapter.id);
}
window.playChapterAudio = playChapterAudio;
window.playChapterFull = playChapterAudio;

/* ══════════════════════════════════
   TTS — Speak translation text
══════════════════════════════════ */
var _ttsUtterance = null;

function speakTranslation(key, text) {
  if (!('speechSynthesis' in window)) { showToast('TTS not supported in this browser'); return; }
  window.speechSynthesis.cancel();
  if (_ttsUtterance?._key === key) { _ttsUtterance = null; setTTSIcon(key, false); return; }
  const langMap = { en: 'en-US', ml: 'ml-IN', ar: 'ar', fr: 'fr-FR', tr: 'tr-TR', ur: 'ur', id: 'id-ID', bn: 'bn-IN' };
  const u = new SpeechSynthesisUtterance(text);
  u.lang = langMap[G.lang || G.uiLang || 'en'] || 'en-US';
  u.rate = 0.92;
  u._key = key;
  u.onstart = () => setTTSIcon(key, true);
  u.onend = () => { setTTSIcon(key, false); _ttsUtterance = null; };
  u.onerror = () => { setTTSIcon(key, false); _ttsUtterance = null; };
  _ttsUtterance = u;
  window.speechSynthesis.speak(u);
  haptic && haptic('light');
}
window.speakTranslation = speakTranslation;

function setTTSIcon(key, active) {
  document.querySelectorAll('.va.va-tts').forEach(btn => {
    if (btn.closest('.verse')?.dataset?.key === key) btn.classList.toggle('on', active);
  });
}