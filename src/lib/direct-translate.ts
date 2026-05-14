// Frontend direct translation using MyMemory API (CORS-enabled)
// Falls back when backend batchTranslate returns [EN] markers

import { hasChinese } from "./dict-translate";

/**
 * Direct call to MyMemory translation API from frontend
 * No backend proxy needed — MyMemory supports CORS
 */
export async function mymemoryTranslate(text: string): Promise<string | null> {
  if (!text || !hasChinese(text)) return text;
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=zh|en`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
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

/**
 * Batch translate using MyMemory directly from frontend
 * @param texts Array of Chinese texts to translate
 * @returns Array of translated texts (null = failed)
 */
export async function mymemoryBatchTranslate(texts: string[]): Promise<(string | null)[]> {
  const results: (string | null)[] = [];
  for (const text of texts) {
    const result = await mymemoryTranslate(text);
    results.push(result);
    // Small delay to avoid rate limiting
    if (results.length < texts.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  return results;
}
