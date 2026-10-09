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
 * patients see more choices (DECISIONS.md D17).
 *
 * Both schedules hold the maximum number of appointments. The k-th appointment
 * of *any* maximum schedule starts between the k-th earliest and the k-th
 * latest start, so a date is kept if it falls inside one of those windows.
 *
 * E.g. Dr. Doe on 2024-09-02 (90 minutes):
 *   earliest: 12:00  13:30  15:00  21:00  22:30
 *   latest:   12:30  14:00  15:30  21:00  22:30
 *   kept:     12:00–12:30, 13:30–14:00, 15:00–15:30, 21:00, 22:30
 *   12:45 falls in no window: booking it leaves room for only 4 appointments.
 *
 * Returns the input `Date` objects in input order.
 */
export function maximizeAppointmentDates(
  slotDates: Date[],
  durationMinutes: number,
): Date[] {
  const durationMs = durationMinutes * MS_PER_MINUTE;
  const slotTimes = slotDates.map((date) => date.getTime()).sort((a, b) => a - b);
  const earliest = earliestSchedule(slotTimes, durationMs);
  const latest = latestSchedule(slotTimes, durationMs);

  return slotDates.filter((date) => {
    const currentStart = date.getTime();
    return earliest.some(
      (earliestStart, k) => earliestStart <= currentStart && currentStart <= latest[k],
    );
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
