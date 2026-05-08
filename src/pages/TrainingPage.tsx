import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Check, X, Clock, ChevronRight, ChevronLeft, RotateCcw, Home, BookOpen, Languages, AlertCircle, Trophy, Zap, FileText } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAppSettings } from "@/context/AppContext";
import ParticleBackground from "@/components/ParticleBackground";

interface AnswerState {
  selected: number[];
  isCorrect?: boolean;
  timeSpent?: number;
  submitted: boolean;
}

interface ChapterInfo {
  chapterId: number;
  chapterName: string;
  questionCount: number;
}

// ========== Training Selector ==========
function TrainingSelector({ onSelect }: { onSelect: (id: number, chapterId?: number) => void }) {
  const navigate = useNavigate();
  const { data: banks } = trpc.bank.list.useQuery();
  const { data: records } = trpc.record.list.useQuery();

  const bankStats = (banks || []).map((b) => {
    const recs = (records || []).filter((r) => r.bankId === b.id);
    const wrongCount = recs.filter((r) => !r.isCorrect).length;
    return { ...b, wrongCount, hasRecords: recs.length > 0 };
  });

  const unpracticed = bankStats.filter((b) => !b.hasRecords);
  const inProgress = bankStats.filter((b) => b.hasRecords && b.progress < 100);
  const completed = bankStats.filter((b) => b.progress >= 100);
  const withMistakes = bankStats.filter((b) => b.wrongCount > 0);

  const BankCard = ({ bank }: { bank: typeof bankStats[0] }) => {
    const chapters: ChapterInfo[] = bank.chaptersJson ? JSON.parse(bank.chaptersJson) : [];
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelect(bank.id)}
        style={{
          background: "#222", borderRadius: "12px", padding: "14px 16px",
          border: "1px solid rgba(255,255,255,0.06)", marginBottom: "8px",
          cursor: "pointer", display: "flex", alignItems: "center", gap: "12px",
        }}
      >
        <div style={{ width: "4px", height: "40px", borderRadius: "2px", background: bank.progress >= 100 ? "#10b981" : bank.color || "#00d4ff", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{bank.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "3px" }}>
            <span style={{ fontSize: "12px", color: "#666" }}>{JSON.parse(bank.questionsJson).length} 题</span>
            {chapters.length > 0 && <span style={{ fontSize: "11px", color: "#a0a0a0" }}>{chapters.length} 章</span>}
            {bank.progress > 0 && bank.progress < 100 && (
              <>
                <div style={{ flex: 1, height: "3px", background: "#2a2a2a", borderRadius: "2px", maxWidth: "80px" }}>
                  <div style={{ width: `${bank.progress}%`, height: "100%", background: bank.color || "#00d4ff", borderRadius: "2px" }} />
                </div>
                <span style={{ fontSize: "11px", color: "#a0a0a0" }}>{bank.progress}%</span>
              </>
            )}
          </div>
        </div>
        {bank.wrongCount > 0 && <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "8px", background: "rgba(239,68,68,0.12)", color: "#ef4444", fontWeight: 500, flexShrink: 0 }}>{bank.wrongCount} 错题</span>}
        {bank.progress >= 100 && <Trophy size={16} color="#10b981" />}
        {!bank.hasRecords && <Zap size={16} color="#00d4ff" />}
      </motion.div>
    );
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "#1a1a1a", overflowX: "hidden" }}>
      <ParticleBackground />
      <div style={{ position: "relative", zIndex: 1, padding: "16px", paddingBottom: "100px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#fff", margin: "0 0 4px 0" }}>开始训练</h1>
        <p style={{ fontSize: "13px", color: "#666", marginBottom: "20px" }}>选择题库开始练习，或错题重练</p>

        {withMistakes.length > 0 && (
          <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/mistakes")}
            style={{
              width: "100%", padding: "16px", borderRadius: "14px",
              background: "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.03))",
              border: "1px solid rgba(239,68,68,0.2)", marginBottom: "16px",
              display: "flex", alignItems: "center", gap: "12px", cursor: "pointer",
            }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertCircle size={22} color="#ef4444" />
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontSize: "15px", fontWeight: 600, color: "#ef4444" }}>错题重练</div>
              <div style={{ fontSize: "12px", color: "#a0a0a0", marginTop: "2px" }}>共 {withMistakes.reduce((s, b) => s + b.wrongCount, 0)} 道错题待复习</div>
            </div>
            <ChevronRight size={18} color="#ef4444" />
          </motion.button>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {inProgress.length > 0 && <div><div style={{ fontSize: "11px", fontWeight: 500, color: "#00d4ff", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "8px", paddingLeft: "4px" }}>继续练习 · {inProgress.length}</div>{inProgress.map((b) => <BankCard key={b.id} bank={b} />)}</div>}
          {unpracticed.length > 0 && <div><div style={{ fontSize: "11px", fontWeight: 500, color: "#a0a0a0", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "8px", paddingLeft: "4px" }}>未练习 · {unpracticed.length}</div>{unpracticed.map((b) => <BankCard key={b.id} bank={b} />)}</div>}
          {completed.length > 0 && <div><div style={{ fontSize: "11px", fontWeight: 500, color: "#10b981", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "8px", paddingLeft: "4px" }}>已完成 · {completed.length}</div>{completed.map((b) => <BankCard key={b.id} bank={b} />)}</div>}
        </div>

        {(!banks || banks.length === 0) && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <BookOpen size={56} color="#333" />
            <p style={{ color: "#666", marginTop: "16px", fontSize: "15px" }}>暂无题库</p>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/library")}
              style={{ marginTop: "20px", padding: "12px 28px", background: "#00d4ff", color: "#1a1a1a", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
              前往导入题库
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}

// ========== Chapter Selector ==========
function ChapterSelector({ bankId, onSelectChapter }: { bankId: number; onSelectChapter: (chapterId?: number) => void }) {
  const { data: bank } = trpc.bank.get.useQuery({ id: bankId });
  const { data: records } = trpc.record.listByBank.useQuery({ bankId });
  const navigate = useNavigate();

  const chapters: ChapterInfo[] = bank?.chaptersJson ? JSON.parse(bank.chaptersJson) : [];
  const allQuestions: Array<{ chapterId?: number; chapterName?: string }> = bank ? JSON.parse(bank.questionsJson) : [];

  // Per-chapter stats
  const chapterStats = chapters.map((ch) => {
    const chRecords = (records || []).filter((r) => r.chapterId === ch.chapterId);
    const correct = chRecords.filter((r) => r.isCorrect).length;
    const wrong = chRecords.filter((r) => !r.isCorrect).length;
    const totalInChapter = allQuestions.filter((q) => q.chapterId === ch.chapterId).length;
    return { ...ch, correct, wrong, totalInChapter };
  });

  if (!bank) return <div style={{ minHeight: "100vh", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>加载中...</div>;

  // If no chapters, skip to full bank
  if (chapters.length === 0) {
    onSelectChapter(undefined);
    return null;
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "#1a1a1a", overflowX: "hidden" }}>
      <ParticleBackground />
      <div style={{ position: "relative", zIndex: 1, padding: "16px", paddingBottom: "100px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <button onClick={() => navigate("/training")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
            <ArrowLeft size={24} color="#fff" />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#fff", margin: 0 }}>{bank.title}</h1>
            <p style={{ fontSize: "12px", color: "#666", margin: "2px 0 0" }}>选择章节开始练习</p>
          </div>
        </div>

        {/* All chapters option */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectChapter(undefined)}
          style={{
            width: "100%", padding: "16px", borderRadius: "14px",
            background: "linear-gradient(135deg, #00d4ff20, #0077ff10)",
            border: "1px solid rgba(0,212,255,0.3)", marginBottom: "12px",
            cursor: "pointer", display: "flex", alignItems: "center", gap: "12px",
          }}
        >
          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(0,212,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <BookOpen size={22} color="#00d4ff" />
          </div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "#fff" }}>全部章节</div>
            <div style={{ fontSize: "12px", color: "#a0a0a0", marginTop: "2px" }}>{allQuestions.length} 题</div>
          </div>
          <ChevronRight size={18} color="#00d4ff" />
        </motion.button>

        {/* Chapter list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {chapterStats.map((ch, i) => (
            <motion.button
              key={ch.chapterId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectChapter(ch.chapterId)}
              style={{
                width: "100%", padding: "14px 16px", borderRadius: "12px",
                background: "#222", border: "1px solid rgba(255,255,255,0.06)",
                cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px",
              }}
            >
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: `${bank.color || "#00d4ff"}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FileText size={18} color={bank.color || "#00d4ff"} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ch.chapterName}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "3px" }}>
                  <span style={{ fontSize: "11px", color: "#666" }}>{ch.questionCount} 题</span>
                  {ch.correct > 0 && <span style={{ fontSize: "11px", color: "#10b981" }}>{ch.correct} 正确</span>}
                  {ch.wrong > 0 && <span style={{ fontSize: "11px", color: "#ef4444" }}>{ch.wrong} 错误</span>}
                  {ch.correct === 0 && ch.wrong === 0 && <span style={{ fontSize: "11px", color: "#666" }}>未练习</span>}
                </div>
              </div>
              <ChevronRight size={16} color="#666" />
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ========== Training Session ==========
function TrainingSession({ bankId: rawBankId, chapterId: rawChapterId }: { bankId: number; chapterId?: number }) {
  const navigate = useNavigate();
  const { settings } = useAppSettings();
  const utils = trpc.useUtils();

  const { data: bankData } = trpc.bank.get.useQuery({ id: rawBankId });
  const { data: savedRecords } = trpc.record.listByBank.useQuery({ bankId: rawBankId });
  const addRecord = trpc.record.add.useMutation({ onSuccess: () => { utils.record.list.invalidate(); utils.record.listByBank.invalidate({ bankId: rawBankId }); } });
  const upsertDaily = trpc.record.upsertDaily.useMutation();
  const updateProgress = trpc.bank.updateProgress.useMutation({ onSuccess: () => utils.bank.list.invalidate() });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [startTime] = useState(Date.now());
  const [qStartTime, setQStartTime] = useState(Date.now());
  const [swipeDir, setSwipeDir] = useState<"left" | "right" | null>(null);
  const restoredRef = useRef(false);

  const allQuestions = bankData ? (JSON.parse(bankData.questionsJson) as Array<{
    id: number; type: string; question: string; options: string[]; correct: number[];
    explanation: string; enQuestion?: string; enOptions?: string[]; chapterId?: number; chapterName?: string;
  }>) : [];

  // Filter by chapter if specified
  const questions = rawChapterId
    ? allQuestions.filter((q) => q.chapterId === rawChapterId)
    : allQuestions;

  const lang = settings.questionLanguage;

  useEffect(() => {
    if (questions.length === 0 || restoredRef.current) return;
    restoredRef.current = true;

    const init: AnswerState[] = questions.map(() => ({ selected: [], submitted: false }));

    for (const rec of savedRecords || []) {
      const idx = questions.findIndex((q) => q.id === rec.questionId);
      if (idx >= 0) {
        init[idx] = { selected: rec.selected, isCorrect: rec.isCorrect, submitted: true };
      }
    }

    const firstUnanswered = init.findIndex((a) => !a.submitted);
    setAnswers(init);
    setCurrentIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
  }, [questions.length, savedRecords?.length]);

  useEffect(() => { setQStartTime(Date.now()); setSwipeDir(null); }, [currentIndex]);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentIndex];

  const submitAnswer = useCallback(
    (selected: number[]) => {
      if (!currentQuestion) return;
      const correct = currentQuestion.correct.length === selected.length && currentQuestion.correct.every((c) => selected.includes(c));
      const timeSpent = Date.now() - qStartTime;

      setAnswers((prev) => {
        const next = [...prev];
        next[currentIndex] = { selected, isCorrect: correct, submitted: true };
        return next;
      });

      addRecord.mutate({
        bankId: rawBankId,
        questionId: currentQuestion.id,
        chapterId: currentQuestion.chapterId,
        chapterName: currentQuestion.chapterName,
        selected,
        isCorrect: correct,
        timeSpent,
      });
    },
    [currentQuestion, qStartTime, currentIndex, rawBankId, addRecord]
  );

  const handleSelect = useCallback(
    (index: number) => {
      if (!currentQuestion || currentAnswer?.submitted) return;
      if (currentQuestion.type === "multiple") {
        setAnswers((prev) => {
          const next = [...prev];
          const s = next[currentIndex].selected;
          next[currentIndex] = { ...next[currentIndex], selected: s.includes(index) ? s.filter((i) => i !== index) : [...s, index] };
          return next;
        });
      } else {
        submitAnswer([index]);
      }
    },
    [currentQuestion, currentAnswer, currentIndex, submitAnswer]
  );

  const handleMultiSubmit = useCallback(() => {
    if (!currentQuestion || currentAnswer?.submitted || !currentAnswer?.selected.length) return;
    submitAnswer(currentAnswer.selected);
  }, [currentQuestion, currentAnswer, submitAnswer]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setSwipeDir("left");
      setCurrentIndex((p) => p + 1);
    } else {
      const submitted = answers.filter((a) => a.submitted);
      const correctCount = submitted.filter((a) => a.isCorrect).length;
      updateProgress.mutate({ id: rawBankId, progress: Math.min(100, Math.round((submitted.length / allQuestions.length) * 100)) });
      upsertDaily.mutate({ date: new Date().toISOString().split("T")[0], count: submitted.length, correct: correctCount });
      setShowSummary(true);
    }
  }, [currentIndex, questions.length, answers, rawBankId, allQuestions.length, updateProgress, upsertDaily]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) { setSwipeDir("right"); setCurrentIndex((p) => p - 1); }
  }, [currentIndex]);

  // Touch swipe
  const tsX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => { tsX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (tsX.current === null) return;
    const dx = e.changedTouches[0].clientX - tsX.current;
    if (Math.abs(dx) > 60) dx > 0 ? handlePrev() : handleNext();
    tsX.current = null;
  };

  const totalQuestions = questions.length;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;
  const submittedAnswers = answers.filter((a) => a.submitted);
  const correctCount = submittedAnswers.filter((a) => a.isCorrect).length;
  const wrongCount = submittedAnswers.filter((a) => !a.isCorrect).length;
  const accuracy = submittedAnswers.length > 0 ? Math.round((correctCount / submittedAnswers.length) * 100) : 0;
  const totalTime = Math.round((Date.now() - startTime) / 1000);

  if (!bankData || questions.length === 0) {
    return <div style={{ minHeight: "100vh", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>加载中...</div>;
  }

  const displayQuestion = lang === "en" && currentQuestion?.enQuestion ? currentQuestion.enQuestion : currentQuestion?.question || "";
  const displayOptions = lang === "en" && currentQuestion?.enOptions?.length ? currentQuestion.enOptions : currentQuestion?.options || [];
  const typeLabel = { single: "单选题", multiple: "多选题", boolean: "判断题", fill: "填空题" }[currentQuestion?.type || "single"];
  const langLabel = { zh: "中", en: "EN", both: "中英" }[lang];

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "#1a1a1a" }}>
      <ParticleBackground />
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Top Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <button onClick={() => navigate("/training")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}><ArrowLeft size={24} color="#fff" /></button>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#fff", flex: 1, textAlign: "center", margin: "0 8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {bankData.title}
            {rawChapterId && currentQuestion?.chapterName && <span style={{ fontSize: "12px", color: "#a0a0a0", marginLeft: "6px" }}>[{currentQuestion.chapterName.slice(0, 10)}]</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(0,212,255,0.15)", border: "1px solid rgba(0,212,255,0.3)", borderRadius: "8px", padding: "4px 10px", color: "#00d4ff", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}><Languages size={14} /> {langLabel}</button>
            <div style={{ fontSize: "12px", color: "#a0a0a0" }}>{currentIndex + 1} / {totalQuestions}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ width: "100%", height: "3px", background: "#2a2a2a" }}><motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} style={{ height: "100%", background: "#00d4ff" }} /></div>

        {/* Mini Navigator */}
        <div style={{ display: "flex", gap: "5px", padding: "10px 16px", overflowX: "auto" }}>
          {answers.map((ans, idx) => {
            let bg = "#2a2a2a", border = "1px solid transparent";
            if (idx === currentIndex) { bg = "#00d4ff"; border = "1px solid #00d4ff"; }
            else if (ans.submitted) { bg = ans.isCorrect ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"; border = ans.isCorrect ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(239,68,68,0.4)"; }
            return <button key={idx} onClick={() => { setSwipeDir(idx > currentIndex ? "left" : "right"); setCurrentIndex(idx); }} style={{ width: "32px", height: "32px", borderRadius: "8px", background: bg, border, color: idx === currentIndex ? "#1a1a1a" : ans.submitted ? (ans.isCorrect ? "#10b981" : "#ef4444") : "#666", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>{idx + 1}</button>;
          })}
        </div>

        {/* Question + Options */}
        <div style={{ padding: "0 16px 100px" }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <motion.div key={currentIndex} custom={swipeDir}
            initial={{ opacity: 0, x: swipeDir === "left" ? 80 : swipeDir === "right" ? -80 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: swipeDir === "left" ? -80 : 80 }}
            transition={{ duration: 0.25 }}>
            {/* Question Card */}
            <div style={{ background: "#222", borderRadius: "16px", padding: "20px", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "16px" }}>
              <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: "8px", background: "rgba(0,212,255,0.15)", color: "#00d4ff", fontSize: "12px", fontWeight: 500, marginBottom: "12px" }}>
                {typeLabel}{currentQuestion?.chapterName && <span style={{ marginLeft: "8px", opacity: 0.7 }}>{currentQuestion.chapterName.length > 15 ? currentQuestion.chapterName.slice(0, 15) + "..." : currentQuestion.chapterName}</span>}
                {currentAnswer?.submitted && <span style={{ marginLeft: "8px", color: currentAnswer.isCorrect ? "#10b981" : "#ef4444" }}>{currentAnswer.isCorrect ? " ✓ 正确" : " ✗ 错误"}</span>}
              </div>
              <div style={{ fontSize: "18px", fontWeight: 500, color: "#fff", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{displayQuestion}</div>
              {lang === "both" && currentQuestion?.enQuestion && <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: "14px", color: "#a0a0a0", lineHeight: 1.6 }}>{currentQuestion.enQuestion}</div>}
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {displayOptions.map((option, index) => {
                const isSelected = currentAnswer?.selected.includes(index) ?? false;
                const isCorrect = currentQuestion?.correct.includes(index) ?? false;
                const submitted = currentAnswer?.submitted ?? false;
                let borderColor = "rgba(255,255,255,0.08)", bgColor = "#2a2a2a", circleColor = "#666";
                if (submitted) {
                  if (isCorrect) { borderColor = "#10b981"; bgColor = "rgba(16,185,129,0.1)"; circleColor = "#10b981"; }
                  else if (isSelected && !isCorrect) { borderColor = "#ef4444"; bgColor = "rgba(239,68,68,0.1)"; circleColor = "#ef4444"; }
                } else if (isSelected) { borderColor = "#00d4ff"; bgColor = "rgba(0,212,255,0.1)"; circleColor = "#00d4ff"; }
                return (
                  <motion.button key={`${currentIndex}-${index}`} whileTap={!submitted ? { scale: 0.98 } : undefined} onClick={() => handleSelect(index)}
                    style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "16px", borderRadius: "12px", background: bgColor, border: `1.5px solid ${borderColor}`, cursor: submitted ? "default" : "pointer", textAlign: "left", width: "100%" }}>
                    <div style={{ width: "22px", height: "22px", borderRadius: currentQuestion?.type === "multiple" ? "4px" : "50%", border: `2px solid ${circleColor}`, background: isSelected ? circleColor : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                      {isSelected && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>{currentQuestion?.type === "multiple" ? <Check size={14} color="#1a1a1a" strokeWidth={3} /> : <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#1a1a1a" }} />}</motion.div>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: "16px", color: "#fff", lineHeight: 1.5 }}>{option}</span>
                      {lang === "both" && currentQuestion?.enOptions?.[index] && <div style={{ fontSize: "13px", color: "#a0a0a0", marginTop: "4px" }}>{currentQuestion.enOptions[index]}</div>}
                    </div>
                    {submitted && isCorrect && <Check size={20} color="#10b981" style={{ flexShrink: 0, marginTop: "2px" }} />}
                    {submitted && isSelected && !isCorrect && <X size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: "2px" }} />}
                  </motion.button>
                );
              })}
            </div>

            {/* Multi-select submit */}
            {currentQuestion?.type === "multiple" && !currentAnswer?.submitted && (
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleMultiSubmit} disabled={!currentAnswer?.selected.length}
                style={{ marginTop: "16px", width: "100%", padding: "14px", borderRadius: "12px", background: currentAnswer?.selected.length ? "#00d4ff" : "#2a2a2a", color: currentAnswer?.selected.length ? "#1a1a1a" : "#666", fontSize: "15px", fontWeight: 600, border: "none", cursor: currentAnswer?.selected.length ? "pointer" : "not-allowed" }}>
                确认提交 ({currentAnswer?.selected.length || 0}项已选)
              </motion.button>
            )}

            {/* Explanation */}
            {currentAnswer?.submitted && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} transition={{ duration: 0.3 }} style={{ overflow: "hidden", marginTop: "16px" }}>
                <div style={{ background: currentAnswer.isCorrect ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${currentAnswer.isCorrect ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`, borderRadius: "12px", padding: "16px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: currentAnswer.isCorrect ? "#10b981" : "#ef4444", marginBottom: "6px" }}>
                    {currentAnswer.isCorrect ? "回答正确！" : "回答错误"}
                    {!currentAnswer.isCorrect && <span style={{ fontWeight: 400, fontSize: "13px", color: "#a0a0a0", marginLeft: "8px" }}>正确答案: {currentQuestion?.correct.map((c) => String.fromCharCode(65 + c)).join(", ")}</span>}
                  </div>
                  <div style={{ fontSize: "14px", color: "#a0a0a0", lineHeight: 1.6 }}>{currentQuestion?.explanation}</div>
                </div>
              </motion.div>
            )}
          </motion.div>

          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", marginTop: "20px", fontSize: "12px", color: "#444" }}><ChevronLeft size={14} /><span>左右滑动切换题目</span><ChevronRight size={14} /></div>
        </div>

        {/* Bottom Nav */}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 16px", paddingBottom: "calc(12px + env(safe-area-inset-bottom))", background: "rgba(26,26,26,0.95)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: "12px", zIndex: 40 }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handlePrev} disabled={currentIndex === 0}
            style={{ flex: 1, padding: "14px", borderRadius: "12px", background: "#2a2a2a", color: currentIndex === 0 ? "#666" : "#fff", fontSize: "14px", fontWeight: 500, border: "none", cursor: currentIndex === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <ChevronLeft size={18} /> 上一题
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleNext}
            style={{ flex: 1, padding: "14px", borderRadius: "12px", background: "#00d4ff", color: "#1a1a1a", fontSize: "14px", fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            {currentIndex < totalQuestions - 1 ? <>下一题 <ChevronRight size={18} /></> : <>提交练习 <ChevronRight size={18} /></>}
          </motion.button>
        </div>
      </div>

      {/* Summary Modal */}
      {showSummary && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 20 }}
            style={{ background: "#222", borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "340px", border: "1px solid rgba(255,255,255,0.1)" }}>
            <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#fff", textAlign: "center", margin: "0 0 20px 0" }}>练习完成！</h2>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
              <div style={{ width: "140px", height: "140px", borderRadius: "50%", border: "6px solid #2a2a2a", borderTopColor: accuracy >= 80 ? "#10b981" : accuracy >= 60 ? "#00d4ff" : "#ef4444", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: "rotate(-90deg)" }}>
                <div style={{ transform: "rotate(90deg)", textAlign: "center" }}>
                  <div style={{ fontSize: "36px", fontWeight: 700, color: "#fff" }}>{accuracy}%</div>
                  <div style={{ fontSize: "12px", color: "#a0a0a0" }}>正确率</div>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
              <div style={{ textAlign: "center", background: "#2a2a2a", borderRadius: "10px", padding: "12px" }}><div style={{ fontSize: "20px", fontWeight: 700, color: "#fff" }}>{totalQuestions}</div><div style={{ fontSize: "12px", color: "#a0a0a0" }}>总题数</div></div>
              <div style={{ textAlign: "center", background: "rgba(16,185,129,0.1)", borderRadius: "10px", padding: "12px", border: "1px solid rgba(16,185,129,0.2)" }}><div style={{ fontSize: "20px", fontWeight: 700, color: "#10b981" }}>{correctCount}</div><div style={{ fontSize: "12px", color: "#a0a0a0" }}>正确数</div></div>
              <div style={{ textAlign: "center", background: "rgba(239,68,68,0.1)", borderRadius: "10px", padding: "12px", border: "1px solid rgba(239,68,68,0.2)" }}><div style={{ fontSize: "20px", fontWeight: 700, color: "#ef4444" }}>{wrongCount}</div><div style={{ fontSize: "12px", color: "#a0a0a0" }}>错误数</div></div>
              <div style={{ textAlign: "center", background: "#2a2a2a", borderRadius: "10px", padding: "12px" }}><div style={{ fontSize: "20px", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}><Clock size={16} /> {Math.floor(totalTime / 60)}:{String(totalTime % 60).padStart(2, "0")}</div><div style={{ fontSize: "12px", color: "#a0a0a0" }}>用时</div></div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => { setCurrentIndex(0); setAnswers(questions.map(() => ({ selected: [], submitted: false }))); setShowSummary(false); }}
                style={{ padding: "14px", borderRadius: "12px", background: "#00d4ff", color: "#1a1a1a", fontSize: "14px", fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <RotateCcw size={16} /> 再来一组
              </motion.button>
              <div style={{ display: "flex", gap: "10px" }}>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/")} style={{ flex: 1, padding: "14px", borderRadius: "12px", background: "#2a2a2a", color: "#fff", fontSize: "14px", border: "none", cursor: "pointer" }}><Home size={16} /> 首页</motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/training")} style={{ flex: 1, padding: "14px", borderRadius: "12px", background: "#2a2a2a", color: "#fff", fontSize: "14px", border: "none", cursor: "pointer" }}><BookOpen size={16} /> 换题库</motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

// ========== Entry Point ==========
export default function TrainingPage() {
  const location = useLocation();
  const navState = location.state as { bankId?: number; chapterId?: number } | null;
  const bankId = navState?.bankId;
  const chapterId = navState?.chapterId;

  // If we have a bankId and chapterId (or no chapters), show training session
  // If we have a bankId but no chapterId yet, show chapter selector first
  const [selectedChapter, setSelectedChapter] = useState<number | undefined>(chapterId);

  if (!bankId) return <TrainingSelector onSelect={(id) => { window.history.replaceState({ bankId: id }, ""); }} />;

  // If no chapter selected yet, show chapter selector
  if (selectedChapter === undefined && chapterId === undefined) {
    return <ChapterSelector bankId={bankId} onSelectChapter={(chId) => setSelectedChapter(chId)} />;
  }

  return <TrainingSession bankId={bankId} chapterId={selectedChapter ?? chapterId} />;
}
