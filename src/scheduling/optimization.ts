import { AvailableAppointmentSlot } from "../starter-code/appointment";
import { utcDayNumber } from "./dates";

const MS_PER_MINUTE = 60 * 1000;

/**
 * Most non-overlapping appointments that fit, given start times sorted
 * ascending. Greedy: take each start at or after the last taken one ends.
 * This is optimal because all appointments are the same length.
 */
function countMaxAppointments(
  sortedStartTimes: number[],
  durationMs: number,
): number {
  let count = 0;
  let lastEnd = -Infinity;
  for (const start of sortedStartTimes) {
    if (start >= lastEnd) {
      count++;
      lastEnd = start + durationMs;
    }
  }
  return count;
}

/**
 * For the given list of slots and a duration, remove any dates that would 
 * reduce the total number of available slots, if booked. 
 * 
 * The maxmium number of slots that can be booked for a given list of slots is 
 * determined by `countMaxAppointments`. 
 * 
 * A slot is kept if (most that fit before it) + 1 (itself) + (most that fit after it)
 * equals the maxmimum number of slots. Every date in *some* maximum schedule is
 * kept, not just one schedule, so patients see more choices (DECISIONS.md D17).
 * 
 * E.g. 12:00–13:30 every 15 minutes, 90 minutes long: max is 2 (12:00, 13:30).
 * 12:15 → 0 before + 1 + 0 after = 1, so it's dropped. Result: [12:00, 13:30].
 * 
 * Future work: this re-counts the day for each date (quadratic in dates per
 * day, ~20 in practice). A linear version (prefix/suffix counts + two
 * pointers) is ~17x faster but harder to read. See DECISIONS.md.
 */
export function maximizeAppointmentDates(
  dates: Date[],
  durationMinutes: number,
): Date[] {
  const durationMs = durationMinutes * MS_PER_MINUTE;
  const startTimes = dates.map((date) => date.getTime()).sort((a, b) => a - b);
  const maxAppointments = countMaxAppointments(startTimes, durationMs);

  return dates.filter((date) => {
    const start = date.getTime();
    const end = start + durationMs;
    const fitBefore = countMaxAppointments(
      startTimes.filter((time) => time + durationMs <= start),
      durationMs,
    );
    const fitAfter = countMaxAppointments(
      startTimes.filter((time) => time >= end),
      durationMs,
    );
    return fitBefore + 1 + fitAfter === maxAppointments;
  });
}

/**
 * Task 2 Entry Point
 * 
 * Applies `maximizeAppointmentDates` to each UTC day of a clinician's slots.
 * Returns the original slot objects in their original order.
 */
export function optimizeSlots(
  slots: AvailableAppointmentSlot[],
  durationMinutes: number,
): AvailableAppointmentSlot[] {
  const slotDatesByDay = new Map<number, Date[]>();
  for (const slot of slots) {
    const day = utcDayNumber(slot.date);
    const datesForDay = slotDatesByDay.get(day) ?? [];
    datesForDay.push(slot.date);
    slotDatesByDay.set(day, datesForDay);
  }

  const keptSlotTimes = new Set<number>();
  for (const datesForDay of slotDatesByDay.values()) {
    for (const date of maximizeAppointmentDates(datesForDay, durationMinutes)) {
      keptSlotTimes.add(date.getTime());
    }
  }

  return slots.filter((slot) => keptSlotTimes.has(slot.date.getTime()));
}
