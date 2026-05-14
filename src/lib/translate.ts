import { trpc } from "@/providers/trpc";

// In-memory cache for translations
const clientCache = new Map<string, string>();
const MAX_CACHE = 1000;

function cacheKey(text: string, from: string, to: string): string {
  return `${from}|${to}|${text}`;
}

/**
 * Translate text using server-side MyMemory API with client-side cache
 */
export async function translateText(
  text: string,
  from: string = "zh-CN",
  to: string = "en",
): Promise<string> {
  if (!text || text.trim().length === 0) return text;

  const key = cacheKey(text, from, to);
  if (clientCache.has(key)) {
    return clientCache.get(key)!;
  }

  try {
    // Use a direct fetch to avoid tRPC issues during standalone usage
    const response = await fetch("/api/trpc/translate.translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        json: { text: text.trim(), from, to },
      }),
    });

    if (!response.ok) {
      return text;
    }

    const result = (await response.json()) as {
      result?: { data?: { translated?: string } };
    };
    const translated = result.result?.data?.translated || text;

    // Cache the result
    if (clientCache.size > MAX_CACHE) {
      clientCache.clear();
    }
    clientCache.set(key, translated);

    return translated;
  } catch {
    return text;
  }
}

/**
 * Batch translate multiple texts
 */
export async function batchTranslate(
  texts: string[],
  from: string = "zh-CN",
  to: string = "en",
): Promise<string[]> {
  if (texts.length === 0) return [];

  // Check cache first
  const results: (string | null)[] = texts.map((t) => {
    const key = cacheKey(t, from, to);
    return clientCache.has(key) ? clientCache.get(key)! : null;
  });

  // Find texts that need translation
  const needTranslation: { index: number; text: string }[] = [];
  results.forEach((r, i) => {
    if (r === null) needTranslation.push({ index: i, text: texts[i] });
  });

  if (needTranslation.length === 0) {
    return results as string[];
  }

  try {
    const response = await fetch("/api/trpc/translate.batchTranslate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        json: {
          texts: needTranslation.map((n) => n.text),
          from,
          to,
        },
      }),
    });

    if (!response.ok) {
      // Fallback: return originals for uncached items
      needTranslation.forEach((n) => {
        results[n.index] = n.text;
      });
      return results as string[];
    }

    const result = (await response.json()) as {
      result?: { data?: { results?: string[] } };
    };
    const translated = result.result?.data?.results || [];

    // Store results
    needTranslation.forEach((n, i) => {
      const t = translated[i] || n.text;
      results[n.index] = t;
      if (clientCache.size > MAX_CACHE) clientCache.clear();
      clientCache.set(cacheKey(n.text, from, to), t);
    });

    return results as string[];
  } catch {
    needTranslation.forEach((n) => {
      results[n.index] = n.text;
    });
    return results as string[];
  }
}

/**
 * React hook for auto-translating question data
 */
export function useAutoTranslate() {
  const translateMutation = trpc.translate.batchTranslate.useMutation();

  async function translateQuestion(
    question: string,
    options: string[],
  ): Promise<{ enQuestion: string; enOptions: string[] }> {
    const allTexts = [question, ...options];

    try {
      const result = await translateMutation.mutateAsync({
        texts: allTexts,
        from: "zh-CN",
        to: "en",
      });

      const results = result.results;
      return {
        enQuestion: results[0] || question,
        enOptions: results.slice(1),
      };
    } catch {
      return { enQuestion: question, enOptions: options };
    }
  }

  return { translateQuestion, isLoading: translateMutation.isPending };
}

// Check if text looks like Chinese
export function isChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}
