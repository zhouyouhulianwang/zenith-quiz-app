import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, ChevronDown, ChevronUp, Search, BookOpen, Plus, GraduationCap, X, FileText } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAppSettings } from "@/context/AppContext";
import { toTraditional } from "@/lib/chineseConv";
import ParticleBackground from "@/components/ParticleBackground";

interface Q {
  id: number;
  type: string;
  question: string;
  options: string[];
  correct: number[];
  explanation: string;
  chapterId?: number;
  chapterName?: string;
}

export default function MockExamCreatePage() {
  const navigate = useNavigate();
  const { settings } = useAppSettings();

  const { data: banks } = trpc.bank.list.useQuery();
  const utils = trpc.useUtils();
  const createMutation = trpc.mockExam.create.useMutation({
    onSuccess: () => {
      utils.mockExam.list.invalidate();
      navigate("/mock-exam/list");
    },
  });

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<number>>(new Set());
  const [examTitle, setExamTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);

  const selectedBank = banks?.find((b) => b.id === selectedBankId);

  const allQuestions: Q[] = useMemo(() => {
    if (!selectedBank?.questionsJson) return [];
    try { return JSON.parse(selectedBank.questionsJson); } catch { return []; }
  }, [selectedBank?.questionsJson]);

  const chapters = useMemo(() => {
    if (!selectedBank?.chaptersJson) return [];
    try { return JSON.parse(selectedBank.chaptersJson); } catch { return []; }
  }, [selectedBank?.chaptersJson]);

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
    if (!selectedBankId || !examTitle.trim() || selectedQuestionIds.size === 0) return;
    const selectedQuestions = allQuestions.filter((q) => selectedQuestionIds.has(q.id));
    createMutation.mutate({
      title: examTitle.trim(),
      bankId: selectedBankId,
      bankName: selectedBank?.title,
      questionsJson: JSON.stringify(selectedQuestions),
      questionCount: selectedQuestions.length,
    });
  };

  const toTrad = (text: string) => { try { return toTraditional(text); } catch { return text; } };

  return (
    <div style={{ position: "relative", minHeight: "100dvh", background: "var(--page-bg)", overflowX: "hidden" }}>
      <ParticleBackground />
      <div style={{ position: "relative", zIndex: 1, padding: "16px", paddingBottom: "200px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <button onClick={() => { if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3); else navigate("/mock-exam/list"); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ArrowLeft size={24} color="var(--text-primary)" />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              {step === 1 ? "选择题库" : step === 2 ? "选择题目" : "确认创建"}
            </h1>
            <p style={{ fontSize: "13px", color: "var(--text-tertiary)", margin: "2px 0 0" }}>
              步骤 {step}/3 — 已选 {selectedQuestionIds.size} 题
            </p>
          </div>
        </div>

        {/* Step 1: Select Bank */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {!banks || banks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-tertiary)" }}>
                <BookOpen size={40} />
                <p style={{ marginTop: "12px" }}>暂无题库，请先导入</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {banks.map((bank, i) => {
                  const qCount = (() => { try { return JSON.parse(bank.questionsJson).length; } catch { return 0; } })();
                  const isSelected = selectedBankId === bank.id;
                  return (
                    <motion.button key={bank.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      whileTap={{ scale: 0.98 }} onClick={() => setSelectedBankId(bank.id)}
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
        {step === 2 && selectedBankId && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {/* Search */}
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

            {/* Search results or chapter list */}
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
                  <span style={{ color: "var(--text-secondary)" }}>题库</span>
                  <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{selectedBank?.title}</span>
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
        {step === 1 && selectedBankId && (
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
          <button disabled
            style={{ width: "100%", padding: "14px", borderRadius: "14px", background: "var(--card-bg-secondary)", color: "var(--text-tertiary)", border: "none", fontSize: "16px", fontWeight: 600, cursor: "not-allowed" }}>
            请先选择题库
          </button>
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
            <button onClick={() => setStep(2)}
              style={{ flex: 1, padding: "14px", borderRadius: "14px", background: "var(--card-bg)", color: "var(--text-primary)", border: "1px solid var(--border-color)", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}>
              上一步
            </button>
            <button onClick={handleCreate} disabled={!examTitle.trim() || selectedQuestionIds.size === 0 || createMutation.isPending}
              style={{ flex: 1, padding: "14px", borderRadius: "14px", background: examTitle.trim() && selectedQuestionIds.size > 0 ? "var(--accent-color)" : "var(--card-bg-secondary)", color: examTitle.trim() && selectedQuestionIds.size > 0 ? "#fff" : "var(--text-tertiary)", border: "none", fontSize: "15px", fontWeight: 600, cursor: examTitle.trim() && selectedQuestionIds.size > 0 ? "pointer" : "not-allowed" }}>
              {createMutation.isPending ? "创建中..." : "创建模拟卷"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
