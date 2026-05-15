import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, ChevronLeft, ChevronRight, Flag, GraduationCap, Check, X, AlertCircle, Languages, Globe } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { toTraditional } from "@/lib/chineseConv";
import { isChinese } from "@/lib/translate";
import { getEnDisplay, getEnOptions, mymemoryBatchTranslate } from "@/lib/dict-translate";
import ParticleBackground from "@/components/ParticleBackground";

interface Q {
  id: number;
  type: string;
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

interface ExamAnswer {
  selected: number[];
  flagged: boolean;
}

type LangMode = "en" | "tc" | "sc" | "entc";

const LANG_LABELS: Record<LangMode, string> = {
  en: "EN",
  tc: "繁體",
  sc: "简体",
  entc: "EN+繁",
};

export default function MockExamPracticePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const mockExamId = Number(searchParams.get("mockExamId"));
  const locationState = location.state as { questions?: any[]; title?: string; bankId?: number } | null;
  const bankId = locationState?.bankId;

  // Page-level language switch, default entc
  const [langMode, setLangMode] = useState<LangMode>("entc");
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Always call hooks at top level
  const { data: mockExam } = trpc.mockExam.list.useQuery();
  const currentMock = mockExam?.find((m) => m.id === mockExamId);
  const mockTitle = locationState?.title || currentMock?.title || "模拟练习";
  const incrementMutation = trpc.mockExam.incrementPracticed.useMutation();
  const addRecord = trpc.record.add.useMutation();
  const upsertDaily = trpc.record.upsertDaily.useMutation();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<ExamAnswer[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [expandedExplanation, setExpandedExplanation] = useState<number | null>(null);
  const [loadError, setLoadError] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);
  // Track which questions have been saved to DB (avoid duplicate saves)
  const savedQuestionIds = useRef<Set<number>>(new Set());

  // Translation cache for auto-translated questions
  const [transCache, setTransCache] = useState<Record<number, { enQuestion: string; enOptions: string[] }>>({});
  const [translatingIds, setTranslatingIds] = useState<Set<number>>(new Set());
  const translateMutation = trpc.translate.batchTranslate.useMutation();

  // Load questions from API
  const questions: Q[] = useMemo(() => {
    if (currentMock?.questionsJson) {
      try {
        const parsed = JSON.parse(currentMock.questionsJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // ignore
      }
    }
    return [];
  }, [currentMock?.questionsJson]);

  // Auto-translate questions that don't have EN data
  // Also save translated text back to DB for future use
  const updateQuestionsMutation = trpc.mockExam.updateQuestions.useMutation();

  useEffect(() => {
    if (langMode !== "entc" && langMode !== "en") return;

    const needsTranslation = questions.filter((q) => {
      if (!isChinese(q.question)) return false; // Not Chinese, no need to translate
      if (q.enQuestion && !isChinese(q.enQuestion)) return false; // Already has valid EN in DB
      if (transCache[q.id]) return false; // Already translated in this session
      if (translatingIds.has(q.id)) return false; // Currently translating
      return true;
    });

    if (needsTranslation.length === 0) return;

    // Use larger batch size since dictionary translation is fast and offline
    const batchSize = 10;
    for (let i = 0; i < needsTranslation.length; i += batchSize) {
      const batch = needsTranslation.slice(i, i + batchSize);
      const ids = batch.map((q) => q.id);
      const texts = batch.flatMap((q) => [q.question, ...q.options]);

      setTranslatingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });

      translateMutation
        .mutateAsync({ texts, from: "zh-CN", to: "en" })
        .then(async (result) => {
          const results = result.results;
          // Check if any results still have [EN] markers — if so, call MyMemory directly
          const hasUntranslated = results.some((r) => r?.startsWith("[EN]"));
          let finalResults = results;
          if (hasUntranslated) {
            try {
              const memResults = await mymemoryBatchTranslate(texts);
              finalResults = memResults.map((r, i) => (r !== null ? r : results[i]));
            } catch { /* keep original results */ }
          }

          const newTransCache: Record<number, { enQuestion: string; enOptions: string[] }> = {};
          let idx = 0;
          batch.forEach((q) => {
            const optCount = q.options.length;
            const enQuestion = finalResults[idx] || q.question;
            const enOptions = finalResults.slice(idx + 1, idx + 1 + optCount);
            while (enOptions.length < optCount) {
              enOptions.push("[EN] " + q.options[enOptions.length]);
            }
            newTransCache[q.id] = { enQuestion, enOptions };
            q.enQuestion = enQuestion;
            q.enOptions = enOptions;
            q.tcQuestion = toTrad(q.question);
            q.tcOptions = q.options.map((o: string) => toTrad(o));
            idx += 1 + optCount;
          });

          setTransCache((prev) => ({ ...prev, ...newTransCache }));

          if (currentMock && batch.length > 0) {
            const updatedQuestions = questions.map((q: Q) => {
              if (newTransCache[q.id]) {
                return { ...q, ...newTransCache[q.id], tcQuestion: toTrad(q.question), tcOptions: q.options.map((o: string) => toTrad(o)) };
              }
              return q;
            });
            updateQuestionsMutation.mutate({
              id: currentMock.id,
              questionsJson: JSON.stringify(updatedQuestions),
            });
          }
        })
        .catch(async () => {
          // Backend failed — try MyMemory directly from frontend
          try {
            const memResults = await mymemoryBatchTranslate(texts);
            const newTransCache: Record<number, { enQuestion: string; enOptions: string[] }> = {};
            let idx = 0;
            batch.forEach((q) => {
              const optCount = q.options.length;
              const enQuestion = memResults[idx] || `[EN] ${q.question}`;
              const enOptions = memResults.slice(idx + 1, idx + 1 + optCount).map((o) => o || "");
              while (enOptions.length < optCount) enOptions.push(`[EN] ${q.options[enOptions.length]}`);
              newTransCache[q.id] = { enQuestion: enQuestion.startsWith("[EN]") ? `[EN] ${q.question}` : enQuestion, enOptions: enOptions.map((o) => o?.startsWith("[EN]") ? `[EN] ${q.options[enOptions.indexOf(o)]}` : o || `[EN] ${q.options[enOptions.indexOf(o) || 0]}`) };
              idx += 1 + optCount;
            });
            setTransCache((prev) => ({ ...prev, ...newTransCache }));
          } catch {
            setTransCache((prev) => {
              const next = { ...prev };
              batch.forEach((q) => { next[q.id] = { enQuestion: `[EN] ${q.question}`, enOptions: q.options.map((o) => `[EN] ${o}`) }; });
              return next;
            });
          }
        })
        .finally(() => {
          setTranslatingIds((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.delete(id));
            return next;
          });
        });
    }
  }, [questions, langMode, transCache, translatingIds, currentMock]);



  // Set load error in useEffect (not during render)
  useEffect(() => {
    if (questions.length > 0) {
      setLoadError("");
    } else if (currentMock?.questionsJson) {
      setLoadError("API有数据但题目为空或解析失败");
    } else {
      setLoadError("未找到题目数据");
    }
  }, [questions.length, currentMock?.questionsJson]);

  const totalQuestions = questions.length;

  // Initialize answers
  useEffect(() => {
    if (questions.length > 0 && answers.length === 0) {
      setAnswers(
        questions.map(() => ({
          selected: [],
          flagged: false,
        })),
      );
    }
  }, [questions, answers.length]);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentIndex];

  const answeredCount = answers.filter((a) => a && a.selected && a.selected.length > 0).length;

  // Helper: save a single question record to DB
  const saveQuestionRecord = useCallback((q: Q, ans: ExamAnswer) => {
    if (!q || ans.selected.length === 0) return;
    if (savedQuestionIds.current.has(q.id)) return; // Already saved
    const isCorrect = q.correct.length === ans.selected.length && q.correct.every((c) => ans.selected.includes(c));
    savedQuestionIds.current.add(q.id);
    addRecord.mutate({
      mockExamId: mockExamId || undefined,
      bankId: bankId || undefined,
      questionId: q.id,
      chapterId: q.chapterId,
      chapterName: q.chapterName,
      selected: ans.selected,
      isCorrect,
      timeSpent: 0,
    });
  }, [mockExamId, bankId, addRecord]);

  const handleSelect = useCallback(
    (index: number) => {
      if (!currentQuestion || submitted) return;
      setAnswers((prev) => {
        if (!prev || prev.length <= currentIndex) return prev;
        const next = [...prev];
        const currentAns = next[currentIndex] || { selected: [], flagged: false };
        if (currentQuestion.type === "multiple") {
          const s = currentAns.selected;
          next[currentIndex] = {
            ...currentAns,
            selected: s.includes(index) ? s.filter((i) => i !== index) : [...s, index],
          };
        } else {
          next[currentIndex] = { ...currentAns, selected: [index] };
        }
        return next;
      });
      // For single-choice: save immediately after selection
      if (currentQuestion.type !== "multiple" && currentAnswer) {
        saveQuestionRecord(currentQuestion, { ...currentAnswer, selected: [index] });
      }
    },
    [currentQuestion, currentIndex, submitted, currentAnswer, saveQuestionRecord],
  );

  const handleNext = useCallback(() => {
    // Auto-save multi-select before navigating away
    if (currentQuestion && currentAnswer && currentQuestion.type === "multiple" && currentAnswer.selected.length > 0) {
      saveQuestionRecord(currentQuestion, currentAnswer);
    }
    if (currentIndex < totalQuestions - 1) setCurrentIndex((p) => p + 1);
  }, [currentIndex, totalQuestions, currentQuestion, currentAnswer, saveQuestionRecord]);

  const handlePrev = useCallback(() => {
    // Auto-save multi-select before navigating away
    if (currentQuestion && currentAnswer && currentQuestion.type === "multiple" && currentAnswer.selected.length > 0) {
      saveQuestionRecord(currentQuestion, currentAnswer);
    }
    if (currentIndex > 0) setCurrentIndex((p) => p - 1);
  }, [currentIndex, currentQuestion, currentAnswer, saveQuestionRecord]);

  const toggleFlag = useCallback(() => {
    if (submitted) return;
    setAnswers((prev) => {
      if (!prev || prev.length <= currentIndex) return prev;
      const next = [...prev];
      next[currentIndex] = { ...next[currentIndex], flagged: !next[currentIndex].flagged };
      return next;
    });
  }, [currentIndex, submitted]);

  const handleSubmit = useCallback(() => {
    setSubmitted(true);
    setShowSubmitConfirm(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (mockExamId) incrementMutation.mutate({ id: mockExamId });

    // Save any remaining unsaved questions
    let correctCount = 0;
    questions.forEach((q, i) => {
      const ans = answers[i];
      if (!ans || ans.selected.length === 0) return;
      const isCorrect = q.correct.length === ans.selected.length && q.correct.every((c) => ans.selected.includes(c));
      if (isCorrect) correctCount++;
      if (!savedQuestionIds.current.has(q.id)) {
        savedQuestionIds.current.add(q.id);
        addRecord.mutate({
          mockExamId: mockExamId || undefined,
          bankId: bankId || undefined,
          questionId: q.id,
          chapterId: q.chapterId,
          chapterName: q.chapterName,
          selected: ans.selected,
          isCorrect,
          timeSpent: 0,
        });
      }
    });

    // Update daily stats
    const answered = answers.filter((a) => a && a.selected.length > 0);
    if (answered.length > 0) {
      upsertDaily.mutate({
        date: new Date().toISOString().split("T")[0],
        count: answered.length,
        correct: correctCount,
      });
    }
  }, [mockExamId, incrementMutation, questions, answers, addRecord, upsertDaily, bankId]);

  const touchStartX = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].screenX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0) handleNext();
      else handlePrev();
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const isCorrect = (q: Q, ans: ExamAnswer) => {
    if (!q || !ans || !q.correct || !ans.selected) return false;
    return q.correct.length === ans.selected.length && q.correct.every((c) => ans.selected.includes(c));
  };

  // Helper for traditional conversion
  const toTrad = useCallback((text: string) => {
    try { return toTraditional(text); } catch { return text; }
  }, []);

  // Get auto-translated text if available
  const autoTrans = currentQuestion ? transCache[currentQuestion.id] : null;
  const isTransPending = currentQuestion ? translatingIds.has(currentQuestion.id) : false;

  // Compute display text based on langMode
  let displayQuestion = "";
  let displayOptions: string[] = [];
  let subQuestion = "";
  let subOptions: string[] | undefined;

  if (currentQuestion) {
    // Build effective EN text using client-side dictionary as ultimate fallback
    const enQ = getEnDisplay(currentQuestion.question, currentQuestion.enQuestion, autoTrans?.enQuestion);
    const enO = getEnOptions(currentQuestion.options, currentQuestion.enOptions, autoTrans?.enOptions);

    switch (langMode) {
      case "en":
        displayQuestion = enQ;
        displayOptions = enO;
        break;
      case "tc":
        displayQuestion = currentQuestion.tcQuestion || toTrad(currentQuestion.question || "");
        displayOptions = currentQuestion.tcOptions || currentQuestion.options?.map((o) => toTrad(o)) || [];
        break;
      case "sc":
        displayQuestion = currentQuestion.question || "";
        displayOptions = currentQuestion.options || [];
        break;
      case "entc": {
        // EN+繁: EN primary, TC sub-line
        displayQuestion = enQ;
        displayOptions = enO;
        // TC always shows as sub-line (local conversion, no API needed)
        subQuestion = currentQuestion.tcQuestion || toTrad(currentQuestion.question || "");
        subOptions = currentQuestion.tcOptions || currentQuestion.options?.map((o) => toTrad(o));
        break;
      }
    }
  }

  // ===== ERROR STATES =====
  if (totalQuestions === 0) {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--page-bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <AlertCircle size={48} color="#ef4444" />
        <p style={{ color: "#ef4444", fontSize: "16px", fontWeight: 600, marginTop: "16px" }}>试卷加载失败</p>
        {loadError && <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "8px", textAlign: "center" }}>{loadError}</p>}
        <p style={{ color: "var(--text-tertiary)", fontSize: "12px", marginTop: "12px", textAlign: "center" }}>
          mockExamId: {mockExamId} | state: {locationState ? "有" : "无"} | API: {currentMock ? "有" : "无"} | 题目数: {questions.length}
        </p>
        <button onClick={() => navigate("/mock-exam/list")} style={{ marginTop: "20px", padding: "12px 24px", borderRadius: "12px", background: "var(--accent-color)", color: "#fff", border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
          返回列表
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: "var(--page-bg)", overflow: "hidden" }}>
      <ParticleBackground />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100dvh" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border-color)", flexShrink: 0 }}>
          <button onClick={() => navigate("/mock-exam/list")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
            <ArrowLeft size={20} color="var(--text-primary)" />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
            <Clock size={14} color="var(--accent-color)" />
            {formatTime(elapsed)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Language Switch */}
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowLangMenu(!showLangMenu)} style={{ background: "var(--card-bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "4px 10px", fontSize: "12px", fontWeight: 600, color: "var(--accent-color)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                <Languages size={12} />
                {LANG_LABELS[langMode]}
              </button>
              {showLangMenu && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} style={{ position: "absolute", top: "32px", right: 0, background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "4px", zIndex: 50, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", minWidth: "80px" }}>
                  {(Object.keys(LANG_LABELS) as LangMode[]).map((mode) => (
                    <button key={mode} onClick={() => { setLangMode(mode); setShowLangMenu(false); }} style={{ width: "100%", padding: "6px 12px", borderRadius: "6px", background: langMode === mode ? "var(--accent-color)" : "transparent", color: langMode === mode ? "#fff" : "var(--text-primary)", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
                      {LANG_LABELS[mode]}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
            {!submitted && (
              <button onClick={toggleFlag} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
                <Flag size={18} color={currentAnswer?.flagged ? "#f59e0b" : "var(--text-tertiary)"} />
              </button>
            )}
            <button onClick={() => setShowNav(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
              {currentIndex + 1}/{totalQuestions}
            </button>
          </div>
        </div>

        {/* Question Area */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px", WebkitOverflowScrolling: "touch" }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <motion.div key={currentIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            {/* Progress */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <div style={{ flex: 1, height: "4px", background: "var(--card-bg-secondary)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%`, height: "100%", background: submitted ? (isCorrect(currentQuestion, currentAnswer || { selected: [], flagged: false }) ? "#10b981" : "#ef4444") : "var(--accent-color)", borderRadius: "2px", transition: "width 0.3s" }} />
              </div>
            </div>

            {/* Title */}
            <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "10px", textAlign: "center" }}>{mockTitle}</div>

            {/* Question Text */}
            <div style={{ background: "var(--card-bg)", borderRadius: "16px", padding: "20px", border: "1px solid var(--border-color)", marginBottom: "16px" }}>
              {currentQuestion?.chapterName && (
                <span style={{ display: "inline-block", fontSize: "11px", fontWeight: 600, color: "var(--accent-color)", background: "var(--accent-glow)", padding: "2px 10px", borderRadius: "6px", marginBottom: "10px" }}>{currentQuestion.chapterName}</span>
              )}
              {displayQuestion ? (
                <div style={{ fontSize: "17px", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.6, userSelect: "text", WebkitUserSelect: "text" }}>
                  {currentIndex + 1}. {displayQuestion}
                </div>
              ) : (
                <div style={{ fontSize: "17px", color: "#ef4444", lineHeight: 1.6 }}>题目内容缺失（id: {currentQuestion?.id}）</div>
              )}
              {langMode === "entc" && subQuestion && (
                <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--border-color)", fontSize: "16px", color: "var(--text-primary)", lineHeight: 1.6, userSelect: "text", WebkitUserSelect: "text" }}>
                  {subQuestion}
                </div>
              )}
            </div>

            {/* Translation indicator */}
            {isTransPending && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px", padding: "6px 12px", background: "rgba(0,212,255,0.08)", borderRadius: "8px", fontSize: "12px", color: "var(--accent-color)" }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                  <Globe size={14} />
                </motion.div>
                <span>正在自动翻译为英文...</span>
              </motion.div>
            )}

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {displayOptions.length === 0 && currentQuestion && (
                <div style={{ textAlign: "center", padding: "20px", color: "#ef4444", fontSize: "14px", background: "rgba(239,68,68,0.05)", borderRadius: "12px" }}>选项缺失（id: {currentQuestion.id}）</div>
              )}
              {displayOptions.map((opt, index) => {
                const isSelected = currentAnswer?.selected?.includes(index) || false;
                const isCorrectOption = currentQuestion?.correct?.includes(index) || false;
                let bgColor = "var(--card-bg)";
                let borderColor = isSelected ? "var(--accent-color)" : "var(--border-color)";
                let textColor = "var(--text-primary)";
                let circleBg = isSelected ? "var(--accent-color)" : "var(--card-bg-secondary)";
                let circleColor = isSelected ? "#fff" : "var(--text-tertiary)";

                if (submitted) {
                  if (isCorrectOption) { bgColor = "rgba(16,185,129,0.1)"; borderColor = "#10b981"; textColor = "#10b981"; circleBg = "#10b981"; circleColor = "#fff"; }
                  else if (isSelected && !isCorrectOption) { bgColor = "rgba(239,68,68,0.1)"; borderColor = "#ef4444"; textColor = "#ef4444"; circleBg = "#ef4444"; circleColor = "#fff"; }
                  else { bgColor = "var(--card-bg)"; borderColor = "var(--border-color)"; textColor = "var(--text-secondary)"; circleBg = "var(--card-bg-secondary)"; circleColor = "var(--text-tertiary)"; }
                }

                return (
                  <motion.button key={index} whileTap={submitted ? {} : { scale: 0.98 }} onClick={() => handleSelect(index)}
                    style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", background: bgColor, border: `1px solid ${borderColor}`, color: textColor, fontSize: "15px", lineHeight: 1.5, textAlign: "left", cursor: submitted ? "default" : "pointer", display: "flex", alignItems: "flex-start", gap: "10px", WebkitTapHighlightColor: "transparent" }}>
                    <span style={{ flexShrink: 0, width: "26px", height: "26px", borderRadius: "50%", background: circleBg, color: circleColor, border: `1px solid ${borderColor}`, fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {submitted && isCorrectOption ? <Check size={14} /> : submitted && isSelected && !isCorrectOption ? <X size={14} /> : String.fromCharCode(65 + index)}
                    </span>
                    <span style={{ flex: 1 }}>
                      {opt || `选项${String.fromCharCode(65 + index)}`}
                      {langMode === "entc" && subOptions?.[index] && (
                        <span style={{ display: "block", marginTop: "4px", fontSize: "14px", color: submitted ? (isCorrectOption ? "#10b981" : isSelected ? "#ef4444" : "var(--text-secondary)") : "var(--text-secondary)" }}>{subOptions[index]}</span>
                      )}
                    </span>
                    {submitted && isCorrectOption && <Check size={16} color="#10b981" style={{ flexShrink: 0 }} />}
                    {submitted && isSelected && !isCorrectOption && <X size={16} color="#ef4444" style={{ flexShrink: 0 }} />}
                  </motion.button>
                );
              })}
            </div>

            {/* Explanation */}
            {submitted && currentQuestion && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: "16px" }}>
                <button onClick={() => setExpandedExplanation(expandedExplanation === currentIndex ? null : currentIndex)}
                  style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", background: "var(--card-bg)", border: "1px solid var(--border-color)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: isCorrect(currentQuestion, currentAnswer || { selected: [], flagged: false }) ? "#10b981" : "#ef4444" }}>
                    {isCorrect(currentQuestion, currentAnswer || { selected: [], flagged: false }) ? "回答正确 ✓" : "回答错误 ✗"}
                    {currentQuestion.explanation ? " — 查看解析" : ""}
                  </span>
                </button>
                {expandedExplanation === currentIndex && currentQuestion.explanation && (
                  <div style={{ padding: "12px 16px", background: "var(--card-bg-secondary)", borderRadius: "0 0 12px 12px", border: "1px solid var(--border-color)", borderTop: "none" }}>
                    <div style={{ fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.6 }}>
                      <strong style={{ color: "var(--text-secondary)" }}>正确答案：</strong>{(currentQuestion.correct || []).map((c) => String.fromCharCode(65 + c)).join(", ")}
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6, marginTop: "8px" }}>{currentQuestion.explanation}</div>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Bottom Navigation - always visible */}
        <div style={{ flexShrink: 0, padding: "12px 16px", borderTop: "1px solid var(--border-color)", background: "var(--nav-bg)", backdropFilter: "blur(20px)", zIndex: 50, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <button onClick={handlePrev} disabled={currentIndex === 0}
              style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "10px", cursor: currentIndex === 0 ? "not-allowed" : "pointer", opacity: currentIndex === 0 ? 0.4 : 1, display: "flex", alignItems: "center", gap: "4px", color: "var(--text-primary)" }}>
              <ChevronLeft size={16} /> 上一题
            </button>
            {!submitted ? (
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowSubmitConfirm(true)}
                style={{ flex: 1, padding: "12px", borderRadius: "12px", background: answeredCount === totalQuestions ? "#f59e0b" : "var(--accent-color)", color: "#fff", border: "none", fontSize: "14px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <GraduationCap size={18} /> 提交 ({answeredCount}/{totalQuestions})
              </motion.button>
            ) : (
              <button onClick={() => navigate("/mock-exam/list")}
                style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "var(--accent-color)", color: "#fff", border: "none", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>完成</button>
            )}
            <button onClick={handleNext} disabled={currentIndex === totalQuestions - 1}
              style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "10px", cursor: currentIndex === totalQuestions - 1 ? "not-allowed" : "pointer", opacity: currentIndex === totalQuestions - 1 ? 0.4 : 1, display: "flex", alignItems: "center", gap: "4px", color: "var(--text-primary)" }}>
              下一题 <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Question Nav */}
      {showNav && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "flex-end" }} onClick={() => setShowNav(false)}>
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ type: "spring", damping: 25 }}
            style={{ width: "100%", maxHeight: "70vh", background: "var(--card-bg)", borderRadius: "20px 20px 0 0", padding: "20px", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "var(--text-primary)" }}>题目导航</h3>
              <button onClick={() => setShowNav(false)} style={{ background: "none", border: "none", color: "var(--text-tertiary)", fontSize: "14px", cursor: "pointer" }}>关闭</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
              {questions.map((_, i) => {
                const a = answers[i] || { selected: [], flagged: false };
                let bg = i === currentIndex ? "var(--accent-color)" : a.selected.length > 0 ? "var(--accent-color)" : a.flagged ? "#f59e0b" : "var(--card-bg-secondary)";
                let color = i === currentIndex || a.selected.length > 0 ? "#fff" : a.flagged ? "#fff" : "var(--text-primary)";
                if (submitted) { const correct = isCorrect(questions[i], a); bg = i === currentIndex ? (correct ? "#10b981" : "#ef4444") : correct ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"; color = correct ? "#10b981" : "#ef4444"; }
                return <button key={i} onClick={() => { setCurrentIndex(i); setShowNav(false); }} style={{ aspectRatio: "1", borderRadius: "10px", fontSize: "14px", fontWeight: 600, background: bg, color, border: `1px solid ${i === currentIndex ? "transparent" : "var(--border-color)"}`, cursor: "pointer" }}>{i + 1}</button>;
              })}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Submit Confirm */}
      {showSubmitConfirm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 20 }}
            style={{ background: "var(--card-bg)", borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "400px", border: "1px solid var(--border-color)", textAlign: "center" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <GraduationCap size={28} color="#f59e0b" />
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>{answeredCount < totalQuestions ? "提前交卷？" : "确认提交？"}</h2>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: "0 0 20px" }}>
              已答 <strong style={{ color: "var(--accent-color)" }}>{answeredCount}</strong> / {totalQuestions} 题{answeredCount < totalQuestions && `，还有 ${totalQuestions - answeredCount} 题未作答`}
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setShowSubmitConfirm(false)} style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "var(--card-bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>继续答题</button>
              <button onClick={handleSubmit} style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "#f59e0b", color: "#fff", border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>提交</button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Lang menu backdrop */}
      {showLangMenu && <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setShowLangMenu(false)} />}
    </div>
  );
}
