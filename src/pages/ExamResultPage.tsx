import { useState } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Check, X, Home, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
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

interface ExamResult {
  questionId: number;
  selected: number[];
  isCorrect: boolean;
  chapterId?: number;
  chapterName?: string;
}

export default function ExamResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const score = Number(searchParams.get("score")) || 0;
  const correct = Number(searchParams.get("correct")) || 0;
  const total = Number(searchParams.get("total")) || 0;
  const time = Number(searchParams.get("time")) || 0;
  const { questions = [], answers = [] } = (location.state || {}) as { questions: Q[]; answers: ExamResult[] };

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const formatTime = (s: number) => `${Math.floor(s / 60)}分${s % 60}秒`;

  const getScoreColor = () => {
    if (score >= 90) return "#10b981";
    if (score >= 70) return "#f59e0b";
    return "#ef4444";
  };

  const getScoreLabel = () => {
    if (score >= 90) return "优秀";
    if (score >= 70) return "良好";
    if (score >= 60) return "及格";
    return "需努力";
  };

  const correctLetters = (q: Q) => q.correct.map((c) => String.fromCharCode(65 + c)).join(", ");
  const userLetters = (ans: ExamResult) => ans.selected.map((s) => String.fromCharCode(65 + s)).join(", ") || "未作答";

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: "var(--page-bg)", overflowX: "hidden" }}>
      <ParticleBackground />
      <div style={{ position: "relative", zIndex: 1, padding: "16px", paddingBottom: "100px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ArrowLeft size={24} color="var(--text-primary)" />
          </button>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>考试结果</h1>
            <p style={{ fontSize: "13px", color: "var(--text-tertiary)", margin: "2px 0 0" }}>{questions[0]?.chapterName || "模拟考试"}</p>
          </div>
        </div>

        {/* Score Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: "var(--card-bg)", borderRadius: "20px", padding: "28px", border: "1px solid var(--border-color)", marginBottom: "20px", textAlign: "center" }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12, delay: 0.2 }}
            style={{ width: "100px", height: "100px", borderRadius: "50%", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", border: `4px solid ${getScoreColor()}`, position: "relative" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "32px", fontWeight: 800, color: getScoreColor() }}>{score}</div>
              <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>分</div>
            </div>
          </motion.div>

          <div style={{ fontSize: "18px", fontWeight: 700, color: getScoreColor(), marginBottom: "4px" }}>{getScoreLabel()}</div>

          <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginTop: "16px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#10b981" }}>{correct}</div>
              <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>正确</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#ef4444" }}>{total - correct}</div>
              <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>错误</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--accent-color)" }}>{formatTime(time)}</div>
              <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>用时</div>
            </div>
          </div>
        </motion.div>

        {/* Question Review */}
        <h2 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "12px" }}>逐题解析</h2>

        {questions.map((q, i) => {
          const ans = answers[i];
          const isExpanded = expandedIndex === i;
          if (!ans) return null;

          return (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              style={{ background: "var(--card-bg)", borderRadius: "14px", border: "1px solid var(--border-color)", marginBottom: "10px", overflow: "hidden" }}>
              <button onClick={() => setExpandedIndex(isExpanded ? null : i)}
                style={{ width: "100%", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: ans.isCorrect ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {ans.isCorrect ? <Check size={14} color="#10b981" /> : <X size={14} color="#ef4444" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {i + 1}. {q.question}
                  </div>
                  <div style={{ fontSize: "12px", color: ans.isCorrect ? "#10b981" : "#ef4444", marginTop: "2px" }}>
                    你的答案：{userLetters(ans)} | 正确答案：{correctLetters(q)}
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={16} color="var(--text-tertiary)" /> : <ChevronDown size={16} color="var(--text-tertiary)" />}
              </button>

              {isExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border-color)" }}>
                  <div style={{ marginTop: "12px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>题目</div>
                    <div style={{ fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.6, marginBottom: "12px" }}>{q.question}</div>

                    <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>选项</div>
                    {q.options.map((opt, idx) => {
                      const isCorrect = q.correct.includes(idx);
                      const isUserSelected = ans.selected.includes(idx);
                      let bgColor = "transparent";
                      let borderColor = "var(--border-color)";
                      let textColor = "var(--text-primary)";
                      if (isCorrect) { bgColor = "rgba(16,185,129,0.1)"; borderColor = "#10b981"; textColor = "#10b981"; }
                      else if (isUserSelected && !isCorrect) { bgColor = "rgba(239,68,68,0.1)"; borderColor = "#ef4444"; textColor = "#ef4444"; }

                      return (
                        <div key={idx} style={{ padding: "8px 12px", borderRadius: "8px", border: `1px solid ${borderColor}`, background: bgColor, marginBottom: "6px", fontSize: "13px", color: textColor, display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: 600 }}>{String.fromCharCode(65 + idx)}.</span>
                          {opt}
                          {isCorrect && <Check size={14} color="#10b981" style={{ marginLeft: "auto" }} />}
                          {isUserSelected && !isCorrect && <X size={14} color="#ef4444" style={{ marginLeft: "auto" }} />}
                        </div>
                      );
                    })}

                    {q.explanation && (
                      <div style={{ marginTop: "12px", padding: "12px", borderRadius: "10px", background: "var(--card-bg-secondary)" }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent-color)", marginBottom: "4px" }}>解析</div>
                        <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>{q.explanation}</div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}

        {/* Action Buttons */}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "16px", background: "linear-gradient(transparent, var(--page-bg) 40%)", zIndex: 10 }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => navigate("/")}
              style={{ flex: 1, padding: "14px", borderRadius: "14px", background: "var(--card-bg)", color: "var(--text-primary)", border: "1px solid var(--border-color)", fontSize: "14px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              <Home size={16} /> 返回首页
            </button>
            <button onClick={() => navigate(`/exam/setup`)}
              style={{ flex: 1, padding: "14px", borderRadius: "14px", background: "var(--accent-color)", color: "#fff", border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              <RotateCcw size={16} /> 再来一次
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
