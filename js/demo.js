'use strict';
/**
 * js/demo.js — Feature Tour v2 (Fix #19: covers all sections)
 */

const TOUR_STEPS = [
  {
    el: '#hero-q',
    title: '🔍 Search the Quran',
    text: 'Type a surah name, number, or verse key like 2:255. Results appear instantly.',
    pos: 'bottom',
  },
  {
    el: '#pg-home .vod-wrap',
    title: '📖 Verse of the Day',
    text: 'A new verse every day — tap to open it in the full reader with translation and tafsir.',
    pos: 'bottom',
  },
  {
    el: '[data-tab="reader"]',
    title: '📚 Quran Reader',
    text: 'Full verse reader with word-by-word breakdown, multiple translations, tajweed colouring, bookmarks, and notes.',
    pos: 'right',
  },
  {
    el: '[data-tab="mushaf"]',
    title: '🕌 Mushaf View',
    text: 'Authentic Uthmani script page-by-page, just like a physical Mushaf. Swipe to turn pages.',
    pos: 'right',
  },
  {
    el: '[data-tab="dhikr"]',
    title: '📿 Adhkar & Dhikr',
    text: 'Complete Hisnul Muslim adhkar with Arabic, transliteration, and sources. Tasbih counter included.',
    pos: 'right',
  },
  {
    el: '[data-tab="corpus"]',
    title: '🔬 Quran Corpus',
    text: 'Arabic root search, morphological analysis, and concordance for deep linguistic study.',
    pos: 'right',
  },
  {
    el: '[data-tab="radio"]',
    title: '🎵 Audio & Reciters',
    text: 'Listen to 9 world-renowned reciters. The player syncs verse highlighting as audio plays.',
    pos: 'right',
  },
  {
    el: '#player',
    title: '▶ Audio Player',
    text: 'Tap verse markers on the progress bar to jump to any ayah. The reader follows automatically.',
    pos: 'top',
    open: true,
  },
  {
    el: '[data-tab="ai"]',
    title: '✨ AI Scholar',
    text: 'Ask questions about any verse, request tafsir, or get help understanding Arabic. Fully private — no data stored.',
    pos: 'right',
  },
  {
    el: '#tn-settings',
    title: '⚙️ Settings & Data',
    text: 'Change theme, font size, translation, reciter. Export and import your bookmarks and notes for backup.',
    pos: 'left',
  },
];

let _tourStep = 0;
let _tourEl   = null;

function startTour() {
  _tourStep = 0;
  _showTourStep();
}
window.startTour = startTour;

function _showTourStep() {
  _clearTour();
  if (_tourStep >= TOUR_STEPS.length) { _clearTour(); showToast('🎉 Tour complete!'); return; }
  const step = TOUR_STEPS[_tourStep];
  const target = document.querySelector(step.el);

  const box = document.createElement('div');
  box.id = 'tour-box';
  box.className = 'tour-box';
  box.innerHTML = `
    <div class="tour-step">${_tourStep+1}/${TOUR_STEPS.length}</div>
    <div class="tour-title">${step.title}</div>
    <div class="tour-text">${step.text}</div>
    <div class="tour-acts">
      <button class="tour-skip" onclick="_clearTour()">Skip</button>
      ${_tourStep > 0 ? '<button class="tour-prev" onclick="_tourPrev()">← Back</button>' : ''}
      <button class="tour-next" onclick="_tourNext()">${_tourStep===TOUR_STEPS.length-1?'Finish':'Next →'}</button>
    </div>
  `;

  document.body.appendChild(box);
  _tourEl = box;

  if (target) {
    target.scrollIntoView({ behavior:'smooth', block:'center' });
    const r = target.getBoundingClientRect();
    box.style.top  = (r.bottom + 12 + window.scrollY) + 'px';
    box.style.left = Math.max(12, Math.min(r.left, window.innerWidth - 320)) + 'px';
    target.classList.add('tour-highlight');
  }
}

function _tourNext() { _tourStep++; _showTourStep(); }
function _tourPrev() { _tourStep = Math.max(0, _tourStep-1); _showTourStep(); }
window._tourNext = _tourNext; window._tourPrev = _tourPrev;

function _clearTour() {
  document.getElementById('tour-box')?.remove();
  document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
}
window._clearTour = _clearTour;
