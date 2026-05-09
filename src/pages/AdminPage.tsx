import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { trpc } from "@/providers/trpc";
import {
  ArrowLeft,
  Users,
  BookOpen,
  ClipboardList,
  Calendar,
  Trash2,
  Shield,
  Database,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";

const tableHeaderStyle: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--text-secondary)",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
};

const tableCellStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: "13px",
  color: "var(--text-primary)",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
};

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: "var(--card-bg)",
        borderRadius: "12px",
        padding: "16px",
        border: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <div
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "10px",
          background: `${color}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{label}</div>
      </div>
    </motion.div>
  );
}

function CollapsibleSection({
  title,
  icon: Icon,
  color,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        background: "var(--card-bg)",
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.08)",
        marginBottom: "12px",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Icon size={18} color={color} />
          <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>{title}</span>
        </div>
        {open ? <ChevronUp size={18} color="var(--text-tertiary)" /> : <ChevronDown size={18} color="var(--text-tertiary)" />}
      </button>
      {open && <div style={{ padding: "0 0 12px" }}>{children}</div>}
    </div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: stats } = trpc.admin.stats.useQuery();
  const { data: usersList } = trpc.admin.listUsers.useQuery();
  const { data: banksList } = trpc.admin.listBanks.useQuery();
  const { data: recordsList } = trpc.admin.listRecords.useQuery();
  const { data: dailyList } = trpc.admin.listDaily.useQuery();

  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      utils.admin.stats.invalidate();
      utils.admin.listUsers.invalidate();
      utils.admin.listBanks.invalidate();
      utils.admin.listRecords.invalidate();
      utils.admin.listDaily.invalidate();
    },
  });

  const formatDate = (d: Date | string | null) => {
    if (!d) return "-";
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        background: "var(--page-bg)",
        overflowX: "hidden",
      }}
    >
      <ParticleBackground />
      <div style={{ position: "relative", zIndex: 1, padding: "16px", paddingBottom: "100px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <button
            onClick={() => navigate("/profile")}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
          >
            <ArrowLeft size={24} color="var(--text-primary)" />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              <Shield size={20} style={{ display: "inline", marginRight: "6px" }} />
              管理后台
            </h1>
            <p style={{ fontSize: "12px", color: "var(--text-tertiary)", margin: "2px 0 0" }}>数据库管理面板</p>
          </div>
          <Database size={20} color="var(--accent-color)" />
        </div>

        {/* Stats Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <StatCard icon={Users} label="用户" value={stats?.users ?? 0} color="var(--accent-color)" />
          <StatCard icon={BookOpen} label="题库" value={stats?.banks ?? 0} color="var(--success)" />
          <StatCard
            icon={ClipboardList}
            label="练习记录"
            value={stats?.practiceRecords ?? 0}
            color="#f59e0b"
          />
          <StatCard icon={Calendar} label="日记录" value={stats?.dailyRecords ?? 0} color="#8b5cf6" />
        </div>

        {/* Users Table */}
        <CollapsibleSection title="用户列表" icon={Users} color="var(--accent-color)" defaultOpen={true}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>ID</th>
                  <th style={tableHeaderStyle}>账号</th>
                  <th style={tableHeaderStyle}>名称</th>
                  <th style={tableHeaderStyle}>角色</th>
                  <th style={tableHeaderStyle}>注册时间</th>
                  <th style={tableHeaderStyle}>操作</th>
                </tr>
              </thead>
              <tbody>
                {usersList?.map((u) => (
                  <tr key={u.id}>
                    <td style={tableCellStyle}>{u.id}</td>
                    <td style={tableCellStyle}>{u.username || "-"}</td>
                    <td style={tableCellStyle}>{u.name || "-"}</td>
                    <td style={tableCellStyle}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: u.role === "admin" ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)",
                          color: u.role === "admin" ? "var(--error)" : "var(--success)",
                        }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td style={tableCellStyle}>{formatDate(u.createdAt)}</td>
                    <td style={tableCellStyle}>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          if (confirm(`确定删除用户 "${u.name || u.username}" 及其所有数据？`)) {
                            deleteUser.mutate({ id: u.id });
                          }
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "4px",
                          color: "var(--error)",
                        }}
                      >
                        <Trash2 size={16} />
                      </motion.button>
                    </td>
                  </tr>
                ))}
                {(!usersList || usersList.length === 0) && (
                  <tr>
                    <td colSpan={6} style={{ ...tableCellStyle, textAlign: "center", color: "var(--text-tertiary)" }}>
                      暂无用户
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>

        {/* Banks Table */}
        <CollapsibleSection title="题库列表" icon={BookOpen} color="var(--success)">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>ID</th>
                  <th style={tableHeaderStyle}>用户ID</th>
                  <th style={tableHeaderStyle}>标题</th>
                  <th style={tableHeaderStyle}>分类</th>
                  <th style={tableHeaderStyle}>题数</th>
                  <th style={tableHeaderStyle}>进度</th>
                  <th style={tableHeaderStyle}>导入时间</th>
                </tr>
              </thead>
              <tbody>
                {banksList?.map((b) => (
                  <tr key={b.id}>
                    <td style={tableCellStyle}>{b.id}</td>
                    <td style={tableCellStyle}>{b.userId}</td>
                    <td style={{ ...tableCellStyle, maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {b.title}
                    </td>
                    <td style={tableCellStyle}>{b.category}</td>
                    <td style={tableCellStyle}>{b.questionCount ?? "?"}</td>
                    <td style={tableCellStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div
                          style={{
                            flex: 1,
                            height: "4px",
                            background: "var(--card-bg-secondary)",
                            borderRadius: "2px",
                            maxWidth: "50px",
                          }}
                        >
                          <div
                            style={{
                              width: `${b.progress}%`,
                              height: "100%",
                              background: b.color || "var(--accent-color)",
                              borderRadius: "2px",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{b.progress}%</span>
                      </div>
                    </td>
                    <td style={tableCellStyle}>{formatDate(b.importedAt)}</td>
                  </tr>
                ))}
                {(!banksList || banksList.length === 0) && (
                  <tr>
                    <td colSpan={7} style={{ ...tableCellStyle, textAlign: "center", color: "var(--text-tertiary)" }}>
                      暂无题库
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>

        {/* Practice Records */}
        <CollapsibleSection title="练习记录" icon={ClipboardList} color="#f59e0b">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>ID</th>
                  <th style={tableHeaderStyle}>用户</th>
                  <th style={tableHeaderStyle}>题库</th>
                  <th style={tableHeaderStyle}>题ID</th>
                  <th style={tableHeaderStyle}>答案</th>
                  <th style={tableHeaderStyle}>正确</th>
                  <th style={tableHeaderStyle}>用时</th>
                  <th style={tableHeaderStyle}>时间</th>
                </tr>
              </thead>
              <tbody>
                {recordsList?.map((r) => (
                  <tr key={r.id}>
                    <td style={tableCellStyle}>{r.id}</td>
                    <td style={tableCellStyle}>{r.userId}</td>
                    <td style={tableCellStyle}>{r.bankId}</td>
                    <td style={tableCellStyle}>{r.questionId}</td>
                    <td style={{ ...tableCellStyle, maxWidth: "60px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.selected}
                    </td>
                    <td style={tableCellStyle}>
                      <span
                        style={{
                          color: r.isCorrect === 1 ? "var(--success)" : "var(--error)",
                          fontWeight: 600,
                        }}
                      >
                        {r.isCorrect === 1 ? "Y" : "N"}
                      </span>
                    </td>
                    <td style={tableCellStyle}>{Math.round(r.timeSpent / 1000)}s</td>
                    <td style={{ ...tableCellStyle, fontSize: "11px" }}>{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
                {(!recordsList || recordsList.length === 0) && (
                  <tr>
                    <td colSpan={8} style={{ ...tableCellStyle, textAlign: "center", color: "var(--text-tertiary)" }}>
                      暂无记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>

        {/* Daily Records */}
        <CollapsibleSection title="每日统计" icon={Calendar} color="#8b5cf6">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>ID</th>
                  <th style={tableHeaderStyle}>用户</th>
                  <th style={tableHeaderStyle}>日期</th>
                  <th style={tableHeaderStyle}>做题数</th>
                  <th style={tableHeaderStyle}>正确数</th>
                  <th style={tableHeaderStyle}>正确率</th>
                </tr>
              </thead>
              <tbody>
                {dailyList?.map((d) => (
                  <tr key={d.id}>
                    <td style={tableCellStyle}>{d.id}</td>
                    <td style={tableCellStyle}>{d.userId}</td>
                    <td style={tableCellStyle}>{d.date}</td>
                    <td style={tableCellStyle}>{d.count}</td>
                    <td style={tableCellStyle}>{d.correct}</td>
                    <td style={tableCellStyle}>
                      {d.count > 0 ? `${Math.round((d.correct / d.count) * 100)}%` : "-"}
                    </td>
                  </tr>
                ))}
                {(!dailyList || dailyList.length === 0) && (
                  <tr>
                    <td colSpan={6} style={{ ...tableCellStyle, textAlign: "center", color: "var(--text-tertiary)" }}>
                      暂无记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
