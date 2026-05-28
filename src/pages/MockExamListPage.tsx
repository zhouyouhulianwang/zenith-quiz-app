import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Trash2, GraduationCap, BookOpen, Clock, Play, FileText, Pencil } from "lucide-react";
import { trpc } from "@/providers/trpc";
import ParticleBackground from "@/components/ParticleBackground";

export default function MockExamListPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { data: mockExams, isLoading } = trpc.mockExam.list.useQuery();
  const deleteMutation = trpc.mockExam.delete.useMutation({
    onSuccess: () => utils.mockExam.list.invalidate(),
  });
  const updateTitleMutation = trpc.mockExam.updateTitle.useMutation({
    onSuccess: () => utils.mockExam.list.invalidate(),
  });
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const handlePractice = (exam: any) => {
    const params = new URLSearchParams();
    params.set("mockExamId", String(exam.id));
    navigate(`/mock-exam/practice?${params.toString()}`, {
      state: { title: exam.title },
    });
  };

  const startEdit = (exam: any) => {
    setEditingId(exam.id);
    setEditTitle(exam.title);
  };

  const saveEdit = () => {
    if (editingId !== null && editTitle.trim()) {
      updateTitleMutation.mutate({ id: editingId, title: editTitle.trim() });
      setEditingId(null);
      setEditTitle("");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: "var(--page-bg)", overflowX: "hidden" }}>
      <ParticleBackground />
      <div style={{ position: "relative", zIndex: 1, padding: "16px", paddingBottom: "100px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <button onClick={() => navigate("/training")} style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ArrowLeft size={24} color="var(--text-primary)" />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>预设模拟卷</h1>
            <p style={{ fontSize: "13px", color: "var(--text-tertiary)", margin: "2px 0 0" }}>自定义试卷，反复练习</p>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/mock-exam/create")}
            style={{ background: "var(--accent-color)", border: "none", borderRadius: "12px", padding: "10px 16px", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            <Plus size={16} /> 新建
          </motion.button>
        </div>

        {/* Empty State */}
        {(!mockExams || mockExams.length === 0) && !isLoading && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <FileText size={56} color="var(--text-tertiary)" style={{ opacity: 0.5 }} />
            <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-secondary)", marginTop: "16px" }}>暂无模拟卷</p>
            <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "6px", marginBottom: "20px" }}>点击右上角「新建」创建你的第一个模拟卷</p>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate("/mock-exam/create")}
              style={{ padding: "12px 24px", borderRadius: "12px", background: "var(--accent-color)", color: "#fff", border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
              创建模拟卷
            </motion.button>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-tertiary)" }}>加载中...</div>
        )}

        {/* Mock Exam List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {mockExams?.map((exam, i) => (
            <motion.div key={exam.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              style={{ background: "var(--card-bg)", borderRadius: "16px", padding: "16px", border: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <GraduationCap size={22} color="#f59e0b" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Title - editable */}
                  {editingId === exam.id ? (
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                        autoFocus
                        style={{
                          flex: 1,
                          fontSize: "16px",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          background: "var(--card-bg-secondary)",
                          border: "1px solid var(--accent-color)",
                          borderRadius: "8px",
                          padding: "4px 8px",
                          outline: "none",
                        }}
                      />
                      <button onClick={saveEdit}
                        style={{ padding: "4px 10px", borderRadius: "6px", background: "var(--accent-color)", color: "#fff", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                        保存
                      </button>
                      <button onClick={cancelEdit}
                        style={{ padding: "4px 10px", borderRadius: "6px", background: "var(--card-bg-secondary)", color: "var(--text-tertiary)", border: "1px solid var(--border-color)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                        取消
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                        {exam.title}
                      </div>
                      <button onClick={() => startEdit(exam)}
                        style={{ padding: "4px", borderRadius: "6px", background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Pencil size={14} />
                      </button>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "6px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <BookOpen size={12} /> {exam.bankName || "题库"}
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <FileText size={12} /> {exam.questionCount}题
                    </span>
                    {exam.practicedCount > 0 && (
                      <span style={{ fontSize: "12px", color: "var(--accent-color)", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={12} /> 已练习{exam.practicedCount}次
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => handlePractice(exam)}
                  style={{ flex: 1, padding: "10px", borderRadius: "10px", background: "var(--accent-color)", color: "#fff", border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                  <Play size={14} /> 开始练习
                </motion.button>
                <button onClick={() => setConfirmDelete(exam.id)}
                  style={{ padding: "10px 14px", borderRadius: "10px", background: "var(--card-bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-tertiary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Delete Confirm */}
      <AnimatePresence>
        {confirmDelete !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 20 }}
              style={{ background: "var(--card-bg)", borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "340px", border: "1px solid var(--border-color)", textAlign: "center" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <Trash2 size={22} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>删除模拟卷</h3>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: "0 0 20px" }}>删除后无法恢复，确认删除吗？</p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setConfirmDelete(null)}
                  style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "var(--card-bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                  取消
                </button>
                <button onClick={() => { deleteMutation.mutate({ id: confirmDelete }); setConfirmDelete(null); }}
                  style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "#ef4444", color: "#fff", border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                  删除
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
