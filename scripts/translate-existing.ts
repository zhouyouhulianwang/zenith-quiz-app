import { getDb } from "../api/queries/connection";
import { mockExams, banks } from "../db/schema";
import { translateQuestions } from "../api/translate-service";
import { eq } from "drizzle-orm";

async function main() {
  const db = getDb();

  // Translate mock_exams
  const mockRows = await db.select().from(mockExams);
  console.log(`[translate-existing] Found ${mockRows.length} mock exams`);

  for (const row of mockRows) {
    const questions = JSON.parse(row.questionsJson || "[]");
    if (questions.length === 0) continue;

    const needsEn = questions.some(
      (q: any) => !q.enQuestion || /[\u4e00-\u9fff]/.test(q.enQuestion),
    );
    if (!needsEn) {
      console.log(`  MockExam #${row.id}: already translated, skipping`);
      continue;
    }

    console.log(`  MockExam #${row.id}: translating ${questions.length} questions...`);
    const start = Date.now();
    const { questions: translated, allTranslated } = await translateQuestions(questions);
    const elapsed = Date.now() - start;

    if (allTranslated) {
      await db
        .update(mockExams)
        .set({ questionsJson: JSON.stringify(translated) })
        .where(eq(mockExams.id, row.id));
      console.log(`  ✓ MockExam #${row.id}: saved (${elapsed}ms)`);
    } else {
      console.log(`  ✗ MockExam #${row.id}: translation incomplete (${elapsed}ms)`);
    }
  }

  // Translate banks
  const bankRows = await db.select().from(banks);
  console.log(`\n[translate-existing] Found ${bankRows.length} banks`);

  for (const row of bankRows) {
    const questions = JSON.parse(row.questionsJson || "[]");
    if (questions.length === 0) continue;

    const needsEn = questions.some(
      (q: any) => !q.enQuestion || /[\u4e00-\u9fff]/.test(q.enQuestion),
    );
    if (!needsEn) {
      console.log(`  Bank #${row.id}: already translated, skipping`);
      continue;
    }

    console.log(`  Bank #${row.id}: translating ${questions.length} questions...`);
    const start = Date.now();
    const { questions: translated, allTranslated } = await translateQuestions(questions);
    const elapsed = Date.now() - start;

    if (allTranslated) {
      await db
        .update(banks)
        .set({ questionsJson: JSON.stringify(translated) })
        .where(eq(banks.id, row.id));
      console.log(`  ✓ Bank #${row.id}: saved (${elapsed}ms)`);
    } else {
      console.log(`  ✗ Bank #${row.id}: translation incomplete (${elapsed}ms)`);
    }
  }

  console.log("\n[translate-existing] Done!");
}

main().catch((err) => {
  console.error("[translate-existing] Error:", err);
  process.exit(1);
});
