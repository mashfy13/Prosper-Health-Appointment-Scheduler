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
 * */
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
  alexRivera,
  samPatel,
  morganLee,
  taylorKim,
];
