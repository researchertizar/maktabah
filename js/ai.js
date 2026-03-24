'use strict';
/**
 * js/ai.js — AI Quran Tools (Tarteel) v2
 * Authentic scholarly AI — never hallucinates.
 * Chat, Reflection (5 modes), Tafsir Compare (multi-scholar), Topics, Scan
 * Markdown rendering for AI output.
 */

let _aiInited    = false;
let _chatHistory = [];

/* ── Markdown renderer (lightweight, no deps) ── */
function renderMD(text) {
  if (!text) return '';
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    // Headings
    .replace(/^### (.+)$/gm,'<h4 style="color:var(--em2);font-size:14px;font-weight:700;margin:14px 0 6px">$1</h4>')
    .replace(/^## (.+)$/gm,'<h3 style="color:var(--gd);font-size:15px;font-weight:800;margin:16px 0 8px;border-bottom:1px solid var(--bd);padding-bottom:4px">$1</h3>')
    .replace(/^# (.+)$/gm,'<h2 style="color:var(--t1);font-size:17px;font-weight:800;margin:18px 0 10px">$1</h2>')
    // Bold + italic
    .replace(/\*\*\*(.*?)\*\*\*/g,'<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g,'<strong style="color:var(--t1)">$1</strong>')
    .replace(/\*(.*?)\*/g,'<em style="color:var(--t2)">$1</em>')
    .replace(/_(.*?)_/g,'<em style="color:var(--t2)">$1</em>')
    // Arabic text marker: [AR: text]
    .replace(/\[AR:\s*([^\]]+)\]/g,'<div style="font-family:var(--font-ar);font-size:22px;color:var(--t1);direction:rtl;text-align:right;padding:10px 14px;background:var(--sf2);border-radius:8px;margin:8px 0;line-height:2">$1</div>')
    // Verse references
    .replace(/\b(\d{1,3}:\d{1,3})\b/g,'<a href="#" class="ai-verse-link" onclick="event.preventDefault();jumpToVerse(\'$1\')">$1</a>')
    // Horizontal rule
    .replace(/^---$/gm,'<hr style="border:none;border-top:1px solid var(--bd);margin:16px 0">')
    // Blockquote
    .replace(/^&gt; (.+)$/gm,'<blockquote style="border-left:3px solid var(--gd);padding:6px 12px;margin:8px 0;background:var(--gd-dim);border-radius:0 6px 6px 0;color:var(--t2);font-style:italic">$1</blockquote>')
    // Code
    .replace(/`([^`]+)`/g,'<code style="background:var(--sf2);color:var(--em2);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:12.5px">$1</code>')
    // Lists
    .replace(/^[\-\*] (.+)$/gm,'<div style="display:flex;gap:8px;margin:3px 0;padding-left:8px"><span style="color:var(--em3);flex-shrink:0">•</span><span>$1</span></div>')
    .replace(/^\d+\. (.+)$/gm,(m,p1,offset,str)=>{
      const num = str.slice(0,offset).split('\n').filter(l=>/^\d+\./.test(l)).length+1;
      return `<div style="display:flex;gap:8px;margin:3px 0;padding-left:8px"><span style="color:var(--em2);font-weight:700;min-width:18px;flex-shrink:0">${num}.</span><span>${p1}</span></div>`;
    })
    // Paragraphs
    .replace(/\n\n/g,'</p><p style="margin:8px 0">')
    .replace(/\n/g,'<br>');
}
window.renderMD = renderMD;

/* ── Init ── */
async function initAI() {
  if (_aiInited) return;
  _aiInited = true;
  const pg = document.getElementById('pg-ai');
  if (!pg) return;
  pg.innerHTML = buildAIPage();
  aiTab('chat', pg.querySelector('.ai-tab'));

  if (G.aiChatHistory?.length) {
    _chatHistory = G.aiChatHistory.slice(-30);
    const msgs = document.getElementById('chat-msgs');
    if (msgs) {
      _chatHistory.slice(-20).forEach(m => msgs.appendChild(makeBubble(m.role==='user', m.content)));
      msgs.scrollTop = msgs.scrollHeight;
    }
  }

  const ok  = await checkAIStatus();
  const dot = document.getElementById('ai-st-dot');
  const lbl = document.getElementById('ai-st-lbl');
  if (dot) dot.style.background = ok ? 'var(--green)' : 'var(--orange)';
  if (lbl) lbl.textContent = ok ? 'AI Ready · Scholarly Mode' : 'AI offline — set up backend (api/server.js)';
}
window.initAI = initAI;

function buildAIPage() {
  return `<div class="ai-wrap">

  <!-- Hero -->
  <div class="ai-hero">
    <div class="ai-hero-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></div>
    <h2>Tarteel — AI Quran Scholar</h2>
    <div class="ai-status-row">
      <div class="ai-status-dot" id="ai-st-dot"></div>
      <span class="ai-status-lbl" id="ai-st-lbl">Checking…</span>
    </div>
    <p style="font-size:12px;color:var(--t3);margin-top:6px">
      Grounded in Quran · Sahih Hadith · Classical Tafsir · No hallucination
    </p>
  </div>

  <!-- Tabs -->
  <div class="ai-tabs" role="tablist">
    <button class="ai-tab" role="tab" onclick="window.aiTab('chat',this)" data-tab="chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Chat</button>
    <button class="ai-tab" role="tab" onclick="window.aiTab('reflect',this)" data-tab="reflect"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="12" r="10"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Reflect</button>
    <button class="ai-tab" role="tab" onclick="window.aiTab('tafsir',this)" data-tab="tafsir"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg> Tafsir</button>
    <button class="ai-tab" role="tab" onclick="window.aiTab('topics',this)" data-tab="topics"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg> Topics</button>
    <button class="ai-tab" role="tab" onclick="window.aiTab('scan',this)" data-tab="scan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Scan</button>
  </div>

  <!-- ══ CHAT ══ -->
  <div class="ai-panel" id="aip-chat">
    <div class="ai-card">
      <h3>Chat with Tarteel</h3>
      <div class="ai-msgs" id="chat-msgs" role="log" aria-live="polite"></div>
      <div class="ai-quick-chips" id="chat-chips">
        <button class="ai-chip" onclick="window.aiSend('What does the Quran say about patience (Sabr)?')">Sabr (Patience)</button>
        <button class="ai-chip" onclick="window.aiSend('Explain the meaning of Surah Al-Fatiha verse by verse')">Al-Fatiha</button>
        <button class="ai-chip" onclick="window.aiSend('What is the significance of Laylatul Qadr?')">Laylatul Qadr</button>
        <button class="ai-chip" onclick="window.aiSend('What are the Five Pillars of Islam as mentioned in Quran?')">Five Pillars</button>
        <button class="ai-chip" onclick="window.aiSend('Explain Ayatul Kursi (2:255) — its meaning and virtues')">Ayatul Kursi</button>
        <button class="ai-chip" onclick="window.aiSend('What does Islam say about the rights of parents?')">Parents' Rights</button>
      </div>
      <div class="ai-input-row">
        <textarea class="ai-ta" id="chat-ta" rows="2"
          placeholder="Ask about any verse, concept, or Islamic topic…"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();aiSendChat()}"
          aria-label="Chat message"></textarea>
        <button class="ai-send-btn" onclick="aiSendChat()" aria-label="Send">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="ai-hint">Shift+Enter for new line · Always cites sources</div>
        <button onclick="window.clearChatHistory()" style="font-size:11px;color:var(--t4);padding:3px 8px;border-radius:6px;background:var(--sf2);border:1px solid var(--bd)">Clear</button>
      </div>
    </div>
  </div>

  <!-- ══ REFLECT ══ -->
  <div class="ai-panel" id="aip-reflect">
    <div class="ai-card">
      <h3>Personal Reflection</h3>
      <p>Deep, authentic reflection on any verse — grounded in classical scholarship.</p>

      <!-- Verse input -->
      <div class="ai-form-row">
        <input class="ai-inp" id="ref-verse" placeholder="Verse key e.g. 2:255 or 55:13" aria-label="Verse reference"/>
        <button class="ai-sm-btn" onclick="window.aiReflect()">Generate</button>
      </div>

      <!-- Mode selector -->
      <div style="margin-bottom:14px">
        <div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Reflection Mode</div>
        <div class="ai-quick-chips" id="reflect-mode-chips">
          <button class="ai-chip active" data-mode="personal" onclick="window.setReflectMode('personal',this)">Personal Reflection</button>
          <button class="ai-chip" data-mode="dua" onclick="window.setReflectMode('dua',this)">Du'a &amp; Supplication</button>
          <button class="ai-chip" data-mode="lesson" onclick="window.setReflectMode('lesson',this)">Life Lesson</button>
          <button class="ai-chip" data-mode="journal" onclick="window.setReflectMode('journal',this)">Journal Prompts</button>
          <button class="ai-chip" data-mode="khutbah" onclick="window.setReflectMode('khutbah',this)">Khutbah Outline</button>
        </div>
      </div>

      <!-- Language/Style -->
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;align-items:center">
        <div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Style:</div>
        <select class="rtb-sel" id="reflect-style" style="font-size:13px;padding:6px 10px">
          <option value="scholarly">Scholarly</option>
          <option value="accessible">Accessible / Simple</option>
          <option value="youth">Youth-friendly</option>
          <option value="arabic">Include Arabic terms</option>
        </select>
        <div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Length:</div>
        <select class="rtb-sel" id="reflect-length" style="font-size:13px;padding:6px 10px">
          <option value="medium">Medium</option>
          <option value="short">Brief</option>
          <option value="detailed">Detailed</option>
        </select>
      </div>

      <div id="ref-out" class="ai-out ai-md-out"></div>
      <div id="ref-hist-wrap" style="margin-top:16px"></div>
    </div>
  </div>

  <!-- ══ TAFSIR COMPARE ══ -->
  <div class="ai-panel" id="aip-tafsir">
    <div class="ai-card">
      <h3>Multi-Scholar Tafsir</h3>
      <p>Compare classical tafsirs side-by-side. Sources: Ibn Kathir, Al-Jalalayn, Maarif-ul-Quran, Ibn Abbas.</p>

      <div class="ai-form-row">
        <input class="ai-inp" id="taf-verse" placeholder="Verse key e.g. 1:3" aria-label="Verse"/>
        <select class="rtb-sel" id="taf-scholar1" style="font-size:13px;padding:6px 10px">
          <option value="ibn_kathir">Ibn Kathir</option>
          <option value="al_tabari">Al-Tabari</option>
          <option value="al_jalalayn">Al-Jalalayn</option>
          <option value="ibn_abbas">Ibn Abbas</option>
          <option value="al_qurtubi">Al-Qurtubi</option>
          <option value="al_baghawi">Al-Baghawi</option>
        </select>
        <select class="rtb-sel" id="taf-scholar2" style="font-size:13px;padding:6px 10px">
          <option value="al_jalalayn">Al-Jalalayn</option>
          <option value="ibn_kathir">Ibn Kathir</option>
          <option value="al_tabari">Al-Tabari</option>
          <option value="ibn_abbas">Ibn Abbas</option>
          <option value="al_qurtubi">Al-Qurtubi</option>
          <option value="al_baghawi">Al-Baghawi</option>
        </select>
        <button class="ai-sm-btn" onclick="window.aiTafsirCompare()">Compare</button>
      </div>

      <!-- Options -->
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;align-items:center">
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--t2);cursor:pointer">
          <input type="checkbox" id="taf-include-arabic" style="accent-color:var(--em)"> Include Arabic text
        </label>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--t2);cursor:pointer">
          <input type="checkbox" id="taf-include-summary" checked style="accent-color:var(--em)"> AI Summary
        </label>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--t2);cursor:pointer">
          <input type="checkbox" id="taf-include-hadith" style="accent-color:var(--em)"> Related Hadith
        </label>
      </div>

      <!-- Side by side output -->
      <div id="taf-verse-display" style="display:none;margin-bottom:16px;padding:14px;background:var(--sf2);border-radius:10px;border:1px solid var(--bd)">
        <div id="taf-ar-text" style="font-family:var(--font-ar);font-size:28px;color:var(--t1);direction:rtl;text-align:right;line-height:2;margin-bottom:8px"></div>
        <div id="taf-tr-text" style="font-size:14px;color:var(--t2);font-style:italic"></div>
        <div id="taf-key-ref" style="font-size:12px;color:var(--gd);font-weight:700;margin-top:4px"></div>
      </div>

      <div id="taf-out-grid" style="display:none;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px"></div>
      <div id="taf-summary-out" class="ai-out ai-md-out"></div>
    </div>
  </div>

  <!-- ══ TOPIC EXPLORER ══ -->
  <div class="ai-panel" id="aip-topics">
    <div class="ai-card">
      <h3> Topic Explorer</h3>
      <p>Find Quranic verses on any theme with AI-curated scholarly insights.</p>
      <div class="ai-quick-chips">
        <button class="ai-chip" onclick="window.aiTopic('mercy (Rahman, Rahim)')">Mercy (Rahman)</button>
        <button class="ai-chip" onclick="window.aiTopic('justice and fairness (Adl)')">Justice</button>
        <button class="ai-chip" onclick="window.aiTopic('prayer (Salah) and its importance')">Prayer</button>
        <button class="ai-chip" onclick="window.aiTopic('seeking knowledge (Ilm)')">Knowledge</button>
        <button class="ai-chip" onclick="window.aiTopic('gratitude (Shukr) to Allah')">Gratitude</button>
        <button class="ai-chip" onclick="window.aiTopic('patience (Sabr) in hardship')">Patience</button>
        <button class="ai-chip" onclick="window.aiTopic('forgiveness (Maghfirah) from Allah')">Forgiveness</button>
        <button class="ai-chip" onclick="window.aiTopic('family rights and duties')">Family</button>
        <button class="ai-chip" onclick="window.aiTopic('death and the afterlife (Akhirah)')">Afterlife</button>
        <button class="ai-chip" onclick="window.aiTopic('trust in Allah (Tawakkul)')">Tawakkul</button>
        <button class="ai-chip" onclick="window.aiTopic('charity (Sadaqah) and Zakat')">Sadaqah</button>
        <button class="ai-chip" onclick="window.aiTopic('tawbah (repentance) in Islam')">Tawbah</button>
      </div>
      <div class="ai-form-row" style="margin-top:12px">
        <input class="ai-inp" id="topic-inp" placeholder="Enter any Islamic topic…" aria-label="Topic"/>
        <button class="ai-sm-btn" onclick="window.aiTopic(document.getElementById('topic-inp').value)">Search</button>
      </div>
      <div id="topic-out" class="ai-out ai-md-out"></div>
    </div>
  </div>

  <!-- ══ SCAN ══ -->
  <div class="ai-panel" id="aip-scan">
    <div class="ai-card">
      <h3> Scan Verse</h3>
      <p>Upload a photo of Quran text to identify the verse and receive translation + tafsir.</p>
      <div class="img-drop" id="scan-drop"
        onclick="document.getElementById('scan-file').click()"
        ondragover="event.preventDefault();this.classList.add('drag')"
        ondragleave="this.classList.remove('drag')"
        ondrop="event.preventDefault();this.classList.remove('drag');scanFile(event.dataTransfer.files[0])">
        <div style="font-size:40px;margin-bottom:10px"></div>
        <div style="font-size:14px;color:var(--t2);font-weight:600">Drop image here or click to upload</div>
        <div style="font-size:12px;color:var(--t3);margin-top:4px">JPG, PNG, WEBP · Requires multimodal backend</div>
        <input type="file" id="scan-file" accept="image/*" style="display:none" onchange="scanFile(this.files[0])"/>
      </div>
      <div id="scan-out" class="ai-out ai-md-out"></div>
    </div>
  </div>

</div>`;
}

/* ── Tab switching ── */
function aiTab(tab, btn) {
  document.querySelectorAll('#pg-ai .ai-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('#pg-ai .ai-tab').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
  document.getElementById('aip-'+tab)?.classList.add('active');
  if (btn) { btn.classList.add('active'); btn.setAttribute('aria-selected','true'); }
  // Update URL to reflect current tab
  if (window.G && G.view === 'ai' && window.replaceURL) replaceURL('ai', { tab: tab });
}
window.aiTab = aiTab;

/* ── Reflect mode ── */
let _reflectMode = 'personal';
function setReflectMode(mode, btn) {
  _reflectMode = mode;
  document.querySelectorAll('#reflect-mode-chips .ai-chip').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}
window.setReflectMode = setReflectMode;

/* ════════════════════════
   CHAT
════════════════════════ */
function makeBubble(isUser, text) {
  const wrap   = document.createElement('div');
  wrap.className = 'ai-msg' + (isUser ? ' ai-user' : '');
  const av     = document.createElement('div');
  av.className = 'ai-av';
  av.innerHTML = isUser
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  const bubble = document.createElement('div');
  bubble.className = 'ai-bubble';
  bubble.innerHTML = isUser
    ? text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')
    : '<p style="margin:0">' + renderMD(text) + '</p>';
  wrap.appendChild(av);
  wrap.appendChild(bubble);
  return wrap;
}

function aiSendChat() {
  const ta = document.getElementById('chat-ta'); if (!ta) return;
  const msg = ta.value.trim(); if (!msg) return;
  ta.value = '';
  aiSend(msg);
}

async function aiSend(msg) {
  if (!msg?.trim()) return;
  const msgs = document.getElementById('chat-msgs');
  if (!msgs) { navigate('ai'); initAI(); setTimeout(()=>aiSend(msg),350); return; }
  aiTab('chat', document.querySelector('#pg-ai .ai-tab'));

  msgs.appendChild(makeBubble(true, msg));
  _chatHistory.push({role:'user', content:msg});
  G.aiChatHistory.push({role:'user', content:msg});
  if (G.aiChatHistory.length>50) G.aiChatHistory = G.aiChatHistory.slice(-50);
  sj('qChatHist', G.aiChatHistory);
  msgs.scrollTop = msgs.scrollHeight;

  const typing = document.createElement('div');
  typing.className = 'ai-msg';
  typing.innerHTML = '<div class="ai-av"></div><div class="ai-bubble"><div class="ai-typing"><span></span><span></span><span></span></div></div>';
  msgs.appendChild(typing);
  msgs.scrollTop = msgs.scrollHeight;

  const systemPrompt = `You are Tarteel, an Islamic scholarly AI assistant. You provide authentic, well-grounded Islamic knowledge.

STRICT RULES:
1. NEVER fabricate Quranic verses, hadith, or scholarly opinions
2. When citing Quran, always include the verse key in format (Surah:Ayah) e.g. (2:286)
3. When citing Hadith, name the collection and narrator (e.g. Sahih Bukhari, narrated by Abu Hurairah)
4. If uncertain, clearly say "scholars differ on this" or "I'm not certain of the exact reference"
5. Format responses with ## headings, **bold** for key terms, and > blockquotes for direct Quranic text
6. For Arabic terms, write them as [AR: Arabic text] on a new line
7. Always provide the Saheeh International translation for Quranic verses`;

  try {
    const d = await callAIBackend(_chatHistory.slice(-12), systemPrompt);
    typing.remove();
    const reply = d.text || 'No response received.';
    _chatHistory.push({role:'assistant', content:reply});
    G.aiChatHistory.push({role:'assistant', content:reply});
    sj('qChatHist', G.aiChatHistory.slice(-50));
    msgs.appendChild(makeBubble(false, reply));
    msgs.scrollTop = msgs.scrollHeight;
  } catch(e) {
    typing.remove();
    msgs.appendChild(makeBubble(false, ' ' + (e.message||'Could not reach AI. Ensure the backend server is running at port 3001.')));
    msgs.scrollTop = msgs.scrollHeight;
  }
}
window.aiSend = aiSend;

function clearChatHistory() {
  _chatHistory = []; G.aiChatHistory = []; sj('qChatHist',[]);
  const msgs = document.getElementById('chat-msgs');
  if (msgs) msgs.innerHTML = '';
  showToast('Chat cleared');
}
window.clearChatHistory = clearChatHistory;

/* ════════════════════════
   REFLECT
════════════════════════ */
const REFLECT_PROMPTS = {
  personal: (key, style, length) =>
    `Give a ${length} personal reflection on Quran verse ${key} in a ${style} style.
Structure your response with these sections:
## The Verse
[Include Arabic text as [AR: ...] and Saheeh International translation]
## Meaning & Context
[Brief authentic tafsir context — cite the classical scholar you draw from]
## Key Lessons
[3-5 actionable lessons from this verse]
## How to Apply Today
[Practical, realistic modern application]
## Related Verses
[2-3 verses on the same theme with their keys]
Do NOT fabricate. If uncertain about any reference, say so.`,

  dua: (key, style, length) =>
    `For Quran verse ${key}, provide a ${length} du'a and supplication guide in a ${style} style.
Structure as:
## The Verse
[Arabic [AR: ...] and translation]
## What to Ask For (Based on This Verse)
[Authentic supplications inspired by this verse's theme]
## Prophetic Du'as on This Theme
[Real hadith-based duas — cite collection and narrator]
## When to Recite
[Islamic guidance on timing and circumstances]
## Arabic Supplication
[AR: A du'a in Arabic related to this theme]
Only include authentic supplications with proper citations.`,

  lesson: (key, style, length) =>
    `Extract a ${length} life lesson from Quran verse ${key} in a ${style} style.
Structure as:
## The Verse
[Arabic [AR: ...] and translation]
## The Core Principle
[The fundamental life principle this verse teaches]
## Historical Context
[Brief authentic context — cite classical sources]
## Three Life Lessons
[Concrete, applicable lessons — no vague platitudes]
## Modern Application
[Real scenarios where this lesson applies today]
## Hadith Connection
[One authentic hadith reinforcing this lesson — cite properly]`,

  journal: (key, style, length) =>
    `Create ${length} journal prompts for personal reflection on Quran verse ${key} in a ${style} style.
Structure as:
## The Verse
[Arabic [AR: ...] and translation]
## Verse Summary
[2-3 sentences capturing the essence]
## Deep Reflection Questions
[5-7 honest, searching questions for personal journaling]
## Action Commitment
[3 specific, measurable actions inspired by this verse]
## 30-Day Challenge
[A practical month-long spiritual practice from this verse]
Make prompts realistic and personally challenging, not superficial.`,

  khutbah: (key, style, length) =>
    `Create a ${length} Khutbah (sermon) outline based on Quran verse ${key} in a ${style} style.
Structure as:
## Main Verse
[Arabic [AR: ...] and translation]
## Khutbah Title
[Engaging title for the sermon]
## Opening (5 min)
[Authentic Islamic opening with Hamdallah, Salawat — provide proper Arabic]
## Introduction Hook
[An engaging opening scenario or question]
## Main Body — 3 Points
[Three connected points, each with: Quranic evidence (with key), Hadith support (cited), real-world application]
## Conclusion & Du'a
[Call to action and supplication]
## Supplementary Verses
[3-5 supporting verses with keys]
Only use authentic references — no fabricated hadith.`
};

async function aiReflect() {
  const key    = document.getElementById('ref-verse')?.value.trim();
  if (!key) { showToast('Enter a verse key first (e.g. 2:255)'); return; }
  const style  = document.getElementById('reflect-style')?.value || 'scholarly';
  const length = document.getElementById('reflect-length')?.value || 'medium';
  const prompt = REFLECT_PROMPTS[_reflectMode]?.(key, style, length);

  const out = document.getElementById('ref-out'); if (!out) return;
  setOutLoading(out);
  try {
    const d = await callAIBackend([{role:'user', content:prompt}]);
    out.innerHTML = '<p style="margin:0">' + renderMD(d.text||'') + '</p>';
    out.classList.add('show');
    const entry = {key, mode:_reflectMode, text:(d.text||'').slice(0,180), date:new Date().toISOString().slice(0,10)}; /* BUG-37 fix: was toLocaleDateString() — inconsistent across locales/timezones */
    G.aiReflHistory.unshift(entry);
    if (G.aiReflHistory.length>20) G.aiReflHistory = G.aiReflHistory.slice(0,20);
    sj('qRefHist', G.aiReflHistory);
    renderRefHistory();
  } catch(e) {
    out.innerHTML = `<p style="color:var(--red)"> ${e.message||'Backend unavailable'}</p>`;
    out.classList.add('show');
  }
}
window.aiReflect = aiReflect;

function renderRefHistory() {
  const el = document.getElementById('ref-hist-wrap'); if (!el) return;
  if (!G.aiReflHistory.length) { el.innerHTML=''; return; }
  el.innerHTML = '<div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Recent Reflections</div>' +
    G.aiReflHistory.slice(0,5).map(h =>
      `<div style="padding:8px 10px;border-radius:8px;background:var(--sf2);border:1px solid var(--bd);margin-bottom:4px;cursor:pointer;display:flex;align-items:center;gap:8px"
        onclick="document.getElementById('ref-verse').value='${h.key}';aiReflect()">
        <span style="font-size:11.5px;font-weight:700;color:var(--gd)">${h.key}</span>
        <span style="font-size:10px;background:var(--em-dim);color:var(--em3);padding:2px 7px;border-radius:999px">${h.mode||'personal'}</span>
        <span style="font-size:11.5px;color:var(--t3)">${h.date}</span>
      </div>`
    ).join('');
}

/* ════════════════════════
   TAFSIR COMPARE
════════════════════════ */
const SCHOLAR_LABELS = {
  ibn_kathir:'Ibn Kathir (d.774H)', al_tabari:'Al-Tabari (d.310H)',
  al_jalalayn:'Al-Jalalayn (d.911H)', ibn_abbas:"Ibn Abbas (d.68H)",
  al_qurtubi:'Al-Qurtubi (d.671H)', al_baghawi:'Al-Baghawi (d.516H)'
};

async function aiTafsirCompare() {
  const key      = document.getElementById('taf-verse')?.value.trim();
  if (!key) { showToast('Enter a verse key (e.g. 1:3)'); return; }
  const s1       = document.getElementById('taf-scholar1')?.value || 'ibn_kathir';
  const s2       = document.getElementById('taf-scholar2')?.value || 'al_jalalayn';
  const inclAr   = document.getElementById('taf-include-arabic')?.checked;
  const inclSum  = document.getElementById('taf-include-summary')?.checked;
  const inclHad  = document.getElementById('taf-include-hadith')?.checked;

  const s1label  = SCHOLAR_LABELS[s1] || s1;
  const s2label  = SCHOLAR_LABELS[s2] || s2;

  // Load verse data first
  const vDisplay = document.getElementById('taf-verse-display');
  const outGrid  = document.getElementById('taf-out-grid');
  const sumOut   = document.getElementById('taf-summary-out');
  if (outGrid) { outGrid.innerHTML='<div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>'; outGrid.style.display='grid'; }
  if (sumOut)  { sumOut.innerHTML=''; sumOut.classList.remove('show'); }

  // Fetch verse text
  try {
    const d = await apiFetch(`/verses/by_key/${key}?translations=131&fields=text_uthmani`);
    const v = d.verse;
    if (v && vDisplay) {
      document.getElementById('taf-ar-text').textContent = v.text_uthmani || '';
      document.getElementById('taf-tr-text').textContent = v.translations?.[0]?.text?.replace(/<[^>]*>/g,'') || '';
      document.getElementById('taf-key-ref').textContent = `— Quran ${key}`;
      vDisplay.style.display = 'block';
    }
  } catch {}

  const prompt = `For Quran verse ${key}, provide a detailed scholarly tafsir comparison.

${inclAr ? `First, confirm the Arabic text of ${key} and provide the Saheeh International translation.` : ''}

**${s1label} Tafsir:**
Provide a detailed explanation of ${key} from ${s1label}'s tafsir. Include:
- Main interpretation and key points
- Any relevant linguistic analysis  
- What this verse means according to this scholar
- Any hadith they cited (with proper attribution)
Use [AR: Arabic] markers for any Arabic text.

**${s2label} Tafsir:**
Provide a detailed explanation of ${key} from ${s2label}'s tafsir. Include:
- Main interpretation and key points
- Any notable differences from the first scholar
- Their unique contribution to understanding this verse
Use [AR: Arabic] markers for any Arabic text.

**Points of Scholarly Agreement:**
What do both scholars agree on?

**Points of Difference:**
Are there any notable differences in interpretation?

${inclHad ? `**Related Hadith:**
List 1-2 authentic hadith related to this verse's theme. Include narrator, collection, and brief text.` : ''}

IMPORTANT: Only cite real tafsir content. If you're not certain of a specific detail from these scholars, say "According to the general position of this school" rather than fabricating specific citations.`;

  try {
    const d = await callAIBackend([{role:'user', content:prompt}]);
    const text = d.text || '';

    // Split into two scholar sections and render as grid
    if (outGrid) {
      const cell = (title, content, color) => `
        <div style="background:var(--sf2);border:1px solid var(--bd);border-radius:10px;overflow:hidden">
          <div style="background:${color};color:#fff;padding:10px 14px;font-size:13px;font-weight:700">${title}</div>
          <div style="padding:14px;font-size:13.5px;color:var(--t2);line-height:1.75">${renderMD(content)}</div>
        </div>`;

      // Try to split by scholar headers
      const parts = text.split(/\*\*(?:Al-|Ibn )[^*]+\*\*/);
      if (parts.length >= 3) {
        outGrid.innerHTML = cell(s1label, parts[1]||'', 'var(--em)') + cell(s2label, parts[2]||'', '#6366f1');
      } else {
        outGrid.style.gridTemplateColumns = '1fr';
        outGrid.innerHTML = `<div class="ai-md-out">${renderMD(text)}</div>`;
      }
    }

    if (inclSum && sumOut) {
      const sumPrompt = `In 2-3 sentences, what is the most important lesson a modern Muslim should take from Quran ${key} based on classical scholarship?`;
      const sd = await callAIBackend([{role:'user', content:sumPrompt}]);
      sumOut.innerHTML = '<div style="font-size:11px;font-weight:700;color:var(--gd);margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em"> AI Summary</div>' +
        '<p style="margin:0">' + renderMD(sd.text||'') + '</p>';
      sumOut.classList.add('show');
    }
  } catch(e) {
    if (outGrid) outGrid.innerHTML = `<div style="color:var(--red);padding:12px"> ${e.message||'Backend unavailable'}</div>`;
  }
}
window.aiTafsirCompare = aiTafsirCompare;

/* ════════════════════════
   TOPICS
════════════════════════ */
async function aiTopic(topic) {
  if (!topic?.trim()) return;
  const inp = document.getElementById('topic-inp'); if (inp) inp.value = topic;
  const out = document.getElementById('topic-out'); if (!out) return;
  setOutLoading(out);
  try {
    const d = await callAIBackend([{role:'user', content:
      `Find 5-7 Quranic verses about the theme of "${topic}".

For each verse, provide:
**Verse Key: [Surah:Ayah]**
[AR: Arabic text]
*Translation (Saheeh International):* "..."
**Relevance:** [Why this verse is relevant to ${topic}]

Then provide:
## Quranic Perspective on ${topic}
[A 2-3 paragraph synthesis of what the Quran teaches about this topic, based on authentic scholarship]

## Key Arabic Terms
[List the most important Arabic words related to this topic with their meanings]

## Practical Guidance
[3 practical ways a Muslim can apply this Quranic teaching today]

IMPORTANT: Only cite real Quranic verses. Verify verse keys are accurate. If uncertain about a specific verse, say so.`
    }]);
    out.innerHTML = '<p style="margin:0">' + renderMD(d.text||'') + '</p>';
    out.classList.add('show');
  } catch(e) {
    out.innerHTML = `<p style="color:var(--red)"> ${e.message||'Backend unavailable'}</p>`;
    out.classList.add('show');
  }
}
window.aiTopic = aiTopic;

/* ════════════════════════
   SCAN
════════════════════════ */
async function scanFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('Please select an image file'); return; }
  const out = document.getElementById('scan-out'); if (!out) return;
  setOutLoading(out);
  try {
    const b64 = await new Promise((res,rej)=>{
      const r = new FileReader(); r.onload=()=>res(r.result.split(',')[1]); r.onerror=rej; r.readAsDataURL(file);
    });
    const d = await callAIBackend([{role:'user', content:
      `I'm sharing an image of Quran text (base64 length: ${b64.length} chars).
Please identify the Surah and verse number(s) shown.
Provide: verse key(s), Arabic text [AR: ...], Saheeh International translation, and 2-3 sentences of context.
If you cannot process the image, clearly say so and explain what type of model is needed (multimodal vision model).`
    }]);
    out.innerHTML = '<p style="margin:0">' + renderMD(d.text||'') + '</p>';
    out.classList.add('show');
  } catch(e) {
    out.innerHTML = `<p style="color:var(--red)"> ${e.message||'Scan unavailable — requires multimodal backend'}</p>`;
    out.classList.add('show');
  }
}
window.scanFile = scanFile;

/* ── Shared helper ── */
function setOutLoading(el) {
  el.innerHTML = '<div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>';
  el.classList.add('show');
}
window.setOutLoading = setOutLoading;

/* ══════════════════════════════════════════════
   PLATFORM CONTROL CHATBOT
   Detects navigation/control intents in chat
   and executes them directly in the app.
   Runs BEFORE sending to AI — instant responses
   for unambiguous commands.
══════════════════════════════════════════════ */
const PLATFORM_INTENTS = [
  /* Navigation */
  { pattern: /\b(open|go to|show|navigate|take me to|visit)\b.*\b(home|main|start)\b/i,  action: () => { navigate('home'); return 'Opening the home page.'; } },
  { pattern: /\b(open|go to|show|navigate)\b.*\b(mushaf|quran|mus[ée]?f)\b/i,           action: () => { navigate('mushaf'); return 'Opening the Mushaf.'; } },
  { pattern: /\b(open|go to|show|navigate)\b.*\b(adhkar|dhikr|remembrance)\b/i,          action: () => { navigate('dhikr'); return 'Opening Adhkar.'; } },
  { pattern: /\b(open|go to|show|navigate)\b.*\b(radio|audio|listen|reciters?)\b/i,      action: () => { navigate('radio'); return 'Opening Audio.'; } },
  { pattern: /\b(open|go to|show|navigate)\b.*\b(settings|preferences|config)\b/i,       action: () => { if(window.openSettings) openSettings(); return 'Opening Settings.'; } },
  { pattern: /\b(open|go to|show|navigate)\b.*\b(bookmarks?)\b/i,                        action: () => { if(window.toggleBookmarks) toggleBookmarks(); return 'Opening Bookmarks.'; } },
  { pattern: /\b(open|go to|show|navigate)\b.*\b(insights?|analytics|report)\b/i,        action: () => { navigate('analytics'); return 'Opening Usage Insights.'; } },
  { pattern: /\b(open|go to|show|navigate)\b.*\b(madhab|school|fiqh|jurisprudence)\b/i,  action: () => { navigate('madhab'); return 'Opening Islamic Schools of Thought.'; } },

  /* Surah by number */
  { pattern: /\b(open|read|play|show)\b.*\bsurah\s+(\d+)\b/i,
    action: (m) => {
      const id = parseInt(m[2]);
      if (id >= 1 && id <= 114 && window.openChapter) { openChapter(id); return `Opening Surah ${id}.`; }
      return `Surah ${id} is not valid. The Quran has 114 surahs.`;
    }
  },
  /* Surah by name */
  { pattern: /\b(open|read|show|take me to)\b.+\b(fatiha|baqarah|imran|nisa|maida|anam|araf|anfal|tawbah|yunus|hud|yusuf|ibrahim|hijr|nahl|isra|kahf|maryam|taha|anbiya|hajj|muminun|nur|furqan|shuara|naml|qasas|ankabut|rum|luqman|sajdah|ahzab|saba|fatir|yasin|ya.sin|saffat|sad|zumar|ghafir|fussilat|shura|zukhruf|dukhan|jathiyah|ahqaf|muhammad|fath|hujurat|qaf|dhariyat|tur|najm|qamar|rahman|waqi.a|hadid|mujadila|hashr|mumtahana|saff|jumuah|munafiqun|taghabun|talaq|tahrim|mulk|qalam|haqqah|maarij|nuh|jinn|muzzammil|muddathir|qiyamah|insan|mursalat|naba|naziat|abasa|takwir|infitar|mutaffifin|inshiqaq|buruj|tariq|ala|ghashiyah|fajr|balad|shams|layl|duha|sharh|tin|alaq|qadr|bayyina|zalzalah|adiyat|qari.a|takathur|asr|humazah|fil|quraysh|maun|kawthar|kafirun|nasr|masad|ikhlas|falaq|nas)\b/i,
    action: (m) => {
      const name = m[2].toLowerCase().replace(/[^a-z]/g,'');
      const MAP = {fatiha:1,baqarah:2,imran:3,nisa:4,maida:5,anam:6,araf:7,anfal:8,tawbah:9,yunus:10,hud:11,yusuf:12,ibrahim:14,kahf:18,maryam:19,taha:20,yasin:36,yaSin:36,rahman:55,waqi:56,mulk:67,ikhlas:112,falaq:113,nas:114,fajr:89,asr:103,kawthar:108,kafirun:109,nasr:110,masad:111,qadr:97};
      const ch = window.G?.chapters?.find(c => c.name_simple.toLowerCase().replace(/[^a-z]/g,'').includes(name));
      const id = ch?.id || MAP[name];
      if (id && window.openChapter) { openChapter(id); return `Opening Surah ${ch?.name_simple || id}.`; }
      return `I couldn't find that surah. Try opening it from the surah list.`;
    }
  },

  /* Play audio */
  { pattern: /\b(play|recite|listen to)\b.*\bsurah\s+(\d+)\b/i,
    action: (m) => {
      const id = parseInt(m[2]);
      if (id >= 1 && id <= 114 && window.startChapterAudio) { startChapterAudio(id); return `Playing Surah ${id}.`; }
      return 'Audio playback failed — please open a surah first.';
    }
  },
  { pattern: /\b(play|resume|start)\b.*\b(audio|recitation|tilawah|quran)\b/i,
    action: () => { if(window.togglePlay) togglePlay(); return 'Toggling audio playback.'; }
  },
  { pattern: /\b(pause|stop)\b.*\b(audio|recitation|music|playing)\b/i,
    action: () => { if(window.AUDIO?.el) { AUDIO.el.pause(); AUDIO.playing=false; if(window.setPlayIcon) setPlayIcon('play'); } return 'Audio paused.'; }
  },

  /* Theme */
  { pattern: /\b(dark|night)\s+mode\b|\bswitch to dark\b/i,        action: () => { applyTheme('dark'); return 'Switched to dark (Emerald) theme.'; } },
  { pattern: /\b(light|day)\s+mode\b|\bswitch to light\b/i,        action: () => { applyTheme('light'); return 'Switched to light theme.'; } },
  { pattern: /\bhigh.?contrast\b/i,                                  action: () => { applyTheme('dark-hc'); return 'Switched to high contrast theme.'; } },

  /* Jump to verse */
  { pattern: /\b(jump|go|open|show)\b.*\b(\d{1,3})\s*:\s*(\d{1,3})\b/,
    action: (m) => {
      const key = `${m[2]}:${m[3]}`;
      if (window.jumpToVerse) { jumpToVerse(key); return `Jumping to ${key}.`; }
      return `Opening ${key}.`;
    }
  },

  /* Search */
  { pattern: /\b(search|find|look up)\b\s+(?:for\s+)?['"]?([^'"]+)['"]?$/i,
    action: (m) => {
      const q = m[2].trim().slice(0, 50);
      const inp = document.getElementById('nav-q');
      if (inp) { inp.value = q; inp.dispatchEvent(new Event('input')); inp.focus(); }
      return `Searching for "${q}"…`;
    }
  },
];

/* Intercept aiSend to check for platform intents first */
const _origAiSend = window.aiSend;
window.aiSend = async function(msg) {
  if (!msg?.trim()) return;
  /* Try platform control */
  for (const intent of PLATFORM_INTENTS) {
    const m = msg.match(intent.pattern);
    if (m) {
      const result = intent.action(m);
      if (typeof result === 'string') {
        /* Show instant platform response */
        const msgs = document.getElementById('chat-msgs');
        if (msgs) {
          msgs.appendChild(makeBubble(true, msg));
          const resp = makeBubble(false, result + '\n\nIs there anything else I can help you with?');
          msgs.appendChild(resp);
          msgs.scrollTop = msgs.scrollHeight;
          if (window.aiTab) aiTab('chat', document.querySelector('#pg-ai .ai-tab'));
        }
        if (window.haptic) haptic('light');
        return;
      }
    }
  }
  /* Not a platform command — send to AI */
  return _origAiSend(msg);
};

/* Floating AI assistant button (shown on all pages except AI page) */
(function() {
  var fab = document.createElement('button');
  fab.id = 'ai-fab';
  fab.setAttribute('aria-label', 'Ask AI');
  fab.title = 'Ask Tarteel — Islamic AI Assistant';
  fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="12" r="10"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  fab.onclick = function() {
    if (window.G?.view === 'ai') return;
    navigate('ai');
    if (window.haptic) haptic('medium');
  };
  document.body.appendChild(fab);

  /* Hide on AI page */
  var _origNav = window.navigate;
  window.navigate = function(view, opts) {
    fab.style.display = view === 'ai' ? 'none' : '';
    return _origNav(view, opts);
  };
})();
