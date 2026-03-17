import cron from "node-cron";
import db from "../db/database";
import { getRandomQuote } from "../utils/quotes";
import { getDaysUntilSept1, getTodayDate } from "../utils/date";
import { resetStreak } from "../db/queries";
import type { Telegraf } from "telegraf";
import type { BotContext } from "../types";

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

  console.log("Scheduler running ⏰");
}