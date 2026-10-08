import { Clinician, ClinicianType } from "../starter-code/clinician";
import { Patient } from "../starter-code/patient";

/**
 * A patient can only book with a clinician of the right type for the service
 * who operates in the patient's state and accepts their insurance.
 *
 * Future work:
 * - Coverage exceptions by state, payer and service (e.g. Cigna therapy isn't
 *   covered in PA/MI) would need a coverage-rules model, not just these lists.
 * - At thousands of clinicians, index clinicians by (state, payer) in memory,
 *   or in a DB query against indexed join tables, instead of scanning everyone.
 */
export function isEligibleClinician(
  clinician: Clinician,
  patient: Patient,
  clinicianType: ClinicianType,
): boolean {
  return (
    clinician.clinicianType === clinicianType &&
    clinician.states.includes(patient.state) &&
    clinician.insurances.includes(patient.insurance)
  );
}
