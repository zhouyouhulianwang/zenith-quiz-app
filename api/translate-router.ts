import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { env } from "./lib/env";
import { getDb } from "./queries/connection";
import { banks } from "@db/schema";
import { eq } from "drizzle-orm";
import s2t from "chinese-s2t";

function toTraditional(simple: string): string {
  if (!simple) return simple;
  try { return s2t.s2t(simple); } catch { return simple; }
}

// Translation router
// Priority: 1) Free APIs (Google/MyMemory) 2) Moonshot LLM (guaranteed)

// In-memory cache
const cache = new Map<string, string>();

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

  const prompt = `Translate the following Chinese text to English. Translate the FULL sentence, not word by word. Return ONLY the English translations, one per line, in the same order. Do not add any explanation or notes.

${texts.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;

  // Retry with exponential backoff for 429 errors
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
        console.log(`[translate] moonshot retry ${attempt}/${maxRetries}, waiting ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }

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
        signal: AbortSignal.timeout(30000),
      });

      // Handle 429 with retry
      if (res.status === 429) {
        console.warn(`[translate] moonshot 429 (attempt ${attempt + 1}/${maxRetries})`);
        continue;
      }

      if (!res.ok) {
        const err = await res.text();
        console.warn("[translate] moonshot failed:", res.status, err);
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
      console.warn(`[translate] moonshot error (attempt ${attempt + 1}/${maxRetries}):`, err);
      if (attempt === maxRetries - 1) break;
    }
  }

  return texts.map((t) => `[EN] ${t}`);
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

  // Health check: verify Moonshot API key is configured and reachable
  health: publicQuery.query(async () => {
    const apiKey = env.moonshotApiKey;
    if (!apiKey) return { configured: false, reachable: false, error: "No API key" };
    try {
      const res = await fetch("https://api.moonshot.ai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      return { configured: true, reachable: res.ok, status: res.status };
    } catch {
      return { configured: true, reachable: false, status: 0 };
    }
  }),

  // Cache stats
  stats: publicQuery.query(() => {
    return { cacheSize: cache.size, moonshotConfigured: !!env.moonshotApiKey };
  }),

  // Batch translate all questions in a bank and save to DB
  translateBankAll: authedQuery
    .input(z.object({ bankId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [row] = await db.select().from(banks).where(eq(banks.id, input.bankId));
      if (!row) return { success: false, error: "Bank not found" };

      const questions = JSON.parse(row.questionsJson || "[]");
      if (!questions.length) return { success: false, error: "No questions" };

      // Collect all texts that need translation
      const textsToTranslate: { qIdx: number; text: string; isOption: boolean; optIdx?: number }[] = [];
      for (let qIdx = 0; qIdx < questions.length; qIdx++) {
        const q = questions[qIdx];
        if (!q.enQuestion && q.question && hasChinese(q.question)) {
          textsToTranslate.push({ qIdx, text: q.question, isOption: false });
        }
        if (q.options && Array.isArray(q.options)) {
          for (let oIdx = 0; oIdx < q.options.length; oIdx++) {
            const opt = q.options[oIdx];
            if (!q.enOptions?.[oIdx] && opt && hasChinese(opt)) {
              textsToTranslate.push({ qIdx, text: opt, isOption: true, optIdx: oIdx });
            }
          }
        }
      }

      const total = textsToTranslate.length;
      if (total === 0) {
        // Just ensure TC fields exist
        let updated = 0;
        for (const q of questions) {
          if (!q.tcQuestion && q.question) { q.tcQuestion = toTraditional(q.question); updated++; }
          if (!q.tcOptions && q.options) { q.tcOptions = q.options.map((o: string) => toTraditional(o)); updated++; }
        }
        if (updated > 0) {
          await db.update(banks).set({ questionsJson: JSON.stringify(questions) }).where(eq(banks.id, input.bankId));
        }
        return { success: true, translated: 0, total: 0, alreadyDone: true };
      }

      // Batch translate with small batches
      const BATCH = 5;
      let done = 0;
      let failed = 0;

      for (let i = 0; i < total; i += BATCH) {
        const batch = textsToTranslate.slice(i, i + BATCH);
        const texts = batch.map((b) => b.text);
        const { results } = await batchTranslate(texts);

        for (let j = 0; j < batch.length; j++) {
          const item = batch[j];
          const result = results[j];
          const q = questions[item.qIdx];

          if (result && !result.startsWith("[EN]")) {
            if (item.isOption && item.optIdx !== undefined) {
              if (!q.enOptions) q.enOptions = [];
              q.enOptions[item.optIdx] = result;
            } else {
              q.enQuestion = result;
            }
          } else {
            failed++;
          }
          done++;
        }

        // Save progress every 2 batches
        if (i % (BATCH * 2) === 0 || i + BATCH >= total) {
          await db.update(banks).set({ questionsJson: JSON.stringify(questions) }).where(eq(banks.id, input.bankId));
        }

        // Rate limit: wait between batches
        if (i + BATCH < total) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      // Ensure all TC fields
      for (const q of questions) {
        if (!q.tcQuestion && q.question) q.tcQuestion = toTraditional(q.question);
        if (!q.tcOptions && q.options) q.tcOptions = q.options.map((o: string) => toTraditional(o));
      }

      // Final save
      await db.update(banks).set({ questionsJson: JSON.stringify(questions) }).where(eq(banks.id, input.bankId));

      return { success: true, translated: done - failed, total, failed };
    }),
});
