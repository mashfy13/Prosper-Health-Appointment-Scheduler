import { MOCK_CLINICIANS } from "./mock-data/clinicians";
import { findAssessmentOptions } from "./scheduling/assessments";
import { patient as patient } from "./starter-code/mock-patient";
// import { patient2 as patient } from "./starter-code/mock-patient";

/** Switch between the import mock-patient statements above to change the patient */

/** 
 * findAssessmentOptions() supports an optional `now` so we can simulate a 
 * current date in the past for testing purposes. 
 * 
 * `now` defaults to the current date `new Date()` 
*/
const NOW = new Date("2024-08-19T00:00:00.000Z");
const SAMPLE_SIZE = 3;

const results = findAssessmentOptions(patient, MOCK_CLINICIANS, NOW);

console.log(
  `Assessment options for ${patient.firstName} ${patient.lastName} ` +
    `(${patient.state}, ${patient.insurance}) as of ${NOW.toISOString()}\n`,
);

for (const { clinician, options } of results) {
  const pairCount = options.reduce(
    (total, option) => total + option.secondSessionOptions.length,
    0,
  );
  console.log(
    `${clinician.firstName} ${clinician.lastName}: ` +
      `${options.length} first-session options, ${pairCount} session pairs`,
  );
  console.log();

  // Limits the response to SAMPLE_SIZE first assessment sessions and SAMPLE_SIZE second assessment sessions
  for (const { firstSession, secondSessionOptions } of options.slice(
    0,
    SAMPLE_SIZE,
  )) {
    const secondSessions = secondSessionOptions
      .slice(0, SAMPLE_SIZE)
      .map((slot) => slot.date.toISOString())
      .join(", ");
    const more =
      secondSessionOptions.length > SAMPLE_SIZE
        ? `, … +${secondSessionOptions.length - SAMPLE_SIZE} more`
        : "";
    console.log(`${firstSession.date.toISOString()} → ${secondSessions}${more}`);
  }
  console.log();

  for (const { firstSession, secondSessionOptions } of options) {
    const secondSessions = secondSessionOptions
      .map((slot) => slot.date.toISOString())
      .join(", ")
    console.log(`${firstSession.date.toISOString()} → ${secondSessions}`)
  }
  console.log();
}
