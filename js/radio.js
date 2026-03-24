'use strict';
/**
 * js/radio.js — Audio Radio & Reciter Browser
 * Lists reciters, quick-play popular surahs, links to full chapter audio.
 */

let _radioInited = false;

function initRadio() {
  if (_radioInited) return;
  _radioInited = true;
  const pg = document.getElementById('pg-radio');
  if (!pg) return;
  pg.innerHTML = buildRadioPage();
  renderReciterGrid();
  updateSurahNames();
}
window.initRadio = initRadio;

function buildRadioPage() {
  const QUICK = [1, 2, 18, 36, 55, 56, 67, 112, 113, 114];

  const ICONS = {
    1: 'menu_book',      // Al-Fatiha
    2: 'gavel',          // Al-Baqarah
    18: 'explore',       // Al-Kahf
    36: 'favorite',      // Ya-Sin
    55: 'spa',           // Ar-Rahman
    56: 'auto_awesome',  // Al-Waqiah
    67: 'shield',        // Al-Mulk
    112: 'filter_1',     // Al-Ikhlas
    113: 'wb_twilight',  // Al-Falaq
    114: 'security'      // An-Nas
  };

  return `
  <div class="radio-wrap">

    <div class="page-hero">
      <h2>🎧 Audio & Reciters</h2>
      <p>Listen to beautiful Quran recitation from world-renowned reciters.</p>
    </div>

    <!-- Quick play row -->
    <div class="radio-tools">
      <div class="rt-group">
        <span class="rt-lbl">Quick Play:</span>
        <div class="rt-btns">
          <button class="mc-btn mc-jbtn" onclick="window.quickPlaySurah(1)">Al-Fatiha</button>
          <button class="mc-btn mc-jbtn" onclick="window.quickPlaySurah(18)">Al-Kahf</button>
          <button class="mc-btn mc-jbtn" onclick="window.quickPlaySurah(36)">Ya-Sin</button>
          <button class="mc-btn mc-jbtn" onclick="window.quickPlaySurah(55)">Ar-Rahman</button>
          <button class="mc-btn mc-jbtn" onclick="window.quickPlaySurah(67)">Al-Mulk</button>
          <button class="mc-btn mc-jbtn" onclick="window.quickPlaySurah(112)">Al-Ikhlas</button>
        </div>
      </div>
    </div>

    <!-- Reciter grid -->
    <div class="sh"><h2><span class="material-symbols-outlined">mic</span> Choose Reciter</h2></div>
    <div class="recg" id="reciter-grid"></div>

    <!-- Playlists -->
    <div class="sh" style="margin-top:20px">
      <h2><span class="material-symbols-outlined">queue_music</span> Playlists</h2>
    </div>

    <div class="radio-playlists">

      <div class="rpl-card" onclick="window.playPlaylist('last10')">
        <div class="rpl-icon">
          <span class="material-symbols-outlined">queue_music</span>
        </div>
        <div class="rpl-name">Last 10 Surahs</div>
        <div class="rpl-sub">Al-Kafirun → An-Nas (105–114)</div>
      </div>

      <div class="rpl-card" onclick="window.playPlaylist('manzil')">
        <div class="rpl-icon">
          <span class="material-symbols-outlined">verified</span>
        </div>
        <div class="rpl-name">Manzil Recitation</div>
        <div class="rpl-sub">2, 3, 4, 17, 18, 36, 99, 112, 113, 114</div>
      </div>

      <div class="rpl-card" onclick="window.playPlaylist('friday')">
        <div class="rpl-icon">
          <span class="material-symbols-outlined">calendar_month</span>
        </div>
        <div class="rpl-name">Jumu'ah Surahs</div>
        <div class="rpl-sub">Al-Kahf, Al-Mulk, Ya-Sin</div>
      </div>

      <div class="rpl-card" onclick="window.playPlaylist('sleep')">
        <div class="rpl-icon">
          <span class="material-symbols-outlined">bedtime</span>
        </div>
        <div class="rpl-name">Sleep Recitation</div>
        <div class="rpl-sub">Al-Baqarah, Al-Mulk, Al-Ikhlas</div>
      </div>

    </div>

    <!-- Surah cards -->
    <div class="sh" style="margin-top:28px">
      <h2><span class="material-symbols-outlined">menu_book</span> Surah Player</h2>
    </div>

    <div class="radio-g">
      ${QUICK.map(id => `
        <div class="rc" onclick="window.quickPlaySurah(${id})">
          <div class="rc-img">
            <span class="material-symbols-outlined rc-icon">
              ${ICONS[id] || 'radio'}
            </span>
          </div>
          <div class="rc-body">
            <h3 id="surah-name-${id}">Surah ${id}</h3>
            <p>Tap to listen</p>
          </div>
        </div>
      `).join('')}
    </div>

  </div>
  `;
}

function renderReciterGrid() {
  const el = document.getElementById('reciter-grid'); if (!el) return;
  // Verified reciter info with country flags
  const RECITER_META = {
    7:  { flag:'🇰🇼', country:'Kuwait',       bio:'World-renowned Kuwaiti qari known for his melodious Murattal style.' },
    1:  { flag:'🇪🇬', country:'Egypt',        bio:'Egyptian master qari, one of the most celebrated voices in the Islamic world.' },
    2:  { flag:'🇪🇬', country:'Egypt',        bio:'Mujawwad style by Abdul Basit — the most decorated recitation style.' },
    5:  { flag:'🇪🇬', country:'Egypt',        bio:'Mahmoud Khalil al-Husary — pioneer of recorded Quranic recitation.' },
    3:  { flag:'🇸🇦', country:'Saudi Arabia', bio:'Imam of the Grand Mosque, Makkah. Voice of Masjid al-Haram.' },
    4:  { flag:'🇸🇦', country:'Saudi Arabia', bio:'Saudi qari known for his clear and measured recitation pace.' },
    6:  { flag:'🇸🇦', country:'Saudi Arabia', bio:'Saudi reciter known for his warm, clear tone.' },
    13: { flag:'🇸🇦', country:'Saudi Arabia', bio:'Imam of Masjid al-Haram, known for his powerful voice.' },
    9:  { flag:'🇪🇬', country:'Egypt',        bio:'Muhammad Siddiq al-Minshawi — legendary Egyptian qari of the 20th century.' },
  };

  const palette = ['#2d8653','#1a6b41','#2563eb','#7c3aed','#b45309','#0891b2','#be185d','#15803d','#9333ea'];
  el.innerHTML = (window.RECITERS || []).map(r => {
    const meta     = RECITER_META[r.id] || { flag:'🎙', country:'', bio:'' };
    const initials = r.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const color    = palette[r.id % palette.length];
    const isSel    = G.reciter === r.id;
    return `
    <div class="rec-c${isSel?' sel':''}" onclick="window.selectReciter(${r.id})" role="button" tabindex="0" aria-label="Select ${r.name}">
      <div class="rec-av-wrap" style="--rc:${color}">
        <div class="rec-av-circle" style="background:${color}18;border:2.5px solid ${isSel ? color : color+'44'}">
          <span style="font-size:22px;font-weight:800;color:${color}">${initials}</span>
        </div>
        ${isSel ? '<div class="rec-playing-dot"></div>' : ''}
      </div>
      <div class="rec-flag">${meta.flag}</div>
      <div class="rec-nm">${r.name}</div>
      <div class="rec-st">${r.style} · ${meta.country}</div>
      <div class="rec-bio">${meta.bio}</div>
    </div>`;
  }).join('');
}
window.renderReciterGrid = renderReciterGrid;

function updateSurahNames() {
  if (!G.chapters.length) return;
  [1,2,18,36,55,56,67,112,113,114].forEach(id => {
    const ch = G.chapters.find(c => c.id === id);
    const el = document.getElementById('surah-name-' + id);
    if (ch && el) el.textContent = ch.name_simple;
  });
}
window.updateSurahNames = updateSurahNames;

function selectReciter(id) {
  G.reciter = id;
  ss('qReciter', id);
  document.querySelectorAll('.rec-c').forEach(el => el.classList.remove('sel'));
  document.querySelector(`.rec-c:nth-child(${(window.RECITERS||[]).findIndex(r=>r.id===id)+1})`)?.classList.add('sel');
  showToast(' Reciter selected');
}
window.selectReciter = selectReciter;

async function quickPlaySurah(id) {
  const ch = G.chapters.find(c => c.id === id);
  if (ch) { G.chapter = ch; await startChapterAudio(id); }
  else { await openChapter(id); }
}
window.quickPlaySurah = quickPlaySurah;

/* ── Playlists (Fix #18) ── */
const PLAYLISTS = {
  last10:  [105,106,107,108,109,110,111,112,113,114],
  manzil:  [2,3,4,17,18,36,99,112,113,114],
  friday:  [18,67,36],
  sleep:   [2,67,112],
};

var _playlistQueue = [];
var _playlistIdx   = 0;

async function playPlaylist(name) {
  const ids = PLAYLISTS[name];
  if (!ids?.length) return;
  _playlistQueue = [...ids];
  _playlistIdx = 0;
  showToast('▶ Playing playlist: ' + name);
  if (window.haptic) haptic('medium');
  await _playNextInPlaylist();
}
window.playPlaylist = playPlaylist;

async function _playNextInPlaylist() {
  if (_playlistIdx >= _playlistQueue.length) {
    showToast(' Playlist complete');
    _playlistQueue = [];
    return;
  }
  const chId = _playlistQueue[_playlistIdx++];
  const ch = G.chapters?.find(c => c.id === chId);
  if (ch) { G.chapter = ch; }
  await startChapterAudio(chId);
}
window._playNextInPlaylist = _playNextInPlaylist;

/* Hook into audio ended to auto-advance playlist */
(function() {
  const origEnded = window.onAudioEnded;
  // patch via onAudioEnded export — audio.js calls onAudioEnded but we hook via event
  const origAddListener = window.AUDIO_PLAYLIST_HOOKED;
  if (origAddListener) return;
  window.AUDIO_PLAYLIST_HOOKED = true;
  document.addEventListener('maktabah:audioEnded', async function() {
    if (_playlistQueue.length && _playlistIdx < _playlistQueue.length) {
      await _playNextInPlaylist();
    }
  });
})();
