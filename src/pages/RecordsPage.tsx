import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, BookOpen, Filter, Calendar } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAppSettings } from "@/context/AppContext";
import { toTraditional } from "@/lib/chineseConv";
import ParticleBackground from "@/components/ParticleBackground";

export default function RecordsPage() {
  const navigate = useNavigate();
  const { data: records } = trpc.record.list.useQuery();
  const { data: banks } = trpc.bank.list.useQuery();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterBankId, setFilterBankId] = useState<number | null>(null);

  const allRecords = useMemo(() => [...(records || [])].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()), [records]);
  const filtered = useMemo(() => filterBankId ? allRecords.filter((r) => r.bankId === filterBankId) : allRecords, [allRecords, filterBankId]);
  const bankOptions = useMemo(() => {
    const ids = new Set((records || []).map((r) => r.bankId));
    return (banks || []).filter((b) => ids.has(b.id));
  }, [records, banks]);

  const current = filtered[currentIndex];
  const bank = current ? banks?.find((b) => b.id === current.bankId) : null;
  const question = current ? (JSON.parse(bank?.questionsJson || "[]") as Array<{ id: number; question: string; options: string[]; correct: number[]; explanation: string }>).find((q) => q.id === current.questionId) : null;
  const { settings } = useAppSettings();
  const showTc = settings.questionLanguage === "entc" || settings.questionLanguage === "tc";
  const total = filtered.length;
  const correctCount = (records || []).filter((r) => r.isCorrect).length;
  const wrongCount = (records || []).filter((r) => !r.isCorrect).length;

  const handlePrev = () => { if (currentIndex > 0) setCurrentIndex((p) => p - 1); };
  const handleNext = () => { if (currentIndex < total - 1) setCurrentIndex((p) => p + 1); };
  const formatDate = (ts: Date | number) => { const d = new Date(ts); return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

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

  if ((records || []).length === 0) {
    return (
      <div style={{ position: "relative", minHeight: "100vh", background: "var(--page-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ParticleBackground />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          <Calendar size={64} color="#666" />
          <p style={{ color: "var(--text-secondary)", marginTop: "16px" }}>暂无练习记录</p>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/library")} style={{ marginTop: "24px", padding: "12px 28px", background: "#00d4ff", color: "var(--page-bg)", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>前往题库</motion.button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: "var(--page-bg)" }}>
      <ParticleBackground />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", paddingTop: "max(12px, env(safe-area-inset-top))", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}><ArrowLeft size={24} color="#fff" /></button>
          <div style={{ fontSize: "17px", fontWeight: 600, color: "var(--text-primary)" }}>练习记录</div>
          <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{currentIndex + 1} / {total}</div>
        </div>
        <div style={{ width: "100%", height: "3px", background: "var(--card-bg-secondary)" }}><motion.div animate={{ width: `${total > 0 ? ((currentIndex + 1) / total) * 100 : 0}%` }} style={{ height: "100%", background: "#00d4ff" }} /></div>

        {bankOptions.length > 1 && (
          <div style={{ padding: "10px 16px", display: "flex", gap: "8px", overflowX: "auto" }}>
            <button onClick={() => { setFilterBankId(null); setCurrentIndex(0); }} style={{ padding: "5px 12px", borderRadius: "16px", fontSize: "12px", border: "none", cursor: "pointer", whiteSpace: "nowrap", background: filterBankId === null ? "#00d4ff" : "var(--card-bg-secondary)", color: filterBankId === null ? "var(--page-bg)" : "var(--text-secondary)" }}><Filter size={11} style={{ display: "inline", marginRight: "3px", verticalAlign: "middle" }} /> 全部 {(records || []).length}条</button>
            {bankOptions.map((b) => <button key={b.id} onClick={() => { setFilterBankId(b.id); setCurrentIndex(0); }} style={{ padding: "5px 12px", borderRadius: "16px", fontSize: "12px", border: "none", cursor: "pointer", whiteSpace: "nowrap", background: filterBankId === b.id ? b.color || "#00d4ff" : "var(--card-bg-secondary)", color: filterBankId === b.id ? "var(--page-bg)" : "var(--text-secondary)" }}>{b.title.length > 6 ? b.title.slice(0, 6) + "..." : b.title}</button>)}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "flex", justifyContent: "center", gap: "24px", padding: "12px 16px" }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>{total}</div><div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>总记录</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: "18px", fontWeight: 700, color: "#10b981" }}>{correctCount}</div><div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>正确</div></div>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: "18px", fontWeight: 700, color: "#ef4444" }}>{wrongCount}</div><div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>错误</div></div>
        </div>

        {/* Detail */}
        <div style={{ padding: "0 16px calc(140px + env(safe-area-inset-bottom))" }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {current && question && (
            <motion.div key={`${current.bankId}-${current.questionId}-${current.createdAt.getTime()}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
                {bank && <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "6px", background: `${bank.color}20`, color: bank.color, fontWeight: 500 }}><BookOpen size={10} style={{ display: "inline", marginRight: "3px" }} />{bank.title.length > 12 ? bank.title.slice(0, 12) + "..." : bank.title}</span>}
                <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "6px", background: current.isCorrect ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: current.isCorrect ? "#10b981" : "#ef4444", fontWeight: 500, display: "flex", alignItems: "center", gap: "3px" }}>{current.isCorrect ? <CheckCircle size={10} /> : <XCircle size={10} />}{current.isCorrect ? "正确" : "错误"}</span>
                <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}><Clock size={10} />{formatDate(current.createdAt)}</span>
              </div>
              <div style={{ background: "var(--card-bg)", borderRadius: "16px", padding: "20px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: "16px", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.6, marginBottom: "16px" }}>{showTc ? toTraditional(question.question) : question.question}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {question.options.map((opt, idx) => {
                    const isCorrect = question.correct.includes(idx);
                    const isSelected = current.selected.includes(idx);
                    const displayOpt = showTc ? toTraditional(opt) : opt;
                    const bg = isCorrect ? "rgba(16,185,129,0.12)" : isSelected && !isCorrect ? "rgba(239,68,68,0.12)" : "var(--card-bg-secondary)";
                    const color = isCorrect ? "#10b981" : isSelected && !isCorrect ? "#ef4444" : "var(--text-secondary)";
                    return (
                      <div key={idx} style={{ padding: "10px 12px", borderRadius: "8px", background: bg, border: `1px solid ${isCorrect ? "rgba(16,185,129,0.3)" : isSelected && !isCorrect ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.05)"}`, fontSize: "14px", color, display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: isCorrect ? "#10b981" : isSelected ? "#ef4444" : "var(--text-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>{String.fromCharCode(65 + idx)}</span>
                        <span>{displayOpt}</span>
                      </div>
                    );
                  })}
                </div>
                {question.explanation && <div style={{ marginTop: "16px", padding: "12px", borderRadius: "10px", background: "var(--page-bg)" }}><div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>解析</div><div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>{question.explanation}</div></div>}
              </div>
            </motion.div>
          )}
        </div>

        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 16px", paddingBottom: "max(16px, env(safe-area-inset-bottom))", background: "rgba(26,26,26,0.98)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: "12px", zIndex: 100 }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handlePrev} disabled={currentIndex === 0} style={{ padding: "14px 20px", borderRadius: "12px", background: "var(--card-bg-secondary)", color: currentIndex === 0 ? "var(--text-tertiary)" : "var(--text-primary)", fontSize: "14px", border: "none", cursor: currentIndex === 0 ? "not-allowed" : "pointer", minHeight: "48px", touchAction: "manipulation", userSelect: "none", display: "flex", alignItems: "center", gap: "6px" }}><ChevronLeft size={18} /> 上一条</motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleNext} disabled={currentIndex >= total - 1} style={{ flex: 1, padding: "14px 20px", borderRadius: "12px", background: currentIndex >= total - 1 ? "var(--card-bg-secondary)" : "#00d4ff", color: currentIndex >= total - 1 ? "var(--text-tertiary)" : "var(--page-bg)", fontSize: "14px", fontWeight: 600, border: "none", cursor: currentIndex >= total - 1 ? "not-allowed" : "pointer", minHeight: "48px", touchAction: "manipulation", userSelect: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>下一条 <ChevronRight size={18} /></motion.button>
        </div>
      </div>
    </div>
  );
}
