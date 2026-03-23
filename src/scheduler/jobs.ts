import cron from "node-cron";
import db from "../db/database";
import { getRandomQuote } from "../utils/quotes";
import { getDaysUntilSept1, getTodayDate } from "../utils/date";
import { resetStreak } from "../db/queries";
import type { Telegraf } from "telegraf";
import type { BotContext } from "../types";
import dayjs from "dayjs";

export function setupScheduler(bot: Telegraf<BotContext>): void {

  // Every minute, check if any user's morning check-in time has come
  cron.schedule("* * * * *", async () => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const users = db
      .prepare("SELECT * FROM users WHERE morning_time = ?")
      .all(currentTime) as any[];

    for (const user of users) {
      try {
        await bot.telegram.sendMessage(user.telegram_id, "🌅 Time for your morning check-in!");
        await bot.telegram.sendMessage(user.telegram_id, "/morning");
      } catch (err) {
        console.error(`Failed to send morning check-in to ${user.telegram_id}`, err);
      }
    }
  });

  // Every minute, check if any user's evening check-in time has come
  cron.schedule("* * * * *", async () => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const users = db
      .prepare("SELECT * FROM users WHERE evening_time = ?")
      .all(currentTime) as any[];

    for (const user of users) {
      const today = getTodayDate();
      const checkin = db
        .prepare("SELECT * FROM checkins WHERE user_id = ? AND date = ?")
        .get(user.id, today) as any;

      if (!checkin?.evening_done) {
        try {
          await bot.telegram.sendMessage(
            user.telegram_id,
            `🌙 Evening check-in time, ${user.first_name}! How did today go?`
          );
          await bot.telegram.sendMessage(user.telegram_id, "/evening");
        } catch (err) {
          console.error(`Failed to send evening check-in to ${user.telegram_id}`, err);
        }
      }
    }
  });

  // 9pm reminder — if evening check-in not done
  cron.schedule("0 21 * * *", async () => {
    const users = db.prepare("SELECT * FROM users").all() as any[];
    const today = getTodayDate();
    const daysLeft = getDaysUntilSept1();
    const quote = getRandomQuote();

    for (const user of users) {
      const checkin = db
        .prepare("SELECT * FROM checkins WHERE user_id = ? AND date = ?")
        .get(user.id, today) as any;

      if (!checkin?.evening_done) {
        try {
          await bot.telegram.sendMessage(
            user.telegram_id,
            `Hey ${user.first_name}. 👀\n\nYou haven't checked in yet tonight. I noticed.\n\n${daysLeft} days until September 1st. Every day you don't account for is a day you can't get back.\n\n💬 "${quote}"\n\nI'm still here. /evening`
          );
        } catch (err) {
          console.error(`Reminder failed for ${user.telegram_id}`, err);
        }
      }
    }
  });

  // Midnight — streak reset for anyone who never checked in
  cron.schedule("0 0 * * *", async () => {
    const users = db.prepare("SELECT * FROM users").all() as any[];
    const today = getTodayDate();

    for (const user of users) {
      const checkin = db
        .prepare("SELECT * FROM checkins WHERE user_id = ? AND date = ?")
        .get(user.id, today) as any;

      if (!checkin?.evening_done) {
        try {
          resetStreak(user.id);
          await bot.telegram.sendMessage(
            user.telegram_id,
            `${user.first_name}... 😔\n\nThe day ended without a check-in. Your streak has been reset.\n\nI'm not saying this to hurt you — I'm saying it because you deserve honesty. Today is gone. But tomorrow? Tomorrow is entirely yours.\n\nDon't let two bad days happen in a row. That's the rule. See you in the morning. 🌅`
          );
        } catch (err) {
          console.error(`Streak reset failed for ${user.telegram_id}`, err);
        }
      }
    }
  });

  // Sunday 8pm — weekly summary
cron.schedule("0 20 * * 0", async () => {
  const users = db.prepare("SELECT * FROM users").all() as any[];

  for (const user of users) {
    try {
      // Get last 7 days
      const today = dayjs();
      const weekStart = today.subtract(6, "day").format("YYYY-MM-DD");
      const weekEnd = today.format("YYYY-MM-DD");

      const checkins = db
        .prepare(`
          SELECT * FROM checkins
          WHERE user_id = ? AND date >= ? AND date <= ?
        `)
        .all(user.id, weekStart, weekEnd) as any[];

      const daysCompleted = checkins.filter(
        (c) => c.morning_done || c.evening_done
      ).length;

      const goalsHit = checkins.filter((c) => c.achieved_goals).length;
      const goalsTracked = checkins.filter((c) => c.evening_done).length;
      const missedDays = 7 - daysCompleted;

      const streak = db
        .prepare("SELECT * FROM streaks WHERE user_id = ?")
        .get(user.id) as any;

      // Build Alfred's letter
      const openingByPerformance =
        daysCompleted >= 6
          ? `This was a strong week. Not perfect — but strong. And strong is enough.`
          : daysCompleted >= 4
          ? `This week had some good days and some hard ones. That's honest. That's real life.`
          : `This week was tough. I'm not going to pretend otherwise. But you're still here, and that means something.`;

      const goalLine =
        goalsTracked > 0
          ? goalsHit === goalsTracked
            ? `Every evening you said you hit your goals — and you followed through. That's integrity.`
            : `You hit your goals ${goalsHit} out of ${goalsTracked} evenings. ${goalsHit >= goalsTracked / 2 ? "More wins than losses — build on that." : "We need to close that gap next week."}`
          : `You didn't complete enough evening check-ins for me to track your goals properly. That changes next week.`;

      const missedLine =
        missedDays === 0
          ? `You checked in every single day this week. Do you understand how rare that is?`
          : missedDays === 1
          ? `One missed day. One. Don't let it become two.`
          : `You missed ${missedDays} days this week. I need more from you — and more importantly, you need more from yourself.`;

      const closingLine =
        daysCompleted >= 5
          ? `Rest tonight. You earned it. Monday, we go again. 💪`
          : `The week is done. What's not done is you. Monday is a clean slate — don't waste it.`;

      await bot.telegram.sendMessage(
        user.telegram_id,
        `📬 Weekly Review — ${dayjs().format("MMM D, YYYY")}\n\n` +
        `${openingByPerformance}\n\n` +
        `📊 Check-ins: ${daysCompleted}/7 days\n` +
        `🔥 Current streak: ${streak?.current_streak || 0} days\n` +
        `🏆 Longest streak: ${streak?.longest_streak || 0} days\n\n` +
        `${goalLine}\n\n` +
        `${missedLine}\n\n` +
        `${closingLine}`
      );
    } catch (err) {
      console.error(`Weekly summary failed for ${user.telegram_id}`, err);
    }
  }
});

  console.log("Scheduler running ⏰");
}