/**
 * Pure frontend API - no backend required
 * All data stored in localStorage or imported from static JSON
 */
import appData from "@/data/appData.json";

// ---------- Types ----------
export interface Q {
  id: number;
  question: string;
  options: string[];
  correct: number[];
  chapterId: number;
  chapterName: string;
  explanation?: string;
  enQuestion?: string;
  enOptions?: string[];
  tcQuestion?: string;
  tcOptions?: string[];
}

export interface Bank {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  color: string | null;
  questions: Q[];
  chapters: { chapterId: number; chapterName: string; questionCount: number }[];
}

export interface MockExam {
  id: number;
  title: string;
  questions: Q[];
}

export interface PracticeRecord {
  questionId: number;
  bankId: number;
  chapterId: number;
  chapterName: string;
  selected: number[];
  isCorrect: boolean;
  timeSpent: number;
  createdAt: string;
}

export interface User {
  id: number;
  username: string;
  name: string;
  role?: string;
  email?: string;
  avatar?: string;
  createdAt?: string;
}

// ---------- Constants ----------
const AUTH_KEY = "zenith-auth-user";
const RECORDS_KEY = "zenith-practice-records";
const SETTINGS_KEY = "zenith-settings";
const DAILY_KEY = "zenith-daily-stats";

// ---------- Auth ----------
export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function loginUser(username: string, password: string): { success: boolean; user?: User; error?: string } {
  const user = appData.users.find(
    (u) => u.username === username && (u as any).password === password
  );
  if (user) {
    const { password: _, ...safeUser } = user as any;
    localStorage.setItem(AUTH_KEY, JSON.stringify(safeUser));
    return { success: true, user: safeUser };
  }
  return { success: false, error: "账号或密码错误" };
}

export function logoutUser() {
  localStorage.removeItem(AUTH_KEY);
}

// ---------- Banks ----------
export function getBanks(): Bank[] {
  return appData.banks as Bank[];
}

export function getBank(id: number): Bank | undefined {
  return getBanks().find((b) => b.id === id);
}

// ---------- Mock Exams ----------
export function getMockExams(): MockExam[] {
  return appData.mockExams as MockExam[];
}

export function getMockExam(id: number): MockExam | undefined {
  return getMockExams().find((m) => m.id === id);
}

// ---------- Practice Records ----------
export function getPracticeRecords(bankId?: number): PracticeRecord[] {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    const records: PracticeRecord[] = raw ? JSON.parse(raw) : [];
    if (bankId !== undefined) {
      return records.filter((r) => r.bankId === bankId);
    }
    return records;
  } catch {
    return [];
  }
}

export function savePracticeRecord(record: PracticeRecord) {
  const records = getPracticeRecords();
  const idx = records.findIndex(
    (r) => r.questionId === record.questionId && r.bankId === record.bankId
  );
  if (idx >= 0) {
    records[idx] = { ...records[idx], ...record, createdAt: new Date().toISOString() };
  } else {
    records.push({ ...record, createdAt: new Date().toISOString() });
  }
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

// ---------- Stats ----------
export function getDailyStats(): { date: string; count: number; correct: number }[] {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function updateDailyStats(correct: boolean) {
  const stats = getDailyStats();
  const today = new Date().toISOString().split("T")[0];
  const existing = stats.find((s) => s.date === today);
  if (existing) {
    existing.count += 1;
    if (correct) existing.correct += 1;
  } else {
    stats.push({ date: today, count: 1, correct: correct ? 1 : 0 });
  }
  localStorage.setItem(DAILY_KEY, JSON.stringify(stats.slice(-30)));
}

export function getStreakDays(): number {
  const stats = getDailyStats();
  if (stats.length === 0) return 0;
  
  const dates = stats.map((s) => s.date).sort().reverse();
  let streak = 0;
  let checkDate = new Date();
  
  for (const dateStr of dates) {
    const expected = checkDate.toISOString().split("T")[0];
    if (dateStr === expected) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (dateStr < expected) {
      break;
    }
  }
  return streak;
}

export function getTotalStats() {
  const records = getPracticeRecords();
  const correct = records.filter((r) => r.isCorrect).length;
  return {
    totalQuestions: records.length,
    correct,
    accuracy: records.length > 0 ? Math.round((correct / records.length) * 100) : 0,
  };
}

// ---------- Settings ----------
export function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    dailyGoal: 20,
    questionLanguage: "entc" as "en" | "tc" | "sc" | "entc",
    theme: "system" as "light" | "dark" | "system",
    fontSize: "medium" as "small" | "medium" | "large",
  };
}

export function saveSettings(settings: any) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...getSettings(), ...settings }));
}

// ---------- Chapter progress ----------
export function getChapterProgress(bankId: number, chapterId: number) {
  const records = getPracticeRecords(bankId).filter((r) => r.chapterId === chapterId);
  const correct = records.filter((r) => r.isCorrect).length;
  return { total: records.length, correct, wrong: records.length - correct };
}

// ---------- Mock exam shuffle ----------
export function shuffleQuestions(questions: Q[], count: number): Q[] {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
