
/* Fix #12: Strip Arabic diacritics (tashkeel) for search comparison */
function normalizeAr(s) {
  return (s || '').replace(/[ً-ٟؐ-ؚٰ]/g, '').replace(/[آأإ]/g, 'ا').trim();
}

'use strict';
/**
 * js/search.js — Live Search
 * Chapter names, verse keys (2:255), full-text via API
 * BUG-03 fix: single heroKD definition (removed duplicate from index.html)
 */

let _searchTimer = null;

function handleSearch(query, dropId) {
  const drop = document.getElementById(dropId);
  if (!drop) return;
  clearTimeout(_searchTimer);

  const q = query.trim().toLowerCase();
  if (!q) { drop.classList.remove('open'); return; }

  /* Instant: verse key pattern e.g. 2:255 */
  if (/^\d+:\d*$/.test(q.replace(/\s/g, ''))) {
    const [ch, v] = q.split(':').map(s => s.trim());
    const chapter = G.chapters.find(c => String(c.id) === ch);
    if (chapter) {
      const items = [];
      if (v) {
        const vn = parseInt(v);
        if (vn >= 1 && vn <= chapter.verses_count)
          items.push({
            type: 'verse', key: `${ch}:${v}`,
            label: `${chapter.name_simple} ${ch}:${v}`,
            sub: chapter.translated_name.name,
            num: ch,
          });
      }
      items.push({ type: 'chapter', id: chapter.id, label: chapter.name_simple, sub: chapter.translated_name.name, ar: chapter.name_arabic });
      renderDrop(drop, items);
      return;
    }
  }

  /* Instant: chapter name / number */
  const qNorm = normalizeAr(q);
  const local = G.chapters.filter(ch =>
    ch.name_simple.toLowerCase().includes(q) ||
    ch.translated_name.name.toLowerCase().includes(q) ||
    normalizeAr(ch.name_arabic).includes(qNorm) ||
    String(ch.id) === q
  ).slice(0, 8);

  if (local.length) {
    renderDrop(drop, local.map(ch => ({
      type: 'chapter', id: ch.id,
      label: ch.name_simple, sub: ch.translated_name.name, ar: ch.name_arabic,
    })));
  } else {
    drop.innerHTML = '<div class="drop-row drop-searching">Searching…</div>';
    drop.classList.add('open');
  }

  /* Debounced full-text search */
  _searchTimer = setTimeout(async () => {
    try {
      const d = await apiFetch(`/search?q=${encodeURIComponent(q)}&size=6&language=en&translations=${G.translation}`);
      const results = (d.search?.results || []).slice(0, 6);
      if (!results.length) {
        drop.innerHTML = '<div class="drop-row"><span style="color:var(--t3);font-size:12px">No results found</span></div>';
        drop.classList.add('open');
        return;
      }
      renderDrop(drop, results.map(r => ({
        type: 'verse',
        key: r.verse_key,
        label: r.verse_key,
        sub: (r.translations?.[0]?.text || '').replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').slice(0, 70) + '…',
        num: String(parseInt(r.verse_key)),
      })));
    } catch { /* ignore search errors silently */ }
  }, 400);
}
window.handleSearch = handleSearch;

function renderDrop(drop, items) {
  if (!items.length) { drop.classList.remove('open'); return; }
  drop.innerHTML = items.map(item => {
    if (item.type === 'chapter') return `
      <div class="drop-row" onclick="window.openChapter(${item.id})" role="option" tabindex="0">
        <div class="drop-ic">${item.id}</div>
        <div class="drop-text">
          <div class="drop-main">${item.label}</div>
          <div class="drop-sub">${item.sub}</div>
        </div>
        <div class="drop-ar">${item.ar || ''}</div>
      </div>`;
    return `
      <div class="drop-row" onclick="window.jumpToVerse('${item.key}')" role="option" tabindex="0">
        <div class="drop-ic" style="font-size:11px">${item.key}</div>
        <div class="drop-text">
          <div class="drop-main">${item.label}</div>
          <div class="drop-sub">${item.sub}</div>
        </div>
      </div>`;
  }).join('');
  drop.classList.add('open');
}
window.renderDrop = renderDrop;

/**
 * Keyboard navigation for search dropdowns.
 * BUG-03 fix: single definition here only — removed duplicate from index.html.
 */
function searchKeyNav(e, dropId) {
  const drop = document.getElementById(dropId);
  if (!drop?.classList.contains('open')) return;

  const rows = drop.querySelectorAll('.drop-row');
  const curr = drop.querySelector('.drop-row:focus');

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    (curr ? curr.nextElementSibling || rows[0] : rows[0])?.focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    (curr ? curr.previousElementSibling || rows[rows.length - 1] : rows[rows.length - 1])?.focus();
  } else if (e.key === 'Enter' && curr) {
    curr.click();
  } else if (e.key === 'Escape') {
    drop.classList.remove('open');
    e.target.blur();
  }
}
window.searchKeyNav = searchKeyNav;

/* Close dropdowns on outside click */
document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap') && !e.target.closest('.hero-search')) {
    document.querySelectorAll('.drop').forEach(d => d.classList.remove('open'));
  }
});
