import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
import { initDB } from "./db/database";
import { upsertUser } from "./db/queries";

dotenv.config();
initDB();

const bot = new Telegraf(process.env.BOT_TOKEN!);

bot.start((ctx) => {
  const firstName = ctx.from?.first_name || "there";
  const telegramId = ctx.from?.id;
  const username = ctx.from?.username || null;

  if (telegramId) {
    upsertUser(telegramId, username, firstName);
    console.log(`User registered: ${firstName} (${telegramId})`);
  }

  ctx.reply(
    `Hii ${firstName}! 🙌\n\nI'm Alfred, your personal accountability assistant. I’ll help you show up for yourself every day and get closer to your dreams. Remember: you can achieve anything you set your mind to! 💪\n\nNow, let’s get this bread! 😤\n\nTo get started, set your preferred check-in times:`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("🌅 Set Morning Check-in Time", "set_morning"),
        Markup.button.callback("🌙 Set Evening Check-in Time", "set_evening")
      ]
    ])
  );
});


bot.action("set_morning", (ctx) => {
  ctx.reply("Great! What time do you want to receive your morning check-in? (HH:MM, 24h format, e.g., 08:00)");
});

bot.action("set_evening", (ctx) => {
  ctx.reply("Perfect! What time do you want to receive your evening check-in? (HH:MM, 24h format, e.g., 21:00)");
});

bot.launch();
console.log("Alfred is running...");