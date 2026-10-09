import {
  Appointment,
  AppointmentStatus,
  AppointmentType,
  AvailableAppointmentSlot,
} from "../starter-code/appointment";
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

/** Appointment ids are derived from clinician + start time, like slot ids. */
export function buildAppointment(
  clinicianId: string,
  isoDate: string,
  appointmentType: AppointmentType,
  status: AppointmentStatus = "UPCOMING",
): Appointment {
  return {
    id: `${clinicianId}-appointment-${isoDate}`,
    patientId: "mock-patient",
    clinicianId,
    scheduledFor: new Date(isoDate),
    appointmentType,
    status,
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  };
}

type ClinicianInput = Omit<
  Clinician,
  "availableSlots" | "appointments" | "createdAt" | "updatedAt"
> & {
  slots: { date: string; length: number }[];
  appointments?: {
    date: string;
    type: AppointmentType;
    status?: AppointmentStatus;
  }[];
};

export function buildClinician({
  slots,
  appointments = [],
  ...fields
}: ClinicianInput): Clinician {
  return {
    ...fields,
    appointments: appointments.map((appointment) =>
      buildAppointment(
        fields.id,
        appointment.date,
        appointment.type,
        appointment.status,
      ),
    ),
    availableSlots: slots.map((slot) =>
      buildSlot(fields.id, slot.date, slot.length),
    ),
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  };
}
