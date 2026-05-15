import { z } from "zod";
import { authedQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { mockExams } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { translateQuestions } from "./translate-service";

export const mockExamRouter = {
  list: authedQuery.query(async () => {
    const db = getDb();
    // Return all mock exams (preset exams are shared across all users)
    return db
      .select()
      .from(mockExams)
      .orderBy(desc(mockExams.createdAt));
  }),

  create: authedQuery
    .input(
      z.object({
        title: z.string().min(1).max(255),
        bankId: z.number(),
        bankName: z.string().optional(),
        questionsJson: z.string(),
        questionCount: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // Save immediately without waiting for translation
      // Translation will be done asynchronously via translateExam endpoint
      const result = await db.insert(mockExams).values({
        userId: ctx.user.id,
        title: input.title,
        bankId: input.bankId,
        bankName: input.bankName,
        questionsJson: input.questionsJson,
        questionCount: input.questionCount,
      });
      const insertId = result[0]?.insertId ? Number(result[0].insertId) : 0;
      return { success: true, id: insertId };
    }),

  // Async translate exam questions (called after create)
  translateExam: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [row] = await db
        .select()
        .from(mockExams)
        .where(eq(mockExams.id, input.id));
      if (!row) return { translated: false, error: "Not found" };

      const questions = JSON.parse(row.questionsJson || "[]");
      const needsTranslation = questions.some(
        (q: any) => !q.enQuestion || /[\u4e00-\u9fff]/.test(q.enQuestion),
      );
      if (!needsTranslation) return { translated: true, alreadyDone: true };

      try {
        const { questions: translated, allTranslated } = await translateQuestions(questions);
        await db
          .update(mockExams)
          .set({ questionsJson: JSON.stringify(translated) })
          .where(eq(mockExams.id, input.id));
        return { translated: allTranslated, total: questions.length };
      } catch (err) {
        return { translated: false, error: String(err) };
      }
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .delete(mockExams)
        .where(and(eq(mockExams.id, input.id), eq(mockExams.userId, ctx.user.id)));
      return { success: true };
    }),

  incrementPracticed: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [row] = await db
        .select()
        .from(mockExams)
        .where(and(eq(mockExams.id, input.id), eq(mockExams.userId, ctx.user.id)));
      if (row) {
        await db
          .update(mockExams)
          .set({
            practicedCount: row.practicedCount + 1,
            lastPracticedAt: new Date(),
          })
          .where(eq(mockExams.id, input.id));
      }
      return { success: true };
    }),

  // Update questionsJson after translation (save translated text back to DB)
  updateQuestions: authedQuery
    .input(
      z.object({
        id: z.number(),
        questionsJson: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(mockExams)
        .set({ questionsJson: input.questionsJson })
        .where(eq(mockExams.id, input.id));
      return { success: true };
    }),
};
