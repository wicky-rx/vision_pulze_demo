import { demoDb } from "./demoDb";

// Centralized API client wrapper.
// Since this is a pure client-side offline demo, this file directly forwards all requests to our localStorage-backed demoDb.
export const api = {
  // Doctor Operations
  async getDoctors() {
    // Return doctor details, with dynamic duty slot injected
    return demoDb.getDoctors();
  },

  async getDoctorSlots() {
    return demoDb.getDoctors();
  },

  async getDoctorSchedules(doctorId: string) {
    return demoDb.getDoctorSchedules(doctorId);
  },

  async addDoctorSchedule(doctorId: string, slot: any) {
    return demoDb.addDoctorSchedule(doctorId, slot);
  },

  async deleteDoctorSchedule(scheduleId: string) {
    return demoDb.deleteDoctorSchedule(scheduleId);
  },

  // Patient Operations
  async checkMobile(mobile: string) {
    return demoDb.checkMobile(mobile);
  },

  async searchPatients(query: string) {
    return demoDb.searchPatients(query);
  },

  async getPatientDetails(mrNumber: string) {
    const details = demoDb.getPatientByMrn(mrNumber);
    if (!details) throw new Error("Patient not found");
    return details;
  },

  async registerPatient(formData: any) {
    return demoDb.registerPatient(formData);
  },

  async updatePatient(mrNumber: string, data: any) {
    return demoDb.updatePatient(mrNumber, data);
  },

  // Queue / Visit Operations
  async getQueue() {
    return demoDb.getQueue();
  },

  async startVisit(mrNumber: string, visitData: any) {
    return demoDb.startVisit(mrNumber, visitData);
  },

  async deleteVisit(visitId: string) {
    return demoDb.deleteVisit(visitId);
  },

  // Appointment Operations
  async createAppointment(appointmentData: any) {
    return demoDb.createAppointment(appointmentData);
  },

  async getDailyAppointments(dateStr: string) {
    return demoDb.getDailyAppointments(dateStr);
  },

  async deleteAppointment(appointmentId: string) {
    return demoDb.deleteAppointment(appointmentId);
  },

  async convertAppointmentToVisit(appointmentId: string) {
    return demoDb.convertAppointmentToVisit(appointmentId);
  },

  // Refraction Operations
  async getRefraction(visitId: string) {
    return demoDb.getRefraction(visitId);
  },

  async saveRefraction(visitId: string, data: any) {
    return demoDb.saveRefraction(visitId, data);
  },

  async advanceToRefraction(visitId: string) {
    return demoDb.advanceToRefraction(visitId);
  },

  // Consultation Operations
  async getConsultation(visitId: string) {
    return demoDb.getConsultation(visitId);
  },

  async saveConsultation(visitId: string, data: any) {
    return demoDb.saveConsultation(visitId, data);
  },

  async attendVisit(visitId: string) {
    return demoDb.attendVisit(visitId);
  },

  async getFollowUps() {
    return demoDb.getFollowUps();
  },

  async updateFollowUpStatus(visitId: string, status: string) {
    return demoDb.updateFollowUpStatus(visitId, status);
  },

  async getVisitHistory(mrNumber: string) {
    const patient = demoDb.getPatientByMrn(mrNumber);
    return { visits: patient?.visits || [] };
  },
};
