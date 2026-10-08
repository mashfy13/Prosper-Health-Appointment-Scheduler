import { AvailableAppointmentSlot } from "../starter-code/appointment";

/**
 * The patient-facing view of a clinician. The full `Clinician` carries every
 * appointment and slot, which shouldn't be exposed when offering times.
 */
export interface ClinicianSummary {
  id: string;
  firstName: string;
  lastName: string;
}

/** One bookable first session plus every second session that can go with it. */
export interface AssessmentOption {
  firstSession: AvailableAppointmentSlot;
  // References the same slot objects as other options (no copies).
  secondSessionOptions: AvailableAppointmentSlot[];
}

export interface ClinicianAssessmentOptions {
  clinician: ClinicianSummary;
  options: AssessmentOption[];
}
