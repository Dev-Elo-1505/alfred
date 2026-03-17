import { Scenes, Markup } from "telegraf";
import { upsertUser, updateCheckInTimes, updateUserGoal } from "../db/queries";
import type { BotContext } from "../types";

export const onboardingScene = new Scenes.WizardScene<BotContext>(
  "onboarding",

  // Step 1 — Welcome + ask for name confirmation
  async (ctx) => {
    const firstName = ctx.from?.first_name || "there";
    await ctx.reply(
      `Hii ${firstName}! 🙌\n\nI'm Alfred — your personal accountability assistant.\n\nI'll help you show up for yourself every day and get closer to your dreams. Not with empty words, but with real check-ins, honest reflection, and a streak that'll make you proud to protect.\n\nRemember: you can achieve anything you set your mind to. 💪\n\nNow, let's get this bread! 😤\n\nFirst — what should I call you?`,
      Markup.removeKeyboard()
    );
    return ctx.wizard.next();
  },

  // Step 2 — Save name, ask what they're working towards
  async (ctx) => {
    if (!ctx.message || !("text" in ctx.message)) {
      await ctx.reply("Please type your name so I know what to call you.");
      return;
    }

    ctx.wizard.state.name = ctx.message.text.trim();

    await ctx.reply(
      `${ctx.wizard.state.name}. I like that name.\n\nNow tell me — what are you working towards right now? Could be a job, a project, a degree, anything. Be honest with me, this stays between us. 🤝`
    );
    return ctx.wizard.next();
  },

  // Step 3 — Save goal, ask morning check-in time
  async (ctx) => {
    if (!ctx.message || !("text" in ctx.message)) {
      await ctx.reply("Tell me what you're working towards — I'm listening.");
      return;
    }

    ctx.wizard.state.goal = ctx.message.text.trim();

    await ctx.reply(
      `${ctx.wizard.state.goal}.\n\nThat's worth waking up for.\n\nI'll check in with you every morning and every evening. Let's set your times.\n\n🌅 What time should I send your morning check-in?\n\nSend it in HH:MM format (e.g. 07:00). Default is 08:00 — just send "skip" to use that.`
    );
    return ctx.wizard.next();
  },

  // Step 4 — Save morning time, ask evening check-in time
  async (ctx) => {
    if (!ctx.message || !("text" in ctx.message)) {
      await ctx.reply("Send me a time in HH:MM format, or type skip.");
      return;
    }

    const input = ctx.message.text.trim().toLowerCase();
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (input !== "skip" && !timeRegex.test(input)) {
      await ctx.reply(
        "That doesn't look right. Send me a time like 07:30, or type skip to use 08:00."
      );
      return;
    }

    ctx.wizard.state.morningTime = input === "skip" ? "08:00" : input;

    await ctx.reply(
      `Morning check-in locked in at ${ctx.wizard.state.morningTime}. ✅\n\n🌙 Now, what time for your evening check-in?\n\nSend HH:MM or skip to use 21:00.`
    );
    return ctx.wizard.next();
  },

  // Step 5 — Save evening time, register user, send off
  async (ctx) => {
    if (!ctx.message || !("text" in ctx.message)) {
      await ctx.reply("Send me a time in HH:MM format, or type skip.");
      return;
    }

    const input = ctx.message.text.trim().toLowerCase();
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (input !== "skip" && !timeRegex.test(input)) {
      await ctx.reply(
        "That doesn't look right. Send me a time like 20:00, or type skip to use 21:00."
      );
      return;
    }

    ctx.wizard.state.eveningTime = input === "skip" ? "21:00" : input;

    // Save everything to DB
    const telegramId = ctx.from!.id;
    const user = upsertUser(
      telegramId,
      ctx.from?.username || null,
      ctx.wizard.state.name || null
    );
    updateCheckInTimes(telegramId, "morning_time", ctx.wizard.state.morningTime!);
    updateCheckInTimes(telegramId, "evening_time", ctx.wizard.state.eveningTime!);
    updateUserGoal(telegramId, ctx.wizard.state.goal!);

    await ctx.reply(
      `You're all set, ${ctx.wizard.state.name}. 🎉\n\nEvery morning at ${ctx.wizard.state.morningTime}, I'll be here — with a quote, your streak, and a countdown to what you're building towards.\n\nEvery evening at ${ctx.wizard.state.eveningTime}, we debrief. No sugarcoating. Just progress.\n\nYou said you're working on: "${ctx.wizard.state.goal}"\n\nI won't let you forget that. 🔒\n\nSee you in the morning. 🌅`
    );

    return ctx.scene.leave();
  }
);