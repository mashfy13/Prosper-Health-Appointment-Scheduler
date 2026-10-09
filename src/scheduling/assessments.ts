import { AvailableAppointmentSlot } from "../starter-code/appointment";
import { Clinician, ClinicianType } from "../starter-code/clinician";
import { Patient } from "../starter-code/patient";
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
 * `isValidPair` is injectable so later rules (e.g. weekly capacity across both
 * sessions) can extend the default gap rule.
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
  return sortedSlots
    .map((firstSession, index) => ({
      firstSession,
      secondSessionOptions: sortedSlots
        .slice(index + 1)
        .filter((secondSession) => isValidPair(firstSession, secondSession)),
    }))
    .filter((option) => option.secondSessionOptions.length > 0);
}

/**
 * Main Shared Pipeline: 
 *  1. Clinician eligbility 
 *  2. Slot eligibility 
 *  3. Filter slots further 
 *  4. Build the final slot pairings grouped by clinician 
 * 
 * `filterSlots()` is a callback to filter the slots further 
 *  - Optimizing maximum number of slots 
 *  - Factoring in clinician daily and weekly limits
 */
 function findOptionsByClinician(
  patient: Patient,
  clinicians: Clinician[],
  now: Date,
  filterSlots: (
    sortedSlots: AvailableAppointmentSlot[],
  ) => AvailableAppointmentSlot[],
): ClinicianAssessmentOptions[] {
  return clinicians
    .filter((clinician) =>
      isEligibleClinician(clinician, patient, ASSESSMENT.clinicianType),
    )
    .map((clinician) => ({
      clinician: toClinicianSummary(clinician),
      options: buildAssessmentOptions(
        filterSlots(
          getEligibleSlots(clinician, ASSESSMENT.sessionLengthMinutes, now),
        ),
      ),
    }))
    // Omit any clinicians that do not have eligible slots 
    .filter((result) => result.options.length > 0);
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
  return findOptionsByClinician(patient, clinicians, now, (slots) => slots);
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
  return findOptionsByClinician(patient, clinicians, now, (slots) =>
    optimizeSlots(slots, ASSESSMENT.sessionLengthMinutes),
  );
}
