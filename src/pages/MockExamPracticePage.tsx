import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, ChevronLeft, ChevronRight, Flag, GraduationCap, Check, X, AlertCircle } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAppSettings } from "@/context/AppContext";
import { toTraditional } from "@/lib/chineseConv";
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

export default function MockExamPracticePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const mockExamId = Number(searchParams.get("mockExamId"));
  const locationState = location.state as { questions?: any[]; title?: string } | null;

  const { settings } = useAppSettings();

  // Always call hooks at top level
  const { data: mockExam } = trpc.mockExam.list.useQuery();
  const currentMock = mockExam?.find((m) => m.id === mockExamId);
  const mockTitle = locationState?.title || currentMock?.title || "模拟练习";
  const incrementMutation = trpc.mockExam.incrementPracticed.useMutation();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<ExamAnswer[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [expandedExplanation, setExpandedExplanation] = useState<number | null>(null);
  const [loadError, setLoadError] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Load questions from location.state or fallback to API
  const questions: Q[] = useMemo(() => {
    setLoadError("");
    // Priority 1: location.state (passed from list page)
    if (locationState?.questions && Array.isArray(locationState.questions) && locationState.questions.length > 0) {
      const validQs = locationState.questions.filter(
        (q) => q && typeof q.question === "string" && q.question.length > 0 && Array.isArray(q.options) && q.options.length >= 2,
      );
      if (validQs.length > 0) return validQs;
      setLoadError(`state中有${locationState.questions.length}题，但有效题目为0（缺少题目内容或选项）`);
      return locationState.questions; // Return raw data so user can see the error
    }
    // Priority 2: API data
    if (currentMock?.questionsJson) {
      try {
        const parsed = JSON.parse(currentMock.questionsJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validQs = parsed.filter(
            (q) => q && typeof q.question === "string" && q.question.length > 0 && Array.isArray(q.options) && q.options.length >= 2,
          );
          if (validQs.length > 0) return validQs;
          setLoadError(`API返回${parsed.length}题，但有效题目为0`);
          return parsed;
        }
        setLoadError("API返回的题目数组为空");
        return [];
      } catch {
        setLoadError("API返回的题目JSON解析失败");
        return [];
      }
    }
    setLoadError("未找到题目数据：location.state为空且API无数据");
    return [];
  }, [locationState?.questions, currentMock?.questionsJson]);

  // Initialize answers
  useEffect(() => {
    if (questions.length > 0 && answers.length === 0) {
      setAnswers(
        questions.map((q) => ({
          selected: Array.isArray(q.correct) && q.correct.length > 0 ? [] : [],
          flagged: false,
        })),
      );
    }
  }, [questions.length, questions]);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentIndex];

  const answeredCount = answers.filter((a) => a && a.selected && a.selected.length > 0).length;
  const totalQuestions = questions.length;

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
    },
    [currentQuestion, currentIndex, submitted],
  );

  const handleNext = useCallback(() => {
    if (currentIndex < totalQuestions - 1) setCurrentIndex((p) => p + 1);
  }, [currentIndex, totalQuestions]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((p) => p - 1);
  }, [currentIndex]);

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
    clearInterval(timerRef.current);
    if (mockExamId) incrementMutation.mutate({ id: mockExamId });
  }, [mockExamId, incrementMutation]);

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

  const lang = settings.questionLanguage;
  const fontSizeMap = { small: "15px", medium: "17px", large: "19px" };
  const fontSize = fontSizeMap[settings.fontSize];
  const optFontMap = { small: "14px", medium: "15px", large: "16px" };
  const optFont = optFontMap[settings.fontSize];

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const isCorrect = (q: Q, ans: ExamAnswer) => {
    if (!q || !ans || !q.correct || !ans.selected) return false;
    return q.correct.length === ans.selected.length && q.correct.every((c) => ans.selected.includes(c));
  };

  // Compute display text
  let primaryQuestion = "";
  let primaryOptions: string[] = [];
  let secondaryQuestion = "";

  if (currentQuestion) {
    if (lang === "entc") {
      primaryQuestion = currentQuestion.enQuestion || currentQuestion.question || "";
      primaryOptions = currentQuestion.enOptions || currentQuestion.options || [];
      secondaryQuestion = currentQuestion.tcQuestion || "";
    } else {
      primaryQuestion = currentQuestion.question || "";
      primaryOptions = currentQuestion.options || [];
    }
  }

  // ===== ERROR STATES =====

  if (totalQuestions === 0) {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--page-bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <AlertCircle size={48} color="#ef4444" />
        <p style={{ color: "#ef4444", fontSize: "16px", fontWeight: 600, marginTop: "16px" }}>试卷加载失败</p>
        {loadError && <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "8px", textAlign: "center", maxWidth: "300px" }}>{loadError}</p>}
        <p style={{ color: "var(--text-tertiary)", fontSize: "12px", marginTop: "12px", textAlign: "center" }}>
          mockExamId: {mockExamId}<br />
          state: {locationState ? "有" : "无"}<br />
          API: {currentMock ? "有" : "无"}
        </p>
        <button
          onClick={() => navigate("/mock-exam/list")}
          style={{ marginTop: "20px", padding: "12px 24px", borderRadius: "12px", background: "var(--accent-color)", color: "#fff", border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
        >
          返回列表
        </button>
      </div>
    );
  }

  // If current question is invalid, show error for this specific question
  if (!currentQuestion) {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--page-bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <AlertCircle size={48} color="#f59e0b" />
        <p style={{ color: "#f59e0b", fontSize: "16px", fontWeight: 600, marginTop: "16px" }}>第 {currentIndex + 1} 题数据异常</p>
        <p style={{ color: "var(--text-tertiary)", fontSize: "13px", marginTop: "8px" }}>total: {totalQuestions}, currentIndex: {currentIndex}</p>
        <button onClick={() => setCurrentIndex(0)} style={{ marginTop: "12px", padding: "10px 20px", borderRadius: "10px", background: "var(--accent-color)", color: "#fff", border: "none", fontSize: "14px", cursor: "pointer" }}>
          回到第1题
        </button>
        <button onClick={() => navigate("/mock-exam/list")} style={{ marginTop: "8px", padding: "10px 20px", borderRadius: "10px", background: "var(--card-bg)", color: "var(--text-primary)", border: "1px solid var(--border-color)", fontSize: "14px", cursor: "pointer" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", maxWidth: "50%", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
            <Clock size={14} color="var(--accent-color)" />
            {formatTime(elapsed)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <div style={{ flex: 1, height: "4px", background: "var(--card-bg-secondary)", borderRadius: "2px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
                    height: "100%",
                    background: submitted ? (isCorrect(currentQuestion, currentAnswer) ? "#10b981" : "#ef4444") : "var(--accent-color)",
                    borderRadius: "2px",
                    transition: "width 0.3s",
                  }}
                />
              </div>
            </div>

            {/* Title */}
            <div style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "10px", textAlign: "center" }}>{mockTitle}</div>

            {/* Question Text */}
            <div style={{ background: "var(--card-bg)", borderRadius: "16px", padding: "20px", border: "1px solid var(--border-color)", marginBottom: "16px" }}>
              {currentQuestion.chapterName && (
                <span
                  style={{
                    display: "inline-block",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--accent-color)",
                    background: "var(--accent-glow)",
                    padding: "2px 10px",
                    borderRadius: "6px",
                    marginBottom: "10px",
                  }}
                >
                  {currentQuestion.chapterName}
                </span>
              )}
              {primaryQuestion ? (
                <div style={{ fontSize, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.6, userSelect: "text", WebkitUserSelect: "text" }}>
                  {currentIndex + 1}. {primaryQuestion}
                </div>
              ) : (
                <div style={{ fontSize, color: "#ef4444", lineHeight: 1.6 }}>题目内容缺失（id: {currentQuestion.id}）</div>
              )}
              {lang === "entc" && secondaryQuestion && (
                <div
                  style={{
                    marginTop: "10px",
                    paddingTop: "10px",
                    borderTop: "1px solid var(--border-color)",
                    fontSize: "16px",
                    color: "var(--text-primary)",
                    lineHeight: 1.6,
                    userSelect: "text",
                    WebkitUserSelect: "text",
                  }}
                >
                  {secondaryQuestion}
                </div>
              )}
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {primaryOptions.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px", color: "#ef4444", fontSize: "14px", background: "rgba(239,68,68,0.05)", borderRadius: "12px" }}>
                  题目数据异常：选项缺失（id: {currentQuestion.id}）
                </div>
              )}
              {primaryOptions.map((opt, index) => {
                const isSelected = currentAnswer?.selected?.includes(index) || false;
                const isCorrectOption = currentQuestion.correct?.includes(index) || false;
                let bgColor = "var(--card-bg)";
                let borderColor = isSelected ? "var(--accent-color)" : "var(--border-color)";
                let textColor = "var(--text-primary)";
                let circleBg = isSelected ? "var(--accent-color)" : "var(--card-bg-secondary)";
                let circleColor = isSelected ? "#fff" : "var(--text-tertiary)";

                if (submitted) {
                  if (isCorrectOption) {
                    bgColor = "rgba(16,185,129,0.1)";
                    borderColor = "#10b981";
                    textColor = "#10b981";
                    circleBg = "#10b981";
                    circleColor = "#fff";
                  } else if (isSelected && !isCorrectOption) {
                    bgColor = "rgba(239,68,68,0.1)";
                    borderColor = "#ef4444";
                    textColor = "#ef4444";
                    circleBg = "#ef4444";
                    circleColor = "#fff";
                  } else {
                    bgColor = "var(--card-bg)";
                    borderColor = "var(--border-color)";
                    textColor = "var(--text-secondary)";
                    circleBg = "var(--card-bg-secondary)";
                    circleColor = "var(--text-tertiary)";
                  }
                }

                return (
                  <motion.button
                    key={index}
                    whileTap={submitted ? {} : { scale: 0.98 }}
                    onClick={() => handleSelect(index)}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      borderRadius: "12px",
                      background: bgColor,
                      border: `1px solid ${borderColor}`,
                      color: textColor,
                      fontSize: optFont,
                      lineHeight: 1.5,
                      textAlign: "left",
                      cursor: submitted ? "default" : "pointer",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    <span
                      style={{
                        flexShrink: 0,
                        width: "26px",
                        height: "26px",
                        borderRadius: "50%",
                        background: circleBg,
                        color: circleColor,
                        border: `1px solid ${borderColor}`,
                        fontSize: "12px",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {submitted && isCorrectOption ? (
                        <Check size={14} />
                      ) : submitted && isSelected && !isCorrectOption ? (
                        <X size={14} />
                      ) : (
                        String.fromCharCode(65 + index)
                      )}
                    </span>
                    <span style={{ flex: 1 }}>{opt || `选项${String.fromCharCode(65 + index)}（空）`}</span>
                    {submitted && isCorrectOption && <Check size={16} color="#10b981" style={{ flexShrink: 0 }} />}
                    {submitted && isSelected && !isCorrectOption && <X size={16} color="#ef4444" style={{ flexShrink: 0 }} />}
                  </motion.button>
                );
              })}
            </div>

            {/* Explanation (after submit) */}
            {submitted && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: "16px" }}>
                <button
                  onClick={() => setExpandedExplanation(expandedExplanation === currentIndex ? null : currentIndex)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    background: "var(--card-bg)",
                    border: "1px solid var(--border-color)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: "14px", fontWeight: 600, color: isCorrect(currentQuestion, currentAnswer || { selected: [], flagged: false }) ? "#10b981" : "#ef4444" }}>
                    {isCorrect(currentQuestion, currentAnswer || { selected: [], flagged: false }) ? "回答正确" : "回答错误"}
                    {currentQuestion.explanation ? " — 查看解析" : ""}
                  </span>
                  {currentQuestion.explanation && (expandedExplanation === currentIndex ? (
                    <ChevronLeft size={16} style={{ transform: "rotate(90deg)" }} color="var(--text-tertiary)" />
                  ) : (
                    <ChevronRight size={16} color="var(--text-tertiary)" />
                  ))}
                </button>
                {expandedExplanation === currentIndex && currentQuestion.explanation && (
                  <div
                    style={{
                      padding: "12px 16px",
                      background: "var(--card-bg-secondary)",
                      borderRadius: "0 0 12px 12px",
                      border: "1px solid var(--border-color)",
                      borderTop: "none",
                    }}
                  >
                    <div style={{ fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.6 }}>
                      <strong style={{ color: "var(--text-secondary)" }}>正确答案：</strong>
                      {(currentQuestion.correct || []).map((c) => String.fromCharCode(65 + c)).join(", ")}
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6, marginTop: "8px" }}>
                      {currentQuestion.explanation}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Debug info (dev only) */}
            {loadError && (
              <div style={{ marginTop: "16px", padding: "10px", background: "rgba(239,68,68,0.05)", borderRadius: "8px", fontSize: "11px", color: "var(--text-tertiary)" }}>
                诊断：{loadError}
              </div>
            )}
          </motion.div>
        </div>

        {/* Bottom */}
        <div style={{ flexShrink: 0, padding: "12px 16px", borderTop: "1px solid var(--border-color)", background: "var(--nav-bg)", backdropFilter: "blur(20px)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
                borderRadius: "10px",
                padding: "10px",
                cursor: currentIndex === 0 ? "not-allowed" : "pointer",
                opacity: currentIndex === 0 ? 0.4 : 1,
                display: "flex",
                alignItems: "center",
                gap: "4px",
                color: "var(--text-primary)",
              }}
            >
              <ChevronLeft size={16} /> 上一题
            </button>

            {!submitted && answeredCount === totalQuestions ? (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowSubmitConfirm(true)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "12px",
                  background: "#f59e0b",
                  color: "#fff",
                  border: "none",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <GraduationCap size={18} /> 提交试卷
              </motion.button>
            ) : submitted ? (
              <button
                onClick={() => navigate("/mock-exam/list")}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "12px",
                  background: "var(--accent-color)",
                  color: "#fff",
                  border: "none",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                完成
              </button>
            ) : (
              <div style={{ flex: 1, textAlign: "center", fontSize: "13px", color: "var(--text-tertiary)" }}>
                已答 {answeredCount}/{totalQuestions}
              </div>
            )}

            <button
              onClick={handleNext}
              disabled={currentIndex === totalQuestions - 1}
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
                borderRadius: "10px",
                padding: "10px",
                cursor: currentIndex === totalQuestions - 1 ? "not-allowed" : "pointer",
                opacity: currentIndex === totalQuestions - 1 ? 0.4 : 1,
                display: "flex",
                alignItems: "center",
                gap: "4px",
                color: "var(--text-primary)",
              }}
            >
              下一题 <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Question Nav Overlay */}
      {showNav && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "flex-end" }}
          onClick={() => setShowNav(false)}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{ type: "spring", damping: 25 }}
            style={{ width: "100%", maxHeight: "70vh", background: "var(--card-bg)", borderRadius: "20px 20px 0 0", padding: "20px", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "var(--text-primary)" }}>题目导航</h3>
              <button onClick={() => setShowNav(false)} style={{ background: "none", border: "none", color: "var(--text-tertiary)", fontSize: "14px", cursor: "pointer" }}>
                关闭
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
              {questions.map((_, i) => {
                const a = answers[i] || { selected: [], flagged: false };
                let bg = i === currentIndex ? "var(--accent-color)" : a.selected.length > 0 ? "var(--accent-color)" : a.flagged ? "#f59e0b" : "var(--card-bg-secondary)";
                let color = i === currentIndex || a.selected.length > 0 ? "#fff" : a.flagged ? "#fff" : "var(--text-primary)";
                if (submitted) {
                  const correct = isCorrect(questions[i], a);
                  bg = i === currentIndex ? (correct ? "#10b981" : "#ef4444") : correct ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)";
                  color = correct ? "#10b981" : "#ef4444";
                }
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentIndex(i);
                      setShowNav(false);
                    }}
                    style={{
                      aspectRatio: "1",
                      borderRadius: "10px",
                      fontSize: "14px",
                      fontWeight: 600,
                      background: bg,
                      color,
                      border: `1px solid ${i === currentIndex ? "transparent" : "var(--border-color)"}`,
                      cursor: "pointer",
                    }}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Submit Confirm */}
      {showSubmitConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 20 }}
            style={{ background: "var(--card-bg)", borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "400px", border: "1px solid var(--border-color)" }}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "rgba(245,158,11,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
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
              <button
                onClick={() => setShowSubmitConfirm(false)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "12px",
                  background: "var(--card-bg-secondary)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-color)",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                继续答题
              </button>
              <button
                onClick={handleSubmit}
                style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "#f59e0b", color: "#fff", border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
              >
                提交
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
