import { MOCK_CLINICIANS } from "./mock-data/clinicians";
import { findAssessmentOptions } from "./scheduling/assessments";
import { patient } from "./starter-code/mock-patient";

// The mock data is from 2024, so use a fixed "now" just before the first slot.
// A real caller would pass `new Date()`.
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

  for (const { firstSession, secondSessionOptions } of options.slice(
    0,
    SAMPLE_SIZE,
  )) {
    const seconds = secondSessionOptions
      .slice(0, SAMPLE_SIZE)
      .map((slot) => slot.date.toISOString())
      .join(", ");
    const more =
      secondSessionOptions.length > SAMPLE_SIZE
        ? `, … +${secondSessionOptions.length - SAMPLE_SIZE} more`
        : "";
    console.log(`  ${firstSession.date.toISOString()} → ${seconds}${more}`);
  }
  console.log();
}
