import { Scenes, Markup } from "telegraf";
import { getRandomQuote } from "../utils/quotes";
import { getDaysUntilSept1, getTodayDate } from "../utils/date";
import { getUserByTelegramId, getStreak, saveMorningCheckin } from "../db/queries";
import type { BotContext } from "../types";

export const morningCheckinScene = new Scenes.WizardScene<BotContext>(
  "morning-checkin",

  // Step 1 — Send morning message, ask for today's goals
  async (ctx) => {
    const telegramId = ctx.from!.id;
    const user = getUserByTelegramId(telegramId);
    if (!user) {
      await ctx.reply("I don't know you yet. Send /start to get set up.");
      return ctx.scene.leave();
    }

    const streak = getStreak(user.id);
    const currentStreak = streak?.current_streak || 0;
    const daysLeft = getDaysUntilSept1();
    const quote = getRandomQuote();
    const firstName = user.first_name || "Champion";

    const streakMessage =
      currentStreak === 0
        ? `Today is a fresh start. Every streak begins with day one.`
        : currentStreak === 1
        ? `Day 1 down. The first step is always the hardest — you've already taken it.`
        : `Day ${currentStreak} of your streak. 🔥 You've shown up ${currentStreak} days in a row. That's not luck — that's character.`;

    await ctx.reply(
      `Good morning, ${firstName}! 🌅\n\n${streakMessage}\n\n📅 ${daysLeft} days until September 1st. The clock is ticking — but so are you.\n\n💬 "${quote}"\n\nNow — what are your goals for today? Tell me what you're committing to. I'm holding you to it. 🎯`
    );

    return ctx.wizard.next();
  },

  // Step 2 — Save goals, send motivational tip
  async (ctx) => {
    if (!ctx.message || !("text" in ctx.message)) {
      await ctx.reply("Type out your goals for today — I'm listening.");
      return;
    }

    const goals = ctx.message.text.trim();
    const telegramId = ctx.from!.id;
    const user = getUserByTelegramId(telegramId);

    if (!user) return ctx.scene.leave();

    saveMorningCheckin(user.id, goals);

    await ctx.reply(
      `Locked in. 🔒\n\nYou said: "${goals}"\n\n💡 Here's your tip for today: Break each goal into the smallest possible first action. Don't "work on my project" — open the file. Don't "study algorithms" — solve one problem. Momentum is built in inches.\n\nGo get it, ${user.first_name}. I'll see you tonight. 💪`
    );

    return ctx.scene.leave();
  }
);