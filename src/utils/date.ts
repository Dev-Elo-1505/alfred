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