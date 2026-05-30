import { demoDb } from "./demoDb";

// Centralized API client wrapper.
// Since this is a pure client-side offline demo, this file directly forwards all requests to our localStorage-backed demoDb.
export const api = {
  // Doctor Operations
  async getDoctors() {
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

  async saveOptical(visitId: string, data: any) {
    return demoDb.saveOptical(visitId, data);
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

  // -------------------------
  // Inventory Operations
  // -------------------------
  async getInventory() {
    return demoDb.getInventory();
  },

  async addInventoryItem(data: { name: string; category: string; route: string }) {
    return demoDb.addInventoryItem(data);
  },

  async updateInventoryItem(id: string, data: any) {
    return demoDb.updateInventoryItem(id, data);
  },

  async deleteInventoryItem(id: string) {
    return demoDb.deleteInventoryItem(id);
  },

  // -------------------------
  // Admin Stats / Reports
  // -------------------------
  async getAdminStats() {
    return demoDb.getAdminStats();
  },

  async getReports(type: string, page: number = 1, limit: number = 20, search: string = "") {
    return demoDb.getReports(type, page, limit, search);
  },

  // -------------------------
  // Admin Users
  // -------------------------
  async getAdminUsers(page: number = 1, limit: number = 10, search: string = "", role: string = "") {
    return demoDb.getAdminUsers(page, limit, search, role);
  },

  async createAdminUser(data: any) {
    return demoDb.createAdminUser(data);
  },

  async updateAdminUser(id: string, data: any) {
    return demoDb.updateAdminUser(id, data);
  },

  async deleteAdminUser(id: string) {
    return demoDb.deleteAdminUser(id);
  },

  async resetUserPassword(userId: string, newPassword: string) {
    return demoDb.resetUserPassword(userId, newPassword);
  },

  // -------------------------
  // Audit Logs
  // -------------------------
  async getAuditLogs(page: number = 1, limit: number = 15, search: string = "") {
    return demoDb.getAuditLogs(page, limit, search);
  },

  async addAuditLog(log: { action: string; details: string }) {
    return demoDb.addAuditLog(log);
  },

  // -------------------------
  // Family Groups
  // -------------------------
  async getFamilyGroups(search: string = "", page: number = 1, limit: number = 10) {
    return demoDb.getFamilyGroups(search, page, limit);
  },

  async createFamilyGroup(data: { name: string; primaryPatientMrNumber: string }) {
    return demoDb.createFamilyGroup(data);
  },

  async addFamilyMember(groupId: string, member: { mrNumber: string; relationship: string }) {
    return demoDb.addFamilyMember(groupId, member);
  },

  async removeFamilyMember(groupId: string, mrNumber: string) {
    return demoDb.removeFamilyMember(groupId, mrNumber);
  },

  async deleteFamilyGroup(groupId: string) {
    return demoDb.deleteFamilyGroup(groupId);
  },

  async getPatientFamilyGroup(mrNumber: string) {
    return demoDb.getPatientFamilyGroup(mrNumber);
  },
};

