import { Context } from "telegraf";
import db from "../db/database";
import { getUserByTelegramId, getStreak } from "../db/queries";
import { getDaysUntilSept1, getTodayDate, getWeekDates, getDayLabel } from "../utils/date";
import dayjs from "dayjs";

export async function handleProgress(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = getUserByTelegramId(telegramId);
  if (!user) {
    await ctx.reply("You're not set up yet. Send /start to get going.");
    return;
  }

  const streak = getStreak(user.id);
  const daysLeft = getDaysUntilSept1();
  const weekDates = getWeekDates();

  const checkins = db
    .prepare(`
      SELECT * FROM checkins
      WHERE user_id = ? AND date >= ? AND date <= ?
      ORDER BY date ASC
    `)
    .all(user.id, weekDates[0], weekDates[6]) as any[];

  const checkinMap = new Map(checkins.map((c) => [c.date, c]));

  let dailyLines = "";
  let daysCompleted = 0;
  let goalsHit = 0;
  let goalsTracked = 0;

  for (const date of weekDates) {
    const checkin = checkinMap.get(date);
    const label = getDayLabel(date);
    const isToday = date === getTodayDate();
    const isFuture = dayjs(date).isAfter(dayjs(), "day");

    if (isFuture) continue;

    if (!checkin || (!checkin.morning_done && !checkin.evening_done)) {
      dailyLines += `• ${label} — missed\n`;
      continue;
    }

    daysCompleted++;

    const workedOn = checkin.worked_on || "checked in";
    dailyLines += `• ${label} — ${workedOn}\n`;

    if (checkin.evening_done) {
      goalsTracked++;
      if (checkin.achieved_goals) goalsHit++;
    }
  }

  const totalDaysSoFar = weekDates.filter(
    (d) => !dayjs(d).isAfter(dayjs(), "day")
  ).length;

  const goalsSummary =
    goalsTracked > 0
      ? `Goals hit: ${goalsHit}/${goalsTracked} days ${goalsHit === goalsTracked ? "💪" : goalsHit >= goalsTracked / 2 ? "📈" : "— keep pushing"}`
      : `No evening check-ins recorded yet this week.`;

  const streakMessage =
    streak?.current_streak === 0
      ? `No active streak yet — tonight's check-in starts one.`
      : `🔥 Current streak: ${streak?.current_streak} day${streak?.current_streak === 1 ? "" : "s"}`;

  await ctx.reply(
    `📊 Your Week at a Glance\n\n` +
    `✅ Check-ins: ${daysCompleted}/${totalDaysSoFar} days\n` +
    `${streakMessage}\n` +
    `🏆 Longest streak: ${streak?.longest_streak || 0} days\n` +
    `📅 ${daysLeft} days until September 1st\n\n` +
    `What you worked on:\n${dailyLines}\n` +
    `${goalsSummary}`
  );
}