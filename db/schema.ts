import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  longtext,
  timestamp,
  int,
  bigint,
} from "drizzle-orm/mysql-core";

// Users table - supports both OAuth and username/password auth
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }), // nullable for simple auth users
  username: varchar("username", { length: 50 }),
  password: varchar("password", { length: 255 }), // bcrypt hashed
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;

// Question banks table
export const banks = mysqlTable("banks", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull().default("自定义"),
  color: varchar("color", { length: 20 }).notNull().default("#00d4ff"),
  cover: varchar("cover", { length: 255 }),
  questionsJson: longtext("questionsJson").notNull(),
  chaptersJson: longtext("chaptersJson"),
  progress: int("progress").notNull().default(0),
  importedAt: timestamp("importedAt").defaultNow().notNull(),
  lastPracticedAt: timestamp("lastPracticedAt"),
});

export type Bank = typeof banks.$inferSelect;

// Practice records - per question per user
export const practiceRecords = mysqlTable("practice_records", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  bankId: bigint("bankId", { mode: "number", unsigned: true }).notNull(),
  questionId: int("questionId").notNull(),
  chapterId: int("chapterId"),
  chapterName: varchar("chapterName", { length: 255 }),
  selected: text("selected").notNull(),
  isCorrect: int("isCorrect", { unsigned: true }).notNull(),
  timeSpent: int("timeSpent").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PracticeRecord = typeof practiceRecords.$inferSelect;

// Daily records
export const dailyRecords = mysqlTable("daily_records", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  count: int("count").notNull().default(0),
  correct: int("correct").notNull().default(0),
});

export type DailyRecord = typeof dailyRecords.$inferSelect;

// User settings
export const userSettings = mysqlTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull().unique(),
  dailyGoal: int("dailyGoal").notNull().default(20),
  reminderTime: varchar("reminderTime", { length: 10 }).notNull().default("20:00"),
  difficulty: int("difficulty").notNull().default(3),
  fontSize: varchar("fontSize", { length: 10 }).notNull().default("medium"),
  questionLanguage: varchar("questionLanguage", { length: 10 }).notNull().default("entc"),
  theme: varchar("theme", { length: 10 }).notNull().default("system"),
});

export type UserSetting = typeof userSettings.$inferSelect;
