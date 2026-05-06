import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { userSettings } from "@db/schema";

export const settingsRouter = createRouter({
  // Get or create user settings
  get: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, ctx.user.id))
      .limit(1);

    if (rows.length === 0) {
      // Create default settings
      await db.insert(userSettings).values({
        userId: ctx.user.id,
      });
      return {
        dailyGoal: 20,
        reminderTime: "20:00",
        difficulty: 3,
        fontSize: "medium" as const,
        questionLanguage: "zh" as const,
      };
    }

    return {
      dailyGoal: rows[0].dailyGoal,
      reminderTime: rows[0].reminderTime,
      difficulty: rows[0].difficulty,
      fontSize: rows[0].fontSize as "small" | "medium" | "large",
      questionLanguage: rows[0].questionLanguage as "zh" | "en" | "both",
    };
  }),

  // Update settings
  update: authedQuery
    .input(
      z.object({
        dailyGoal: z.number().optional(),
        reminderTime: z.string().optional(),
        difficulty: z.number().optional(),
        fontSize: z.enum(["small", "medium", "large"]).optional(),
        questionLanguage: z.enum(["zh", "en", "both"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, ctx.user.id))
        .limit(1);

      if (rows.length === 0) {
        await db.insert(userSettings).values({
          userId: ctx.user.id,
          ...input,
        });
      } else {
        await db
          .update(userSettings)
          .set(input)
          .where(eq(userSettings.id, rows[0].id));
      }
      return { success: true };
    }),
});
