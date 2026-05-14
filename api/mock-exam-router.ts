import { z } from "zod";
import { authedQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { mockExams } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";

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
      await db.insert(mockExams).values({
        userId: ctx.user.id,
        title: input.title,
        bankId: input.bankId,
        bankName: input.bankName,
        questionsJson: input.questionsJson,
        questionCount: input.questionCount,
      });
      return { success: true };
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
