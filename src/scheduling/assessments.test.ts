import { buildClinician, buildSlot } from "../mock-data/factories";
import { MOCK_CLINICIANS, janeDoe } from "../mock-data/clinicians";
import { patient } from "../starter-code/mock-patient";
import { Clinician } from "../starter-code/clinician";
import {
  buildAssessmentOptions,
  findAssessmentOptions,
  getCandidateSlots,
  isValidSessionGap,
} from "./assessments";
import { AssessmentOption } from "./types";

const NOW = new Date("2024-08-19T00:00:00.000Z");

/** Flattens options into the README's (session 1, session 2) tuple format. */
function toPairs(options: AssessmentOption[]): [string, string][] {
  return options.flatMap(({ firstSession, secondSessionOptions }) =>
    secondSessionOptions.map((second): [string, string] => [
      firstSession.date.toISOString(),
      second.date.toISOString(),
    ]),
  );
}

function psychologistWithSlots(dates: string[], length = 90): Clinician {
  return buildClinician({
    id: "test-psychologist",
    firstName: "Test",
    lastName: "Psychologist",
    states: ["NY"],
    insurances: ["AETNA"],
    clinicianType: "PSYCHOLOGIST",
    maxDailyAppointments: 2,
    maxWeeklyAppointments: 8,
    slots: dates.map((date) => ({ date, length })),
  });
}

describe("findAssessmentOptions", () => {
  it("returns the README's expected pairs for Dr. Doe's 6 example slots", () => {
    const doeWithExampleSlots: Clinician = {
      ...janeDoe,
      availableSlots: [
        "2024-08-19T12:00:00.000Z",
        "2024-08-19T12:15:00.000Z",
        "2024-08-21T12:00:00.000Z",
        "2024-08-21T15:00:00.000Z",
        "2024-08-22T15:00:00.000Z",
        "2024-08-28T12:15:00.000Z",
      ].map((date) => buildSlot(janeDoe.id, date, 90)),
    };

    const [result] = findAssessmentOptions(patient, [doeWithExampleSlots], NOW);

    expect(result.clinician).toEqual({
      id: janeDoe.id,
      firstName: "Jane",
      lastName: "Doe",
    });
    expect(toPairs(result.options)).toEqual([
      ["2024-08-19T12:00:00.000Z", "2024-08-21T12:00:00.000Z"],
      ["2024-08-19T12:00:00.000Z", "2024-08-21T15:00:00.000Z"],
      ["2024-08-19T12:00:00.000Z", "2024-08-22T15:00:00.000Z"],
      ["2024-08-19T12:15:00.000Z", "2024-08-21T12:00:00.000Z"],
      ["2024-08-19T12:15:00.000Z", "2024-08-21T15:00:00.000Z"],
      ["2024-08-19T12:15:00.000Z", "2024-08-22T15:00:00.000Z"],
      ["2024-08-21T12:00:00.000Z", "2024-08-22T15:00:00.000Z"],
      ["2024-08-21T12:00:00.000Z", "2024-08-28T12:15:00.000Z"],
      ["2024-08-21T15:00:00.000Z", "2024-08-22T15:00:00.000Z"],
      ["2024-08-21T15:00:00.000Z", "2024-08-28T12:15:00.000Z"],
      ["2024-08-22T15:00:00.000Z", "2024-08-28T12:15:00.000Z"],
    ]);
  });

  it("only includes psychologists in the patient's state who accept their insurance", () => {
    const results = findAssessmentOptions(patient, MOCK_CLINICIANS, NOW);

    // Excluded: Sam Patel (wrong state), Morgan Lee (wrong insurance),
    // Taylor Kim (therapist).
    expect(results.map((result) => result.clinician.id)).toEqual([
      janeDoe.id,
      "clinician-alex-rivera",
    ]);
  });

  it("groups options by clinician", () => {
    const results = findAssessmentOptions(patient, MOCK_CLINICIANS, NOW);
    const alex = results.find(
      (result) => result.clinician.id === "clinician-alex-rivera",
    );

    expect(toPairs(alex!.options)).toEqual([
      ["2024-08-20T14:00:00.000Z", "2024-08-22T16:00:00.000Z"],
      ["2024-08-20T14:00:00.000Z", "2024-08-27T14:00:00.000Z"],
      ["2024-08-22T16:00:00.000Z", "2024-08-27T14:00:00.000Z"],
    ]);
  });

  it("omits clinicians who have no valid pairs", () => {
    const sameDayOnly = psychologistWithSlots([
      "2024-08-20T12:00:00.000Z",
      "2024-08-20T15:00:00.000Z",
    ]);

    expect(findAssessmentOptions(patient, [sameDayOnly], NOW)).toEqual([]);
  });
});

describe("getCandidateSlots", () => {
  it("excludes slots that start at or before now", () => {
    const clinician = psychologistWithSlots([
      "2024-08-18T12:00:00.000Z",
      "2024-08-19T00:00:00.000Z",
      "2024-08-19T12:00:00.000Z",
    ]);

    const dates = getCandidateSlots(clinician, 90, NOW).map((slot) =>
      slot.date.toISOString(),
    );
    expect(dates).toEqual(["2024-08-19T12:00:00.000Z"]);
  });

  it("excludes slots whose length doesn't match the session length", () => {
    const clinician = psychologistWithSlots(["2024-08-20T12:00:00.000Z"], 60);

    expect(getCandidateSlots(clinician, 90, NOW)).toEqual([]);
  });

  it("sorts slots by start time", () => {
    const clinician = psychologistWithSlots([
      "2024-08-22T12:00:00.000Z",
      "2024-08-20T12:00:00.000Z",
      "2024-08-21T12:00:00.000Z",
    ]);

    const dates = getCandidateSlots(clinician, 90, NOW).map((slot) =>
      slot.date.toISOString(),
    );
    expect(dates).toEqual([
      "2024-08-20T12:00:00.000Z",
      "2024-08-21T12:00:00.000Z",
      "2024-08-22T12:00:00.000Z",
    ]);
  });
});

describe("isValidSessionGap", () => {
  const isValid = (first: string, second: string) =>
    isValidSessionGap(buildSlot("c", first, 90), buildSlot("c", second, 90));

  it("rejects sessions on the same day", () => {
    expect(isValid("2024-08-20T12:00:00Z", "2024-08-20T15:00:00Z")).toBe(false);
  });

  it("accepts sessions on consecutive days, even across UTC midnight", () => {
    expect(isValid("2024-08-20T23:00:00Z", "2024-08-21T00:30:00Z")).toBe(true);
  });

  it("accepts sessions 7 calendar days apart, even if more than 168 hours", () => {
    expect(isValid("2024-08-21T12:00:00Z", "2024-08-28T12:15:00Z")).toBe(true);
  });

  it("rejects sessions 8 calendar days apart", () => {
    expect(isValid("2024-08-21T12:00:00Z", "2024-08-29T09:00:00Z")).toBe(false);
  });

  it("rejects a second session before the first", () => {
    expect(isValid("2024-08-22T12:00:00Z", "2024-08-21T12:00:00Z")).toBe(false);
  });
});

describe("buildAssessmentOptions", () => {
  it("drops first sessions with no valid second session", () => {
    const slots = ["2024-08-20T12:00:00.000Z", "2024-08-21T12:00:00.000Z"].map(
      (date) => buildSlot("c", date, 90),
    );

    const options = buildAssessmentOptions(slots);

    expect(options).toHaveLength(1);
    expect(options[0].firstSession).toBe(slots[0]);
    expect(options[0].secondSessionOptions).toEqual([slots[1]]);
  });

  it("uses a custom pair rule when given one", () => {
    const slots = ["2024-08-20T12:00:00.000Z", "2024-08-21T12:00:00.000Z"].map(
      (date) => buildSlot("c", date, 90),
    );

    expect(buildAssessmentOptions(slots, () => false)).toEqual([]);
  });
});
