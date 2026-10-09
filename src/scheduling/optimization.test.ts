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

  it("keeps or removes slots with the same start time together", () => {
    // e.g. duplicate records: both 12:00s are kept, both 12:45s removed.
    const slots = [
      at("12:00"),
      at("12:00"),
      at("12:45"),
      at("12:45"),
      at("13:30"),
    ].map((date) => buildSlot("c", date, 90));

    const kept = optimizeSlots(slots, 90);

    expect(kept).toEqual([slots[0], slots[1], slots[4]]);
    expect(kept[0]).not.toBe(kept[1]);
  });
});
