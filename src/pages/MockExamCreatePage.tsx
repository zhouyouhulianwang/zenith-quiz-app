import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, ChevronDown, ChevronUp, Search, BookOpen, GraduationCap, X, FileText, Upload } from "lucide-react";
import { trpc } from "@/providers/trpc";
import ParticleBackground from "@/components/ParticleBackground";

interface Q {
  id: number;
  type: string;
  question: string;
  options: string[];
  correct: number[];
  enQuestion?: string;
  enOptions?: string[];
  tcQuestion?: string;
  tcOptions?: string[];
  explanation: string;
  chapterId?: number;
  chapterName?: string;
}

export default function MockExamCreatePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State hooks must be declared before any conditional usage
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<number>>(new Set());
  const [examTitle, setExamTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonQuestions, setJsonQuestions] = useState<Q[]>([]);
  const [jsonError, setJsonError] = useState("");

  const { data: banks } = trpc.bank.list.useQuery();
  const { data: fullBank } = trpc.bank.get.useQuery(
    { id: selectedBankId || 0 },
    { enabled: !!selectedBankId },
  );
  const utils = trpc.useUtils();

  const translateMutation = trpc.mockExam.translateExam.useMutation({
    onSuccess: (data) => {
      if (data?.translated) {
        utils.mockExam.list.invalidate();
      }
    },
  });

  const createMutation = trpc.mockExam.create.useMutation({
    onSuccess: (data) => {
      utils.mockExam.list.invalidate();
      // Auto-trigger async translation after create
      if (data?.id) {
        translateMutation.mutate({ id: data.id });
      }
      navigate("/mock-exam/list");
    },
  });

  const selectedBank = banks?.find((b) => b.id === selectedBankId);
  const bankData = fullBank || selectedBank;

  const allQuestions: Q[] = useMemo(() => {
    if (jsonMode) return jsonQuestions;
    // bank.get returns parsed `questions`; bank.list only carries metadata (questions: [])
    const qs = (bankData as { questions?: Q[] } | null | undefined)?.questions;
    return Array.isArray(qs) && qs.length > 0 ? qs : [];
  }, [jsonMode, jsonQuestions, bankData]);

  const chapters = useMemo(() => {
    if (jsonMode || !bankData?.chaptersJson) return [];
    try { return JSON.parse(bankData.chaptersJson); } catch { return []; }
  }, [jsonMode, bankData?.chaptersJson]);

  const questionsByChapter = useMemo(() => {
    const map: Record<number, Q[]> = {};
    for (const q of allQuestions) {
      const cid = q.chapterId || 0;
      if (!map[cid]) map[cid] = [];
      map[cid].push(q);
    }
    return map;
  }, [allQuestions]);

  const filteredQuestions = useMemo(() => {
    if (!searchQuery.trim()) return allQuestions;
    const q = searchQuery.toLowerCase();
    return allQuestions.filter(
      (ques) => ques.question.toLowerCase().includes(q) || ques.options.some((o) => o.toLowerCase().includes(q)),
    );
  }, [allQuestions, searchQuery]);

  const toggleQuestion = (id: number) => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllInChapter = (chapterId: number) => {
    const chapterQuestions = questionsByChapter[chapterId] || [];
    const allSelected = chapterQuestions.every((q) => selectedQuestionIds.has(q.id));
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      for (const q of chapterQuestions) {
        if (allSelected) next.delete(q.id);
        else next.add(q.id);
      }
      return next;
    });
  };

  const handleCreate = () => {
    if (selectedQuestionIds.size === 0 || !examTitle.trim()) return;
    const selectedQuestions = allQuestions.filter((q) => selectedQuestionIds.has(q.id));
    // Backend translateQuestions will auto-translate EN + TC
    createMutation.mutate({
      title: examTitle.trim(),
      bankId: jsonMode ? 0 : (selectedBankId || 0),
      bankName: jsonMode ? "JSON导入" : selectedBank?.title,
      questionsJson: JSON.stringify(selectedQuestions),
      questionCount: selectedQuestions.length,
    });
  };

  const stripHtml = (html: string): string => {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#\d+;/g, (m) => String.fromCharCode(Number(m.slice(2, -1))))
      .replace(/\s+/g, " ")
      .trim();
  };

  const letterToIndex = (letter: string): number => {
    return Math.max(0, letter.toUpperCase().charCodeAt(0) - 65);
  };

  const handleJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setJsonError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = String(ev.target?.result || "");
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed) && !parsed.questions) {
          setJsonError("JSON 格式错误：应为题目数组或包含 .questions 字段的考试对象");
          return;
        }

        // Title simplification: "卷X模拟卷Y"
        const simplifyTitle = (t: string): string => {
          if (!t) return t;
          const paperMatch = t.match(/Paper\s*(\d+)/i);
          const juanMatch = t.match(/卷([一二三四五六七八九十])/);
          const examMatch = t.match(/试卷\s*(\d+)/);
          const mockMatch = t.match(/Mock\s*Exam\s*(\d+)/i);
          const cnNums: Record<string, string> = { "1": "一", "2": "二", "3": "三", "4": "四", "5": "五", "6": "六", "7": "七", "8": "八", "9": "九", "10": "十" };
          let paper = paperMatch ? cnNums[paperMatch[1]] || paperMatch[1] : juanMatch ? juanMatch[1] : null;
          let exam = examMatch ? cnNums[examMatch[1]] || examMatch[1] : mockMatch ? cnNums[mockMatch[1]] || mockMatch[1] : null;
          if (paper && exam) return `卷${paper}模拟卷${exam}`;
          if (paper) return `卷${paper}模拟卷`;
          if (exam) return `模拟卷${exam}`;
          return t.length > 20 ? t.slice(0, 20) : t;
        };

        // Handle HKSI exam format: [{exam_obj with questions array}]
        let examTitle = file.name.replace(/\.json$/i, "");
        let rawQuestions: any[] = [];
        let chapterMap: Record<string, number> = {};
        let nextChapterId = 1;

        if (Array.isArray(parsed)) {
          // Check if it's array of exam objects (HKSI format)
          const first = parsed[0];
          if (first && Array.isArray(first.questions)) {
            // HKSI format: [{title, cht_title, questions: [...]}]
            examTitle = first.title || first.cht_title || examTitle;
            rawQuestions = first.questions;
          } else {
            // Direct question array format
            rawQuestions = parsed;
          }
        } else if (parsed.questions) {
          // Single exam object with questions
          examTitle = parsed.title || parsed.cht_title || examTitle;
          rawQuestions = parsed.questions;
        }

        if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
          setJsonError("未找到题目数据");
          return;
        }

        // Validate, clean, and normalize questions
        let validCount = 0;
        let skipCount = 0;
        const questions: Q[] = [];

        for (let idx = 0; idx < rawQuestions.length; idx++) {
          const q = rawQuestions[idx];

          // Extract question content
          const content = stripHtml(q.content || q.question || q.title || q.q || "");
          if (!content || content.length < 3) {
            skipCount++;
            continue; // Skip invalid questions
          }

          // Handle options: string[] or {key, value}[]
          let options: string[] = [];
          if (Array.isArray(q.options) && q.options.length >= 2) {
            if (typeof q.options[0] === "string") {
              options = q.options.map(String).map(stripHtml).filter((o: string) => o.length > 0);
            } else if (typeof q.options[0] === "object") {
              options = q.options
                .map((o: Record<string, unknown>) => stripHtml(String(o.value || o.text || o.label || o.content || o.option || "")))
                .filter((o: string) => o.length > 0);
            }
          }
          // Fallback: try choices/answers/selections
          if (options.length < 2 && Array.isArray(q.choices) && q.choices.length >= 2) {
            options = q.choices.map(String).map(stripHtml).filter((o: string) => o.length > 0);
          }
          if (options.length < 2 && Array.isArray(q.selections) && q.selections.length >= 2) {
            options = q.selections.map(String).map(stripHtml).filter((o: string) => o.length > 0);
          }
          if (options.length < 2) {
            skipCount++;
            continue; // Need at least 2 valid options
          }

          // Handle answer
          let correct: number[] = [];
          if (Array.isArray(q.correct) && q.correct.length > 0) {
            correct = q.correct.map(Number).filter((n: number) => !isNaN(n) && n >= 0 && n < options.length);
          } else if (Array.isArray(q.answer) && q.answer.length > 0) {
            correct = q.answer.map(Number).filter((n: number) => !isNaN(n) && n >= 0 && n < options.length);
          } else if (typeof q.answer === "string" && q.answer.length > 0) {
            correct = q.answer.split("").map(letterToIndex).filter((n: number) => n >= 0 && n < options.length);
          } else if (typeof q.correct === "number") {
            const n = Number(q.correct);
            if (!isNaN(n) && n >= 0 && n < options.length) correct = [n];
          } else if (typeof q.answer === "number") {
            const na = Number(q.answer);
            if (!isNaN(na) && na >= 0 && na < options.length) correct = [na];
          }
          if (correct.length === 0) {
            // Default to first option as correct if no valid answer found
            correct = [0];
          }

          // Determine question type
          const isMulti = correct.length > 1 || q.question_type === "2" || q.type === "multiple" || q.questionType === "multiple";

          // Chapter mapping
          const chName = stripHtml(q.chapter_name || q.chapterName || q.chapter || "");
          if (chName && !chapterMap[chName]) {
            chapterMap[chName] = nextChapterId++;
          }

          // Extract multi-language fields if present in JSON
          const enQ = stripHtml(q.enQuestion || q.en_question || q.english || q.eng || "");
          const tcQ = stripHtml(q.tcQuestion || q.tc_question || q.cht_title || q.traditional || q.cht || "");
          const enOpts = Array.isArray(q.enOptions || q.en_options || q.englishOptions)
            ? (q.enOptions || q.en_options || q.englishOptions).map(String).map(stripHtml).filter((o: string) => o.length > 0)
            : undefined;
          const tcOpts = Array.isArray(q.tcOptions || q.tc_options || q.chtOptions || q.traditionalOptions)
            ? (q.tcOptions || q.tc_options || q.chtOptions || q.traditionalOptions).map(String).map(stripHtml).filter((o: string) => o.length > 0)
            : undefined;

          questions.push({
            id: q.question_id || q.id || idx + 1,
            type: isMulti ? "multiple" : "single",
            question: content,
            options,
            correct,
            explanation: stripHtml(q.analysis || q.explanation || q.reason || q.note || ""),
            chapterId: chName ? chapterMap[chName] : undefined,
            chapterName: chName || undefined,
            ...(enQ ? { enQuestion: enQ } : {}),
            ...(tcQ ? { tcQuestion: tcQ } : {}),
            ...(enOpts && enOpts.length >= 2 ? { enOptions: enOpts } : {}),
            ...(tcOpts && tcOpts.length >= 2 ? { tcOptions: tcOpts } : {}),
          });
          validCount++;
        }

        if (questions.length === 0) {
          setJsonError(`没有有效的题目（共${rawQuestions.length}题，清洗后剩余0题）`);
          return;
        }

        setJsonQuestions(questions);
        setSelectedQuestionIds(new Set(questions.map((q) => q.id)));
        setJsonMode(true);
        setExamTitle(simplifyTitle(examTitle));
        setStep(3);
      } catch (err: any) {
        setJsonError(err.message || "JSON 解析失败");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: "var(--page-bg)", overflowX: "hidden" }}>
      <ParticleBackground />
      <input type="file" accept=".json" ref={fileInputRef} onChange={handleJsonFile} style={{ display: "none" }} />
      <div style={{ position: "relative", zIndex: 1, padding: "16px", paddingBottom: "200px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <button onClick={() => { if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3); else navigate("/mock-exam/list"); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ArrowLeft size={24} color="var(--text-primary)" />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              {jsonMode ? "JSON导入" : step === 1 ? "选择题库" : step === 2 ? "选择题目" : "确认创建"}
            </h1>
            <p style={{ fontSize: "13px", color: "var(--text-tertiary)", margin: "2px 0 0" }}>
              已选 {selectedQuestionIds.size} 题
            </p>
          </div>
        </div>

        {/* JSON Error */}
        {jsonError && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: "rgba(239,68,68,0.1)", borderRadius: "12px", padding: "14px 16px", border: "1px solid rgba(239,68,68,0.3)", marginBottom: "16px", color: "#ef4444", fontSize: "14px" }}>
            {jsonError}
          </motion.div>
        )}

        {/* Step 1: Select Source (Bank or JSON) */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {/* JSON Upload Card */}
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => fileInputRef.current?.click()}
              style={{
                width: "100%", padding: "24px", borderRadius: "16px",
                background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(139,92,246,0.03))",
                border: "2px dashed rgba(139,92,246,0.4)", marginBottom: "16px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
                cursor: "pointer", textAlign: "center",
              }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "rgba(139,92,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Upload size={26} color="#8b5cf6" />
              </div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 600, color: "#8b5cf6" }}>导入 JSON 文件</div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>点击上传 .json 格式的试卷文件</div>
              </div>
            </motion.button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--border-color)" }} />
              <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>或从已有题库导入</span>
              <div style={{ flex: 1, height: "1px", background: "var(--border-color)" }} />
            </div>

            {/* Bank List */}
            {!banks || banks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px", color: "var(--text-tertiary)" }}>
                <BookOpen size={32} />
                <p style={{ marginTop: "8px", fontSize: "13px" }}>暂无题库</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {banks.map((bank, i) => {
                  const qCount = bank.questionCount || 0;
                  const isSelected = selectedBankId === bank.id;
                  return (
                    <motion.button key={bank.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      whileTap={{ scale: 0.98 }} onClick={() => { setJsonMode(false); setSelectedBankId(bank.id); }}
                      style={{
                        width: "100%", padding: "16px", borderRadius: "14px", textAlign: "left",
                        background: isSelected ? "var(--accent-color)" : "var(--card-bg)",
                        border: `1px solid ${isSelected ? "var(--accent-color)" : "var(--border-color)"}`,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: "14px",
                      }}>
                      <div style={{ width: "4px", height: "44px", borderRadius: "2px", background: bank.color || "#00d4ff", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "16px", fontWeight: 600, color: isSelected ? "#fff" : "var(--text-primary)" }}>{bank.title}</div>
                        <div style={{ fontSize: "12px", color: isSelected ? "rgba(255,255,255,0.8)" : "var(--text-tertiary)", marginTop: "2px" }}>{qCount} 题</div>
                      </div>
                      {isSelected && <Check size={20} color="#fff" />}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Step 2: Select Questions */}
        {step === 2 && !jsonMode && selectedBankId && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div style={{ position: "relative", marginBottom: "16px" }}>
              <Search size={18} color="var(--text-tertiary)" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
              <input type="text" placeholder="搜索题目..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", height: "44px", borderRadius: "12px", border: "1px solid var(--border-color)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: "15px", paddingLeft: "42px", paddingRight: "12px", outline: "none" }} />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer" }}>
                  <X size={16} color="var(--text-tertiary)" />
                </button>
              )}
            </div>

            {searchQuery.trim() ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {filteredQuestions.map((q, i) => (
                  <motion.button key={q.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    onClick={() => toggleQuestion(q.id)}
                    style={{
                      width: "100%", padding: "12px 16px", borderRadius: "12px", textAlign: "left",
                      background: selectedQuestionIds.has(q.id) ? "rgba(0,168,204,0.1)" : "var(--card-bg)",
                      border: `1px solid ${selectedQuestionIds.has(q.id) ? "var(--accent-color)" : "var(--border-color)"}`,
                      cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "10px",
                    }}>
                    <div style={{ width: "22px", height: "22px", borderRadius: "6px", border: `2px solid ${selectedQuestionIds.has(q.id) ? "var(--accent-color)" : "var(--border-color)"}`, background: selectedQuestionIds.has(q.id) ? "var(--accent-color)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                      {selectedQuestionIds.has(q.id) && <Check size={14} color="#fff" />}
                    </div>
                    <div style={{ flex: 1, fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.5 }}>
                      {q.question.length > 80 ? q.question.substring(0, 80) + "..." : q.question}
                    </div>
                  </motion.button>
                ))}
                {filteredQuestions.length === 0 && (
                  <div style={{ textAlign: "center", padding: "30px", color: "var(--text-tertiary)" }}>未找到匹配的题目</div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {chapters.length === 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {allQuestions.map((q, i) => (
                      <motion.button key={q.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
                        onClick={() => toggleQuestion(q.id)}
                        style={{
                          width: "100%", padding: "12px 16px", borderRadius: "12px", textAlign: "left",
                          background: selectedQuestionIds.has(q.id) ? "rgba(0,168,204,0.1)" : "var(--card-bg)",
                          border: `1px solid ${selectedQuestionIds.has(q.id) ? "var(--accent-color)" : "var(--border-color)"}`,
                          cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "10px",
                        }}>
                        <div style={{ width: "22px", height: "22px", borderRadius: "6px", border: `2px solid ${selectedQuestionIds.has(q.id) ? "var(--accent-color)" : "var(--border-color)"}`, background: selectedQuestionIds.has(q.id) ? "var(--accent-color)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                          {selectedQuestionIds.has(q.id) && <Check size={14} color="#fff" />}
                        </div>
                        <div style={{ flex: 1, fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.5 }}>
                          {q.question.length > 80 ? q.question.substring(0, 80) + "..." : q.question}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
                {chapters.map((ch: { chapterId: number; chapterName: string; questionCount: number }) => {
                  const chapterQuestions = questionsByChapter[ch.chapterId] || [];
                  const selectedInChapter = chapterQuestions.filter((q) => selectedQuestionIds.has(q.id)).length;
                  const isExpanded = expandedChapter === ch.chapterId;
                  return (
                    <div key={ch.chapterId} style={{ background: "var(--card-bg)", borderRadius: "14px", border: "1px solid var(--border-color)", overflow: "hidden" }}>
                      <button onClick={() => setExpandedChapter(isExpanded ? null : ch.chapterId)}
                        style={{ width: "100%", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", textAlign: "left" }}>
                        {isExpanded ? <ChevronUp size={18} color="var(--text-tertiary)" /> : <ChevronDown size={18} color="var(--text-tertiary)" />}
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>{ch.chapterName}</span>
                          <span style={{ fontSize: "12px", color: "var(--text-tertiary)", marginLeft: "8px" }}>{ch.questionCount}题</span>
                        </div>
                        {selectedInChapter > 0 && (
                          <span style={{ fontSize: "12px", color: "var(--accent-color)", fontWeight: 600 }}>已选{selectedInChapter}</span>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); selectAllInChapter(ch.chapterId); }}
                          style={{ padding: "4px 10px", borderRadius: "6px", background: selectedInChapter === chapterQuestions.length && chapterQuestions.length > 0 ? "var(--accent-color)" : "var(--card-bg-secondary)", color: selectedInChapter === chapterQuestions.length && chapterQuestions.length > 0 ? "#fff" : "var(--text-primary)", border: "1px solid var(--border-color)", fontSize: "12px", cursor: "pointer" }}>
                          {selectedInChapter === chapterQuestions.length && chapterQuestions.length > 0 ? "取消" : "全选"}
                        </button>
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} style={{ overflow: "hidden" }}>
                            <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                              {chapterQuestions.map((q) => (
                                <button key={q.id} onClick={() => toggleQuestion(q.id)}
                                  style={{
                                    width: "100%", padding: "10px 12px", borderRadius: "10px", textAlign: "left",
                                    background: selectedQuestionIds.has(q.id) ? "rgba(0,168,204,0.1)" : "var(--card-bg-secondary)",
                                    border: `1px solid ${selectedQuestionIds.has(q.id) ? "var(--accent-color)" : "transparent"}`,
                                    cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "8px",
                                  }}>
                                  <div style={{ width: "20px", height: "20px", borderRadius: "5px", border: `2px solid ${selectedQuestionIds.has(q.id) ? "var(--accent-color)" : "var(--border-color)"}`, background: selectedQuestionIds.has(q.id) ? "var(--accent-color)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                                    {selectedQuestionIds.has(q.id) && <Check size={12} color="#fff" />}
                                  </div>
                                  <div style={{ flex: 1, fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.5 }}>
                                    {q.question.length > 80 ? q.question.substring(0, 80) + "..." : q.question}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div style={{ background: "var(--card-bg)", borderRadius: "16px", padding: "20px", border: "1px solid var(--border-color)", marginBottom: "20px" }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "12px" }}>试卷名称</div>
              <input type="text" placeholder="输入模拟卷名称..." value={examTitle} onChange={(e) => setExamTitle(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", height: "48px", borderRadius: "12px", border: "1px solid var(--border-color)", background: "var(--card-bg-secondary)", color: "var(--text-primary)", fontSize: "16px", padding: "0 14px", outline: "none" }} />
            </div>

            <div style={{ background: "var(--card-bg)", borderRadius: "16px", padding: "20px", border: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <GraduationCap size={20} color="var(--accent-color)" />
                <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>试卷预览</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>来源</span>
                  <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{jsonMode ? "JSON 导入" : selectedBank?.title}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                  <span style={{ color: "var(--text-secondary)" }}>题目数量</span>
                  <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{selectedQuestionIds.size} 题</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom Action */}
      <div style={{ position: "fixed", bottom: "70px", left: 0, right: 0, padding: "16px", background: "linear-gradient(transparent, var(--page-bg) 40%)", zIndex: 10 }}>
        {step === 1 && selectedBankId && !jsonMode && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button onClick={() => { setSelectedQuestionIds(new Set(allQuestions.map((q) => q.id))); setStep(3); }}
              style={{ width: "100%", padding: "14px", borderRadius: "14px", background: "#10b981", color: "#fff", border: "none", fontSize: "16px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <FileText size={18} /> 导入整套试卷（{allQuestions.length}题）
            </button>
            <button onClick={() => setStep(2)}
              style={{ width: "100%", padding: "14px", borderRadius: "14px", background: "var(--card-bg)", color: "var(--text-primary)", border: "1px solid var(--border-color)", fontSize: "15px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <Search size={16} /> 手动选择题目
            </button>
          </motion.div>
        )}
        {step === 1 && !selectedBankId && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button onClick={() => fileInputRef.current?.click()}
              style={{ width: "100%", padding: "14px", borderRadius: "14px", background: "#8b5cf6", color: "#fff", border: "none", fontSize: "16px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <Upload size={18} /> 导入 JSON 文件
            </button>
            <button disabled
              style={{ width: "100%", padding: "14px", borderRadius: "14px", background: "var(--card-bg-secondary)", color: "var(--text-tertiary)", border: "none", fontSize: "15px", fontWeight: 600, cursor: "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <BookOpen size={16} /> 请先选择题库或上传 JSON
            </button>
          </motion.div>
        )}
        {step === 2 && (
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setStep(1)}
              style={{ flex: 1, padding: "14px", borderRadius: "14px", background: "var(--card-bg)", color: "var(--text-primary)", border: "1px solid var(--border-color)", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}>
              上一步
            </button>
            <button onClick={() => selectedQuestionIds.size > 0 && setStep(3)} disabled={selectedQuestionIds.size === 0}
              style={{ flex: 1, padding: "14px", borderRadius: "14px", background: selectedQuestionIds.size > 0 ? "var(--accent-color)" : "var(--card-bg-secondary)", color: selectedQuestionIds.size > 0 ? "#fff" : "var(--text-tertiary)", border: "none", fontSize: "15px", fontWeight: 600, cursor: selectedQuestionIds.size > 0 ? "pointer" : "not-allowed" }}>
              下一步 ({selectedQuestionIds.size})
            </button>
          </div>
        )}
        {step === 3 && (
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => { setJsonMode(false); setJsonQuestions([]); setStep(1); }}
              style={{ flex: 1, padding: "14px", borderRadius: "14px", background: "var(--card-bg)", color: "var(--text-primary)", border: "1px solid var(--border-color)", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}>
              上一步
            </button>
            <button onClick={handleCreate} disabled={!examTitle.trim() || selectedQuestionIds.size === 0 || createMutation.isPending}
              style={{ flex: 1, padding: "14px", borderRadius: "14px", background: examTitle.trim() && selectedQuestionIds.size > 0 ? "var(--accent-color)" : "var(--card-bg-secondary)", color: examTitle.trim() && selectedQuestionIds.size > 0 ? "#fff" : "var(--text-tertiary)", border: "none", fontSize: "15px", fontWeight: 600, cursor: examTitle.trim() && selectedQuestionIds.size > 0 ? "pointer" : "not-allowed" }}>
              {createMutation.isPending ? "保存中..." : translateMutation.isPending ? "翻译中..." : "创建模拟卷"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
