/**
 * ZENITH Database Seed Script
 * Reads db/seed/data-export.json and imports all data into MySQL.
 * Run with: npx tsx db/seed/seed.ts
 */
import * as fs from "fs";
import * as path from "path";
import { createConnection, Connection } from "mysql2/promise";

const DATA_FILE = path.resolve(__dirname, "./data-export.json");

interface DataExport {
  users: Array<{
    id: number;
    username: string;
    name: string;
  }>;
  banks: Array<{
    id: number;
    title: string;
    description?: string;
    category?: string;
    color?: string;
    questions: any[];
    chapters?: any[];
  }>;
  mockExams: Array<{
    id: number;
    title: string;
    questions: any[];
  }>;
  practiceRecords: Array<{
    id: number;
    userId: number;
    bankId: number;
    mockExamId: number | null;
    questionId: number;
    chapterId: number | null;
    chapterName: string | null;
    selected: any;
    isCorrect: boolean;
    timeSpent: number;
    createdAt: string;
  }>;
  dailyRecords: Array<{
    id: number;
    userId: number;
    date: string;
    count: number;
    correct: number;
  }>;
  userSettings: Array<{
    id: number;
    userId: number;
    dailyGoal: number;
    reminderTime: string;
    difficulty: number;
    fontSize: string;
    questionLanguage: string;
    theme: string;
  }>;
}

async function getConnection(): Promise<Connection> {
  const dbUrl = process.env.DATABASE_URL || "mysql://zenith:zenith_pass@localhost:3306/zenith";
  
  // Parse DATABASE_URL
  const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) {
    throw new Error("Invalid DATABASE_URL format");
  }
  
  const [, user, password, host, port, database] = match;
  
  return createConnection({
    host,
    port: parseInt(port),
    user,
    password,
    database,
    multipleStatements: true,
    charset: "utf8mb4",
  });
}

async function seedUsers(conn: Connection, data: DataExport) {
  console.log("Seeding users...");
  for (const user of data.users) {
    await conn.execute(
      `INSERT INTO users (id, username, password, name, role, createdAt, updatedAt, lastSignInAt)
       VALUES (?, ?, ?, ?, 'user', NOW(), NOW(), NOW())
       ON DUPLICATE KEY UPDATE username = VALUES(username), name = VALUES(name)`,
      [user.id, user.username, "", user.name || user.username]
    );
  }
  console.log(`  Inserted ${data.users.length} users`);
}

async function seedBanks(conn: Connection, data: DataExport) {
  console.log("Seeding banks...");
  for (const bank of data.banks) {
    const questionsJson = JSON.stringify(bank.questions);
    const chaptersJson = bank.chapters ? JSON.stringify(bank.chapters) : null;
    
    await conn.execute(
      `INSERT INTO banks (id, userId, title, description, category, color, questionsJson, chaptersJson, progress, importedAt)
       VALUES (?, 1, ?, ?, ?, ?, ?, ?, 0, NOW())
       ON DUPLICATE KEY UPDATE 
         title = VALUES(title), 
         questionsJson = VALUES(questionsJson),
         chaptersJson = VALUES(chaptersJson)`,
      [
        bank.id,
        bank.title,
        bank.description || "",
        bank.category || "\u81ea\u5b9a\u4e49",
        bank.color || "#00d4ff",
        questionsJson,
        chaptersJson,
      ]
    );
  }
  console.log(`  Inserted ${data.banks.length} banks (${data.banks[0]?.questions?.length || 0} questions)`);
}

async function seedMockExams(conn: Connection, data: DataExport) {
  console.log("Seeding mock exams...");
  for (const exam of data.mockExams) {
    const questionsJson = JSON.stringify(exam.questions);
    
    await conn.execute(
      `INSERT INTO mock_exams (id, userId, title, bankId, questionsJson, questionCount, practicedCount, createdAt)
       VALUES (?, 1, ?, 60001, ?, ?, 0, NOW())
       ON DUPLICATE KEY UPDATE 
         title = VALUES(title), 
         questionsJson = VALUES(questionsJson),
         questionCount = VALUES(questionCount)`,
      [exam.id, exam.title, questionsJson, exam.questions.length]
    );
  }
  console.log(`  Inserted ${data.mockExams.length} mock exams`);
}

async function seedPracticeRecords(conn: Connection, data: DataExport) {
  console.log("Seeding practice records...");
  let count = 0;
  const batchSize = 50;
  
  for (let i = 0; i < data.practiceRecords.length; i += batchSize) {
    const batch = data.practiceRecords.slice(i, i + batchSize);
    const values: any[] = [];
    const placeholders: string[] = [];
    
    for (const record of batch) {
      placeholders.push("(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      values.push(
        record.userId,
        record.bankId,
        record.mockExamId,
        record.questionId,
        record.chapterId,
        record.chapterName,
        JSON.stringify(record.selected),
        record.isCorrect ? 1 : 0,
        record.timeSpent,
        record.createdAt
      );
    }
    
    const sql = `INSERT INTO practice_records 
      (userId, bankId, mockExamId, questionId, chapterId, chapterName, selected, isCorrect, timeSpent, createdAt) 
      VALUES ${placeholders.join(", ")}`;
    
    await conn.execute(sql, values);
    count += batch.length;
  }
  
  console.log(`  Inserted ${count} practice records`);
}

async function seedDailyRecords(conn: Connection, data: DataExport) {
  console.log("Seeding daily records...");
  for (const record of data.dailyRecords) {
    await conn.execute(
      `INSERT INTO daily_records (id, userId, date, count, correct)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE count = VALUES(count), correct = VALUES(correct)`,
      [record.id, record.userId, record.date, record.count, record.correct]
    );
  }
  console.log(`  Inserted ${data.dailyRecords.length} daily records`);
}

async function seedUserSettings(conn: Connection, data: DataExport) {
  console.log("Seeding user settings...");
  for (const settings of data.userSettings) {
    await conn.execute(
      `INSERT INTO user_settings 
        (id, userId, dailyGoal, reminderTime, difficulty, fontSize, questionLanguage, theme)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         dailyGoal = VALUES(dailyGoal),
         difficulty = VALUES(difficulty),
         questionLanguage = VALUES(questionLanguage),
         theme = VALUES(theme)`,
      [
        settings.id,
        settings.userId,
        settings.dailyGoal,
        settings.reminderTime,
        settings.difficulty,
        settings.fontSize,
        settings.questionLanguage,
        settings.theme,
      ]
    );
  }
  console.log(`  Inserted ${data.userSettings.length} user settings`);
}

async function seed() {
  console.log("=".repeat(50));
  console.log("ZENITH Database Seeder");
  console.log("=".repeat(50));
  
  if (!fs.existsSync(DATA_FILE)) {
    console.error(`Data file not found: ${DATA_FILE}`);
    process.exit(1);
  }
  
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  const data: DataExport = JSON.parse(raw);
  
  console.log(`\nLoaded data export:`);
  console.log(`  Users: ${data.users?.length || 0}`);
  console.log(`  Banks: ${data.banks?.length || 0}`);
  console.log(`  Mock Exams: ${data.mockExams?.length || 0}`);
  console.log(`  Practice Records: ${data.practiceRecords?.length || 0}`);
  console.log(`  Daily Records: ${data.dailyRecords?.length || 0}`);
  console.log(`  User Settings: ${data.userSettings?.length || 0}`);
  
  let conn: Connection | null = null;
  
  try {
    conn = await getConnection();
    console.log("\nConnected to MySQL");
    
    // Disable foreign key checks during seeding
    await conn.execute("SET FOREIGN_KEY_CHECKS = 0");
    
    // Clear existing data in reverse dependency order
    console.log("\nClearing existing data...");
    await conn.execute("DELETE FROM practice_records");
    await conn.execute("DELETE FROM daily_records");
    await conn.execute("DELETE FROM user_settings");
    await conn.execute("DELETE FROM mock_exams");
    await conn.execute("DELETE FROM banks");
    await conn.execute("DELETE FROM users");
    
    // Reset auto-increment
    await conn.execute("ALTER TABLE practice_records AUTO_INCREMENT = 1");
    await conn.execute("ALTER TABLE daily_records AUTO_INCREMENT = 1");
    
    // Seed in dependency order
    await seedUsers(conn, data);
    await seedBanks(conn, data);
    await seedMockExams(conn, data);
    await seedPracticeRecords(conn, data);
    await seedDailyRecords(conn, data);
    await seedUserSettings(conn, data);
    
    // Re-enable foreign key checks
    await conn.execute("SET FOREIGN_KEY_CHECKS = 1");
    
    console.log("\n" + "=".repeat(50));
    console.log("Seeding completed successfully!");
    console.log("=".repeat(50));
    
  } catch (error) {
    console.error("\nSeeding failed:", error);
    process.exit(1);
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}

// Run if called directly (ESM compatible)
const isMain = import.meta.url === `file://${process.argv[1]}` ||
               process.argv[1]?.endsWith("seed.ts") ||
               process.argv[1]?.endsWith("seed.js");
if (isMain) {
  seed();
}

export { seed };
