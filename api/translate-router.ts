import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { HttpClient } from "./lib/http";
import { env } from "./lib/env";

// Multi-source translation
// Priority: 1) Google Translate 2) MyMemory 3) LLM (Moonshot) as ultimate fallback

// In-memory cache
const cache = new Map<string, string>();
const MAX_CACHE = 5000;

function getCacheKey(text: string, from: string, to: string): string {
  return `${from}:${to}:${text}`;
}

function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

// Source 1: Google Translate (unofficial, free)
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
  const instances = ["https://libretranslate.de", "https://trans.zillyhuhn.com"];
  for (const base of instances) {
    try {
      const res = await fetch(`${base}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, source: from, target: to, format: "text" }),
        signal: AbortSignal.timeout(3000),
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

// LLM client for Moonshot API
const llmClient = new HttpClient(env.apiBase, {
  headers: { Authorization: `Bearer ${env.appSecret}` },
});

// Source 4: LLM translation (Moonshot AI) — whole sentence translation
async function llmTranslate(texts: string[]): Promise<string[]> {
  if (!env.apiBase || !env.appSecret) return texts.map((t) => `[EN] ${t}`);

  try {
    const prompt = `Translate the following Chinese text to English. Translate the FULL sentence, not word by word. Return ONLY the English translations, one per line, in the same order. Do not add any explanation or notes.

${texts.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;

    const res = await llmClient.post<{
      choices?: Array<{ message?: { content?: string } }>;
    }>("/v1/chat/completions", {
      model: "moonshot-v1-8k",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    }, { timeout: 15000 });

    const content = res.choices?.[0]?.message?.content;
    if (!content) return texts.map((t) => `[EN] ${t}`);

    // Parse numbered results
    const results: string[] = [];
    const lines = content.split("\n").filter((l) => l.trim());

    for (let i = 0; i < texts.length; i++) {
      const prefix = `${i + 1}.`;
      const line = lines.find((l) => l.trim().startsWith(prefix));
      if (line) {
        const translated = line.substring(line.indexOf(prefix) + prefix.length).trim();
        results.push(translated || `[EN] ${texts[i]}`);
      } else {
        // Fallback: try to find any untaken line
        const untaken = lines.find((l) => {
          const n = parseInt(l.trim().split(".")[0]);
          return !isNaN(n) && n === i + 1;
        });
        if (untaken) {
          const dotIdx = untaken.indexOf(".");
          results.push(untaken.substring(dotIdx + 1).trim() || `[EN] ${texts[i]}`);
        } else {
          results.push(`[EN] ${texts[i]}`);
        }
      }
    }

    return results;
  } catch {
    return texts.map((t) => `[EN] ${t}`);
  }
}

// Main translate with multi-source fallback
async function translateWithFallback(text: string, from: string, to: string): Promise<string> {
  const key = getCacheKey(text, from, to);
  if (cache.has(key)) return cache.get(key)!;
  if (!hasChinese(text)) return text;

  // Try online APIs first
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

  // All online APIs failed — use LLM for whole-sentence translation
  const llmResults = await llmTranslate([text]);
  const result = llmResults[0] || `[EN] ${text}`;
  if (cache.size > MAX_CACHE) cache.clear();
  cache.set(key, result);
  return result;
}

function isValidEn(text: string): boolean {
  return !/[\u4e00-\u9fff]/.test(text);
}

export const translateRouter = createRouter({
  // Single text translation
  translate: publicQuery
    .input(z.object({ text: z.string().min(1).max(2000), from: z.string().default("zh-CN"), to: z.string().default("en") }))
    .mutation(async ({ input }) => {
      const translated = await translateWithFallback(input.text, input.from, input.to);
      const fromCache = cache.has(getCacheKey(input.text, input.from, input.to));
      const valid = isValidEn(translated);
      return { translated, cached: fromCache, valid, source: fromCache ? "cache" : valid ? "api" : "llm" };
    }),

  // Batch translate — uses LLM for whole-sentence translation when APIs fail
  batchTranslate: publicQuery
    .input(z.object({ texts: z.array(z.string().min(1).max(2000)).max(20), from: z.string().default("zh-CN"), to: z.string().default("en") }))
    .mutation(async ({ input }) => {
      const results: string[] = [];
      const apiTranslated: number[] = [];
      const llmTranslated: number[] = [];
      const failed: number[] = [];

      // Separate: which need API, which are cached/English
      const needApi: { index: number; text: string }[] = [];

      for (let i = 0; i < input.texts.length; i++) {
        const text = input.texts[i];
        if (!hasChinese(text)) {
          results[i] = text;
          continue;
        }
        const key = getCacheKey(text, input.from, input.to);
        if (cache.has(key)) {
          results[i] = cache.get(key)!;
          continue;
        }
        needApi.push({ index: i, text });
      }

      if (needApi.length === 0) {
        return { results, apiTranslated, llmTranslated, failed };
      }

      // Try online APIs first (for each text)
      const stillNeedLlm: { index: number; text: string }[] = [];

      for (const item of needApi) {
        let translated: string | null = null;
        for (const source of [() => googleTranslate(item.text, input.from, input.to), () => mymemoryTranslate(item.text, input.from, input.to), () => libreTranslate(item.text, input.from, input.to)]) {
          translated = await source();
          if (translated) break;
        }

        if (translated && isValidEn(translated)) {
          results[item.index] = translated;
          apiTranslated.push(item.index);
          cache.set(getCacheKey(item.text, input.from, input.to), translated);
        } else {
          stillNeedLlm.push(item);
        }
      }

      // Use LLM for remaining texts (batch call for efficiency)
      if (stillNeedLlm.length > 0) {
        const llmTexts = stillNeedLlm.map((s) => s.text);
        const llmResults = await llmTranslate(llmTexts);

        for (let i = 0; i < stillNeedLlm.length; i++) {
          const item = stillNeedLlm[i];
          const result = llmResults[i] || `[EN] ${item.text}`;
          results[item.index] = result;

          if (isValidEn(result)) {
            llmTranslated.push(item.index);
          } else {
            failed.push(item.index);
          }
          cache.set(getCacheKey(item.text, input.from, input.to), result);
        }
      }

      return { results, apiTranslated, llmTranslated, failed };
    }),

  // Dedicated LLM translation endpoint (for frontend direct calls)
  llmTranslate: publicQuery
    .input(z.object({ texts: z.array(z.string().min(1).max(2000)).max(20) }))
    .mutation(async ({ input }) => {
      const results = await llmTranslate(input.texts);
      return { results };
    }),

  // Get cache stats
  stats: publicQuery.query(() => {
    return { cacheSize: cache.size };
  }),
});
