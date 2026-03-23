import dayjs from "dayjs";

export function getDaysUntilSept1(): number {
    const now = dayjs()
    let target = dayjs(`${now.year()}-09-01`);

    if (now.isAfter(target)) {
        target = dayjs(`${now.year() + 1}-09-01`)
    }

    return target.diff(now, 'day')
}

export function getTodayDate(): string {
    return dayjs().format('YYYY-MM-DD')
}

export function getWeekDates(): string[] {
  const dates: string[] = [];
  const today = dayjs();
  // Get last 7 days including today
  for (let i = 6; i >= 0; i--) {
    dates.push(today.subtract(i, "day").format("YYYY-MM-DD"));
  }
  return dates;
}

export function getDayLabel(date: string): string {
  return dayjs(date).format("ddd"); // Mon, Tue, Wed...
}