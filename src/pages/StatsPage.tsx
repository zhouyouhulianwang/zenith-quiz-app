import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Clock, Target, BookOpen, Brain, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { trpc } from "@/providers/trpc";
import ParticleBackground from "@/components/ParticleBackground";

export default function StatsPage() {
  const { data: records } = trpc.record.list.useQuery();
  const { data: dailyRecords } = trpc.record.listDaily.useQuery();
  const { data: banks } = trpc.bank.list.useQuery();
  const [timeRange, setTimeRange] = useState("全部");
  const [expandedBank, setExpandedBank] = useState<number | null>(null);

  const totalTime = Math.round(((records || []).reduce((sum, r) => sum + r.timeSpent, 0)) / 60000);
  const totalQuestions = (dailyRecords || []).reduce((sum, d) => sum + d.count, 0);
  const totalCorrect = (dailyRecords || []).reduce((sum, d) => sum + d.correct, 0);
  const avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const today = new Date();
  const heatmapData = useMemo(() => {
    const data: { level: number; date: string; count: number }[] = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      const rec = (dailyRecords || []).find((r) => r.date === ds);
      const count = rec?.count || 0;
      let level = 0; if (count > 0) level = 1; if (count > 10) level = 2; if (count > 20) level = 3; if (count > 30) level = 4;
      data.push({ level, date: ds, count });
    }
    return data;
  }, [dailyRecords]);

  const barData = [
    { name: "单选题", accuracy: Math.round(avgAccuracy + Math.random() * 20 - 5) },
    { name: "多选题", accuracy: Math.round(avgAccuracy - 10 + Math.random() * 15) },
    { name: "判断题", accuracy: Math.round(avgAccuracy + 5) },
    { name: "填空题", accuracy: Math.round(avgAccuracy - 15) },
  ];

  // Per-bank chapter stats
  const bankChapterStats = useMemo(() => {
    const result: Array<{
      bankId: number;
      bankTitle: string;
      bankColor: string;
      chapters: Array<{ chapterId: number; chapterName: string; total: number; correct: number; wrong: number; accuracy: number }>;
    }> = [];

    for (const bank of banks || []) {
      if (!bank.chaptersJson) continue;
      const chapters: Array<{ chapterId: number; chapterName: string }> = JSON.parse(bank.chaptersJson);
      const bankRecords = (records || []).filter((r) => r.bankId === bank.id);
      const chapterStats = chapters.map((ch) => {
        const chRecs = bankRecords.filter((r) => r.chapterId === ch.chapterId);
        const correct = chRecs.filter((r) => r.isCorrect).length;
        const wrong = chRecs.filter((r) => !r.isCorrect).length;
        const total = correct + wrong;
        return {
          chapterId: ch.chapterId,
          chapterName: ch.chapterName,
          total,
          correct,
          wrong,
          accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
        };
      }).filter((ch) => ch.total > 0);

      if (chapterStats.length > 0) {
        result.push({
          bankId: bank.id,
          bankTitle: bank.title,
          bankColor: bank.color,
          chapters: chapterStats,
        });
      }
    }
    return result;
  }, [banks, records]);

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "var(--page-bg)", overflowX: "hidden" }}>
      <ParticleBackground />
      <div style={{ position: "relative", zIndex: 1, padding: "16px", paddingBottom: "100px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>数据洞察</h1>
          <div style={{ display: "flex", gap: "6px" }}>
            {["本周", "本月", "全部"].map((r) => (
              <button key={r} onClick={() => setTimeRange(r)} style={{ padding: "5px 12px", borderRadius: "16px", fontSize: "12px", border: "none", cursor: "pointer", background: timeRange === r ? "var(--accent-color)" : "var(--card-bg-secondary)", color: timeRange === r ? "var(--page-bg)" : "var(--text-secondary)" }}>{r}</button>
            ))}
          </div>
        </div>

        {/* Core Metrics */}
        <div style={{ display: "flex", gap: "10px", overflowX: "auto", marginBottom: "20px" }}>
          {[
            { icon: Clock, label: "练习时长", value: `${totalTime}分`, trend: "+12%", up: true },
            { icon: BookOpen, label: "累计题数", value: `${totalQuestions}`, trend: "+8%", up: true },
            { icon: Target, label: "平均正确率", value: `${avgAccuracy}%`, trend: avgAccuracy > 70 ? "+5%" : "-3%", up: avgAccuracy > 70 },
            { icon: Brain, label: "题库数", value: `${banks?.length || 0}`, trend: "+2", up: true },
          ].map((m, i) => (
            <motion.div key={m.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              style={{ minWidth: "130px", background: "var(--card-bg)", borderRadius: "12px", padding: "14px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <m.icon size={18} color="var(--accent-color)" />
              <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", marginTop: "8px" }}>{m.value}</div>
              <div style={{ display: "flex", alignItems: "center", gap: "3px", marginTop: "4px" }}>{m.up ? <TrendingUp size={12} color="var(--success)" /> : <TrendingDown size={12} color="var(--error)" />}<span style={{ fontSize: "11px", color: m.up ? "var(--success)" : "var(--error)" }}>{m.trend}</span></div>
              <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>{m.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Bar Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ background: "var(--card-bg)", borderRadius: "16px", padding: "16px", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 12px 0" }}>各题型表现</h2>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "16px", height: "160px" }}>
            {barData.map((d, i) => {
              const color = d.accuracy >= 80 ? "var(--success)" : d.accuracy >= 60 ? "var(--accent-color)" : "var(--error)";
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                  <div style={{ fontSize: "12px", color }}>{d.accuracy}%</div>
                  <div style={{ width: "100%", height: `${d.accuracy * 1.2}px`, background: color, borderRadius: "6px 6px 0 0", minHeight: "8px" }} />
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{d.name}</div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Chapter Stats */}
        {bankChapterStats.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 12px 0" }}>章节统计</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {bankChapterStats.map((bank) => (
                <div key={bank.bankId} style={{ background: "var(--card-bg)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <button
                    onClick={() => setExpandedBank(expandedBank === bank.bankId ? null : bank.bankId)}
                    style={{ width: "100%", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <FileText size={16} color={bank.bankColor} />
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{bank.bankTitle}</span>
                    </div>
                    {expandedBank === bank.bankId ? <ChevronUp size={16} color="var(--text-tertiary)" /> : <ChevronDown size={16} color="var(--text-tertiary)" />}
                  </button>
                  {expandedBank === bank.bankId && (
                    <div style={{ padding: "0 16px 12px" }}>
                      {bank.chapters.map((ch, idx) => (
                        <div key={ch.chapterId} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>第{idx + 1}章</div>
                            <div style={{ display: "flex", gap: "12px", marginTop: "2px" }}>
                              <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>{ch.total} 题</span>
                              <span style={{ fontSize: "11px", color: "var(--success)" }}>{ch.correct} 正确</span>
                              <span style={{ fontSize: "11px", color: "var(--error)" }}>{ch.wrong} 错误</span>
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: "16px", fontWeight: 700, color: ch.accuracy >= 80 ? "var(--success)" : ch.accuracy >= 60 ? "var(--accent-color)" : "var(--error)" }}>{ch.accuracy}%</div>
                            <div style={{ width: "60px", height: "4px", background: "var(--card-bg-secondary)", borderRadius: "2px", marginTop: "4px" }}>
                              <div style={{ width: `${ch.accuracy}%`, height: "100%", background: ch.accuracy >= 80 ? "var(--success)" : ch.accuracy >= 60 ? "var(--accent-color)" : "var(--error)", borderRadius: "2px" }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Trend */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} style={{ background: "var(--card-bg)", borderRadius: "16px", padding: "16px", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 12px 0" }}>学习趋势</h2>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "140px" }}>
            {(dailyRecords || []).slice(-14).map((d, i) => {
              const maxVal = Math.max(...(dailyRecords || []).slice(-14).map((x) => x.count), 1);
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                  <div style={{ fontSize: "9px", color: "var(--text-secondary)" }}>{d.correct}</div>
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1px" }}>
                    <div style={{ width: "100%", height: `${(d.count / maxVal) * 60}px`, background: "rgba(0,212,255,0.3)", borderRadius: "2px 2px 0 0", minHeight: "2px" }} />
                    <div style={{ width: "100%", height: `${(d.correct / maxVal) * 60}px`, background: "var(--success)", borderRadius: "0 0 2px 2px", minHeight: "2px" }} />
                  </div>
                  <div style={{ fontSize: "9px", color: "var(--text-tertiary)" }}>{d.date.slice(5)}</div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Heatmap */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} style={{ background: "var(--card-bg)", borderRadius: "16px", padding: "16px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 12px 0" }}>每日练习热力</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
            {heatmapData.map((c, i) => {
              const colors = ["var(--card-bg-secondary)", "rgba(0,212,255,0.2)", "rgba(0,212,255,0.4)", "rgba(0,212,255,0.6)", "rgba(0,212,255,0.8)"];
              return <div key={i} title={`${c.date}: ${c.count}题`} style={{ width: "10px", height: "10px", borderRadius: "2px", background: colors[c.level], cursor: "pointer" }} />;
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px", fontSize: "11px", color: "var(--text-tertiary)" }}><span>少</span><div style={{ display: "flex", gap: "3px" }}>{["var(--card-bg-secondary)", "rgba(0,212,255,0.2)", "rgba(0,212,255,0.4)", "rgba(0,212,255,0.6)", "rgba(0,212,255,0.8)"].map((c, i) => <div key={i} style={{ width: "10px", height: "10px", borderRadius: "2px", background: c }} />)}</div><span>多</span></div>
        </motion.div>
      </div>
    </div>
  );
}
