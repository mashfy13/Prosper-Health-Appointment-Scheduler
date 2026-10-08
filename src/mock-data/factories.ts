import { AvailableAppointmentSlot } from "../starter-code/appointment";
import { Clinician } from "../starter-code/clinician";

const MOCK_TIMESTAMP = new Date("2024-08-15T14:45:15.462Z");

/** Slot ids are derived from clinician + start time + length, so they're stable and unique. */
export function buildSlot(
  clinicianId: string,
  isoDate: string,
  length: number,
): AvailableAppointmentSlot {
  return {
    id: `${clinicianId}-${isoDate}-${length}`,
    clinicianId,
    date: new Date(isoDate),
    length,
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  };
}

type ClinicianInput = Omit<
  Clinician,
  "availableSlots" | "appointments" | "createdAt" | "updatedAt"
> & {
  slots: { date: string; length: number }[];
};

export function buildClinician({
  slots,
  ...fields
}: ClinicianInput): Clinician {
  return {
    ...fields,
    appointments: [],
    availableSlots: slots.map((slot) =>
      buildSlot(fields.id, slot.date, slot.length),
    ),
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  };
}
