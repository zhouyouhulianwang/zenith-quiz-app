#!/usr/bin/env node
/**
 * ZENITH Database Seed Script (CommonJS)
 * Plain JS - works with Node.js directly, no tsx needed.
 * Reads db/seed/data-export.json and imports all data into MySQL.
 */
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const DATA_FILE = path.resolve(__dirname, "./data-export.json");

function getDbConfig() {
  const dbUrl = process.env.DATABASE_URL || "mysql://zenith:zenith_pass@localhost:3306/zenith";
  
  const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) {
    throw new Error("Invalid DATABASE_URL format: " + dbUrl);
  }
  
  const [, user, password, host, port, database] = match;
  
  return {
    host,
    port: parseInt(port),
    user,
    password,
    database,
    multipleStatements: true,
    charset: "utf8mb4",
  };
}

async function seed() {
  console.log("==================================================");
  console.log("  ZENITH Database Seeder");
  console.log("==================================================");
  
  if (!fs.existsSync(DATA_FILE)) {
    console.error("FATAL: Data file not found: " + DATA_FILE);
    console.error("Contents of " + __dirname + ":");
    try {
      const files = fs.readdirSync(__dirname);
      files.forEach(f => console.error("  - " + f));
    } catch (e) {
      console.error("  (cannot read directory)");
    }
    process.exit(1);
  }
  
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error("FATAL: Failed to parse data-export.json:", e.message);
    process.exit(1);
  }
  
  const stats = {
    users: (data.users || []).length,
    banks: (data.banks || []).length,
    mockExams: (data.mockExams || []).length,
    practiceRecords: (data.practiceRecords || []).length,
    dailyRecords: (data.dailyRecords || []).length,
    userSettings: (data.userSettings || []).length,
  };
  
  console.log("\n  Data to import:");
  console.log("    Users:             " + stats.users);
  console.log("    Banks:             " + stats.banks);
  console.log("    Mock Exams:        " + stats.mockExams);
  console.log("    Practice Records:  " + stats.practiceRecords);
  console.log("    Daily Records:     " + stats.dailyRecords);
  console.log("    User Settings:     " + stats.userSettings);
  
  let conn;
  
  try {
    const dbConfig = getDbConfig();
    console.log("\n  Connecting to MySQL at " + dbConfig.host + ":" + dbConfig.port + "...");
    
    // Retry connection up to 12 times (2 minutes total)
    for (let attempt = 1; attempt <= 12; attempt++) {
      try {
        conn = await mysql.createConnection(dbConfig);
        await conn.execute("SELECT 1");
        console.log("  Connected to MySQL (attempt " + attempt + ")");
        break;
      } catch (err) {
        if (attempt === 12) throw err;
        console.log("  MySQL not ready, retrying in 10s... (" + attempt + "/12)");
        await new Promise(r => setTimeout(r, 10000));
      }
    }
    
    // Verify tables exist
    console.log("\n  Verifying database schema...");
    const [tables] = await conn.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?",
      [dbConfig.database]
    );
    const tableNames = tables.map(t => t.TABLE_NAME);
    const requiredTables = ["users", "banks", "mock_exams", "practice_records", "daily_records", "user_settings"];
    const missingTables = requiredTables.filter(t => !tableNames.includes(t));
    
    if (missingTables.length > 0) {
      console.error("  FATAL: Missing tables: " + missingTables.join(", "));
      console.error("  Found tables: " + (tableNames.length ? tableNames.join(", ") : "none"));
      process.exit(1);
    }
    console.log("  All " + requiredTables.length + " tables verified.");
    
    // Disable foreign key checks
    await conn.execute("SET FOREIGN_KEY_CHECKS = 0");
    
    // Clear existing data
    console.log("\n  Clearing existing data...");
    for (const table of ["practice_records", "daily_records", "user_settings", "mock_exams", "banks", "users"]) {
      await conn.execute("DELETE FROM " + table);
      console.log("    - Cleared: " + table);
    }
    
    // Reset auto-increment
    await conn.execute("ALTER TABLE practice_records AUTO_INCREMENT = 1");
    await conn.execute("ALTER TABLE daily_records AUTO_INCREMENT = 1");
    console.log("  Auto-increment counters reset.");
    
    // ===== SEED USERS =====
    if (data.users && data.users.length > 0) {
      console.log("\n  [1/6] Seeding users...");
      for (const user of data.users) {
        await conn.execute(
          `INSERT INTO users (id, username, password, name, role, createdAt, updatedAt, lastSignInAt)
           VALUES (?, ?, ?, ?, 'user', NOW(), NOW(), NOW())
           ON DUPLICATE KEY UPDATE username = VALUES(username), name = VALUES(name)`,
          [user.id, user.username, "", user.name || user.username]
        );
      }
      console.log("        Inserted " + data.users.length + " users");
    }
    
    // ===== SEED BANKS =====
    if (data.banks && data.banks.length > 0) {
      console.log("\n  [2/6] Seeding banks...");
      let totalQuestions = 0;
      for (const bank of data.banks) {
        const questionsJson = JSON.stringify(bank.questions);
        const chaptersJson = bank.chapters ? JSON.stringify(bank.chapters) : null;
        totalQuestions += (bank.questions || []).length;
        
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
      console.log("        Inserted " + data.banks.length + " banks (" + totalQuestions + " questions)");
    }
    
    // ===== SEED MOCK EXAMS =====
    if (data.mockExams && data.mockExams.length > 0) {
      console.log("\n  [3/6] Seeding mock exams...");
      for (const exam of data.mockExams) {
        const questionsJson = JSON.stringify(exam.questions);
        
        await conn.execute(
          `INSERT INTO mock_exams (id, userId, title, bankId, questionsJson, questionCount, practicedCount, createdAt)
           VALUES (?, 1, ?, 60001, ?, ?, 0, NOW())
           ON DUPLICATE KEY UPDATE 
             title = VALUES(title), 
             questionsJson = VALUES(questionsJson),
             questionCount = VALUES(questionCount)`,
          [exam.id, exam.title, questionsJson, (exam.questions || []).length]
        );
      }
      console.log("        Inserted " + data.mockExams.length + " mock exams");
    }
    
    // ===== SEED PRACTICE RECORDS (batch insert) =====
    if (data.practiceRecords && data.practiceRecords.length > 0) {
      console.log("\n  [4/6] Seeding practice records...");
      const batchSize = 100;
      let count = 0;
      
      for (let i = 0; i < data.practiceRecords.length; i += batchSize) {
        const batch = data.practiceRecords.slice(i, i + batchSize);
        const values = [];
        const placeholders = [];
        
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
        if (count % 100 === 0 || count === data.practiceRecords.length) {
          console.log("        Progress: " + count + "/" + data.practiceRecords.length);
        }
      }
      console.log("        Total: " + count + " practice records");
    }
    
    // ===== SEED DAILY RECORDS =====
    if (data.dailyRecords && data.dailyRecords.length > 0) {
      console.log("\n  [5/6] Seeding daily records...");
      for (const record of data.dailyRecords) {
        await conn.execute(
          `INSERT INTO daily_records (id, userId, date, count, correct)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE count = VALUES(count), correct = VALUES(correct)`,
          [record.id, record.userId, record.date, record.count, record.correct]
        );
      }
      console.log("        Inserted " + data.dailyRecords.length + " daily records");
    }
    
    // ===== SEED USER SETTINGS =====
    if (data.userSettings && data.userSettings.length > 0) {
      console.log("\n  [6/6] Seeding user settings...");
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
      console.log("        Inserted " + data.userSettings.length + " user settings");
    }
    
    // Re-enable foreign key checks
    await conn.execute("SET FOREIGN_KEY_CHECKS = 1");
    
    // Final verification
    console.log("\n  Verifying final counts...");
    for (const table of requiredTables) {
      const [rows] = await conn.execute("SELECT COUNT(*) as cnt FROM " + table);
      console.log("    " + table + ": " + rows[0].cnt + " rows");
    }
    
    console.log("\n==================================================");
    console.log("  SEEDING COMPLETED SUCCESSFULLY");
    console.log("==================================================");
    
  } catch (error) {
    console.error("\n==================================================");
    console.error("  FATAL ERROR during seeding:");
    console.error("  " + (error.message || error));
    console.error("==================================================");
    process.exit(1);
  } finally {
    if (conn) {
      try { await conn.end(); } catch (e) { /* ignore */ }
    }
  }
}

seed();
