import { buildClinician, buildSlot } from "../mock-data/factories";
import {
  MOCK_CLINICIANS,
  aryaStark,
  jeanGrey,
  janeDoe,
  jonSnow,
  peterParker,
  percyJackson,
  ronWeasley,
} from "../mock-data/clinicians";
import { patient, patient2 } from "../starter-code/mock-patient";
import { Clinician } from "../starter-code/clinician";
import {
  buildAssessmentOptions,
  findAssessmentOptions,
  findAvailableAssessmentOptions,
  findOptimizedAssessmentOptions,
  isValidSessionGap,
} from "./assessments";
import { AssessmentOption, ClinicianAssessmentOptions } from "./types";

const NOW = new Date("2024-08-19T00:00:00.000Z");

/** Flattens options into the instruction doc's (session 1, session 2) tuple format. */
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
  it("returns the instructions' expected pairs for Dr. Doe's 6 example slots", () => {
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

describe("findOptimizedAssessmentOptions", () => {
  const offeredDates = (options: AssessmentOption[]) =>
    new Set(toPairs(options).flatMap(([first, second]) => [first, second]));

  it("offers fewer first sessions than Task 1 for Ron Weasley and Percy Jackson", () => {
    const firstSessionCounts = (results: ClinicianAssessmentOptions[]) =>
      results.map(({ clinician, options }) => [clinician.id, options.length]);
    const clinicians = [ronWeasley, percyJackson];

    // Every first session pairs with the clinician's single slot on a later
    // day, so the counts are exactly the slots kept on the optimized day.
    expect(
      firstSessionCounts(findAssessmentOptions(patient2, clinicians, NOW)),
    ).toEqual([
      [ronWeasley.id, 9],
      [percyJackson.id, 22],
    ]);
    expect(
      firstSessionCounts(
        findOptimizedAssessmentOptions(patient2, clinicians, NOW),
      ),
    ).toEqual([
      [ronWeasley.id, 6],
      [percyJackson.id, 11],
    ]);
  });

  it("returns the same clinicians as Task 1", () => {
    const ids = (results: { clinician: { id: string } }[]) =>
      results.map((result) => result.clinician.id);

    expect(
      ids(findOptimizedAssessmentOptions(patient, MOCK_CLINICIANS, NOW)),
    ).toEqual(ids(findAssessmentOptions(patient, MOCK_CLINICIANS, NOW)));
  });

  it("only offers slots that don't reduce a day's maximum", () => {
    const [doe] = findOptimizedAssessmentOptions(patient, [janeDoe], NOW);
    const offered = offeredDates(doe.options);

    // On 2024-09-02, 12:45 and 21:15 each cost Dr. Doe an appointment.
    expect(offered.has("2024-09-02T12:30:00.000Z")).toBe(true);
    expect(offered.has("2024-09-02T12:45:00.000Z")).toBe(false);
    expect(offered.has("2024-09-02T21:15:00.000Z")).toBe(false);
  });

  it("offers a subset of Task 1's pairs", () => {
    const [task1] = findAssessmentOptions(patient, [janeDoe], NOW);
    const [task2] = findOptimizedAssessmentOptions(patient, [janeDoe], NOW);
    const task1Pairs = new Set(
      toPairs(task1.options).map((pair) => pair.join()),
    );
    const task2Pairs = toPairs(task2.options);

    expect(task2Pairs.length).toBeLessThan(task1Pairs.size);
    task2Pairs.forEach((pair) =>
      expect(task1Pairs.has(pair.join())).toBe(true),
    );
  });
});

describe("findAvailableAssessmentOptions", () => {
  /** Psychologist for Byrne (NY + Aetna) with 90-minute slots and session 1 appointments. */
  function bookedPsychologist({
    slots,
    appointments = [],
    maxDaily = 2,
    maxWeekly = 8,
  }: {
    slots: string[];
    appointments?: string[];
    maxDaily?: number;
    maxWeekly?: number;
  }): Clinician {
    return buildClinician({
      id: "booked-psychologist",
      firstName: "Booked",
      lastName: "Psychologist",
      states: ["NY"],
      insurances: ["AETNA"],
      clinicianType: "PSYCHOLOGIST",
      maxDailyAppointments: maxDaily,
      maxWeeklyAppointments: maxWeekly,
      slots: slots.map((date) => ({ date, length: 90 })),
      appointments: appointments.map((date) => ({
        date,
        type: "ASSESSMENT_SESSION_1",
      })),
    });
  }
  const pairsFor = (clinician: Clinician) =>
    findAvailableAssessmentOptions(patient, [clinician], NOW).flatMap(
      (result) => toPairs(result.options),
    );

  it("removes slots on a day that's at its daily cap", () => {
    const clinician = bookedPsychologist({
      slots: [
        "2024-08-20T12:00:00.000Z",
        "2024-08-21T12:00:00.000Z",
        "2024-08-22T12:00:00.000Z",
      ],
      appointments: ["2024-08-21T08:00:00.000Z", "2024-08-21T15:00:00.000Z"],
    });

    expect(pairsFor(clinician)).toEqual([
      ["2024-08-20T12:00:00.000Z", "2024-08-22T12:00:00.000Z"],
    ]);
  });

  it("removes slots in a week that's at its weekly cap", () => {
    // Week of 08-19 is full; 08-26 and 08-27 are in the next week.
    const clinician = bookedPsychologist({
      slots: [
        "2024-08-23T12:00:00.000Z",
        "2024-08-26T12:00:00.000Z",
        "2024-08-27T12:00:00.000Z",
      ],
      appointments: ["2024-08-19T12:00:00.000Z", "2024-08-20T12:00:00.000Z"],
      maxWeekly: 2,
    });

    expect(pairsFor(clinician)).toEqual([
      ["2024-08-26T12:00:00.000Z", "2024-08-27T12:00:00.000Z"],
    ]);
  });

  it("only pairs sessions in the same week if that week has 2 left", () => {
    const slots = [
      "2024-08-20T12:00:00.000Z",
      "2024-08-21T12:00:00.000Z",
      "2024-08-26T12:00:00.000Z",
    ];
    const withWeekLeft = (maxWeekly: number) =>
      bookedPsychologist({
        slots,
        appointments: ["2024-08-19T12:00:00.000Z"],
        maxWeekly,
      });

    // 1 left: only pairs across weeks.
    expect(pairsFor(withWeekLeft(2))).toEqual([
      ["2024-08-20T12:00:00.000Z", "2024-08-26T12:00:00.000Z"],
      ["2024-08-21T12:00:00.000Z", "2024-08-26T12:00:00.000Z"],
    ]);
    // 2 left: the same-week pair is allowed too.
    expect(pairsFor(withWeekLeft(3))).toEqual([
      ["2024-08-20T12:00:00.000Z", "2024-08-21T12:00:00.000Z"],
      ["2024-08-20T12:00:00.000Z", "2024-08-26T12:00:00.000Z"],
      ["2024-08-21T12:00:00.000Z", "2024-08-26T12:00:00.000Z"],
    ]);
  });

  it("offers Dr. Doe's 09-02 12:45 and 21:15, since her daily cap is 2", () => {
    const [doe] = findAvailableAssessmentOptions(patient, [janeDoe], NOW);
    const firstSessions = new Set(
      doe.options.map((option) => option.firstSession.date.toISOString()),
    );

    expect(firstSessions.has("2024-09-02T12:45:00.000Z")).toBe(true);
    expect(firstSessions.has("2024-09-02T21:15:00.000Z")).toBe(true);
  });

  describe("patient2's clinicians", () => {
    const resultFor = (clinician: Clinician) =>
      findAvailableAssessmentOptions(patient2, [clinician], NOW).flatMap(
        (result) => toPairs(result.options),
      );

    it("Jon Snow: weekly cap leaves only pairs into the next week", () => {
      expect(resultFor(jonSnow)).toEqual([
        ["2024-08-21T12:00:00.000Z", "2024-08-28T12:15:00.000Z"],
        ["2024-08-21T15:00:00.000Z", "2024-08-28T12:15:00.000Z"],
        ["2024-08-22T15:00:00.000Z", "2024-08-28T12:15:00.000Z"],
      ]);
    });

    it("Arya Stark: conflicts remove 08-22; back-to-back and rescheduled don't", () => {
      expect(resultFor(aryaStark)).toEqual([
        ["2024-08-20T12:00:00.000Z", "2024-08-23T12:00:00.000Z"],
        ["2024-08-20T13:30:00.000Z", "2024-08-23T12:00:00.000Z"],
      ]);
    });

    it("Ron Weasley and Percy Jackson: daily caps keep every slot", () => {
      const firstSessionCounts = findAvailableAssessmentOptions(
        patient2,
        [ronWeasley, percyJackson],
        NOW,
      ).map(({ clinician, options }) => [clinician.id, options.length]);

      // Task 2 offered 6 and 11.
      expect(firstSessionCounts).toEqual([
        [ronWeasley.id, 9],
        [percyJackson.id, 22],
      ]);
    });
  });

  it("Jean Grey: a fully booked day's slots are removed", () => {
    expect(
      findAssessmentOptions(patient2, [jeanGrey], NOW).flatMap(
        (result) => toPairs(result.options),
      ),
    ).toHaveLength(3);
    expect(
      findAvailableAssessmentOptions(patient2, [jeanGrey], NOW).flatMap(
        (result) => toPairs(result.options),
      ),
    ).toEqual([["2024-08-20T12:00:00.000Z", "2024-08-22T12:00:00.000Z"]]);
  });

  it("Peter Parker: a fully booked week's slots are removed", () => {
    expect(
      findAssessmentOptions(patient2, [peterParker], NOW).flatMap(
        (result) => toPairs(result.options),
      ),
    ).toHaveLength(6);
    // The next week has room for both sessions, so same-week pairs are kept.
    expect(
      findAvailableAssessmentOptions(
        patient2,
        [peterParker],
        NOW,
      ).flatMap((result) => toPairs(result.options)),
    ).toEqual([
      ["2024-08-26T12:00:00.000Z", "2024-08-27T12:00:00.000Z"],
      ["2024-08-26T12:00:00.000Z", "2024-08-28T12:00:00.000Z"],
      ["2024-08-27T12:00:00.000Z", "2024-08-28T12:00:00.000Z"],
    ]);
  });

  it("only offers pairs that Task 1 also offers", () => {
    for (const currentPatient of [patient, patient2]) {
      const task1Pairs = new Set(
        findAssessmentOptions(currentPatient, MOCK_CLINICIANS, NOW).flatMap(
          (result) => toPairs(result.options).map((pair) => pair.join()),
        ),
      );
      const task3Pairs = findAvailableAssessmentOptions(
        currentPatient,
        MOCK_CLINICIANS,
        NOW,
      ).flatMap((result) => toPairs(result.options));

      task3Pairs.forEach((pair) =>
        expect(task1Pairs.has(pair.join())).toBe(true),
      );
    }
  });
});

describe("slot filtering (via findAssessmentOptions)", () => {
  const pairsFor = (dates: string[], length = 90) =>
    findAssessmentOptions(
      patient,
      [psychologistWithSlots(dates, length)],
      NOW,
    ).flatMap((result) => toPairs(result.options));

  it("excludes slots that start at or before now", () => {
    expect(
      pairsFor([
        "2024-08-18T12:00:00.000Z",
        "2024-08-19T00:00:00.000Z",
        "2024-08-20T12:00:00.000Z",
        "2024-08-21T12:00:00.000Z",
      ]),
    ).toEqual([["2024-08-20T12:00:00.000Z", "2024-08-21T12:00:00.000Z"]]);
  });

  it("excludes slots whose length doesn't match the session length", () => {
    expect(
      pairsFor(["2024-08-20T12:00:00.000Z", "2024-08-21T12:00:00.000Z"], 60),
    ).toEqual([]);
  });

  it("handles slots that aren't sorted by start time", () => {
    expect(
      pairsFor([
        "2024-08-22T12:00:00.000Z",
        "2024-08-20T12:00:00.000Z",
        "2024-08-21T12:00:00.000Z",
      ]),
    ).toEqual([
      ["2024-08-20T12:00:00.000Z", "2024-08-21T12:00:00.000Z"],
      ["2024-08-20T12:00:00.000Z", "2024-08-22T12:00:00.000Z"],
      ["2024-08-21T12:00:00.000Z", "2024-08-22T12:00:00.000Z"],
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

  it("pairs slots 1 to 7 calendar days apart, including several per day", () => {
    const slots = [
      "2024-08-20T09:00:00.000Z", // first session
      "2024-08-20T15:00:00.000Z", // same day
      "2024-08-21T09:00:00.000Z", // +1 day
      "2024-08-21T15:00:00.000Z", // +1 day
      "2024-08-27T09:00:00.000Z", // +7 days
      "2024-08-27T23:45:00.000Z", // +7 days
      "2024-08-28T00:00:00.000Z", // +8 days
    ].map((date) => buildSlot("c", date, 90));

    const [first] = buildAssessmentOptions(slots);

    expect(first.firstSession).toBe(slots[0]);
    expect(first.secondSessionOptions).toEqual(slots.slice(2, 6));
  });

  it("uses a custom pair rule when given one", () => {
    const slots = ["2024-08-20T12:00:00.000Z", "2024-08-21T12:00:00.000Z"].map(
      (date) => buildSlot("c", date, 90),
    );

    expect(buildAssessmentOptions(slots, () => false)).toEqual([]);
  });
});
