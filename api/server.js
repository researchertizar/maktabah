/**
 * api/server.js — Maktabah Backend API
 *
 * Security fixes applied:
 *  BUG-01: Keys in .env only — never committed
 *  BUG-06: Fail-fast on missing JWT_SECRET / ADMIN_PASSWORD
 *  BUG-07: CORS restricted to ALLOWED_ORIGIN env var
 *  BUG-20: Max 30 messages per AI request
 *  BUG-23: Helmet.js for security headers
 *  BUG-24: systemPrompt now correctly destructured and passed as effectiveSystem
 *  BUG-25: Admin login now rate-limited (10 attempts per hour per IP)
 *  BUG-26: Zod input validation applied to AI chat route
 *
 * Deploy free on: Railway · Render · Fly.io
 * Set env vars: GROQ_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY,
 *               JWT_SECRET, ADMIN_PASSWORD, ALLOWED_ORIGIN
 */

'use strict';

/* ── Load .env FIRST — must be before any process.env reads ── */
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const jwt     = require('jsonwebtoken');
const rLimit  = require('express-rate-limit');
const { z }   = require('zod');

/* ── Auto-generate dev secrets if missing (DEV only) ── */
const crypto = require('crypto');
const IS_DEV = (process.env.NODE_ENV !== 'production');

if (!process.env.JWT_SECRET) {
  if (IS_DEV) {
    process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
    console.warn('[DEV] JWT_SECRET not set — using auto-generated secret (restart resets tokens)');
    console.warn('[DEV] For production: set JWT_SECRET in your .env file');
  } else {
    console.error('[FATAL] Missing required env var: JWT_SECRET');
    console.error('  → Copy .env.example to .env and fill in JWT_SECRET');
    process.exit(1);
  }
}
if (!process.env.ADMIN_PASSWORD) {
  if (IS_DEV) {
    process.env.ADMIN_PASSWORD = 'dev-password-change-in-production';
    console.warn('[DEV] ADMIN_PASSWORD not set — using default dev password');
  } else {
    console.error('[FATAL] Missing required env var: ADMIN_PASSWORD');
    process.exit(1);
  }
}

const app  = express();
const PORT = process.env.PORT || 3001;

/* ── Security: Helmet headers ── */
app.use(helmet({
  contentSecurityPolicy: false,  // configured separately if needed
  crossOriginEmbedderPolicy: false,
}));

/* ── CORS: only allowed origins ── */
const ALLOWED = (process.env.ALLOWED_ORIGIN || 'http://localhost:3000,http://localhost:5500,http://127.0.0.1:5500')
  .split(',').map(s => s.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (same-origin, curl, etc.)
    if (!origin || ALLOWED.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: ${origin} not allowed`));
  },
  methods: ['GET','POST'],
  credentials: true,
}));

/* ── Body parsing ── */
app.use(express.json({ limit: '512kb' }));

/* ── Rate limiting ── */
const aiLimiter = rLimit({
  windowMs: 15 * 60 * 1000,   // 15 min
  max:      50,                 // 50 AI requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many requests. Please wait a few minutes.' },
});

/* BUG-25 fix: rate-limit the admin login endpoint */
const adminLimiter = rLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max:      10,                 // 10 login attempts per hour per IP
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many login attempts. Try again in an hour.' },
  skipSuccessfulRequests: true, // only count failures
});

/* BUG-26: Zod schema for AI chat request validation */
const MessageSchema = z.object({
  role:    z.string().max(15),
  content: z.string().max(4000),
});
const AIChatSchema = z.object({
  messages:       z.array(MessageSchema).min(1).max(30),
  systemPrompt:   z.string().max(2000).optional(),
  preferProvider: z.enum(['groq', 'gemini', 'openai', '']).optional(),
});

/* ── Health check ── */
app.get('/api/health', (_, res) => {
  const aiEnabled = !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
  res.json({ ok: true, aiEnabled, ts: Date.now() });
});

/* ── AI Chat endpoint ── */
app.post('/api/ai/chat', aiLimiter, async (req, res) => {
  /* BUG-26: Validate and parse input with Zod */
  const parsed = AIChatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
  }

  /* BUG-24 fix: destructure systemPrompt (was never destructured before — caused undefined prompt) */
  let { messages, systemPrompt } = parsed.data;

  /* BUG-20 fix: cap messages to 30 and sanitise */
  messages = messages
    .filter(m => m?.role && typeof m.content === 'string')
    .map(m => ({ role: String(m.role).slice(0, 15), content: String(m.content).slice(0, 4000) }))
    .slice(-30);

  if (!messages.length) return res.status(400).json({ error: 'No valid messages' });

  /* BUG-24 fix: effectiveSystem is now passed to ALL three providers (was using undefined `systemPrompt`) */
  const effectiveSystem = (systemPrompt && systemPrompt.length > 20)
    ? systemPrompt
    : `You are Tarteel, an Islamic scholarly AI assistant. Provide authentic, well-grounded Islamic knowledge.\nRULES: Never fabricate Quranic verses or hadith. Always cite sources. If uncertain, say so clearly.\nFormat with markdown: ## headings, **bold**, > blockquotes for Quran text. Use [AR: Arabic text] for Arabic.`;

  /* Provider fallback chain: Groq → Gemini → OpenAI */
  let lastErr;

  if (process.env.GROQ_API_KEY) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({
          model:      'llama-3.3-70b-versatile',
          max_tokens: 1200,
          messages:   [{ role: 'system', content: effectiveSystem }, ...messages],
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (r.ok) {
        const d = await r.json();
        return res.json({ text: d.choices[0]?.message?.content || '', provider: 'groq', model: d.model });
      }
      lastErr = `Groq ${r.status}`;
    } catch (e) { lastErr = e.message; }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const geminiMsgs = messages.map(m => ({
        role:  m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: effectiveSystem }] },
            contents:           geminiMsgs,
            generationConfig:   { maxOutputTokens: 1200 },
          }),
          signal: AbortSignal.timeout(20_000),
        }
      );
      if (r.ok) {
        const d    = await r.json();
        const text = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return res.json({ text, provider: 'gemini', model: 'gemini-2.0-flash' });
      }
      lastErr = `Gemini ${r.status}`;
    } catch (e) { lastErr = e.message; }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model:      'gpt-4o-mini',
          max_tokens: 1200,
          messages:   [{ role: 'system', content: effectiveSystem }, ...messages],
        }),
        signal: AbortSignal.timeout(25_000),
      });
      if (r.ok) {
        const d = await r.json();
        return res.json({ text: d.choices[0]?.message?.content || '', provider: 'openai', model: d.model });
      }
      lastErr = `OpenAI ${r.status}`;
    } catch (e) { lastErr = e.message; }
  }

  res.status(503).json({ error: `AI providers unavailable: ${lastErr || 'no keys configured'}` });
});

/* ── Admin auth endpoint ── */
/* BUG-25 fix: adminLimiter applied — max 10 attempts per hour per IP */
app.post('/api/admin/login', adminLimiter, (req, res) => {
  const { password } = req.body || {};
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = jwt.sign({ admin: true }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

/* ── 404 handler ── */
app.use((_, res) => res.status(404).json({ error: 'Not found' }));

/* ── Error handler ── */
app.use((err, _, res, __) => {
  console.error('[server error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✅ Maktabah API running on port ${PORT}`);
  console.log(`   AI: Groq=${!!process.env.GROQ_API_KEY} Gemini=${!!process.env.GEMINI_API_KEY} OpenAI=${!!process.env.OPENAI_API_KEY}`);
});
