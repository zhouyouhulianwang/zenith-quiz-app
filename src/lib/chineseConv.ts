import s2t from "chinese-s2t";

const cache = new Map<string, string>();

export function toTraditional(simple: string): string {
  if (!simple) return simple;
  if (cache.has(simple)) return cache.get(simple)!;
  const result = s2t.s2t(simple);
  if (cache.size > 5000) cache.clear(); // Prevent memory leak
  cache.set(simple, result);
  return result;
}
