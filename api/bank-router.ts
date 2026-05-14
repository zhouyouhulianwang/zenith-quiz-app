import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { banks, practiceRecords } from "@db/schema";

export interface Question {
  id: number;
  type: "single" | "multiple" | "boolean" | "fill";
  question: string;
  options: string[];
  correct: number[];
  explanation: string;
  enQuestion?: string;
  enOptions?: string[];
  tcQuestion?: string;
  tcOptions?: string[];
  chapterId?: number;
  chapterName?: string;
}

export const bankRouter = createRouter({
  // List all banks for current user
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(banks)
      .where(eq(banks.userId, ctx.user.id))
      .orderBy(desc(banks.importedAt));
    return rows.map((row) => ({
      ...row,
      questions: JSON.parse(row.questionsJson) as Question[],
    }));
  }),

  // Get single bank with questions
  get: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(banks)
        .where(and(eq(banks.id, input.id), eq(banks.userId, ctx.user.id)))
        .limit(1);
      if (rows.length === 0) return null;
      const row = rows[0];
      return {
        ...row,
        questions: JSON.parse(row.questionsJson) as Question[],
      };
    }),

  // Create a new bank
  create: authedQuery
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        category: z.string().default("自定义"),
        color: z.string().default("#00d4ff"),
        questions: z.array(z.any()),
        chapters: z.array(z.any()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const questionsJson = JSON.stringify(input.questions);
      const chaptersJson = input.chapters ? JSON.stringify(input.chapters) : null;
      const result = await db.insert(banks).values({
        userId: ctx.user.id,
        title: input.title,
        description: input.description || `${input.questions.length} 题`,
        category: input.category,
        color: input.color,
        questionsJson,
        chaptersJson,
        progress: 0,
      });
      const insertId = result[0]?.insertId ? Number(result[0].insertId) : 0;
      return { id: insertId };
    }),

  // Delete a bank
  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .delete(banks)
        .where(and(eq(banks.id, input.id), eq(banks.userId, ctx.user.id)));
      // Also delete practice records for this bank
      await db
        .delete(practiceRecords)
        .where(
          and(
            eq(practiceRecords.bankId, input.id),
            eq(practiceRecords.userId, ctx.user.id),
          ),
        );
      return { success: true };
    }),

  // Update questions JSON (after translation)
  updateQuestions: authedQuery
    .input(
      z.object({
        id: z.number(),
        questionsJson: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .update(banks)
        .set({ questionsJson: input.questionsJson })
        .where(and(eq(banks.id, input.id), eq(banks.userId, ctx.user.id)));
      return { success: true };
    }),

  // Update progress
  updateProgress: authedQuery
    .input(
      z.object({
        id: z.number(),
        progress: z.number().min(0).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .update(banks)
        .set({
          progress: input.progress,
          lastPracticedAt: new Date(),
        })
        .where(and(eq(banks.id, input.id), eq(banks.userId, ctx.user.id)));
      return { success: true };
    }),
});
