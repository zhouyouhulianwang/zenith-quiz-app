import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Flame, ChevronRight, Upload, RotateCcw, Trophy, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
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
  const { data: banks } = trpc.bank.list.useQuery();
  const { data: dailyRecords } = trpc.record.listDaily.useQuery();

  const today = new Date().toISOString().split("T")[0];
  const todayRecord = dailyRecords?.find((d) => d.date === today);
  const todayCount = todayRecord?.count || 0;
  const todayCorrect = todayRecord?.correct || 0;
  const accuracy = todayCount > 0 ? Math.round((todayCorrect / todayCount) * 100) : 0;

  const recent7Days = (dailyRecords || []).slice(-7).map((d) => ({
    name: d.date.slice(5),
    count: d.count,
  }));

  const quickStartBanks = (banks || []).filter((b) => b.progress > 0 && b.progress < 100).slice(0, 5);

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
          <motion.div
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/profile")}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              overflow: "hidden",
              border: "2px solid rgba(0,212,255,0.3)",
              cursor: "pointer",
            }}
          >
            <img
              src={user?.avatar || "/avatar-default.png"}
              alt="avatar"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => { (e.target as HTMLImageElement).src = "/avatar-default.png"; }}
            />
          </motion.div>
        </div>

        {/* Today Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            background: "var(--card-bg)",
            borderRadius: "16px",
            padding: "20px",
            border: "1px solid rgba(255,255,255,0.08)",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: "32px", color: "var(--accent-color)" }}><AnimatedNumber value={todayCount} /></div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>今日练习</div>
            </div>
            <div style={{ width: "1px", height: "40px", background: "rgba(255,255,255,0.1)" }} />
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: "32px", color: "var(--accent-color)" }}><AnimatedNumber value={accuracy} suffix="%" /></div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>正确率</div>
            </div>
            <div style={{ width: "1px", height: "40px", background: "rgba(255,255,255,0.1)" }} />
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: "32px", color: "var(--accent-color)", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                <AnimatedNumber value={7} /><Flame size={20} color="#f59e0b" />
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>连续打卡</div>
            </div>
          </div>
        </motion.div>

        {/* Continue Training */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>继续训练</h2>
            <button onClick={() => navigate("/library")} style={{ fontSize: "14px", color: "var(--accent-color)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
              查看全部 <ChevronRight size={16} />
            </button>
          </div>
          <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "8px" }}>
            {quickStartBanks.length > 0 ? quickStartBanks.map((bank, i) => (
              <motion.div
                key={bank.id}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/training", { state: { bankId: bank.id } })}
                style={{
                  minWidth: "160px",
                  height: "120px",
                  borderRadius: "12px",
                  overflow: "hidden",
                  cursor: "pointer",
                  background: "var(--card-bg)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ padding: "12px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {bank.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{bank.progress}% 完成</div>
                  <div style={{ marginTop: "6px", width: "100%", height: "3px", background: "var(--card-bg-secondary)", borderRadius: "2px" }}>
                    <div style={{ width: `${bank.progress}%`, height: "100%", background: bank.color, borderRadius: "2px" }} />
                  </div>
                </div>
              </motion.div>
            )) : (
              <div style={{ color: "var(--text-tertiary)", fontSize: "14px", padding: "20px" }}>暂无进行中的题库</div>
            )}
          </div>
        </div>

        {/* Trend Mini Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            background: "var(--card-bg)",
            borderRadius: "16px",
            padding: "16px",
            border: "1px solid rgba(255,255,255,0.08)",
            marginBottom: "20px",
          }}
        >
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 12px 0" }}>近7天趋势</h2>
          {recent7Days.length > 0 ? (
            <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "100px" }}>
              {recent7Days.map((d, i) => {
                const maxVal = Math.max(...recent7Days.map((x) => x.count), 1);
                const height = (d.count / maxVal) * 80;
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{d.count}</div>
                    <div style={{ width: "100%", height: `${height}px`, background: "var(--accent-color)", borderRadius: "4px 4px 0 0", minHeight: "4px" }} />
                    <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>{d.name}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: "var(--text-tertiary)", fontSize: "14px", textAlign: "center", padding: "20px" }}>暂无数据</div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {[
            { icon: Upload, label: "导入题库", action: () => navigate("/library") },
            { icon: RotateCcw, label: "错题回顾", action: () => navigate("/mistakes") },
            { icon: Trophy, label: "练习记录", action: () => navigate("/records") },
            { icon: Settings, label: "学习设置", action: () => navigate("/profile") },
          ].map((item, i) => (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={item.action}
              style={{
                background: "var(--card-bg)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "8px",
                cursor: "pointer",
              }}
            >
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(0,212,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <item.icon size={24} color="#00d4ff" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>{item.label}</span>
                <ChevronRight size={14} color="#666" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
