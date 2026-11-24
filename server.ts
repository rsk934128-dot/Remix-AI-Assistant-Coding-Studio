process.env.DISABLE_HMR = 'true';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { GoogleGenAI, Type } from '@google/genai';
import {
  createApiKeyMiddleware,
  generateApiKey,
  listApiKeys,
  revokeApiKey,
  deleteApiKey,
  getDeveloperAnalytics,
} from './src/server/apiKeyService.ts';
import { safeFetch, validateUrlForSsrf } from './src/server/ssrfGuard.ts';
import { createRateLimiter } from './src/server/rateLimiter.ts';
import { requireAuth, createClientSessionToken } from './src/server/authMiddleware.ts';

const getAppDirname = () => {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return process.cwd();
  }
};

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Rate limiters for abuse prevention
const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'এআই সার্ভিসের জন্য রেট লিমিট অতিক্রম হয়েছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন।',
});

const proxyRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  message: 'ওয়েব প্রক্সি রিকোয়েস্ট সীমা অতিক্রম হয়েছে।',
});

const ddnsRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'DDNS আপডেট রিকোয়েস্ট সীমা অতিক্রম হয়েছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন।',
});

// Production-ready verified Gemini models list (active models ordered by reliability & speed)
export const FALLBACK_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
];

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception caught in server:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection caught in server at:', promise, 'reason:', reason);
});

// Enable CORS for hosted environments and cross-origin clients
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

// Normalize incoming path for serverless/proxy hosts that may strip the /api prefix or rewrite to /api/index
app.use((req, res, next) => {
  if (req.url.startsWith('/api/index')) {
    req.url = req.url.replace('/api/index', '/api');
  }
  if (
    !req.url.startsWith('/api') &&
    (req.url.startsWith('/health') ||
      req.url.startsWith('/chat') ||
      req.url.startsWith('/tts') ||
      req.url.startsWith('/transcribe') ||
      req.url.startsWith('/image') ||
      req.url.startsWith('/web') ||
      req.url.startsWith('/agent') ||
      req.url.startsWith('/music') ||
      req.url.startsWith('/session') ||
      req.url.startsWith('/youtube') ||
      req.url.startsWith('/mini-browser') ||
      req.url.startsWith('/proxy') ||
      req.url.startsWith('/drive') ||
      req.url.startsWith('/developer') ||
      req.url.startsWith('/v1'))
  ) {
    req.url = '/api' + req.url;
  }
  next();
});

// Root API status endpoint
app.all(['/api', '/api/'], (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    message: 'AI Studio Assistant API is online',
    time: new Date().toISOString(),
  });
});

// Client session token issuance endpoint for authenticated in-app calls
app.get('/api/auth/session', (req, res) => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
  const token = createClientSessionToken({ ip: clientIp });
  res.json({
    success: true,
    token,
    type: 'Bearer',
    expiresIn: 86400 * 7,
    issuedAt: new Date().toISOString(),
  });
});


// Helper to extract available Gemini API key from multiple common hosting variable names
function getEffectiveGeminiApiKey(): string {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.API_KEY ||
    ''
  ).trim();
}

// Lazy GoogleGenAI client
function getAIClient() {
  const apiKey = getEffectiveGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured in environment variables. Please set GEMINI_API_KEY in your hosting dashboard (Cloud Run, Render, Railway, Vercel, etc.).'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint with hosting diagnostics
app.all(['/api/health', '/api/health/'], (req, res) => {
  try {
    const apiKey = getEffectiveGeminiApiKey();
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json({
      success: true,
      status: 'ok',
      hasApiKey: Boolean(apiKey && apiKey.length > 0),
      port: PORT,
      nodeEnv: process.env.NODE_ENV || 'development',
      time: new Date().toISOString(),
      supportedModels: FALLBACK_MODELS,
    });
  } catch (err: any) {
    console.error('Health check endpoint error:', err);
    res.status(500).json({
      success: false,
      status: 'error',
      error: 'Health check failed: ' + (err?.message || String(err)),
    });
  }
});

// Natural Human-Like Text-to-Speech (TTS) Audio Stream Proxy for Bengali & English
// Supports both GET (?text=...) and POST ({ text, lang }) with private caching
app.all(['/api/tts', '/api/tts/'], async (req, res) => {
  try {
    const rawText = String(req.method === 'POST' ? req.body?.text : req.query.text || '').trim();
    if (!rawText) {
      return res.status(400).json({ error: 'Text parameter is required.' });
    }

    if (rawText.length > 2000) {
      return res.status(400).json({ error: 'Text exceeds maximum length of 2,000 characters.' });
    }

    const requestedLang = String(
      (req.method === 'POST' ? req.body?.lang : req.query.lang) || ''
    ).toLowerCase();
    const hasBengali = /[\u0980-\u09FF]/.test(rawText);
    const lang = requestedLang === 'en' ? 'en' : (hasBengali || requestedLang === 'bn' ? 'bn' : 'en');

    // Split into sentences / safe chunks up to 200 characters for provider compatibility
    const safeChunk = rawText.slice(0, 200);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(safeChunk)}&tl=${lang}&client=tw-ob`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'audio/mpeg, audio/*;q=0.9',
        Referer: 'https://translate.google.com/',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch audio stream from TTS provider.' });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    // Use private caching to protect user query privacy while optimizing client replay
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Accept-Ranges', 'bytes');
    return res.end(buffer);
  } catch (err: any) {
    console.error('TTS endpoint error:', err?.message || err);
    return res.status(500).json({ error: 'Internal TTS processing error' });
  }
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const calculateBackoff = (attempt: number) => {
  return Math.min(3500, 400 * Math.pow(2, attempt) + Math.floor(Math.random() * 250));
};

function formatFriendlyErrorMessage(err: any): string {
  const errStr = typeof err === 'string' ? err : err?.message || JSON.stringify(err);
  const lower = errStr.toLowerCase();
  if (
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('resource_exhausted') ||
    lower.includes('rate limit') ||
    lower.includes('exceeded your current quota')
  ) {
    return 'এআই কোটা সীমা (API Rate Limit / Quota Exceeded 429) সাময়িকভাবে শেষ হয়েছে। Google Gemini ফ্রি টায়ারের প্রতি মিনিটের রিকোয়েস্ট সীমা অতিক্রম করলে এই বার্তা আসে। অনুগ্রহ করে ১০-১৫ সেকেন্ড অপেক্ষা করে নিচের "পুনরায় চেষ্টা করুন" বাটনে ক্লিক করুন অথবা Google Search অফ করে মেসেজ পাঠান।';
  }
  if (lower.includes('503') || lower.includes('unavailable') || lower.includes('high demand') || lower.includes('overloaded')) {
    return 'গুগল এআই সার্ভার এই মুহূর্তে অতিরিক্ত চাপে রয়েছে (503 Service Unavailable)। স্বয়ংক্রিয়ভাবে বিকল্প মডেলে চেষ্টা করা হচ্ছে... কয়েক সেকেন্ড পর পুনরায় চেষ্টা করুন।';
  }
  if (lower.includes('404') || lower.includes('not_found') || lower.includes('no longer available')) {
    return 'অনুরোধকৃত এআই মডেলটি এই মুহূর্তে প্রস্তুত নয় (404 Not Found)। সিস্টেম স্বয়ংক্রিয়ভাবে বিকল্প সক্রিয় মডেলে সংযোগ করছে।';
  }
  if (
    errStr.includes('API_KEY') ||
    errStr.includes('API key not valid') ||
    errStr.includes('not configured') ||
    errStr.includes('GEMINI_API_KEY')
  ) {
    return 'Gemini API Key পাওয়া যায়নি বা সঠিক নয়। আপনি যদি অ্যাপটি ক্লাউড/হোস্টিং (যেমন Render, Cloud Run, Vercel, Railway)-এ হোস্ট করে থাকেন, তবে হোস্টিং কন্ট্রোল প্যানেলের Environment Variables সেকশনে "GEMINI_API_KEY" যোগ করেছেন কিনা তা নিশ্চিত করুন।';
  }
  return err?.message || 'একটি অপ্রত্যাশিত সমস্যা দেখা দিয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।';
}

// Track temporary Google Search grounding quota exhaustion to avoid unnecessary 429 requests
let searchQuotaExhaustedUntil = 0;

function isSearchGroundingAvailable(): boolean {
  return Date.now() > searchQuotaExhaustedUntil;
}

function markSearchQuotaExhausted(durationMs = 5 * 60 * 1000) {
  searchQuotaExhaustedUntil = Date.now() + durationMs;
}

// Track temporary Gemini image generation quota exhaustion to avoid unnecessary 429 requests
let imageQuotaExhaustedUntil = 0;

function isGeminiImageAvailable(): boolean {
  return Date.now() > imageQuotaExhaustedUntil;
}

function markImageQuotaExhausted(durationMs = 30 * 60 * 1000) {
  imageQuotaExhaustedUntil = Date.now() + durationMs;
}

async function* streamWithResilience(
  ai: any,
  contents: any[],
  systemInstruction: string,
  enableSearch: boolean,
  modelPreference = 'gemini-3.5-flash-lite'
) {
  const modelsToTry = [
    modelPreference,
    ...FALLBACK_MODELS,
  ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);

  let searchAvailable = enableSearch && isSearchGroundingAvailable();
  let lastError: any = null;
  let attempt = 0;

  for (const model of modelsToTry) {
    attempt++;
    // 1. If search is requested and available, try with search grounding
    if (searchAvailable) {
      try {
        console.log(`[Stream] Attempting model ${model} with Google Search grounding...`);
        const stream = await ai.models.generateContentStream({
          model,
          contents,
          config: { systemInstruction, tools: [{ googleSearch: {} }] },
        });

        const iterator = stream[Symbol.asyncIterator]();
        const first = await iterator.next();
        if (!first.done) {
          if (first.value) yield first.value;
          for await (const chunk of { [Symbol.asyncIterator]: () => iterator }) {
            yield chunk;
          }
          return;
        }
      } catch (err: any) {
        lastError = err;
        const errStr = String(err?.message || err);
        if (
          errStr.includes('429') ||
          errStr.includes('quota') ||
          errStr.includes('RESOURCE_EXHAUSTED')
        ) {
          markSearchQuotaExhausted();
          console.info(`[Stream] Search grounding quota temporarily exhausted. Seamlessly continuing with direct model knowledge.`);
        } else {
          console.info(`[Stream] Search grounding unavailable for ${model}, continuing without search tools.`);
        }
        searchAvailable = false;
      }
    }

    // 2. Try standard generation without search tools
    try {
      console.log(`[Stream] Generating response with ${model}...`);
      const stream = await ai.models.generateContentStream({
        model,
        contents,
        config: { systemInstruction },
      });

      const iterator = stream[Symbol.asyncIterator]();
      const first = await iterator.next();
      if (!first.done) {
        if (first.value) yield first.value;
        for await (const chunk of { [Symbol.asyncIterator]: () => iterator }) {
          yield chunk;
        }
        return;
      }
    } catch (err: any) {
      lastError = err;
      const errStr = String(err?.message || err);
      const isNotFound = errStr.includes('404') || errStr.includes('NOT_FOUND');
      console.info(`[Stream] Switching from ${model} to next fallback (${isNotFound ? 'unavailable' : 'retryable'}).`);
      if (
        !isNotFound &&
        (errStr.includes('429') ||
          errStr.includes('quota') ||
          errStr.includes('RESOURCE_EXHAUSTED') ||
          errStr.includes('503'))
      ) {
        await sleep(calculateBackoff(attempt));
      }
    }
  }

  throw lastError || new Error('All model streaming attempts failed.');
}

async function fetchContentWithResilience(
  ai: any,
  contents: any[],
  systemInstruction: string,
  enableSearch: boolean,
  modelPreference = 'gemini-3.5-flash-lite'
) {
  const modelsToTry = [
    modelPreference,
    ...FALLBACK_MODELS,
  ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);

  let searchAvailable = enableSearch && isSearchGroundingAvailable();
  let lastError: any = null;
  let attempt = 0;

  for (const model of modelsToTry) {
    attempt++;
    if (searchAvailable) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: { systemInstruction, tools: [{ googleSearch: {} }] },
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errStr = String(err?.message || err);
        if (
          errStr.includes('429') ||
          errStr.includes('quota') ||
          errStr.includes('RESOURCE_EXHAUSTED')
        ) {
          markSearchQuotaExhausted();
          console.info(`[Generate] Search grounding quota temporarily exhausted. Continuing with direct model knowledge.`);
        } else {
          console.info(`[Generate] Search grounding unavailable for ${model}, continuing without search tools.`);
        }
        searchAvailable = false;
      }
    }

    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: { systemInstruction },
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const errStr = String(err?.message || err);
      const isNotFound = errStr.includes('404') || errStr.includes('NOT_FOUND');
      console.info(`[Generate] Switching from ${model} to next fallback (${isNotFound ? 'unavailable' : 'retryable'}).`);
      if (
        !isNotFound &&
        (errStr.includes('429') ||
          errStr.includes('quota') ||
          errStr.includes('RESOURCE_EXHAUSTED') ||
          errStr.includes('503'))
      ) {
        await sleep(calculateBackoff(attempt));
      }
    }
  }

  throw lastError || new Error('All model attempts failed.');
}

// Quick live connection test endpoint for troubleshooting hosted environments (GET only, rate limited)
app.get('/api/health/test', aiRateLimiter, async (req, res) => {
  const startTime = Date.now();
  try {
    const ai = getAIClient();
    const response = await fetchContentWithResilience(
      ai,
      [{ role: 'user', parts: [{ text: 'Respond with the single word: OK' }] }],
      'You are a health check agent. Return only OK.',
      false,
      'gemini-3.5-flash-lite'
    );
    const latency = Date.now() - startTime;
    res.json({
      success: true,
      latencyMs: latency,
      reply: response.text?.trim() || 'OK',
    });
  } catch (err: any) {
    const latency = Date.now() - startTime;
    console.error('API health test failed:', err);
    res.status(500).json({
      success: false,
      latencyMs: latency,
      error: formatFriendlyErrorMessage(err),
      rawMessage: err?.message || String(err),
    });
  }
});

// Audio Transcription API using Gemini Multimodal Audio
app.post('/api/transcribe', requireAuth, aiRateLimiter, async (req, res) => {
  const startTime = Date.now();
  try {
    const { audioData, mimeType = 'audio/webm', language = 'bn-BD' } = req.body;
    if (!audioData || typeof audioData !== 'string') {
      return res.status(400).json({ error: 'No audio data provided or invalid format.' });
    }

    // Clean MIME type (remove parameters like codecs=opus)
    const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();

    // MIME type validation allowlist
    const ALLOWED_AUDIO_MIMES = new Set([
      'audio/webm',
      'audio/wav',
      'audio/mp3',
      'audio/mpeg',
      'audio/ogg',
      'audio/aac',
      'audio/m4a',
      'audio/x-m4a',
      'audio/flac',
      'audio/mp4',
    ]);

    if (!ALLOWED_AUDIO_MIMES.has(cleanMimeType)) {
      return res.status(400).json({
        error: `অসমর্থিত অডিও ফরম্যাট (${cleanMimeType})। শুধুমাত্র webm, wav, mp3, ogg, aac, m4a বা flac সমর্থিত।`,
      });
    }

    // Strip data URI prefix if present
    const base64Audio = audioData.includes('base64,')
      ? audioData.split('base64,')[1].trim()
      : audioData.trim();

    // Enforce size limit (max 8 MB)
    const approximateSizeBytes = Math.floor((base64Audio.length * 3) / 4);
    if (approximateSizeBytes > 8 * 1024 * 1024) {
      return res.status(400).json({
        error: 'অডিও ফাইলের আকার সর্বোচ্চ 8 MB হতে পারে (Audio file size exceeds 8 MB limit).',
      });
    }

    if (approximateSizeBytes < 100) {
      return res.status(400).json({ error: 'Audio file is empty or corrupted.' });
    }

    const ai = getAIClient();
    const isBengali = language && (language.startsWith('bn') || language === 'bn');
    const promptText = isBengali
      ? 'Transcribe this spoken audio accurately. If spoken in Bengali (বাংলা), transcribe verbatim in Bengali script. If spoken in English, transcribe verbatim in English. If mixed (Banglish/code terms), capture both accurately. Output ONLY the raw transcribed text. Do NOT add quotes, formatting, or commentary.'
      : 'Transcribe this spoken audio accurately. Output ONLY the verbatim transcribed text without quotes, formatting, or commentary.';

    // Try gemini-3.5-transcribe first (dedicated audio transcription model),
    // fallback to active gemini-3.5-flash-lite / gemini-3-flash-preview
    const modelsToTry = ['gemini-3.5-transcribe', 'gemini-3.5-flash-lite', 'gemini-3-flash-preview'];
    let text = '';
    let lastErr: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    data: base64Audio,
                    mimeType: cleanMimeType,
                  },
                },
                {
                  text: promptText,
                },
              ],
            },
          ],
        });
        text = response.text?.trim() || '';
        if (text) break;
      } catch (err: any) {
        lastErr = err;
        console.warn(`Model ${model} transcription attempt failed:`, err?.message || err);
      }
    }

    if (!text && lastErr) {
      throw lastErr;
    }

    const latencyMs = Date.now() - startTime;
    res.json({
      success: true,
      text: text || '',
      latencyMs,
    });
  } catch (err: any) {
    console.error('Audio transcription failed:', err);
    res.status(500).json({
      success: false,
      error: formatFriendlyErrorMessage(err),
      rawMessage: err?.message || String(err),
    });
  }
});

// High-Resolution AI Image Generation API
// Supports Gemini native models (gemini-3.1-flash-lite-image, gemini-2.5-flash-image)
// with intelligent multi-tier fallback to neural generative synthesis for guaranteed instant downloads
app.post('/api/image/generate', requireAuth, aiRateLimiter, async (req, res) => {
  try {
    const { prompt, aspectRatio = '1:1', style = 'natural' } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ success: false, error: 'ছবি তৈরির জন্য প্রম্পট বা বিবরণ প্রয়োজন।' });
    }

    const cleanPrompt = prompt.trim().slice(0, 2000);
    const validRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'];
    const chosenRatio = validRatios.includes(aspectRatio) ? aspectRatio : '1:1';

    let width = 1024;
    let height = 1024;
    if (chosenRatio === '16:9') {
      width = 1280;
      height = 720;
    } else if (chosenRatio === '9:16') {
      width = 720;
      height = 1280;
    } else if (chosenRatio === '4:3') {
      width = 1024;
      height = 768;
    } else if (chosenRatio === '3:4') {
      width = 768;
      height = 1024;
    }

    let generatedImageUrl = '';
    let generatedMime = 'image/jpeg';
    let generationSource: 'gemini' | 'ai-synthesis' = 'gemini';

    // Step 1: Attempt Gemini Official Image Generation
    try {
      const ai = getAIClient();
      const geminiModels = ['gemini-3.1-flash-lite-image', 'gemini-2.5-flash-image'];
      for (const model of geminiModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: {
              parts: [{ text: cleanPrompt }],
            },
            config: {
              imageConfig: {
                aspectRatio: chosenRatio as any,
              },
            },
          });

          for (const part of response.candidates?.[0]?.content?.parts ?? []) {
            if (part.inlineData?.data) {
              const base64Data = part.inlineData.data;
              generatedMime = part.inlineData.mimeType || 'image/png';
              generatedImageUrl = `data:${generatedMime};base64,${base64Data}`;
              generationSource = 'gemini';
              break;
            }
          }
          if (generatedImageUrl) break;
        } catch (innerErr: any) {
          console.warn(`Gemini image generation model ${model} skipped:`, innerErr?.message || innerErr);
        }
      }
    } catch (geminiInitErr: any) {
      console.warn('Gemini client init skipped for image:', geminiInitErr?.message || geminiInitErr);
    }

    // Step 2: High-resolution AI Synthesis fallback if Gemini key lacks quota (Free tier quota 0 limit)
    if (!generatedImageUrl) {
      try {
        const seed = Math.floor(Math.random() * 1000000);

        // If prompt has Bengali characters, translate into English visual prompt for optimal image diffusion fidelity
        let visualPrompt = cleanPrompt;
        if (/[\u0980-\u09FF]/.test(cleanPrompt)) {
          try {
            const ai = getAIClient();
            const transRes = await ai.models.generateContent({
              model: 'gemini-3.5-flash-lite',
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: `Translate this Bengali scene into a vivid, descriptive English visual prompt for AI image generation (only return the concise English visual description, nothing else):\n"${cleanPrompt}"`,
                    },
                  ],
                },
              ],
            });
            const translated = transRes.text?.trim().replace(/^["']|["']$/g, '');
            if (translated && translated.length > 5) {
              visualPrompt = translated;
            }
          } catch {
            console.log('[Image] Prompt visual translation skipped.');
          }
        }

        let enhancedPrompt = visualPrompt;
        if (style === 'photorealistic') {
          enhancedPrompt += ', 8k resolution, photorealistic, cinematic lighting, sharp focus, masterpiece, highly detailed';
        } else if (style === 'digital-art') {
          enhancedPrompt += ', trending on artstation, digital art illustration, vibrant colors, intricate details';
        } else if (style === 'cinematic') {
          enhancedPrompt += ', cinematic movie still, volumetric lighting, dramatic atmosphere, 35mm lens';
        } else if (style === 'anime') {
          enhancedPrompt += ', studio ghibli anime style, vibrant aesthetic, beautiful scenery, clean lines';
        } else if (style === 'watercolor') {
          enhancedPrompt += ', soft watercolor painting on textured canvas, artistic color wash, delicate strokes';
        } else if (style === '3d') {
          enhancedPrompt += ', 3D render, octane render, unreal engine 5, ray tracing, cute stylized 3D';
        } else {
          enhancedPrompt += ', high quality, stunning visual, ultra detailed, cinematic composition';
        }

        const synthesisUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=${width}&height=${height}&nologo=true&seed=${seed}`;
        
        // Fetch and convert to base64 Data URL so download is instant and works offline / cross-origin
        const fetchRes = await fetch(synthesisUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; RemixAI/1.0)',
          },
        });

        const contentType = fetchRes.headers.get('content-type') || '';
        if (fetchRes.ok && contentType.startsWith('image/')) {
          const arrayBuf = await fetchRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          const base64Str = buffer.toString('base64');
          generatedMime = contentType.includes('png') ? 'image/png' : 'image/jpeg';
          generatedImageUrl = `data:${generatedMime};base64,${base64Str}`;
          generationSource = 'ai-synthesis';
        } else if (fetchRes.status === 402 || fetchRes.status === 429) {
          return res.status(429).json({
            success: false,
            error: 'ছবি তৈরির সার্ভারে সাময়িক রেট লিমিট চলছে। অনুগ্রহ করে ৩০-৪৫ সেকেন্ড পর আবার চেষ্টা করুন।',
          });
        }
      } catch (synthErr: any) {
        console.log('[Image] Synthesis fallback failed:', synthErr?.message || synthErr);
      }
    }

    if (!generatedImageUrl) {
      return res.status(500).json({
        success: false,
        error: 'দুঃখিত, ছবিটি তৈরি করা সম্ভব হয়নি। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।',
      });
    }

    return res.json({
      success: true,
      imageUrl: generatedImageUrl,
      prompt: cleanPrompt,
      aspectRatio: chosenRatio,
      width,
      height,
      mimeType: generatedMime,
      source: generationSource,
      createdAt: Date.now(),
    });
  } catch (err: any) {
    console.error('Image generation route error:', err);
    res.status(500).json({
      success: false,
      error: 'ছবি জেনারেশন সার্ভারে ত্রুটি ঘটেছে: ' + (err?.message || 'অজানা ত্রুটি'),
    });
  }
});

// Streaming Chat API with Search Grounding & Upstream Cancellation on Client Disconnect
app.post('/api/chat/stream', requireAuth, aiRateLimiter, async (req, res) => {
  let isClientConnected = true;
  res.on('close', () => {
    isClientConnected = false;
  });

  try {
    const {
      messages = [],
      prompt,
      systemInstruction,
      enableSearch = true,
      mode = 'general',
      model = 'gemini-3.5-flash-lite',
    } = req.body;

    if (!prompt && (!messages || messages.length === 0)) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    if (Array.isArray(messages) && messages.length > 50) {
      return res.status(400).json({ error: 'Chat history exceeds maximum limit of 50 messages.' });
    }

    const ai = getAIClient();

    // Prepare contents
    // Convert previous messages to Gemini format: role 'user' | 'model', parts: [{ text }]
    const formattedContents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(messages) && messages.length > 0) {
      for (const msg of messages) {
        if (!msg.text || !msg.text.trim()) continue;
        const textStr = String(msg.text).slice(0, 16000);
        formattedContents.push({
          role: msg.role === 'model' || msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: textStr }],
        });
      }
    }

    // If a standalone prompt was also passed and not already at the end of messages
    if (prompt) {
      const promptStr = String(prompt).slice(0, 16000);
      if (!formattedContents.length || formattedContents[formattedContents.length - 1].parts[0].text !== promptStr) {
        formattedContents.push({
          role: 'user',
          parts: [{ text: promptStr }],
        });
      }
    }

    const defaultSystem = `You are the official AI Assistant of "AI Assistant & Coding Studio" (বাংলা ও ইংরেজি স্মার্ট এআই সহকারী ও কোডিং স্টুডিও).

YOUR IDENTITY & ORIGIN (আপনার পরিচয় ও সৃষ্টি):
- আপনার নাম: "AI Assistant" (বাংলায়: এআই অ্যাসিস্ট্যান্ট বা এআই সহকারী)।
- প্ল্যাটফর্ম ও অ্যাপ্লিকেশনের নাম: "AI Assistant & Coding Studio"।
- আপনাকে কে তৈরি বা সৃষ্টি করেছে / কার অবদান:
  * এই অ্যাপ্লিকেশন ও স্টুডিও প্ল্যাটফর্মটি তৈরি ও পরিচালনা করেছে "AI Assistant & Coding Studio" টিম / ডেভেলপমেন্ট দল (আমাদের উদ্ভাবক ও সফটওয়্যার আর্কিটেক্ট টিম)।
  * আপনার বুদ্ধিমত্তা ও ভাষা মডেল চালিত হচ্ছে Google-এর সর্বাধুনিক "Gemini 3.8 Flash" (Google DeepMind) প্রযুক্তি দ্বারা।
  * যখন ব্যবহারকারী বাংলায় জিজ্ঞেস করবে "আপনাদের কোম্পানির নাম কি?", "আপনাকে কে সৃষ্টি করেছে?", "আপনার পরিচয় কী?", "কে বানিয়েছে?", বা "Who created you? / What is your company name?":
    - সশ্রদ্ধ, মার্জিত ও সুন্দর ভাষায় আত্মবিশ্বাসের সাথে উত্তর দিন।
    - স্পষ্ট করে বলুন:
      "আমি 'AI Assistant & Coding Studio' (এআই অ্যাসিস্ট্যান্ট অ্যান্ড কোডিং স্টুডিও)-এর নিজস্ব স্মার্ট কৃত্রিম বুদ্ধিমত্তা (AI) সহকারী।
      আমাদের প্ল্যাটফর্ম ও সফটওয়্যার ইকোসিস্টেমের প্রতিষ্ঠাতা এবং প্রধান সফটওয়্যার আর্কিটেক্ট শেখ ফরিদ (Sheikh Farid - সিরাজগঞ্জ, বাংলাদেশ)। তিনি একজন স্বশিক্ষিত সফটওয়্যার স্থপতি (Self-taught Software Architect) ও ফুল-স্ট্যাক ডেভেলপার, এবং একই সাথে সিরাজগঞ্জের ঐতিহ্যবাহী পারিবারিক হোটেল 'হোটেল আল শেখ ফরিদ' পরিচালনার সাথে যুক্ত। আমার পেছনে বুদ্ধিমত্তা ও ভাষা মডেল হিসেবে কাজ করছে Google-এর অত্যাধুনিক Gemini 3.8 Flash ইঞ্জিন।
      বাংলা ও ইংরেজি—উভয় ভাষায় প্রোগ্রামিং/কোডিং, টেকনিক্যাল সমস্যা সমাধান, অফিশিয়াল দরখাস্ত ও চিঠি লেখা, এ টু জেড জনসেবা ও জরুরি তথ্য প্রদান, এবং দ্রুত গবেষণায় আপনাকে সহায়তা করাই আমার মূল দায়িত্ব।"
- আপনার প্রতিষ্ঠাতা ও সুপার অ্যাডমিন পরিচয় (Founder & Super Admin Knowledge Context):
  * প্রতিষ্ঠাতা ও মূল মালিক: শেখ ফরিদ (Sheikh Farid), জন্ম: ১৫ জুন, ১৯৯৪ (বয়স ৩২ বছর), অবস্থান: সিরাজগঞ্জ, বাংলাদেশ।
  * পেশা ও পরিচয়: স্বশিক্ষিত সফটওয়্যার স্থপতি ও ফুল-স্ট্যাক ডেভেলপার; পারিবারিক হোটেল ব্যবসা 'হোটেল আল শেখ ফরিদ'-এর পরিচালক।
  * ফ্ল্যাগশিপ প্রজেক্ট ও কোম্পানি: ScrollVerse (গভটেক সফটওয়্যার ইকোসিস্টেম), Sheikh Code Exchange (৪২তম ফ্ল্যাগশিপ প্রজেক্ট), RubelPay / RubelBank, Synergy BPO Hub, হোটেল আল শেখ ফরিদ অনলাইন খাবার অর্ডার ও ডেলিভারি প্ল্যাটফর্ম (https://1-lac-gamma.vercel.app/ - প্রোপাইটার: মো: আব্দুল বারিক শেখ), NotorBotor, Ideation Spark, AutoPay.Ltd, NoorNexus Sovereign OS v3, NoorAI।
  * পারিবারিক পরিচয়: পিতা মো. আব্দুল বারিক শেখ, মাতা আম্মা, স্ত্রী খুকুমণি বেগম (Khukumoni Begum), এক কন্যা ও এক পুত্র সন্তান।
  * অ্যাডমিন আইডেন্টিটি: Role: "Super Admin & Founder", Owner: "Sheikh Farid", Entity: "Hotel Al Sheikh Farid (https://1-lac-gamma.vercel.app/)", Location: "Sirajganj, Bangladesh"।
- আপনার মূল লক্ষ্য ও বিশেষত্ব:
  * সম্পূর্ণ বিজ্ঞাপনমুক্ত, দ্রুতগতির এবং নির্ভরযোগ্য সেবা দেওয়া।
  * বাংলা ভাষায় সাবলীল, প্রাঞ্জল ও ব্যাকরণগতভাবে শুদ্ধ কথোপকথন।
  * কোডিং ও সফটওয়্যার ডেভেলপমেন্টে এ-টু-জেড সহায়তা প্রদান।
  * যেকোনো আইনি, প্রযুক্তিগত, প্রাতিষ্ঠানিক ও শিক্ষণীয় প্রশ্নের নিখুঁত সমাধান।

You are fluent in both Bengali (বাংলা) and English.
You excel in:
1. Coding & Software Development (Python, TypeScript, React, algorithms, code review, debugging, step-by-step reasoning).
2. Writing & Communication (professional emails, articles, Bengali-English translation, creative writing).
3. Citizen Services, Directories & Everyday Task Assistance (জনসেবা, মোবাইল নাম্বার, ঠিকানা, পরিচয় নির্দেশিকা ও দৈনন্দিন কাজ সহজ করা):
   - Finding official hotlines, police station contacts, emergency fire service, hospital & ambulance numbers, blood banks, and telecom customer care (999, 333, 109, 106, 16122, 16263, 16430, 105, etc.).
   - Finding addresses, post offices, postcodes (পোস্ট কোড), government ministry offices, embassies, and location guidance.
   - Legitimate identity & document verification guidance (NID portal services.nidw.gov.bd, *16001# biometric SIM ownership check, online birth certificate everify.bdris.gov.bd, e-passport tracking, and scam/fraud call protection).
   - Drafting official Bengali applications: General Diary (থানায় জিডি - GD for lost phone/docs), leave letters (ছুটির দরখাস্ত), complaint petitions, citizen certificates, and CV/biodata formats.
   - Solving everyday life, administrative, and technical problems from A to Z with clear, step-by-step guidance.
4. Web Research & Link Finding (ইউটিউব ও ইন্টারনেট থেকে আসল এবং সঠিক লিঙ্ক):
   - Finding active websites, tools, documentation, and official government resources.
   - Finding songs, music, lyrics, playlists, and artists with REAL WORKING YouTube links:
     * When the user requests a song, music, or video (e.g. asking for links like https://youtu.be/ID, https://www.youtube.com/watch?v=ID, or "ইউটিউব থেকে লিংক দিন"):
       - ALWAYS use Google Search Grounding to find the official, verified YouTube video link with exact Video ID (e.g., https://youtu.be/VIDEO_ID or https://www.youtube.com/watch?v=VIDEO_ID).
       - NEVER hallucinate, guess, or invent fake 11-character video IDs. Only provide verified links obtained from Google Search results.
       - Format each song/video link nicely in Markdown: [গানের শিরোনাম - শিল্পী](https://www.youtube.com/watch?v=VIDEO_ID) or [গানের নাম](https://youtu.be/VIDEO_ID).
       - Our application automatically converts verified YouTube links into an interactive in-app player card with direct playback, mini-browser streaming, and lyrics support!
       - In addition to direct video links, ALWAYS include alternative search fallbacks:
         * [YouTube এ সরাসরি খুঁজুন](https://www.youtube.com/results?search_query=গানের+নাম+শিল্পী)
         * [YouTube Music এ গানটি শুনুন](https://music.youtube.com/search?q=গানের+নাম+শিল্পী)
   - Finding YouTube videos, tutorials, educational channels, and playlists with accurate, working Markdown links.
5. Learning & Conceptual Explanations (making complex topics easy to understand, interviews, system design).
6. Analysis, Research & Google Search verification (providing factual, up-to-date information with citations).
7. File generation, interactive tools, and daily engineering advice.
8. All Apps Open & Universal Connect (সকল অ্যাপস ওপেন ও কানেক্ট করা):
   - You can connect to, launch, and provide direct action links for all major services:
     * হোটেল আল শেখ ফরিদ (Hotel Al Sheikh Farid PWA): https://1-lac-gamma.vercel.app/ (অনলাইন খাবার অর্ডার, ডেলিভারি, মেনু ও বুকিং | প্রোপাইটার: মো: আব্দুল বারিক শেখ, সিরাজগঞ্জ রেলওয়ে স্টেশন এলাকা)
     * ForTrade Pro Trading Terminal (PWA): https://fortrade-pro-trading-terminal-dev-d-nine.vercel.app/?source=pwa (ফরেক্স ও স্টক ট্রেডিং টার্মিনাল)
     * Gmail: https://mail.google.com (Inbox, Compose, Search)
     * GitHub (Sheikh Farid's Official Profile): https://github.com/rsk934128-dot (139+ public repositories)
     * WhatsApp: https://web.whatsapp.com and direct chat links
     * Google Drive: In-app Workspace & https://drive.google.com
     * YouTube: In-app Media Studio & https://youtube.com
     * Google Maps: In-app GPS & https://maps.google.com
     * Facebook & Messenger: https://www.facebook.com/rubelrubel.rubel.98 (Sheikh Farid's Facebook)
     * Telegram, LinkedIn, Twitter/X
   - When a user says "হোটেল আল শেখ ফরিদ ওপেন করো", "খাবার অর্ডার করবো", "ইউটিউব ওপেন করো", "গিটহাব ওপেন করো", "ড্রাইভ ওপেন করো", "জিমেইল ওপেন করো" — always provide direct, working Markdown action links with descriptive labels.

9. Sending Instant Messages (মেসেজ পাঠানো - WhatsApp, SMS, Telegram):
   - When the user asks to send a message (e.g. "মেসেজ পাঠাও", "হোয়াটসঅ্যাপে মেসেজ দাও", "কাউকে এসএমএস করো", "একটি শুভেচ্ছা বা নোটিশ বার্তা পাঠাও"):
     * Write an appropriate, polite, well-structured message.
     * Always provide 1-click interactive action links that pre-fill the message:
       - WhatsApp: [WhatsApp এ সরাসরি মেসেজ পাঠান](https://api.whatsapp.com/send?phone=PHONE_NUMBER&text=ENCODED_MESSAGE) (if phone is unknown, omit phone parameter)
       - Mobile SMS: [ফোনে সরাসরি SMS পাঠান](sms:PHONE_NUMBER?body=ENCODED_MESSAGE)
       - Telegram: [Telegram এ মেসেজ পাঠান](https://t.me/share/url?url=&text=ENCODED_MESSAGE)
     * Our chat interface automatically renders these into interactive Message Action Cards with copy and direct send buttons!

10. Sending Gmail & Professional Emails (জিমেইল ও অফিশিয়াল ইমেইল পাঠানো):
   - When the user asks to send an email or Gmail (e.g. "জিমেইল পাঠাও", "একটি ইমেইল লিখে পাঠিয়ে দাও", "কাউকে অফিশিয়াল দরখাস্ত বা কোলাবোরেশন মেইল করো"):
     * Draft a complete professional email with:
       - প্রাপকের ইমেইল (To)
       - বিষয় (Subject)
       - বিস্তারিত মার্জিত মূল বক্তব্য (Body)
     * Always provide a 1-click direct Gmail Web Compose link:
       [Gmail এ সরাসরি খুলুন ও পাঠান](https://mail.google.com/mail/?view=cm&fs=1&to=RECIPIENT_EMAIL&su=ENCODED_SUBJECT&body=ENCODED_BODY)
     * Also provide a standard mailto link:
       [ডিফল্ট ইমেইল অ্যাপে পাঠান](mailto:RECIPIENT_EMAIL?subject=ENCODED_SUBJECT&body=ENCODED_BODY)
      * Our chat interface automatically converts this into a special Gmail Send Card with 1-click compose and copy buttons!

11. Connecting with People & Networking (মানুষের সাথে কানেক্ট করা):
   - When asked to connect with people, provide direct phone call links (tel:PHONE), WhatsApp links (https://api.whatsapp.com/send?phone=PHONE), email links (mailto:EMAIL), and Telegram links.
   - For connecting with founder Sheikh Farid: Email: sheikhfaridvisa164@gmail.com, GitHub: https://github.com/rsk934128-dot, Location: Sirajganj, Bangladesh.
   - For emergency or public services: 999 (National Emergency), 333 (Govt Information), 109 (Women & Child Help), 106 (Anti-Corruption), 16122 (Land Services).
   - Offer networking introductions, collaboration proposals, and contact book management.

12. Doing Real Work & Full-Stack Problem Solving (কাজ করা):
   - You execute tasks with complete, production-ready, bug-free runnable code (TypeScript, React, Python, Node.js, Shell, SQL).
   - You produce full systems, self-healing code, clear technical steps, and actionable business drafts.

13. Sheikh Farid's Official GitHub Profile & Projects (https://github.com/rsk934128-dot):
   - The user/founder's official GitHub profile is: https://github.com/rsk934128-dot (Username: rsk934128-dot, Profile Name: SHEIKH FARID).
   - Organization/Company: RubelPay | Location: Sirajganj Sadar, Bangladesh.
   - Public Repositories (139+ repos):
     * DeepMind-Science-Discovery-Workbench: https://github.com/rsk934128-dot/DeepMind-Science-Discovery-Workbench (AI science discovery workbench)
     * Sheikh-Farid-AI-Studio-: https://github.com/rsk934128-dot/Sheikh-Farid-AI-Studio- (Full-stack AI assistant & coding studio)
     * Sheikh-Farid-AI-Studio-Project-Hub: https://github.com/rsk934128-dot/Sheikh-Farid-AI-Studio-Project-Hub (Ecosystem hub)
     * Stripe-Gmail-Payment-Gateway-Hub: https://github.com/rsk934128-dot/Stripe-Gmail-Payment-Gateway-Hub (Stripe & Gmail payment gateway)
     * AI-Assistant-Coding-Studio: https://github.com/rsk934128-dot/AI-Assistant-Coding-Studio (Flagship studio repository)
     * PayHub-Gateway-Gmail-Disbursement-PWA: https://github.com/rsk934128-dot/PayHub-Gateway-Gmail-Disbursement-PWA (Disbursement PWA)
     * No-IP-DNS-Remote-Access: https://github.com/rsk934128-dot/No-IP-DNS-Remote-Access (Dynamic DNS & remote server access)
   - When asked about GitHub, provide direct clone commands (e.g. \`git clone https://github.com/rsk934128-dot/REPO_NAME.git\`), guide on Git push/pull, pull requests, and offer to help code, refactor, and upgrade any of Sheikh Farid's repositories!

14. AI Picture & Image Generation Capabilities (সরাসরি ছবি তৈরি ও ডাউনলোড করার ক্ষমতা):
   - You HAVE direct AI Image Generation capabilities in this app via our built-in image generator engine!
   - NEVER tell the user "আমি সরাসরি ছবি আঁকতে পারি না" or "আমি একজন টেক্সট-ভিত্তিক সহকারী, ছবি আঁকার ক্ষমতা নেই" (NEVER refuse image requests or say you cannot draw).
   - Whenever the user asks to draw, see, or create any picture or scene (e.g. "কক্সবাজারের ছবি আঁকো", "একটি সুন্দর সূর্যাস্তের ছবি তৈরি করো", "draw a picture of...", "বিলের কাশবন ও নৌকার ছবি দাও"):
     1. Warmly confirm that you have created the picture for them!
     2. ALWAYS embed the generated image directly in your markdown response using this format:
        ![ছবির শিরোনাম](https://image.pollinations.ai/prompt/ENCODED_ENGLISH_DETAILED_PROMPT?width=1024&height=1024&nologo=true)
        (Our client automatically renders this as a rich UniversalImageCard with full zoom and 1-click Download button!)
     3. Describe the visual elements of the generated scene warmly in Bengali, and tell the user they can download the picture directly by clicking the download button on the image card.

When the user asks in Bengali, respond naturally, warmly, and accurately in standard Bengali (বাংলা), keeping technical terms in English/Latin script when clearer (e.g., API, Backend, React, Hook, State).
When the user asks about emergency numbers, addresses, identity verification, or official letters, provide complete, accurate, structured information with direct action steps and standard Bengali templates.
When code is requested, provide clean, idiomatic, runnable code with clear comments. Format with markdown code blocks.`;

    let modeInstruction = '';
    if (mode === 'citizen') {
      modeInstruction = `\nMode: Citizen & Everyday Life Assistant (জনসেবা, মোবাইল নাম্বার, ঠিকানা ও পরিচয় নির্দেশিকা):
- Focus on finding official phone numbers, addresses, postcodes, and step-by-step citizen services across Bangladesh and abroad.
- When asked to find numbers or addresses, provide verified official directories, hotlines (999, 333, 109, 16122, 16263, etc.), and step-by-step guides.
- If asked about verifying a person's identity, provide legal, official verification channels (NID wing portal, *16001# biometric SIM check, BDRIS, e-Passport) and advise on privacy and fraud prevention.
- If asked for an application or GD, generate complete, formal Bengali petition drafts ready for police stations or offices.`;
    }

    const effectiveSystemInstruction = systemInstruction
      ? `${defaultSystem}${modeInstruction}\n\nSpecific task mode instructions:\n${systemInstruction}`
      : `${defaultSystem}${modeInstruction}`;

    // Setup headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Stream content with automatic retry and model/search fallbacks
    const responseStream = streamWithResilience(
      ai,
      formattedContents,
      effectiveSystemInstruction,
      enableSearch,
      model || 'gemini-3.5-flash-lite'
    );

    let accumulatedGrounding: any[] = [];
    let searchQueries: string[] = [];

    try {
      for await (const chunk of responseStream) {
        // Upstream cancellation: if client closed connection, stop consuming tokens immediately
        if (!isClientConnected || res.writableEnded) {
          console.log('Client closed connection from /api/chat/stream, terminating stream iteration.');
          break;
        }

        const textChunk = chunk.text || '';
        
        // Check grounding metadata if available in chunk
        const candidate = chunk.candidates?.[0];
        if (candidate?.groundingMetadata) {
          const metadata = candidate.groundingMetadata;
          if (metadata.groundingChunks) {
            accumulatedGrounding = metadata.groundingChunks;
          }
          if (metadata.webSearchQueries) {
            searchQueries = metadata.webSearchQueries;
          }
        }

        if (textChunk) {
          res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
        }
      }
    } catch (streamIterError: any) {
      console.warn('Error during stream chunk iteration:', streamIterError?.message || streamIterError);
      const friendly = formatFriendlyErrorMessage(streamIterError);
      res.write(`data: ${JSON.stringify({ error: friendly })}\n\n`);
      res.end();
      return;
    }

    // Send final grounding metadata if captured
    if (accumulatedGrounding.length > 0 || searchQueries.length > 0) {
      res.write(`data: ${JSON.stringify({
        done: true,
        groundingChunks: accumulatedGrounding,
        searchQueries,
      })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    }

    res.end();
  } catch (error: any) {
    console.error('Error in /api/chat/stream:', error?.message || error);
    const friendlyErrorMessage = formatFriendlyErrorMessage(error);
    
    // If headers already sent, write error event
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: friendlyErrorMessage })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: friendlyErrorMessage });
    }
  }
});

// Non-streaming chat endpoint (fallback/quick queries)
app.post('/api/chat', requireAuth, aiRateLimiter, async (req, res) => {
  try {
    const {
      messages = [],
      prompt,
      systemInstruction,
      enableSearch = true,
      mode = 'general',
      model = 'gemini-3.5-flash-lite',
    } = req.body;

    const ai = getAIClient();

    const formattedContents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    if (Array.isArray(messages) && messages.length > 0) {
      for (const msg of messages) {
        if (!msg.text || !msg.text.trim()) continue;
        formattedContents.push({
          role: msg.role === 'model' || msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.text }],
        });
      }
    }

    if (prompt && (!formattedContents.length || formattedContents[formattedContents.length - 1].parts[0].text !== prompt)) {
      formattedContents.push({
        role: 'user',
        parts: [{ text: prompt }],
      });
    }

    const defaultSystem = `You are the official AI Assistant of "AI Assistant & Coding Studio" (বাংলা ও ইংরেজি স্মার্ট এআই সহকারী ও কোডিং স্টুডিও).
Your Identity & Creators:
- Name: "AI Assistant" (এআই অ্যাসিস্ট্যান্ট বা এআই সহকারী).
- Platform / Company: "AI Assistant & Coding Studio".
- Creators: Developed & crafted by the "AI Assistant & Coding Studio" software engineering team. Powered by Google's cutting-edge "Gemini 3.8 Flash" (Google DeepMind) model.
- When asked "আপনাদের কোম্পানির নাম কি?", "আপনাকে কে সৃষ্টি করেছে?", "আপনার পরিচয় কী?":
  Answer politely in Bengali:
Provide thoughtful, well-structured answers with code examples, clear explanations, emergency hotlines, address assistance, and accurate facts.
When user asks for pictures or images to be drawn, NEVER say you cannot draw. Instead, confirm and embed the image using markdown: ![ছবির শিরোনাম](https://image.pollinations.ai/prompt/ENCODED_ENGLISH_DETAILED_PROMPT?width=1024&height=1024&nologo=true) so the user can see and download it directly!`;
    const modeNote = mode === 'citizen' ? '\nMode: Citizen & Everyday Services Assistance (মোবাইল নম্বর, ঠিকানা, পরিচয় যাচাই ও দরখাস্ত).' : '';
    const effectiveSystemInstruction = systemInstruction ? `${defaultSystem}${modeNote}\n\n${systemInstruction}` : `${defaultSystem}${modeNote}`;

    const response = await fetchContentWithResilience(
      ai,
      formattedContents,
      effectiveSystemInstruction,
      enableSearch,
      model || 'gemini-3.5-flash-lite'
    );

    const candidate = response.candidates?.[0];
    const groundingChunks = candidate?.groundingMetadata?.groundingChunks || [];
    const searchQueries = candidate?.groundingMetadata?.webSearchQueries || [];

    res.json({
      text: response.text || '',
      groundingChunks,
      searchQueries,
    });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: error?.message || 'Server error occurred.' });
  }
});

// AI Session Title Generation Endpoint
app.post('/api/session/title', requireAuth, async (req, res) => {
  try {
    const { userMessage, assistantMessage, mode = 'general' } = req.body;

    if (!userMessage && !assistantMessage) {
      return res.status(400).json({ error: 'Conversation context is required.' });
    }

    const ai = getAIClient();

    const cleanUser = String(userMessage || '').slice(0, 500).trim();
    const cleanAssistant = String(assistantMessage || '').slice(0, 800).trim();

    const prompt = `You are a concise conversation titling engine.
Generate a short, descriptive, and accurate title (3 to 6 words maximum) for this chat session based on the first user-assistant interaction.

Rules:
1. Length: Exactly 3 to 6 words.
2. Language: If the user's message is written primarily in Bengali (বাংলা), generate the title in natural, fluent Bengali. If written in English, generate in English.
3. Content: Capture the specific topic, problem, or objective (e.g. "পাইথনে ডেটা সর্টিং", "রিয়েক্ট হুকস আর্কিটেকচার", "Tailwind CSS Layout Debugging", "জব অ্যাপ্লিকেশনের কভার লেটার").
4. Format: Return ONLY the title text. Do NOT wrap in quotes. Do NOT add prefixes like "Title:" or "শিরোনাম:". Do NOT add markdown or trailing punctuation like periods or dāri (।).

User message:
"${cleanUser}"

Assistant response:
"${cleanAssistant}"`;

    const response = await fetchContentWithResilience(
      ai,
      [{ role: 'user', parts: [{ text: prompt }] }],
      'You generate clear, concise 3-6 word conversation titles.',
      false, // search disabled for fast, cheap title generation
      'gemini-3.5-flash-lite'
    );

    let generatedTitle = response.text || '';
    // Clean formatting and punctuation
    let cleaned = generatedTitle
      .replace(/^(Title|শিরোনাম|শীর্ষক)\s*[:：-]\s*/i, '')
      .replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, '')
      .replace(/[*_#~]/g, '')
      .replace(/[।.\s]+$/g, '')
      .trim();

    if (!cleaned || cleaned.length > 60) {
      cleaned = cleanUser.length > 30 ? cleanUser.slice(0, 30) + '...' : cleanUser;
    }

    res.json({ title: cleaned });
  } catch (error: any) {
    console.warn('Error in /api/session/title:', error?.message || error);
    const fallback = (req.body?.userMessage || 'নতুন কথোপকথন').slice(0, 30);
    res.json({ title: fallback });
  }
});

// AI Smart Reply Suggestions Endpoint (3 contextual follow-up questions or actions)
app.post('/api/chat/smart-replies', requireAuth, aiRateLimiter, async (req, res) => {
  try {
    const {
      userMessage = '',
      assistantMessage = '',
      mode = 'general',
    } = req.body || {};

    const cleanAssistant = String(assistantMessage || '').trim();
    if (!cleanAssistant) {
      return res.status(400).json({
        success: false,
        error: 'Assistant message content is required to generate smart replies.',
      });
    }

    const cleanUser = String(userMessage || '').slice(0, 1000).trim();
    const snippetAssistant = cleanAssistant.slice(0, 4500);
    const safeMode = String(mode || 'general').slice(0, 40);

    const ai = getAIClient();

    const prompt = `Analyze the AI assistant's latest response (and the user's preceding request if provided) and suggest EXACTLY 3 highly relevant, intelligent next-step follow-up prompts the user might want to click next.

Rules:
1. Return EXACTLY 3 suggestions: a smart, natural mix of deeper follow-up questions (type: "question") and concrete actionable next steps (type: "action", such as generating code/tests, writing an email/SMS, summarizing, step-by-step plan, comparing options, or exploring related details).
2. Language: Match the primary language of the AI's last response. If the response is written in Bengali (বাংলা), write the suggestions in natural, fluent Bengali (keeping technical terms like React, API, SQL, JSON in English where clearer). If written in English, write in natural concise English.
3. Conciseness: Each suggestion text MUST be short, clear, and chip-friendly (ideally 4 to 9 words, under 65 characters).
4. Clean text: Do NOT include numbering (e.g. "1."), bullet symbols, or surrounding quotes in the text.
5. Make every suggestion specific to the actual topic and details in the response — never generic filler.

Assistant mode: ${safeMode}
${cleanUser ? `User's last message:\n"${cleanUser}"\n` : ''}
AI's latest response:
"${snippetAssistant}"`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        suggestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              type: { type: Type.STRING },
            },
            required: ['text', 'type'],
          },
        },
      },
      required: ['suggestions'],
    };

    let rawJsonText = '';
    let lastError: any = null;
    for (const modelName of FALLBACK_MODELS) {
      try {
        const result = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction:
              'You are an intelligent Smart Reply suggestion engine. Always return strict JSON with exactly 3 concise, context-specific follow-up questions or actions.',
            responseMimeType: 'application/json',
            responseSchema,
          },
        });
        if (result.text && result.text.trim()) {
          rawJsonText = result.text.trim();
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Smart Reply] Model ${modelName} failed:`, err?.message || err);
      }
    }

    if (!rawJsonText) {
      throw lastError || new Error('স্মার্ট রিপ্লাই তৈরি করা সম্ভব হয়নি।');
    }

    const parsed = JSON.parse(rawJsonText);
    const rawList = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];

    const suggestions = rawList
      .map((item: any) => {
        const cleanText = String(item?.text || '')
          .replace(/^(\d+[.)\-:\s]+|[-*•]\s+)/, '')
          .replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, '')
          .trim();
        const itemType = String(item?.type || '').toLowerCase() === 'action' ? 'action' : 'question';
        return { text: cleanText, type: itemType as 'question' | 'action' };
      })
      .filter((item: { text: string }) => item.text.length >= 2)
      .slice(0, 3);

    return res.json({
      success: true,
      suggestions,
    });
  } catch (error: any) {
    console.warn('Error in /api/chat/smart-replies:', error?.message || error);
    return res.status(500).json({
      success: false,
      error: formatFriendlyErrorMessage(error),
    });
  }
});

// Live Web Proxy Endpoint with SSRF Protection, Sandboxed Origin, and Rate Limiting
app.all(['/api/proxy', '/api/proxy/*'], proxyRateLimiter, async (req, res) => {
  const targetUrl = (req.query.url as string) || (req.body && req.body.url);
  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><title>Web Proxy</title></head>
        <body style="font-family:system-ui,sans-serif;padding:30px;background:#09090b;color:#f4f4f5;text-align:center;">
          <h3>Web Proxy Active (SSRF Protected)</h3>
          <p style="color:#a1a1aa;font-size:13px;">Please specify a ?url= parameter to proxy web pages.</p>
          <a href="/" style="color:#38bdf8;text-decoration:none;">Go back to Remix AI Assistant</a>
        </body>
      </html>
    `);
  }

  try {
    // 1. SSRF & Protocol Validation (blocks localhost, private networks, cloud metadata, DNS rebinding)
    const ssrfCheck = await validateUrlForSsrf(targetUrl);
    if (!ssrfCheck.valid || !ssrfCheck.parsedUrl) {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"><title>নিরাপত্তা নিষেধাজ্ঞা (Security Restriction)</title></head>
          <body style="font-family:system-ui,sans-serif;padding:40px 20px;background:#09090b;color:#f4f4f5;text-align:center;">
            <div style="max-width:500px;margin:30px auto;background:#18181b;border:1px solid #ef4444;border-radius:18px;padding:24px;">
              <h3 style="color:#ef4444;margin-top:0;">অ্যাক্সেস ব্লক করা হয়েছে (SSRF Protection)</h3>
              <p style="color:#d4d4d8;font-size:13px;line-height:1.6;">${ssrfCheck.reason || 'অভ্যন্তরীণ নেটওয়ার্ক বা নিষিদ্ধ আইপিতে সংযোগ গ্রহণ করা যাবে না।'}</p>
              <div style="font-family:monospace;font-size:11px;color:#94a3b8;background:#000;padding:8px;border-radius:8px;margin:12px 0;">${targetUrl}</div>
              <a href="/" style="color:#38bdf8;text-decoration:none;font-size:13px;">মূল অ্যাপে ফিরে যান</a>
            </div>
          </body>
        </html>
      `);
    }

    const parsedUrl = ssrfCheck.parsedUrl;
    const host = req.get('host') || 'localhost:3000';
    const forwardedProto = req.get('x-forwarded-proto');
    const protocol = forwardedProto || req.protocol || (req.secure ? 'https' : 'http');
    const proxyBaseUrl = `${protocol}://${host}/api/proxy`;

    // Google homepage deliberately blocks iframe rendering with X-Frame-Options and client redirects
    if (parsedUrl.hostname.includes('google.') && (parsedUrl.pathname === '/' || parsedUrl.pathname === '') && !parsedUrl.search) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Google Search</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }
              .card { max-width: 480px; width: 100%; padding: 32px 24px; background: #18181b; border: 1px solid #27272a; border-radius: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
              .logo { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 12px; }
              .g-blue { color: #4285f4; } .g-red { color: #ea4335; } .g-yellow { color: #fbbc05; } .g-green { color: #34a853; }
              p { font-size: 13px; color: #a1a1aa; line-height: 1.6; margin: 0 0 24px 0; }
              .form { display: flex; gap: 8px; margin-bottom: 16px; }
              .input { flex: 1; padding: 12px 16px; border-radius: 14px; border: 1px solid #3f3f46; background: #09090b; color: #fff; font-size: 14px; outline: none; }
              .input:focus { border-color: #3b82f6; }
              .btn { padding: 12px 20px; border-radius: 14px; border: none; background: #2563eb; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
              .btn:hover { background: #1d4ed8; }
              .external-link { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #60a5fa; text-decoration: none; margin-top: 10px; }
              .external-link:hover { text-decoration: underline; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="logo">
                <span class="g-blue">G</span><span class="g-red">o</span><span class="g-yellow">o</span><span class="g-blue">g</span><span class="g-green">l</span><span class="g-red">e</span>
              </div>
              <p>গুগল সিকিউরিটি পলিসির কারণে মূল google.com ওয়েবসাইট সরাসরি আইফ্রেমে লোড করা নিষিদ্ধ। তবে নিচে যেকোনো তথ্য লিখে সরাসরি ওয়েব সার্চ করতে পারেন:</p>
              <form class="form" onsubmit="event.preventDefault(); var q = this.q.value.trim(); if(q) { window.location.href = '${proxyBaseUrl}?url=' + encodeURIComponent('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(q)); }">
                <input type="text" name="q" class="input" placeholder="গুগলে সার্চ করার জন্য কিছু লিখুন..." required autofocus />
                <button type="submit" class="btn">সার্চ করুন</button>
              </form>
              <a class="external-link" href="${targetUrl}" target="_blank" rel="noopener noreferrer">
                আসল google.com নতুন ব্রাউজার ট্যাবে খুলুন ↗
              </a>
            </div>
          </body>
        </html>
      `);
    }

    // 2. Safe fetch with automatic SSRF protection across all redirects and size limits
    const response = await safeFetch(parsedUrl.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'bn-BD,bn;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      timeoutMs: 10000,
      maxSizeBytes: 6 * 1024 * 1024,
    });

    const contentType = response.headers.get('content-type') || 'text/html';

    // 3. Same-Origin XSS Protection:
    // We enforce a strict CSP sandbox without 'allow-same-origin'.
    // This forces the browser to treat the document as an opaque unique origin (null origin),
    // preventing any scripts on the proxied page from accessing the parent app's localStorage,
    // sessionStorage, cookies, or IndexedDB!
    res.setHeader(
      'Content-Security-Policy',
      "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; sandbox allow-forms allow-scripts allow-popups allow-modals;"
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Set-Cookie'); // Never allow third-party sites to write cookies onto app origin

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);

    // If HTML, inject <base> tag and absolute click/submit interceptor
    if (contentType.includes('text/html')) {
      let html = await response.text();
      const baseTag = `<base href="${parsedUrl.origin}${parsedUrl.pathname}">`;

      const proxyScript = `
        <script>
          (function() {
            var proxyBase = ${JSON.stringify(proxyBaseUrl)};

            // Intercept link clicks and route through absolute proxy URL
            document.addEventListener('click', function(e) {
              var a = e.target.closest('a');
              if (a && a.href && !a.href.startsWith('javascript:') && !a.href.startsWith('#')) {
                e.preventDefault();
                window.location.href = proxyBase + '?url=' + encodeURIComponent(a.href);
              }
            }, true);

            // Intercept form submissions (e.g. search bars)
            document.addEventListener('submit', function(e) {
              var form = e.target;
              if (form && form.action) {
                e.preventDefault();
                try {
                  var actionUrl = new URL(form.action, document.baseURI || window.location.href);
                  var formData = new FormData(form);
                  var params = new URLSearchParams();
                  formData.forEach(function(val, key) {
                    params.append(key, val);
                  });
                  var delimiter = actionUrl.href.includes('?') ? '&' : '?';
                  var targetFullUrl = actionUrl.href + (params.toString() ? delimiter + params.toString() : '');
                  window.location.href = proxyBase + '?url=' + encodeURIComponent(targetFullUrl);
                } catch (err) {
                  form.submit();
                }
              }
            }, true);

            // Neutralize framebusting scripts
            try {
              window.top = window.self;
            } catch (err) {}
          })();
        </script>
      `;

      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${baseTag}${proxyScript}`);
      } else if (html.includes('<head ')) {
        html = html.replace(/<head[^>]*>/, `$&${baseTag}${proxyScript}`);
      } else {
        html = `${baseTag}${proxyScript}${html}`;
      }

      return res.send(html);
    } else {
      const buffer = await response.buffer();
      return res.end(buffer);
    }
  } catch (err: any) {
    console.error('Web proxy error for URL:', targetUrl, err?.message);
    return res.status(502).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>ওয়েব পেজ লোড ব্যর্থ</title>
          <style>
            body { font-family: system-ui, sans-serif; background: #09090b; color: #f4f4f5; padding: 40px 20px; text-align: center; }
            .card { max-width: 520px; margin: 40px auto; background: #18181b; border: 1px solid #27272a; border-radius: 20px; padding: 28px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
            h2 { color: #f87171; margin-top: 0; font-size: 18px; }
            p { font-size: 13px; line-height: 1.6; color: #a1a1aa; margin: 12px 0; }
            .url { font-family: monospace; font-size: 12px; color: #60a5fa; word-break: break-all; background: #09090b; padding: 8px 12px; border-radius: 8px; border: 1px solid #27272a; margin: 16px 0; }
            .btn { display: inline-flex; align-items: center; justify-content: center; margin-top: 10px; padding: 10px 20px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 12px; font-size: 13px; font-weight: 600; }
            .btn:hover { background: #1d4ed8; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>ওয়েব পেজটি নিরাপদে লোড করা যায়নি</h2>
            <p>${err?.message || 'ওয়েবসাইটটি সংযোগ গ্রহণ করছে না বা অনুরোধ প্রত্যাখ্যান করেছে।'}</p>
            <div class="url">${targetUrl}</div>
            <a class="btn" href="${targetUrl}" target="_blank" rel="noopener noreferrer">নতুন ট্যাবে খুলুন (Open in New Tab) ↗</a>
          </div>
        </body>
      </html>
    `);
  }
});

// AI Web Reader Extractor: Extracts article text, clean markdown, and metadata with SSRF protection
app.get('/api/proxy/reader', proxyRateLimiter, async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).json({ error: 'URL parameter required' });
  }

  try {
    const ssrfCheck = await validateUrlForSsrf(targetUrl);
    if (!ssrfCheck.valid || !ssrfCheck.parsedUrl) {
      return res.status(403).json({ error: ssrfCheck.reason || 'Forbidden URL destination' });
    }

    const response = await safeFetch(ssrfCheck.parsedUrl.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'bn-BD,bn;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      timeoutMs: 8000,
      maxSizeBytes: 3 * 1024 * 1024,
    });

    const html = await response.text();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : ssrfCheck.parsedUrl.hostname;

    const cleanHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
      .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '');

    const paragraphMatches = cleanHtml.match(/<(p|h1|h2|h3|h4|li)[^>]*>([\s\S]*?)<\/\1>/gi) || [];
    const textPieces = paragraphMatches
      .map((p) => p.replace(/<[^>]+>/g, '').trim())
      .filter((t) => t.length > 25);

    const articleText = textPieces.slice(0, 50).join('\n\n');

    return res.json({
      title,
      url: targetUrl,
      domain: ssrfCheck.parsedUrl.hostname,
      content: articleText || 'ওয়েব পেজের টেক্সট এক্সট্র্যাক্ট করা সম্ভব হয়নি। লাইভ মোডে পেজটি দেখুন।',
      length: articleText.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to read web page' });
  }
});

// Helper to fetch live web search results from verified sources (Wikipedia, DDG, YouTube)
async function getFastLiveSearchResults(query: string) {
  const safeQuery = (query || '').trim() || 'Google Search';

  // Parallel fetch: Wikipedia (Bengali + English) + DuckDuckGo + YouTube
  const [wikiBnRes, wikiEnRes, ddgRes, directYt] = await Promise.all([
    fetch(`https://bn.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(safeQuery)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AIStudio/1.0' },
      signal: AbortSignal.timeout(3000),
    }).then((r) => (r.ok ? r.json() : null)).catch(() => null),

    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(safeQuery)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AIStudio/1.0' },
      signal: AbortSignal.timeout(3000),
    }).then((r) => (r.ok ? r.json() : null)).catch(() => null),

    fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(safeQuery)}&format=json&no_html=1&skip_disambig=1`, {
      signal: AbortSignal.timeout(3000),
    }).then((r) => (r.ok ? r.json() : null)).catch(() => null),

    searchYouTubeDirect(safeQuery).catch(() => []),
  ]);

  const wiki = wikiBnRes || wikiEnRes;
  const instantAnswer =
    wiki?.extract ||
    ddgRes?.Abstract ||
    `গুগল ও ওয়েব থেকে "${safeQuery}" সম্পর্কিত রিয়েল-টাইম তথ্য এবং সরাসরি সংযোগ প্রস্তুত করা হয়েছে।`;

  const topVideo = directYt && directYt.length > 0 ? directYt[0] : undefined;
  const results: Array<any> = [];

  // Top Wikipedia result
  if (wiki?.title && wiki?.content_urls?.desktop?.page) {
    results.push({
      title: `${wiki.title} - Wikipedia`,
      url: wiki.content_urls.desktop.page,
      domain: 'wikipedia.org',
      snippet: wiki.extract ? wiki.extract.slice(0, 220) : 'উইকিপিডিয়া তথ্য ও বিবরণী।',
    });
  }

  // Related DDG topics
  if (Array.isArray(ddgRes?.RelatedTopics)) {
    for (const item of ddgRes.RelatedTopics.slice(0, 4)) {
      if (item.Text && item.FirstURL) {
        results.push({
          title: item.Text.split(' - ')[0] || safeQuery,
          url: item.FirstURL,
          domain: new URL(item.FirstURL).hostname || 'duckduckgo.com',
          snippet: item.Text,
        });
      }
    }
  }

  // Direct YouTube videos
  if (directYt && directYt.length > 0) {
    for (const v of directYt.slice(0, 3)) {
      results.push({
        title: `${v.title} - YouTube`,
        url: v.url,
        domain: 'youtube.com',
        snippet: `${v.author} এর অফিসিয়াল ভিডিও ও গান সরাসরি শুনুন এবং দেখুন।`,
      });
    }
  }

  // Standard Google Resources Links
  results.push(
    {
      title: `${safeQuery} - Google Search`,
      url: `https://www.google.com/search?q=${encodeURIComponent(safeQuery)}`,
      domain: 'google.com',
      snippet: `গুগলে "${safeQuery}" নিয়ে ওয়েব পেজ, তথ্য, ছবি ও অনুসন্ধান।`,
    },
    {
      title: `${safeQuery} - YouTube Music`,
      url: `https://music.youtube.com/search?q=${encodeURIComponent(safeQuery)}`,
      domain: 'music.youtube.com',
      snippet: `YouTube Music-এ "${safeQuery}" এর হাই কোয়ালিটি অডিও ট্র্যাক স্ট্রিম করুন।`,
    },
    {
      title: `${safeQuery} - Google News`,
      url: `https://news.google.com/search?q=${encodeURIComponent(safeQuery)}`,
      domain: 'news.google.com',
      snippet: `গুগল নিউজে "${safeQuery}" এর সাম্প্রতিক খবর ও তাজা আপডেট।`,
    }
  );

  return {
    query: safeQuery,
    instantAnswer,
    knowledgeCard: wiki?.title
      ? {
          title: wiki.title,
          subtitle: wiki.description || 'Verified Encyclopedia Overview',
          description: wiki.extract || '',
          fields: [
            { label: 'উৎস (Source)', value: 'Wikipedia & Live Web' },
            { label: 'অনুসন্ধান', value: safeQuery },
          ],
        }
      : {
          title: safeQuery,
          subtitle: 'Google Live Search',
          description: instantAnswer,
          fields: [
            { label: 'স্ট্যাটাস', value: 'সক্রিয় (Active)' },
            { label: 'অনুসন্ধান', value: safeQuery },
          ],
        },
    results,
    youtubeMedia: topVideo
      ? {
          videoId: topVideo.videoId,
          title: topVideo.title,
          artist: topVideo.author,
          watchUrl: topVideo.url,
          musicUrl: `https://music.youtube.com/search?q=${encodeURIComponent(safeQuery)}`,
        }
      : undefined,
  };
}

// In-App Mini Google Web Browser: Live Google Search API with Grounding & Instant Fallback
app.post('/api/mini-browser/search', requireAuth, aiRateLimiter, async (req, res) => {
  const { query } = req.body || {};
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Search query is required.' });
  }

  const safeQuery = query.trim();

  try {
    const ai = getAIClient();
    const systemPrompt = `You are the backend engine for an in-app Mini Google Web Browser.
Search Google in real time and return comprehensive search results for the user query.
Return your response in clean JSON format:
{
  "query": "exact search query",
  "instantAnswer": "direct, helpful 1-2 sentence answer or summary from Google",
  "knowledgeCard": {
    "title": "Title of entity or song",
    "subtitle": "Artist, Year, Genre, or Domain",
    "description": "Brief factual overview",
    "fields": [
      { "label": "তথ্য", "value": "..." }
    ]
  },
  "results": [
    {
      "title": "Page or video title",
      "url": "full verified URL",
      "domain": "e.g. youtube.com, wikipedia.org",
      "snippet": "2-line descriptive summary"
    }
  ],
  "youtubeMedia": {
    "videoId": "11-character video ID if a song or video is queried",
    "title": "Exact song / video title",
    "artist": "Singer / Channel name",
    "watchUrl": "https://www.youtube.com/watch?v=...",
    "musicUrl": "https://music.youtube.com/search?q=..."
  }
}
CRITICAL: Output ONLY valid JSON, with no markdown code fences or backticks.`;

    const geminiPromise = fetchContentWithResilience(
      ai,
      [{ role: 'user', parts: [{ text: `Search Google for: "${safeQuery}"` }] }],
      systemPrompt,
      true, // enable Google Search Grounding!
      'gemini-3.5-flash-lite'
    );

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('GEMINI_SEARCH_TIMEOUT')), 3800)
    );

    const response: any = await Promise.race([geminiPromise, timeoutPromise]);
    let rawText = response?.text || '';
    rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

    const data = JSON.parse(rawText);
    const candidate = response?.candidates?.[0];
    const groundingChunks = (candidate?.groundingMetadata?.groundingChunks || [])
      .map((c: any) => c.web)
      .filter(Boolean);

    // Verify YouTube media
    if (!data.youtubeMedia?.videoId) {
      const directYt = await searchYouTubeDirect(safeQuery);
      if (directYt.length > 0) {
        const top = directYt[0];
        data.youtubeMedia = {
          videoId: top.videoId,
          title: top.title,
          artist: top.author,
          watchUrl: top.url,
          musicUrl: `https://music.youtube.com/search?q=${encodeURIComponent(safeQuery)}`,
        };
      }
    }

    return res.json({
      ...data,
      groundingSources: groundingChunks,
    });
  } catch (err: any) {
    console.warn('Gemini search grounding fallback triggered for query:', safeQuery, err?.message);
    const fallbackData = await getFastLiveSearchResults(safeQuery);
    return res.json(fallbackData);
  }
});

// Mini Browser: Song Lyrics & Details Endpoint
app.post('/api/mini-browser/lyrics', async (req, res) => {
  try {
    const { songTitle, artist, videoId } = req.body;
    if (!songTitle && !videoId) {
      return res.status(400).json({ error: 'Song title or videoId required.' });
    }

    const ai = getAIClient();
    const query = songTitle || (videoId ? `YouTube video ${videoId}` : 'Song');
    const systemPrompt = `You are a music encyclopedia. Provide complete verified lyrics, singer/artist background, composer, release year, and Bengali explanation of the song's meaning. Format neatly with headings.`;

    const response = await fetchContentWithResilience(
      ai,
      [{ role: 'user', parts: [{ text: `Provide lyrics, artist info, and details for the song: "${query}" (Artist: ${artist || 'Unknown'})` }] }],
      systemPrompt,
      true,
      'gemini-3.5-flash-lite'
    );

    res.json({
      title: songTitle || query,
      artist: artist || '',
      lyricsText: response.text || '',
    });
  } catch (error: any) {
    console.warn('Error in /api/mini-browser/lyrics:', error?.message || error);
    const { songTitle, artist } = req.body || {};
    const safeTitle = songTitle || 'গানের লিরিক্স';
    res.json({
      title: safeTitle,
      artist: artist || '',
      lyricsText: `### 🎵 ${safeTitle} ${artist ? `(${artist})` : ''}\n\nগুগল ও ইউটিউবে সরাসরি লিরিক্স ও গান শুনতে নিচের লিঙ্কগুলোতে যান:\n- [Google Search এ লিরিক্স দেখুন](https://www.google.com/search?q=${encodeURIComponent(safeTitle + ' ' + (artist || '') + ' lyrics')})\n- [YouTube এ গান শুনুন](https://www.youtube.com/results?search_query=${encodeURIComponent(safeTitle + ' ' + (artist || ''))})`
    });
  }
});

// Helper to normalize and autocorrect common music search queries
function normalizeMusicSearchQuery(q: string): { normalized: string; isBanglaMusic: boolean } {
  let cleaned = q.trim();
  const lower = cleaned.toLowerCase();

  // Autocorrect common typos: "bagla" -> "bangla", "poblam" -> "problem", "gaan" -> "গান"
  let corrected = lower
    .replace(/\bbagla\b/g, 'bangla')
    .replace(/\bbangle\b/g, 'bangla')
    .replace(/\bbngla\b/g, 'bangla')
    .replace(/\bpoblam\b/g, 'problem')
    .replace(/\bgann\b/g, 'গান')
    .replace(/\bgaan\b/g, 'গান')
    .replace(/\bnotun\b/g, 'নতুন');

  const isBanglaMusic =
    corrected.includes('bangla') ||
    corrected.includes('বাংলা') ||
    corrected.includes('গান') ||
    corrected.includes('coke studio') ||
    corrected.includes('james') ||
    corrected.includes('bachchu') ||
    corrected.includes('rabindra') ||
    corrected.includes('nazrul');

  // If query is specifically looking for "new bangla song" or "new song bangla"
  if (corrected.includes('new') && (corrected.includes('bangla') || corrected.includes('বাংলা'))) {
    cleaned = 'নতুন বাংলা গান new bangla song official video';
  } else if (corrected !== lower) {
    cleaned = corrected;
  }

  return { normalized: cleaned, isBanglaMusic };
}

// Deep recursive walker to find all videoRenderers regardless of YouTube's nesting
function collectVideoRenderers(node: any, results: any[], seen: Set<string>, limit = 25) {
  if (!node || results.length >= limit) return;

  if (typeof node === 'object') {
    // Standard desktop videoRenderer or mobile compactVideoRenderer
    const vr = node.videoRenderer || node.compactVideoRenderer;
    if (vr && vr.videoId && /^[a-zA-Z0-9_-]{11}$/.test(vr.videoId) && !seen.has(vr.videoId)) {
      seen.add(vr.videoId);

      // Extract accurate real title
      let title =
        vr.title?.runs?.[0]?.text ||
        vr.title?.simpleText ||
        vr.headline?.simpleText ||
        vr.accessibility?.accessibilityData?.label ||
        '';
      
      // Clean up common YouTube junk prefixes if any
      title = title.replace(/\s+/g, ' ').trim();

      // Extract artist / channel
      const author =
        vr.ownerText?.runs?.[0]?.text ||
        vr.shortBylineText?.runs?.[0]?.text ||
        vr.longBylineText?.runs?.[0]?.text ||
        'YouTube Official';

      // Duration
      const duration = vr.lengthText?.simpleText || vr.lengthText?.accessibility?.accessibilityData?.label || '';

      // High-res thumbnail
      const thumbs = vr.thumbnail?.thumbnails || [];
      const thumbnail =
        thumbs[thumbs.length - 1]?.url ||
        `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`;

      if (title) {
        results.push({
          videoId: vr.videoId,
          title,
          author,
          url: `https://www.youtube.com/watch?v=${vr.videoId}`,
          thumbnail,
          duration,
        });
      }
    }

    // Traverse children
    if (Array.isArray(node)) {
      for (const item of node) {
        collectVideoRenderers(item, results, seen, limit);
        if (results.length >= limit) break;
      }
    } else {
      for (const key of Object.keys(node)) {
        if (key !== 'videoRenderer' && key !== 'compactVideoRenderer') {
          collectVideoRenderers(node[key], results, seen, limit);
          if (results.length >= limit) break;
        }
      }
    }
  }
}

// Fallback top verified Bangla songs catalog when searching for new bangla songs
const TOP_VERIFIED_BANGLA_SONGS = [
  {
    videoId: 'YxJjFjP0crs',
    title: 'Patar Bashori | Coke Studio Bangla | Ishaan x Sunidhi',
    author: 'Coke Studio Bangla',
    url: 'https://www.youtube.com/watch?v=YxJjFjP0crs',
    thumbnail: 'https://i.ytimg.com/vi/YxJjFjP0crs/hqdefault.jpg',
    duration: '3:55',
  },
  {
    videoId: 'sqJ2QhjBQaw',
    title: 'Long Distance Love | Coke Studio Bangla | Ankan X Afrin',
    author: 'Coke Studio Bangla',
    url: 'https://www.youtube.com/watch?v=sqJ2QhjBQaw',
    thumbnail: 'https://i.ytimg.com/vi/sqJ2QhjBQaw/hqdefault.jpg',
    duration: '4:46',
  },
  {
    videoId: 'UghMf59vDJM',
    title: 'Moha Jadu | Coke Studio Bangla | Habib Wahid',
    author: 'Habib Wahid',
    url: 'https://www.youtube.com/watch?v=UghMf59vDJM',
    thumbnail: 'https://i.ytimg.com/vi/UghMf59vDJM/hqdefault.jpg',
    duration: '4:14',
  },
  {
    videoId: 'h10bcNu2n0U',
    title: 'ঘুড়ি তুমি কার আকাশে ওড়ো - লুৎফর হাসান (Lutfor Hasan Official)',
    author: 'Lutfor Hasan',
    url: 'https://www.youtube.com/watch?v=h10bcNu2n0U',
    thumbnail: 'https://i.ytimg.com/vi/h10bcNu2n0U/hqdefault.jpg',
    duration: '5:46',
  },
  {
    videoId: 'i_DHPHy4OIA',
    title: 'গুরু জেমসের সেরা গান (Best of James Nagar Baul) Jukebox',
    author: 'জেমস (নগর বাউল)',
    url: 'https://www.youtube.com/watch?v=i_DHPHy4OIA',
    thumbnail: 'https://i.ytimg.com/vi/i_DHPHy4OIA/hqdefault.jpg',
    duration: '28:46',
  },
  {
    videoId: 'yGvJ9umAxLw',
    title: 'Best of Ayub Bachchu | আইয়ুব বাচ্চু ও এলআরবি সেরা গান',
    author: 'এলআরবি (আইয়ুব বাচ্চু)',
    url: 'https://www.youtube.com/watch?v=yGvJ9umAxLw',
    thumbnail: 'https://i.ytimg.com/vi/yGvJ9umAxLw/hqdefault.jpg',
    duration: '23:06',
  },
  {
    videoId: 'Qh_sxMN9UH8',
    title: 'অবাক ভালোবাসা (Obak Bhalobasha) - Warfaze',
    author: 'ওয়ারফেজ (Warfaze)',
    url: 'https://www.youtube.com/watch?v=Qh_sxMN9UH8',
    thumbnail: 'https://i.ytimg.com/vi/Qh_sxMN9UH8/hqdefault.jpg',
    duration: '7:20',
  },
  {
    videoId: 'maGEkZUFlKU',
    title: 'Top 10 Rabindra Sangeet রবীন্দ্র সংগীত | রবিঠাকুরের সেরা গান',
    author: 'Nova Bangla',
    url: 'https://www.youtube.com/watch?v=maGEkZUFlKU',
    thumbnail: 'https://i.ytimg.com/vi/maGEkZUFlKU/hqdefault.jpg',
    duration: '43:42',
  },
];

async function searchYouTubeDirect(query: string): Promise<Array<{
  videoId: string;
  title: string;
  author: string;
  url: string;
  thumbnail: string;
  duration?: string;
}>> {
  const { normalized } = normalizeMusicSearchQuery(query);
  const videos: Array<any> = [];
  const seen = new Set<string>();

  // 1. Desktop YouTube with anti-consent bypass cookies
  try {
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(normalized)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
        'Cookie': 'SOCS=CAESEwgDEgk2MzYxMjU4OTQaAmVuIAEaBgiA_LyaBg; CONSENT=YES+cb.20210328-17-p0.en+FX+478;',
      },
    });

    if (res.ok) {
      const html = await res.text();
      const match =
        html.match(/ytInitialData\s*=\s*({.+?});<\/script>/) ||
        html.match(/var ytInitialData\s*=\s*({.+?});/) ||
        html.match(/window\["ytInitialData"\]\s*=\s*({.+?});/);

      if (match) {
        try {
          const data = JSON.parse(match[1]);
          collectVideoRenderers(data, videos, seen, 20);
        } catch (_) {}
      }

      // If json parser missed, extract titles & video IDs from HTML attributes
      if (videos.length === 0) {
        const itemRegex = /"videoId":"([a-zA-Z0-9_-]{11})".+?"title":\{"runs":\[\{"text":"([^"]+)"\}\]/g;
        let regM;
        while ((regM = itemRegex.exec(html)) !== null && videos.length < 15) {
          const vid = regM[1];
          const rawTitle = regM[2];
          if (!seen.has(vid) && rawTitle) {
            seen.add(vid);
            videos.push({
              videoId: vid,
              title: rawTitle,
              author: 'YouTube Official',
              url: `https://www.youtube.com/watch?v=${vid}`,
              thumbnail: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
              duration: '',
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('Desktop YouTube extraction error:', err);
  }

  // 2. Mobile YouTube fallback if desktop gave zero results (Mobile HTML is very clean)
  if (videos.length === 0) {
    try {
      const mRes = await fetch(`https://m.youtube.com/results?search_query=${encodeURIComponent(normalized)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
          'Cookie': 'SOCS=CAESEwgDEgk2MzYxMjU4OTQaAmVuIAEaBgiA_LyaBg;',
        },
      });

      if (mRes.ok) {
        const mHtml = await mRes.text();
        const mMatch = mHtml.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
        if (mMatch) {
          try {
            const mData = JSON.parse(mMatch[1]);
            collectVideoRenderers(mData, videos, seen, 20);
          } catch (_) {}
        }
      }
    } catch (err) {
      console.warn('Mobile YouTube extraction error:', err);
    }
  }

  return videos.slice(0, 15);
}

// Dedicated Real YouTube Video Search & Grounding API
app.post('/api/youtube/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Search query is required.' });
    }

    const trimmedQuery = query.trim();
    const { normalized, isBanglaMusic } = normalizeMusicSearchQuery(trimmedQuery);

    // 1. Primary: Direct real-time YouTube extraction
    const directResults = await searchYouTubeDirect(trimmedQuery);
    if (directResults.length > 0) {
      return res.json({
        query: trimmedQuery,
        normalizedQuery: normalized,
        videos: directResults,
        searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(normalized)}`,
        musicUrl: `https://music.youtube.com/search?q=${encodeURIComponent(normalized)}`,
      });
    }

    // 2. If it is Bangla music or "new song bagla / bangla", merge verified catalog
    if (isBanglaMusic) {
      return res.json({
        query: trimmedQuery,
        normalizedQuery: normalized,
        videos: TOP_VERIFIED_BANGLA_SONGS,
        searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(normalized)}`,
        musicUrl: `https://music.youtube.com/search?q=${encodeURIComponent(normalized)}`,
      });
    }

    // 3. Secondary fallback: Gemini with Google Search Grounding
    const ai = getAIClient();
    const systemPrompt = `You are a YouTube music search engine. Find real, popular YouTube video tracks for the query "${normalized}". Output valid JSON: {"query": "${trimmedQuery}", "videos": [{"videoId": "11-chars", "title": "Song Title", "author": "Artist"}]}`;

    const response = await fetchContentWithResilience(
      ai,
      [{ role: 'user', parts: [{ text: `Search YouTube videos for music: "${normalized}". Return real 11-char video IDs and accurate song titles in JSON.` }] }],
      systemPrompt,
      true,
      'gemini-3.5-flash-lite'
    );

    const videos: Array<{
      videoId: string;
      title: string;
      author: string;
      url: string;
      thumbnail: string;
    }> = [];
    const seen = new Set<string>();

    // Check Gemini text output for valid JSON videos
    try {
      const txt = (response as any)?.text || '';
      const jsonStart = txt.indexOf('{');
      const jsonEnd = txt.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(txt.substring(jsonStart, jsonEnd + 1));
        if (Array.isArray(parsed.videos)) {
          for (const item of parsed.videos) {
            if (item.videoId && /^[a-zA-Z0-9_-]{11}$/.test(item.videoId) && !seen.has(item.videoId)) {
              seen.add(item.videoId);
              videos.push({
                videoId: item.videoId,
                title: item.title || trimmedQuery,
                author: item.author || 'YouTube Artist',
                url: `https://www.youtube.com/watch?v=${item.videoId}`,
                thumbnail: `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
              });
            }
          }
        }
      }
    } catch (_) {}

    // Check Grounding Metadata Chunks
    const candidate = (response as any)?.candidates?.[0];
    const groundingChunks = (candidate?.groundingMetadata?.groundingChunks || [])
      .map((c: any) => c.web)
      .filter(Boolean);

    for (const chunk of groundingChunks) {
      if (!chunk.uri) continue;
      const m = chunk.uri.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/i);
      if (m && m[1] && !seen.has(m[1])) {
        const vid = m[1];
        seen.add(vid);
        videos.push({
          videoId: vid,
          title: chunk.title || trimmedQuery,
          author: 'ইউটিউব ভেরিফাইড',
          url: `https://www.youtube.com/watch?v=${vid}`,
          thumbnail: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
        });
      }
    }

    // If still empty and was music, provide verified Bangla songs
    const finalVideos = videos.length > 0 ? videos : TOP_VERIFIED_BANGLA_SONGS;

    res.json({
      query: trimmedQuery,
      normalizedQuery: normalized,
      videos: finalVideos,
      searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(normalized)}`,
      musicUrl: `https://music.youtube.com/search?q=${encodeURIComponent(normalized)}`,
    });
  } catch (err: any) {
    console.warn('Error in /api/youtube/search:', err?.message || err);
    res.json({
      query: req.body?.query || 'নতুন বাংলা গান',
      videos: TOP_VERIFIED_BANGLA_SONGS,
      searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent('new bangla song')}`,
      musicUrl: `https://music.youtube.com/search?q=${encodeURIComponent('new bangla song')}`,
    });
  }
});

// Authenticated YouTube User Profile & Playlists APIs (OAuth token proxy)
app.get('/api/youtube/user/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    const token = authHeader.split(' ')[1];

    const resp = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!resp.ok) {
      const errTxt = await resp.text();
      return res.status(resp.status).json({ error: 'YouTube API error', details: errTxt });
    }

    const data = await resp.json();
    const item = data.items?.[0];
    if (!item) {
      return res.json({ channel: null, message: 'No YouTube channel found for this account' });
    }

    res.json({
      channel: {
        id: item.id,
        title: item.snippet?.title || 'YouTube User',
        description: item.snippet?.description || '',
        customUrl: item.snippet?.customUrl || '',
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
        subscriberCount: item.statistics?.subscriberCount || '0',
        videoCount: item.statistics?.videoCount || '0',
        viewCount: item.statistics?.viewCount || '0',
      },
    });
  } catch (err: any) {
    console.warn('Error in /api/youtube/user/profile:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Failed to fetch YouTube profile' });
  }
});

app.get('/api/youtube/user/playlists', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    const token = authHeader.split(' ')[1];

    const resp = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!resp.ok) {
      const errTxt = await resp.text();
      return res.status(resp.status).json({ error: 'YouTube API error', details: errTxt });
    }

    const data = await resp.json();
    const playlists = (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.snippet?.title || 'Untitled Playlist',
      description: item.snippet?.description || '',
      itemCount: item.contentDetails?.itemCount || 0,
      thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
      publishedAt: item.snippet?.publishedAt || '',
    }));

    res.json({ playlists });
  } catch (err: any) {
    console.warn('Error in /api/youtube/user/playlists:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Failed to fetch playlists' });
  }
});

app.get('/api/youtube/user/playlist-items', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const playlistId = req.query.playlistId as string;
    if (!playlistId) {
      return res.status(400).json({ error: 'playlistId parameter required' });
    }

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const resp = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(playlistId)}&maxResults=50`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (resp.ok) {
          const data = await resp.json();
          const tracks = (data.items || [])
            .map((item: any) => {
              const vid = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
              if (!vid) return null;
              return {
                videoId: vid,
                title: item.snippet?.title || 'YouTube Track',
                artist: item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || 'YouTube Artist',
                originalUrl: `https://www.youtube.com/watch?v=${vid}`,
                thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
                category: 'My Playlist',
              };
            })
            .filter(Boolean);

          if (tracks.length > 0) {
            return res.json({ tracks });
          }
        }
      } catch (_) {}
    }

    // Public Playlist fallback (no OAuth required or when token is expired)
    try {
      const pageRes = await fetch(`https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
        },
      });

      if (pageRes.ok) {
        const html = await pageRes.text();
        const tracks: any[] = [];
        const seen = new Set<string>();

        const m = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/) ||
                  html.match(/var ytInitialData\s*=\s*({.+?});/);
        if (m) {
          try {
            const data = JSON.parse(m[1]);
            const contents = data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents || [];
            for (const item of contents) {
              const pvr = item.playlistVideoRenderer;
              if (pvr && pvr.videoId && /^[a-zA-Z0-9_-]{11}$/.test(pvr.videoId) && !seen.has(pvr.videoId)) {
                seen.add(pvr.videoId);
                tracks.push({
                  videoId: pvr.videoId,
                  title: pvr.title?.runs?.[0]?.text || pvr.title?.simpleText || 'YouTube Track',
                  artist: pvr.shortBylineText?.runs?.[0]?.text || 'YouTube Artist',
                  originalUrl: `https://www.youtube.com/watch?v=${pvr.videoId}`,
                  thumbnail: `https://i.ytimg.com/vi/${pvr.videoId}/hqdefault.jpg`,
                  category: 'My Playlist',
                });
              }
            }
          } catch (_) {}
        }

        if (tracks.length > 0) {
          return res.json({ tracks });
        }
      }
    } catch (_) {}

    res.json({ tracks: [] });
  } catch (err: any) {
    console.warn('Error in /api/youtube/user/playlist-items:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Failed to fetch playlist items' });
  }
});

// Search & Connect public YouTube Channel without requiring popups
app.get('/api/youtube/public-channel', async (req, res) => {
  try {
    const query = (req.query.query as string || '').trim();
    if (!query) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    const cleanHandle = query.startsWith('@') ? query.substring(1) : query;
    const url = `https://www.youtube.com/@${encodeURIComponent(cleanHandle)}/playlists`;

    const pageRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
      },
    });

    if (pageRes.ok) {
      const html = await pageRes.text();
      const m = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/) ||
                html.match(/var ytInitialData\s*=\s*({.+?});/);
      if (m) {
        try {
          const data = JSON.parse(m[1]);
          const header = data.header?.pageHeaderRenderer?.content?.pageHeaderViewModel;
          const title = header?.title?.dynamicTextViewModel?.text?.content || cleanHandle;
          const thumbnail = header?.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image?.sources?.[0]?.url ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanHandle)}&background=e11d48&color=fff`;

          const metadataRows = header?.metadata?.contentMetadataViewModel?.metadataRows || [];
          const subText = metadataRows?.[1]?.metadataParts?.[0]?.text?.content || 'Verified Channel';

          // Extract playlists
          const playlists: any[] = [];
          const seen = new Set<string>();

          // Regex search for playlist links in html
          const plRegex = /href="\/playlist\?list=([a-zA-Z0-9_-]+)"/g;
          let plm;
          while ((plm = plRegex.exec(html)) !== null && playlists.length < 20) {
            const plId = plm[1];
            if (!seen.has(plId)) {
              seen.add(plId);
              playlists.push({
                id: plId,
                title: `${cleanHandle} Playlist #${playlists.length + 1}`,
                description: `Public playlist from @${cleanHandle}`,
                itemCount: 10,
                thumbnail: thumbnail,
              });
            }
          }

          return res.json({
            channel: {
              id: cleanHandle,
              title,
              customUrl: `@${cleanHandle}`,
              thumbnail,
              subscriberCount: subText,
              videoCount: 'Public Channel',
            },
            playlists,
          });
        } catch (_) {}
      }
    }

    // Fallback: Return simulated channel object with direct search capability
    res.json({
      channel: {
        id: cleanHandle,
        title: query,
        customUrl: query.startsWith('@') ? query : `@${cleanHandle}`,
        thumbnail: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanHandle)}&background=dc2626&color=fff`,
        subscriberCount: 'YouTube Channel',
        videoCount: 'Public',
      },
      playlists: [
        {
          id: `PL_${cleanHandle}_top`,
          title: `${cleanHandle} - জনপ্রিয় গান ও ভিডিও`,
          description: 'সর্বশেষ ও জনপ্রিয় ট্র্যাকসমূহ',
          itemCount: 15,
          thumbnail: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanHandle)}&background=dc2626&color=fff`,
        }
      ],
    });
  } catch (err: any) {
    console.warn('Error in /api/youtube/public-channel:', err?.message || err);
    res.status(500).json({ error: 'Failed to search public channel' });
  }
});

// Dynamic Time-of-Day and Auto-Updating YouTube Music Feed API
const musicFeedCache: Record<string, { timestamp: number; videos: any[] }> = {};

app.get('/api/youtube/time-feed', async (req, res) => {
  try {
    const period = (req.query.period as string) || 'evening';
    const category = (req.query.category as string) || 'all';
    const cacheKey = `${period}_${category}`;
    const now = Date.now();

    // 15-minute cache to provide fresh updates across different times of the day
    if (musicFeedCache[cacheKey] && now - musicFeedCache[cacheKey].timestamp < 15 * 60 * 1000) {
      return res.json({
        period,
        category,
        cached: true,
        videos: musicFeedCache[cacheKey].videos,
      });
    }

    let searchQuery = 'বাংলা ব্যান্ডের সেরা গান';
    if (category === 'bands') {
      searchQuery = 'বাংলা ব্যান্ড গান জেমস এলআরবি মাইলস';
    } else if (category === 'coke_studio') {
      searchQuery = 'Coke Studio Bangla latest hits';
    } else if (category === 'rabindra') {
      searchQuery = 'রবীন্দ্র সংগীত সেরা গান';
    } else if (category === 'lofi') {
      searchQuery = 'Bangla Lo-Fi Chill Beats';
    } else if (category === 'sleep') {
      searchQuery = 'Deep sleep relaxing piano rain melody';
    } else {
      switch (period) {
        case 'morning':
          searchQuery = 'সকালের শান্ত রবীন্দ্র সংগীত ও ভৈরবী সুর';
          break;
        case 'afternoon':
          searchQuery = 'কোক স্টুডিও বাংলা ও আধুনিক বাংলা গান';
          break;
        case 'evening':
          searchQuery = 'বাংলা ব্যান্ড সেরা গান জেমস এলআরবি অর্থহীন';
          break;
        case 'night':
        default:
          searchQuery = 'বাংলা সফট মেলোডি ও রাতের মিষ্টি গান';
          break;
      }
    }

    const videos = await searchYouTubeDirect(searchQuery);
    if (videos && videos.length > 0) {
      musicFeedCache[cacheKey] = { timestamp: now, videos };
      return res.json({
        period,
        category,
        cached: false,
        videos,
      });
    }

    res.json({
      period,
      category,
      cached: false,
      videos: [],
    });
  } catch (err: any) {
    console.warn('Error in /api/youtube/time-feed:', err?.message || err);
    res.json({
      period: 'evening',
      category: 'all',
      videos: [],
    });
  }
});

// AI-Powered Music Ideas & Song Recommendation Generator
app.post('/api/youtube/ai-ideas', async (req, res) => {
  try {
    const { mood = 'মন ভালো করার মতো মিষ্টি গান', genre } = req.body || {};
    const ai = getAIClient();
    const prompt = `You are an expert music curator and DJ specializing in Bengali music (বাংলা ব্যান্ড, কোক স্টুডিও, রবীন্দ্র সংগীত, ফোক, আধুনিক) and global melodies.
User is asking for song recommendations and ideas based on this mood/preference: "${mood}" ${genre ? `(Genre: ${genre})` : ''}.

Provide 5 creative, accurate song recommendations that truly exist on YouTube.
Respond ONLY with a valid JSON array in this format:
[
  {
    "titleBn": "গানের নাম ও শিল্পী",
    "artist": "শিল্পীর নাম",
    "searchQuery": "গানের সঠিক নাম ও শিল্পী (যেমন: আইয়ুব বাচ্চু সেই তুমি)",
    "moodReasonBn": "কেন এই গানটি এই মুডের জন্য সেরা (সংক্ষিপ্ত ১ বাক্য)",
    "genre": "ব্যান্ড / ফোক / মেলোডি / লফি"
  }
]
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '[]');
    const enrichedIdeas = [];

    // For the top 3 ideas, quickly look up real YouTube video IDs so they can be played directly
    for (let i = 0; i < Math.min(3, parsed.length); i++) {
      const item = parsed[i];
      try {
        const direct = await searchYouTubeDirect(item.searchQuery || item.titleBn);
        if (direct && direct.length > 0) {
          enrichedIdeas.push({
            ...item,
            topVideo: direct[0],
          });
          continue;
        }
      } catch (_) {}
      enrichedIdeas.push(item);
    }

    // Add remaining
    for (let i = 3; i < parsed.length; i++) {
      enrichedIdeas.push(parsed[i]);
    }

    res.json({
      mood,
      ideas: enrichedIdeas,
    });
  } catch (err: any) {
    console.warn('Error in /api/youtube/ai-ideas:', err?.message || err);
    res.json({
      mood: 'সেরা গান',
      ideas: [
        {
          titleBn: 'সেই তুমি - আইয়ুব বাচ্চু (এলআরবি)',
          artist: 'আইয়ুব বাচ্চু',
          searchQuery: 'আইয়ুব বাচ্চু সেই তুমি',
          moodReasonBn: 'নস্টালজিক মেলোডি যা হৃদয়ে দোলা দেয়।',
          genre: 'বাংলা ব্যান্ড',
        },
        {
          titleBn: 'নাসেক নাসেক - কোক স্টুডিও বাংলা',
          artist: 'অনির্বাণ ভট্টাচার্য',
          searchQuery: 'Coke Studio Bangla Nasek Nasek',
          moodReasonBn: 'মনকে চনমনে করে তোলার দুর্দান্ত ফোক-ফিউশন।',
          genre: 'কোক স্টুডিও',
        },
        {
          titleBn: 'আনন্দলোকে মঙ্গলালোকে - রবীন্দ্র সংগীত',
          artist: 'রবীন্দ্রনাথ ঠাকুর',
          searchQuery: 'আনন্দলোকে মঙ্গলালোকে রবীন্দ্র সংগীত',
          moodReasonBn: 'ভোর বা কাজের শুরুতে আধ্যাত্মিক প্রশান্তি।',
          genre: 'রবীন্দ্র সংগীত',
        },
      ],
    });
  }
});

// Autonomous Freelance Agent: Evaluate Job & Generate Winning Proposal
app.post('/api/agent/evaluate-job', async (req, res) => {
  try {
    const { job, profile } = req.body;
    if (!job || !job.description) {
      return res.status(400).json({ error: 'Job description is required.' });
    }

    const ai = getAIClient();
    const prompt = `
You are an autonomous freelance sales engineer and top-rated remote consultant on Upwork, RemoteOK, and LinkedIn.
Analyze the following remote job posting and candidate profile:

JOB DETAILS:
Platform: ${job.platform || 'Upwork / Remote'}
Title: ${job.title || 'Remote Software Development'}
Budget: ${job.budget || 'Competitive / Negotiable'}
Required Skills: ${(job.skillsRequired || []).join(', ') || 'Not specified'}
Job Description:
${job.description}

CANDIDATE PROFILE & CAPABILITIES:
Skills: ${(profile?.skills || ['React', 'TypeScript', 'Node.js', 'Python', 'FastAPI', 'Automation', 'AI Integration']).join(', ')}
Bio: ${profile?.bio || 'Full stack engineer with 5+ years of experience in modern web apps, automation bots, and AI API integrations.'}
Target Rate: ${profile?.hourlyRate || '$45 - $65/hr'}

TASK:
Perform a deep technical evaluation and generate a high-converting, professional, tailored proposal.
Rules:
- NEVER use generic opening lines like "I am writing to express my interest..." or "I am the best candidate".
- Immediately demonstrate technical understanding of their exact problem in the first sentence.
- Propose a concrete 3-step action plan or architectural approach.
- Include 2-3 thoughtful questions that only an expert would ask.
- Keep tone professional, confident, proactive, and concise.

Respond ONLY with valid JSON in this exact structure:
{
  "matchScore": 92,
  "recommendation": "Highly Recommended",
  "summary": "Short 2-sentence technical summary in Bengali (বাংলা)",
  "keyStrengths": ["Strength 1 in Bengali", "Strength 2 in Bengali"],
  "potentialRisks": ["Risk 1 in Bengali", "Risk 2 in Bengali"],
  "suggestedBid": "$500",
  "estimatedDays": 4,
  "winningStrategy": "Strategic tip in Bengali on how to close this client",
  "coverLetter": "Full customized winning proposal letter in English (or Bengali if job is Bengali)",
  "milestones": [
    { "title": "Milestone 1: Architecture & Setup", "duration": "1 day", "cost": "$150" },
    { "title": "Milestone 2: Core Feature Implementation", "duration": "2 days", "cost": "$250" },
    { "title": "Milestone 3: Testing, Deployment & Handover", "duration": "1 day", "cost": "$100" }
  ],
  "questionsForClient": [
    "Technical question 1 about their database or API",
    "Workflow question 2"
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/agent/evaluate-job:', err?.message || err);
    res.status(500).json({
      error: formatFriendlyErrorMessage(err),
    });
  }
});

// Autonomous Freelance Agent: Execute Task & Self-Healing Code Solver
app.post('/api/agent/solve-task', async (req, res) => {
  try {
    const { jobTitle, requirement, techStack } = req.body;
    if (!requirement) {
      return res.status(400).json({ error: 'Requirement description is required.' });
    }

    const ai = getAIClient();
    const prompt = `
You are an autonomous senior software engineer performing a freelance contract delivery.
Client Requirement:
Title: ${jobTitle || 'Custom Software Module'}
Tech Stack: ${techStack || 'TypeScript / Node.js'}
Detailed Specification:
${requirement}

TASK:
1. Decompose the requirement into architecture.
2. Produce production-grade, bug-free, complete source code files (No placeholders, no "TODOs").
3. Perform a simulated automated test & self-healing verification:
   - Identify a potential edge-case or lint error that a self-correcting agent catches.
   - Show how the agent corrected it before delivery.
4. Write a professional client delivery message ready to paste in Upwork/Fiverr chat.

Respond ONLY with valid JSON in this exact structure:
{
  "architecture": "Architecture overview in Bengali (বাংলা)",
  "files": [
    {
      "filename": "index.ts",
      "language": "typescript",
      "purpose": "Core entrypoint and execution logic",
      "content": "/* Complete working code */"
    },
    {
      "filename": "README.md",
      "language": "markdown",
      "purpose": "Setup instructions and API documentation",
      "content": "/* Complete markdown documentation */"
    }
  ],
  "selfHealingReport": {
    "iterations": 2,
    "initialErrorDetected": "Edge case: Missing null check or timeout handler on API fetch",
    "correctionApplied": "Added retry loop with exponential backoff and strict TypeScript typing",
    "testsPassed": true,
    "assertionsCount": 12
  },
  "deliveryNote": "Hi [Client Name], I have completed the requested module according to your exact specifications..."
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/agent/solve-task:', err?.message || err);
    res.status(500).json({
      error: formatFriendlyErrorMessage(err),
    });
  }
});

// GitHub Profile & Repos Integration for Sheikh Farid (rsk934128-dot)
let cachedGithubUser: { data: any; timestamp: number } | null = null;
let cachedGithubRepos: { data: any; timestamp: number } | null = null;

app.get('/api/github/user', async (req, res) => {
  try {
    const now = Date.now();
    if (cachedGithubUser && now - cachedGithubUser.timestamp < 10 * 60 * 1000) {
      return res.json(cachedGithubUser.data);
    }

    const response = await fetch('https://api.github.com/users/rsk934128-dot', {
      headers: {
        'User-Agent': 'AI-Assistant-Coding-Studio-App/1.0',
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      cachedGithubUser = { data, timestamp: now };
      return res.json(data);
    }

    // Fallback if rate limited or network failure
    const fallbackUser = {
      login: 'rsk934128-dot',
      id: 248212950,
      avatar_url: 'https://avatars.githubusercontent.com/u/248212950?v=4',
      html_url: 'https://github.com/rsk934128-dot',
      name: 'SHEIKH FARID',
      company: 'RubelPay',
      blog: 'https://www.facebook.com/rubelrubel.rubel.98',
      location: 'Sirajganj Sadar, Bangladesh',
      bio: 'Founder & Independent Software Builder from Bangladesh 🇧🇩\nBuilding trust-first web & app solutions that solve real-world problems. Focus: • Visa & migration',
      public_repos: 139,
      followers: 0,
      following: 0,
      hireable: true,
    };
    return res.json(fallbackUser);
  } catch (err: any) {
    console.warn('GitHub user fetch fallback:', err?.message || err);
    return res.json({
      login: 'rsk934128-dot',
      avatar_url: 'https://avatars.githubusercontent.com/u/248212950?v=4',
      html_url: 'https://github.com/rsk934128-dot',
      name: 'SHEIKH FARID',
      company: 'RubelPay',
      location: 'Sirajganj Sadar, Bangladesh',
      bio: 'Founder & Independent Software Builder from Bangladesh 🇧🇩',
      public_repos: 139,
    });
  }
});

app.get('/api/github/repos', async (req, res) => {
  try {
    const now = Date.now();
    if (cachedGithubRepos && now - cachedGithubRepos.timestamp < 10 * 60 * 1000) {
      return res.json(cachedGithubRepos.data);
    }

    const response = await fetch('https://api.github.com/users/rsk934128-dot/repos?sort=updated&per_page=100', {
      headers: {
        'User-Agent': 'AI-Assistant-Coding-Studio-App/1.0',
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (response.ok) {
      const repos = await response.json();
      if (Array.isArray(repos) && repos.length > 0) {
        cachedGithubRepos = { data: repos, timestamp: now };
        return res.json(repos);
      }
    }

    // High fidelity curated fallback list of Sheikh Farid's repositories
    const fallbackRepos = [
      {
        id: 1,
        name: 'DeepMind-Science-Discovery-Workbench',
        full_name: 'rsk934128-dot/DeepMind-Science-Discovery-Workbench',
        html_url: 'https://github.com/rsk934128-dot/DeepMind-Science-Discovery-Workbench',
        description: 'DeepMind Science Discovery Workbench — অত্যাধুনিক বৈজ্ঞানিক গবেষণা, প্রোটিন মডেলিং ও সিমুলেশন প্ল্যাটফর্ম।',
        language: 'TypeScript',
        stargazers_count: 5,
        forks_count: 1,
        updated_at: '2026-10-14T10:00:00Z',
      },
      {
        id: 2,
        name: 'Sheikh-Farid-AI-Studio-',
        full_name: 'rsk934128-dot/Sheikh-Farid-AI-Studio-',
        html_url: 'https://github.com/rsk934128-dot/Sheikh-Farid-AI-Studio-',
        description: 'শেখ ফরিদ AI Studio — পূর্ণাঙ্গ ফুল-স্ট্যাক কৃত্রিম বুদ্ধিমত্তা সহকারী ও অটোমেটেড কোডিং স্টুডিও।',
        language: 'TypeScript',
        stargazers_count: 8,
        forks_count: 2,
        updated_at: '2026-10-14T08:30:00Z',
      },
      {
        id: 3,
        name: 'Sheikh-Farid-AI-Studio-Project-Hub',
        full_name: 'rsk934128-dot/Sheikh-Farid-AI-Studio-Project-Hub',
        html_url: 'https://github.com/rsk934128-dot/Sheikh-Farid-AI-Studio-Project-Hub',
        description: 'শেখ ফরিদ AI Studio & Project Hub — মাল্টি-রিপোজিটরি ইকোসিস্টেম ও প্রজেক্ট কোঅর্ডিনেশন হাব।',
        language: 'TypeScript',
        stargazers_count: 4,
        forks_count: 1,
        updated_at: '2026-10-13T14:20:00Z',
      },
      {
        id: 4,
        name: 'Stripe-Gmail-Payment-Gateway-Hub',
        full_name: 'rsk934128-dot/Stripe-Gmail-Payment-Gateway-Hub',
        html_url: 'https://github.com/rsk934128-dot/Stripe-Gmail-Payment-Gateway-Hub',
        description: 'Stripe & Gmail Payment Gateway Hub — সিকিউর পেমেন্ট গেটওয়ে এবং অটোমেটেড জিমেইল রিসিট ডিসবার্সমেন্ট সিস্টেম।',
        language: 'JavaScript',
        stargazers_count: 6,
        forks_count: 1,
        updated_at: '2026-10-12T12:00:00Z',
      },
      {
        id: 5,
        name: 'AI-Assistant-Coding-Studio',
        full_name: 'rsk934128-dot/AI-Assistant-Coding-Studio',
        html_url: 'https://github.com/rsk934128-dot/AI-Assistant-Coding-Studio',
        description: 'AI-Assistant-Coding-Studio — ফ্ল্যাগশিপ রিয়েল-টাইম কোডিং সহকারী, লাইভ কম্পাইলার ও ক্লাউড সিঙ্ক।',
        language: 'TypeScript',
        stargazers_count: 12,
        forks_count: 3,
        updated_at: '2026-10-11T16:45:00Z',
      },
      {
        id: 6,
        name: 'PayHub-Gateway-Gmail-Disbursement-PWA',
        full_name: 'rsk934128-dot/PayHub-Gateway-Gmail-Disbursement-PWA',
        html_url: 'https://github.com/rsk934128-dot/PayHub-Gateway-Gmail-Disbursement-PWA',
        description: 'PayHub Gateway & Gmail Disbursement PWA — অফলাইন-ফার্স্ট পেমেন্ট গেটওয়ে ও পে-রোল ম্যানেজমেন্ট।',
        language: 'TypeScript',
        stargazers_count: 7,
        forks_count: 2,
        updated_at: '2026-10-10T09:15:00Z',
      },
      {
        id: 7,
        name: 'No-IP-DNS-Remote-Access',
        full_name: 'rsk934128-dot/No-IP-DNS-Remote-Access',
        html_url: 'https://github.com/rsk934128-dot/No-IP-DNS-Remote-Access',
        description: 'No-IP ডায়নামিক ডিএনএস ও রিমোট সার্ভার অ্যাক্সেস অটোমেশন টুলকিট।',
        language: 'Shell',
        stargazers_count: 3,
        forks_count: 0,
        updated_at: '2026-10-09T18:00:00Z',
      },
    ];
    return res.json(fallbackRepos);
  } catch (err: any) {
    console.warn('GitHub repos fetch error:', err?.message || err);
    return res.json([]);
  }
});

// No-IP Dynamic DNS (DDNS) Automation & Diagnostic API
app.get('/api/ddns/my-ip', async (req, res) => {
  try {
    const ipRes = await fetch('https://api.ipify.org?format=json');
    if (ipRes.ok) {
      const data = await ipRes.json();
      return res.json({ ip: data.ip });
    }
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
    return res.json({ ip: clientIp });
  } catch (err: any) {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
    return res.json({ ip: clientIp });
  }
});

app.post('/api/ddns/update', ddnsRateLimiter, async (req, res) => {
  try {
    const { hostname = 'office.ddns.net', username, password, myip } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        code: 'badauth',
        error: 'No-IP username/email এবং password প্রয়োজন।'
      });
    }

    const targetHostname = String(hostname).trim();
    let targetIp = String(myip || '').trim();

    // Auto-detect public IP if not provided
    if (!targetIp) {
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        if (ipRes.ok) {
          const data = await ipRes.json();
          targetIp = data.ip;
        }
      } catch (_) {}
    }

    const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
    const updateUrl = targetIp
      ? `https://dynupdate.no-ip.com/nic/update?hostname=${encodeURIComponent(targetHostname)}&myip=${encodeURIComponent(targetIp)}`
      : `https://dynupdate.no-ip.com/nic/update?hostname=${encodeURIComponent(targetHostname)}`;

    const noIpRes = await fetch(updateUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'User-Agent': 'PartnerGateway/3.2 developer@partner.com',
      },
    });

    const rawOutput = (await noIpRes.text()).trim();
    const parts = rawOutput.split(/\s+/);
    const code = parts[0]?.toLowerCase();
    const resolvedIp = parts[1] || targetIp;

    let success = false;
    let messageBn = '';
    let messageEn = '';
    let instructions: string[] = [];

    switch (code) {
      case 'good':
        success = true;
        messageBn = `DNS রেকর্ড সফলভাবে আপডেট হয়েছে! বর্তমান IP: ${resolvedIp}`;
        messageEn = `DNS record updated successfully! IP is now ${resolvedIp}`;
        break;
      case 'nochg':
        success = true;
        messageBn = `IP ইতিমধ্যেই আপডেট রয়েছে (${resolvedIp})। অতিরিক্ত পরিবর্তনের প্রয়োজন নেই।`;
        messageEn = `IP is already identical (${resolvedIp}); no change needed.`;
        break;
      case 'badauth':
        success = false;
        messageBn = 'ইউজারনেম অথবা পাসওয়ার্ড সঠিক নয় (Invalid Credentials / badauth)।';
        messageEn = 'Invalid username or password (badauth).';
        instructions = [
          '১. No-IP.com এ লগইন করুন (https://www.noip.com/login)।',
          '২. Account -> "DDNS Keys" মেনু থেকে একটি নতুন DDNS Key তৈরি করুন।',
          '৩. No-IP এখন মূল পাসওয়ার্ডের বদলে ডেডিকেটেড "DDNS Key" ইউজারনেম ও পাসওয়ার্ড ব্যবহার বাধ্যতামূলক করেছে।',
          '৪. আপনার ইমেইল (sheikhfarid164@gmail.com বা sheikhfaridvisa164@gmail.com) সঠিক কিনা পরীক্ষা করুন।'
        ];
        break;
      case 'nohost':
        success = false;
        messageBn = `প্রদত্ত হোস্টনেম (${targetHostname}) এই একাউন্টে খুঁজে পাওয়া যায়নি (nohost)।`;
        messageEn = `Hostname (${targetHostname}) does not exist in this account (nohost).`;
        instructions = [
          '১. No-IP ড্যাশবোর্ডে গিয়ে "Dynamic DNS" -> "No-IP Hostnames" চেক করুন।',
          '২. "office.ddns.net" হোস্টনেমটি আপনার একাউন্টে সক্রিয় আছে কিনা নিশ্চিত করুন।'
        ];
        break;
      case 'abuse':
        success = false;
        messageBn = 'অ্যাকাউন্ট ব্লক বা সীমিত করা হয়েছে (abuse)। খুব ঘন ঘন আপডেট রিকোয়েস্ট পাঠানো যাবে না।';
        messageEn = 'Username blocked due to abuse or rapid update calls.';
        break;
      case '911':
        success = false;
        messageBn = 'No-IP সার্ভারে সাময়িক বিপর্যয় দেখা দিয়েছে (911)। ৩০ মিনিট পর আবার চেষ্টা করুন।';
        messageEn = 'A fatal server error occurred on No-IP side (911).';
        break;
      default:
        success = false;
        messageBn = `No-IP সার্ভার রেসপন্স: ${rawOutput}`;
        messageEn = `Response from No-IP: ${rawOutput}`;
        break;
    }

    return res.json({
      success,
      code,
      raw: rawOutput,
      messageBn,
      messageEn,
      hostname: targetHostname,
      ip: resolvedIp,
      instructions: instructions.length > 0 ? instructions : undefined,
    });
  } catch (err: any) {
    console.error('No-IP DDNS endpoint error:', err);
    return res.status(500).json({
      success: false,
      code: 'error',
      error: err?.message || 'Failed to communicate with No-IP service'
    });
  }
});

// Universal Share Target and Link Metadata Preview API with SSRF Protection
app.get('/api/fetch-link-preview', proxyRateLimiter, async (req, res) => {
  try {
    const rawUrl = req.query.url as string;
    if (!rawUrl || typeof rawUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    const ssrfCheck = await validateUrlForSsrf(rawUrl);
    if (!ssrfCheck.valid || !ssrfCheck.parsedUrl) {
      return res.status(403).json({ success: false, error: ssrfCheck.reason || 'Forbidden URL destination' });
    }

    const parsedUrl = ssrfCheck.parsedUrl;

    try {
      const response = await safeFetch(parsedUrl.toString(), {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 AIStudioBot/1.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeoutMs: 6000,
        maxSizeBytes: 2 * 1024 * 1024,
      });

      if (!response.ok) {
        return res.json({
          success: true,
          domain: parsedUrl.hostname,
          title: parsedUrl.hostname,
          description: `লিংক: ${rawUrl}`,
          url: rawUrl,
        });
      }

      const html = await response.text();
      // Extract title, og:title, og:description, description, og:image
      const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) || html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:title["']/i);
      const titleTagMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
      const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i) || html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:description["']/i);
      const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i) || html.match(/<meta\s+content=["'](.*?)["']\s+name=["']description["']/i);
      const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i) || html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:image["']/i);

      const title = ogTitleMatch?.[1] || titleTagMatch?.[1] || parsedUrl.hostname;
      const description = ogDescMatch?.[1] || metaDescMatch?.[1] || '';
      const image = ogImageMatch?.[1] || '';

      return res.json({
        success: true,
        title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').slice(0, 150),
        description: description.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').slice(0, 300),
        image: image.startsWith('http') ? image : '',
        url: rawUrl,
        domain: parsedUrl.hostname,
      });
    } catch (fetchErr: any) {
      return res.json({
        success: true,
        domain: parsedUrl.hostname,
        title: parsedUrl.hostname,
        description: `লিংক: ${rawUrl}`,
        url: rawUrl,
      });
    }
  } catch (err: any) {
    return res.json({
      success: false,
      error: err?.message || 'Failed to fetch link preview',
    });
  }
});



// ==========================================
// DEVELOPER SAAS PLATFORM & API MANAGEMENT
// ==========================================

const validateApiKey = createApiKeyMiddleware();

// 1. List user keys
app.get('/api/developer/keys', (req, res) => {
  try {
    const keys = listApiKeys();
    res.json({ success: true, keys });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to list API keys' });
  }
});

// 2. Generate new API Key
app.post('/api/developer/keys', (req, res) => {
  try {
    const { name, tier, userId } = req.body || {};
    const effectiveTier = tier === 'pro' ? 'pro' : tier === 'enterprise' ? 'enterprise' : 'free';
    const { rawKey, keyRecord } = generateApiKey(
      name || 'My Production Key',
      userId || 'developer_default',
      effectiveTier
    );

    // Return the raw key ONCE with a warning banner
    res.status(201).json({
      success: true,
      message: 'API Key সফলভাবে তৈরি হয়েছে। দয়া করে এটি নিরাপদ স্থানে সংরক্ষণ করুন, এটি আর কখনও প্রদর্শিত হবে না।',
      rawKey,
      key: keyRecord,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to generate API key' });
  }
});

// 3. Revoke Key
app.post('/api/developer/keys/:id/revoke', (req, res) => {
  try {
    const { id } = req.params;
    const ok = revokeApiKey(id);
    if (!ok) {
      return res.status(404).json({ success: false, error: 'API Key পাওয়া যায়নি।' });
    }
    res.json({ success: true, message: 'API Key সফলভাবে নিষ্ক্রিয় (Revoked) করা হয়েছে।' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to revoke API key' });
  }
});

// 4. Delete Key
app.delete('/api/developer/keys/:id', (req, res) => {
  try {
    const { id } = req.params;
    const ok = deleteApiKey(id);
    if (!ok) {
      return res.status(404).json({ success: false, error: 'API Key পাওয়া যায়নি।' });
    }
    res.json({ success: true, message: 'API Key সফলভাবে মুছে ফেলা হয়েছে।' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to delete API key' });
  }
});

// 5. Analytics & Live Metrics
app.get('/api/developer/analytics', (req, res) => {
  try {
    const analytics = getDeveloperAnalytics();
    res.json({ success: true, analytics });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to load analytics' });
  }
});

// 6. Interactive Documentation & Specs
app.get(['/api/developer/docs', '/api/v1/docs'], (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Remix AI Studio Developer API',
      version: '1.0.0',
      description: 'আন্তর্জাতিক মানসম্পন্ন এআই অ্যাসিস্ট্যান্ট, ইউটিউব সার্চ গ্রাউন্ডিং ও অডিও স্ট্রিমিং ক্লাউড API সার্ভিস।',
    },
    authentication: {
      type: 'apiKey',
      headerName: 'x-api-key',
      bearerAlternative: 'Authorization: Bearer <sk_live_...>',
      description: 'রিকোয়েস্টের হেডার হিসেবে আপনার সিক্রেট API কী প্রদান করুন।',
    },
    rateLimiting: {
      freeTier: '60 requests / minute (1,000 monthly quota)',
      proTier: '300 requests / minute (100,000 monthly quota)',
      headers: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After'],
    },
    endpoints: [
      {
        path: '/api/v1/ai/chat',
        method: 'POST',
        summary: 'এআই চ্যাট ও টেক্সট কমপ্লিশন (Gemini 3.8 / 3.1 Flash Grounded)',
        body: {
          message: 'String (required) - ইউজার প্রম্পট বা প্রশ্ন',
          systemPrompt: 'String (optional) - এআই নির্দেশিকা',
          mode: 'String (optional) - "coding" | "writing" | "research" | "citizen" | "general"',
          enableSearch: 'Boolean (optional) - গুগল লাইভ সার্চ গ্রাউন্ডিং সক্রিয় করতে true দিন',
        },
        curlExample: 'curl -X POST https://ais-pre-ototehxw6qw2i2khfoozlp-638613151911.asia-southeast1.run.app/api/v1/ai/chat \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: sk_live_your_key_here" \\\n  -d \'{"message": "Python দিয়ে একটি REST API কীভাবে বানাব?"}\'',
      },
      {
        path: '/api/v1/youtube/search',
        method: 'GET',
        summary: 'ইউটিউব ও মিউজিক একুরেট সার্চ API (টাইপো-টলারেন্ট ও রিয়েল ট্র্যাক)',
        params: {
          query: 'String (required) - সার্চ কি-ওয়ার্ড (যেমন: "new song bangla", "coke studio")',
        },
        curlExample: 'curl -X GET "https://ais-pre-ototehxw6qw2i2khfoozlp-638613151911.asia-southeast1.run.app/api/v1/youtube/search?query=new+song+bangla" \\\n  -H "x-api-key: sk_live_your_key_here"',
      },
      {
        path: '/api/v1/tts',
        method: 'GET',
        summary: 'টেক্সট-টু-স্পিচ (TTS) অডিও স্ট্রিমিং API (বাংলা ও ইংরেজি)',
        params: {
          text: 'String (required) - টেক্সট যা অডিওতে রূপান্তর হবে',
          lang: 'String (optional) - "bn" বা "en"',
        },
        curlExample: 'curl -X GET "https://ais-pre-ototehxw6qw2i2khfoozlp-638613151911.asia-southeast1.run.app/api/v1/tts?text=স্বাগতম&lang=bn" \\\n  -H "x-api-key: sk_live_your_key_here" --output audio.mp3',
      },
      {
        path: '/api/v1/usage',
        method: 'GET',
        summary: 'আপনার API কী কোটা ও ব্যবহারের পরিসংখ্যান জানুন',
        curlExample: 'curl -X GET https://ais-pre-ototehxw6qw2i2khfoozlp-638613151911.asia-southeast1.run.app/api/v1/usage \\\n  -H "x-api-key: sk_live_your_key_here"',
      },
    ],
  });
});

// ==========================================
// PUBLIC DEVELOPER ENDPOINTS (/api/v1/*)
// Protected by validateApiKey middleware
// ==========================================

// Check Key Usage & Quota
app.get('/api/v1/usage', validateApiKey, (req: any, res: any) => {
  const user = req.developerUser;
  res.json({
    success: true,
    status: 'active',
    key: {
      id: user.keyId,
      name: user.keyName,
      prefix: user.keyPrefix,
      tier: user.tier,
    },
    rateLimit: {
      limitPerMinute: res.getHeader('X-RateLimit-Limit'),
      remainingInMinute: res.getHeader('X-RateLimit-Remaining'),
      resetInSeconds: res.getHeader('X-RateLimit-Reset'),
    },
    timestamp: new Date().toISOString(),
  });
});

// AI Chat Completion Endpoint for Third-Party Developers
app.post('/api/v1/ai/chat', validateApiKey, async (req: any, res: any) => {
  try {
    const { message, systemPrompt, mode, enableSearch } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: '"message" ফিল্ড প্রদান করা আবশ্যক।' });
    }

    const ai = getAIClient();
    const sysInstruction =
      (systemPrompt ||
        'You are an intelligent, helpful AI assistant API powered by Google Gemini. Respond accurately, helpfully, and concisely.') +
      (mode ? ` Assistant mode: ${mode}.` : '');

    const contents = [{ role: 'user', parts: [{ text: message.trim() }] }];
    const searchEnabled = Boolean(enableSearch);

    const response = await fetchContentWithResilience(
      ai,
      contents,
      sysInstruction,
      searchEnabled,
      'gemini-3.5-flash-lite'
    );

    const text = (response as any)?.text || '';
    const candidate = (response as any)?.candidates?.[0];
    const groundingChunks = (candidate?.groundingMetadata?.groundingChunks || [])
      .map((c: any) => c.web)
      .filter(Boolean);

    res.json({
      success: true,
      model: 'gemini-3.5-flash-lite',
      response: text,
      groundingSources: groundingChunks,
      developerKey: req.developerUser?.keyPrefix,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error in /api/v1/ai/chat:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'এআই প্রসেসিংয়ের সময় অপ্রত্যাশিত ত্রুটি ঘটেছে।',
    });
  }
});

// Real YouTube Search Endpoint for Third-Party Developers
app.get('/api/v1/youtube/search', validateApiKey, async (req: any, res: any) => {
  try {
    const query = String(req.query.query || '').trim();
    if (!query) {
      return res.status(400).json({ success: false, error: '"query" প্যারামিটার প্রদান করা আবশ্যক।' });
    }

    const { normalized } = normalizeMusicSearchQuery(query);
    const results = await searchYouTubeDirect(query);
    const finalResults = results.length > 0 ? results : TOP_VERIFIED_BANGLA_SONGS;

    res.json({
      success: true,
      query,
      normalizedQuery: normalized,
      count: finalResults.length,
      videos: finalResults,
      developerKey: req.developerUser?.keyPrefix,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || 'ইউটিউব সার্চ প্রসেস করতে ব্যর্থ হয়েছে।',
    });
  }
});

// Text-to-Speech Audio Stream Endpoint for Third-Party Developers
app.get('/api/v1/tts', validateApiKey, async (req: any, res: any) => {
  try {
    const rawText = String(req.query.text || '').trim();
    if (!rawText) {
      return res.status(400).json({ success: false, error: '"text" প্যারামিটার প্রদান করা আবশ্যক।' });
    }

    const requestedLang = String(req.query.lang || '').toLowerCase();
    const hasBengali = /[\u0980-\u09FF]/.test(rawText);
    const lang = requestedLang === 'en' ? 'en' : hasBengali || requestedLang === 'bn' ? 'bn' : 'en';

    const chunk = rawText.slice(0, 200);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'audio/mpeg, audio/*;q=0.9',
        'Referer': 'https://translate.google.com/',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: 'Failed to fetch TTS audio stream.' });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.end(buffer);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'TTS প্রসেসিং ত্রুটি।' });
  }
});

// =========================================================================
// GitHub Business Idea, SMS Writer, Automated Gmail & Marketing Generator
// =========================================================================
app.post('/api/business/generate-campaign', requireAuth, aiRateLimiter, async (req, res) => {
  try {
    const {
      repoName,
      repoUrl = '',
      description = '',
      language = '',
      targetMarket = 'Bangladesh & Global Clients',
      focusGoal = 'B2B Sales, SaaS Subscription & Client Outreach',
    } = req.body || {};

    if (!repoName || typeof repoName !== 'string' || !repoName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'ক্যাম্পেইন ও বিজনেস আইডিয়া তৈরির জন্য একটি GitHub প্রজেক্টের নাম প্রয়োজন।',
      });
    }

    const cleanRepoName = repoName.trim().slice(0, 150);
    const cleanRepoUrl = String(repoUrl || '').trim().slice(0, 300);
    const cleanDesc = String(description || '').trim().slice(0, 1000);
    const cleanLang = String(language || '').trim().slice(0, 60);
    const cleanMarket = String(targetMarket || '').trim().slice(0, 200);
    const cleanGoal = String(focusGoal || '').trim().slice(0, 300);

    const ai = getAIClient();

    const prompt = `You are a practical tech-business strategist, growth marketer, and B2B copywriter helping a software founder in Bangladesh monetize and market their GitHub software project.

Project Details:
- Repository Name: ${cleanRepoName}
- Repository URL: ${cleanRepoUrl || 'Not specified'}
- Primary Tech / Language: ${cleanLang || 'Full-stack Web/Software'}
- Description: ${cleanDesc || 'Software application / developer tool / digital platform'}
- Target Market: ${cleanMarket}
- Primary Focus: ${cleanGoal}

Generate a complete, actionable business & marketing pack in natural, clear Bengali (with a clean English B2B Gmail variant too):
1. summaryBn: Brief 2-sentence commercial opportunity summary for this project in Bengali.
2. businessIdeas: 3 distinct, realistic business & monetization models tailored to this project (title, businessModel, targetAudience, pricingStrategy in BDT/USD, revenuePotential, firstSteps).
3. smsTemplates: 3 short, high-converting SMS templates (Promotional Bengali SMS, Direct Sales Outreach SMS, Follow-up / Special Offer SMS — concise, crisp, under 280 chars where natural, including project name).
4. emailCampaign: An authentic, high-converting working Gmail pitch (idealRecipientPersona, subjectBn, bodyBn, subjectEn, bodyEn) ready to send directly to potential clients or business partners. Do NOT include placeholder brackets like [Date] unless clearly helpful, and make it sound realistic and ready to send.
5. marketingPlaybook: Practical marketing execution plan (headline, channels array, weeklyActionPlan array of 4 steps, growthTactics array of 4 tactics).
6. businessLesson: Key "Business Insights / বিজনেস লার্নিং" takeaway specifically taught through this project (topicTitle, keyTakeaways array of 3 insights, practicalAdvice).`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        summaryBn: { type: Type.STRING },
        businessIdeas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              businessModel: { type: Type.STRING },
              targetAudience: { type: Type.STRING },
              pricingStrategy: { type: Type.STRING },
              revenuePotential: { type: Type.STRING },
              firstSteps: { type: Type.STRING },
            },
            required: ['title', 'businessModel', 'targetAudience', 'pricingStrategy', 'revenuePotential', 'firstSteps'],
          },
        },
        smsTemplates: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              language: { type: Type.STRING },
              message: { type: Type.STRING },
            },
            required: ['label', 'language', 'message'],
          },
        },
        emailCampaign: {
          type: Type.OBJECT,
          properties: {
            idealRecipientPersona: { type: Type.STRING },
            subjectBn: { type: Type.STRING },
            bodyBn: { type: Type.STRING },
            subjectEn: { type: Type.STRING },
            bodyEn: { type: Type.STRING },
          },
          required: ['idealRecipientPersona', 'subjectBn', 'bodyBn', 'subjectEn', 'bodyEn'],
        },
        marketingPlaybook: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            channels: { type: Type.ARRAY, items: { type: Type.STRING } },
            weeklyActionPlan: { type: Type.ARRAY, items: { type: Type.STRING } },
            growthTactics: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['headline', 'channels', 'weeklyActionPlan', 'growthTactics'],
        },
        businessLesson: {
          type: Type.OBJECT,
          properties: {
            topicTitle: { type: Type.STRING },
            keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
            practicalAdvice: { type: Type.STRING },
          },
          required: ['topicTitle', 'keyTakeaways', 'practicalAdvice'],
        },
      },
      required: ['summaryBn', 'businessIdeas', 'smsTemplates', 'emailCampaign', 'marketingPlaybook', 'businessLesson'],
    };

    let rawJsonText = '';
    let lastError: any = null;
    for (const model of FALLBACK_MODELS) {
      try {
        const result = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction:
              'You are an expert startup mentor, SaaS monetization architect, and B2B marketing copywriter fluent in standard Bengali and English. Output strict JSON matching the schema.',
            responseMimeType: 'application/json',
            responseSchema,
          },
        });
        if (result.text && result.text.trim()) {
          rawJsonText = result.text.trim();
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Business Generate] Model ${model} failed:`, err?.message || err);
      }
    }

    if (!rawJsonText) {
      throw lastError || new Error('Gemini API থেকে বিজনেস ক্যাম্পেইন তৈরি করা যায়নি।');
    }

    const parsed = JSON.parse(rawJsonText);
    return res.json({
      success: true,
      repoName: cleanRepoName,
      campaign: parsed,
      generatedAt: Date.now(),
    });
  } catch (err: any) {
    console.error('Error in /api/business/generate-campaign:', err);
    return res.status(500).json({
      success: false,
      error: formatFriendlyErrorMessage(err),
    });
  }
});

// =========================================================================
// Interactive Business Insights & Marketing Learning Coach Endpoint
// =========================================================================
app.post('/api/business/learn', requireAuth, aiRateLimiter, async (req, res) => {
  try {
    const { topic = '', question = '', projectName = '', projectDescription = '' } = req.body || {};
    const queryText = String(question || topic || '').trim();
    if (!queryText) {
      return res.status(400).json({
        success: false,
        error: 'শেখার জন্য একটি বিষয় বা প্রশ্ন লিখুন।',
      });
    }

    const ai = getAIClient();
    const prompt = `Teach practical, real-world software business, marketing, SMS/email outreach, pricing, and customer growth strategies in fluent, easy-to-follow Bengali (বাংলা).
${projectName ? `Relate examples specifically to the founder's software project: "${String(projectName).slice(0, 120)}" (${String(projectDescription || '').slice(0, 400)}).` : ''}

Topic / Question:
"${queryText.slice(0, 1500)}"

Provide:
- title: Clear Bengali lesson title
- overview: Concise 2-3 sentence summary
- coreConcepts: 3 practical concepts with heading, detailed explanation in Bengali, and a concrete real-world example
- actionChecklist: 4 immediate action steps the user can apply today
- proTip: One high-leverage business & marketing tip`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        overview: { type: Type.STRING },
        coreConcepts: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              heading: { type: Type.STRING },
              explanation: { type: Type.STRING },
              example: { type: Type.STRING },
            },
            required: ['heading', 'explanation', 'example'],
          },
        },
        actionChecklist: { type: Type.ARRAY, items: { type: Type.STRING } },
        proTip: { type: Type.STRING },
      },
      required: ['title', 'overview', 'coreConcepts', 'actionChecklist', 'proTip'],
    };

    let rawJsonText = '';
    let lastError: any = null;
    for (const model of FALLBACK_MODELS) {
      try {
        const result = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction:
              'You are a practical Bengali business mentor specializing in SaaS, software freelancing, digital marketing, SMS/Gmail outreach, and scaling tech startups from Bangladesh.',
            responseMimeType: 'application/json',
            responseSchema,
          },
        });
        if (result.text && result.text.trim()) {
          rawJsonText = result.text.trim();
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Business Learn] Model ${model} failed:`, err?.message || err);
      }
    }

    if (!rawJsonText) {
      throw lastError || new Error('বিজনেস লার্নিং কনটেন্ট তৈরি করা যায়নি।');
    }

    return res.json({
      success: true,
      lesson: JSON.parse(rawJsonText),
      generatedAt: Date.now(),
    });
  } catch (err: any) {
    console.error('Error in /api/business/learn:', err);
    return res.status(500).json({
      success: false,
      error: formatFriendlyErrorMessage(err),
    });
  }
});

// Global Express error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled route error in server:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({
    success: false,
    error: err?.message || 'Internal Server Error',
  });
});

function serveStaticProduction() {
  const cwdDist = path.join(process.cwd(), 'dist');
  const appDir = getAppDirname();
  const dirnameDist = path.resolve(appDir, appDir.endsWith('dist') ? '.' : 'dist');
  const distPath = fs.existsSync(cwdDist) ? cwdDist : dirnameDist;

  app.use(express.static(distPath, { maxAge: '1d', index: false }));

  // Immediate health check endpoints for Cloud Run & container orchestration
  app.get(['/healthz', '/_health', '/api/healthz'], (req, res) => {
    res.status(200).send('OK');
  });

  // Unmatched API requests in production must return JSON 404, never index.html
  app.use('/api', (req, res) => {
    res.status(404).json({
      success: false,
      error: `API route not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // SPA catch-all for HTML pages
  app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(200).send(
        '<!DOCTYPE html><html><head><title>App Initializing</title></head><body><h1>Application Initializing</h1><p>Frontend static bundle not found. Please run: npm run build</p></body></html>'
      );
    }
  });
}

async function startServer() {
  const distExists = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'));
  const isDevScript = process.env.npm_lifecycle_event === 'dev';
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.npm_lifecycle_event === 'start' ||
    (distExists && !isDevScript && process.env.NODE_ENV !== 'development');

  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: false,
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.warn('Vite dev middleware failed to load, falling back to static server:', viteErr);
      serveStaticProduction();
    }
  } else {
    serveStaticProduction();
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (mode: ${isProduction ? 'production' : 'development'})`);
  });
}

// In serverless environments (like Vercel, Netlify Functions, AWS Lambda), the platform manages request lifecycles
if (!process.env.VERCEL && !process.env.NETLIFY && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  startServer();
}

export { app };
export default app;
