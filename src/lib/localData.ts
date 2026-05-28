// Local data storage for offline mode
const DATA_KEY = "zenith-local-data";
const AUTH_KEY = "zenith-local-auth";
const RECORDS_KEY = "zenith-local-records";

export function getLocalData() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function setLocalData(data: unknown) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

export function getLocalAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function setLocalAuth(user: unknown) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function getLocalRecords(): Array<{
  questionId: number;
  selected: number[];
  isCorrect: boolean;
  chapterId?: number;
}> {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveLocalRecord(
  questionId: number,
  selected: number[],
  isCorrect: boolean,
  chapterId?: number
) {
  const records = getLocalRecords();
  const idx = records.findIndex((r) => r.questionId === questionId);
  const newRecord = { questionId, selected, isCorrect, chapterId };
  if (idx >= 0) {
    records[idx] = newRecord;
  } else {
    records.push(newRecord);
  }
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export function clearLocalRecords() {
  localStorage.removeItem(RECORDS_KEY);
}

export function hasLocalData(): boolean {
  return !!getLocalData();
}
