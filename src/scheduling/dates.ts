const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Whole days since the Unix epoch, in UTC. Two dates on the same UTC calendar
 * day share a day number.
 *
 * All "which day is this?" logic goes through this helper. We use UTC because
 * neither `Clinician` nor `Patient` has a timezone today. To switch to
 * clinician-local days, this (plus a timezone on `Clinician`) is the place to
 * change. See DECISIONS.md D2.
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
