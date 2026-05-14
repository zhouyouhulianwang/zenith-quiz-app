import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { env } from "./lib/env";

// Translation router
// Priority: 1) Free APIs (Google/MyMemory) 2) Moonshot LLM (guaranteed)

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

// Source 3: Moonshot LLM (guaranteed, uses API key)
async function moonshotTranslate(texts: string[]): Promise<string[]> {
  const apiKey = env.moonshotApiKey;
  if (!apiKey) return texts.map((t) => `[EN] ${t}`);

  try {
    const prompt = `Translate the following Chinese text to English. Translate the FULL sentence, not word by word. Return ONLY the English translations, one per line, in the same order. Do not add any explanation or notes.

${texts.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;

    const res = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "moonshot-v1-8k",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn("[moonshot] translate failed:", res.status, err);
      return texts.map((t) => `[EN] ${t}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
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
        results.push(`[EN] ${texts[i]}`);
      }
    }

    return results;
  } catch (err) {
    console.warn("[moonshot] translate error:", err);
    return texts.map((t) => `[EN] ${t}`);
  }
}

// Batch translate: try free APIs first, fallback to Moonshot LLM
async function batchTranslate(texts: string[]): Promise<{ results: string[]; source: string }> {
  const results: string[] = [];

  // Check cache and non-Chinese first
  const needTranslate: { index: number; text: string }[] = [];
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (!hasChinese(text)) {
      results[i] = text;
      continue;
    }
    const key = getCacheKey(text, "zh-CN", "en");
    if (cache.has(key)) {
      results[i] = cache.get(key)!;
      continue;
    }
    needTranslate.push({ index: i, text });
  }

  if (needTranslate.length === 0) {
    return { results, source: "cache" };
  }

  // Try free APIs first (per text)
  const stillNeedLlm: { index: number; text: string }[] = [];
  for (const item of needTranslate) {
    let translated: string | null = null;
    for (const source of [
      () => googleTranslate(item.text, "zh-CN", "en"),
      () => mymemoryTranslate(item.text, "zh-CN", "en"),
    ]) {
      translated = await source();
      if (translated) break;
    }
    if (translated && !hasChinese(translated)) {
      results[item.index] = translated;
      cache.set(getCacheKey(item.text, "zh-CN", "en"), translated);
    } else {
      stillNeedLlm.push(item);
    }
  }

  // Use Moonshot LLM for remaining texts
  if (stillNeedLlm.length > 0) {
    const llmTexts = stillNeedLlm.map((s) => s.text);
    const llmResults = await moonshotTranslate(llmTexts);
    for (let i = 0; i < stillNeedLlm.length; i++) {
      const item = stillNeedLlm[i];
      const result = llmResults[i];
      results[item.index] = result;
      if (!result.startsWith("[EN]")) {
        cache.set(getCacheKey(item.text, "zh-CN", "en"), result);
      }
    }
  }

  return {
    results,
    source: stillNeedLlm.length > 0 ? "llm" : "api",
  };
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
      const { results, source } = await batchTranslate([input.text]);
      return { translated: results[0], source };
    }),

  // Batch translate
  batchTranslate: publicQuery
    .input(
      z.object({
        texts: z.array(z.string().min(1).max(2000)).max(20),
        from: z.string().default("zh-CN"),
        to: z.string().default("en"),
      }),
    )
    .mutation(async ({ input }) => {
      const { results, source } = await batchTranslate(input.texts);
      return { results, source };
    }),

  // Cache stats
  stats: publicQuery.query(() => {
    return { cacheSize: cache.size };
  }),
});
