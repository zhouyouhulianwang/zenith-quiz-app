import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Upload, X, Clock, Tag, ChevronRight, Trash2, Pencil, Check } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { parseTxtToBank } from "@/utils/txtParser";
import type { Question } from "@/context/AppContext";
import ParticleBackground from "@/components/ParticleBackground";

const categories = ["全部", "证券从业", "基金从业", "银行从业", "会计", "编程", "自定义"];

function answerToIndex(answer: string): number[] {
  if (!answer) return [0];
  const indices: number[] = [];
  for (const char of answer.split(",")) {
    const c = char.trim().toUpperCase();
    if (c.length === 1 && c >= "A" && c <= "Z") indices.push(c.charCodeAt(0) - 65);
  }
  return indices.length > 0 ? indices : [0];
}

function stripOptionPrefix(opt: unknown): string {
  const s = typeof opt === "string" ? opt : String(opt || "");
  if (!s) return "";
  return s.replace(/^[A-Z][\.．、\s]\s*/, "").trim();
}

function stripHtml(html: unknown): string {
  const s = typeof html === "string" ? html : String(html || "");
  if (!s) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = s;
  let text = tmp.textContent || tmp.innerText || "";
  text = typeof text === "string" ? text : String(text);
  return text.replace(/\n+/g, "\n").replace(/ +/g, " ").trim();
}

function mapQuestionType(qtype: string | number): Question["type"] {
  const mapping: Record<string, Question["type"]> = {
    "单选题": "single", "多选题": "multiple", "判断题": "boolean", "填空题": "fill",
    "1": "single", "2": "multiple", "3": "boolean", "4": "fill",
  };
  return mapping[String(qtype)] || "single";
}

interface ChapterInfo {
  chapterId: number;
  chapterName: string;
  questionCount: number;
}

function isChineseKeyFormat(data: Record<string, unknown>): boolean {
  return "章节列表" in data || "卷名" in data;
}

function parseChineseOptions(opts: unknown): string[] {
  if (!Array.isArray(opts)) return [];
  // Format: [{"key":"A","value":"xxx"}, ...] or ["A. xxx", ...]
  return opts.map((opt) => {
    if (opt && typeof opt === "object" && "key" in opt && "value" in opt) {
      return `${opt.key as string}. ${opt.value as string}`;
    }
    return String(opt);
  });
}

function parseChinesePaperJson(data: Record<string, unknown>): { title: string; questions: Question[]; chapters: ChapterInfo[] } {
  const chapters = (data.章节列表 as Array<Record<string, unknown>>) || [];
  const questions: Question[] = [];
  const chapterInfos: ChapterInfo[] = [];
  for (const ch of chapters) {
    const qs = (ch.题目 as Array<Record<string, unknown>>) || [];
    const chapterId = (ch.章节ID as number) || (ch.章节编号 as number) || 0;
    const chapterName = (ch.章节名 as string) || (ch.父章节 as string) || "未命名章节";
    if (qs.length > 0) {
      chapterInfos.push({ chapterId, chapterName, questionCount: qs.length });
    }
    for (const q of qs) {
      const options = parseChineseOptions(q.选项);
      questions.push({
        id: (q.题目ID as number) || 0,
        type: mapQuestionType(q.题型 ?? "单选题"),
        question: stripHtml((q.题目内容 as string) || ""),
        options: options.map(stripOptionPrefix),
        correct: answerToIndex((q.答案 as string) || ""),
        explanation: stripHtml((q.解析 as string) || ""),
        enQuestion: stripHtml((q.英文内容 as string) || ""),
        enOptions: [], // Will be auto-translated
        tcQuestion: stripHtml((q.繁体内容 as string) || ""),
        chapterId,
        chapterName,
      });
    }
  }
  const title = `${data.卷名 as string} ${data.卷英文名 as string || ""}`.trim() || "未命名题库";
  return { title, questions, chapters: chapterInfos };
}

function parsePaperJson(data: Record<string, unknown>): { title: string; questions: Question[]; chapters: ChapterInfo[] } {
  // Detect Chinese-key format (卷一/卷二 JSON)
  if (isChineseKeyFormat(data)) {
    return parseChinesePaperJson(data);
  }
  // Standard format
  const chapters = (data.chapters as Array<Record<string, unknown>>) || [];
  const questions: Question[] = [];
  const chapterInfos: ChapterInfo[] = [];
  for (const ch of chapters) {
    const qs = (ch.questions as Array<Record<string, unknown>>) || [];
    const chapterId = (ch.chapterId as number) || 0;
    const chapterName = (ch.chapterName as string) || "未命名章节";
    if (qs.length > 0) {
      chapterInfos.push({ chapterId, chapterName, questionCount: qs.length });
    }
    for (const q of qs) {
      questions.push({
        id: (q.id as number) || 0,
        type: mapQuestionType(q.questionType ?? "单选题"),
        question: stripHtml((q.content as string) || ""),
        options: parseChineseOptions(q.options).map(stripOptionPrefix),
        correct: answerToIndex((q.answer as string) || ""),
        explanation: stripHtml((q.analysis as string) || ""),
        enQuestion: stripHtml((q.enContent as string) || ""),
        enOptions: [],
        chapterId,
        chapterName,
      });
    }
  }
  return { title: (data.paperName as string) || "未命名题库", questions, chapters: chapterInfos };
}

function parseLegacyJson(data: Record<string, unknown>): { title: string; questions: Question[] } {
  const qs = (data.questions as Array<Record<string, unknown>>) || [];
  return {
    title: (data.title as string) || "未命名题库",
    questions: qs.map((q) => ({
      id: (q.id as number) || 0,
      type: ((q.type as string) || "single") as Question["type"],
      question: (q.question as string) || "",
      options: (q.options as string[]) || [],
      correct: (q.correct as number[]) || [0],
      explanation: (q.explanation as string) || "",
    })),
  };
}

export default function LibraryPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { data: banks, isLoading } = trpc.bank.list.useQuery();
  const createBank = trpc.bank.create.useMutation({ onSuccess: () => utils.bank.list.invalidate() });
  const deleteBank = trpc.bank.delete.useMutation({ onSuccess: () => utils.bank.list.invalidate() });

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("全部");
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateTitle = trpc.bank.updateTitle.useMutation({
    onSuccess: async () => {
      await utils.bank.list.invalidate();
      setEditingId(null);
    },
  });

  const filteredBanks = (banks || []).filter((bank) => {
    const matchesSearch = bank.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "全部" || bank.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleFileImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const isJson = file.name.endsWith(".json");
      const isTxt = file.name.endsWith(".txt");
      if (!isJson && !isTxt) {
        setImportError("请上传 JSON 或 TXT 格式的文件");
        setTimeout(() => setImportError(""), 3000);
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          let title: string;
          let questions: Question[];

          let chapters: ChapterInfo[] | undefined;

          if (isJson) {
            const data = JSON.parse(event.target?.result as string) as Record<string, unknown>;
            if (Array.isArray(data.chapters)) {
              ({ title, questions, chapters } = parsePaperJson(data));
            } else if (Array.isArray(data.questions)) {
              ({ title, questions } = parseLegacyJson(data));
            } else {
              throw new Error("JSON 格式不正确：需要包含 chapters 或 questions 数组");
            }
          } else {
            const text = event.target?.result as string;
            ({ title, questions } = parseTxtToBank(text));
          }

          await createBank.mutateAsync({ title, questions, chapters, category: "证券从业", color: "#00d4ff" });
          setImportSuccess(`成功导入「${title}」，共 ${questions.length} 题`);
          setTimeout(() => setImportSuccess(""), 3000);
        } catch (err) {
          console.error("IMPORT ERROR:", err);
          const msg = err instanceof Error ? `${err.message}\n${err.stack}` : "导入失败，请检查文件格式";
          setImportError(msg);
          setTimeout(() => setImportError(""), 8000);
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [createBank]
  );

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--page-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "var(--text-secondary)" }}>请先登录以管理题库</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "var(--page-bg)", overflowX: "hidden" }}>
      <ParticleBackground />
      <div style={{ position: "relative", zIndex: 1, padding: "16px", paddingBottom: "100px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px 0" }}>题库管理</h1>

        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", background: "var(--card-bg-secondary)", borderRadius: "12px", padding: "12px 16px", gap: "10px", marginBottom: "16px" }}>
          <Search size={18} color="#666" />
          <input
            type="text"
            placeholder="搜索题库..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, background: "none", border: "none", color: "var(--text-primary)", fontSize: "14px", outline: "none" }}
          />
          {searchQuery && <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={16} color="#666" /></button>}
        </div>

        {/* Category Filter */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", marginBottom: "16px" }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: "6px 16px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                background: activeCategory === cat ? "#00d4ff" : "var(--card-bg-secondary)",
                color: activeCategory === cat ? "var(--page-bg)" : "var(--text-secondary)",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Import Area */}
        <motion.div whileTap={{ scale: 0.98 }} onClick={() => fileInputRef.current?.click()} style={{
          border: "2px dashed rgba(0,212,255,0.3)", borderRadius: "12px", padding: "24px",
          textAlign: "center", marginBottom: "20px", cursor: "pointer", background: "rgba(0,212,255,0.03)",
        }}>
          <Upload size={28} color="#00d4ff" style={{ marginBottom: "8px" }} />
          <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>点击导入 JSON 或 TXT 题库文件</div>
        </motion.div>
        <input ref={fileInputRef} type="file" accept=".json,.txt" onChange={handleFileImport} style={{ display: "none" }} />

        {/* Toast */}
        <AnimatePresence>
          {importError && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#ef4444" }}>
              {importError}
            </motion.div>
          )}
          {importSuccess && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#10b981" }}>
              {importSuccess}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bank List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {isLoading ? (
            <div style={{ color: "var(--text-tertiary)", textAlign: "center", padding: "40px" }}>加载中...</div>
          ) : filteredBanks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-tertiary)" }}>暂无题库，请导入</div>
          ) : (
            filteredBanks.map((bank, i) => (
              <motion.div key={bank.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                style={{ background: "var(--card-bg)", borderRadius: "12px", overflow: "hidden", border: "1px solid var(--border-color)" }}>
                <div style={{ height: "4px", background: bank.color || "#00d4ff" }} />
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    {editingId === bank.id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") updateTitle.mutate({ id: bank.id, title: editTitle });
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          autoFocus
                          style={{ flex: 1, fontSize: "15px", fontWeight: 600, padding: "4px 8px", borderRadius: "6px", border: "1px solid #00d4ff", background: "var(--card-bg)", color: "var(--text-primary)", outline: "none" }}
                        />
                        <button onClick={() => updateTitle.mutate({ id: bank.id, title: editTitle })} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
                          <Check size={16} color="#10b981" />
                        </button>
                        <button onClick={() => setEditingId(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
                          <X size={16} color="#666" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: 0, flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                          {bank.title}
                          <button
                            onClick={() => { setEditingId(bank.id); setEditTitle(bank.title); }}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", opacity: 0.5 }}
                          >
                            <Pencil size={13} color="#00d4ff" />
                          </button>
                        </h3>
                        <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "10px", background: "rgba(0,212,255,0.15)", color: "#00d4ff", whiteSpace: "nowrap" }}>
                          {bank.questionCount}题
                        </span>
                      </>
                    )}
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "0 0 10px 0", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {bank.description || ""}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", fontSize: "12px", color: "var(--text-tertiary)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><Tag size={12} /> {bank.category}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><Clock size={12} /> {bank.lastPracticedAt ? new Date(bank.lastPracticedAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }) : "未练习"}</span>
                  </div>
                  <div style={{ width: "100%", height: "3px", background: "var(--card-bg-secondary)", borderRadius: "2px", marginBottom: "12px" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${bank.progress}%` }} transition={{ duration: 0.8, delay: i * 0.1 }}
                      style={{ height: "100%", background: bank.color || "#00d4ff", borderRadius: "2px" }} />
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/training", { state: { bankId: bank.id } })}
                      style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "#00d4ff", color: "var(--page-bg)", fontSize: "13px", fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                      开始训练 <ChevronRight size={14} />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => setConfirmDelete(bank.id)}
                      style={{ padding: "10px", borderRadius: "8px", background: "var(--card-bg-secondary)", color: "#ef4444", border: "none", cursor: "pointer" }}>
                      <Trash2 size={16} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirm Dialog */}
      <AnimatePresence>
        {confirmDelete !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              transition={{ type: "spring", damping: 20 }}
              style={{ background: "var(--card-bg)", borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "340px", border: "1px solid var(--border-color)", textAlign: "center" }}
            >
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <Trash2 size={22} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>删除题库</h3>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: "0 0 20px" }}>删除后无法恢复，确认删除吗？</p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => setConfirmDelete(null)}
                  style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "var(--card-bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
                >
                  取消
                </button>
                <button
                  onClick={() => { deleteBank.mutate({ id: confirmDelete }); setConfirmDelete(null); }}
                  style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "#ef4444", color: "#fff", border: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
                >
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
