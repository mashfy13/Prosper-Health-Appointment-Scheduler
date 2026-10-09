import { calendarDaysBetween, utcWeekNumber } from "./dates";

describe("calendarDaysBetween", () => {
  const daysBetween = (from: string, to: string) =>
    calendarDaysBetween(new Date(from), new Date(to));

  it("is 0 for times on the same UTC day", () => {
    expect(daysBetween("2024-08-19T00:00:00Z", "2024-08-19T23:59:59Z")).toBe(0);
  });

  it("counts calendar days, not 24-hour periods", () => {
    expect(daysBetween("2024-08-19T23:00:00Z", "2024-08-20T00:30:00Z")).toBe(1);
    expect(daysBetween("2024-08-21T12:00:00Z", "2024-08-28T12:15:00Z")).toBe(7);
  });

  it("is negative when `to` is before `from`", () => {
    expect(daysBetween("2024-08-21T12:00:00Z", "2024-08-19T12:00:00Z")).toBe(
      -2,
    );
  });
});

describe("utcWeekNumber", () => {
  const week = (iso: string) => utcWeekNumber(new Date(iso));

  it("starts weeks on Monday", () => {
    // 2024-08-18 is a Sunday, 2024-08-19 a Monday.
    expect(week("2024-08-19T00:00:00Z")).toBe(week("2024-08-18T23:59:59Z") + 1);
  });

  it("is the same from Monday through Sunday", () => {
    expect(week("2024-08-25T23:59:59Z")).toBe(week("2024-08-19T00:00:00Z"));
  });
});
