import { AvailableAppointmentSlot } from "../starter-code/appointment";
import { Clinician, ClinicianType } from "../starter-code/clinician";
import { Patient } from "../starter-code/patient";
import { getRemainingCapacity, removeConflictingSlots } from "./capacity";
import { calendarDaysBetween } from "./dates";
import { optimizeSlots } from "./optimization";
import {
  AssessmentOption,
  ClinicianAssessmentOptions,
  ClinicianSummary,
} from "./types";

/**
 * Constants for the type of assessment that is in scope for the project. 
 * 
 * Assessments are 2 sessions with the same psychologist, on different days, no
 * more than 7 calendar days apart.
 */
export const ASSESSMENT: {
  clinicianType: ClinicianType;
  sessionLengthMinutes: number;
  maxDaysBetweenSessions: number;
} = {
  clinicianType: "PSYCHOLOGIST",
  sessionLengthMinutes: 90,
  maxDaysBetweenSessions: 7,
};

export type SessionPairPredicate = (
  firstSession: AvailableAppointmentSlot,
  secondSession: AvailableAppointmentSlot,
) => boolean;

/**
 * For a given clinician and session length duration, get the clinician's 
 * sorted available slots that are actually eligible. A slot is eligible if 
 * it is in the future and is the required duration. 
 * 
 * Notes: 
 *  - For the scope of the project, `sessionLengthMinutes` will always be 
 *    90, but this allows reuse different for appointment types
 *  - `now` is passed into this function mainly for testing purposes
 * 
 * Future work: a configurable minimum lead time (e.g. no bookings within N
 * hours) if clinicians want notice. Today any slot starting after `now` is
 * offered.
 */
function getEligibleSlots(
  clinician: Clinician,
  sessionLengthMinutes: number,
  now: Date,
): AvailableAppointmentSlot[] {
  return clinician.availableSlots
    .filter(
      (slot) =>
        slot.length === sessionLengthMinutes &&
        slot.date.getTime() > now.getTime(),
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Validates the business requirement that the second slot is at least 1 calendar 
 * day and no more than 7 calendar days after after the first slot 
 */
export const isValidSessionGap: SessionPairPredicate = (
  firstSession,
  secondSession,
) => {
  const daysApart = calendarDaysBetween(firstSession.date, secondSession.date);
  return daysApart >= 1 && daysApart <= ASSESSMENT.maxDaysBetweenSessions;
};

/**¸
 * Helper to determine if the given clinician is eligible for the given patient. 
 * Clinician is eligible if their states and insurances match that of the patient.
 * Additional check on `clinicianType` to filter to psychologists. 
 *
 * Future work:
 * - At thousands of clinicians, index clinicians by (state, payer) in memory,
 *   or in a DB query against indexed join tables, instead of scanning everyone.
 */
function isEligibleClinician(
  clinician: Clinician,
  patient: Patient,
  clinicianType: ClinicianType,
): boolean {
  return (
    clinician.clinicianType === clinicianType &&
    clinician.states.includes(patient.state) &&
    clinician.insurances.includes(patient.insurance)
  );
}

/**
 * Helper to extract the relevant user-facing Clinician information into a 
 * lighter `ClinicianSummary` object for the response. 
 */
 function toClinicianSummary(clinician: Clinician): ClinicianSummary {
  return {
    id: clinician.id,
    firstName: clinician.firstName,
    lastName: clinician.lastName,
  };
}

/**
 * For each slot as a first session, collect every later slot that can be its
 * second session. First sessions with no valid second session are dropped.
 *
 * `isValidPair` defaults to the gap rule; Task 3 adds weekly capacity across
 * both sessions.
 *
 * Future work: this checks each slot against every later slot (quadratic per
 * clinician). Since slots are sorted, each first session's valid second
 * sessions form one continuous run that could be found with binary search.
 * Output size, not CPU, is the real limit at scale. See DECISIONS.md.
 */
export function buildAssessmentOptions(
  sortedSlots: AvailableAppointmentSlot[],
  isValidPair: SessionPairPredicate = isValidSessionGap,
): AssessmentOption[] {
  const options: AssessmentOption[] = [];

  sortedSlots.forEach((firstSession, index) => {
    const laterSlots = sortedSlots.slice(index + 1);
    const secondSessionOptions = laterSlots.filter((secondSession) =>
      isValidPair(firstSession, secondSession),
    );
    if (secondSessionOptions.length > 0) {
      options.push({ firstSession, secondSessionOptions });
    }
  });

  return options;
}

/** Which steps each entry point adds on top of Task 1. */
interface PipelineOptions {
  /** Task 2: don't offer slots that would cost the day an appointment. */
  optimize: boolean;
  /** Task 3: existing appointments and daily/weekly caps. */
  applyCapacity: boolean;
}

/**
 * Main Shared Pipeline: 
 *  1. Clinician eligbility 
 *  2. Slot eligibility 
 *  3. Filter slots further 
 *    - Factoring in clinician daily and weekly limits (Task 3)
 *    - Optimizing maximum number of slots (Task 2)
 *  4. Build the final slot pairings grouped by clinician 
 *
 * Capacity runs before optimizing, so the optimizer only sees bookable slots
 * and knows how many more the clinician can take each day (D9, D18).
 */
function findOptionsByClinician(
  patient: Patient,
  clinicians: Clinician[],
  now: Date,
  { optimize, applyCapacity }: PipelineOptions,
): ClinicianAssessmentOptions[] {
  const results: ClinicianAssessmentOptions[] = [];

  for (const clinician of clinicians) {
    // Exclude clinicians that are ineligible for the patient
    if (!isEligibleClinician(clinician, patient, ASSESSMENT.clinicianType)) {
      continue;
    }

    // First pass over clinician's available slots to only include slots that are
    // in the future and meet the session length requirement 
    let slots = getEligibleSlots(
      clinician,
      ASSESSMENT.sessionLengthMinutes,
      now,
    );
    
    // If capacity rule is not being applied, only the valid gap rule needs to 
    // be checked 
    let isValidPair: SessionPairPredicate = isValidSessionGap;
    let maxAppointmentsOn: (date: Date) => number = () => Infinity;

    // Task 3: existing appointments and daily/weekly caps
    if (applyCapacity) {
      const capacity = getRemainingCapacity(clinician);
      slots = removeConflictingSlots(slots, clinician.appointments);
      slots = slots.filter((slot) => capacity.remainingOn(slot.date) > 0);
      maxAppointmentsOn = capacity.remainingOn;
      isValidPair = (firstSession, secondSession) =>
        isValidSessionGap(firstSession, secondSession) &&
        capacity.hasRoomForBoth(firstSession.date, secondSession.date);
    }

    // Task 2: don't offer slots that would cost the day an appointment
    if (optimize) {
      slots = optimizeSlots(
        slots,
        ASSESSMENT.sessionLengthMinutes,
        maxAppointmentsOn,
      );
    }

    const options = buildAssessmentOptions(slots, isValidPair);
    // Omit any clinicians that do not have eligible slots 
    if (options.length > 0) {
      results.push({ clinician: toClinicianSummary(clinician), options });
    }
  }

  return results;
}

/**
 * Task 1: every assessment a patient can book, grouped by clinician.
 *
 * Clinicians appear in input order and are omitted if they have no options.
 * After the eligibility check, all work depends only on that one clinician's
 * data, so it can be cached, parallelized, or recomputed per clinician.
 *
 * Future work: 
 * - Rank clinicians (e.g. soonest availability) and limit how far
 *   ahead we search (a `horizonDays` option) to bound work and output size.
 * - Consider pagination 
 */
export function findAssessmentOptions(
  patient: Patient,
  clinicians: Clinician[],
  now: Date = new Date(),
): ClinicianAssessmentOptions[] {
  return findOptionsByClinician(patient, clinicians, now, {
    optimize: false,
    applyCapacity: false,
  });
}

/**
 * Task 2: same as `findAssessmentOptions`, but each day's slots are filtered
 * to those that don't reduce how many appointments the day can hold.
 */
export function findOptimizedAssessmentOptions(
  patient: Patient,
  clinicians: Clinician[],
  now: Date = new Date(),
): ClinicianAssessmentOptions[] {
  return findOptionsByClinician(patient, clinicians, now, {
    optimize: true,
    applyCapacity: false,
  });
}

/**
 * Task 3 (patient-facing): Task 2, plus each clinician's existing appointments
 * and daily/weekly caps.
 *  - Slots overlapping a counted appointment are removed (D15)
 *  - Slots on a day or week with no capacity left are removed
 *  - Each day is optimized toward what the clinician can still take that day
 *    and week, not just what physically fits (D18)
 *  - Both sessions in the same week need 2 left in that week (D14)
 */
export function findAvailableAssessmentOptions(
  patient: Patient,
  clinicians: Clinician[],
  now: Date = new Date(),
): ClinicianAssessmentOptions[] {
  return findOptionsByClinician(patient, clinicians, now, {
    optimize: true,
    applyCapacity: true,
  });
}
