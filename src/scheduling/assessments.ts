import { AvailableAppointmentSlot } from "../starter-code/appointment";
import { Clinician, ClinicianType } from "../starter-code/clinician";
import { Patient } from "../starter-code/patient";
import { calendarDaysBetween } from "./dates";
import { isEligibleClinician } from "./eligibility";
import {
  AssessmentOption,
  ClinicianAssessmentOptions,
  ClinicianSummary,
} from "./types";

/**
 * Assessments are 2 sessions with the same psychologist, on different days, no
 * more than 7 calendar days apart.
 *
 * Future work: therapy intake (THERAPY_INTAKE: therapist, 60 minutes, one
 * session) can reuse eligibility and candidate slots with its own config and
 * no pairing step.
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
 * Slots a patient could book for a session of `sessionLengthMinutes`, sorted
 * by start time. We sort rather than trusting the EHR's ordering.
 *
 * The length check also guards data integrity: a 60-minute slot can't hold a
 * 90-minute session even if it belongs to a psychologist.
 *
 * Future work: a configurable minimum lead time (e.g. no bookings within N
 * hours) if clinicians want notice. Today any slot starting after `now` is
 * offered.
 */
export function getCandidateSlots(
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
 * Session 2 must be on a later calendar day than session 1 (which also makes
 * session 1 come first), and at most 7 calendar days after it.
 */
export const isValidSessionGap: SessionPairPredicate = (
  firstSession,
  secondSession,
) => {
  const daysApart = calendarDaysBetween(firstSession.date, secondSession.date);
  return daysApart >= 1 && daysApart <= ASSESSMENT.maxDaysBetweenSessions;
};

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

function toClinicianSummary(clinician: Clinician): ClinicianSummary {
  return {
    id: clinician.id,
    firstName: clinician.firstName,
    lastName: clinician.lastName,
  };
}

/**
 * Task 1: every assessment a patient can book, grouped by clinician.
 *
 * Clinicians appear in input order and are omitted if they have no options.
 * After the eligibility check, all work depends only on that one clinician's
 * data, so it can be cached, parallelized, or recomputed per clinician.
 *
 * Future work: rank clinicians (e.g. soonest availability) and limit how far
 * ahead we search (a `horizonDays` option) to bound work and output size.
 */
export function findAssessmentOptions(
  patient: Patient,
  clinicians: Clinician[],
  now: Date, // TODO: Make this default to new Date() (utc now) if not supplied
): ClinicianAssessmentOptions[] {
  return clinicians
    .filter((clinician) =>
      isEligibleClinician(clinician, patient, ASSESSMENT.clinicianType),
    )
    .map((clinician) => ({
      clinician: toClinicianSummary(clinician),
      options: buildAssessmentOptions(
        getCandidateSlots(clinician, ASSESSMENT.sessionLengthMinutes, now),
      ),
    }))
    .filter((result) => result.options.length > 0);
}
