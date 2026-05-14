import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, ChevronLeft, ChevronRight, Flag, GraduationCap, BookOpen, Languages } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAppSettings } from "@/context/AppContext";
import { toTraditional } from "@/lib/chineseConv";
import { isChinese } from "@/lib/translate";
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

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ExamSessionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings, setSettings } = useAppSettings();

  const bankId = Number(searchParams.get("bankId"));
  const chapterId = searchParams.get("chapterId") ? Number(searchParams.get("chapterId")) : undefined;
  const count = Number(searchParams.get("count")) || 50;

  const { data: bankData } = trpc.bank.get.useQuery({ id: bankId }, { enabled: !!bankId });
  const addRecord = trpc.record.add.useMutation();
  const upsertDaily = trpc.record.upsertDaily.useMutation();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<ExamAnswer[]>([]);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [swipeDir, setSwipeDir] = useState<"left" | "right" | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  // Track which questions have been saved to DB (to avoid duplicate saves)
  const savedQuestionIds = useRef<Set<number>>(new Set());

  // Parse and prepare questions
  const allQuestions: Q[] = useMemo(() => {
    if (!bankData) return [];
    try { return JSON.parse(bankData.questionsJson); } catch { return []; }
  }, [bankData]);

  const questions: Q[] = useMemo(() => {
    let qs = chapterId ? allQuestions.filter((q) => q.chapterId === chapterId) : allQuestions;
    qs = shuffleArray(qs);
    return qs.slice(0, Math.min(count, qs.length));
  }, [allQuestions, chapterId, count]);

  // Auto-translation for EN/EN+繁 modes
  const [transCache, setTransCache] = useState<Record<number, { enQuestion: string; enOptions: string[] }>>({});
  const translateMutation = trpc.translate.batchTranslate.useMutation();
  const updateBankMutation = trpc.bank.updateQuestions.useMutation();

  useEffect(() => {
    if (lang !== "entc" && lang !== "en") return;
    if (!bankData) return;

    const needsTranslation = questions.filter((q) => {
      if (!isChinese(q.question)) return false;
      if (q.enQuestion && !isChinese(q.enQuestion)) return false;
      if (transCache[q.id]) return false;
      return true;
    });

    if (needsTranslation.length === 0) return;

    const batchSize = 10;
    for (let i = 0; i < needsTranslation.length; i += batchSize) {
      const batch = needsTranslation.slice(i, i + batchSize);
      const texts = batch.flatMap((q) => [q.question, ...q.options]);

      translateMutation
        .mutateAsync({ texts, from: "zh-CN", to: "en" })
        .then((result) => {
          const results = result.results;
          const newTransCache: Record<number, { enQuestion: string; enOptions: string[] }> = {};
          let idx = 0;
          batch.forEach((q) => {
            const optCount = q.options.length;
            const enQuestion = results[idx] || q.question;
            const enOptions = results.slice(idx + 1, idx + 1 + optCount);
            while (enOptions.length < optCount) {
              enOptions.push("[EN] " + q.options[enOptions.length]);
            }
            newTransCache[q.id] = { enQuestion, enOptions };
            (q as any).enQuestion = enQuestion;
            (q as any).enOptions = enOptions;
            (q as any).tcQuestion = toTraditional(q.question);
            (q as any).tcOptions = q.options.map((o: string) => toTraditional(o));
            idx += 1 + optCount;
          });
          setTransCache((prev) => ({ ...prev, ...newTransCache }));

          if (bankData && batch.length > 0) {
            const allQs = JSON.parse(bankData.questionsJson);
            const updatedQs = allQs.map((q: any) => {
              if (newTransCache[q.id]) {
                return { ...q, ...newTransCache[q.id], tcQuestion: toTraditional(q.question), tcOptions: q.options.map((o: string) => toTraditional(o)) };
              }
              return q;
            });
            updateBankMutation.mutate({ id: bankId, questionsJson: JSON.stringify(updatedQs) });
          }
        })
        .catch(() => { /* ignore */ });
    }
  }, [questions, lang, transCache, bankData, bankId]);

  // Initialize answers
  useEffect(() => {
    if (questions.length > 0 && answers.length === 0) {
      setAnswers(questions.map(() => ({ selected: [], flagged: false })));
    }
  }, [questions.length]);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentIndex];

  const answeredCount = answers.filter((a) => a.selected.length > 0).length;
  const flaggedCount = answers.filter((a) => a.flagged).length;
  const totalQuestions = questions.length;

  // Helper: save a single question record to DB
  const saveQuestionRecord = useCallback((q: Q, ans: ExamAnswer) => {
    if (!q || ans.selected.length === 0) return;
    if (savedQuestionIds.current.has(q.id)) return; // Already saved
    const isCorrect = q.correct.length === ans.selected.length && q.correct.every((c) => ans.selected.includes(c));
    savedQuestionIds.current.add(q.id);
    addRecord.mutate({
      bankId: bankId || undefined,
      questionId: q.id,
      chapterId: q.chapterId,
      chapterName: q.chapterName,
      selected: ans.selected,
      isCorrect,
      timeSpent: 0,
    });
  }, [bankId, addRecord]);

  const handleSelect = useCallback((index: number) => {
    if (!currentQuestion || !currentAnswer) return;
    setAnswers((prev) => {
      const next = [...prev];
      if (currentQuestion.type === "multiple") {
        const s = next[currentIndex].selected;
        next[currentIndex] = { ...next[currentIndex], selected: s.includes(index) ? s.filter((i) => i !== index) : [...s, index] };
      } else {
        next[currentIndex] = { ...next[currentIndex], selected: [index] };
      }
      return next;
    });
    // For single-choice: save immediately after selection
    if (currentQuestion.type !== "multiple") {
      saveQuestionRecord(currentQuestion, { ...currentAnswer, selected: [index] });
    }
  }, [currentQuestion, currentAnswer, currentIndex, saveQuestionRecord]);

  const handleNext = useCallback(() => {
    // Auto-save multi-select before navigating away
    if (currentQuestion && currentAnswer && currentQuestion.type === "multiple" && currentAnswer.selected.length > 0) {
      saveQuestionRecord(currentQuestion, currentAnswer);
    }
    if (currentIndex < totalQuestions - 1) {
      setSwipeDir("left");
      setCurrentIndex((p) => p + 1);
    }
  }, [currentIndex, totalQuestions, currentQuestion, currentAnswer, saveQuestionRecord]);

  const handlePrev = useCallback(() => {
    // Auto-save multi-select before navigating away
    if (currentQuestion && currentAnswer && currentQuestion.type === "multiple" && currentAnswer.selected.length > 0) {
      saveQuestionRecord(currentQuestion, currentAnswer);
    }
    if (currentIndex > 0) {
      setSwipeDir("right");
      setCurrentIndex((p) => p - 1);
    }
  }, [currentIndex, currentQuestion, currentAnswer, saveQuestionRecord]);

  const toggleFlag = useCallback(() => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = { ...next[currentIndex], flagged: !next[currentIndex].flagged };
      return next;
    });
  }, [currentIndex]);

  const handleSubmit = useCallback(() => {
    // Calculate results
    const results = questions.map((q, i) => {
      const ans = answers[i];
      const isCorrect = q.correct.length === ans.selected.length && q.correct.every((c) => ans.selected.includes(c));
      return { questionId: q.id, selected: ans.selected, isCorrect, chapterId: q.chapterId, chapterName: q.chapterName };
    });

    const correctCount = results.filter((r) => r.isCorrect).length;
    const score = Math.round((correctCount / totalQuestions) * 100);

    // Save any remaining unsaved questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const ans = answers[i];
      if (ans.selected.length > 0 && !savedQuestionIds.current.has(q.id)) {
        saveQuestionRecord(q, ans);
      }
    }

    // Update daily stats
    const answeredCount = results.filter((r) => r.selected.length > 0).length;
    if (answeredCount > 0) {
      upsertDaily.mutate({
        date: new Date().toISOString().split("T")[0],
        count: answeredCount,
        correct: correctCount,
      });
    }

    // Navigate to result
    navigate(`/exam/result?score=${score}&correct=${correctCount}&total=${totalQuestions}&time=${elapsed}&bankId=${bankId}`, {
      state: { questions, answers: results },
    });
  }, [questions, answers, totalQuestions, elapsed, bankId, navigate, saveQuestionRecord, upsertDaily]);

  // Swipe
  const touchStartX = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.changedTouches[0].screenX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].screenX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0) handleNext();
      else handlePrev();
    }
  };

  // Language
  const lang = settings.questionLanguage;
  const fontSizeMap = { small: "15px", medium: "17px", large: "19px" };
  const fontSize = fontSizeMap[settings.fontSize];
  const optFontMap = { small: "14px", medium: "15px", large: "16px" };
  const optFont = optFontMap[settings.fontSize];

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // Secondary text
  let primaryQuestion = currentQuestion?.question || "";
  let primaryOptions = currentQuestion?.options || [];
  let secondaryQuestion = "";
  let secondaryOptions: string[] | undefined;

  function toTrad(text: string) {
    try { return toTraditional(text); } catch { return text; }
  }

  // Use auto-translated text if available
  const autoTrans = currentQuestion ? transCache[currentQuestion.id] : null;
  const effEnQ = currentQuestion?.enQuestion || autoTrans?.enQuestion || "";
  const effEnOpts = currentQuestion?.enOptions?.length ? currentQuestion.enOptions : autoTrans?.enOptions || [];

  if (lang === "entc" && currentQuestion) {
    // Show [EN] prefix when English is not available (translation pending)
    primaryQuestion = effEnQ || `[EN] ${currentQuestion.question}`;
    primaryOptions = effEnOpts.length ? effEnOpts : currentQuestion.options.map((o) => `[EN] ${o}`);
    secondaryQuestion = currentQuestion.tcQuestion || toTrad(currentQuestion.question);
    secondaryOptions = currentQuestion.tcOptions || currentQuestion.options.map((o) => toTrad(o));
  }

  if (!bankData || questions.length === 0) {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--page-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)" }}>
        加载中...
      </div>
    );
  }

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: "var(--page-bg)", overflow: "hidden" }}>
      <ParticleBackground />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100dvh" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border-color)", flexShrink: 0 }}>
          <button onClick={() => setShowSubmitConfirm(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
            <ArrowLeft size={20} color="var(--text-primary)" />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
            <Clock size={14} color="var(--accent-color)" />
            {formatTime(elapsed)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button onClick={() => setSettings({ questionLanguage: settings.questionLanguage === "entc" ? "sc" : settings.questionLanguage === "sc" ? "en" : settings.questionLanguage === "en" ? "entc" : "entc" })} style={{ background: "var(--card-bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "4px 8px", fontSize: "11px", fontWeight: 600, color: "var(--accent-color)", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}>
              <Languages size={11} />
              {settings.questionLanguage === "entc" ? "EN+繁" : settings.questionLanguage === "sc" ? "简体" : settings.questionLanguage === "en" ? "EN" : settings.questionLanguage === "tc" ? "繁體" : "EN+繁"}
            </button>
            <button onClick={toggleFlag} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
              <Flag size={18} color={currentAnswer?.flagged ? "#f59e0b" : "var(--text-tertiary)"} />
            </button>
            <button onClick={() => setShowNav(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
              {currentIndex + 1}/{totalQuestions}
            </button>
          </div>
        </div>

        {/* Question */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px", WebkitOverflowScrolling: "touch" }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <motion.div key={currentIndex} initial={{ opacity: 0, x: swipeDir === "left" ? 30 : swipeDir === "right" ? -30 : 0 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>

            {/* Progress */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <div style={{ flex: 1, height: "4px", background: "var(--card-bg-secondary)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%`, height: "100%", background: "var(--accent-color)", borderRadius: "2px", transition: "width 0.3s" }} />
              </div>
            </div>

            {/* Question Text */}
            <div style={{ background: "var(--card-bg)", borderRadius: "16px", padding: "20px", border: "1px solid var(--border-color)", marginBottom: "16px" }}>
              {currentQuestion?.chapterName && (
                <span style={{ display: "inline-block", fontSize: "11px", fontWeight: 600, color: "var(--accent-color)", background: "var(--accent-glow)", padding: "2px 10px", borderRadius: "6px", marginBottom: "10px" }}>
                  {currentQuestion.chapterName}
                </span>
              )}
              <div style={{ fontSize, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.6, userSelect: "text", WebkitUserSelect: "text" }}>
                {currentIndex + 1}. {primaryQuestion}
              </div>
              {lang === "entc" && secondaryQuestion && (
                <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--border-color)", fontSize: "16px", color: "var(--text-primary)", lineHeight: 1.6, userSelect: "text", WebkitUserSelect: "text" }}>
                  {secondaryQuestion}
                </div>
              )}
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {primaryOptions.map((opt, index) => {
                const isSelected = currentAnswer?.selected.includes(index);
                return (
                  <motion.button key={index} whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelect(index)}
                    style={{
                      width: "100%", padding: "14px 16px", borderRadius: "12px",
                      background: isSelected ? "var(--accent-color)" : "var(--card-bg)",
                      border: `1px solid ${isSelected ? "var(--accent-color)" : "var(--border-color)"}`,
                      color: isSelected ? "#fff" : "var(--text-primary)",
                      fontSize: optFont, lineHeight: 1.5, textAlign: "left",
                      cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "10px",
                      WebkitTapHighlightColor: "transparent", userSelect: "text", WebkitUserSelect: "text",
                    }}
                  >
                    <span style={{
                      flexShrink: 0, width: "26px", height: "26px", borderRadius: "50%",
                      background: isSelected ? "#fff" : "var(--card-bg-secondary)",
                      color: isSelected ? "var(--accent-color)" : "var(--text-tertiary)",
                      border: `1px solid ${isSelected ? "#fff" : "var(--border-color)"}`,
                      fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span style={{ flex: 1 }}>{opt}</span>
                    {lang === "entc" && secondaryOptions?.[index] && (
                      <div style={{ width: "100%", marginTop: "4px", fontSize: "14px", color: isSelected ? "rgba(255,255,255,0.85)" : "var(--text-secondary)" }}>
                        {secondaryOptions[index]}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Bottom Nav */}
        <div style={{ flexShrink: 0, padding: "12px 16px", borderTop: "1px solid var(--border-color)", background: "var(--nav-bg)", backdropFilter: "blur(20px)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <button onClick={handlePrev} disabled={currentIndex === 0}
              style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "10px", cursor: currentIndex === 0 ? "not-allowed" : "pointer", opacity: currentIndex === 0 ? 0.4 : 1, display: "flex", alignItems: "center", gap: "4px", color: "var(--text-primary)" }}>
              <ChevronLeft size={16} /> 上一题
            </button>

            {answeredCount === totalQuestions ? (
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowSubmitConfirm(true)}
                style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "#f59e0b", color: "#fff", border: "none", fontSize: "14px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <GraduationCap size={18} />
                提交试卷
              </motion.button>
            ) : (
              <div style={{ flex: 1, textAlign: "center", fontSize: "13px", color: "var(--text-tertiary)" }}>
                已答 {answeredCount}/{totalQuestions}
              </div>
            )}

            <button onClick={handleNext} disabled={currentIndex === totalQuestions - 1}
              style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "10px", cursor: currentIndex === totalQuestions - 1 ? "not-allowed" : "pointer", opacity: currentIndex === totalQuestions - 1 ? 0.4 : 1, display: "flex", alignItems: "center", gap: "4px", color: "var(--text-primary)" }}>
              下一题 <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Question Number Nav Overlay */}
      {showNav && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "flex-end" }} onClick={() => setShowNav(false)}>
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ type: "spring", damping: 25 }}
            style={{ width: "100%", maxHeight: "70vh", background: "var(--card-bg)", borderRadius: "20px 20px 0 0", padding: "20px", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "var(--text-primary)" }}>题目导航</h3>
              <button onClick={() => setShowNav(false)} style={{ background: "none", border: "none", color: "var(--text-tertiary)", fontSize: "14px", cursor: "pointer" }}>关闭</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", fontSize: "12px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--accent-color)" }} /> 已答</span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b" }} /> 标记</span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--card-bg-secondary)" }} /> 未答</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
              {answers.map((a, i) => (
                <button key={i} onClick={() => { setCurrentIndex(i); setShowNav(false); }}
                  style={{
                    aspectRatio: "1", borderRadius: "10px", fontSize: "14px", fontWeight: 600,
                    background: i === currentIndex ? "var(--accent-color)" : a.selected.length > 0 ? "var(--accent-color)" : a.flagged ? "#f59e0b" : "var(--card-bg-secondary)",
                    color: i === currentIndex || a.selected.length > 0 ? "#fff" : a.flagged ? "#fff" : "var(--text-primary)",
                    border: `1px solid ${i === currentIndex ? "var(--accent-color)" : "var(--border-color)"}`,
                    cursor: "pointer",
                  }}>
                  {i + 1}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Submit Confirm */}
      {showSubmitConfirm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 20 }}
            style={{ background: "var(--card-bg)", borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "400px", border: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <GraduationCap size={28} color="#f59e0b" />
              </div>
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", textAlign: "center", margin: "0 0 8px" }}>
              {answeredCount < totalQuestions ? "提前交卷？" : "确认提交？"}
            </h2>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", textAlign: "center", margin: "0 0 20px" }}>
              已答 <strong style={{ color: "var(--accent-color)" }}>{answeredCount}</strong> / {totalQuestions} 题
              {answeredCount < totalQuestions && `，还有 ${totalQuestions - answeredCount} 题未作答`}
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setShowSubmitConfirm(false)}
                style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "var(--card-bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                继续答题
              </button>
              <button onClick={handleSubmit}
                style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "#f59e0b", color: "#fff", border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                提交
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
