import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Check, X, Clock, ChevronRight, ChevronLeft, RotateCcw, Home, BookOpen, Languages, AlertCircle, Trophy, Zap, FileText, GraduationCap } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAppSettings } from "@/context/AppContext";
import { toTraditional } from "@/lib/chineseConv";
import { isChinese } from "@/lib/translate";
import { getEnDisplay, getEnOptions } from "@/lib/dict-translate";
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

// ========== Training Selector ==========
function TrainingSelector({ onSelect }: { onSelect: (id: number) => void }) {
  const navigate = useNavigate();
  const { data: banks } = trpc.bank.list.useQuery();
  const { data: records } = trpc.record.list.useQuery();

  const bankStats = useMemo(() => {
    return (banks || []).map((b) => {
      const recs = (records || []).filter((r) => r.bankId === b.id);
      const wrongCount = recs.filter((r) => !r.isCorrect).length;
      return { ...b, recCount: recs.length, wrongCount };
    });
  }, [banks, records]);

  const unpracticed = useMemo(() => bankStats.filter((b) => b.recCount === 0), [bankStats]);
  const inProgress = useMemo(() => bankStats.filter((b) => b.recCount > 0 && b.progress < 100), [bankStats]);
  const completed = useMemo(() => bankStats.filter((b) => b.progress >= 100), [bankStats]);
  const withMistakes = useMemo(() => bankStats.filter((b) => b.wrongCount > 0), [bankStats]);

  const totalWrong = useMemo(() => withMistakes.reduce((s, b) => s + b.wrongCount, 0), [withMistakes]);

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: "var(--page-bg)", overflowX: "hidden" }}>
      <ParticleBackground />
      <div style={{ position: "relative", zIndex: 1, padding: "16px", paddingBottom: "100px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ArrowLeft size={24} color="var(--text-primary)" />
          </button>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>开始训练</h1>
            <p style={{ fontSize: "13px", color: "var(--text-tertiary)", margin: "2px 0 0" }}>选择题库开始练习，或错题重练</p>
          </div>
        </div>

        {totalWrong > 0 && (
          <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/mistakes", { state: { mode: "wrong" } })}
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
              <div style={{ fontSize: "12px", color: "var(--text-primary)", marginTop: "2px" }}>共 {totalWrong} 道错题待复习</div>
            </div>
            <ChevronRight size={18} color="#ef4444" />
          </motion.button>
        )}

        <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/exam/setup")}
          style={{
            width: "100%", padding: "16px", borderRadius: "14px",
            background: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.03))",
            border: "1px solid rgba(245,158,11,0.2)", marginBottom: "16px",
            display: "flex", alignItems: "center", gap: "12px", cursor: "pointer",
          }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <GraduationCap size={22} color="#f59e0b" />
          </div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "#f59e0b" }}>模拟考试</div>
            <div style={{ fontSize: "12px", color: "var(--text-primary)", marginTop: "2px" }}>模拟真实考试环境，完成后查看解析</div>
          </div>
          <ChevronRight size={18} color="#f59e0b" />
        </motion.button>

        {/* Preset Mock Exam Entry */}
        <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/mock-exam/list")}
          style={{
            width: "100%", padding: "16px", borderRadius: "14px",
            background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.03))",
            border: "1px solid rgba(16,185,129,0.2)", marginBottom: "16px",
            display: "flex", alignItems: "center", gap: "12px", cursor: "pointer",
          }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FileText size={22} color="#10b981" />
          </div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "#10b981" }}>预设模拟卷</div>
            <div style={{ fontSize: "12px", color: "var(--text-primary)", marginTop: "2px" }}>自定义题目组成试卷，反复练习</div>
          </div>
          <ChevronRight size={18} color="#10b981" />
        </motion.button>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {inProgress.length > 0 && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: 500, color: "#00d4ff", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "8px", paddingLeft: "4px" }}>继续练习 · {inProgress.length}</div>
              {inProgress.map((b) => <BankCard key={b.id} bank={b} onSelect={onSelect} />)}
            </div>
          )}
          {unpracticed.length > 0 && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "8px", paddingLeft: "4px" }}>未练习 · {unpracticed.length}</div>
              {unpracticed.map((b) => <BankCard key={b.id} bank={b} onSelect={onSelect} />)}
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: 500, color: "#10b981", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "8px", paddingLeft: "4px" }}>已完成 · {completed.length}</div>
              {completed.map((b) => <BankCard key={b.id} bank={b} onSelect={onSelect} />)}
            </div>
          )}
        </div>

        {(!banks || banks.length === 0) && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <BookOpen size={56} color="#666" />
            <p style={{ color: "var(--text-tertiary)", marginTop: "16px", fontSize: "15px" }}>暂无题库</p>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/library")}
              style={{ marginTop: "20px", padding: "12px 28px", background: "#00d4ff", color: "var(--page-bg)", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
              前往导入题库
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}

function BankCard({ bank, onSelect }: { bank: { id: number; title: string; color: string; progress: number; questionsJson: string; chaptersJson: string | null; recCount: number; wrongCount: number }; onSelect: (id: number) => void }) {
  const chapters: ChapterInfo[] = useMemo(() => bank.chaptersJson ? JSON.parse(bank.chaptersJson) : [], [bank.chaptersJson]);
  const qCount = useMemo(() => { try { return JSON.parse(bank.questionsJson).length; } catch { return 0; } }, [bank.questionsJson]);

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(bank.id)}
      style={{
        background: "var(--card-bg)", borderRadius: "12px", padding: "14px 16px",
        border: "1px solid var(--border-color)", marginBottom: "8px",
        cursor: "pointer", display: "flex", alignItems: "center", gap: "12px",
        WebkitTapHighlightColor: "transparent",
        userSelect: "none",
      }}
    >
      <div style={{ width: "4px", height: "40px", borderRadius: "2px", background: bank.progress >= 100 ? "#10b981" : bank.color || "#00d4ff", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{bank.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "3px" }}>
          <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{qCount} 题</span>
          {chapters.length > 0 && <span style={{ fontSize: "11px", color: "var(--text-primary)" }}>{chapters.length} 章</span>}
          {bank.progress > 0 && bank.progress < 100 && (
            <>
              <div style={{ flex: 1, height: "3px", background: "var(--card-bg-secondary)", borderRadius: "2px", maxWidth: "80px" }}>
                <div style={{ width: `${bank.progress}%`, height: "100%", background: bank.color || "#00d4ff", borderRadius: "2px" }} />
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-primary)" }}>{bank.progress}%</span>
            </>
          )}
        </div>
      </div>
      {bank.wrongCount > 0 && <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "8px", background: "rgba(239,68,68,0.12)", color: "#ef4444", fontWeight: 500, flexShrink: 0 }}>{bank.wrongCount} 错题</span>}
      {bank.progress >= 100 && <Trophy size={16} color="#10b981" />}
      {bank.recCount === 0 && <Zap size={16} color="#00d4ff" />}
    </motion.div>
  );
}

// ========== Chapter Selector ==========
function ChapterSelector({ bankId, onSelectChapter }: { bankId: number; onSelectChapter: (chapterId?: number) => void }) {
  const navigate = useNavigate();
  const { data: bank } = trpc.bank.get.useQuery({ id: bankId });
  const { data: records } = trpc.record.listByBank.useQuery({ bankId });

  const allQuestions: Q[] = useMemo(() => bank ? JSON.parse(bank.questionsJson) : [], [bank?.questionsJson]);
  const chapters: ChapterInfo[] = useMemo(() => bank?.chaptersJson ? JSON.parse(bank.chaptersJson) : [], [bank?.chaptersJson]);

  // Per-chapter stats
  const chapterStats = useMemo(() => {
    return chapters.map((ch) => {
      const chRecs = (records || []).filter((r) => r.chapterId === ch.chapterId);
      const correct = chRecs.filter((r) => r.isCorrect).length;
      const wrong = chRecs.filter((r) => !r.isCorrect).length;
      return { ...ch, correct, wrong, totalInChapter: correct + wrong };
    });
  }, [chapters, records]);

  if (!bank) return (
    <div style={{ minHeight: "100dvh", background: "var(--page-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)" }}>加载中...</div>
  );

  // No chapters — skip directly
  if (chapters.length === 0) {
    onSelectChapter(undefined);
    return null;
  }

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: "var(--page-bg)", overflowX: "hidden" }}>
      <ParticleBackground />
      <div style={{ position: "relative", zIndex: 1, padding: "16px", paddingBottom: "100px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <button onClick={() => navigate("/training")} style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ArrowLeft size={24} color="var(--text-primary)" />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{bank.title}</h1>
            <p style={{ fontSize: "12px", color: "var(--text-tertiary)", margin: "2px 0 0" }}>选择章节开始练习</p>
          </div>
        </div>

        <motion.button whileTap={{ scale: 0.98 }}
          onClick={() => onSelectChapter(undefined)}
          style={{
            width: "100%", padding: "16px", borderRadius: "14px",
            background: "linear-gradient(135deg, #00d4ff20, #0077ff10)",
            border: "1px solid rgba(0,212,255,0.3)", marginBottom: "12px",
            cursor: "pointer", display: "flex", alignItems: "center", gap: "12px",
            WebkitTapHighlightColor: "transparent",
            userSelect: "none",
          }}
        >
          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(0,212,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <BookOpen size={22} color="#00d4ff" />
          </div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>全部章节</div>
            <div style={{ fontSize: "12px", color: "var(--text-primary)", marginTop: "2px" }}>{allQuestions.length} 题</div>
          </div>
          <ChevronRight size={18} color="#00d4ff" />
        </motion.button>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {chapterStats.map((ch, i) => (
            <motion.button key={ch.chapterId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.98 }} onClick={() => onSelectChapter(ch.chapterId)}
              style={{
                width: "100%", padding: "14px 16px", borderRadius: "12px",
                background: "var(--card-bg)", border: "1px solid var(--border-color)",
                cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px",
                WebkitTapHighlightColor: "transparent",
                userSelect: "none",
              }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: `${bank.color || "#00d4ff"}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FileText size={18} color={bank.color || "#00d4ff"} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }} title={ch.chapterName}>第{i + 1}章</div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "3px" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>{ch.questionCount} 题</span>
                  {ch.totalInChapter > 0 ? (
                    <>
                      <span style={{ fontSize: "11px", color: "#10b981" }}>{ch.correct} 正确</span>
                      {ch.wrong > 0 && <span style={{ fontSize: "11px", color: "#ef4444" }}>{ch.wrong} 错误</span>}
                    </>
                  ) : (
                    <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>未练习</span>
                  )}
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

// ========== Chapter Bar Component ==========
function ChapterBar({
  chapters,
  currentChapterId,
  onSelect,
  bankColor,
}: {
  chapters: ChapterInfo[];
  currentChapterId?: number;
  onSelect: (chapterId?: number) => void;
  bankColor: string;
}) {
  if (chapters.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: "6px",
        padding: "8px 16px",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        borderBottom: "1px solid var(--border-color)",
      }}
    >
      <button
        onClick={() => onSelect(undefined)}
        style={{
          padding: "6px 14px",
          borderRadius: "10px",
          fontSize: "12px",
          fontWeight: 600,
          border: "none",
          cursor: "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
          background: currentChapterId === undefined ? bankColor || "#00d4ff" : "var(--card-bg-secondary)",
          color: currentChapterId === undefined ? "var(--page-bg)" : "var(--text-primary)",
          transition: "all 0.2s",
          touchAction: "manipulation",
          userSelect: "none",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        全部
      </button>
      {chapters.map((ch, idx) => (
        <button
          key={ch.chapterId}
          onClick={() => onSelect(ch.chapterId)}
          title={ch.chapterName}
          style={{
            padding: "6px 14px",
            borderRadius: "10px",
            fontSize: "12px",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
            background: currentChapterId === ch.chapterId ? bankColor || "#00d4ff" : "var(--card-bg-secondary)",
            color: currentChapterId === ch.chapterId ? "var(--page-bg)" : "var(--text-primary)",
            transition: "all 0.2s",
            touchAction: "manipulation",
            userSelect: "none",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          第{idx + 1}章
        </button>
      ))}
    </div>
  );
}

// ========== Training Session ==========
function TrainingSession({ bankId: rawBankId, chapterId: initialChapterId }: { bankId: number; chapterId?: number }) {
  const navigate = useNavigate();
  const { settings, setSettings } = useAppSettings();
  const utils = trpc.useUtils();

  const { data: bankData } = trpc.bank.get.useQuery({ id: rawBankId });
  const { data: savedRecords } = trpc.record.listByBank.useQuery({ bankId: rawBankId });
  const addRecord = trpc.record.add.useMutation({
    onSuccess: () => {
      utils.record.list.invalidate();
      utils.record.listByBank.invalidate({ bankId: rawBankId });
      setSaveError("");
    },
    onError: (err) => {
      console.error("保存失败:", err);
      setSaveError("记录保存失败，请检查网络");
      // Auto clear error after 3s
      setTimeout(() => setSaveError(""), 3000);
    },
  });
  const upsertDaily = trpc.record.upsertDaily.useMutation();
  const updateProgress = trpc.bank.updateProgress.useMutation({ onSuccess: () => utils.bank.list.invalidate() });

  // Internal chapter state — allows switching chapters during practice
  const [activeChapterId, setActiveChapterId] = useState<number | undefined>(initialChapterId);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [startTime] = useState(Date.now());
  const [qStartTime, setQStartTime] = useState(Date.now());
  const [swipeDir, setSwipeDir] = useState<"left" | "right" | null>(null);
  const restoredRef = useRef(false);
  const [saveError, setSaveError] = useState("");

  // Memoize parsed questions to avoid re-parsing on every render
  const allQuestions: Q[] = useMemo(() => bankData ? JSON.parse(bankData.questionsJson) : [], [bankData?.questionsJson]);
  const chapters: ChapterInfo[] = useMemo(() => bankData?.chaptersJson ? JSON.parse(bankData.chaptersJson) : [], [bankData?.chaptersJson]);

  // Filter by active chapter
  const questions: Q[] = useMemo(() =>
    activeChapterId ? allQuestions.filter((q) => q.chapterId === activeChapterId) : allQuestions,
    [allQuestions, activeChapterId]
  );

  const lang = settings.questionLanguage;

  // Auto-translation for EN/EN+繁 modes
  const [transCache, setTransCache] = useState<Record<number, { enQuestion: string; enOptions: string[] }>>({});
  const [translatingIds, setTranslatingIds] = useState<Set<number>>(new Set());
  const translateMutation = trpc.translate.batchTranslate.useMutation();
  const llmTranslateMutation = trpc.translate.llmTranslate.useMutation();
  const updateBankMutation = trpc.bank.updateQuestions.useMutation();

  // Auto-translate questions without EN data
  useEffect(() => {
    if (lang !== "entc" && lang !== "en") return;
    if (!bankData) return;

    const needsTranslation = questions.filter((q) => {
      if (!isChinese(q.question)) return false;
      if (q.enQuestion && !isChinese(q.enQuestion)) return false;
      if (transCache[q.id]) return false;
      if (translatingIds.has(q.id)) return false;
      return true;
    });

    if (needsTranslation.length === 0) return;

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

          // Save translated questions back to DB
          if (bankData && batch.length > 0) {
            const allQs = JSON.parse(bankData.questionsJson);
            const updatedQs = allQs.map((q: any) => {
              if (newTransCache[q.id]) {
                return { ...q, ...newTransCache[q.id], tcQuestion: toTraditional(q.question), tcOptions: q.options.map((o: string) => toTraditional(o)) };
              }
              return q;
            });
            updateBankMutation.mutate({ id: rawBankId, questionsJson: JSON.stringify(updatedQs) });
          }
        })
        .catch(() => {
          const llmTexts = batch.flatMap((q) => [q.question, ...q.options]);
          llmTranslateMutation.mutateAsync({ texts: llmTexts }).then((llmResult) => {
            const results = llmResult.results;
            const newTransCache: Record<number, { enQuestion: string; enOptions: string[] }> = {};
            let idx = 0;
            batch.forEach((q) => {
              const optCount = q.options.length;
              const enQuestion = results[idx] || `[EN] ${q.question}`;
              const enOptions = results.slice(idx + 1, idx + 1 + optCount);
              while (enOptions.length < optCount) enOptions.push(`[EN] ${q.options[enOptions.length]}`);
              newTransCache[q.id] = { enQuestion, enOptions };
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
              updateBankMutation.mutate({ id: rawBankId, questionsJson: JSON.stringify(updatedQs) });
            }
          }).catch(() => {
            setTransCache((prev) => {
              const next = { ...prev };
              batch.forEach((q) => { next[q.id] = { enQuestion: `[EN] ${q.question}`, enOptions: q.options.map((o) => `[EN] ${o}`) }; });
              return next;
            });
          });
        })
        .finally(() => {
          setTranslatingIds((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.delete(id));
            return next;
          });
        });
    }
  }, [questions, lang, transCache, translatingIds, bankData, rawBankId]);

  // Switch chapter and reset state
  const handleSwitchChapter = useCallback((chapterId?: number) => {
    setActiveChapterId(chapterId);
    setCurrentIndex(0);
    setAnswers([]);
    setShowSummary(false);
    restoredRef.current = false;
  }, []);

  // Restore saved progress
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
  // Depend on both chapter and question count to re-run on chapter switch
  }, [activeChapterId, questions.length, savedRecords]);

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

  // Auto-submit helper: if current multi-select has selections but not submitted, submit it
  const autoSubmitIfNeeded = useCallback(() => {
    if (!currentQuestion || !currentAnswer) return false;
    if (currentAnswer.submitted) return false;
    if (currentAnswer.selected.length === 0) return false;
    // Only auto-submit for multi-select; single-select auto-submits on select
    if (currentQuestion.type !== "multiple") return false;
    submitAnswer(currentAnswer.selected);
    return true;
  }, [currentQuestion, currentAnswer, submitAnswer]);

  const handleNext = useCallback(() => {
    // Auto-submit current multi-select if needed before navigating
    autoSubmitIfNeeded();

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
  }, [currentIndex, questions.length, answers, rawBankId, allQuestions.length, updateProgress, upsertDaily, autoSubmitIfNeeded]);

  const handlePrev = useCallback(() => {
    autoSubmitIfNeeded();
    if (currentIndex > 0) { setSwipeDir("right"); setCurrentIndex((p) => p - 1); }
  }, [currentIndex, autoSubmitIfNeeded]);

  // Swipe — only horizontal, require minimum distance, prevent default on horizontal swipe
  const tsX = useRef<number | null>(null);
  const tsY = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    tsX.current = e.touches[0].clientX;
    tsY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (tsX.current === null || tsY.current === null) return;
    const dx = e.changedTouches[0].clientX - tsX.current;
    const dy = e.changedTouches[0].clientY - tsY.current;
    // Only trigger if horizontal movement is dominant and significant
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) handlePrev(); else handleNext();
    }
    tsX.current = null;
    tsY.current = null;
  };

  const totalQuestions = questions.length;
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;
  const submittedAnswers = answers.filter((a) => a.submitted);
  const correctCount = submittedAnswers.filter((a) => a.isCorrect).length;
  const wrongCount = submittedAnswers.filter((a) => !a.isCorrect).length;
  const accuracy = submittedAnswers.length > 0 ? Math.round((correctCount / submittedAnswers.length) * 100) : 0;
  const totalTime = Math.round((Date.now() - startTime) / 1000);

  if (!bankData || questions.length === 0) {
    return <div style={{ minHeight: "100dvh", background: "var(--page-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)" }}>加载中...</div>;
  }

  // Use auto-translated text with client-side dictionary fallback
  const autoTrans = currentQuestion ? transCache[currentQuestion.id] : null;
  const enQ = currentQuestion ? getEnDisplay(currentQuestion.question, currentQuestion.enQuestion, autoTrans?.enQuestion) : "";
  const enO = currentQuestion ? getEnOptions(currentQuestion.options, currentQuestion.enOptions, autoTrans?.enOptions) : [];

  const displayQuestion = (() => {
    if (!currentQuestion) return "";
    switch (lang) {
      case "en": return enQ;
      case "tc": return toTraditional(currentQuestion.question);
      case "entc": return enQ;
      default: return currentQuestion.question;
    }
  })();
  const displayOptions: string[] = (() => {
    if (!currentQuestion) return [];
    switch (lang) {
      case "en": return enO;
      case "tc": return currentQuestion.options.map((o) => toTraditional(o));
      case "entc": return enO;
      default: return currentQuestion.options;
    }
  })();
  // For entc mode, also prepare the traditional Chinese secondary display
  const secondaryQuestion = lang === "entc" ? toTraditional(currentQuestion?.question || "") : undefined;
  const secondaryOptions = lang === "entc" ? currentQuestion?.options.map((o) => toTraditional(o)) : undefined;
  const typeLabel = { single: "单选题", multiple: "多选题", boolean: "判断题", fill: "填空题" }[currentQuestion?.type || "single"];
  const langMap: Record<string, string> = { zh: "中", en: "EN", both: "中英", tc: "繁", entc: "EN+繁" };
  const langLabelText = langMap[lang] || "EN+繁";

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: "var(--page-bg)" }}>
      <ParticleBackground />
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Top Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", paddingTop: "max(12px, env(safe-area-inset-top))", borderBottom: "1px solid var(--border-color)" }}>
          <button onClick={() => navigate("/training")} style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ArrowLeft size={24} color="var(--text-primary)" />
          </button>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)", flex: 1, textAlign: "center", margin: "0 8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {bankData.title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => {
                const langs: Array<"entc" | "zh" | "en" | "both" | "tc"> = ["entc", "zh", "en", "both", "tc"];
                const idx = langs.indexOf(lang as "entc" | "zh" | "en" | "both" | "tc");
                setSettings({ questionLanguage: langs[(idx + 1) % langs.length] });
              }}
              style={{
                display: "flex", alignItems: "center", gap: "4px",
                background: "rgba(0,212,255,0.15)", border: "1px solid rgba(0,212,255,0.3)",
                borderRadius: "8px", padding: "6px 10px", color: "#00d4ff",
                fontSize: "12px", fontWeight: 600, cursor: "pointer",
                minHeight: "32px", touchAction: "manipulation",
                userSelect: "none", WebkitTapHighlightColor: "transparent",
              }}
            >
              <Languages size={14} /> {langLabelText}
            </button>
            <span style={{ fontSize: "12px", color: "var(--text-primary)" }}>{currentIndex + 1} / {totalQuestions}</span>
          </div>
        </div>

        {/* Save Error Toast */}
        {saveError && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", padding: "8px 16px", textAlign: "center", fontSize: "13px", color: "#ef4444", fontWeight: 500 }}>
            {saveError}
          </motion.div>
        )}

        {/* Progress Bar */}
        <div style={{ width: "100%", height: "3px", background: "var(--card-bg-secondary)" }}>
          <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} style={{ height: "100%", background: "#00d4ff" }} />
        </div>

        {/* Chapter Switcher */}
        {chapters.length > 0 && (
          <ChapterBar
            chapters={chapters}
            currentChapterId={activeChapterId}
            onSelect={handleSwitchChapter}
            bankColor={bankData.color || "#00d4ff"}
          />
        )}

        {/* Mini Navigator */}
        <div style={{ display: "flex", gap: "5px", padding: "10px 16px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          {answers.map((ans, idx) => {
            let bg = "var(--card-bg-secondary)", border = "1px solid transparent";
            if (idx === currentIndex) { bg = "#00d4ff"; border = "1px solid #00d4ff"; }
            else if (ans.submitted) { bg = ans.isCorrect ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"; border = ans.isCorrect ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(239,68,68,0.4)"; }
            return (
              <button key={idx} onClick={() => { setSwipeDir(idx > currentIndex ? "left" : "right"); setCurrentIndex(idx); }}
                style={{
                  width: "32px", height: "32px", borderRadius: "8px", background: bg, border,
                  color: idx === currentIndex ? "var(--page-bg)" : ans.submitted ? (ans.isCorrect ? "#10b981" : "#ef4444") : "var(--text-tertiary)",
                  fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, cursor: "pointer", WebkitTapHighlightColor: "transparent", userSelect: "none",
                }}>
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Question + Options */}
        <div style={{ padding: "0 16px calc(140px + env(safe-area-inset-bottom))", userSelect: "none", WebkitUserSelect: "none" }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <motion.div key={currentIndex} custom={swipeDir}
            initial={{ opacity: 0, x: swipeDir === "left" ? 80 : swipeDir === "right" ? -80 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: swipeDir === "left" ? -80 : 80 }}
            transition={{ duration: 0.25 }}>
            {/* Question Card */}
            <div style={{ background: "var(--card-bg)", borderRadius: "16px", padding: "20px", border: "1px solid var(--border-color)", marginBottom: "16px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "4px 12px", borderRadius: "8px", background: "rgba(0,212,255,0.15)", color: "#00d4ff", fontSize: "12px", fontWeight: 500, marginBottom: "12px" }}>
                {typeLabel}
                {currentQuestion?.chapterId !== undefined && (
                  <span style={{ opacity: 0.7 }}>
                    第{chapters.findIndex((c) => c.chapterId === currentQuestion.chapterId) + 1}章
                  </span>
                )}
                {currentAnswer?.submitted && <span style={{ color: currentAnswer.isCorrect ? "#10b981" : "#ef4444" }}>{currentAnswer.isCorrect ? " ✓ 正确" : " ✗ 错误"}</span>}
              </div>
              <div style={{ fontSize: "18px", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.6, whiteSpace: "pre-wrap", userSelect: "text", WebkitUserSelect: "text" }}>{displayQuestion}</div>
              {lang === "both" && <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border-color)", fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.6, userSelect: "text", WebkitUserSelect: "text" }}>{enQ}</div>}
              {lang === "entc" && secondaryQuestion && <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--border-color)", fontSize: "16px", color: "var(--text-primary)", lineHeight: 1.6, userSelect: "text", WebkitUserSelect: "text" }}>{secondaryQuestion}</div>}
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {displayOptions.map((option, index) => {
                const isSelected = currentAnswer?.selected.includes(index) ?? false;
                const isCorrect = currentQuestion?.correct.includes(index) ?? false;
                const submitted = currentAnswer?.submitted ?? false;
                let borderColor = "var(--border-color)", bgColor = "var(--card-bg-secondary)", circleColor = "var(--text-tertiary)";
                if (submitted) {
                  if (isCorrect) { borderColor = "#10b981"; bgColor = "rgba(16,185,129,0.1)"; circleColor = "#10b981"; }
                  else if (isSelected && !isCorrect) { borderColor = "#ef4444"; bgColor = "rgba(239,68,68,0.1)"; circleColor = "#ef4444"; }
                } else if (isSelected) { borderColor = "#00d4ff"; bgColor = "rgba(0,212,255,0.1)"; circleColor = "#00d4ff"; }
                return (
                  <motion.button key={`${currentIndex}-${index}`} whileTap={!submitted ? { scale: 0.98 } : undefined} onClick={() => handleSelect(index)}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: "12px", padding: "16px", borderRadius: "12px",
                      background: bgColor, border: `1.5px solid ${borderColor}`, cursor: submitted ? "default" : "pointer",
                      textAlign: "left", width: "100%", minHeight: "48px",
                      WebkitTapHighlightColor: "transparent", userSelect: "none", touchAction: "manipulation",
                    }}>
                    <div style={{ width: "22px", height: "22px", borderRadius: currentQuestion?.type === "multiple" ? "4px" : "50%", border: `2px solid ${circleColor}`, background: isSelected ? circleColor : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                      {isSelected && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>{currentQuestion?.type === "multiple" ? <Check size={14} color="#1a1a1a" strokeWidth={3} /> : <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#1a1a1a" }} />}</motion.div>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: "16px", color: "var(--text-primary)", lineHeight: 1.5, userSelect: "text", WebkitUserSelect: "text" }}>{option}</span>
                      {lang === "both" && currentQuestion?.enOptions?.[index] && <div style={{ fontSize: "13px", color: "var(--text-primary)", marginTop: "4px", userSelect: "text", WebkitUserSelect: "text" }}>{currentQuestion.enOptions[index]}</div>}
                      {lang === "entc" && secondaryOptions?.[index] && <div style={{ fontSize: "15px", color: "var(--text-primary)", marginTop: "4px", userSelect: "text", WebkitUserSelect: "text" }}>{secondaryOptions[index]}</div>}
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
                style={{
                  marginTop: "16px", width: "100%", padding: "14px", borderRadius: "12px",
                  background: currentAnswer?.selected.length ? "#00d4ff" : "var(--card-bg-secondary)",
                  color: currentAnswer?.selected.length ? "var(--page-bg)" : "var(--text-tertiary)", fontSize: "15px", fontWeight: 600,
                  border: "none", cursor: currentAnswer?.selected.length ? "pointer" : "not-allowed",
                  minHeight: "48px", touchAction: "manipulation",
                }}>
                确认提交 ({currentAnswer?.selected.length || 0}项已选)
              </motion.button>
            )}

            {/* Explanation */}
            {currentAnswer?.submitted && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} transition={{ duration: 0.3 }} style={{ overflow: "hidden", marginTop: "16px" }}>
                <div style={{ background: currentAnswer.isCorrect ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${currentAnswer.isCorrect ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`, borderRadius: "12px", padding: "16px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: currentAnswer.isCorrect ? "#10b981" : "#ef4444", marginBottom: "6px" }}>
                    {currentAnswer.isCorrect ? "回答正确！" : "回答错误"}
                    {!currentAnswer.isCorrect && <span style={{ fontWeight: 400, fontSize: "13px", color: "var(--text-primary)", marginLeft: "8px" }}>正确答案: {currentQuestion?.correct.map((c) => String.fromCharCode(65 + c)).join(", ")}</span>}
                  </div>
                  <div style={{ fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.6, userSelect: "text", WebkitUserSelect: "text" }}>{currentQuestion?.explanation}</div>
                </div>
              </motion.div>
            )}
          </motion.div>

          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", marginTop: "20px", fontSize: "12px", color: "var(--text-tertiary)" }}>
            <ChevronLeft size={14} /><span>左右滑动切换题目</span><ChevronRight size={14} />
          </div>
        </div>

        {/* Bottom Nav */}
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
          padding: "12px 16px", paddingBottom: "max(16px, env(safe-area-inset-bottom))",
          background: "var(--nav-bg)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid var(--border-color)", display: "flex", gap: "12px",
        }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handlePrev} disabled={currentIndex === 0}
            style={{
              flex: 1, padding: "14px", borderRadius: "12px", background: "var(--card-bg-secondary)",
              color: currentIndex === 0 ? "var(--text-tertiary)" : "var(--text-primary)", fontSize: "14px", fontWeight: 500,
              border: "none", cursor: currentIndex === 0 ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              minHeight: "48px", touchAction: "manipulation", userSelect: "none",
            }}>
            <ChevronLeft size={18} /> 上一题
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleNext}
            style={{
              flex: 1, padding: "14px", borderRadius: "12px", background: "#00d4ff",
              color: "var(--page-bg)", fontSize: "14px", fontWeight: 600, border: "none",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              minHeight: "48px", touchAction: "manipulation", userSelect: "none",
            }}>
            {currentIndex < totalQuestions - 1 ? <>下一题 <ChevronRight size={18} /></> : <>完成练习 <ChevronRight size={18} /></>}
          </motion.button>
        </div>
      </div>

      {/* Summary Modal */}
      {showSummary && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 20 }}
            style={{ background: "var(--card-bg)", borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "500px", border: "1px solid var(--border-color)" }}>
            <h2 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", textAlign: "center", margin: "0 0 20px 0" }}>练习完成！</h2>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
              <div style={{ width: "140px", height: "140px", borderRadius: "50%", border: "6px solid #2a2a2a", borderTopColor: accuracy >= 80 ? "#10b981" : accuracy >= 60 ? "#00d4ff" : "#ef4444", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: "rotate(-90deg)" }}>
                <div style={{ transform: "rotate(90deg)", textAlign: "center" }}>
                  <div style={{ fontSize: "36px", fontWeight: 700, color: "var(--text-primary)" }}>{accuracy}%</div>
                  <div style={{ fontSize: "12px", color: "var(--text-primary)" }}>正确率</div>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
              <div style={{ textAlign: "center", background: "var(--card-bg-secondary)", borderRadius: "10px", padding: "12px" }}><div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>{totalQuestions}</div><div style={{ fontSize: "12px", color: "var(--text-primary)" }}>总题数</div></div>
              <div style={{ textAlign: "center", background: "rgba(16,185,129,0.1)", borderRadius: "10px", padding: "12px", border: "1px solid rgba(16,185,129,0.2)" }}><div style={{ fontSize: "20px", fontWeight: 700, color: "#10b981" }}>{correctCount}</div><div style={{ fontSize: "12px", color: "var(--text-primary)" }}>正确数</div></div>
              <div style={{ textAlign: "center", background: "rgba(239,68,68,0.1)", borderRadius: "10px", padding: "12px", border: "1px solid rgba(239,68,68,0.2)" }}><div style={{ fontSize: "20px", fontWeight: 700, color: "#ef4444" }}>{wrongCount}</div><div style={{ fontSize: "12px", color: "var(--text-primary)" }}>错误数</div></div>
              <div style={{ textAlign: "center", background: "var(--card-bg-secondary)", borderRadius: "10px", padding: "12px" }}><div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}><Clock size={16} /> {Math.floor(totalTime / 60)}:{String(totalTime % 60).padStart(2, "0")}</div><div style={{ fontSize: "12px", color: "var(--text-primary)" }}>用时</div></div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => { setCurrentIndex(0); setAnswers(questions.map(() => ({ selected: [], submitted: false }))); setShowSummary(false); restoredRef.current = false; }}
                style={{ padding: "14px", borderRadius: "12px", background: "#00d4ff", color: "var(--page-bg)", fontSize: "14px", fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", minHeight: "48px", touchAction: "manipulation" }}>
                <RotateCcw size={16} /> 再来一组
              </motion.button>
              <div style={{ display: "flex", gap: "10px" }}>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/")} style={{ flex: 1, padding: "14px", borderRadius: "12px", background: "var(--card-bg-secondary)", color: "var(--text-primary)", fontSize: "14px", border: "none", cursor: "pointer", minHeight: "48px", touchAction: "manipulation" }}><Home size={16} /> 首页</motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/training")} style={{ flex: 1, padding: "14px", borderRadius: "12px", background: "var(--card-bg-secondary)", color: "var(--text-primary)", fontSize: "14px", border: "none", cursor: "pointer", minHeight: "48px", touchAction: "manipulation" }}><BookOpen size={16} /> 换题库</motion.button>
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
  const navigate = useNavigate();
  const navState = location.state as { bankId?: number; chapterId?: number } | null;
  const bankId = navState?.bankId;
  const chapterId = navState?.chapterId;

  // Persist selectedChapter in sessionStorage for page refresh
  const [selectedChapter, setSelectedChapter] = useState<number | undefined>(() => {
    const saved = sessionStorage.getItem("zenith-training-chapter");
    return saved ? Number(saved) : chapterId;
  });

  // Persist to sessionStorage when changed
  useEffect(() => {
    if (selectedChapter !== undefined) {
      sessionStorage.setItem("zenith-training-chapter", String(selectedChapter));
    } else {
      sessionStorage.removeItem("zenith-training-chapter");
    }
  }, [selectedChapter]);

  // Wrap navigate in useCallback to pass to TrainingSelector
  const handleSelectBank = useCallback((id: number) => {
    navigate("/training", { state: { bankId: id } });
  }, [navigate]);

  if (!bankId) return <TrainingSelector onSelect={handleSelectBank} />;

  // If no chapter selected yet, show chapter selector first
  if (selectedChapter === undefined && chapterId === undefined) {
    return <ChapterSelector bankId={bankId} onSelectChapter={(chId) => setSelectedChapter(chId)} />;
  }

  return <TrainingSession bankId={bankId} chapterId={selectedChapter ?? chapterId} />;
}
