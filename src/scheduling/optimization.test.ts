import { janeDoe, percyJackson, ronWeasley } from "../mock-data/clinicians";
import { buildSlot } from "../mock-data/factories";
import { maximizeAppointmentDates, optimizeSlots } from "./optimization";

const toDates = (isoDates: string[]) => isoDates.map((iso) => new Date(iso));
const toIso = (dates: Date[]) => dates.map((date) => date.toISOString());

/** ISO time on `day` (default 2024-08-19), e.g. at("12:15") → "2024-08-19T12:15:00.000Z". */
const at = (time: string, day = "2024-08-19") => `${day}T${time}:00.000Z`;

const README_DATES = [
  "12:00",
  "12:15",
  "12:30",
  "12:45",
  "13:00",
  "13:15",
  "13:30",
].map((time) => at(time));

/**
 * Reference implementation of Task 2: the earlier, more literal version of the
 * rule. A date is kept if (most that fit before it) + 1 + (most that fit after
 * it) equals the most that fit overall. Quadratic, so it's only used here to
 * check the production algorithm.
 */
function referenceMaximizeAppointmentDates(
  dates: Date[],
  durationMinutes: number,
): Date[] {
  const durationMs = durationMinutes * 60 * 1000;
  const startTimes = dates.map((date) => date.getTime()).sort((a, b) => a - b);
  const countMax = (sortedTimes: number[]) => {
    let count = 0;
    let lastEnd = -Infinity;
    for (const start of sortedTimes) {
      if (start >= lastEnd) {
        count++;
        lastEnd = start + durationMs;
      }
    }
    return count;
  };
  const maxAppointments = countMax(startTimes);

  return dates.filter((date) => {
    const start = date.getTime();
    const fitBefore = countMax(
      startTimes.filter((time) => time + durationMs <= start),
    );
    const fitAfter = countMax(
      startTimes.filter((time) => time >= start + durationMs),
    );
    return fitBefore + 1 + fitAfter === maxAppointments;
  });
}

/** Deterministic pseudo-random numbers in [0, 1), so failures are reproducible. */
function seededRandom(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
}

describe("maximizeAppointmentDates", () => {
  it("keeps only 12:00 and 13:30 for the README example", () => {
    const kept = maximizeAppointmentDates(toDates(README_DATES), 90);

    expect(toIso(kept)).toEqual([at("12:00"), at("13:30")]);
  });

  it("keeps every date that's part of some maximum schedule, not just one", () => {
    // Dr. Doe on 2024-08-19: max is 2, and every slot can be part of a
    // 2-appointment day (e.g. 12:30 + 15:00), so nothing is removed. A single
    // greedy schedule would only show 12:00 and 14:45.
    const dates = [
      "12:00",
      "12:15",
      "12:30",
      "14:45",
      "15:00",
      "15:15",
      "15:30",
    ].map((time) => at(time));

    expect(toIso(maximizeAppointmentDates(toDates(dates), 90))).toEqual(dates);
  });

  it("removes dates that reduce the day's maximum (Dr. Doe on 2024-09-02)", () => {
    const day = "2024-09-02";
    const dates = janeDoe.availableSlots
      .map((slot) => slot.date)
      .filter((date) => date.toISOString().startsWith(day));

    const kept = maximizeAppointmentDates(dates, 90);

    expect(toIso(kept)).toEqual(
      [
        "12:00",
        "12:15",
        "12:30",
        "13:30",
        "13:45",
        "14:00",
        "15:00",
        "15:15",
        "15:30",
        "21:00",
        "22:30",
      ].map((time) => at(time, day)),
    );
  });

  it("treats back-to-back appointments as not overlapping", () => {
    // 12:00 ends exactly when 13:30 starts, so the max is 2 and 12:45
    // (which overlaps both) is removed.
    const dates = [at("12:00"), at("12:45"), at("13:30")];

    expect(toIso(maximizeAppointmentDates(toDates(dates), 90))).toEqual([
      at("12:00"),
      at("13:30"),
    ]);
  });

  it("uses the given duration", () => {
    // At 60 minutes, only 12:45 prevents fitting 2 appointments.
    const kept = maximizeAppointmentDates(toDates(README_DATES), 60);

    expect(toIso(kept)).toEqual(
      README_DATES.filter((date) => date !== at("12:45")),
    );
  });

  it("returns kept dates in input order when input is unsorted", () => {
    const dates = [at("13:30"), at("12:15"), at("12:00")];

    expect(toIso(maximizeAppointmentDates(toDates(dates), 90))).toEqual([
      at("13:30"),
      at("12:00"),
    ]);
  });

  it("handles empty and single-date input", () => {
    expect(maximizeAppointmentDates([], 90)).toEqual([]);
    expect(toIso(maximizeAppointmentDates(toDates([at("12:00")]), 90))).toEqual(
      [at("12:00")],
    );
  });
});

describe("maximizeAppointmentDates matches the reference implementation", () => {
  it("on every day of Dr. Doe's real slots", () => {
    const datesByDay = new Map<string, Date[]>();
    for (const slot of janeDoe.availableSlots) {
      const day = slot.date.toISOString().slice(0, 10);
      datesByDay.set(day, [...(datesByDay.get(day) ?? []), slot.date]);
    }

    for (const dates of datesByDay.values()) {
      expect(maximizeAppointmentDates(dates, 90)).toEqual(
        referenceMaximizeAppointmentDates(dates, 90),
      );
    }
  });

  it("on 500 random days", () => {
    const random = seededRandom(42);
    const dayStart = new Date("2024-08-19T08:00:00.000Z").getTime();

    for (let run = 0; run < 500; run++) {
      // Up to 25 distinct slots on a 15-minute grid between 08:00 and 21:45.
      const times = new Set<number>();
      const count = 1 + Math.floor(random() * 25);
      for (let i = 0; i < count; i++) {
        times.add(dayStart + Math.floor(random() * 56) * 15 * 60 * 1000);
      }
      const dates = [...times].map((time) => new Date(time));
      const duration = random() < 0.5 ? 60 : 90;

      expect(maximizeAppointmentDates(dates, duration)).toEqual(
        referenceMaximizeAppointmentDates(dates, duration),
      );
    }
  });
});

describe("optimizeSlots", () => {
  const keptTimes = (slots: { date: Date }[]) =>
    slots.map((slot) => slot.date.toISOString());

  it("Ron Weasley: keeps the 3 overlapping 2-appointment schedules on 08-20", () => {
    // 12:00–14:00 every 15 minutes: 12:00/13:30, 12:15/13:45 and 12:30/14:00
    // all fit 2 appointments; 12:45, 13:00 and 13:15 leave room for only 1.
    const kept = optimizeSlots(ronWeasley.availableSlots, 90);

    expect(keptTimes(kept)).toEqual([
      ...["12:00", "12:15", "12:30", "13:30", "13:45", "14:00"].map((time) =>
        at(time, "2024-08-20"),
      ),
      at("15:00", "2024-08-22"),
    ]);
  });

  it("Percy Jackson: keeps 11 of 22 slots on a full day (09-02)", () => {
    const kept = optimizeSlots(percyJackson.availableSlots, 90);

    expect(keptTimes(kept)).toEqual([
      ...[
        "12:00",
        "12:15",
        "12:30",
        "13:30",
        "13:45",
        "14:00",
        "15:00",
        "15:15",
        "15:30",
        "21:00",
        "22:30",
      ].map((time) => at(time, "2024-09-02")),
      at("15:00", "2024-09-03"),
    ]);
  });

  it("optimizes each day independently and returns the same slot objects", () => {
    const slots = [
      ...README_DATES,
      ...README_DATES.map((date) => date.replace("2024-08-19", "2024-08-20")),
    ].map((date) => buildSlot("c", date, 90));

    const kept = optimizeSlots(slots, 90);

    expect(kept.map((slot) => slot.date.toISOString())).toEqual([
      at("12:00"),
      at("13:30"),
      at("12:00", "2024-08-20"),
      at("13:30", "2024-08-20"),
    ]);
    kept.forEach((slot) => expect(slots).toContain(slot));
  });
});
