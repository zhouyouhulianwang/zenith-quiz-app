import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { practiceRecords, dailyRecords } from "@db/schema";

export const recordRouter = createRouter({
  // Add a practice record
  add: authedQuery
    .input(
      z.object({
        bankId: z.number().optional(),
        mockExamId: z.number().optional(),
        questionId: z.number(),
        chapterId: z.number().optional(),
        chapterName: z.string().optional(),
        selected: z.array(z.number()),
        isCorrect: z.boolean(),
        timeSpent: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.insert(practiceRecords).values({
        userId: ctx.user.id,
        bankId: input.bankId ?? 0,
        mockExamId: input.mockExamId ?? null,
        questionId: input.questionId,
        chapterId: input.chapterId,
        chapterName: input.chapterName,
        selected: JSON.stringify(input.selected),
        isCorrect: input.isCorrect ? 1 : 0,
        timeSpent: input.timeSpent,
      });
      return { success: true };
    }),

  // Get all records for current user
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(practiceRecords)
      .where(eq(practiceRecords.userId, ctx.user.id))
      .orderBy(desc(practiceRecords.createdAt));
    return rows.map((r) => ({
      ...r,
      selected: JSON.parse(r.selected) as number[],
      isCorrect: r.isCorrect === 1,
    }));
  }),

  // Get records for a specific bank
  listByBank: authedQuery
    .input(z.object({ bankId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(practiceRecords)
        .where(
          and(
            eq(practiceRecords.userId, ctx.user.id),
            eq(practiceRecords.bankId, input.bankId),
          ),
        )
        .orderBy(practiceRecords.createdAt);
      return rows.map((r) => ({
        ...r,
        selected: JSON.parse(r.selected) as number[],
        isCorrect: r.isCorrect === 1,
      }));
    }),

  // Upsert daily record
  upsertDaily: authedQuery
    .input(
      z.object({
        date: z.string(),
        count: z.number(),
        correct: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const existing = await db
        .select()
        .from(dailyRecords)
        .where(
          and(
            eq(dailyRecords.userId, ctx.user.id),
            eq(dailyRecords.date, input.date),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(dailyRecords)
          .set({
            count: existing[0].count + input.count,
            correct: existing[0].correct + input.correct,
          })
          .where(eq(dailyRecords.id, existing[0].id));
      } else {
        await db.insert(dailyRecords).values({
          userId: ctx.user.id,
          date: input.date,
          count: input.count,
          correct: input.correct,
        });
      }
      return { success: true };
    }),

  // Get daily records
  listDaily: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(dailyRecords)
      .where(eq(dailyRecords.userId, ctx.user.id))
      .orderBy(dailyRecords.date);
  }),
});
