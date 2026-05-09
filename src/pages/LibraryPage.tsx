import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Upload, X, Clock, Tag, ChevronRight, Trash2 } from "lucide-react";
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

function stripOptionPrefix(opt: string): string {
  if (!opt) return "";
  return opt.replace(/^[A-Z][\.．、\s]\s*/, "").trim();
}

function stripHtml(html: string): string {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  let text = tmp.textContent || tmp.innerText || "";
  text = text.replace(/\n+/g, "\n").replace(/ +/g, " ").trim();
  return text;
}

function mapQuestionType(qtype: string): Question["type"] {
  const mapping: Record<string, Question["type"]> = {
    "单选题": "single", "多选题": "multiple", "判断题": "boolean", "填空题": "fill",
  };
  return mapping[qtype] || "single";
}

interface ChapterInfo {
  chapterId: number;
  chapterName: string;
  questionCount: number;
}

function parsePaperJson(data: Record<string, unknown>): { title: string; questions: Question[]; chapters: ChapterInfo[] } {
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
        type: mapQuestionType((q.questionType as string) || "单选题"),
        question: stripHtml((q.content as string) || ""),
        options: ((q.options as string[]) || []).map(stripOptionPrefix),
        correct: answerToIndex((q.answer as string) || ""),
        explanation: stripHtml((q.analysis as string) || ""),
        enQuestion: stripHtml((q.enContent as string) || ""),
        enOptions: ((q.enOptions as string[]) || []).map(stripOptionPrefix),
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

          await createBank.mutateAsync({ title, questions, chapters, category: "证券从业", color: "var(--accent-color)" });
          setImportSuccess(`成功导入「${title}」，共 ${questions.length} 题`);
          setTimeout(() => setImportSuccess(""), 3000);
        } catch (err) {
          setImportError(err instanceof Error ? err.message : "导入失败，请检查文件格式");
          setTimeout(() => setImportError(""), 3000);
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
          <Search size={18} color="var(--text-tertiary)" />
          <input
            type="text"
            placeholder="搜索题库..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, background: "none", border: "none", color: "var(--text-primary)", fontSize: "14px", outline: "none" }}
          />
          {searchQuery && <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={16} color="var(--text-tertiary)" /></button>}
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
                background: activeCategory === cat ? "var(--accent-color)" : "var(--card-bg-secondary)",
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
          <Upload size={28} color="var(--accent-color)" style={{ marginBottom: "8px" }} />
          <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>点击导入 JSON 或 TXT 题库文件</div>
        </motion.div>
        <input ref={fileInputRef} type="file" accept=".json,.txt" onChange={handleFileImport} style={{ display: "none" }} />

        {/* Toast */}
        <AnimatePresence>
          {importError && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "var(--error)" }}>
              {importError}
            </motion.div>
          )}
          {importSuccess && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "var(--success)" }}>
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
                style={{ background: "var(--card-bg)", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ height: "4px", background: bank.color || "var(--accent-color)" }} />
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: 0, flex: 1 }}>{bank.title}</h3>
                    <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "10px", background: "rgba(0,212,255,0.15)", color: "var(--accent-color)", whiteSpace: "nowrap" }}>
                      {JSON.parse(bank.questionsJson).length}题
                    </span>
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
                      style={{ height: "100%", background: bank.color || "var(--accent-color)", borderRadius: "2px" }} />
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/training", { state: { bankId: bank.id } })}
                      style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "var(--accent-color)", color: "var(--page-bg)", fontSize: "13px", fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                      开始训练 <ChevronRight size={14} />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => deleteBank.mutate({ id: bank.id })}
                      style={{ padding: "10px", borderRadius: "8px", background: "var(--card-bg-secondary)", color: "var(--error)", border: "none", cursor: "pointer" }}>
                      <Trash2 size={16} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
