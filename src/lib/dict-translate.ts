// Client-side translation helpers
// When backend translation returns [EN] markers, show original Chinese instead
// Also provides frontend direct MyMemory fallback

export function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

/**
 * Get best available English display for a question
 * Priority: db en > translated cache > original Chinese (no [EN] prefix)
 * When no translation available, shows original Chinese (cleaner UX than [EN] prefix)
 */
export function getEnDisplay(question: string, dbEn?: string, transEn?: string): string {
  if (dbEn && !dbEn.startsWith("[EN]") && !dbEn.startsWith("[翻译失败]")) return dbEn;
  if (transEn && !transEn.startsWith("[EN]") && !transEn.startsWith("[翻译失败]")) return transEn;
  // No translation available — show original Chinese (better than [EN] marker)
  return question;
}

/**
 * Get best available English options
 * When no translation available, returns original Chinese options
 */
export function getEnOptions(options: string[], dbEnOpts?: string[], transEnOpts?: string[]): string[] {
  if (dbEnOpts && dbEnOpts.length === options.length && !dbEnOpts.some(o => o.startsWith("[EN]"))) return dbEnOpts;
  if (transEnOpts && transEnOpts.length === options.length && !transEnOpts.some(o => o.startsWith("[EN]"))) return transEnOpts;
  // No translation — return original Chinese options
  return options;
}

/**
 * Direct MyMemory API call from browser (CORS-enabled)
 * Used as final fallback when backend translation fails
 */
export async function mymemoryTranslate(text: string): Promise<string | null> {
  if (!text || !hasChinese(text)) return text;
  try {
    const resp = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=zh|en`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.responseStatus !== 200) return null;
    const t = data.responseData?.translatedText;
    if (!t || t === text || hasChinese(t)) return null;
    return t;
  } catch {
    return null;
  }
}

/**
 * Batch translate via MyMemory directly from browser
 */
export async function mymemoryBatchTranslate(texts: string[]): Promise<(string | null)[]> {
  const results: (string | null)[] = [];
  for (const text of texts) {
    const r = await mymemoryTranslate(text);
    results.push(r);
    // 300ms delay to respect rate limits
    await new Promise((res) => setTimeout(res, 300));
  }
  return results;
}
