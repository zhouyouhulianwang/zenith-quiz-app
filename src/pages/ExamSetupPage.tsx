import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, GraduationCap, BookOpen, ChevronRight, FileText } from "lucide-react";
import { trpc } from "@/providers/trpc";
import ParticleBackground from "@/components/ParticleBackground";

interface ChapterInfo {
  chapterId: number;
  chapterName: string;
  questionCount: number;
}

export default function ExamSetupPage() {
  const navigate = useNavigate();
  const { data: banks } = trpc.bank.list.useQuery();

  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<number | undefined>(undefined);
  const [questionCount, setQuestionCount] = useState(40);

  const selectedBank = banks?.find((b) => b.id === selectedBankId);
  const chapters: ChapterInfo[] = useMemo(() => {
    if (!selectedBank?.chaptersJson) return [];
    try { return JSON.parse(selectedBank.chaptersJson); } catch { return []; }
  }, [selectedBank?.chaptersJson]);

  const allQuestions: { chapterId?: number }[] = useMemo(() => {
    if (!selectedBank?.questionsJson) return [];
    try { return JSON.parse(selectedBank.questionsJson); } catch { return []; }
  }, [selectedBank?.questionsJson]);

  const availableCount = useMemo(() => {
    if (!selectedChapterId) return allQuestions.length;
    return allQuestions.filter((q) => q.chapterId === selectedChapterId).length;
  }, [allQuestions, selectedChapterId]);

  const maxQuestions = Math.min(availableCount, 100);

  const handleStart = () => {
    if (!selectedBankId) return;
    const params = new URLSearchParams();
    params.set("bankId", String(selectedBankId));
    params.set("count", String(Math.min(questionCount, availableCount)));
    if (selectedChapterId) params.set("chapterId", String(selectedChapterId));
    navigate(`/exam/session?${params.toString()}`);
  };

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: "var(--page-bg)", overflowX: "hidden" }}>
      <ParticleBackground />
      <div style={{ position: "relative", zIndex: 1, padding: "16px", paddingBottom: "200px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <button onClick={() => navigate("/training")} style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ArrowLeft size={24} color="var(--text-primary)" />
          </button>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>模拟考试</h1>
            <p style={{ fontSize: "13px", color: "var(--text-tertiary)", margin: "2px 0 0" }}>选择题库和章节开始考试</p>
          </div>
        </div>

        {/* Step 1: Select Bank */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "12px" }}>1. 选择题库</h2>
          {!banks || banks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", background: "var(--card-bg)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
              <BookOpen size={40} color="var(--text-tertiary)" />
              <p style={{ color: "var(--text-tertiary)", marginTop: "12px", fontSize: "14px" }}>暂无题库，请先导入</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {banks.map((bank, i) => {
                const qCount = (() => { try { return JSON.parse(bank.questionsJson).length; } catch { return 0; } })();
                const isSelected = selectedBankId === bank.id;
                return (
                  <motion.button key={bank.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    whileTap={{ scale: 0.98 }} onClick={() => { setSelectedBankId(bank.id); setSelectedChapterId(undefined); }}
                    style={{
                      width: "100%", padding: "14px 16px", borderRadius: "12px",
                      background: isSelected ? "var(--accent-color)" : "var(--card-bg)",
                      border: `1px solid ${isSelected ? "var(--accent-color)" : "var(--border-color)"}`,
                      cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px",
                      WebkitTapHighlightColor: "transparent",
                    }}>
                    <div style={{ width: "4px", height: "40px", borderRadius: "2px", background: bank.color || "#00d4ff", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "15px", fontWeight: 600, color: isSelected ? "#fff" : "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{bank.title}</div>
                      <div style={{ fontSize: "12px", color: isSelected ? "rgba(255,255,255,0.8)" : "var(--text-tertiary)", marginTop: "2px" }}>{qCount} 题</div>
                    </div>
                    <ChevronRight size={16} color={isSelected ? "#fff" : "var(--text-tertiary)"} />
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 2: Select Chapter */}
        {selectedBankId && chapters.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "12px" }}>2. 选择章节（可选）</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button onClick={() => setSelectedChapterId(undefined)}
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: "10px",
                  background: selectedChapterId === undefined ? "var(--accent-color)" : "var(--card-bg-secondary)",
                  border: `1px solid ${selectedChapterId === undefined ? "var(--accent-color)" : "var(--border-color)"}`,
                  color: selectedChapterId === undefined ? "#fff" : "var(--text-primary)",
                  fontSize: "14px", fontWeight: selectedChapterId === undefined ? 600 : 400,
                  cursor: "pointer", textAlign: "left",
                }}>
                全部章节（{allQuestions.length} 题）
              </button>
              {chapters.map((ch) => (
                <button key={ch.chapterId} onClick={() => setSelectedChapterId(ch.chapterId)}
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: "10px",
                    background: selectedChapterId === ch.chapterId ? "var(--accent-color)" : "var(--card-bg-secondary)",
                    border: `1px solid ${selectedChapterId === ch.chapterId ? "var(--accent-color)" : "var(--border-color)"}`,
                    color: selectedChapterId === ch.chapterId ? "#fff" : "var(--text-primary)",
                    fontSize: "14px", fontWeight: selectedChapterId === ch.chapterId ? 600 : 400,
                    cursor: "pointer", textAlign: "left",
                  }}>
                  {ch.chapterName}（{ch.questionCount} 题）
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 3: Set Question Count */}
        {selectedBankId && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "12px" }}>
              {chapters.length > 0 ? "3" : "2"}. 题目数量
            </h2>
            <div style={{ background: "var(--card-bg)", borderRadius: "12px", padding: "16px", border: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontSize: "14px", color: "var(--text-primary)" }}>考试题数</span>
                <span style={{ fontSize: "24px", fontWeight: 700, color: "var(--accent-color)" }}>{Math.min(questionCount, availableCount)}</span>
              </div>
              <input
                type="range"
                min={10}
                max={maxQuestions}
                step={5}
                value={Math.min(questionCount, availableCount)}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--accent-color)" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>10题</span>
                <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>{maxQuestions}题（最大）</span>
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                {[40, 60].filter((n) => n <= availableCount).map((n) => (
                  <button key={n} onClick={() => setQuestionCount(n)}
                    style={{
                      padding: "6px 14px", borderRadius: "8px", fontSize: "13px",
                      background: questionCount === n ? "var(--accent-color)" : "var(--card-bg-secondary)",
                      color: questionCount === n ? "#fff" : "var(--text-primary)",
                      border: `1px solid ${questionCount === n ? "var(--accent-color)" : "var(--border-color)"}`,
                      cursor: "pointer",
                    }}>
                    {n}题
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Start Button */}
        {selectedBankId && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "16px", background: "linear-gradient(transparent, var(--page-bg) 40%)", zIndex: 10 }}>
            <button onClick={handleStart}
              style={{
                width: "100%", padding: "16px", borderRadius: "14px",
                background: "var(--accent-color)", color: "#fff",
                border: "none", fontSize: "16px", fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}>
              <GraduationCap size={22} />
              开始考试（{Math.min(questionCount, availableCount)} 题）
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
