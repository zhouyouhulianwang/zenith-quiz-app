import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";

// Simple in-memory cache for translations
const translationCache = new Map<string, string>();
const MAX_CACHE_SIZE = 2000;

// Rate limiting - MyMemory free tier: 1000 words/day
let dailyCount = 0;
let lastReset = Date.now();
const DAILY_LIMIT = 900; // Stay under the limit

function getCacheKey(text: string, from: string, to: string): string {
  return `${from}:${to}:${text}`;
}

function checkRateLimit(): boolean {
  const now = Date.now();
  // Reset counter every 24 hours
  if (now - lastReset > 24 * 60 * 60 * 1000) {
    dailyCount = 0;
    lastReset = now;
  }
  return dailyCount < DAILY_LIMIT;
}

export const translateRouter = createRouter({
  // Translate text using MyMemory API (free, no key needed)
  translate: publicQuery
    .input(
      z.object({
        text: z.string().min(1).max(2000),
        from: z.string().default("zh-CN"),
        to: z.string().default("en"),
      }),
    )
    .mutation(async ({ input }) => {
      const cacheKey = getCacheKey(input.text, input.from, input.to);

      // Check cache first
      if (translationCache.has(cacheKey)) {
        return { translated: translationCache.get(cacheKey)!, cached: true };
      }

      // Rate limit check
      if (!checkRateLimit()) {
        // Return original text if rate limited
        return { translated: input.text, cached: false, rateLimited: true };
      }

      try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(input.text)}&langpair=${input.from}|${input.to}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

        if (!response.ok) {
          return { translated: input.text, cached: false, error: "API error" };
        }

        const data = (await response.json()) as {
          responseData?: { translatedText?: string };
          responseStatus?: number;
        };

        const translated = data.responseData?.translatedText || input.text;

        // Cache the result
        if (translationCache.size > MAX_CACHE_SIZE) {
          translationCache.clear();
        }
        translationCache.set(cacheKey, translated);
        dailyCount++;

        return { translated, cached: false };
      } catch {
        return { translated: input.text, cached: false, error: "Network error" };
      }
    }),

  // Batch translate multiple texts
  batchTranslate: publicQuery
    .input(
      z.object({
        texts: z.array(z.string().min(1).max(2000)).max(10),
        from: z.string().default("zh-CN"),
        to: z.string().default("en"),
      }),
    )
    .mutation(async ({ input }) => {
      const results: string[] = [];

      for (const text of input.texts) {
        const cacheKey = getCacheKey(text, input.from, input.to);

        if (translationCache.has(cacheKey)) {
          results.push(translationCache.get(cacheKey)!);
          continue;
        }

        if (!checkRateLimit()) {
          results.push(text);
          continue;
        }

        try {
          const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${input.from}|${input.to}`;
          const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

          if (!response.ok) {
            results.push(text);
            continue;
          }

          const data = (await response.json()) as {
            responseData?: { translatedText?: string };
          };

          const translated = data.responseData?.translatedText || text;

          if (translationCache.size > MAX_CACHE_SIZE) {
            translationCache.clear();
          }
          translationCache.set(cacheKey, translated);
          dailyCount++;

          results.push(translated);
        } catch {
          results.push(text);
        }
      }

      return { results };
    }),
});
