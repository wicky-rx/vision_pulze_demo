import { type Patient, mockPatients } from "@/data/mockData";

// Initial list of doctors
const INITIAL_DOCTORS = [
  {
    id: "doc-1",
    name: "Dr. John Doe",
    specialization: "General Ophthalmology",
    schedules: [
      { id: "sched-1", dayOfWeek: 1, startTime: "09:00", endTime: "13:00" },
      { id: "sched-2", dayOfWeek: 3, startTime: "14:00", endTime: "17:00" },
      { id: "sched-3", dayOfWeek: 5, startTime: "09:00", endTime: "13:00" },
    ],
  },
  {
    id: "doc-2",
    name: "Dr. Jane Smith",
    specialization: "Cornea & Refractive",
    schedules: [
      { id: "sched-4", dayOfWeek: 2, startTime: "10:00", endTime: "15:00" },
      { id: "sched-5", dayOfWeek: 4, startTime: "10:00", endTime: "15:00" },
    ],
  },
  {
    id: "doc-3",
    name: "Dr. Alex Jones",
    specialization: "Retina Specialist",
    schedules: [
      { id: "sched-6", dayOfWeek: 6, startTime: "09:00", endTime: "13:00" },
    ],
  },
];

// Helper to inject a dynamic schedule slot for today to keep at least one doctor "ON DUTY"
const injectDynamicDutySlot = (doctors: any[]) => {
  const today = new Date().getDay();
  const now = new Date();
  const currentHour = now.getHours();
  
  // Create a duty slot matching current time (1 hour ago to 2 hours from now)
  const startHour = Math.max(0, currentHour - 1);
  const endHour = Math.min(23, currentHour + 2);
  const pad = (n: number) => String(n).padStart(2, "0");
  const startTime = `${pad(startHour)}:00`;
  const endTime = `${pad(endHour)}:00`;

  // Check if any doctor already has a schedule for today covering the current time
  const hasActive = doctors.some((doc) =>
    doc.schedules?.some((s: any) => {
      if (s.dayOfWeek !== today) return false;
      const [sh, sm] = s.startTime.split(":").map(Number);
      const [eh, em] = s.endTime.split(":").map(Number);
      const currentTimeNum = now.getHours() * 60 + now.getMinutes();
      const startNum = sh * 60 + sm;
      const endNum = eh * 60 + em;
      return currentTimeNum >= startNum - 45 && currentTimeNum <= endNum + 45;
    })
  );

  // If no doctor has an active slot right now, dynamically add one to Dr. John Doe (doc-1)
  if (!hasActive && doctors.length > 0) {
    const doc1 = doctors.find(d => d.id === "doc-1") || doctors[0];
    if (doc1) {
      if (!doc1.schedules) doc1.schedules = [];
      // Clean up previous dynamic schedules for today to avoid multiple duplicates
      doc1.schedules = doc1.schedules.filter((s: any) => !s.isDynamic || s.dayOfWeek !== today);
      
      // Only push if there is no other slot on the same day to avoid overlaps
      if (!doc1.schedules.some((s: any) => s.dayOfWeek === today)) {
        doc1.schedules.push({
          id: `sched-dynamic-${today}`,
          dayOfWeek: today,
          startTime: startTime,
          endTime: endTime,
          isDynamic: true,
        });
      }
    }
  }

  return doctors;
};

// Initial visit queue seed data
const getInitialVisits = (seededPatients: Patient[]) => {
  const now = new Date();
  const getTodayTime = (minutesOffset: number) => {
    return new Date(now.getTime() - minutesOffset * 60 * 1000).toISOString();
  };

  return [
    {
      id: "visit-1",
      mrNumber: "100423",
      status: "WITH_DOCTOR",
      visitedAt: getTodayTime(32),
      createdAt: getTodayTime(32),
      complaint: "Eye irritation and blurriness",
      consultingDoctorId: "doc-1",
      consultingDoctorName: "Dr. John Doe",
      patient: seededPatients.find((p) => p.mrNumber === "100423"),
      tokenNumber: 1,
    },
    {
      id: "visit-2",
      mrNumber: "100424",
      status: "IN_REFRACTION",
      visitedAt: getTodayTime(18),
      createdAt: getTodayTime(18),
      complaint: "Regular spectacle checkup",
      consultingDoctorId: "doc-2",
      consultingDoctorName: "Dr. Jane Smith",
      patient: seededPatients.find((p) => p.mrNumber === "100424"),
      tokenNumber: 2,
    },
    {
      id: "visit-3",
      mrNumber: "100425",
      status: "AT_RECEPTION",
      visitedAt: getTodayTime(5),
      createdAt: getTodayTime(5),
      complaint: "Redness in left eye",
      consultingDoctorId: "doc-1",
      consultingDoctorName: "Dr. John Doe",
      patient: seededPatients.find((p) => p.mrNumber === "100425"),
      tokenNumber: 3,
    },
    {
      id: "visit-4",
      mrNumber: "100426",
      status: "AT_OPTICAL",
      visitedAt: getTodayTime(45),
      createdAt: getTodayTime(45),
      complaint: "Spec frame purchase",
      consultingDoctorId: "doc-2",
      consultingDoctorName: "Dr. Jane Smith",
      patient: seededPatients.find((p) => p.mrNumber === "100426"),
      tokenNumber: 4,
    },
    {
      id: "visit-5",
      mrNumber: "100427",
      status: "COMPLETED",
      visitedAt: getTodayTime(90),
      createdAt: getTodayTime(90),
      complaint: "Post-op checkup",
      consultingDoctorId: "doc-3",
      consultingDoctorName: "Dr. Alex Jones",
      patient: seededPatients.find((p) => p.mrNumber === "100427"),
      tokenNumber: 5,
    },
  ];
};

const getInitialAppointments = (seededPatients: Patient[]) => {
  const todayStr = new Date().toISOString().split("T")[0];
  return [
    {
      id: "app-1",
      patientMrNumber: "100428",
      doctorId: "doc-1",
      doctorName: "Dr. John Doe",
      appointmentDate: todayStr,
      timeSlot: "11:00 AM",
      notes: "Follow up consult",
      status: "PENDING",
      createdAt: new Date().toISOString(),
      patient: seededPatients.find((p) => p.mrNumber === "100428"),
    },
    {
      id: "app-2",
      patientMrNumber: "100429",
      doctorId: "doc-2",
      doctorName: "Dr. Jane Smith",
      appointmentDate: todayStr,
      timeSlot: "12:30 PM",
      notes: "Spectacles consultation",
      status: "PENDING",
      createdAt: new Date().toISOString(),
      patient: seededPatients.find((p) => p.mrNumber === "100429"),
    },
  ];
};

export class DemoDatabase {
  private getStore<T>(key: string): T[] {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  }

  private setStore<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  private getVisitsWithTokens(): any[] {
    const visits = this.getStore<any>("demo_visits");
    let changed = false;
    const updated = visits.map((v, index) => {
      const tokenNumber = v.tokenNumber || (index + 1);
      if (v.tokenNumber !== tokenNumber) {
        changed = true;
        return { ...v, tokenNumber };
      }
      return v;
    });
    if (changed) {
      this.setStore("demo_visits", updated);
    }
    return updated;
  }

  constructor() {
    this.initialize();
  }

  public initialize() {
    // 1. Seed Patients
    if (!localStorage.getItem("demo_patients")) {
      const formattedPatients = mockPatients.map((p) => ({
        ...p,
        // Make sure address fields are split out
        doorNo: p.doorNo || "12",
        street: p.street || "Main Road",
        city: p.city || "Chennai",
        district: p.district || "Chennai",
        state: p.state || "Tamil Nadu",
        pincode: p.pincode || "600001",
        co: p.co || "Self",
      }));
      this.setStore("demo_patients", formattedPatients);
    }

    // 2. Seed Doctors
    if (!localStorage.getItem("demo_doctors")) {
      this.setStore("demo_doctors", INITIAL_DOCTORS);
    }

    // 3. Seed Visits (Today's queue)
    if (!localStorage.getItem("demo_visits")) {
      const patients = this.getStore<Patient>("demo_patients");
      this.setStore("demo_visits", getInitialVisits(patients));
    }

    // 4. Seed Appointments
    if (!localStorage.getItem("demo_appointments")) {
      const patients = this.getStore<Patient>("demo_patients");
      this.setStore("demo_appointments", getInitialAppointments(patients));
    }
  }

  // Doctor Operations
  public getDoctors() {
    const docs = this.getStore<any>("demo_doctors");
    return injectDynamicDutySlot(docs);
  }

  public getDoctorSchedules(doctorId: string) {
    const docs = this.getDoctors();
    const doc = docs.find((d) => d.id === doctorId);
    return doc ? doc.schedules || [] : [];
  }

  public addDoctorSchedule(doctorId: string, slot: any) {
    const docs = this.getStore<any>("demo_doctors");
    const updated = docs.map((doc) => {
      if (doc.id === doctorId) {
        const schedules = doc.schedules || [];
        const newSlot = {
          id: `sched-${Date.now()}`,
          dayOfWeek: Number(slot.dayOfWeek),
          startTime: slot.startTime,
          endTime: slot.endTime,
        };
        return { ...doc, schedules: [...schedules, newSlot] };
      }
      return doc;
    });
    this.setStore("demo_doctors", updated);
    return this.getDoctorSchedules(doctorId);
  }

  public deleteDoctorSchedule(scheduleId: string) {
    const docs = this.getStore<any>("demo_doctors");
    const updated = docs.map((doc) => {
      const schedules = doc.schedules || [];
      return {
        ...doc,
        schedules: schedules.filter((s: any) => s.id !== scheduleId),
      };
    });
    this.setStore("demo_doctors", updated);
    return { success: true };
  }

  // Patient Operations
  public checkMobile(mobile: string) {
    const patients = this.getStore<Patient>("demo_patients");
    const formattedNum = mobile.replace(/\s+/g, "");
    const matches = patients.filter(
      (p) => p.contactNumber?.replace(/\s+/g, "") === formattedNum
    );
    return {
      exists: matches.length > 0,
      patients: matches,
    };
  }

  public searchPatients(query: string) {
    const patients = this.getStore<Patient>("demo_patients");
    const q = query.toLowerCase().trim();
    if (!q) return [];
    
    // Get all visits to map the visit history statuses
    const visits = this.getVisitsWithTokens();

    const filtered = patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.mrNumber.includes(q) ||
        p.contactNumber?.includes(q)
    );

    // Map active visits status onto the search result
    return filtered.map((p) => {
      const patientVisits = visits.filter((v) => v.mrNumber === p.mrNumber);
      return {
        ...p,
        visits: patientVisits.sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime()),
      };
    });
  }

  public getPatientByMrn(mrNumber: string) {
    const patients = this.getStore<Patient>("demo_patients");
    const p = patients.find((pat) => pat.mrNumber === mrNumber);
    if (!p) return null;

    const visits = this.getVisitsWithTokens().filter((v) => v.mrNumber === mrNumber);
    return {
      ...p,
      visits: visits.sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime()),
    };
  }

  public registerPatient(formData: any) {
    const patients = this.getStore<Patient>("demo_patients");
    
    // Generate new MR Number (numeric sequence)
    const nextMr = patients.length > 0
      ? String(Math.max(...patients.map((p) => Number(p.mrNumber))) + 1)
      : "100430";

    const newPatient: Patient = {
      id: nextMr,
      mrNumber: nextMr,
      name: formData.name,
      co: formData.co || "",
      age: formData.age || 0,
      gender: formData.gender,
      contactNumber: formData.contactNumber,
      secondaryContact: formData.secondaryContact || "",
      doorNo: formData.doorNo || "",
      street: formData.street || "",
      area: formData.area || "",
      city: formData.city || "",
      district: formData.district || "",
      state: formData.state || "Tamil Nadu",
      pincode: formData.pincode || "",
      address: `${formData.doorNo || ""}, ${formData.street || ""}, ${formData.city || ""}`.trim().replace(/^,\s*/, ""),
      dob: formData.dob || "",
      status: "reception",
      waitTime: "0 min",
      registeredAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedPatients = [...patients, newPatient];
    this.setStore("demo_patients", updatedPatients);

    // If doctorId is provided, also automatically create a visit
    let newVisit: any = null;
    if (formData.doctorId) {
      newVisit = this.startVisit(nextMr, {
        doctorId: formData.doctorId,
        doctorName: formData.doctorName,
        timeSlot: formData.timeSlot,
        complaint: formData.complaint,
        appointmentDate: formData.appointmentDate,
      });
    }

    return {
      message: "Patient registered successfully",
      patient: newPatient,
      visit: newVisit,
    };
  }

  public updatePatient(mrNumber: string, data: any) {
    const patients = this.getStore<Patient>("demo_patients");
    const updatedPatients = patients.map((p) => {
      if (p.mrNumber === mrNumber) {
        const fullAddress = `${data.doorNo || p.doorNo || ""}, ${data.street || p.street || ""}, ${data.city || p.city || ""}`.trim().replace(/^,\s*/, "");
        return {
          ...p,
          ...data,
          address: fullAddress,
        };
      }
      return p;
    });
    this.setStore("demo_patients", updatedPatients);

    // Also update this patient inside any visits in the queue
    const updatedPatient = updatedPatients.find((p) => p.mrNumber === mrNumber);
    const visits = this.getVisitsWithTokens();
    const updatedVisits = visits.map((v) => {
      if (v.mrNumber === mrNumber) {
        return { ...v, patient: updatedPatient };
      }
      return v;
    });
    this.setStore("demo_visits", updatedVisits);

    return { success: true, patient: updatedPatient };
  }

  // Visit Operations
  public getQueue() {
    return this.getVisitsWithTokens();
  }

  public startVisit(mrNumber: string, visitData: any) {
    const patients = this.getStore<Patient>("demo_patients");
    const patient = patients.find((p) => p.mrNumber === mrNumber);
    if (!patient) throw new Error("Patient not found");

    const visits = this.getVisitsWithTokens();
    const newVisitId = `visit-${Date.now()}`;
    const tokenNumber = visits.length + 1;
    const newVisit = {
      id: newVisitId,
      mrNumber: mrNumber,
      status: "AT_RECEPTION",
      visitedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      complaint: visitData.complaint || "Routine eye consultation",
      consultingDoctorId: visitData.doctorId || "doc-1",
      consultingDoctorName: visitData.doctorName || "Dr. John Doe",
      patient: patient,
      tokenNumber: tokenNumber,
    };

    this.setStore("demo_visits", [...visits, newVisit]);
    return newVisit;
  }

  public deleteVisit(visitId: string) {
    const visits = this.getVisitsWithTokens();
    const filtered = visits.filter((v) => v.id !== visitId);
    this.setStore("demo_visits", filtered);
    return { success: true };
  }

  // Appointment Operations
  public createAppointment(data: any) {
    const patients = this.getStore<Patient>("demo_patients");
    const patient = patients.find((p) => p.mrNumber === data.patientMrNumber);
    if (!patient) throw new Error("Patient not found");

    const appointments = this.getStore<any>("demo_appointments");
    const docs = this.getDoctors();
    const doc = docs.find((d) => d.id === data.doctorId);

    const newApp = {
      id: `app-${Date.now()}`,
      patientMrNumber: data.patientMrNumber,
      doctorId: data.doctorId,
      doctorName: doc ? doc.name : "Dr. John Doe",
      appointmentDate: data.appointmentDate,
      timeSlot: data.timeSlot || "10:00 AM",
      notes: data.notes || "",
      status: "PENDING",
      createdAt: new Date().toISOString(),
      patient: patient,
    };

    this.setStore("demo_appointments", [...appointments, newApp]);

    // If scheduled date is today, automatically convert to an active visit in the queue
    const todayStr = new Date().toISOString().split("T")[0];
    const appDateStr = new Date(data.appointmentDate).toISOString().split("T")[0];

    if (appDateStr === todayStr) {
      this.startVisit(data.patientMrNumber, {
        doctorId: data.doctorId,
        doctorName: doc ? doc.name : "Dr. John Doe",
        timeSlot: data.timeSlot,
        complaint: data.notes || "Scheduled appointment consult",
      });
      return {
        message: "Visit created for today's appointment",
        type: "VISIT_CREATED",
        appointment: newApp,
      };
    }

    return {
      message: "Appointment scheduled successfully",
      type: "APPOINTMENT_SCHEDULED",
      appointment: newApp,
    };
  }

  public getDailyAppointments(dateStr: string) {
    const appointments = this.getStore<any>("demo_appointments");
    return appointments.filter((app) => {
      const appDate = new Date(app.appointmentDate).toISOString().split("T")[0];
      return appDate === dateStr;
    });
  }

  public deleteAppointment(appointmentId: string) {
    const appointments = this.getStore<any>("demo_appointments");
    const filtered = appointments.filter((app) => app.id !== appointmentId);
    this.setStore("demo_appointments", filtered);
    return { success: true };
  }

  public convertAppointmentToVisit(appointmentId: string) {
    const appointments = this.getStore<any>("demo_appointments");
    const appIndex = appointments.findIndex((app) => app.id === appointmentId);
    if (appIndex === -1) throw new Error("Appointment not found");

    const app = appointments[appIndex];
    
    // Mark as visited/completed in appointments list
    appointments[appIndex].status = "VISIT_CREATED";
    this.setStore("demo_appointments", appointments);

    // Create the visit in queue
    const visit = this.startVisit(app.patientMrNumber, {
      doctorId: app.doctorId,
      doctorName: app.doctorName,
      timeSlot: app.timeSlot,
      complaint: app.notes || "Appointment scheduled visit",
    });

    return {
      success: true,
      visit,
    };
  }
}

export const demoDb = new DemoDatabase();
