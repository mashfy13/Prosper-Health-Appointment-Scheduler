import {
  Appointment,
  AppointmentStatus,
  AppointmentType,
  AvailableAppointmentSlot,
} from "../starter-code/appointment";
import { Clinician } from "../starter-code/clinician";
import { utcDayNumber, utcWeekNumber } from "./dates";

const MS_PER_MINUTE = 60 * 1000;

/**
 * Statuses that count toward a clinician's caps and block their time
 * (DECISIONS.md D11). Cancelled and rescheduled appointments free the time.
 */
const COUNTED_STATUSES: AppointmentStatus[] = [
  "UPCOMING",
  "OCCURRED",
  "NO_SHOW",
  "LATE_CANCELLATION",
];

/** Appointment length by type. */
export const APPOINTMENT_DURATION_MINUTES: Record<AppointmentType, number> = {
  ASSESSMENT_SESSION_1: 90,
  ASSESSMENT_SESSION_2: 90,
  THERAPY_INTAKE: 60,
  THERAPY_SIXTY_MINS: 60,
};

function isCountedAppointment(appointment: Appointment): boolean {
  return COUNTED_STATUSES.includes(appointment.status);
}

/** How many more appointments the clinician can take on a date's day / week. */
export interface RemainingCapacity {
  onDay: (date: Date) => number;
  inWeek: (date: Date) => number;
  /** The smaller of the two: how many more fit on that date. */
  remainingOn: (date: Date) => number;
  /**
   * Whether both assessment sessions fit (D14). Each date is assumed to have
   * room on its own; if both are in the same week, that week needs 2 left.
   */
  hasRoomForBoth: (firstDate: Date, secondDate: Date) => boolean;
}

/**
 * Counts a clinician's counted appointments per UTC day and Monday–Sunday
 * week, and returns how much of each cap is left. Past appointments count
 * too (e.g. Monday's toward Wednesday's week). Never below 0, even if the
 * clinician is already over a cap.
 */
export function getRemainingCapacity(clinician: Clinician): RemainingCapacity {
  const bookedByDay = new Map<number, number>();
  const bookedByWeek = new Map<number, number>();
  const countedAppointments =
    clinician.appointments.filter(isCountedAppointment);
  for (const appointment of countedAppointments) {
    const day = utcDayNumber(appointment.scheduledFor);
    const week = utcWeekNumber(appointment.scheduledFor);
    bookedByDay.set(day, (bookedByDay.get(day) ?? 0) + 1);
    bookedByWeek.set(week, (bookedByWeek.get(week) ?? 0) + 1);
  }

  const onDay = (date: Date) =>
    Math.max(
      0,
      clinician.maxDailyAppointments -
        (bookedByDay.get(utcDayNumber(date)) ?? 0),
    );
  const inWeek = (date: Date) =>
    Math.max(
      0,
      clinician.maxWeeklyAppointments -
        (bookedByWeek.get(utcWeekNumber(date)) ?? 0),
    );

  return {
    onDay,
    inWeek,
    remainingOn: (date) => Math.min(onDay(date), inWeek(date)),
    hasRoomForBoth: (firstDate, secondDate) => {
      const sameWeek = utcWeekNumber(firstDate) === utcWeekNumber(secondDate);
      return !sameWeek || inWeek(firstDate) >= 2;
    },
  };
}

/**
 * Removes slots that overlap a counted appointment (DECISIONS.md D15).
 * Back-to-back (one ends exactly when the other starts) isn't an overlap.
 *
 * Future work: checks every slot against every appointment. Sorting both and
 * sweeping once would be O(slots + appointments) if clinicians carry long
 * appointment histories.
 */
export function removeConflictingSlots(
  slots: AvailableAppointmentSlot[],
  appointments: Appointment[],
): AvailableAppointmentSlot[] {
  const blockedTimes = appointments
    .filter(isCountedAppointment)
    .map((appointment) => {
      const start = appointment.scheduledFor.getTime();
      return {
        start,
        end:
          start +
          APPOINTMENT_DURATION_MINUTES[appointment.appointmentType] *
            MS_PER_MINUTE,
      };
    });

  return slots.filter((slot) => {
    const start = slot.date.getTime();
    const end = start + slot.length * MS_PER_MINUTE;
    return !blockedTimes.some(
      // Slot overlaps some booked time
      (blocked) => start < blocked.end && blocked.start < end,
    );
  });
}
