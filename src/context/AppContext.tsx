import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { trpc } from "@/providers/trpc";

export interface Question {
  id: number;
  type: "single" | "multiple" | "boolean" | "fill";
  question: string;
  options: string[];
  correct: number[];
  explanation: string;
  enQuestion?: string;
  enOptions?: string[];
  tcQuestion?: string;
  tcOptions?: string[];
  chapterId?: number;
  chapterName?: string;
}

export interface QuestionBank {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  category: string;
  color: string;
  cover: string | null;
  questionsJson: string;
  progress: number;
  importedAt: Date;
  lastPracticedAt: Date | null;
  questions: Question[];
}

interface AppSettings {
  dailyGoal: number;
  reminderTime: string;
  difficulty: number;
  fontSize: "small" | "medium" | "large";
  questionLanguage: "zh" | "en" | "both" | "tc" | "entc";
  theme: "system" | "dark" | "light";
}

interface AppContextType {
  settings: AppSettings;
  setSettings: (s: Partial<AppSettings>) => void;
}

const defaultSettings: AppSettings = {
  dailyGoal: 20,
  reminderTime: "20:00",
  difficulty: 3,
  fontSize: "medium",
  questionLanguage: "entc",
  theme: "system",
};

const AppContext = createContext<AppContextType>({
  settings: defaultSettings,
  setSettings: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<AppSettings>(() => {
    // Load from localStorage if valid; default is "light" (not "system").
    try {
      const saved = localStorage.getItem("zenith-settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        const validTheme =
          parsed.theme === "dark" || parsed.theme === "light" || parsed.theme === "system"
            ? parsed.theme
            : "light";
        return {
          dailyGoal: parsed.dailyGoal ?? defaultSettings.dailyGoal,
          reminderTime: parsed.reminderTime ?? defaultSettings.reminderTime,
          difficulty: parsed.difficulty ?? defaultSettings.difficulty,
          fontSize: parsed.fontSize ?? defaultSettings.fontSize,
          questionLanguage: parsed.questionLanguage ?? defaultSettings.questionLanguage,
          theme: validTheme,
        };
      }
    } catch { /* ignore */ }
    return defaultSettings;
  });

  // Fetch settings from database (only sync on first load)
  const dbSettings = trpc.settings.get.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const hasSyncedDb = useRef(false);

  // Sync DB settings to state ONLY ONCE on initial load
  useEffect(() => {
    if (dbSettings.data && !hasSyncedDb.current) {
      hasSyncedDb.current = true;
      setSettingsState((prev) => {
        // Only sync fields that haven't been set locally
        const merged = { ...dbSettings.data, ...prev };
        localStorage.setItem("zenith-settings", JSON.stringify(merged));
        return merged;
      });
    }
  }, [dbSettings.data]);

  const updateDbSettings = trpc.settings.update.useMutation();

  const setSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem("zenith-settings", JSON.stringify(next));
      // Also sync to database (fire and forget, will retry on next login if fails)
      try {
        updateDbSettings.mutate(partial);
      } catch { /* ignore DB errors */ }
      return next;
    });
  }, [updateDbSettings]);

  return (
    <AppContext.Provider value={{ settings, setSettings }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppSettings() {
  return useContext(AppContext);
}
