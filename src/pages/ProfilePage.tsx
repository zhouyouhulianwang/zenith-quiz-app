import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Settings, Bell, Sun, Monitor, Moon, Type, Target, Download, Trash2, HelpCircle, FileText, Award, Calendar, BookOpen, Flame, Languages, RotateCcw, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAppSettings } from "@/context/AppContext";
import { trpc } from "@/providers/trpc";
import ParticleBackground from "@/components/ParticleBackground";

export default function ProfilePage() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { settings, setSettings } = useAppSettings();
  const { data: banks } = trpc.bank.list.useQuery();
  const { data: records } = trpc.record.list.useQuery();
  const utils = trpc.useUtils();
  const deleteBank = trpc.bank.delete.useMutation({ onSuccess: () => utils.bank.list.invalidate() });

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showBankReset, setShowBankReset] = useState(false);
  const [resetBankId, setResetBankId] = useState<number | null>(null);

  const joinDays = user?.createdAt ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000) : 0;
  const totalQ = records?.length || 0;
  const wrongQ = records?.filter((r) => !r.isCorrect).length || 0;
  const correctQ = records?.filter((r) => r.isCorrect).length || 0;

  const handleExport = () => {
    const data = { banks, records, settings, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zenith-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return (
      <div style={{ position: "relative", minHeight: "100vh", background: "var(--page-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ParticleBackground />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "20px" }}>
          <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "var(--card-bg-secondary)", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <UserIcon size={32} color="#666" />
          </div>
          <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>登录后同步你的练习数据</p>
          <a href="/api/oauth/authorize" style={{ display: "inline-block", padding: "14px 32px", background: "#00d4ff", color: "var(--page-bg)", borderRadius: "12px", fontSize: "15px", fontWeight: 600, textDecoration: "none" }}>
            立即登录
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "var(--page-bg)", overflowX: "hidden" }}>
      <ParticleBackground />
      <div style={{ position: "relative", zIndex: 1, paddingBottom: "100px" }}>
        {/* User Card */}
        <div style={{ background: "linear-gradient(135deg, #7c3aed, #00d4ff)", borderRadius: "0 0 24px 24px", padding: "32px 20px 24px", textAlign: "center" }}>
          <div style={{ width: "80px", height: "80px", borderRadius: "50%", border: "3px solid rgba(0,0,0,0.3)", overflow: "hidden", margin: "0 auto 12px", background: "rgba(0,0,0,0.2)" }}>
            <img src={user?.avatar || "/avatar-default.png"} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).src = "/avatar-default.png"; }} />
          </div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>{user?.name || "学习者"}</div>
          <div style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "4px" }}>{user?.email || ""}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "20px" }}>
            <div><div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>{joinDays}</div><div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>加入天数</div></div>
            <div><div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>{totalQ}</div><div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>总练习数</div></div>
            <div onClick={() => correctQ > 0 && navigate("/mistakes", { state: { mode: "correct" } })} style={{ cursor: correctQ > 0 ? "pointer" : "default" }}>
              <div style={{ fontSize: "20px", fontWeight: 700, color: correctQ > 0 ? "#10b981" : "var(--text-primary)" }}>{correctQ}</div>
              <div style={{ fontSize: "11px", color: correctQ > 0 ? "#10b981" : "var(--text-secondary)" }}>正确数</div>
            </div>
            <div onClick={() => wrongQ > 0 && navigate("/mistakes", { state: { mode: "wrong" } })} style={{ cursor: wrongQ > 0 ? "pointer" : "default" }}>
              <div style={{ fontSize: "20px", fontWeight: 700, color: wrongQ > 0 ? "#ef4444" : "var(--text-primary)" }}>{wrongQ}</div>
              <div style={{ fontSize: "11px", color: wrongQ > 0 ? "#ef4444" : "var(--text-secondary)" }}>错题数</div>
            </div>
            <div><div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>{banks?.length || 0}</div><div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>题库数</div></div>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={logout}
            style={{ marginTop: "16px", padding: "8px 20px", background: "rgba(0,0,0,0.15)", border: "1px solid var(--border-color)", borderRadius: "20px", color: "var(--text-primary)", fontSize: "13px", cursor: "pointer" }}>
            退出登录
          </motion.button>
        </div>

        <div style={{ padding: "16px" }}>
          {/* Badges */}
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 12px 0" }}>成就徽章</h2>
            <div style={{ display: "flex", gap: "12px", overflowX: "auto" }}>
              {[
                { id: "first", name: "初次练习", icon: BookOpen, earned: totalQ > 0 },
                { id: "streak3", name: "连续3天", icon: Flame, earned: joinDays >= 3 },
                { id: "streak7", name: "连续7天", icon: Flame, earned: joinDays >= 7 },
                { id: "master", name: "百题斩", icon: Award, earned: totalQ >= 100 },
                { id: "expert", name: "专家级", icon: Award, earned: totalQ >= 500 },
                { id: "perfect", name: "全对一次", icon: Award, earned: records?.some((r) => r.isCorrect) || false },
              ].map((badge, i) => (
                <motion.div key={badge.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} style={{ minWidth: "80px", textAlign: "center", opacity: badge.earned ? 1 : 0.4 }}>
                  <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: badge.earned ? "rgba(0,212,255,0.2)" : "var(--card-bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", border: badge.earned ? "1px solid rgba(0,212,255,0.3)" : "1px solid var(--border-color)" }}>
                    <badge.icon size={24} color={badge.earned ? "#00d4ff" : "#666"} />
                  </div>
                  <div style={{ fontSize: "12px", color: badge.earned ? "var(--text-primary)" : "var(--text-tertiary)" }}>{badge.name}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px", paddingLeft: "4px" }}>学习设置</div>
              <div style={{ background: "var(--card-bg)", borderRadius: "12px", border: "1px solid var(--border-color)", overflow: "hidden" }}>
                <SettingRow icon={Target} label="每日目标" value={`${settings.dailyGoal}题`} onClick={() => { const v = prompt("设置每日目标题数:", String(settings.dailyGoal)); if (v && !isNaN(Number(v))) setSettings({ dailyGoal: Number(v) }); }} />
                <SettingRow icon={Bell} label="提醒时间" value={settings.reminderTime} onClick={() => { const v = prompt("设置提醒时间 (HH:MM):", settings.reminderTime); if (v && /^\d{2}:\d{2}$/.test(v)) setSettings({ reminderTime: v }); }} />
                <SettingRow icon={Type} label="难度偏好" value={`${"★".repeat(settings.difficulty)}${"☆".repeat(5 - settings.difficulty)}`} onClick={() => { const v = prompt("设置难度偏好 (1-5):", String(settings.difficulty)); if (v) setSettings({ difficulty: Math.max(1, Math.min(5, Number(v))) }); }} />
                <SettingRow icon={Languages} label="题目语言" value={{ zh: "中文", en: "English", both: "中英对照", tc: "繁體中文", entc: "英文+繁體" }[settings.questionLanguage] || "英文+繁體"} onClick={() => { const langs: Array<"zh" | "en" | "both" | "tc" | "entc"> = ["zh", "en", "both", "tc", "entc"]; const idx = langs.indexOf(settings.questionLanguage); setSettings({ questionLanguage: langs[(idx + 1) % langs.length] }); }} />
              </div>
            </div>

            <div>
              <div style={{ fontSize: "12px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px", paddingLeft: "4px" }}>数据管理</div>
              <div style={{ background: "var(--card-bg)", borderRadius: "12px", border: "1px solid var(--border-color)", overflow: "hidden" }}>
                <SettingRow icon={Download} label="导出数据" value="JSON" onClick={handleExport} />
                <SettingRow icon={RotateCcw} label="按卷清空记录" value={`${banks?.length || 0} 套题库`} onClick={() => setShowBankReset(true)} />
                <SettingRow icon={Trash2} label="清空所有记录" value="" danger onClick={() => setShowResetConfirm(true)} />
              </div>
            </div>

            {user?.role === "admin" && (
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px", paddingLeft: "4px" }}>管理</div>
                <div style={{ background: "var(--card-bg)", borderRadius: "12px", border: "1px solid var(--border-color)", overflow: "hidden" }}>
                  <SettingRow icon={Shield} label="管理后台" value="查看数据库" onClick={() => navigate("/admin")} />
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: "12px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px", paddingLeft: "4px" }}>应用设置</div>
              <div style={{ background: "var(--card-bg)", borderRadius: "12px", border: "1px solid var(--border-color)", overflow: "hidden" }}>
                <SettingRow icon={settings.theme === "light" ? Sun : settings.theme === "system" ? Monitor : Moon} label="外观" value={{ system: "跟随系统", dark: "深色", light: "浅色" }[settings.theme] || "跟随系统"} onClick={() => { const themes: Array<"system" | "dark" | "light"> = ["system", "dark", "light"]; const idx = themes.indexOf(settings.theme); setSettings({ theme: themes[(idx + 1) % themes.length] }); }} />
                <SettingRow icon={Type} label="字体大小" value={settings.fontSize === "small" ? "小" : settings.fontSize === "large" ? "大" : "中"} onClick={() => { const sizes: Array<"small" | "medium" | "large"> = ["small", "medium", "large"]; const idx = sizes.indexOf(settings.fontSize); setSettings({ fontSize: sizes[(idx + 1) % sizes.length] }); }} />
              </div>
            </div>

            <div>
              <div style={{ fontSize: "12px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px", paddingLeft: "4px" }}>关于</div>
              <div style={{ background: "var(--card-bg)", borderRadius: "12px", border: "1px solid var(--border-color)", overflow: "hidden" }}>
                <SettingRow icon={HelpCircle} label="帮助与反馈" value="" onClick={() => alert("请发送邮件至 support@zenith.app")} />
                <SettingRow icon={FileText} label="隐私政策" value="" onClick={() => alert("所有数据存储在云端服务器，我们严格保护您的隐私。")} />
                <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}><Calendar size={18} color="#666" /><span style={{ fontSize: "14px", color: "var(--text-primary)", flex: 1 }}>版本号</span><span style={{ fontSize: "14px", color: "var(--text-tertiary)" }}>v2.0.0</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bank Reset Modal */}
      {showBankReset && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ background: "var(--card-bg)", borderRadius: "16px", padding: "20px", width: "100%", maxWidth: "500px", border: "1px solid var(--border-color)", maxHeight: "80vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px 0" }}>选择要清空的题库</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
              {(banks || []).map((bank) => (
                <button key={bank.id} onClick={() => setResetBankId(bank.id === resetBankId ? null : bank.id)}
                  style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", borderRadius: "10px", background: resetBankId === bank.id ? "rgba(239,68,68,0.15)" : "var(--card-bg-secondary)", border: resetBankId === bank.id ? "1px solid rgba(239,68,68,0.4)" : "1px solid var(--border-color)", cursor: "pointer", width: "100%", textAlign: "left" }}>
                  <div style={{ width: "4px", height: "36px", borderRadius: "2px", background: bank.color || "#00d4ff" }} />
                  <div style={{ flex: 1 }}><div style={{ fontSize: "14px", color: "var(--text-primary)" }}>{bank.title}</div></div>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button onClick={() => { setShowBankReset(false); setResetBankId(null); }} style={{ flex: 1, padding: "12px", borderRadius: "10px", background: "var(--card-bg-secondary)", color: "var(--text-primary)", border: "none", cursor: "pointer" }}>取消</button>
              <button onClick={() => { if (resetBankId) deleteBank.mutate({ id: resetBankId }); setShowBankReset(false); }} disabled={!resetBankId} style={{ flex: 1, padding: "12px", borderRadius: "10px", background: resetBankId ? "#ef4444" : "var(--card-bg-secondary)", color: "var(--text-primary)", border: "none", cursor: resetBankId ? "pointer" : "not-allowed" }}>确认清空</button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Reset All Confirm */}
      {showResetConfirm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ background: "var(--card-bg)", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "420px", border: "1px solid var(--border-color)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 8px 0" }}>确认全部清空</h3>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: "0 0 20px 0" }}>此操作将删除所有题库和练习记录，无法恢复。</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setShowResetConfirm(false)} style={{ flex: 1, padding: "12px", borderRadius: "10px", background: "var(--card-bg-secondary)", color: "var(--text-primary)", border: "none", cursor: "pointer" }}>取消</button>
              <button onClick={() => { (banks || []).forEach((b) => deleteBank.mutate({ id: b.id })); setShowResetConfirm(false); }} style={{ flex: 1, padding: "12px", borderRadius: "10px", background: "#ef4444", color: "var(--text-primary)", border: "none", cursor: "pointer", fontWeight: 600 }}>确认清空</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function UserIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SettingRow({ icon: Icon, label, value, onClick, danger }: { icon: typeof Settings; label: string; value: React.ReactNode; onClick?: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{ width: "100%", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", background: "none", border: "none", borderBottom: "1px solid var(--border-color)", cursor: onClick ? "pointer" : "default", textAlign: "left" }}>
      <Icon size={18} color={danger ? "#ef4444" : "#666"} />
      <span style={{ fontSize: "14px", color: danger ? "#ef4444" : "var(--text-primary)", flex: 1 }}>{label}</span>
      {typeof value === "string" ? <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>{value}</span> : value}
    </button>
  );
}
