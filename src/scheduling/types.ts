import { AvailableAppointmentSlot } from "../starter-code/appointment";

/**
 * The patient-facing view of a clinician. The full `Clinician` carries every
 * appointment and slot, which isn't necessary when offering times.
 */
export interface ClinicianSummary {
  id: string;
  firstName: string;
  lastName: string;
}

/** One bookable first session plus every second session that can go with it. */
export interface AssessmentOption {
  firstSession: AvailableAppointmentSlot;
  secondSessionOptions: AvailableAppointmentSlot[];
}

export interface ClinicianAssessmentOptions {
  clinician: ClinicianSummary;
  options: AssessmentOption[];
}
