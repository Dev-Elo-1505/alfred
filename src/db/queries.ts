import dayjs from "dayjs";
import { getTodayDate } from "../utils/date";
import db from "./database";

export interface User {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  morning_time: string;
  evening_time: string;
  timezone: string;
  is_premium: number;
  premium_since: string | null;
  premium_expires: string | null;
  ai_insights_used: number;
  created_at: string;
}

export interface Streak {
  current_streak: number;
  longest_streak: number;
  last_checkin_date: string | null;
}

export interface Checkin {
  id: number;
  user_id: number;
  date: string;
  morning_done: number;
  evening_done: number;
  worked_on: string | null;
  morning_goals: string | null;
  achieved_goals: number | null;
  reason_if_no: string | null;
}

const FREE_AI_INSIGHTS_LIMIT = 3;

//Users

export function upsertUser(
  telegram_id: number,
  username: string | null,
  first_name: string | null
): User {
  const existing = db
    .prepare("SELECT * FROM users WHERE telegram_id = ?")
    .get(telegram_id) as User | undefined;

  if (existing) return existing;

  db.prepare(
    "INSERT INTO users (telegram_id, username, first_name) VALUES (?, ?, ?)"
  ).run(telegram_id, username, first_name);

  const newUser = db
    .prepare("SELECT * FROM users WHERE telegram_id = ?")
    .get(telegram_id) as User;

  db.prepare("INSERT INTO streaks (user_id) VALUES (?)").run(newUser.id);

  return newUser;
}

export function getUserByTelegramId(telegram_id: number): User | undefined {
  return db
    .prepare("SELECT * FROM users WHERE telegram_id = ?")
    .get(telegram_id) as User | undefined;
}

export function updateCheckInTimes(
  telegram_id: number,
  field: "morning_time" | "evening_time",
  time: string
): void {
  db.prepare(`UPDATE users SET ${field} = ? WHERE telegram_id = ?`).run(
    time,
    telegram_id
  );
}

// Premium

export function activatePremium(telegram_id: number): void {
  const now = new Date();
  const expires = new Date(now);
  expires.setMonth(expires.getMonth() + 1);

  db.prepare(`
    UPDATE users 
    SET is_premium = 1,
        premium_since = ?,
        premium_expires = ?
    WHERE telegram_id = ?
  `).run(now.toISOString(), expires.toISOString(), telegram_id);
}

export function deactivatePremium(telegram_id: number): void {
  db.prepare(`
    UPDATE users 
    SET is_premium = 0,
        premium_expires = NULL
    WHERE telegram_id = ?
  `).run(telegram_id);
}

export function isPremium(user: User): boolean {
  if (!user.is_premium) return false;
  if (!user.premium_expires) return false;
  return new Date(user.premium_expires) > new Date();
}

export function canUseAiInsight(user: User): boolean {
  if (isPremium(user)) return true;
  return user.ai_insights_used < FREE_AI_INSIGHTS_LIMIT;
}

export function incrementAiInsightsUsed(telegram_id: number): void {
  db.prepare(`
    UPDATE users SET ai_insights_used = ai_insights_used + 1
    WHERE telegram_id = ?
  `).run(telegram_id);
}

// Payment
export function logPayment(user_id: number, amount: number): number {
  const result = db.prepare(`
    INSERT INTO payments (user_id, amount, status)
    VALUES (?, ?, 'pending')
  `).run(user_id, amount);

  return result.lastInsertRowid as number;
}

export function verifyPayment(payment_id: number, verified_by: string): void {
  db.prepare(`
    UPDATE payments 
    SET status = 'verified',
        verified_at = CURRENT_TIMESTAMP,
        verified_by = ?
    WHERE id = ?
  `).run(verified_by, payment_id);
}

// Streaks

export function getStreak(user_id: number): Streak | undefined {
  return db
    .prepare("SELECT * FROM streaks WHERE user_id = ?")
    .get(user_id) as Streak | undefined;
}

export function updateStreak(user_id: number, date: string): void {
  const streak = db
    .prepare("SELECT * FROM streaks WHERE user_id = ?")
    .get(user_id) as Streak & { last_checkin_date: string | null };

  const yesterday = dayjs(date).subtract(1, "day").format("YYYY-MM-DD");
  const isConsecutive = streak.last_checkin_date === yesterday;

  const newStreak = isConsecutive ? streak.current_streak + 1 : 1;
  const newLongest = Math.max(newStreak, streak.longest_streak);

  db.prepare(`
    UPDATE streaks
    SET current_streak = ?,
        longest_streak = ?,
        last_checkin_date = ?
    WHERE user_id = ?
  `).run(newStreak, newLongest, date, user_id);
}

export function resetStreak(user_id: number): void {
  db.prepare(`
    UPDATE streaks SET current_streak = 0 WHERE user_id = ?
  `).run(user_id);
}

export function updateUserGoal(telegram_id: number, goal: string): void {
  db.prepare("UPDATE users SET goal = ? WHERE telegram_id = ?").run(
    goal,
    telegram_id
  );
}

// checkin

export function getTodayCheckin(user_id: number): Checkin | undefined {
  return db.prepare(`
    SELECT * FROM checkins WHERE user_id = ? AND date = ?
  `).get(user_id, getTodayDate()) as Checkin | undefined;
}

export function saveMorningCheckin(user_id: number, goals: string): void {
  db.prepare(`
    INSERT INTO checkins (user_id, date, morning_done, morning_goals)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
      morning_done = 1,
      morning_goals = ?
  `).run(user_id, getTodayDate(), goals, goals);
}

export function saveEveningCheckin(
  user_id: number,
  worked_on: string,
  achieved_goals: boolean,
  reason_if_no: string | null
): void {
  db.prepare(`
    INSERT INTO checkins (user_id, date, evening_done, worked_on, achieved_goals, reason_if_no)
    VALUES (?, ?, 1, ?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
      evening_done = 1,
      worked_on = ?,
      achieved_goals = ?,
      reason_if_no = ?
  `).run(
    user_id, getTodayDate(),
    worked_on, achieved_goals ? 1 : 0, reason_if_no,
    worked_on, achieved_goals ? 1 : 0, reason_if_no
  );
}