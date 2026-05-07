import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, banks, practiceRecords, dailyRecords, userSettings } from "@db/schema";

export const adminRouter = createRouter({
  // Database overview stats
  stats: adminQuery.query(async () => {
    const db = getDb();
    const [userCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
    const [bankCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(banks);
    const [recordCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(practiceRecords);
    const [dailyCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(dailyRecords);
    return {
      users: userCount.count,
      banks: bankCount.count,
      practiceRecords: recordCount.count,
      dailyRecords: dailyCount.count,
    };
  }),

  // List all users
  listUsers: adminQuery.query(async () => {
    const db = getDb();
    return db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        lastSignInAt: users.lastSignInAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
  }),

  // List all banks with user info
  listBanks: adminQuery.query(async () => {
    const db = getDb();
    const rows = await db
      .select({
        id: banks.id,
        userId: banks.userId,
        title: banks.title,
        category: banks.category,
        color: banks.color,
        progress: banks.progress,
        importedAt: banks.importedAt,
        lastPracticedAt: banks.lastPracticedAt,
        questionCount: sql<number>`JSON_LENGTH(${banks.questionsJson})`,
      })
      .from(banks)
      .orderBy(desc(banks.importedAt));
    return rows;
  }),

  // List all practice records
  listRecords: adminQuery
    .input(
      z.object({
        limit: z.number().min(1).max(500).default(100),
        offset: z.number().min(0).default(0),
      }).optional(),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input?.limit ?? 100;
      const offset = input?.offset ?? 0;
      return db
        .select()
        .from(practiceRecords)
        .orderBy(desc(practiceRecords.createdAt))
        .limit(limit)
        .offset(offset);
    }),

  // List all daily records
  listDaily: adminQuery.query(async () => {
    const db = getDb();
    return db
      .select()
      .from(dailyRecords)
      .orderBy(desc(dailyRecords.date));
  }),

  // Delete a user and all their data
  deleteUser: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      // Delete related records first
      await db.delete(practiceRecords).where(eq(practiceRecords.userId, input.id));
      await db.delete(dailyRecords).where(eq(dailyRecords.userId, input.id));
      await db.delete(userSettings).where(eq(userSettings.userId, input.id));
      await db.delete(banks).where(eq(banks.userId, input.id));
      await db.delete(users).where(eq(users.id, input.id));
      return { success: true };
    }),
});
