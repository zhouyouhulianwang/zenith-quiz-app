import { useState, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, XCircle, CheckCircle, ChevronLeft, ChevronRight, RotateCcw, Filter, AlertCircle, BookOpen, Clock } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAppSettings } from "@/context/AppContext";
import { toTraditional } from "@/lib/chineseConv";
import ParticleBackground from "@/components/ParticleBackground";

export default function MistakesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const mode = (location.state as { mode?: "wrong" | "correct" } | null)?.mode || "wrong";
  const isWrongMode = mode === "wrong";

  const { data: records } = trpc.record.list.useQuery();
  const { data: banks } = trpc.bank.list.useQuery();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterBankId, setFilterBankId] = useState<number | null>(null);

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
  const bank = current ? banks?.find((b) => b.id === current.bankId) : null;
  // Memoize parsed questions to avoid re-parsing on every render
  const bankQuestions = useMemo(() => {
    if (!bank?.questionsJson) return [];
    try { return JSON.parse(bank.questionsJson) as Array<{ id: number; question: string; options: string[]; correct: number[]; explanation: string }>; }
    catch { return []; }
  }, [bank?.questionsJson]);
  const question = current ? bankQuestions.find((q) => q.id === current.questionId) : null;
  const { settings } = useAppSettings();
  const showTc = settings.questionLanguage === "entc" || settings.questionLanguage === "tc";

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

  if (targetRecords.length === 0) {
    const themeColor = isWrongMode ? "#ef4444" : "#10b981";
    return (
      <div style={{ position: "relative", minHeight: "100vh", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ParticleBackground />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          <AlertCircle size={64} color="#666" />
          <p style={{ color: "#a0a0a0", marginTop: "16px" }}>{isWrongMode ? "暂无错题记录" : "暂无正确记录"}</p>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/library")} style={{ marginTop: "24px", padding: "12px 28px", background: themeColor, color: "#fff", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>前往题库</motion.button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "#1a1a1a" }}>
      <ParticleBackground />
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", paddingTop: "max(12px, env(safe-area-inset-top))", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}><ArrowLeft size={24} color="#fff" /></button>
          <div style={{ fontSize: "17px", fontWeight: 600, color: "#fff" }}>{isWrongMode ? "错题回顾" : "正确回顾"}</div>
          <div style={{ fontSize: "13px", color: isWrongMode ? "#ef4444" : "#10b981", fontWeight: 600 }}>{currentIndex + 1} / {filtered.length}</div>
        </div>
        <div style={{ width: "100%", height: "3px", background: "#2a2a2a" }}><motion.div animate={{ width: `${filtered.length > 0 ? ((currentIndex + 1) / filtered.length) * 100 : 0}%` }} transition={{ duration: 0.3 }} style={{ height: "100%", background: isWrongMode ? "#ef4444" : "#10b981" }} /></div>

        {/* Filter */}
        {bankOptions.length > 1 && (
          <div style={{ padding: "10px 16px", display: "flex", gap: "8px", overflowX: "auto" }}>
            <button onClick={() => { setFilterBankId(null); setCurrentIndex(0); }} style={{ padding: "5px 12px", borderRadius: "16px", fontSize: "12px", border: "none", cursor: "pointer", whiteSpace: "nowrap", background: filterBankId === null ? (isWrongMode ? "#ef4444" : "#10b981") : "#2a2a2a", color: filterBankId === null ? "#fff" : "#a0a0a0" }}><Filter size={11} style={{ display: "inline", marginRight: "3px", verticalAlign: "middle" }} /> 全部 {targetRecords.length}题</button>
            {bankOptions.map((b) => <button key={b.id} onClick={() => { setFilterBankId(b.id); setCurrentIndex(0); }} style={{ padding: "5px 12px", borderRadius: "16px", fontSize: "12px", border: "none", cursor: "pointer", whiteSpace: "nowrap", background: filterBankId === b.id ? b.color || "#00d4ff" : "#2a2a2a", color: filterBankId === b.id ? "#1a1a1a" : "#a0a0a0" }}>{b.title.length > 6 ? b.title.slice(0, 6) + "..." : b.title}</button>)}
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
                <span style={{ fontSize: "11px", color: "#666", display: "flex", alignItems: "center", gap: "3px" }}><Clock size={10} />{formatDate(current.createdAt)}</span>
              </div>
              <div style={{ background: "#222", borderRadius: "16px", padding: "20px", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "16px" }}>
                <div style={{ fontSize: "17px", fontWeight: 500, color: "#fff", lineHeight: 1.6, marginBottom: "16px" }}>{showTc ? toTraditional(question.question) : question.question}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {question.options.map((opt, idx) => {
                    const displayOpt = showTc ? toTraditional(opt) : opt;
                    const isCorrect = question.correct.includes(idx);
                    const isSelected = current.selected.includes(idx);
                    const isWrong = isSelected && !isCorrect;
                    const bg = isCorrect ? "rgba(16,185,129,0.12)" : isWrong ? "rgba(239,68,68,0.12)" : isSelected ? "rgba(16,185,129,0.08)" : "#2a2a2a";
                    const border = isCorrect ? "1px solid rgba(16,185,129,0.3)" : isWrong ? "1px solid rgba(239,68,68,0.3)" : isSelected ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(255,255,255,0.05)";
                    const color = isCorrect ? "#10b981" : isWrong ? "#ef4444" : isSelected ? "#a0a0a0" : "#a0a0a0";
                    return (
                      <div key={idx} style={{ padding: "10px 12px", borderRadius: "8px", background: bg, border, fontSize: "14px", color, display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: isCorrect ? "#10b981" : isWrong ? "#ef4444" : isSelected ? "#00d4ff" : "#666", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600, color: "#fff", flexShrink: 0 }}>{String.fromCharCode(65 + idx)}</span>
                        <span>{displayOpt}</span>
                        {isCorrect && <span style={{ fontSize: "11px", marginLeft: "auto" }}>正确答案</span>}
                        {!isCorrect && isSelected && <span style={{ fontSize: "11px", marginLeft: "auto" }}>你的选择</span>}
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: "16px", display: "flex", gap: "12px" }}>
                  <div style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}><div style={{ fontSize: "11px", color: "#10b981" }}>正确答案</div><div style={{ fontSize: "16px", fontWeight: 700, color: "#10b981" }}>{question.correct.map((c) => String.fromCharCode(65 + c)).join(", ")}</div></div>
                  <div style={{ flex: 1, padding: "10px", borderRadius: "8px", background: isWrongMode ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)", border: isWrongMode ? "1px solid rgba(239,68,68,0.15)" : "1px solid rgba(16,185,129,0.15)" }}><div style={{ fontSize: "11px", color: isWrongMode ? "#ef4444" : "#10b981" }}>你的答案</div><div style={{ fontSize: "16px", fontWeight: 700, color: isWrongMode ? "#ef4444" : "#10b981" }}>{current.selected.map((c) => String.fromCharCode(65 + c)).join(", ") || "-"}</div></div>
                </div>
                {question.explanation && <div style={{ marginTop: "16px", padding: "12px", borderRadius: "10px", background: "#1a1a1a" }}><div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>解析</div><div style={{ fontSize: "13px", color: "#a0a0a0", lineHeight: 1.6 }}>{question.explanation}</div></div>}
              </div>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/training", { state: { bankId: current.bankId } })}
                style={{ width: "100%", padding: "12px", borderRadius: "10px", background: "#00d4ff", color: "#1a1a1a", fontSize: "14px", fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <RotateCcw size={16} /> 重新练习该题库
              </motion.button>
            </motion.div>
          )}
        </div>

        {/* Bottom Nav */}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 16px", paddingBottom: "max(16px, env(safe-area-inset-bottom))", background: "rgba(26,26,26,0.98)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: "12px", zIndex: 100 }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handlePrev} disabled={currentIndex === 0} style={{ padding: "14px 20px", borderRadius: "12px", background: "#2a2a2a", color: currentIndex === 0 ? "#666" : "#fff", fontSize: "14px", border: "none", cursor: currentIndex === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px", minHeight: "48px", touchAction: "manipulation", userSelect: "none" }}><ChevronLeft size={18} /> 上一题</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleNext} disabled={currentIndex >= filtered.length - 1} style={{ flex: 1, padding: "14px 20px", borderRadius: "12px", background: currentIndex >= filtered.length - 1 ? "#2a2a2a" : "#00d4ff", color: currentIndex >= filtered.length - 1 ? "#666" : "#1a1a1a", fontSize: "14px", fontWeight: 600, border: "none", cursor: currentIndex >= filtered.length - 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", minHeight: "48px", touchAction: "manipulation", userSelect: "none" }}>下一题 <ChevronRight size={18} /></motion.button>
        </div>
      </div>
    </div>
  );
}
