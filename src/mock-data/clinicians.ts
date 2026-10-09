import { Clinician } from "../starter-code/clinician";
import { clinician as starterJaneDoe } from "../starter-code/mock-clinician";
import { MOCK_SLOT_DATA } from "../starter-code/mock-slot-data";
import { buildClinician } from "./factories";

/** 
 * Dr. Doe from the starter code, with the real slots from slots.json. 
 * Large set of slots data -> produces total of 37,165 session pairs (before optimization task)
*/
export const janeDoe: Clinician = buildClinician({
  ...starterJaneDoe,
  slots: MOCK_SLOT_DATA,
});

/** 
 * Small example data set from the instructions document 
 * Eligible for patient2
 */
export const jonSnow: Clinician = buildClinician({
  id: "clinician-jon-snow", 
  firstName: "Jon",
  lastName: "Snow",
  states: ["MD"],
  insurances: ["AETNA", "UNITED"],
  clinicianType: "PSYCHOLOGIST",
  maxDailyAppointments: 3,
  maxWeeklyAppointments: 9,
  slots: [
    { date: "2024-08-19T12:00:00.000Z", length: 90 },
    { date: "2024-08-19T12:15:00.000Z", length: 90 },
    { date: "2024-08-21T12:00:00.000Z", length: 90 },
    { date: "2024-08-21T15:00:00.000Z", length: 90 },
    { date: "2024-08-22T15:00:00.000Z", length: 90 },
    { date: "2024-08-28T12:15:00.000Z", length: 90 },
  ],
});

/**
 * Eligible for patient2 (MD + United). Small data set where Task 2 removes
 * slots that would cost an appointment:
 * - 08-20: README example (12:00–13:30 every 15 min) → keeps 12:00, 13:30
 * - 08-22: 14:00, 14:30, 15:30 → keeps 14:00, 15:30 (14:30 blocks both)
 * - 08-23: 12:00 alone → kept
 */
export const aryaStark: Clinician = buildClinician({
  id: "clinician-arya-stark",
  firstName: "Arya",
  lastName: "Stark",
  states: ["MD", "VA"],
  insurances: ["UNITED"],
  clinicianType: "PSYCHOLOGIST",
  maxDailyAppointments: 3,
  maxWeeklyAppointments: 10,
  slots: [
    { date: "2024-08-20T12:00:00.000Z", length: 90 },
    { date: "2024-08-20T12:15:00.000Z", length: 90 },
    { date: "2024-08-20T12:30:00.000Z", length: 90 },
    { date: "2024-08-20T12:45:00.000Z", length: 90 },
    { date: "2024-08-20T13:00:00.000Z", length: 90 },
    { date: "2024-08-20T13:15:00.000Z", length: 90 },
    { date: "2024-08-20T13:30:00.000Z", length: 90 },
    { date: "2024-08-22T14:00:00.000Z", length: 90 },
    { date: "2024-08-22T14:30:00.000Z", length: 90 },
    { date: "2024-08-22T15:30:00.000Z", length: 90 },
    { date: "2024-08-23T12:00:00.000Z", length: 90 },
  ],
});

/**
 * Eligible for patient2 (MD + United). Small, data set where 
 * Task 2 removes single-day slots that would cost an appointment. 
 * 
 * Expected kept slots from Task 2 optimization: 
 *  12:00, 12:15, 12:30
 *  13:30, 13:45, 14:00
 */
export const ronWeasley: Clinician = buildClinician({
  id: "clinician-ron-weasley",
  firstName: "Ron",
  lastName: "Weasley",
  states: ["MD", "IL"],
  insurances: ["UNITED"],
  clinicianType: "PSYCHOLOGIST",
  maxDailyAppointments: 4,
  maxWeeklyAppointments: 12,
  slots: [
    { date: "2024-08-20T12:00:00.000Z", length: 90 },
    { date: "2024-08-20T12:15:00.000Z", length: 90 },
    { date: "2024-08-20T12:30:00.000Z", length: 90 },
    { date: "2024-08-20T12:45:00.000Z", length: 90 },
    { date: "2024-08-20T13:00:00.000Z", length: 90 },
    { date: "2024-08-20T13:15:00.000Z", length: 90 },
    { date: "2024-08-20T13:30:00.000Z", length: 90 },
    { date: "2024-08-20T13:45:00.000Z", length: 90 },
    { date: "2024-08-20T14:00:00.000Z", length: 90 },
    { date: "2024-08-22T15:00:00.000Z", length: 90 },
  ],
});

/**
 * Eligible for patient2 (MD + United). Larger, single-day data set where 
 * Task 2 removes slots that would cost an appointment. 
 * 
 * Expected kept slots from Task 2 optimization: 
 *  12:00, 12:15, 12:30
 *  13:30, 13:45, 14:00 
 *  15:00, 15:15, 15:30
 *  21:00
 *  22:30 
 */
export const percyJackson: Clinician = buildClinician({
  id: "clinician-percy-jackson",
  firstName: "Percy",
  lastName: "Jackson",
  states: ["FL", "MD"],
  insurances: ["UNITED", "CIGNA"],
  clinicianType: "PSYCHOLOGIST",
  maxDailyAppointments: 3,
  maxWeeklyAppointments: 10,
  slots: [
    { date: "2024-09-02T12:00:00.000Z", length: 90 },
    { date: "2024-09-02T12:15:00.000Z", length: 90 },
    { date: "2024-09-02T12:30:00.000Z", length: 90 },
    { date: "2024-09-02T12:45:00.000Z", length: 90 },
    { date: "2024-09-02T13:00:00.000Z", length: 90 },
    { date: "2024-09-02T13:15:00.000Z", length: 90 },
    { date: "2024-09-02T13:30:00.000Z", length: 90 },
    { date: "2024-09-02T13:45:00.000Z", length: 90 },
    { date: "2024-09-02T14:00:00.000Z", length: 90 },
    { date: "2024-09-02T14:15:00.000Z", length: 90 },
    { date: "2024-09-02T14:30:00.000Z", length: 90 },
    { date: "2024-09-02T14:45:00.000Z", length: 90 },
    { date: "2024-09-02T15:00:00.000Z", length: 90 },
    { date: "2024-09-02T15:15:00.000Z", length: 90 },
    { date: "2024-09-02T15:30:00.000Z", length: 90 },
    { date: "2024-09-02T21:00:00.000Z", length: 90 },
    { date: "2024-09-02T21:15:00.000Z", length: 90 },
    { date: "2024-09-02T21:30:00.000Z", length: 90 },
    { date: "2024-09-02T21:45:00.000Z", length: 90 },
    { date: "2024-09-02T22:00:00.000Z", length: 90 },
    { date: "2024-09-02T22:15:00.000Z", length: 90 },
    { date: "2024-09-02T22:30:00.000Z", length: 90 },
    { date: "2024-09-03T15:00:00.000Z", length: 90 },
  ],
});

/** Eligible for Byrne (NY + Aetna). */
export const alexRivera: Clinician = buildClinician({
  id: "clinician-alex-rivera",
  firstName: "Alex",
  lastName: "Rivera",
  states: ["NY", "NJ"],
  insurances: ["AETNA", "BCBS"],
  clinicianType: "PSYCHOLOGIST",
  maxDailyAppointments: 3,
  maxWeeklyAppointments: 10,
  slots: [
    { date: "2024-08-20T14:00:00.000Z", length: 90 },
    { date: "2024-08-22T16:00:00.000Z", length: 90 },
    { date: "2024-08-27T14:00:00.000Z", length: 90 },
  ],
});

/** Excluded for Byrne: accepts Aetna but doesn't operate in NY. */
export const samPatel: Clinician = buildClinician({
  id: "clinician-sam-patel",
  firstName: "Sam",
  lastName: "Patel",
  states: ["CA"],
  insurances: ["AETNA"],
  clinicianType: "PSYCHOLOGIST",
  maxDailyAppointments: 2,
  maxWeeklyAppointments: 8,
  slots: [
    { date: "2024-08-20T16:00:00.000Z", length: 90 },
    { date: "2024-08-22T16:00:00.000Z", length: 90 },
  ],
});

/** Excluded for Byrne: operates in NY but doesn't accept Aetna. */
export const morganLee: Clinician = buildClinician({
  id: "clinician-morgan-lee",
  firstName: "Morgan",
  lastName: "Lee",
  states: ["NY"],
  insurances: ["BCBS"],
  clinicianType: "PSYCHOLOGIST",
  maxDailyAppointments: 2,
  maxWeeklyAppointments: 8,
  slots: [
    { date: "2024-08-20T16:00:00.000Z", length: 90 },
    { date: "2024-08-22T16:00:00.000Z", length: 90 },
  ],
});

/** Excluded for assessments: NY + Aetna, but a therapist with 60-minute slots. */
export const taylorKim: Clinician = buildClinician({
  id: "clinician-taylor-kim",
  firstName: "Taylor",
  lastName: "Kim",
  states: ["NY"],
  insurances: ["AETNA"],
  clinicianType: "THERAPIST",
  maxDailyAppointments: 6,
  maxWeeklyAppointments: 25,
  slots: [
    { date: "2024-08-20T16:00:00.000Z", length: 60 },
    { date: "2024-08-22T16:00:00.000Z", length: 60 },
  ],
});

export const MOCK_CLINICIANS: Clinician[] = [
  janeDoe,
  jonSnow,
  aryaStark,
  ronWeasley,
  percyJackson,
  alexRivera,
  samPatel,
  morganLee,
  taylorKim,
];
