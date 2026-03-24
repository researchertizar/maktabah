'use strict';
/**
 * js/i18n.js — Internationalisation v2
 * UI strings, RTL, correct Hijri + Gregorian date/time, greeting
 */

const STRINGS = {
  en: {
    home:'Home', read:'Read', mushaf:'Mushaf', audio:'Audio', ai:'AI', corpus:'Corpus',
    search:'Search', bookmarks:'Bookmarks', settings:'Settings',
    lastRead:'Last Read', continue:'Continue', randomAyah:'Random Ayah',
    listen:'Listen', copy:'Copy', share:'Share', bookmark:'Bookmark', saved:'Saved',
    note:'Note', tafsir:'Tafsir', wordByWord:'Word×Word', play:'Play',
    prev:'Previous', next:'Next', loading:'Loading…', offline:'Offline',
    verseOf:'Verse of the Day', popular:'Popular Surahs', allChapters:'All 114 Chapters',
    ayahs:'verses', chapter:'Chapter', meccan:'Meccan', medinan:'Medinan',
    back:'Back', info:'Info', reciter:'Reciter', translation:'Translation',
    theme:'Theme', language:'Language', dark:'Dark', light:'Light', sepia:'Sepia',
    aiTools:'AI Tools', reflect:'Reflect',
    streak:'Day Streak', versesRead:'Verses Read', daysActive:'Days Active',
    noBookmarks:'No bookmarks yet.\nTap \uD83D\uDD16 on any verse to save it.',
    greet_fajr:'Assalamu Alaikum', greet_morning:'Good Morning',
    greet_afternoon:'Good Afternoon', greet_evening:'Good Evening', greet_night:'Good Night',
  },
  ar: {
    home:'الرئيسية', read:'قراءة', mushaf:'المصحف', audio:'صوت', ai:'ذكاء', corpus:'لغويات',
    search:'بحث', bookmarks:'المحفوظات', settings:'الإعدادات',
    lastRead:'آخر قراءة', continue:'متابعة', randomAyah:'آية عشوائية',
    listen:'استمع', copy:'نسخ', share:'مشاركة', bookmark:'حفظ', saved:'محفوظ',
    note:'ملاحظة', tafsir:'تفسير', wordByWord:'كلمة×كلمة', play:'تشغيل',
    prev:'السابق', next:'التالي', loading:'جارٍ التحميل…', offline:'غير متصل',
    verseOf:'آية اليوم', popular:'سور مشهورة', allChapters:'١١٤ سورة',
    ayahs:'آيات', chapter:'سورة', meccan:'مكية', medinan:'مدنية',
    back:'رجوع', info:'معلومات', reciter:'القارئ', translation:'الترجمة',
    theme:'المظهر', language:'اللغة', dark:'داكن', light:'فاتح', sepia:'بني',
    aiTools:'أدوات الذكاء', reflect:'تأمل',
    streak:'أيام متتالية', versesRead:'الآيات المقروءة', daysActive:'أيام النشاط',
    noBookmarks:'لا توجد محفوظات.\nاضغط على أي آية.',
    greet_fajr:'السلام عليكم', greet_morning:'صباح الخير',
    greet_afternoon:'مساء الخير', greet_evening:'مساء النور', greet_night:'تصبح على خير',
  },
  fr: {
    home:'Accueil', read:'Lire', mushaf:'Mushaf', audio:'Audio', ai:'IA', corpus:'Corpus',
    search:'Rechercher', bookmarks:'Favoris', settings:'Paramètres',
    lastRead:'Dernière lecture', continue:'Continuer', randomAyah:'Verset aléatoire',
    listen:'Écouter', copy:'Copier', share:'Partager', bookmark:'Sauvegarder', saved:'Sauvegardé',
    note:'Note', tafsir:'Tafsir', wordByWord:'Mot×Mot', play:'Lire',
    prev:'Précédent', next:'Suivant', loading:'Chargement…', offline:'Hors ligne',
    verseOf:'Verset du jour', popular:'Sourates populaires', allChapters:'114 Sourates',
    ayahs:'versets', chapter:'Sourate', meccan:'Mecquoise', medinan:'Médinoise',
    back:'Retour', info:'Info', reciter:'Récitateur', translation:'Traduction',
    theme:'Thème', language:'Langue', dark:'Sombre', light:'Clair', sepia:'Sépia',
    aiTools:'Outils IA', reflect:'Réfléchir',
    streak:'Jours consécutifs', versesRead:'Versets lus', daysActive:'Jours actifs',
    noBookmarks:'Aucun favori.\nAppuyez sur un verset.',
    greet_fajr:'As-salamu alaykum', greet_morning:'Bonjour',
    greet_afternoon:'Bon après-midi', greet_evening:'Bonsoir', greet_night:'Bonne nuit',
  },
  ur: {
    home:'ہوم', read:'پڑھیں', mushaf:'مصحف', audio:'آڈیو', ai:'اے آئی', corpus:'لسانیات',
    search:'تلاش', bookmarks:'نشانات', settings:'ترتیبات',
    lastRead:'آخری پڑھائی', continue:'جاری رکھیں', randomAyah:'بے ترتیب آیت',
    listen:'سنیں', copy:'نقل', share:'شیئر', bookmark:'محفوظ', saved:'محفوظ',
    note:'نوٹ', tafsir:'تفسیر', wordByWord:'لفظ×لفظ', play:'چلائیں',
    prev:'پچھلا', next:'اگلا', loading:'لوڈ ہو رہا ہے…', offline:'آف لائن',
    verseOf:'آج کی آیت', popular:'مشہور سورتیں', allChapters:'١١٤ سورتیں',
    ayahs:'آیات', chapter:'سورت', meccan:'مکی', medinan:'مدنی',
    back:'واپس', info:'معلومات', reciter:'قاری', translation:'ترجمہ',
    theme:'تھیم', language:'زبان', dark:'سیاہ', light:'سفید', sepia:'سیپیا',
    aiTools:'اے آئی ٹولز', reflect:'غور',
    streak:'مسلسل دن', versesRead:'پڑھی آیات', daysActive:'سرگرم دن',
    noBookmarks:'کوئی نشانات نہیں۔\nٹیپ کریں۔',
    greet_fajr:'السلام علیکم', greet_morning:'صبح بخیر',
    greet_afternoon:'دوپہر بخیر', greet_evening:'شام بخیر', greet_night:'شب بخیر',
  },
  tr: {
    home:'Ana Sayfa', read:'Oku', mushaf:'Mushaf', audio:'Ses', ai:'AI', corpus:'Korpus',
    search:'Ara', bookmarks:'Yer İmleri', settings:'Ayarlar',
    lastRead:'Son Okunan', continue:'Devam Et', randomAyah:'Rastgele Ayet',
    listen:'Dinle', copy:'Kopyala', share:'Paylaş', bookmark:'Kaydet', saved:'Kaydedildi',
    note:'Not', tafsir:'Tefsir', wordByWord:'Kelime×Kelime', play:'Oynat',
    prev:'Önceki', next:'Sonraki', loading:'Yükleniyor…', offline:'Çevrimdışı',
    verseOf:'Günün Ayeti', popular:'Popüler Sureler', allChapters:'114 Sure',
    ayahs:'ayet', chapter:'Sure', meccan:'Mekki', medinan:'Medeni',
    back:'Geri', info:'Bilgi', reciter:'Kari', translation:'Çeviri',
    theme:'Tema', language:'Dil', dark:'Koyu', light:'Açık', sepia:'Sepya',
    aiTools:'AI Araçları', reflect:'Düşün',
    streak:'Gün Serisi', versesRead:'Okunan Ayetler', daysActive:'Aktif Günler',
    noBookmarks:'Yer imi yok.\nTıklayın.',
    greet_fajr:'Esselamü Aleyküm', greet_morning:'Günaydın',
    greet_afternoon:'İyi günler', greet_evening:'İyi akşamlar', greet_night:'İyi geceler',
  },
  id: {
    home:'Beranda', read:'Baca', mushaf:'Mushaf', audio:'Audio', ai:'AI', corpus:'Korpus',
    search:'Cari', bookmarks:'Bookmark', settings:'Pengaturan',
    lastRead:'Terakhir Baca', continue:'Lanjutkan', randomAyah:'Ayat Acak',
    listen:'Dengarkan', copy:'Salin', share:'Bagikan', bookmark:'Simpan', saved:'Tersimpan',
    note:'Catatan', tafsir:'Tafsir', wordByWord:'Kata×Kata', play:'Putar',
    prev:'Sebelumnya', next:'Berikutnya', loading:'Memuat…', offline:'Offline',
    verseOf:'Ayat Hari Ini', popular:'Surah Populer', allChapters:'114 Surah',
    ayahs:'ayat', chapter:'Surah', meccan:'Makkiyah', medinan:'Madaniyah',
    back:'Kembali', info:'Info', reciter:'Qari', translation:'Terjemahan',
    theme:'Tema', language:'Bahasa', dark:'Gelap', light:'Terang', sepia:'Sepia',
    aiTools:'AI Tools', reflect:'Renungkan',
    streak:'Hari Beruntun', versesRead:'Ayat Dibaca', daysActive:'Hari Aktif',
    noBookmarks:'Belum ada bookmark.\nKetuk pada ayat.',
    greet_fajr:"Assalamu'alaikum", greet_morning:'Selamat pagi',
    greet_afternoon:'Selamat siang', greet_evening:'Selamat sore', greet_night:'Selamat malam',
  },
  bn: {
    home:'হোম', read:'পড়ুন', mushaf:'মুসহাফ', audio:'অডিও', ai:'এআই', corpus:'কর্পাস',
    search:'অনুসন্ধান', bookmarks:'বুকমার্ক', settings:'সেটিংস',
    lastRead:'শেষ পঠন', continue:'চালিয়ে যান', randomAyah:'এলোমেলো আয়াত',
    listen:'শুনুন', copy:'কপি', share:'শেয়ার', bookmark:'সংরক্ষণ', saved:'সংরক্ষিত',
    note:'নোট', tafsir:'তাফসীর', wordByWord:'শব্দ×শব্দ', play:'চালান',
    prev:'পূর্ববর্তী', next:'পরবর্তী', loading:'লোড হচ্ছে…', offline:'অফলাইন',
    verseOf:'আজকের আয়াত', popular:'জনপ্রিয় সূরা', allChapters:'১১৪ সূরা',
    ayahs:'আয়াত', chapter:'সূরা', meccan:'মক্কী', medinan:'মাদানী',
    back:'ফিরুন', info:'তথ্য', reciter:'ক্বারী', translation:'অনুবাদ',
    theme:'থিম', language:'ভাষা', dark:'অন্ধকার', light:'উজ্জ্বল', sepia:'সেপিয়া',
    aiTools:'এআই টুলস', reflect:'চিন্তা',
    streak:'ধারাবাহিক দিন', versesRead:'পঠিত আয়াত', daysActive:'সক্রিয় দিন',
    noBookmarks:'কোনো বুকমার্ক নেই।\nচাপুন।',
    greet_fajr:'আস্সালামু আলাইকুম', greet_morning:'শুভ সকাল',
    greet_afternoon:'শুভ অপরাহ্ন', greet_evening:'শুভ সন্ধ্যা', greet_night:'শুভ রাত্রি',
  },
  ml: {
    home:'ഹോം', read:'വായിക്കുക', mushaf:'മുസ്ഹഫ്', audio:'ഓഡിയോ', ai:'AI', corpus:'ഭാഷ',
    search:'തിരയുക', bookmarks:'ബുക്ക്മാർക്ക്', settings:'ക്രമീകരണം',
    lastRead:'അവസാനം വായിച്ചത്', continue:'തുടരുക', randomAyah:'ക്രമരഹിത ആയത്ത്',
    listen:'കേൾക്കുക', copy:'പകർത്തുക', share:'പങ്കിടുക', bookmark:'സൂക്ഷിക്കുക', saved:'സൂക്ഷിച്ചു',
    note:'കുറിപ്പ്', tafsir:'തഫ്സീർ', wordByWord:'വാക്ക്×വാക്ക്', play:'പ്ലേ',
    prev:'മുമ്പത്തേത്', next:'അടുത്തത്', loading:'ലോഡ് ചെയ്യുന്നു…', offline:'ഓഫ്‌ലൈൻ',
    verseOf:'ദിവസത്തെ ആയത്ത്', popular:'ജനപ്രിയ സൂറകൾ', allChapters:'114 സൂറകൾ',
    ayahs:'ആയത്തുകൾ', chapter:'സൂറ', meccan:'മക്കി', medinan:'മദനി',
    back:'പിന്നോട്ട്', info:'വിവരം', reciter:'ഖാരി', translation:'വിവർത്തനം',
    theme:'തീം', language:'ഭാഷ', dark:'ഇരുണ്ട', light:'വെളിച്ചം', sepia:'സേപ്പിയ',
    aiTools:'AI ഉപകരണങ്ങൾ', reflect:'ചിന്തിക്കുക',
    streak:'തുടർ ദിനങ്ങൾ', versesRead:'വായിച്ച ആയത്തുകൾ', daysActive:'സജീവ ദിനങ്ങൾ',
    noBookmarks:'ബുക്ക്മാർക്കുകൾ ഇല്ല.\nഏതെങ്കിലും ആയത്തിൽ ടാപ്പ് ചെയ്യുക.',
    greet_fajr:'അസ്സലാമു അലൈക്കും', greet_morning:'സുപ്രഭാതം',
    greet_afternoon:'ശുഭ ഉച്ചനേരം', greet_evening:'ശുഭ സന്ധ്യ', greet_night:'ശുഭ രാത്രി',
  },
};

const RTL_LANGS = ['ar','ur'];
window.STRINGS   = STRINGS;
window.RTL_LANGS = RTL_LANGS;

function t(key) {
  return (STRINGS[G.uiLang] || STRINGS.en)[key] || STRINGS.en[key] || key;
}
window.t = t;

function applyUILang(lang) {
  G.uiLang = lang;
  ss('qUILang', lang);
  const isRTL = RTL_LANGS.includes(lang);
  document.documentElement.lang  = lang;
  document.documentElement.dir   = isRTL ? 'rtl' : 'ltr';
  document.body.classList.toggle('rtl', isRTL);
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
}
window.applyUILang = applyUILang;

/* ── Greeting: prayer-time aware ── */
function getGreeting() {
  const h = new Date().getHours();
  if (h >= 4  && h < 6)  return t('greet_fajr');
  if (h >= 6  && h < 12) return t('greet_morning');
  if (h >= 12 && h < 17) return t('greet_afternoon');
  if (h >= 17 && h < 21) return t('greet_evening');
  return t('greet_night');
}
window.getGreeting = getGreeting;

/* ── Hijri date — Intl.DateTimeFormat (accurate on all modern devices) ── */
function getHijriDate() {
  /* Use a fixed reference for today: UTC midnight so timezone can't shift the day */
  var today = new Date();
  /* Sanitise: strip time-of-day to avoid midnight-crossing edge cases in Intl */
  var utcToday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

  var cals = ['islamic-umalqura', 'islamic-civil', 'islamic'];
  for (var i = 0; i < cals.length; i++) {
    try {
      var fmt   = new Intl.DateTimeFormat('en-u-ca-' + cals[i], { day:'numeric', month:'long', year:'numeric', timeZone:'UTC' });
      var parts = fmt.formatToParts(utcToday);
      var yr = 0, mo = '', dy = 0;
      for (var p = 0; p < parts.length; p++) {
        if (parts[p].type === 'year')  yr = parseInt(parts[p].value);
        if (parts[p].type === 'month') mo = parts[p].value;
        if (parts[p].type === 'day')   dy = parseInt(parts[p].value);
      }
      /* Valid range: 1440–1480 AH covers 2019–2057 CE */
      if (yr >= 1440 && yr <= 1480 && mo && dy > 0 && dy <= 30) {
        return dy + ' ' + mo + ' ' + yr + ' AH';
      }
    } catch(e) { /* try next calendar */ }
  }
  /* Fallback: corrected JDN algorithm */
  return _jdnHijri();
}
window.getHijriDate = getHijriDate;

function _jdnHijri() {
  try {
    /* Julian Day Number from today's UTC date (avoids timezone shift) */
    var now  = new Date();
    var jd   = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000) + 2440588;
    /* Khalid Shaukat's algorithm — more accurate than basic JDN */
    var z    = jd;
    var a    = z;
    var b    = a + 1524;
    var c    = Math.floor((b - 122.1) / 365.25);
    var dd   = Math.floor(365.25 * c);
    var e    = Math.floor((b - dd) / 30.6001);
    /* Islamic conversion */
    var JD   = z + 0.5;
    var l    = JD - 1948438.5 + 0.5;
    var n    = Math.floor(l / 10631);
    var r    = l - 10631 * n;
    var j    = Math.ceil((r + 29) / 30) - 1;
    if (j < 0) j = 0;
    var dy   = Math.ceil(r - 29 * j - Math.floor(j / 2)) + (j > 6 ? 1 : 0);
    var mo   = j + 1;
    if (mo > 12) { mo = 1; n++; }
    var yr   = 30 * n + Math.floor((11 * n + 3) / 30) + 1;

    var M  = ['Muharram','Safar','Rabi\u02bc al-Awwal','Rabi\u02bc al-Thani',
              'Jumada I','Jumada II','Rajab','Sha\u02bcban',
              'Ramadan','Shawwal','Dhul Qi\u02bcdah','Dhul Hijjah'];
    if (dy < 1 || dy > 30 || mo < 1 || mo > 12 || yr < 1440) throw new Error('bad');
    return dy + ' ' + M[mo - 1] + ' ' + yr + ' AH';
  } catch(e) { return ''; }
}

function getGregorianDate() {
  var now = new Date();
  var days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return days[now.getDay()] + ', ' + now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
}
window.getGregorianDate = getGregorianDate;

/* Returns full date badge HTML — Hijri · Gregorian · Time
   On mobile, date-greg and date-time are hidden by mobile.css — separators
   are wrapped with their content so they hide together. */
function getDateBadgeHTML() {
  var now  = new Date();
  var h    = now.getHours();
  var m    = now.getMinutes();
  var ampm = h >= 12 ? 'PM' : 'AM';
  var hh   = h % 12 || 12;
  var mm   = m < 10 ? '0' + m : String(m);
  var time  = hh + ':' + mm + ' ' + ampm;
  var greg  = getGregorianDate();
  var hijri = getHijriDate();
  /* Separators are inside the same span as their content → hide together */
  return '<span class="date-hijri">' + (hijri || greg) + '</span>'
       + '<span class="date-greg"> \xb7 ' + greg + '</span>'
       + '<span class="date-time"> \xb7 ' + time + '</span>';
}
window.getDateBadgeHTML = getDateBadgeHTML;

/* Live clock: updates every minute */
function startDateClock() {
  function update() {
    var el = document.getElementById('hijri-date');
    if (el) el.innerHTML = getDateBadgeHTML();
  }
  update();
  setInterval(update, 60000);
  document.addEventListener('visibilitychange', function() { if (!document.hidden) update(); });
}
window.startDateClock = startDateClock;

/* Kept for backward compat — calls JDN fallback directly, not getHijriDate */
function approxHijri() { return _jdnHijri(); }
window.approxHijri = approxHijri;
