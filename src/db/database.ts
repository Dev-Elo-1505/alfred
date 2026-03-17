import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "alfred.db")

const db = new Database(DB_PATH)

db.pragma("journal_mode = WAL")

export function initDB(): void {
    db.exec(
        `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id INTEGER UNIQUE NOT NULL,
            username TEXT,
            first_name TEXT,
            morning_time TEXT DEFAULT '08:00',
      evening_time TEXT DEFAULT '21:00',
      timezone TEXT DEFAULT 'Africa/Lagos',
      is_premium INTEGER DEFAULT 0,
      premium_since TIMESTAMP,
      premium_expires TIMESTAMP,
      ai_insights_used INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS checkins (
             id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      morning_done INTEGER DEFAULT 0,
      evening_done INTEGER DEFAULT 0,
      worked_on TEXT,
      achieved_goals INTEGER,
      reason_if_no TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, date)
        );

        CREATE TABLE IF NOT EXISTS streaks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_checkin_date TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      verified_at TIMESTAMP,
      verified_by TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
    console.log("Database initialized successfully");
}

export default db;