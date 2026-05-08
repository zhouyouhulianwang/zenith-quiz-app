import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

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
};

const AppContext = createContext<AppContextType>({
  settings: defaultSettings,
  setSettings: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem("zenith-settings");
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const setSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem("zenith-settings", JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AppContext.Provider value={{ settings, setSettings }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppSettings() {
  return useContext(AppContext);
}
