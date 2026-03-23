import { Scenes, Markup } from "telegraf";
import {
  getUserByTelegramId,
  getStreak,
  getTodayCheckin,
  saveEveningCheckin,
  updateStreak,
} from "../db/queries";
import { getTodayDate } from "../utils/date";
import type { BotContext } from "../types";

export const eveningCheckinScene = new Scenes.WizardScene<BotContext>(
  "evening-checkin",

 
  async (ctx) => {
    const telegramId = ctx.from!.id;
    const user = getUserByTelegramId(telegramId);
    if (!user) {
      await ctx.reply("Send /start to get set up first.");
      return ctx.scene.leave();
    }

    const firstName = user.first_name || "Champion";
    ctx.wizard.state.userId = user.id;

    const todayCheckin = getTodayCheckin(user.id) as any;
    if (todayCheckin?.morning_goals) {
      ctx.wizard.state.morningGoals = todayCheckin.morning_goals;
    }

    await ctx.reply(
      `Evening, ${firstName}. 🌙\n\nAnother day in the books. Before you rest, let's be honest with each other — that's the deal we made.\n\nWhat did you work on today? Don't filter it, just tell me.`
    );

    return ctx.wizard.next();
  },

 
  async (ctx) => {
    if (!ctx.message || !("text" in ctx.message)) {
      await ctx.reply("Just tell me what you worked on today.");
      return;
    }

    ctx.wizard.state.workedOn = ctx.message.text.trim();

    const goalRef = ctx.wizard.state.morningGoals
      ? `\n\nThis morning you said your goals were: "${ctx.wizard.state.morningGoals}"\n\n`
      : "\n\n";

    await ctx.reply(
      `Got it.${goalRef}Did you achieve your goals for today?`,
      Markup.keyboard([["✅ Yes", "❌ No"]]).oneTime().resize()
    );

    return ctx.wizard.next();
  },

  
  async (ctx) => {
    if (!ctx.message || !("text" in ctx.message)) {
      await ctx.reply(
        "Tap Yes or No.",
        Markup.keyboard([["✅ Yes", "❌ No"]]).oneTime().resize()
      );
      return;
    }

    const response = ctx.message.text.trim();

    if (response === "✅ Yes") {
      ctx.wizard.state.achievedGoals = true;
      ctx.wizard.state.reasonIfNo = null;

    
      const user = getUserByTelegramId(ctx.from!.id)!;
      const today = getTodayDate();
      saveEveningCheckin(user.id, ctx.wizard.state.workedOn!, true, null);
      updateStreak(user.id, today);

      const streak = getStreak(user.id);
      const newStreak = streak?.current_streak || 1;

      await ctx.reply(
        `Look at you. 👀\n\nSaid you'd do it, and you did it. That's not motivation — that's discipline. And discipline is what separates the ones who make it from the ones who almost did.\n\n🔥 Streak: ${newStreak} day${newStreak === 1 ? "" : "s"} and counting.\n\nGet some rest. You've earned it. See you in the morning. 🌅`,
        Markup.removeKeyboard()
      );

      return ctx.scene.leave();

    } else if (response === "❌ No") {
      await ctx.reply(
        `Hey. That's okay — I'm not here to judge you.\n\nBut I need you to be real with me. What happened today? What got in the way?`,
        Markup.removeKeyboard()
      );
      return ctx.wizard.next();

    } else {
      await ctx.reply(
        "Tap the Yes or No button for me.",
        Markup.keyboard([["✅ Yes", "❌ No"]]).oneTime().resize()
      );
    }
  },

  
  async (ctx) => {
    if (!ctx.message || !("text" in ctx.message)) {
      await ctx.reply("Talk to me — what got in the way?");
      return;
    }

    const reason = ctx.message.text.trim();
    const user = getUserByTelegramId(ctx.from!.id)!;
    const today = getTodayDate();

    saveEveningCheckin(
      user.id,
      ctx.wizard.state.workedOn!,
      false,
      reason
    );

    
    await ctx.reply(
      `Thank you for telling me that. Seriously.\n\nMost people won't even admit when they fall short — you just did. That self-awareness? That's actually what growth looks like.\n\nBut here's what I need you to hear: tomorrow is a clean slate. Not a reset — a continuation. Everything you've built is still there.\n\n"${reason}" — okay. Now we know. Let's make sure it doesn't happen again.\n\nGet some rest. I'll be here in the morning with a fresh start. 🌅`
    );

    return ctx.scene.leave();
  }
);