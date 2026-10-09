import { MOCK_CLINICIANS } from "./mock-data/clinicians";
import {
  findAssessmentOptions,
  findOptimizedAssessmentOptions,
} from "./scheduling/assessments";
import {
  AssessmentOption,
  ClinicianAssessmentOptions,
} from "./scheduling/types";
// import { patient as patient } from "./starter-code/mock-patient";
import { patient2 as patient } from "./starter-code/mock-patient";

/** Switch between the import mock-patient statements above to change the patient */

/** 
 * findAssessmentOptions() supports an optional `now` so we can simulate a 
 * current date in the past for testing purposes. 
 * 
 * `now` defaults to the current date `new Date()` 
*/
const NOW = new Date("2024-08-19T00:00:00.000Z");

const task1Results = findAssessmentOptions(patient, MOCK_CLINICIANS, NOW);
const task2Results = findOptimizedAssessmentOptions(
  patient,
  MOCK_CLINICIANS,
  NOW,
);

const countPairs = (options: AssessmentOption[]) =>
  options.reduce(
    (total, option) => total + option.secondSessionOptions.length,
    0,
  );

/** Prints a task's header, then each clinician's counts and full option list. */
function printResults(title: string, results: ClinicianAssessmentOptions[]) {
  console.log(`=== ${title} ===\n`);

  for (const { clinician, options } of results) {
    console.log(
      `${clinician.firstName} ${clinician.lastName}: ` +
        `${options.length} first-session options, ` +
        `${countPairs(options)} session pairs\n`,
    );

    for (const { firstSession, secondSessionOptions } of options) {
      const secondSessions = secondSessionOptions
        .map((slot) => slot.date.toISOString())
        .join(", ");
      console.log(`${firstSession.date.toISOString()} → ${secondSessions}`);
    }
    console.log();
  }
}

console.log(
  `Assessment options for ${patient.firstName} ${patient.lastName} ` +
    `(${patient.state}, ${patient.insurance}) as of ${NOW.toISOString()}\n`,
);

printResults("Task 1: All assessment options", task1Results);
printResults("Task 2: Optimized assessment options", task2Results);
