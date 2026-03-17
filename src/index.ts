import { Telegraf, Scenes, session } from "telegraf";
import dotenv from "dotenv";
import { initDB } from "./db/database";
import { onboardingScene } from "./scenes/onboarding";
import { morningCheckinScene } from "./scenes/morningCheckin";
import { eveningCheckinScene } from "./scenes/eveningCheckin";
import { setupScheduler } from "./scheduler/jobs";
import type { BotContext } from "./types";

dotenv.config();
initDB();

const bot = new Telegraf<BotContext>(process.env.BOT_TOKEN!);

// Register scenes
const stage = new Scenes.Stage<BotContext>([
  onboardingScene,
  morningCheckinScene,
  eveningCheckinScene,
]);

bot.use(session());
bot.use(stage.middleware());

// Commands
bot.start((ctx) => ctx.scene.enter("onboarding"));
bot.command("morning", (ctx) => ctx.scene.enter("morning-checkin"));
bot.command("evening", (ctx) => ctx.scene.enter("evening-checkin"));


process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

setupScheduler(bot);
bot.launch();

console.log("Alfred is running... 🤖");