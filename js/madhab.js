'use strict';
/**
 * js/madhab.js — Islamic Schools of Thought & Pathway Guide v1
 *
 * PURPOSE: Educational, non-biased presentation of Islamic scholarly
 * diversity. Shows what each madhab says, where they agree, where they
 * differ, and why — without declaring any one madhab "correct".
 *
 * PRINCIPLE: "Difference of opinion within the Ummah is a mercy."
 * (Attributed in classical scholarship — discussed in Jami' al-Bayan)
 *
 * Sources: Fiqh al-Islam wa Adillatuhu (Zuhayli), Al-Fiqh 'ala
 * al-Madhahib al-Arba'a (Jaziri), Reliance of the Traveller (Nuh Keller),
 * Bidayat al-Mujtahid (Ibn Rushd).
 */

/* ═══════════════════════════════════════════════
   SCHOOLS DATA
═══════════════════════════════════════════════ */
const SCHOOLS = [
  {
    id:       'hanafi',
    name:     'Hanafi',
    arabic:   'الحنفية',
    founder:  'Imam Abu Hanifa al-Nu\'man ibn Thabit (699–767 CE / 80–150 AH)',
    region:   'Turkey, Central Asia, South Asia, Egypt, Iraq, Levant',
    followers:'~35% of Sunni Muslims (largest school)',
    tagline:  'Known for ra\'y (reasoned opinion) and maslaha (public interest)',
    color:    '#2d8653',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
    bio: `Abu Hanifa is widely considered the "Great Imam" (al-Imam al-A'zam). He founded a systematic legal methodology that gave significant weight to qiyas (analogical reasoning) and istihsan (juristic preference). His school became the official madhab of the Ottoman Empire and remains dominant across South Asia and Central Asia.`,
    usul: [
      'Quran (primary)',
      'Sunnah (with strict hadith authentication criteria)',
      'Ijma\' (consensus of Companions)',
      'Qiyas (analogical reasoning)',
      'Istihsan (juristic preference over strict analogy)',
      'Urf (custom of a region when not contradicting text)',
    ],
    strengths: 'Highly systematic; strong on commercial law and civil transactions; adaptable to diverse cultures through urf.',
    recommended_for: 'Those in South Asia, Turkey, or Central Asian Muslim communities; those who value systematic jurisprudence.',
  },
  {
    id:       'maliki',
    name:     'Maliki',
    arabic:   'المالكية',
    founder:  'Imam Malik ibn Anas (711–795 CE / 93–179 AH)',
    region:   'North Africa, West Africa, Gulf states, parts of Sudan & Egypt',
    followers:'~25% of Sunni Muslims',
    tagline:  'Known for the practice of the people of Madinah as a living Sunnah',
    color:    '#c8a04a',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`,
    bio: `Imam Malik authored Al-Muwatta\', the earliest surviving hadith collection and legal work. His unique contribution was treating the consensus practice (amal) of the people of Madinah — the city of the Prophet ﷺ — as a form of living Sunnah, arguing their transmitted practice was more reliable than individual hadith narrations.`,
    usul: [
      'Quran',
      'Sunnah',
      'Ijma\' of the people of Madinah (unique weight)',
      'Qiyas',
      'Maslaha mursala (unrestricted public interest)',
      'Sadd al-dhara\'i (blocking means to harm)',
      'Urf and customs of Madinah',
    ],
    strengths: 'Rich in hadith preservation; strong on social and family law; maslaha provides flexibility for novel situations.',
    recommended_for: 'Those from North or West Africa, or those who value the preserved practice of Madinah.',
  },
  {
    id:       'shafii',
    name:     'Shafi\'i',
    arabic:   'الشافعية',
    founder:  'Imam Muhammad ibn Idris al-Shafi\'i (767–820 CE / 150–204 AH)',
    region:   'East Africa, Southeast Asia, parts of Egypt, Levant, Hijaz',
    followers:'~28% of Sunni Muslims',
    tagline:  'Known for systematising usul al-fiqh (principles of jurisprudence)',
    color:    '#5b8dee',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>`,
    bio: `Imam al-Shafi\'i is considered the father of usul al-fiqh. His Risala was the first systematic treatise on Islamic legal methodology. Trained under both Imam Malik and students of Abu Hanifa, he synthesised and critiqued both schools. He emphasised the Sunnah as decisive, limiting the role of mere opinion or regional practice.`,
    usul: [
      'Quran',
      'Sunnah (with strict emphasis — narrated Sunnah over regional practice)',
      'Ijma\' (scholarly consensus)',
      'Qiyas (analogical reasoning)',
    ],
    strengths: 'Most systematic and principled methodology; widely studied in Islamic universities; strong on ibadah (worship) law.',
    recommended_for: 'Those in Southeast Asia, East Africa; students of Islamic jurisprudence; those seeking a well-documented approach.',
  },
  {
    id:       'hanbali',
    name:     'Hanbali',
    arabic:   'الحنبلية',
    founder:  'Imam Ahmad ibn Hanbal (780–855 CE / 164–241 AH)',
    region:   'Arabian Peninsula (dominant in Saudi Arabia, Qatar), parts of Syria & Iraq',
    followers:'~5% of Sunni Muslims (but highly influential)',
    tagline:  'Known for adherence to narrated texts and caution with ra\'y',
    color:    '#e8874c',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    bio: `Imam Ahmad was a great hadith scholar — his Musnad contains ~30,000 narrations. He resisted adopting ra\'y (opinion) and preferred weak hadith over analogical reasoning where possible. He faced severe persecution during the Mu\'tazilite inquisition (Mihna) for refusing to declare the Quran created, becoming a symbol of Sunni orthodoxy.`,
    usul: [
      'Quran',
      'Sunnah (even weak hadith preferred over qiyas)',
      'Fatwas of Companions (especially senior ones)',
      'Weak hadith (when no stronger evidence exists)',
      'Qiyas (only when necessary)',
    ],
    strengths: 'Closest to the transmitted texts; strong scholarly credibility; foundation of much contemporary Salafi scholarship.',
    recommended_for: 'Those on the Arabian Peninsula; those who prefer staying strictly with transmitted narrations.',
  },
  {
    id:       'jafari',
    name:     'Ja\'fari (Twelver Shia)',
    arabic:   'الجعفرية',
    founder:  'Imam Ja\'far al-Sadiq (702–765 CE / 83–148 AH)',
    region:   'Iran, Iraq, Lebanon, Bahrain, parts of Pakistan & India',
    followers:'Majority of Shia Muslims (~10–15% of all Muslims)',
    tagline:  'Known for the authority of the Imams as a source of law alongside Quran and Sunnah',
    color:    '#9b6ee8',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>`,
    bio: `The Ja\'fari school is named after Imam Ja\'far al-Sadiq, the sixth Imam according to Twelver belief, who was a major legal and theological teacher. Like Imam Malik and Abu Hanifa, many classical scholars studied under him. The school differs primarily in its sources of authority: the rulings of the twelve Imams carry binding weight alongside Quran and hadith.`,
    usul: [
      'Quran',
      'Sunnah of the Prophet ﷺ (via Ahl al-Bayt chains)',
      'Teachings of the twelve Imams (binding authority)',
      'Ijma\' (consensus among Shia scholars)',
      '\'Aql (reason — given higher methodological weight than in Sunni schools)',
    ],
    strengths: 'Rich tradition in theology (kalam), philosophy, and ethics; strong community cohesion; significant scholarship.',
    recommended_for: 'Shia Muslims and those from Iran, Iraq, Lebanon, Bahrain.',
  },
  {
    id:       'ibadi',
    name:     'Ibadi',
    arabic:   'الإباضية',
    founder:  'Abdullah ibn Ibad al-Murri (7th century CE) and Jabir ibn Zayd',
    region:   'Oman (majority), parts of Libya, Algeria (Mzab), Tanzania (Zanzibar)',
    followers:'~1–2% of Muslims worldwide',
    tagline:  'The oldest surviving Islamic school, distinct from both Sunni and Shia',
    color:    '#4caf7a',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/></svg>`,
    bio: `The Ibadi school predates the Sunni–Shia split and considers itself a moderate middle path. It developed from the early Khawarij movement but explicitly disavows extremist positions. Ibadis emphasise quietism, scholarship, and moderate governance. Oman's legal system is largely based on Ibadi fiqh. Jabir ibn Zayd, a close Companion associate, is considered the real intellectual founder.`,
    usul: [
      'Quran',
      'Sunnah',
      'Scholarly consensus (with distinct chains from Basra)',
      'Qiyas',
    ],
    strengths: 'Preserved unique early Islamic scholarship; strong on environmental ethics and governance; non-sectarian in practice.',
    recommended_for: 'Those from Oman or Zanzibar; those interested in pre-sectarian Islam.',
  },
];
window.SCHOOLS = SCHOOLS;

/* ═══════════════════════════════════════════════
   KEY TOPIC COMPARISONS
   Each topic shows what the schools say + where
   there is agreement vs scholarly disagreement.
═══════════════════════════════════════════════ */
const TOPIC_COMPARISONS = [
  {
    id:    'prayer-times',
    title: 'Prayer Times & Fajr',
    quran: '4:103',
    summary: 'There is scholarly consensus on 5 daily prayers. Differences exist on the precise definition of astronomical dawn (Fajr) and dusk (Isha).',
    agreed: 'Five daily prayers are obligatory. Times are determined by sun position.',
    positions: [
      { school:'hanafi',  view:'Fajr at 18° below horizon. Isha at 18°. Has a unique ruling for extreme latitudes using proportional time.' },
      { school:'maliki',  view:'Fajr at nautical dawn (~18°). Isha when red twilight disappears.' },
      { school:'shafii',  view:'Fajr when true dawn whiteness spreads horizontally. Isha when red glow disappears.' },
      { school:'hanbali', view:'Similar to Shafi\'i. Fajr at true dawn, not the first false dawn.' },
      { school:'jafari',  view:'Isha can follow Maghrib directly; combining prayers is more broadly permitted than in Sunni schools.' },
    ],
    note: 'The variation in Fajr/Isha definitions leads to different prayer timetables. ISNA (18°) and UIOF (15°) represent different scholarly bodies applying these principles.',
  },
  {
    id:    'wudu',
    title: 'Wudu (Ablution) — What Breaks It',
    quran: '5:6',
    summary: 'All schools agree wudu is required for prayer and is broken by urination, defecation and passing wind. Differences exist in lesser invalidators.',
    agreed: 'Obligatory before prayer. Broken by: urination, defecation, passing wind, sleep lying down.',
    positions: [
      { school:'hanafi',  view:'Also broken by: vomiting a mouthful, bleeding (if flowing), laughing aloud in prayer. Touching a woman does NOT break wudu.' },
      { school:'maliki',  view:'Not broken by touching a woman (unless with desire). Broken by emission of madhy (pre-seminal fluid). Deep sleep breaks wudu regardless of position.' },
      { school:'shafii',  view:'Broken by: touching a woman (skin-to-skin), even without desire. Touching private parts breaks wudu.' },
      { school:'hanbali', view:'Broken by: touching one\'s own private parts with desire. Eating camel meat breaks wudu (strong hadith). Touching a woman generally does not unless with desire.' },
      { school:'jafari',  view:'Not broken by touching women. Vomiting does not break wudu. Sleeping while sitting or briefly does not break it.' },
    ],
    note: 'The Shafi\'i ruling on touching women and the Hanbali ruling on camel meat are often discussed in comparative fiqh. All positions have authentic hadith support.',
  },
  {
    id:    'zakat-nisab',
    title: 'Zakat — Nisab & Calculation',
    quran: '2:267',
    summary: 'Zakat is obligatory at 2.5% of wealth above the nisab threshold held for one lunar year. Differences exist in what assets count and how nisab is calculated.',
    agreed: '2.5% rate on qualifying wealth held for one year. Gold nisab: 85g. Silver nisab: 595g.',
    positions: [
      { school:'hanafi',  view:'Nisab can be calculated using silver value (lower threshold — more inclusive). Business inventory is zakatable at cost price.' },
      { school:'maliki',  view:'Gold nisab preferred. Agricultural produce has its own zakat (ushr). Nisab for livestock is calculated by head count.' },
      { school:'shafii',  view:'Gold nisab. Zakat on trade goods based on market value at year-end.' },
      { school:'hanbali', view:'Uses gold nisab as primary. Detailed rules on livestock zakat follow different thresholds than Hanafi.' },
      { school:'jafari',  view:'Khums (1/5 of surplus income) is an additional obligation unique to Shia fiqh. Standard zakat obligations are broadly similar.' },
    ],
    note: 'Using the silver nisab (Hanafi) results in a lower threshold — meaning more people are obligated to pay. Using gold nisab sets a higher bar. Contemporary scholars debate which benefits the poor more.',
  },
  {
    id:    'music',
    title: 'Music & Singing',
    quran: '31:6',
    summary: 'One of the most discussed topics in contemporary fiqh. There is no explicit Quranic prohibition; scholarly positions vary significantly.',
    agreed: 'Vulgar, sexually explicit lyrics are prohibited across all schools. Unaccompanied nasheeds (Islamic poetry) are broadly permissible.',
    positions: [
      { school:'hanafi',  view:'Musical instruments are generally prohibited (based on hadith). However, some Hanafi scholars permit instruments in limited contexts (duff/drum at weddings). Strong prohibition on frivolous entertainment.' },
      { school:'maliki',  view:'Broadly similar prohibition on instruments. However, the Maliki position on singing is more nuanced — permissible voices with permissible content. Some Maliki scholars permitted instruments in the Maghreb tradition.' },
      { school:'shafii',  view:'Most instruments prohibited. Duff (frame drum) at weddings and \'Eid is explicitly permitted. Scholarly debate on whether prohibition extends to all instruments or only those associated with sin.' },
      { school:'hanbali', view:'Strong prohibition. Imam Ahmad narrated: "Music cultivates hypocrisy in the heart." Modern Salafi scholarship largely follows this. Some Hanbali scholars distinguish types.' },
      { school:'jafari',  view:'Music used for entertainment and dancing gatherings is prohibited. Music in non-frivolous contexts has more scholarly debate.' },
    ],
    note: 'Contemporary scholars like Sheikh Yusuf al-Qaradawi permit music with permissible content. Sheikh Ibn Baz and Ibn Uthaymeen maintained prohibition. This remains one of the most actively debated areas in modern Islamic jurisprudence.',
    sensitive: true,
  },
  {
    id:    'interest-riba',
    title: 'Riba (Interest) & Banking',
    quran: '2:275',
    summary: 'All schools unanimously prohibit riba. Differences exist in defining what constitutes riba and in evaluating modern financial instruments.',
    agreed: 'Pre-Islamic riba al-jahiliyya (compounding loans) is unanimously prohibited. The core prohibition is absolute.',
    positions: [
      { school:'hanafi',  view:'Two types: riba al-fadl (surplus in exchange) and riba al-nasi\'a (delay in exchange). Strong tradition in Islamic commercial law. Developed the concept of bay\' al-murabaha used in modern Islamic banking.' },
      { school:'maliki',  view:'Similar two-type classification. Developed hilah (legal stratagems) to enable certain transactions — more flexible on commercial applications. Generally permits insurance contracts not present in early fiqh.' },
      { school:'shafii',  view:'Detailed rules on ribawi goods (six Prophetically specified items). Modern Islamic banks using Shafi\'i rulings tend toward stricter screening.' },
      { school:'hanbali', view:'Strict on riba. Ibn Taymiyya (Hanbali) criticised certain hiyal as defeating the purpose of the prohibition. OIC Fiqh Academy (Saudi-dominated) takes strict positions.' },
      { school:'jafari',  view:'Prohibition is the same. Shia Iran developed its own interest-free banking framework after 1979, with some differences in specific instruments.' },
    ],
    note: 'Islamic banking is a 20th-century phenomenon. Whether modern Islamic banking products truly avoid riba is itself debated among scholars. This is an area where ijtihad is ongoing.',
  },
  {
    id:    'hijab',
    title: 'Hijab — What Is Required',
    quran: '24:31, 33:59',
    summary: 'All schools consider covering the awrah obligatory for women in prayer and public. Differences exist in what constitutes awrah.',
    agreed: 'Women must cover their awrah. In prayer, the face and hands are excluded from awrah. Modesty in dress is a Quranic obligation.',
    positions: [
      { school:'hanafi',  view:'Awrah for women includes everything except face and hands in public. Feet are awrah. The face veil (niqab) is recommended (mustahabb) but not obligatory for most.' },
      { school:'maliki',  view:'Face and hands are not awrah and need not be covered. However, covering the face is recommended in contexts of fitnah (temptation). Many Maliki scholars in North Africa require covering the face in certain circumstances.' },
      { school:'shafii',  view:'The dominant position: entire body including face and hands is awrah. Niqab is therefore obligatory by the school\'s relied-upon opinion (though a minority Shafi\'i view exempts the face and hands).' },
      { school:'hanbali', view:'Most Hanbali scholars consider the face part of awrah — niqab is obligatory. Ibn Qudama\'s relied-upon position. Modern Saudi scholars largely follow this.' },
      { school:'jafari',  view:'Face and hands are not awrah. Niqab is not obligatory. Hair and body must be covered.' },
    ],
    note: 'The question of niqab (face veil) is among the clearest examples of legitimate scholarly disagreement. None of the schools consider uncovering permissible; the debate is only on the degree of covering required. Scholars on both sides cite authentic evidence.',
  },
  {
    id:    'funeral',
    title: 'Funeral Prayer (Janazah) & Visiting Graves',
    quran: '9:84',
    summary: 'Janazah prayer is a communal obligation (fard kifayah). All schools have similar structures. Differences exist in visiting graves.',
    agreed: 'Janazah prayer is obligatory on the community. The deceased should be buried promptly. Du\'a for the deceased is recommended.',
    positions: [
      { school:'hanafi',  view:'Men and women may visit graves. Du\'a and recitation of Quran at graves is permitted. Elaborate grave structures are disliked.' },
      { school:'maliki',  view:'Visiting graves is Sunnah for men. Women visiting graves is permitted (some disliked). Quranic recitation at graves is accepted.' },
      { school:'shafii',  view:'Visiting graves is recommended for men. Classical Shafi\'i scholars permit reciting Quran at graves with reward reaching the deceased.' },
      { school:'hanbali', view:'Visiting is permitted for men. Ibn Taymiyya and later scholars were strict about what is permissible at graves — building structures or praying toward them is forbidden.' },
      { school:'jafari',  view:'Visiting the graves of the Imams and pious scholars is strongly recommended (ziyara). Significant pilgrimage culture around Imam shrines in Najaf, Karbala, Mashhad.' },
    ],
    note: 'Grave visitation practices are among the most visible points of difference between communities. The debate is theological as well as legal — involving concepts of tawassul (intercession through righteous people).',
  },
];
window.TOPIC_COMPARISONS = TOPIC_COMPARISONS;

/* ═══════════════════════════════════════════════
   PATHWAY QUIZ — helps users understand their
   context without prescribing a madhab
═══════════════════════════════════════════════ */
const PATHWAY_QUESTIONS = [
  {
    id: 'region',
    q:  'Where did you grow up or which Muslim community are you connected to?',
    options: [
      { label:'South Asia (Pakistan, India, Bangladesh)', hint:'Predominantly Hanafi' },
      { label:'North/West Africa (Morocco, Algeria, Senegal)', hint:'Predominantly Maliki' },
      { label:'Southeast Asia (Indonesia, Malaysia)', hint:'Predominantly Shafi\'i' },
      { label:'Arabian Peninsula (Saudi Arabia, UAE, Qatar)', hint:'Predominantly Hanbali/Salafi' },
      { label:'Iran, Iraq, or Shia community', hint:'Predominantly Ja\'fari' },
      { label:'East Africa / Oman', hint:'Shafi\'i or Ibadi' },
      { label:'No particular region / new Muslim', hint:'Explore freely' },
    ],
  },
  {
    id: 'approach',
    q:  'How do you generally approach religious questions?',
    options: [
      { label:'I prefer following scholarly consensus and established tradition' },
      { label:'I want to understand the reasoning and evidence behind rulings' },
      { label:'I follow what my family and community practise' },
      { label:'I try to find what is most authentic to the Prophetic practice' },
      { label:'I prefer flexibility and consideration of modern context' },
    ],
  },
  {
    id: 'priority',
    q:  'What matters most to you in religious practice?',
    options: [
      { label:'Having clear, systematic rules I can apply' },
      { label:'Staying close to the literal transmitted texts' },
      { label:'Understanding the wisdom and purpose behind laws' },
      { label:'Community cohesion and inherited practice' },
      { label:'Accessibility — I\'m still learning' },
    ],
  },
];

/* ═══════════════════════════════════════════════
   UI RENDERING
═══════════════════════════════════════════════ */
let _madhabInited = false;
let _madhabView   = 'schools'; /* 'schools' | 'compare' | 'pathway' | school-id */
let _quizAnswers  = {};
let _selectedTopic = null;

function initMadhab() {
  if (_madhabInited) return;
  _madhabInited = true;
  const pg = document.getElementById('pg-madhab');
  if (!pg) return;
  _renderMadhabPage(pg);
}
window.initMadhab = initMadhab;

function openMadhab() {
  if (window.navigate) navigate('madhab');
}
window.openMadhab = openMadhab;

function _renderMadhabPage(pg) {
  pg.innerHTML = `<div class="mdb-wrap">

    <!-- Header -->
    <div class="mdb-hdr">
      <div class="mdb-hdr-inner">
        <div class="mdb-hdr-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
        </div>
        <div>
          <h2 class="mdb-title">Islamic Schools of Thought</h2>
          <p class="mdb-subtitle">Scholarly diversity is a mercy — understand each path with clarity and respect</p>
        </div>
      </div>
      <div class="mdb-notice">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        This section presents each school's positions accurately and without bias. No school is declared superior. Follow a qualified scholar in your context.
      </div>
    </div>

    <!-- Nav tabs -->
    <div class="mdb-tabs">
      <button class="mdb-tab active" id="mdbt-schools" onclick="window.madhabTab('schools')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
        Schools
      </button>
      <button class="mdb-tab" id="mdbt-compare" onclick="window.madhabTab('compare')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        Compare Topics
      </button>
      <button class="mdb-tab" id="mdbt-pathway" onclick="window.madhabTab('pathway')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/></svg>
        My Pathway
      </button>
    </div>

    <!-- Content area -->
    <div id="mdb-content"></div>

  </div>`;

  _renderSchools();
}

function madhabTab(view) {
  _madhabView = view;
  document.querySelectorAll('.mdb-tab').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('mdbt-' + view);
  if (btn) btn.classList.add('active');
  if (view === 'schools')  _renderSchools();
  if (view === 'compare')  _renderCompare();
  if (view === 'pathway')  _renderPathway();
  if (window.haptic) haptic('light');
}
window.madhabTab = madhabTab;

/* ── Schools overview ── */
function _renderSchools() {
  const el = document.getElementById('mdb-content');
  if (!el) return;
  el.innerHTML = `
    <p class="mdb-intro">
      Islamic jurisprudence (fiqh) developed through centuries of careful scholarship. The four Sunni schools (madhabs) are all considered valid within mainstream Sunni Islam — a scholar of any school is considered to be following the Sunnah. Shia and Ibadi schools represent equally ancient traditions.
    </p>
    <div class="mdb-schools-grid">
      ${SCHOOLS.map(s => `
        <div class="mdb-school-card" onclick="window.openSchoolDetail('${s.id}')" style="--school-color:${s.color}">
          <div class="mdb-sc-top">
            <div class="mdb-sc-icon" style="color:${s.color}">${s.icon}</div>
            <div>
              <div class="mdb-sc-name">${s.name} <span class="mdb-sc-ar" dir="rtl" lang="ar">${s.arabic}</span></div>
              <div class="mdb-sc-tag">${s.tagline}</div>
            </div>
          </div>
          <div class="mdb-sc-region">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/></svg>
            ${s.region}
          </div>
          <div class="mdb-sc-followers">${s.followers}</div>
          <div class="mdb-sc-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>`).join('')}
    </div>
    <div class="mdb-agreement-box">
      <div class="mdb-agreement-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg>
        Points of Complete Agreement Across All Schools
      </div>
      <div class="mdb-agreement-list">
        <div class="mdb-agree-item">Tawhid (Oneness of Allah) — absolute and non-negotiable</div>
        <div class="mdb-agree-item">The Quran is the primary source of law, unchanged and preserved</div>
        <div class="mdb-agree-item">Five daily prayers are obligatory</div>
        <div class="mdb-agree-item">Zakat, Fasting in Ramadan, and Hajj are pillars of Islam</div>
        <div class="mdb-agree-item">Riba (usury) is prohibited</div>
        <div class="mdb-agree-item">Khamr (intoxicants) are prohibited</div>
        <div class="mdb-agree-item">Murder, theft, and oppression are major sins</div>
        <div class="mdb-agree-item">Kindness, justice, and honesty are obligations</div>
      </div>
    </div>`;
}

/* ── School detail ── */
function openSchoolDetail(id) {
  const s = SCHOOLS.find(x => x.id === id);
  if (!s) return;
  const el = document.getElementById('mdb-content');
  if (!el) return;
  if (window.haptic) haptic('light');

  el.innerHTML = `
    <button class="mdb-back-btn" onclick="window._renderSchools()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polyline points="15 18 9 12 15 6"/></svg>
      Back to Schools
    </button>
    <div class="mdb-detail-card" style="--school-color:${s.color}">
      <div class="mdb-detail-hdr">
        <div class="mdb-detail-icon" style="color:${s.color}">${s.icon}</div>
        <div>
          <h3 class="mdb-detail-name">${s.name} <span dir="rtl" lang="ar">${s.arabic}</span></h3>
          <div class="mdb-detail-tag">${s.tagline}</div>
        </div>
      </div>

      <div class="mdb-detail-meta">
        <div class="mdb-dm-item">
          <span class="mdb-dm-lbl">Founder</span>
          <span class="mdb-dm-val">${s.founder}</span>
        </div>
        <div class="mdb-dm-item">
          <span class="mdb-dm-lbl">Primary Regions</span>
          <span class="mdb-dm-val">${s.region}</span>
        </div>
        <div class="mdb-dm-item">
          <span class="mdb-dm-lbl">Followers</span>
          <span class="mdb-dm-val">${s.followers}</span>
        </div>
      </div>

      <p class="mdb-detail-bio">${s.bio}</p>

      <div class="mdb-detail-section">
        <div class="mdb-detail-sec-title">Sources of Law (Usul)</div>
        <ol class="mdb-usul-list">
          ${s.usul.map(u => `<li>${u}</li>`).join('')}
        </ol>
      </div>

      <div class="mdb-detail-section">
        <div class="mdb-detail-sec-title">Known Strengths</div>
        <p class="mdb-detail-text">${s.strengths}</p>
      </div>

      <div class="mdb-detail-rec">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span><strong>Context:</strong> ${s.recommended_for}</span>
      </div>

      <div class="mdb-detail-topics">
        <div class="mdb-detail-sec-title">How This School Stands on Key Topics</div>
        ${TOPIC_COMPARISONS.slice(0,4).map(tp => {
          const pos = tp.positions.find(p => p.school === id);
          return pos ? `<div class="mdb-topic-mini">
            <div class="mdb-tm-title">${tp.title}</div>
            <div class="mdb-tm-view">${pos.view}</div>
          </div>` : '';
        }).join('')}
        <button class="mdb-see-all-btn" onclick="window.madhabTab('compare')">
          See all topic comparisons →
        </button>
      </div>
    </div>`;
}
window.openSchoolDetail  = openSchoolDetail;
window._renderSchools    = _renderSchools;

/* ── Topic comparison ── */
function _renderCompare(topicId) {
  const el = document.getElementById('mdb-content');
  if (!el) return;

  if (topicId) {
    _selectedTopic = topicId;
    const tp = TOPIC_COMPARISONS.find(t => t.id === topicId);
    if (!tp) return;

    el.innerHTML = `
      <button class="mdb-back-btn" onclick="window._renderCompare()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Topics
      </button>
      <div class="mdb-topic-detail">
        <h3 class="mdb-topic-title">${tp.title}</h3>
        ${tp.quran ? `<a class="mdb-topic-quran" onclick="event.preventDefault();window.jumpToVerse&&jumpToVerse('${tp.quran.replace(':','/')}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
          Quran ${tp.quran}
        </a>` : ''}
        <p class="mdb-topic-summary">${tp.summary}</p>
        <div class="mdb-agreed-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
          <span><strong>All schools agree:</strong> ${tp.agreed}</span>
        </div>
        <div class="mdb-positions">
          ${tp.positions.map(pos => {
            const school = SCHOOLS.find(s => s.id === pos.school);
            return school ? `<div class="mdb-position-card" style="--school-color:${school.color}">
              <div class="mdb-pos-hdr">
                <span class="mdb-pos-school" style="color:${school.color}">${school.name}</span>
                <span class="mdb-pos-ar" dir="rtl" lang="ar">${school.arabic}</span>
              </div>
              <p class="mdb-pos-view">${pos.view}</p>
            </div>` : '';
          }).join('')}
        </div>
        ${tp.note ? `<div class="mdb-topic-note">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          ${tp.note}
        </div>` : ''}
        ${tp.sensitive ? `<div class="mdb-sensitive-note">
          This topic involves active scholarly disagreement. Consult a qualified scholar for personal rulings.
        </div>` : ''}
      </div>`;
    return;
  }

  el.innerHTML = `
    <p class="mdb-intro">
      Select a topic to see how each school approaches it — including where they agree and where genuine scholarly disagreement exists.
    </p>
    <div class="mdb-topics-grid">
      ${TOPIC_COMPARISONS.map(tp => `
        <div class="mdb-topic-card" onclick="window._renderCompare('${tp.id}')">
          <div class="mdb-tc-title">${tp.title}</div>
          ${tp.quran ? `<div class="mdb-tc-ref">Quran ${tp.quran}</div>` : ''}
          <div class="mdb-tc-summary">${tp.summary}</div>
          <div class="mdb-tc-agree">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><polyline points="20 6 9 17 4 12"/></svg>
            ${tp.agreed.slice(0,70)}…
          </div>
          ${tp.sensitive ? `<div class="mdb-tc-tag">Actively debated</div>` : ''}
        </div>`).join('')}
    </div>`;
}
window._renderCompare = _renderCompare;

/* ── Pathway guide ── */
function _renderPathway() {
  const el = document.getElementById('mdb-content');
  if (!el) return;
  const saved = window.G ? (ls('mdb_pathway') || '') : '';

  el.innerHTML = `
    <div class="mdb-pathway-wrap">
      <p class="mdb-intro">
        This is not a test — it is a reflection tool. Your context, community and understanding all matter. The result offers suggestions, not religious verdicts. Always follow a qualified scholar for personal rulings.
      </p>

      <div class="mdb-pathway-principle">
        <div class="mdb-pp-title">The Principle of Following a Madhab</div>
        <p>The classical scholars agreed that a Muslim who follows any of the four Sunni schools (or the Ja'fari school for Shia Muslims) is following a valid path. The differences between madhabs are within the mercy of scholarly disagreement — not in matters of creed (aqidah) or the pillars of Islam.</p>
        <p style="margin-top:8px">Ibn Taymiyya said: <em>"The four imams agree on the fundamentals. Their differences are in branches — and this is a mercy."</em></p>
        <p style="margin-top:8px">A Muslim may: follow one madhab consistently, consult scholars from different schools on different matters (talfiq — debated itself), or study fiqh directly. What matters is sincerity, learning, and following qualified knowledge.</p>
      </div>

      <div class="mdb-pathway-questions">
        ${PATHWAY_QUESTIONS.map((q, qi) => `
          <div class="mdb-pq" id="mdb-pq-${qi}">
            <div class="mdb-pq-num">Q${qi+1}</div>
            <div class="mdb-pq-q">${q.q}</div>
            <div class="mdb-pq-opts">
              ${q.options.map((opt, oi) => `
                <button class="mdb-pq-opt${_quizAnswers[q.id]===oi?' selected':''}"
                  onclick="window._quizAnswer('${q.id}',${oi},this)">
                  ${opt.label}
                  ${opt.hint ? `<span class="mdb-opt-hint">${opt.hint}</span>` : ''}
                </button>`).join('')}
            </div>
          </div>`).join('')}
      </div>

      <button class="mdb-pathway-btn" id="mdb-pathway-submit" onclick="window._showPathwayResult()" ${Object.keys(_quizAnswers).length < PATHWAY_QUESTIONS.length ? 'disabled' : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/></svg>
        Show My Pathway Suggestions
      </button>
      <div id="mdb-pathway-result"></div>
    </div>`;
}
window._renderPathway = _renderPathway;

function _quizAnswer(qid, oi, btn) {
  _quizAnswers[qid] = oi;
  btn.closest('.mdb-pq-opts').querySelectorAll('.mdb-pq-opt').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  if (window.haptic) haptic('light');
  const submitBtn = document.getElementById('mdb-pathway-submit');
  if (submitBtn) submitBtn.disabled = Object.keys(_quizAnswers).length < PATHWAY_QUESTIONS.length;
}
window._quizAnswer = _quizAnswer;

function _showPathwayResult() {
  const el = document.getElementById('mdb-pathway-result');
  if (!el) return;

  /* Simple suggestion logic based on region + approach */
  const regionAns = _quizAnswers['region'];
  const suggestions = {
    0: ['hanafi'],
    1: ['maliki'],
    2: ['shafii'],
    3: ['hanbali'],
    4: ['jafari'],
    5: ['shafii', 'ibadi'],
    6: ['hanafi', 'shafii'],  /* new Muslim — balanced */
  };

  const primary = (suggestions[regionAns] || ['hanafi','shafii']).map(id => SCHOOLS.find(s => s.id === id)).filter(Boolean);

  el.innerHTML = `
    <div class="mdb-result-card">
      <div class="mdb-result-title">Your Context Suggests</div>
      <div class="mdb-result-schools">
        ${primary.map(s => `
          <div class="mdb-result-school" style="--school-color:${s.color}">
            <div style="color:${s.color}">${s.icon}</div>
            <div>
              <div class="mdb-rs-name">${s.name} <span dir="rtl" lang="ar">${s.arabic}</span></div>
              <div class="mdb-rs-region">${s.region}</div>
              <button class="mdb-rs-learn" onclick="window.openSchoolDetail('${s.id}')">Learn more</button>
            </div>
          </div>`).join('')}
      </div>
      <div class="mdb-result-note">
        <strong>Remember:</strong> This is a contextual guide, not a religious verdict. All major schools are valid. Consult a qualified local scholar for personal rulings on specific matters.
      </div>
      <div class="mdb-result-advice">
        <div class="mdb-ra-title">Practical Advice</div>
        <div class="mdb-ra-items">
          <div class="mdb-ra-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
            Begin with your local community's practice — this has social and spiritual benefit
          </div>
          <div class="mdb-ra-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
            Learn the reasoning behind rulings — not just the conclusions
          </div>
          <div class="mdb-ra-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
            Do not use madhab differences to abandon obligations — all schools require prayer, fasting, etc.
          </div>
          <div class="mdb-ra-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
            Respect other Muslims who follow different valid schools
          </div>
        </div>
      </div>
    </div>`;
  el.scrollIntoView({ behavior:'smooth', block:'nearest' });
  if (window.haptic) haptic('success');
}
window._showPathwayResult = _showPathwayResult;
