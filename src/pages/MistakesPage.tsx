import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, XCircle, CheckCircle, ChevronLeft, ChevronRight, RotateCcw, Filter, AlertCircle, BookOpen, Clock, Languages, Globe, Trash2, Check, X } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAppSettings } from "@/context/AppContext";
import { toTraditional } from "@/lib/chineseConv";
import { isChinese } from "@/lib/translate";
import { getEnDisplay, getEnOptions, mymemoryBatchTranslate } from "@/lib/dict-translate";
import ParticleBackground from "@/components/ParticleBackground";

type LangMode = "en" | "tc" | "sc" | "entc";

const LANG_LABELS: Record<LangMode, string> = { en: "EN", tc: "繁體", sc: "简体", entc: "EN+繁" };

function LanguageSwitcher({ current, onChange }: { current: LangMode; onChange: (m: LangMode) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{ background: "var(--card-bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "4px 10px", fontSize: "11px", fontWeight: 600, color: "var(--accent-color)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
        <Languages size={11} /> {LANG_LABELS[current]}
      </button>
      {open && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} style={{ position: "absolute", top: "30px", right: 0, background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "4px", zIndex: 50, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", minWidth: "80px" }}>
          {(Object.keys(LANG_LABELS) as LangMode[]).map((mode) => (
            <button key={mode} onClick={() => { onChange(mode); setOpen(false); }} style={{ width: "100%", padding: "6px 12px", borderRadius: "6px", background: current === mode ? "var(--accent-color)" : "transparent", color: current === mode ? "#fff" : "var(--text-primary)", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
              {LANG_LABELS[mode]}
            </button>
          ))}
        </motion.div>
      )}
      {open && <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />}
    </div>
  );
}

export default function MistakesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const mode = (location.state as { mode?: "wrong" | "correct" } | null)?.mode || "wrong";
  const isWrongMode = mode === "wrong";

  const utils = trpc.useUtils();
  const { data: records } = trpc.record.list.useQuery();
  const { data: banks } = trpc.bank.list.useQuery();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterBankId, setFilterBankId] = useState<number | null>(null);

  // ── Re-practice mode ──────────────────────────────
  const [practiceMode, setPracticeMode] = useState(false);
  // key = `${bankId}-${questionId}` → latest re-practice result this session
  const [answeredMap, setAnsweredMap] = useState<Record<string, { selected: number[]; isCorrect: boolean }>>({});
  const [multiSel, setMultiSel] = useState<Record<string, number[]>>({});
  const qStartRef = useRef<number>(Date.now());
  const dirtyRef = useRef(false); // whether any new record was written this visit

  const addRecord = trpc.record.add.useMutation({
    onSuccess: () => { dirtyRef.current = true; },
  });
  const clearWrong = trpc.record.clearWrong.useMutation({
    onSuccess: () => {
      utils.record.list.invalidate();
      setCurrentIndex(0);
      setAnsweredMap({});
      setMultiSel({});
    },
  });

  // Refresh the record list when leaving so re-answered questions update everywhere
  useEffect(() => {
    return () => { if (dirtyRef.current) utils.record.list.invalidate(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { qStartRef.current = Date.now(); }, [currentIndex, filterBankId]);

  // Clamp index when the filtered list shrinks (e.g. after clearing)

  const targetRecords = useMemo(() => {
    type Rec = NonNullable<typeof records>[number];
    const latest = new Map<string, Rec>();
    for (const r of records || []) {
      if (isWrongMode ? !r.isCorrect : r.isCorrect) {
        const key = `${r.bankId}-${r.questionId}`;
        const ex = latest.get(key);
        if (!ex || r.createdAt.getTime() > ex.createdAt.getTime()) latest.set(key, r);
      }
    }
    return Array.from(latest.values());
  }, [records, isWrongMode]);

  const bankOptions = useMemo(() => {
    const ids = new Set(targetRecords.map((r) => r.bankId));
    return (banks || []).filter((b) => ids.has(b.id));
  }, [targetRecords, banks]);

  const filtered = useMemo(() => filterBankId ? targetRecords.filter((r) => r.bankId === filterBankId) : targetRecords, [targetRecords, filterBankId]);
  const current = filtered[currentIndex];
  const currentBankId = current?.bankId || 0;
  const { data: fullBank } = trpc.bank.get.useQuery(
    { id: currentBankId },
    { enabled: !!currentBankId },
  );
  const bank = current ? (fullBank || banks?.find((b) => b.id === current.bankId)) : null;
  // Memoize parsed questions to avoid re-parsing on every render
  const bankQuestions = useMemo(() => {
    if (!bank?.questionsJson) return [];
    try { return JSON.parse(bank.questionsJson) as Array<{ id: number; question: string; options: string[]; correct: number[]; explanation: string }>; }
    catch { return []; }
  }, [bank?.questionsJson]);
  const question = current ? bankQuestions.find((q) => q.id === current.questionId) : null;
  const { settings, setSettings } = useAppSettings();
  const langMode = settings.questionLanguage as "en" | "tc" | "sc" | "entc";

  // Auto-translation for EN/EN+繁 modes
  const [transCache, setTransCache] = useState<Record<string, { enQuestion: string; enOptions: string[] }>>({});
  const translateMutation = trpc.translate.batchTranslate.useMutation();
  const qKey = question && current ? `${current.bankId}-${question.id}` : "";
  const autoTrans = qKey ? transCache[qKey] : null;

  // Trigger auto-translation when needed
  useMemo(() => {
    if (!question || !qKey) return;
    if (langMode !== "entc" && langMode !== "en") return;
    if ((question as any).enQuestion) return; // Already has EN
    if (autoTrans) return; // Already translated
    if (!isChinese(question.question)) return; // Not Chinese

    const texts = [question.question, ...question.options];
    translateMutation.mutateAsync({ texts, from: "zh-CN", to: "en" }).then(async (result) => {
      const r = result.results;
      const hasUntranslated = r.some((t) => t?.startsWith("[EN]"));
      let final = r;
      if (hasUntranslated) {
        try { final = (await mymemoryBatchTranslate(texts)).map((m, i) => m ?? r[i]); } catch { /* */ }
      }
      setTransCache((prev) => ({ ...prev, [qKey]: { enQuestion: final[0] || question.question, enOptions: final.slice(1, 1 + question.options.length) } }));
    }).catch(async () => {
      try {
        const memResults = await mymemoryBatchTranslate(texts);
        setTransCache((prev) => ({ ...prev, [qKey]: { enQuestion: memResults[0] || `[EN] ${question.question}`, enOptions: memResults.slice(1, 1 + question.options.length).map((o) => o || "") } }));
      } catch {
        setTransCache((prev) => ({ ...prev, [qKey]: { enQuestion: `[EN] ${question.question}`, enOptions: question.options.map((o: string) => `[EN] ${o}`) } }));
      }
    });
  }, [qKey, question, langMode, autoTrans]);

  // Compute display text based on langMode
  const displayQ = question ? getEnDisplay(question.question, (question as any).enQuestion, autoTrans?.enQuestion) : "";
  const displayO = question ? getEnOptions(question.options, (question as any).enOptions, autoTrans?.enOptions) : [];
  const displayQuestion = question
    ? langMode === "en"
      ? displayQ
      : langMode === "tc"
        ? toTraditional(question.question)
        : langMode === "entc"
          ? displayQ
          : question.question
    : "";
  const displayOptions = question
    ? langMode === "en"
      ? displayO
      : langMode === "tc"
        ? question.options.map((opt: string) => toTraditional(opt))
        : langMode === "entc"
          ? displayO
          : question.options
    : [];
  // Sub-line for EN+繁 mode
  const subQuestion = question && langMode === "entc"
    ? ((question as any).tcQuestion || toTraditional(question.question))
    : "";
  const subOptions = question && langMode === "entc"
    ? (((question as any).tcOptions || question.options.map((o: string) => toTraditional(o))) as string[])
    : undefined;
  const showSub = langMode === "entc" && subQuestion && subQuestion !== displayQuestion;

  const handlePrev = () => { if (currentIndex > 0) setCurrentIndex((p) => p - 1); };
  const handleNext = () => { if (currentIndex < filtered.length - 1) setCurrentIndex((p) => p + 1); };

  // Swipe gesture - horizontal only
  const tsX = useRef<number | null>(null);
  const tsY = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => { tsX.current = e.touches[0].clientX; tsY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (tsX.current === null || tsY.current === null) return;
    const dx = e.changedTouches[0].clientX - tsX.current;
    const dy = e.changedTouches[0].clientY - tsY.current;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) handlePrev(); else handleNext();
    }
    tsX.current = null; tsY.current = null;
  };
  const formatDate = (ts: Date | number) => { const d = new Date(ts); return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

  // Clamp index when the filtered list shrinks (e.g. after clearing records)
  useEffect(() => {
    if (filtered.length > 0 && currentIndex >= filtered.length) setCurrentIndex(filtered.length - 1);
  }, [filtered.length, currentIndex]);

  // ── Re-practice handlers ──────────────────────────
  const currentKey = current ? `${current.bankId}-${current.questionId}` : "";
  const practiceAnswer = currentKey ? answeredMap[currentKey] : undefined;

  const submitPractice = useCallback((selected: number[]) => {
    if (!current || !question || !currentKey) return;
    const correct = question.correct.length === selected.length && question.correct.every((c) => selected.includes(c));
    setAnsweredMap((prev) => ({ ...prev, [currentKey]: { selected, isCorrect: correct } }));
    addRecord.mutate({
      bankId: current.bankId,
      questionId: current.questionId,
      chapterId: (current as { chapterId?: number }).chapterId ?? undefined,
      chapterName: (current as { chapterName?: string }).chapterName ?? undefined,
      selected,
      isCorrect: correct,
      timeSpent: Date.now() - qStartRef.current,
    });
  }, [current, question, currentKey, addRecord]);

  const handlePracticeSelect = useCallback((idx: number) => {
    if (!practiceMode || !current || !question || practiceAnswer) return;
    const qType = (question as { type?: string }).type || "single";
    if (qType === "multiple") {
      setMultiSel((prev) => {
        const cur = prev[currentKey] || [];
        return { ...prev, [currentKey]: cur.includes(idx) ? cur.filter((i) => i !== idx) : [...cur, idx] };
      });
    } else {
      submitPractice([idx]);
    }
  }, [practiceMode, current, question, practiceAnswer, currentKey, submitPractice]);

  const handleClearWrong = useCallback(() => {
    const scope = filterBankId ? "当前题库" : "全部题库";
    if (window.confirm(`确定清空${scope}的错题记录吗？此操作不可恢复。`)) {
      clearWrong.mutate({ bankId: filterBankId ?? undefined });
    }
  }, [filterBankId, clearWrong]);

  if (targetRecords.length === 0) {
    const themeColor = isWrongMode ? "#ef4444" : "#10b981";
    return (
      <div style={{ position: "relative", minHeight: "100vh", background: "var(--page-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ParticleBackground />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          <AlertCircle size={64} color="#666" />
          <p style={{ color: "var(--text-secondary)", marginTop: "16px" }}>{isWrongMode ? "暂无错题记录" : "暂无正确记录"}</p>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/library")} style={{ marginTop: "24px", padding: "12px 28px", background: themeColor, color: "var(--text-primary)", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>前往题库</motion.button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "var(--page-bg)" }}>
      <ParticleBackground />
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", paddingTop: "max(12px, env(safe-area-inset-top))", borderBottom: "1px solid var(--border-color)" }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}><ArrowLeft size={24} color="var(--text-primary)" /></button>
          <div style={{ fontSize: "17px", fontWeight: 600, color: "var(--text-primary)" }}>{isWrongMode ? "错题回顾" : "正确回顾"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <LanguageSwitcher current={langMode} onChange={(mode) => setSettings({ questionLanguage: mode })} />
            <div style={{ fontSize: "13px", color: isWrongMode ? "#ef4444" : "#10b981", fontWeight: 600 }}>{currentIndex + 1} / {filtered.length}</div>
          </div>
        </div>
        <div style={{ width: "100%", height: "3px", background: "var(--card-bg-secondary)" }}><motion.div animate={{ width: `${filtered.length > 0 ? ((currentIndex + 1) / filtered.length) * 100 : 0}%` }} transition={{ duration: 0.3 }} style={{ height: "100%", background: isWrongMode ? "#ef4444" : "#10b981" }} /></div>

        {/* Mode toolbar: review / re-practice + clear */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px 0" }}>
          <div style={{ display: "flex", background: "var(--card-bg-secondary)", borderRadius: "10px", padding: "3px", flex: 1 }}>
            {([{ key: false, label: "回顾模式" }, { key: true, label: "重练模式" }] as const).map((opt) => (
              <button key={opt.label}
                onClick={() => setPracticeMode(opt.key)}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: "8px", border: "none", cursor: "pointer",
                  fontSize: "13px", fontWeight: 600,
                  background: practiceMode === opt.key ? (isWrongMode ? "#ef4444" : "#10b981") : "transparent",
                  color: practiceMode === opt.key ? "var(--page-bg)" : "var(--text-secondary)",
                  transition: "all 0.2s", WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
                }}>
                {opt.label}
              </button>
            ))}
          </div>
          {isWrongMode && (
            <button onClick={handleClearWrong}
              style={{
                display: "flex", alignItems: "center", gap: "4px", padding: "8px 12px",
                borderRadius: "10px", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)",
                color: "#ef4444", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                whiteSpace: "nowrap", WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
              }}>
              <Trash2 size={13} /> 清空错题
            </button>
          )}
        </div>

        {/* Filter */}
        {bankOptions.length > 1 && (
          <div style={{ padding: "10px 16px", display: "flex", gap: "8px", overflowX: "auto" }}>
            <button onClick={() => { setFilterBankId(null); setCurrentIndex(0); }} style={{ padding: "5px 12px", borderRadius: "16px", fontSize: "12px", border: "none", cursor: "pointer", whiteSpace: "nowrap", background: filterBankId === null ? (isWrongMode ? "#ef4444" : "#10b981") : "var(--card-bg-secondary)", color: filterBankId === null ? "var(--text-primary)" : "var(--text-secondary)" }}><Filter size={11} style={{ display: "inline", marginRight: "3px", verticalAlign: "middle" }} /> 全部 {targetRecords.length}题</button>
            {bankOptions.map((b) => <button key={b.id} onClick={() => { setFilterBankId(b.id); setCurrentIndex(0); }} style={{ padding: "5px 12px", borderRadius: "16px", fontSize: "12px", border: "none", cursor: "pointer", whiteSpace: "nowrap", background: filterBankId === b.id ? b.color || "#00d4ff" : "var(--card-bg-secondary)", color: filterBankId === b.id ? "var(--page-bg)" : "var(--text-secondary)" }}>{b.title.length > 6 ? b.title.slice(0, 6) + "..." : b.title}</button>)}
          </div>
        )}

        {/* Detail */}
        <div style={{ padding: "0 16px calc(140px + env(safe-area-inset-bottom))" }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {current && question && (
            <motion.div key={`${current.bankId}-${current.questionId}-${current.createdAt.getTime()}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
                {bank && <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "6px", background: `${bank.color}20`, color: bank.color, fontWeight: 500 }}><BookOpen size={10} style={{ display: "inline", marginRight: "3px", verticalAlign: "middle" }} />{bank.title.length > 12 ? bank.title.slice(0, 12) + "..." : bank.title}</span>}
                {isWrongMode ? (
                  <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "6px", background: "rgba(239,68,68,0.15)", color: "#ef4444", fontWeight: 500, display: "flex", alignItems: "center", gap: "3px" }}><XCircle size={10} /> 错题</span>
                ) : (
                  <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "6px", background: "rgba(16,185,129,0.15)", color: "#10b981", fontWeight: 500, display: "flex", alignItems: "center", gap: "3px" }}><CheckCircle size={10} /> 正确</span>
                )}
                <span style={{ fontSize: "11px", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "3px" }}><Clock size={10} />{formatDate(current.createdAt)}</span>
              </div>
              <div style={{ background: "var(--card-bg)", borderRadius: "16px", padding: "20px", border: "1px solid var(--border-color)", marginBottom: "16px" }}>
                <div style={{ fontSize: "17px", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.6 }}>{displayQuestion}</div>
                {showSub && subQuestion && (
                  <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--border-color)", fontSize: "16px", color: "var(--text-primary)", lineHeight: 1.6 }}>{subQuestion}</div>
                )}
                {translateMutation.isPending && !autoTrans && (langMode === "entc" || langMode === "en") && question && !(question as any).enQuestion && isChinese(question.question) && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "10px", padding: "6px 12px", background: "rgba(0,212,255,0.08)", borderRadius: "8px", fontSize: "12px", color: "var(--accent-color)" }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                      <Globe size={14} />
                    </motion.div>
                    <span>正在自动翻译为英文...</span>
                  </motion.div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {displayOptions.map((opt, idx) => {
                    const isCorrect = question.correct.includes(idx);
                    // In practice mode: before answering show pending selections, after answering show the new result
                    const effSelected = practiceMode
                      ? (practiceAnswer ? practiceAnswer.selected : (multiSel[currentKey] || []))
                      : current.selected;
                    const answered = practiceMode ? !!practiceAnswer : true;
                    const isSelected = effSelected.includes(idx);
                    const isWrong = isSelected && !isCorrect;
                    const clickable = practiceMode && !answered;
                    const bg = !answered && isSelected ? "rgba(0,212,255,0.12)"
                      : isCorrect ? "rgba(16,185,129,0.12)" : isWrong ? "rgba(239,68,68,0.12)" : isSelected ? "rgba(16,185,129,0.08)" : "var(--card-bg-secondary)";
                    const border = !answered && isSelected ? "1px solid rgba(0,212,255,0.5)"
                      : isCorrect ? "1px solid rgba(16,185,129,0.3)" : isWrong ? "1px solid rgba(239,68,68,0.3)" : isSelected ? "1px solid rgba(16,185,129,0.2)" : "1px solid var(--border-color)";
                    const color = isCorrect && answered ? "#10b981" : isWrong && answered ? "#ef4444" : "var(--text-secondary)";
                    return (
                      <div key={idx}
                        onClick={clickable ? () => handlePracticeSelect(idx) : undefined}
                        style={{ padding: "10px 12px", borderRadius: "8px", background: bg, border, fontSize: "14px", color, display: "flex", alignItems: "center", gap: "8px", cursor: clickable ? "pointer" : "default", WebkitTapHighlightColor: "transparent", userSelect: "none", touchAction: clickable ? "manipulation" : "auto" }}>
                        <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: !answered && isSelected ? "#00d4ff" : isCorrect && answered ? "#10b981" : isWrong && answered ? "#ef4444" : isSelected ? "#00d4ff" : "var(--text-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", flexShrink: 0 }}>{String.fromCharCode(65 + idx)}</span>
                        <span>{opt}{showSub && subOptions?.[idx] && (
                          <span style={{ display: "block", marginTop: "3px", fontSize: "13px", color: "var(--text-secondary)" }}>{subOptions[idx]}</span>
                        )}</span>
                        {answered && isCorrect && <Check size={16} color="#10b981" style={{ marginLeft: "auto", flexShrink: 0 }} />}
                        {answered && isWrong && <X size={16} color="#ef4444" style={{ marginLeft: "auto", flexShrink: 0 }} />}
                        {!answered && isSelected && <span style={{ fontSize: "11px", marginLeft: "auto", color: "#00d4ff" }}>已选</span>}
                        {!practiceMode && isCorrect && <span style={{ fontSize: "11px", marginLeft: "auto" }}>正确答案</span>}
                        {!practiceMode && !isCorrect && isSelected && <span style={{ fontSize: "11px", marginLeft: "auto" }}>你的选择</span>}
                      </div>
                    );
                  })}
                </div>

                {/* Multi-select submit in practice mode */}
                {practiceMode && !practiceAnswer && (question as { type?: string }).type === "multiple" && (
                  <motion.button whileTap={{ scale: 0.97 }}
                    onClick={() => { const sel = multiSel[currentKey] || []; if (sel.length > 0) submitPractice(sel); }}
                    disabled={!(multiSel[currentKey] || []).length}
                    style={{
                      marginTop: "12px", width: "100%", padding: "12px", borderRadius: "10px",
                      background: (multiSel[currentKey] || []).length ? "#00d4ff" : "var(--card-bg-secondary)",
                      color: (multiSel[currentKey] || []).length ? "var(--page-bg)" : "var(--text-tertiary)",
                      fontSize: "14px", fontWeight: 600, border: "none",
                      cursor: (multiSel[currentKey] || []).length ? "pointer" : "not-allowed",
                      minHeight: "44px", touchAction: "manipulation",
                    }}>
                    确认提交 ({(multiSel[currentKey] || []).length}项已选)
                  </motion.button>
                )}

                {/* Practice result banner */}
                {practiceMode && practiceAnswer && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    style={{
                      marginTop: "12px", padding: "10px 14px", borderRadius: "10px",
                      background: practiceAnswer.isCorrect ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                      border: `1px solid ${practiceAnswer.isCorrect ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                      fontSize: "13px", fontWeight: 600,
                      color: practiceAnswer.isCorrect ? "#10b981" : "#ef4444",
                    }}>
                    {practiceAnswer.isCorrect ? "✓ 回答正确！本题已记录为正确" : "✗ 回答错误，请查看解析后继续"}
                  </motion.div>
                )}
                <div style={{ marginTop: "16px", display: "flex", gap: "12px" }}>
                  <div style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}><div style={{ fontSize: "11px", color: "#10b981" }}>正确答案</div><div style={{ fontSize: "16px", fontWeight: 700, color: "#10b981" }}>{question.correct.map((c) => String.fromCharCode(65 + c)).join(", ")}</div></div>
                  <div style={{ flex: 1, padding: "10px", borderRadius: "8px", background: isWrongMode ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)", border: isWrongMode ? "1px solid rgba(239,68,68,0.15)" : "1px solid rgba(16,185,129,0.15)" }}><div style={{ fontSize: "11px", color: isWrongMode ? "#ef4444" : "#10b981" }}>{practiceMode && practiceAnswer ? "本次作答" : "你的答案"}</div><div style={{ fontSize: "16px", fontWeight: 700, color: isWrongMode ? "#ef4444" : "#10b981" }}>{(practiceMode && practiceAnswer ? practiceAnswer.selected : current.selected).map((c) => String.fromCharCode(65 + c)).join(", ") || "-"}</div></div>
                </div>
                {question.explanation && <div style={{ marginTop: "16px", padding: "12px", borderRadius: "10px", background: "var(--page-bg)" }}><div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "4px" }}>解析</div><div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>{question.explanation}</div></div>}
              </div>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/training", { state: { bankId: current.bankId } })}
                style={{ width: "100%", padding: "12px", borderRadius: "10px", background: "#00d4ff", color: "var(--page-bg)", fontSize: "14px", fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <RotateCcw size={16} /> 重新练习该题库
              </motion.button>
            </motion.div>
          )}
        </div>

        {/* Bottom Nav */}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 16px", paddingBottom: "max(16px, env(safe-area-inset-bottom))", background: "var(--nav-bg)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderTop: "1px solid var(--border-color)", display: "flex", gap: "12px", zIndex: 100 }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handlePrev} disabled={currentIndex === 0} style={{ padding: "14px 20px", borderRadius: "12px", background: "var(--card-bg-secondary)", color: currentIndex === 0 ? "var(--text-tertiary)" : "var(--text-primary)", fontSize: "14px", border: "none", cursor: currentIndex === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px", minHeight: "48px", touchAction: "manipulation", userSelect: "none" }}><ChevronLeft size={18} /> 上一题</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleNext} disabled={currentIndex >= filtered.length - 1} style={{ flex: 1, padding: "14px 20px", borderRadius: "12px", background: currentIndex >= filtered.length - 1 ? "var(--card-bg-secondary)" : "#00d4ff", color: currentIndex >= filtered.length - 1 ? "var(--text-tertiary)" : "var(--page-bg)", fontSize: "14px", fontWeight: 600, border: "none", cursor: currentIndex >= filtered.length - 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", minHeight: "48px", touchAction: "manipulation", userSelect: "none" }}>下一题 <ChevronRight size={18} /></motion.button>
        </div>
      </div>
    </div>
  );
}
