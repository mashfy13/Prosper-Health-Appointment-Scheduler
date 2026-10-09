import {
  buildAppointment,
  buildClinician,
  buildSlot,
} from "../mock-data/factories";
import {
  AppointmentStatus,
  AppointmentType,
} from "../starter-code/appointment";
import { getRemainingCapacity, removeConflictingSlots } from "./capacity";

const appointment = (
  isoDate: string,
  status: AppointmentStatus = "UPCOMING",
  type: AppointmentType = "ASSESSMENT_SESSION_1",
) => buildAppointment("c", isoDate, type, status);

function psychologistWith(
  appointments: { date: string; status?: AppointmentStatus }[],
) {
  return buildClinician({
    id: "c",
    firstName: "Test",
    lastName: "Psychologist",
    states: ["NY"],
    insurances: ["AETNA"],
    clinicianType: "PSYCHOLOGIST",
    maxDailyAppointments: 2,
    maxWeeklyAppointments: 3,
    slots: [],
    appointments: appointments.map((appointment) => ({
      ...appointment,
      type: "ASSESSMENT_SESSION_1",
    })),
  });
}

describe("getRemainingCapacity", () => {
  // Week of Mon 2024-08-19 – Sun 2024-08-25.
  const wednesday = new Date("2024-08-21T12:00:00.000Z");

  it("subtracts counted appointments per day and per Monday–Sunday week", () => {
    const capacity = getRemainingCapacity(
      psychologistWith([
        { date: "2024-08-19T09:00:00.000Z", status: "OCCURRED" },
        { date: "2024-08-21T09:00:00.000Z", status: "UPCOMING" },
        { date: "2024-08-18T09:00:00.000Z", status: "UPCOMING" }, // prior week
      ]),
    );

    expect(capacity.onDay(wednesday)).toBe(1);
    expect(capacity.inWeek(wednesday)).toBe(1);
  });

  it("counts NO_SHOW and LATE_CANCELLATION, but not CANCELLED or RE_SCHEDULED", () => {
    const capacity = getRemainingCapacity(
      psychologistWith([
        { date: "2024-08-21T08:00:00.000Z", status: "NO_SHOW" },
        { date: "2024-08-21T10:00:00.000Z", status: "CANCELLED" },
        { date: "2024-08-21T14:00:00.000Z", status: "RE_SCHEDULED" },
        { date: "2024-08-21T16:00:00.000Z", status: "LATE_CANCELLATION" },
      ]),
    );

    expect(capacity.onDay(wednesday)).toBe(0);
    expect(capacity.inWeek(wednesday)).toBe(1);
  });

  it("never goes below 0 when a clinician is already over a cap", () => {
    const capacity = getRemainingCapacity(
      psychologistWith(
        ["08:00", "10:00", "14:00", "16:00"].map((time) => ({
          date: `2024-08-21T${time}:00.000Z`,
        })),
      ),
    );

    expect(capacity.onDay(wednesday)).toBe(0);
    expect(capacity.inWeek(wednesday)).toBe(0);
  });
});

describe("remainingOn and hasRoomForBoth", () => {
  // Daily cap 2, weekly cap 3. One appointment on Mon 08-19 and one on Wed 08-21.
  const capacity = getRemainingCapacity(
    psychologistWith([
      { date: "2024-08-19T09:00:00.000Z" },
      { date: "2024-08-21T09:00:00.000Z" },
    ]),
  );

  it("remainingOn is the smaller of the day's and week's remaining capacity", () => {
    // Tuesday: 2 left that day, but only 1 left that week.
    expect(capacity.remainingOn(new Date("2024-08-20T12:00:00.000Z"))).toBe(1);
  });

  it("hasRoomForBoth needs 2 left when both dates are in the same week", () => {
    const tuesday = new Date("2024-08-20T12:00:00.000Z");
    const thursday = new Date("2024-08-22T12:00:00.000Z");
    const nextMonday = new Date("2024-08-26T12:00:00.000Z");

    expect(capacity.hasRoomForBoth(tuesday, thursday)).toBe(false);
    expect(capacity.hasRoomForBoth(tuesday, nextMonday)).toBe(true);
  });
});

describe("removeConflictingSlots", () => {
  const slotsAt = (times: string[]) =>
    times.map((time) => buildSlot("c", `2024-08-21T${time}:00.000Z`, 90));
  const times = (slots: { date: Date }[]) =>
    slots.map((slot) => slot.date.toISOString().slice(11, 16));

  it("removes slots that overlap an appointment, but not back-to-back ones", () => {
    // Appointment 12:00–13:30.
    const slots = slotsAt(["10:30", "11:00", "13:00", "13:30"]);

    expect(
      times(
        removeConflictingSlots(slots, [
          appointment("2024-08-21T12:00:00.000Z"),
        ]),
      ),
    ).toEqual(["10:30", "13:30"]);
  });

  it("uses the appointment type's duration", () => {
    // A 60-minute therapy appointment ends at 13:00; a 90-minute one at 13:30.
    const slots = slotsAt(["13:00"]);
    const at12 = "2024-08-21T12:00:00.000Z";

    expect(
      removeConflictingSlots(slots, [
        appointment(at12, "UPCOMING", "THERAPY_SIXTY_MINS"),
      ]),
    ).toEqual(slots);
    expect(removeConflictingSlots(slots, [appointment(at12)])).toEqual([]);
  });

  it("ignores cancelled and rescheduled appointments", () => {
    const slots = slotsAt(["12:00"]);

    expect(
      removeConflictingSlots(slots, [
        appointment("2024-08-21T12:00:00.000Z", "CANCELLED"),
        appointment("2024-08-21T12:00:00.000Z", "RE_SCHEDULED"),
      ]),
    ).toEqual(slots);
  });
});
