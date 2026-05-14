import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { dictTranslate, batchDictTranslate, hasChinese } from "./translate-dict";

// Multi-source translation with fallback
// Priority: 1) Google Translate 2) MyMemory 3) LibreTranslate 4) Offline dictionary (fallback)

// In-memory cache
const cache = new Map<string, string>();
const MAX_CACHE = 5000;

function getCacheKey(text: string, from: string, to: string): string {
  return `${from}:${to}:${text}`;
}

// Source 1: Google Translate (unofficial, free) — default first choice
async function googleTranslate(text: string, from: string, to: string): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
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

// Source 2: MyMemory (free, 1000 words/day)
async function mymemoryTranslate(text: string, from: string, to: string): Promise<string | null> {
  try {
    const pair = `${from === "zh-CN" ? "zh" : from}|${to === "en" ? "en-US" : to}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${pair}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { responseData?: { translatedText?: string }; responseStatus?: number };
    if (data.responseStatus !== 200) return null;
    const t = data.responseData?.translatedText;
    if (!t || t === text) return null;
    if (hasChinese(t)) return null;
    return t;
  } catch {
    return null;
  }
}

// Source 3: LibreTranslate public instance
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

// Source 4: Offline dictionary (always available, no limits)
function dictionaryTranslate(text: string): string {
  return dictTranslate(text);
}

// Main translate with multi-source fallback
// Priority: Google > MyMemory > LibreTranslate > Dictionary
async function translateWithFallback(text: string, from: string, to: string): Promise<string> {
  // Check cache first
  const key = getCacheKey(text, from, to);
  if (cache.has(key)) return cache.get(key)!;

  // If text is not Chinese, return as-is
  if (!hasChinese(text)) return text;

  // 1. Try online APIs in priority order
  const sources = [
    () => googleTranslate(text, from, to),
    () => mymemoryTranslate(text, from, to),
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

  // 2. All online APIs failed — use offline dictionary as final fallback
  const dictResult = dictionaryTranslate(text);
  if (cache.size > MAX_CACHE) cache.clear();
  cache.set(key, dictResult);
  return dictResult;
}

// Validate translation: if result still contains Chinese, it's from dictionary
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
      const fromCache = cache.has(getCacheKey(input.text, input.from, input.to));
      const valid = isValidEn(translated);
      return {
        translated,
        cached: fromCache,
        valid,
        source: fromCache ? "cache" : valid ? "api" : "dict",
      };
    }),

  // Batch translate with validation
  // Priority: Online APIs first, then dictionary fallback
  batchTranslate: publicQuery
    .input(
      z.object({
        texts: z.array(z.string().min(1).max(2000)).max(20),
        from: z.string().default("zh-CN"),
        to: z.string().default("en"),
      }),
    )
    .mutation(async ({ input }) => {
      const results: string[] = [];
      const apiTranslated: number[] = [];
      const dictTranslated: number[] = [];
      const failed: number[] = [];

      for (let i = 0; i < input.texts.length; i++) {
        const text = input.texts[i];

        // Not Chinese — return as-is
        if (!hasChinese(text)) {
          results.push(text);
          continue;
        }

        // Check cache
        const key = getCacheKey(text, input.from, input.to);
        if (cache.has(key)) {
          results.push(cache.get(key)!);
          continue;
        }

        // Try online APIs first (Google > MyMemory > LibreTranslate)
        let translated: string | null = null;
        const apiSources = [
          () => googleTranslate(text, input.from, input.to),
          () => mymemoryTranslate(text, input.from, input.to),
          () => libreTranslate(text, input.from, input.to),
        ];

        for (const source of apiSources) {
          translated = await source();
          if (translated) break;
        }

        if (translated && isValidEn(translated)) {
          // Successfully translated by API
          results.push(translated);
          apiTranslated.push(i);
          if (cache.size > MAX_CACHE) cache.clear();
          cache.set(key, translated);
        } else {
          // All APIs failed — use offline dictionary
          const dictResult = dictTranslate(text);
          results.push(dictResult);

          if (!hasChinese(dictResult)) {
            dictTranslated.push(i);
          } else {
            failed.push(i);
          }
          if (cache.size > MAX_CACHE) cache.clear();
          cache.set(key, dictResult);
        }
      }

      return {
        results,
        apiTranslated,
        dictTranslated,
        failed,
      };
    }),

  // Get cache stats
  stats: publicQuery.query(() => {
    return { cacheSize: cache.size };
  }),
});
