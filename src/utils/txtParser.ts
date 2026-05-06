export interface ParsedQuestion {
  id: number;
  type: "single" | "multiple" | "boolean" | "fill";
  question: string;
  options: string[];
  correct: number[];
  explanation: string;
  chapterName?: string;
}

function stripHtml(html: string): string {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  let text = tmp.textContent || tmp.innerText || "";
  text = text.replace(/\n+/g, "\n").replace(/ +/g, " ").trim();
  return text;
}

function stripOptionPrefix(opt: string): string {
  if (!opt) return "";
  return opt.replace(/^[A-Z][\.．、\s]\s*/, "").trim();
}

function answerToIndex(answer: string): number[] {
  if (!answer) return [0];
  const indices: number[] = [];
  for (const char of answer.split(",")) {
    const c = char.trim().toUpperCase();
    if (c.length === 1 && c >= "A" && c <= "Z") {
      indices.push(c.charCodeAt(0) - 65);
    }
  }
  return indices.length > 0 ? indices : [0];
}

export function parseTxtToBank(text: string): {
  title: string;
  questions: ParsedQuestion[];
} {
  const lines = text.split("\n");
  const questions: ParsedQuestion[] = [];
  let currentChapter: string | undefined;
  let title = "导入题库";

  if (lines[0]?.trim()) title = lines[0].trim();

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.startsWith("第 ") && line.includes("章:")) {
      currentChapter = line.split("章:", 1)[1]?.trim();
      i++;
      continue;
    }

    if (line.includes("【第") && line.includes("题】") && line.includes("ID:")) {
      const idMatch = line.match(/ID:\s*(\d+)/);
      const qid = idMatch ? parseInt(idMatch[1], 10) : 0;
      i++;

      const contentLines: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith("题目:")) i++;

      if (i < lines.length) {
        const labelLine = lines[i].trim();
        if (labelLine.startsWith("题目:")) {
          const afterLabel = labelLine.slice(3).trim();
          if (afterLabel) contentLines.push(afterLabel);
        }
        i++;
        while (i < lines.length) {
          const l = lines[i].trim();
          if (/^[A-Z]\.\s/.test(l) || l.startsWith("答案:") || l.includes("【第")) break;
          contentLines.push(l);
          i++;
        }
      }

      const options: string[] = [];
      while (i < lines.length) {
        const l = lines[i].trim();
        if (l.startsWith("答案:") || l.includes("【第")) break;
        if (/^[A-Z]\.\s/.test(l)) {
          options.push(stripOptionPrefix(l));
          i++;
        } else {
          i++;
        }
      }

      let answer = "";
      if (i < lines.length && lines[i].trim().startsWith("答案:")) {
        answer = lines[i].trim().slice(3).trim();
        i++;
      }

      const analysisLines: string[] = [];
      if (i < lines.length && lines[i].trim().startsWith("解析:")) {
        const firstAna = lines[i].trim();
        if (firstAna.startsWith("解析:")) {
          const afterLabel = firstAna.slice(3).trim();
          if (afterLabel) analysisLines.push(afterLabel);
        }
        i++;
        while (i < lines.length) {
          const l = lines[i].trim();
          if (l === "----------------------------------------" || (l.includes("【第") && l.includes("题】"))) break;
          analysisLines.push(l);
          i++;
        }
      }

      if (i < lines.length && lines[i].trim() === "----------------------------------------") i++;

      const questionText = stripHtml(contentLines.join("\n"));
      const analysisText = stripHtml(analysisLines.join("\n"));

      if (questionText && options.length > 0) {
        questions.push({
          id: qid,
          type: "single",
          question: questionText,
          options,
          correct: answerToIndex(answer),
          explanation: analysisText,
          chapterName: currentChapter,
        });
      }
      continue;
    }

    i++;
  }

  return { title, questions };
}
