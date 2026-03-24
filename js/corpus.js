'use strict';
/**
 * js/corpus.js — Quranic Arabic Corpus Tools v2
 * Root search, morphology (FIXED endpoint), concordance,
 * word frequency/occurrence, word clusters, statistics
 */

let _corpusInited = false;

function initCorpus() {
  if (_corpusInited) return;
  _corpusInited = true;
  const pg = document.getElementById('pg-corpus');
  if (!pg) return;
  pg.innerHTML = buildCorpusPage();
}
window.initCorpus = initCorpus;

function buildCorpusPage() {
  return `<div class="corpus-wrap">

  <div class="page-hero">
    <h2> Quranic Arabic Corpus</h2>
    <p>Linguistic tools: root words, morphology, concordance, word frequency, and statistical analysis.</p>
  </div>

  <div class="ai-tabs" role="tablist">
    <button class="ai-tab active" role="tab" onclick="window.corpusTab('root',this)" data-tab="root">Root Search</button>
    <button class="ai-tab" role="tab" onclick="window.corpusTab('morph',this)" data-tab="morph">Morphology</button>
    <button class="ai-tab" role="tab" onclick="window.corpusTab('freq',this)" data-tab="freq">Word Frequency</button>
    <button class="ai-tab" role="tab" onclick="window.corpusTab('conc',this)" data-tab="conc">Concordance</button>
    <button class="ai-tab" role="tab" onclick="window.corpusTab('clusters',this)" data-tab="clusters">Word Clusters</button>
    <button class="ai-tab" role="tab" onclick="window.corpusTab('stats',this)" data-tab="stats">Statistics</button>
  </div>

  <!-- ══ ROOT SEARCH ══ -->
  <div class="ai-panel active" id="corp-root">
    <div class="ai-card">
      <h3>Root Word Search</h3>
      <p>Find all Quranic verses sharing a root. Enter a 3-letter Arabic root or English keyword.</p>
      <div class="ai-form-row">
        <input class="ai-inp" id="root-inp" placeholder="e.g. ص ب ر (patience)" dir="rtl" lang="ar" aria-label="Root"/>
        <input class="ai-inp" id="root-en"  placeholder="English keyword…" dir="ltr"/>
        <button class="ai-sm-btn" onclick="window.corpusRootSearch()">Search</button>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center">
        <span style="font-size:11px;color:var(--t3);font-weight:600">Include:</span>
        <label style="display:flex;align-items:center;gap:5px;font-size:13px;color:var(--t2);cursor:pointer">
          <input type="checkbox" id="root-inc-forms" checked style="accent-color:var(--em)"> All word forms
        </label>
        <label style="display:flex;align-items:center;gap:5px;font-size:13px;color:var(--t2);cursor:pointer">
          <input type="checkbox" id="root-inc-derivatives" checked style="accent-color:var(--em)"> Derivatives
        </label>
        <label style="display:flex;align-items:center;gap:5px;font-size:13px;color:var(--t2);cursor:pointer">
          <input type="checkbox" id="root-inc-hadith" style="accent-color:var(--em)"> Related Hadith
        </label>
      </div>
      <div class="ai-quick-chips">
        <button class="ai-chip" onclick="window.setRootAndSearch('ص ب ر')">ص ب ر (patience)</button>
        <button class="ai-chip" onclick="window.setRootAndSearch('ع ل م')">ع ل م (knowledge)</button>
        <button class="ai-chip" onclick="window.setRootAndSearch('ر ح م')">ر ح م (mercy)</button>
        <button class="ai-chip" onclick="window.setRootAndSearch('ق ر أ')">ق ر أ (read/recite)</button>
        <button class="ai-chip" onclick="window.setRootAndSearch('خ ل ق')">خ ل ق (create)</button>
        <button class="ai-chip" onclick="window.setRootAndSearch('ه د ي')">ه د ي (guidance)</button>
        <button class="ai-chip" onclick="window.setRootAndSearch('ذ ك ر')">ذ ك ر (remember)</button>
        <button class="ai-chip" onclick="window.setRootAndSearch('ت ق و')">ت ق و (piety/taqwa)</button>
      </div>
      <div id="root-out" class="ai-out ai-md-out"></div>
    </div>
  </div>

  <!-- ══ MORPHOLOGY ══ -->
  <div class="ai-panel" id="corp-morph">
    <div class="ai-card">
      <h3>Word Morphology</h3>
      <p>Enter a verse key to see word-by-word grammatical analysis with transliteration.</p>
      <div class="ai-form-row">
        <input class="ai-inp" id="morph-key" placeholder="Verse key e.g. 1:1" aria-label="Verse key"/>
        <button class="ai-sm-btn" onclick="window.corpusMorph()">Analyse</button>
      </div>
      <div class="ai-quick-chips">
        <button class="ai-chip" onclick="document.getElementById('morph-key').value='1:1';corpusMorph()">1:1 Bismillah</button>
        <button class="ai-chip" onclick="document.getElementById('morph-key').value='2:255';corpusMorph()">2:255 Ayatul Kursi</button>
        <button class="ai-chip" onclick="document.getElementById('morph-key').value='112:1';corpusMorph()">112:1 Al-Ikhlas</button>
        <button class="ai-chip" onclick="document.getElementById('morph-key').value='1:2';corpusMorph()">1:2 Al-Hamdulillah</button>
        <button class="ai-chip" onclick="document.getElementById('morph-key').value='36:1';corpusMorph()">36:1 Ya-Sin</button>
      </div>
      <div id="morph-out" class="ai-out"></div>
      <!-- AI deeper analysis -->
      <div id="morph-ai-section" style="display:none;margin-top:12px">
        <button class="ai-sm-btn" onclick="window.corpusMorphAI()" style="font-size:12px;padding:7px 14px"> Deep Grammatical Analysis (AI)</button>
      </div>
      <div id="morph-ai-out" class="ai-out ai-md-out" style="margin-top:8px"></div>
    </div>
  </div>

  <!-- ══ WORD FREQUENCY ══ -->
  <div class="ai-panel" id="corp-freq">
    <div class="ai-card">
      <h3>Word Frequency &amp; Occurrence</h3>
      <p>Explore how often words and roots appear across the Quran — with context and patterns.</p>
      <div class="ai-form-row">
        <input class="ai-inp" id="freq-inp" placeholder="Arabic word or root e.g. الرحمن" dir="rtl" lang="ar"/>
        <input class="ai-inp" id="freq-en"  placeholder="Or English concept…" dir="ltr"/>
        <button class="ai-sm-btn" onclick="window.corpusFrequency()">Analyse</button>
      </div>
      <div class="ai-quick-chips">
        <button class="ai-chip" onclick="window.setFreqAndSearch('الرحمن')">الرحمن (Al-Rahman)</button>
        <button class="ai-chip" onclick="window.setFreqAndSearch('الله')">الله (Allah)</button>
        <button class="ai-chip" onclick="window.setFreqAndSearch('الصلاة')">الصلاة (Salah)</button>
        <button class="ai-chip" onclick="window.setFreqAndSearch('الجنة')">الجنة (Jannah)</button>
        <button class="ai-chip" onclick="window.setFreqAndSearch('النار')">النار (Naar)</button>
        <button class="ai-chip" onclick="window.setFreqAndSearch('الإيمان')">الإيمان (Iman)</button>
      </div>
      <div id="freq-out" class="ai-out ai-md-out"></div>
    </div>
  </div>

  <!-- ══ CONCORDANCE ══ -->
  <div class="ai-panel" id="corp-conc">
    <div class="ai-card">
      <h3>Concordance</h3>
      <p>Find every occurrence of an Arabic word or phrase with contextual examples.</p>
      <div class="ai-form-row">
        <input class="ai-inp" id="conc-inp" placeholder="Arabic word e.g. الرحمن" dir="rtl" lang="ar"/>
        <button class="ai-sm-btn" onclick="window.corpusConcordance()">Find</button>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;align-items:center">
        <span style="font-size:11px;color:var(--t3);font-weight:600">Show:</span>
        <label style="display:flex;align-items:center;gap:5px;font-size:13px;color:var(--t2);cursor:pointer">
          <input type="checkbox" id="conc-all-forms" checked style="accent-color:var(--em)"> All grammatical forms
        </label>
        <label style="display:flex;align-items:center;gap:5px;font-size:13px;color:var(--t2);cursor:pointer">
          <input type="checkbox" id="conc-context" checked style="accent-color:var(--em)"> With context
        </label>
        <label style="display:flex;align-items:center;gap:5px;font-size:13px;color:var(--t2);cursor:pointer">
          <input type="checkbox" id="conc-patterns" style="accent-color:var(--em)"> Usage patterns
        </label>
      </div>
      <div class="ai-quick-chips">
        <button class="ai-chip" onclick="document.getElementById('conc-inp').value='الرحمن';corpusConcordance()">الرحمن</button>
        <button class="ai-chip" onclick="document.getElementById('conc-inp').value='الصبر';corpusConcordance()">الصبر</button>
        <button class="ai-chip" onclick="document.getElementById('conc-inp').value='الجنة';corpusConcordance()">الجنة</button>
        <button class="ai-chip" onclick="document.getElementById('conc-inp').value='التقوى';corpusConcordance()">التقوى</button>
      </div>
      <div id="conc-out" class="ai-out ai-md-out"></div>
    </div>
  </div>

  <!-- ══ WORD CLUSTERS ══ -->
  <div class="ai-panel" id="corp-clusters">
    <div class="ai-card">
      <h3>Semantic Word Clusters</h3>
      <p>Explore related words grouped by concept — or enter your own cluster topic.</p>

      <!-- Custom cluster input -->
      <div style="margin-bottom:16px">
        <div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Custom Cluster</div>
        <div class="ai-form-row">
          <input class="ai-inp" id="cluster-topic-inp" placeholder="e.g. Names of Allah, creation, prophets, angels…"/>
          <select class="rtb-sel" id="cluster-depth" style="font-size:13px;padding:6px 10px">
            <option value="overview">Overview</option>
            <option value="detailed">Detailed</option>
            <option value="scholarly">Scholarly</option>
          </select>
          <button class="ai-sm-btn" onclick="window.corpusCustomCluster()">Explore</button>
        </div>
      </div>

      <div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Preset Clusters</div>
      <div class="ai-quick-chips">
        <button class="ai-chip" onclick="window.corpusWordCluster('names_of_allah')">Names of Allah (99)</button>
        <button class="ai-chip" onclick="window.corpusWordCluster('prayer_terms')">Prayer Terms</button>
        <button class="ai-chip" onclick="window.corpusWordCluster('natural_world')">Natural World</button>
        <button class="ai-chip" onclick="window.corpusWordCluster('human_qualities')">Human Qualities</button>
        <button class="ai-chip" onclick="window.corpusWordCluster('afterlife')">Afterlife Terms</button>
        <button class="ai-chip" onclick="window.corpusWordCluster('prophets')">Prophets in Quran</button>
        <button class="ai-chip" onclick="window.corpusWordCluster('angels')">Angels</button>
        <button class="ai-chip" onclick="window.corpusWordCluster('creation')">Creation Vocabulary</button>
      </div>
      <div id="cluster-out" class="ai-out ai-md-out"></div>
    </div>
  </div>

  <!-- ══ STATISTICS ══ -->
  <div class="ai-panel" id="corp-stats">
    <div class="ai-card">
      <h3> Quran Statistics</h3>
      <p>Numerical facts, structural analysis, and patterns in the Quran.</p>

      <div class="ai-quick-chips" style="margin-bottom:16px">
        <button class="ai-chip active" onclick="window.corpusStats('overview',this)">Overview</button>
        <button class="ai-chip" onclick="window.corpusStats('structure',this)">Structure</button>
        <button class="ai-chip" onclick="window.corpusStats('language',this)">Language</button>
        <button class="ai-chip" onclick="window.corpusStats('revelation',this)">Revelation</button>
        <button class="ai-chip" onclick="window.corpusStats('names',this)">Names of Allah</button>
        <button class="ai-chip" onclick="window.corpusStats('numbers',this)">Sacred Numbers</button>
      </div>

      <!-- Verified Quran statistics grid -->
      <div id="stats-grid" class="qs-grid">
        ${[
          { val:'6,236',      lbl:'Total Verses',       color:'var(--em2)',  note:'Ayahs' },
          { val:'114',        lbl:'Surahs',             color:'var(--gd)',   note:'Chapters' },
          { val:'30',         lbl:'Juz',                color:'var(--em2)',  note:'Parts' },
          { val:'604',        lbl:'Mushaf Pages',       color:'var(--gd)',   note:'Uthmani' },
          { val:'77,430',     lbl:'Total Words',        color:'var(--em2)',  note:'Arabic' },
          { val:'323,671',    lbl:'Total Letters',      color:'var(--gd)',   note:'Counted' },
          { val:'86',         lbl:'Makki Surahs',       color:'var(--em2)',  note:'Meccan' },
          { val:'28',         lbl:'Madani Surahs',      color:'var(--gd)',   note:'Medinan' },
          { val:'15',         lbl:'Sajdah Verses',      color:'var(--em2)',  note:'Prostration' },
          { val:'2,698',      lbl:'Allah Mentions',     color:'var(--gd)',   note:'ٱللَّه' },
          { val:'99',         lbl:'Names of Allah',     color:'var(--em2)',  note:'Asma ul Husna' },
          { val:'25',         lbl:'Prophets Named',     color:'var(--gd)',   note:'In Quran' },
          { val:'Al-Baqarah', lbl:'Longest Surah',      color:'var(--em3)',  note:'286 ayahs' },
          { val:'Al-Kawthar', lbl:'Shortest Surah',     color:'var(--gd2)',  note:'3 ayahs' },
        ].map(s=>`
          <div class="qs-card">
            <div class="qs-val" style="color:${s.color}">${s.val}</div>
            <div class="qs-lbl">${s.lbl}</div>
            <div class="qs-note">${s.note}</div>
          </div>`).join('')}
      </div>

      <!-- Top surahs by verse count - always visible, no AI needed -->
      <div class="qs-bar-chart">
        <h4 style="font-size:14px;font-weight:700;color:var(--t2);margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid var(--bd)"> Top 20 Surahs by Verse Count</h4>
        ${[
          {name:'Al-Baqarah',  v:286, c:'var(--gd)' },
          {name:"Ali 'Imran",  v:200, c:'var(--em2)'},
          {name:"Al-A'raf",    v:206, c:'var(--em2)'},
          {name:'An-Nisa',     v:176, c:'var(--em2)'},
          {name:"Ash-Shu'ara", v:227, c:'var(--gd)' },
          {name:'Al-Anbiya',   v:112, c:'var(--em2)'},
          {name:'At-Tawbah',   v:129, c:'var(--gd)' },
          {name:'An-Nahl',     v:128, c:'var(--em2)'},
          {name:'Hud',         v:123, c:'var(--gd)' },
          {name:'Yusuf',       v:111, c:'var(--em2)'},
          {name:'Al-Kahf',     v:110, c:'var(--gd)' },
          {name:'Ta-Ha',       v:135, c:'var(--em2)'},
          {name:'Al-Isra',     v:111, c:'var(--gd)' },
          {name:'Al-Muminun',  v:118, c:'var(--em2)'},
          {name:'As-Saffat',   v:182, c:'var(--gd)' },
          {name:'Ghafir',      v:85,  c:'var(--em2)'},
          {name:'Az-Zukhruf',  v:89,  c:'var(--gd)' },
          {name:'Maryam',      v:98,  c:'var(--em2)'},
          {name:'Al-Qasas',    v:88,  c:'var(--gd)' },
          {name:'Al-Anfal',    v:75,  c:'var(--em2)'},
        ].map((s,i)=>`
          <div class="qs-bar-row">
            <div class="qs-bar-name">${s.name}</div>
            <div class="qs-bar-track">
              <div class="qs-bar-fill" style="width:${Math.round(s.v/286*100)}%;background:${s.c}"></div>
            </div>
            <div class="qs-bar-count">${s.v}</div>
          </div>`).join('')}
      </div>      <div id="stats-out" class="ai-out ai-md-out"></div>
    </div>
  </div>

</div>`;
}

/* ── Tab switching ── */
function corpusTab(tab, btn) {
  document.querySelectorAll('#pg-corpus .ai-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('#pg-corpus .ai-tab').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
  document.getElementById('corp-'+tab)?.classList.add('active');
  if (btn) { btn.classList.add('active'); btn.setAttribute('aria-selected','true'); }
  if (window.G && G.view === 'corpus' && window.replaceURL) replaceURL('corpus', { tab: tab });
}
window.corpusTab = corpusTab;

/* ── Root search ── */
function setRootAndSearch(root) {
  const inp = document.getElementById('root-inp'); if (inp) inp.value = root;
  corpusRootSearch();
}
window.setRootAndSearch = setRootAndSearch;

async function corpusRootSearch() {
  const root   = document.getElementById('root-inp')?.value.trim();
  const enKw   = document.getElementById('root-en')?.value.trim();
  const incH   = document.getElementById('root-inc-hadith')?.checked;
  const query  = root || enKw;
  if (!query) { showToast('Enter a root or keyword'); return; }
  const out = document.getElementById('root-out'); if (!out) return;
  setOutLoading(out);
  try {
    const d = await callAIBackend([{role:'user', content:
      `Analyse the Arabic root "${query}" in the Quran.

## Root: ${query}
Provide:
**1. Root Meaning**
The trilateral root letters, base meaning, and morphological pattern.

**2. Word Forms in the Quran**
List the main derivative words, their grammatical form, and meaning.

**3. Key Quranic Verses**
List 5-7 important verses using this root (verify the verse keys are accurate):
For each: **[Surah:Ayah]** — brief explanation of how the root is used.

**4. Semantic Development**
How does the meaning shift across different verbal forms (Form I, II, IV etc.)?

**5. Related Roots**
2-3 semantically related roots with brief comparison.

${incH ? `**6. Related Hadith**\nOne authentic hadith using this root — cite properly.` : ''}

 Only cite real Quranic verses. Do not guess verse numbers.`
    }]);
    renderCorpusOutput(out, d.text||'', query);
  } catch(e) {
    out.innerHTML = `<p style="color:var(--red)"> ${e.message||'Error'}</p>`;
  }
}
window.corpusRootSearch = corpusRootSearch;

/* ── Morphology (FIXED: uses by_key not by_ayah) ── */
let _lastMorphKey = '';

async function corpusMorph() {
  const key = document.getElementById('morph-key')?.value.trim();
  if (!key) { showToast('Enter a verse key (e.g. 2:255)'); return; }
  _lastMorphKey = key;
  const out = document.getElementById('morph-out'); if (!out) return;
  out.innerHTML = '<div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>';
  out.classList.add('show');
  document.getElementById('morph-ai-section').style.display='none';
  document.getElementById('morph-ai-out').classList.remove('show');

  try {
    // FIXED: correct endpoint is /verses/by_key/{key}
    const d = await apiFetch(`/verses/by_key/${key}?words=true&word_fields=text_uthmani,transliteration,translation`);
    const v = d.verse;
    if (!v) { out.innerHTML = '<p style="color:var(--t3)">Verse not found. Check the key format (e.g. 2:255).</p>'; return; }

    const words = (v.words || []).filter(w => w.char_type_name !== 'end');
    const wordsHtml = words.map(w => `
      <div style="display:inline-block;text-align:center;padding:10px 12px;margin:4px;
        background:var(--sf2);border:1px solid var(--bd);border-radius:10px;min-width:64px;
        vertical-align:top;transition:background .15s;cursor:default"
        onmouseover="this.style.background='var(--em-dim)'"
        onmouseout="this.style.background='var(--sf2)'"
        title="${(w.transliteration?.text||'')} — ${(w.translation?.text||'')}">
        <div style="font-family:var(--font-ar);font-size:22px;color:var(--t1);direction:rtl;line-height:1.8">${w.text_uthmani||''}</div>
        <div style="font-size:9.5px;color:var(--gd);margin-top:3px;font-weight:600">${(w.transliteration?.text||'').slice(0,22)}</div>
        <div style="font-size:9px;color:var(--t3);margin-top:1px">${(w.translation?.text||'').slice(0,20)}</div>
      </div>`).join('');

    out.innerHTML = `
      <div style="font-family:var(--font-ar);font-size:26px;text-align:right;direction:rtl;
        color:var(--t1);margin-bottom:14px;line-height:2;padding:12px;
        background:var(--sf2);border-radius:8px;border:1px solid var(--bd)">
        ${v.text_uthmani||''}
      </div>
      <div style="font-size:12px;color:var(--t3);margin-bottom:10px">${words.length} word${words.length!==1?'s':''} · Hover for details</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end;direction:rtl;margin-bottom:14px">${wordsHtml}</div>
      <a href="https://corpus.quran.com/wordbyword.jsp?chapter=${key.split(':')[0]}&verse=${key.split(':')[1]}"
        target="_blank" rel="noopener"
        style="color:var(--em2);font-size:12px;font-weight:600;display:inline-block;margin-top:4px">
        → Full morphological analysis on corpus.quran.com</a>`;
    document.getElementById('morph-ai-section').style.display='block';
  } catch(e) {
    out.innerHTML = `<p style="color:var(--red)"> ${e.message||'Could not load verse'}. Try format: 2:255</p>`;
  }
}
window.corpusMorph = corpusMorph;

async function corpusMorphAI() {
  if (!_lastMorphKey) return;
  const out = document.getElementById('morph-ai-out'); if (!out) return;
  setOutLoading(out);
  try {
    const d = await callAIBackend([{role:'user', content:
      `Provide a detailed grammatical analysis of Quran ${_lastMorphKey}.

For each word in the verse:
- Arabic word [AR: ...]
- Transliteration
- Part of speech (noun/verb/particle etc.)
- Root letters
- Grammatical form and case
- Translation

Then explain any notable linguistic features, rhetorical devices (balaghah), or grammatical points of significance in this verse.

If you are uncertain about any specific grammatical detail, indicate that.`
    }]);
    out.innerHTML = '<p style="margin:0">' + renderMD(d.text||'') + '</p>';
    out.classList.add('show');
  } catch(e) {
    out.innerHTML = `<p style="color:var(--red)"> ${e.message}</p>`; out.classList.add('show');
  }
}
window.corpusMorphAI = corpusMorphAI;

/* ── Word Frequency ── */
function setFreqAndSearch(word) {
  const inp = document.getElementById('freq-inp'); if (inp) inp.value = word;
  corpusFrequency();
}
window.setFreqAndSearch = setFreqAndSearch;

async function corpusFrequency() {
  const word = document.getElementById('freq-inp')?.value.trim();
  const enKw = document.getElementById('freq-en')?.value.trim();
  const query = word || enKw;
  if (!query) { showToast('Enter a word or concept'); return; }
  const out = document.getElementById('freq-out'); if (!out) return;
  setOutLoading(out);
  try {
    const d = await callAIBackend([{role:'user', content:
      `Analyse the frequency and distribution of "${query}" in the Quran.

## Frequency Analysis of "${query}"

**Total Occurrences:**
How many times does this word (and its forms) appear? Give the exact count if known, or a scholarly estimate.

**Distribution by Surah Type:**
How does it appear in Meccan vs. Medinan surahs? What does this pattern suggest?

**Most Significant Occurrences:**
List 5 most theologically significant verses where this word appears, with verse keys:
For each: **[Key]** — significance of this specific usage

**Grammatical Forms:**
What forms does this word take (singular/plural, definite/indefinite, verb forms)?

**Semantic Range:**
How does the meaning vary across different contexts?

**Notable Patterns:**
Any structural or numerical patterns scholars have noted?

 Be precise about numbers — if uncertain, say "approximately" rather than giving a wrong figure.`
    }]);
    renderCorpusOutput(out, d.text||'', query);
  } catch(e) {
    out.innerHTML = `<p style="color:var(--red)"> ${e.message}</p>`; out.classList.add('show');
  }
}
window.corpusFrequency = corpusFrequency;

/* ── Concordance ── */
async function corpusConcordance() {
  const word = document.getElementById('conc-inp')?.value.trim();
  if (!word) { showToast('Enter an Arabic word'); return; }
  const allForms  = document.getElementById('conc-all-forms')?.checked;
  const patterns  = document.getElementById('conc-patterns')?.checked;
  const out = document.getElementById('conc-out'); if (!out) return;
  setOutLoading(out);
  try {
    const d = await callAIBackend([{role:'user', content:
      `Create a concordance for the Arabic word "${word}" in the Quran.

**Total Count:**
How many times does this word appear? (${allForms ? 'Include all grammatical forms' : 'Exact form only'})

**Key Occurrences (list 6-8 verses):**
For each occurrence: **[Surah:Ayah]** — Surah name — brief context

${patterns ? `**Usage Patterns:**
What contextual patterns emerge? When is this word used vs. synonyms?` : ''}

**Theological Significance:**
What do classical scholars say about the importance of this word in the Quran?

**Corpus.quran.com Reference:**
Remind the user they can search the full concordance at corpus.quran.com

 Only list real verse references you are confident about.`
    }]);
    renderCorpusOutput(out, d.text||'', word);
  } catch(e) {
    out.innerHTML = `<p style="color:var(--red)"> ${e.message}</p>`; out.classList.add('show');
  }
}
window.corpusConcordance = corpusConcordance;

/* ── Word Clusters ── */
const CLUSTERS = {
  names_of_allah: 'the 99 Names of Allah (Asma ul Husna) — each name, its Arabic, meaning, and key Quranic verse',
  prayer_terms:   "Salah vocabulary: Wudu, Qibla, Rak'ah, Sujud, Ruku, Tashahhud, Khushu — their Quranic usage",
  natural_world:  'Natural world: Sama (sky), Ard (earth), Bahar (sea), Nahr (river), Shams (sun), Qamar (moon), Najm (star)',
  human_qualities:"Human spiritual qualities: Sabr, Shukr, Tawadu, Ikhlas, Tawakkul, Sidq — their Quranic roots",
  afterlife:      "Afterlife vocabulary: Akhirah, Jannah, Jahannam, Ba'th, Hisab, Sirat, Mizan, Kitab — with key verses",
  prophets:       'Prophets mentioned in the Quran: their names in Arabic, how many times mentioned, key stories',
  angels:         'Angels in the Quran: Jibril, Mikail, Israfil, Malik, Munkar, Nakir — their roles and mentions',
  creation:       'Creation vocabulary: Khalaqa, Ja\'ala, Fatara, Bada\'a — different words for creation and their nuances',
};

async function corpusWordCluster(key) {
  const topic = CLUSTERS[key];
  const depth = 'detailed';
  await _runCluster(topic, depth);
}
window.corpusWordCluster = corpusWordCluster;

async function corpusCustomCluster() {
  const topic = document.getElementById('cluster-topic-inp')?.value.trim();
  if (!topic) { showToast('Enter a cluster topic'); return; }
  const depth = document.getElementById('cluster-depth')?.value || 'overview';
  await _runCluster(topic, depth);
}
window.corpusCustomCluster = corpusCustomCluster;

async function _runCluster(topic, depth) {
  const out = document.getElementById('cluster-out'); if (!out) return;
  setOutLoading(out);
  try {
    const d = await callAIBackend([{role:'user', content:
      `Create a ${depth} semantic word cluster for the concept: "${topic}" in the Quran.

For each key word in this cluster:
**[Arabic: Arabic text]** — Transliteration — English meaning
- Root letters
- How many times it appears (approximate)
- Key verse: [Surah:Ayah] with brief context

Then provide:
## Theological Coherence
How do these words form a unified Quranic concept? What is the deeper meaning when understood together?

## Structural Insight
Any notable linguistic or rhetorical relationships between these terms?

Only include words that genuinely appear in the Quran. Do not invent occurrences.`
    }]);
    renderCorpusOutput(out, d.text||'', topic);
  } catch(e) {
    out.innerHTML = `<p style="color:var(--red)"> ${e.message}</p>`; out.classList.add('show');
  }
}

/* ── Statistics ── */
async function corpusStats(topic, btn) {
  /* BUG-32 fix: was using implicit global `event.target` — unreliable in strict mode.
     onclick now passes `this` explicitly: onclick="window.corpusStats('overview',this)" */
  document.querySelectorAll('#corp-stats .ai-chip').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const out = document.getElementById('stats-out'); if (!out) return;
  setOutLoading(out);

  const prompts = {
    overview:  'Provide verified, well-known statistical facts about the Quran — number of surahs, verses, words, letters, juz, sajdahs, etc. Only state facts that are agreed upon by classical scholars. Note any scholarly differences in counts.',
    structure:  'Describe the structural composition of the Quran: number of Meccan vs Medinan surahs, longest/shortest surah, the 7 Mathani, the Mufassal surahs, and other structural classifications used by classical scholars.',
    language:   'Discuss the linguistic features of the Quran: the number of unique Arabic roots used, foreign vocabulary (al-muarrabat), hapax legomena, rhetorical figures used (balaghah), and other linguistic statistical facts.',
    revelation: 'Provide verified information about the Revelation order: which surah was revealed first, the timeline of revelation, the two Revelations periods (Meccan/Medinan), and the compilation under Uthman ibn Affan (ra).',
    names:      'List all 99 Names of Allah (Asma ul Husna) as they appear in the Quran, with their Arabic [AR: ...] and English meanings. Group them by theme (Mercy, Power, Knowledge, etc.).',
    numbers:    'Discuss significant numbers in the Quran that scholars have studied: the number 19 theory (Al-Rashad Khalifa controversy and mainstream scholarly response), numerical patterns, and what classical scholarship says about mathematical aspects of the Quran. Be balanced and scholarly.',
  };

  try {
    const d = await callAIBackend([{role:'user', content: prompts[topic]||prompts.overview}]);
    out.innerHTML = '<p style="margin:0">' + renderMD(d.text||'') + '</p>';
    out.classList.add('show');
  } catch(e) {
    out.innerHTML = `<p style="color:var(--red)"> ${e.message}</p>`; out.classList.add('show');
  }
}
window.corpusStats = corpusStats;

/* ── Shared output renderer ── */
function renderCorpusOutput(el, text, query) {
  el.innerHTML =
    `<div style="margin-bottom:10px">
      <a href="https://corpus.quran.com/search.jsp?q=${encodeURIComponent(query)}"
        target="_blank" rel="noopener"
        style="color:var(--em2);font-size:12px;font-weight:600">
        → Full results on corpus.quran.com</a>
    </div>` +
    '<p style="margin:0">' + renderMD(text) + '</p>';
  el.classList.add('show');
}
