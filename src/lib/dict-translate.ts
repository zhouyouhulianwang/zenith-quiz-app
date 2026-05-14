// Client-side translation helpers
// Note: We intentionally do NOT do word-by-word dictionary replacement here
// because it creates mixed Chinese-English text. Instead, when APIs fail,
// we call the backend LLM endpoint for whole-sentence translation.

export function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

/**
 * Get best available English display for a question
 * Priority: db en > translated cache > [EN] original (LLM will translate in background)
 */
export function getEnDisplay(question: string, dbEn?: string, transEn?: string): string {
  if (dbEn && !dbEn.startsWith("[EN]") && !dbEn.startsWith("[翻译失败]")) return dbEn;
  if (transEn && !transEn.startsWith("[EN]") && !transEn.startsWith("[翻译失败]")) return transEn;
  return `[EN] ${question}`;
}

/**
 * Get best available English options
 */
export function getEnOptions(options: string[], dbEnOpts?: string[], transEnOpts?: string[]): string[] {
  if (dbEnOpts && dbEnOpts.length === options.length && !dbEnOpts.some(o => o.startsWith("[EN]"))) return dbEnOpts;
  if (transEnOpts && transEnOpts.length === options.length && !transEnOpts.some(o => o.startsWith("[EN]"))) return transEnOpts;
  return options.map(o => `[EN] ${o}`);
}
