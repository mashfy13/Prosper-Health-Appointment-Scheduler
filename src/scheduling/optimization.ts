import { AvailableAppointmentSlot } from "../starter-code/appointment";
import { utcDayNumber } from "./dates";

const MS_PER_MINUTE = 60 * 1000;

/**
 * Find the earliest possible maximum-slot schedule. 
 * 
 * Iterate through the sorted slot times from beginning to end.
 * If the slot starts on or after the last end (initialized to -infinity), 
 * meaning it doesn't overlap the last slot
 *  - Add the start time to the schedule 
 *  - Update last end time to the start time + duration
 */
function earliestSchedule(
  sortedSlotTimes: number[],
  durationMs: number,
): number[] {
  const schedule: number[] = [];
  let lastEnd = -Infinity;
  for (const start of sortedSlotTimes) {
    if (start >= lastEnd) {
      schedule.push(start);
      lastEnd = start + durationMs;
    }
  }
  return schedule;
}

/**
 * Find the latest possible maximum-slot schedule. 
 * 
 * Iterate through the sorted slot times from end to beginning (reverse).
 * If the slot ends (start + duration) on or before the next start 
 *  - Add the slot start time to the schedule 
 *  - Set the next start to the slot start time
 * Reverse the schedule to get it sorted by start time 
 */
function latestSchedule(
  sortedSlotTimes: number[],
  durationMs: number,
): number[] {
  const schedule: number[] = [];
  let nextStart = Infinity;
  for (const start of [...sortedSlotTimes].reverse()) {
    if (start + durationMs <= nextStart) {
      schedule.push(start);
      nextStart = start;
    }
  }
  return schedule.reverse();
}

/**
 * For the given list of slots and a duration, remove any dates that would
 * reduce the total number of available slots, if booked.
 *
 * Every date in *some* maximum schedule is kept, not just one schedule, so
 * patients see more choices.
 *
 * A date is kept if booking it still lets the day reach its target:
 *   (most that fit before it) + 1 + (most that fit after it) >= target
 * The earliest schedule packs appointments as early as possible, so the most
 * that fit before a date is how many of them end by its start. The latest
 * schedule gives the most that fit after it the same way.
 *
 * The target is the most that physically fit, capped by `maxAppointments`
 * (Task 3: the clinician's remaining daily/weekly capacity). There's no reason
 * to hide a slot to protect room the clinician can't use.
 *
 * E.g. Dr. Doe on 2024-09-02 (90 minutes):
 *   earliest: 12:00  13:30  15:00  21:00  22:30   (5 fit)
 *   latest:   12:30  14:00  15:30  21:00  22:30
 *   12:45: 0 before + 1 + 3 after (15:30, 21:00, 22:30) = 4
 *   → removed with no cap (4 < 5), kept with a cap of 2 (4 >= 2).
 */
export function maximizeAppointmentDates(
  slotDates: Date[],
  durationMinutes: number,
  maxAppointments: number = Infinity,
): Date[] {
  if (maxAppointments <= 0) return [];

  const durationMs = durationMinutes * MS_PER_MINUTE;
  const slotTimes = slotDates.map((date) => date.getTime()).sort((a, b) => a - b);
  const earliest = earliestSchedule(slotTimes, durationMs);
  const latest = latestSchedule(slotTimes, durationMs);
  const target = Math.min(maxAppointments, earliest.length);

  return slotDates.filter((date) => {
    const currentStart = date.getTime();
    const fitBefore = earliest.filter(
      (start) => start + durationMs <= currentStart,
    ).length;
    const fitAfter = latest.filter(
      (start) => start >= currentStart + durationMs,
    ).length;
    return fitBefore + 1 + fitAfter >= target;
  });
}

/**
 * Task 2 Entry Point
 * 
 * Applies `maximizeAppointmentDates` to each UTC day of a clinician's slots
 * to get all bookable slots that wouldn't reduce the maxnimum number slots
 * if booked. 
 * 
 * Filters the original slots down to the slots in that "maximum" set.
 *
 * `maxAppointmentsOn(date)` caps each day's target (Task 3: remaining
 * capacity for that date's day and week). No cap by default.
 */
export function optimizeSlots(
  slots: AvailableAppointmentSlot[],
  durationMinutes: number,
  maxAppointmentsOn: (date: Date) => number = () => Infinity,
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
    const keptDates = maximizeAppointmentDates(
      datesForDay,
      durationMinutes,
      maxAppointmentsOn(datesForDay[0]),
    );
    for (const date of keptDates) {
      keptSlotTimes.add(date.getTime());
    }
  }

  return slots.filter((slot) => keptSlotTimes.has(slot.date.getTime()));
}
