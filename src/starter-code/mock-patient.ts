import { Patient } from "./patient";

export const patient: Patient = {
  id: "some-uuidv4",
  firstName: "Byrne",
  lastName: "Hollander",
  state: "NY",
  insurance: "AETNA",
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const patient2: Patient = {
  id: "patient-2",
  firstName: "Harry",
  lastName: "Potter",
  state: "MD",
  insurance: "UNITED",
  createdAt: new Date(),
  updatedAt: new Date(),
}