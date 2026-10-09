const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Helper to get a representation of a UTC date as a number of days
 * Used to help determine number of days between two dates in `calendarDaysBetween`
 */
export function utcDayNumber(date: Date): number {
  return Math.floor(date.getTime() / MS_PER_DAY);
}

/**
 * Calendar days from `from` to `to` in UTC, ignoring time of day.
 * E.g. 23:00 on Monday → 00:30 on Tuesday is 1 day; 12:00 → 12:15 seven days
 * later is 7 days (not 7 days and 15 minutes).
 */
export function calendarDaysBetween(from: Date, to: Date): number {
  return utcDayNumber(to) - utcDayNumber(from);
}
