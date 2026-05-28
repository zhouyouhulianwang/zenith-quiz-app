import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Flame, ChevronRight, RotateCcw, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getBanks, getStreakDays, getDailyStats, getTotalStats } from "@/lib/localApi";
import ParticleBackground from "@/components/ParticleBackground";

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      style={{ fontFamily: '"SF Mono", "Menlo", monospace', fontWeight: 700 }}
    >
      {value}{suffix}
    </motion.span>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const banks = getBanks();
  const dailyRecords = getDailyStats();
  const totalStats = getTotalStats();

  const today = new Date().toISOString().split("T")[0];
  const todayRecord = dailyRecords.find((d) => d.date === today);
  const todayCount = todayRecord?.count || 0;
  const todayCorrect = todayRecord?.correct || 0;
  const accuracy = todayCount > 0 ? Math.round((todayCorrect / todayCount) * 100) : 0;

  const streakDays = getStreakDays();

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "var(--page-bg)", overflowX: "hidden" }}>
      <ParticleBackground />
      <div style={{ position: "relative", zIndex: 1, padding: "16px", paddingBottom: "100px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>ZENITH</h1>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
              {user?.name ? `欢迎, ${user.name}` : "自适应训练平台"}
            </p>
          </div>
          {streakDays > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(255,149,0,0.1)", padding: "4px 10px", borderRadius: "20px" }}>
              <Flame size={14} color="#ff9500" />
              <span style={{ fontSize: "12px", color: "#ff9500", fontWeight: 600 }}>{streakDays}天</span>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
          {[
            { label: "今日答题", value: todayCount, icon: <RotateCcw size={16} color="#00d4ff" />, bg: "rgba(0,212,255,0.1)" },
            { label: "正确率", value: accuracy, suffix: "%", icon: <Trophy size={16} color="#10b981" />, bg: "rgba(16,185,129,0.1)" },
            { label: "累计答题", value: totalStats.totalQuestions, icon: <RotateCcw size={16} color="#8b5cf6" />, bg: "rgba(139,92,246,0.1)" },
            { label: "总正确率", value: totalStats.accuracy, suffix: "%", icon: <Trophy size={16} color="#f59e0b" />, bg: "rgba(245,158,11,0.1)" },
          ].map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ background: "var(--card-bg)", borderRadius: "12px", padding: "14px", border: "1px solid var(--border-color)" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {s.icon}
                </div>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{s.label}</span>
              </div>
              <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" }}>
                <AnimatedNumber value={s.value} suffix={s.suffix} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bank List */}
        <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 12px 0" }}>题库训练</h2>
        {banks.map((bank) => {
          const qCount = bank.questions?.length || 0;
          return (
            <motion.div
              key={bank.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/training/${bank.id}`)}
              style={{
                background: "var(--card-bg)", borderRadius: "12px", padding: "14px 16px",
                border: "1px solid var(--border-color)", marginBottom: "10px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "12px",
              }}
            >
              <div style={{
                width: "44px", height: "44px", borderRadius: "12px",
                background: bank.color || "#00d4ff", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "18px", fontWeight: 700, color: "#fff", flexShrink: 0,
              }}>
                {bank.title?.charAt(0) || "?"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {bank.title}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  {qCount} 题 · {bank.chapters?.length || 0} 章
                </div>
              </div>
              <ChevronRight size={18} color="#666" />
            </motion.div>
          );
        })}

        {/* Mock Exams */}
        <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", margin: "20px 0 12px 0" }}>模拟考试</h2>
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/mock-exam/list")}
          style={{
            background: "var(--card-bg)", borderRadius: "12px", padding: "14px 16px",
            border: "1px solid var(--border-color)", cursor: "pointer",
            display: "flex", alignItems: "center", gap: "12px",
          }}
        >
          <div style={{
            width: "44px", height: "44px", borderRadius: "12px",
            background: "linear-gradient(135deg, #ff9500, #ff5500)", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "18px", fontWeight: 700, color: "#fff", flexShrink: 0,
          }}>
            <Trophy size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>模拟考试</div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>4 套模拟卷 · 共 160 题</div>
          </div>
          <ChevronRight size={18} color="#666" />
        </motion.div>
      </div>
    </div>
  );
}
