import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { dictTranslate, batchDictTranslate, hasChinese } from "./translate-dict";

// Multi-source translation with fallback
// Priority: 1) Dictionary (offline, reliable) 2) MyMemory 3) Google Translate

// In-memory cache
const cache = new Map<string, string>();
const MAX_CACHE = 5000;

function getCacheKey(text: string, from: string, to: string): string {
  return `${from}:${to}:${text}`;
}

// Source 1: Offline dictionary (always available, no limits)
function dictionaryTranslate(text: string): string {
  return dictTranslate(text);
}

// Source 2: MyMemory (free, 1000 words/day)
async function mymemoryTranslate(text: string, from: string, to: string): Promise<string | null> {
  try {
    const pair = `${from === "zh-CN" ? "zh" : from}|${to === "en" ? "en-US" : to}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${pair}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { responseData?: { translatedText?: string }; responseStatus?: number };
    if (data.responseStatus !== 200) return null;
    const t = data.responseData?.translatedText;
    if (!t || t === text) return null;
    // Check if the result is still Chinese (API limit or failure)
    if (hasChinese(t)) return null;
    return t;
  } catch {
    return null;
  }
}

// Source 3: Google Translate (unofficial, free)
async function googleTranslate(text: string, from: string, to: string): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown[][];
    if (!data || !data[0] || !Array.isArray(data[0])) return null;
    const parts = data[0] as unknown[][];
    const translated = parts.map((p) => p[0]).join("");
    if (!translated || translated === text) return null;
    if (hasChinese(translated)) return null;
    return translated;
  } catch {
    return null;
  }
}

// Source 4: LibreTranslate public instance
async function libreTranslate(text: string, from: string, to: string): Promise<string | null> {
  const instances = [
    "https://libretranslate.de",
    "https://trans.zillyhuhn.com",
  ];
  for (const base of instances) {
    try {
      const res = await fetch(`${base}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, source: from, target: to, format: "text" }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { translatedText?: string };
      const t = data.translatedText;
      if (t && t !== text && !hasChinese(t)) return t;
    } catch {
      continue;
    }
  }
  return null;
}

// Main translate with multi-source fallback
async function translateWithFallback(text: string, from: string, to: string): Promise<string> {
  // Check cache first
  const key = getCacheKey(text, from, to);
  if (cache.has(key)) return cache.get(key)!;

  // If text is not Chinese, return as-is
  if (!hasChinese(text)) return text;

  // 1. Try dictionary (offline, always available)
  const dictResult = dictionaryTranslate(text);
  if (!hasChinese(dictResult)) {
    if (cache.size > MAX_CACHE) cache.clear();
    cache.set(key, dictResult);
    return dictResult;
  }

  // 2. Try online APIs (only if dictionary still left Chinese)
  const sources = [
    () => mymemoryTranslate(text, from, to),
    () => googleTranslate(text, from, to),
    () => libreTranslate(text, from, to),
  ];

  for (const source of sources) {
    const result = await source();
    if (result) {
      if (cache.size > MAX_CACHE) cache.clear();
      cache.set(key, result);
      return result;
    }
  }

  // All sources failed, return dictionary result (may have partial translation)
  // or marked with [EN] prefix
  return dictResult;
}

// Validate translation: if result still contains Chinese, it's invalid
function isValidEn(text: string): boolean {
  return !/[\u4e00-\u9fff]/.test(text);
}

export const translateRouter = createRouter({
  // Single text translation
  translate: publicQuery
    .input(
      z.object({
        text: z.string().min(1).max(2000),
        from: z.string().default("zh-CN"),
        to: z.string().default("en"),
      }),
    )
    .mutation(async ({ input }) => {
      const translated = await translateWithFallback(input.text, input.from, input.to);
      return {
        translated,
        cached: cache.has(getCacheKey(input.text, input.from, input.to)),
        valid: isValidEn(translated),
        source: isValidEn(translated) ? (cache.has(getCacheKey(input.text, input.from, input.to)) ? "cache" : "api") : "dict",
      };
    }),

  // Batch translate with validation - uses dictionary as primary
  batchTranslate: publicQuery
    .input(
      z.object({
        texts: z.array(z.string().min(1).max(2000)).max(20),
        from: z.string().default("zh-CN"),
        to: z.string().default("en"),
      }),
    )
    .mutation(async ({ input }) => {
      // First pass: dictionary translation (fast, offline)
      const { results: dictResults, fullyTranslated } = batchDictTranslate(input.texts);

      // For texts that dictionary couldn't fully translate, try APIs
      const results = [...dictResults];
      const apiTranslated: number[] = [];
      const failed: number[] = [];

      for (let i = 0; i < input.texts.length; i++) {
        // Skip if already fully translated by dictionary or not Chinese
        if (fullyTranslated.includes(i)) continue;

        const text = input.texts[i];

        // Check cache
        const key = getCacheKey(text, input.from, input.to);
        if (cache.has(key)) {
          results[i] = cache.get(key)!;
          continue;
        }

        // Try APIs for remaining Chinese text
        const translated = await translateWithFallback(text, input.from, input.to);
        if (isValidEn(translated)) {
          results[i] = translated;
          apiTranslated.push(i);
        } else {
          failed.push(i);
          results[i] = translated; // Use dict result with partial translation
        }
      }

      return {
        results,
        dictTranslated: fullyTranslated,
        apiTranslated,
        failed,
      };
    }),

  // Get cache stats
  stats: publicQuery.query(() => {
    return { cacheSize: cache.size };
  }),
});
