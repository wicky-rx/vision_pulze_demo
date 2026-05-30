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

const getInitialRefractions = () => {
  return [
    {
      id: "visit-4",
      visitId: "visit-4",
      patientId: "visit-4",
      ocularComplaint: "Spec frame purchase, blurred vision",
      refractionistName: "Demo Optometrist",
      createdAt: new Date().toISOString(),
      complaints: ["Blurred Vision in both eyes"],
      complaintNotes: "",
      visualAcuity: {
        OD: { unaided: "6/9", nearVision: "N6", aided: "6/6", aidedNear: "N6", contactLens: "", contactLensNear: "", pinhole: "" },
        OS: { unaided: "6/12", nearVision: "N8", aided: "6/6", aidedNear: "N6", contactLens: "", contactLensNear: "", pinhole: "" },
        OU: { unaided: "6/9", nearVision: "N6", aided: "6/6", aidedNear: "N6", contactLens: "", contactLensNear: "", pinhole: "" },
      },
      pgPower: {
        activeTab: "glass",
        glass: {
          glassType: "SVN",
          OD: { sphere1: "-1.00", cylinder1: "-0.50", axis1: "90", add: "", vn1: "6/6", vnNear1: "N6", sphere2: "", cylinder2: "", axis2: "" },
          OS: { sphere1: "-1.25", cylinder1: "-0.75", axis1: "180", add: "", vn1: "6/6", vnNear1: "N6", sphere2: "", cylinder2: "", axis2: "" },
        },
        contact: {
          clType: ["Soft CL"],
          OD: { sphere1: "", cylinder1: "", axis1: "", add: "", vn1: "", vnNear1: "", sphere2: "", cylinder2: "", axis2: "" },
          OS: { sphere1: "", cylinder1: "", axis1: "", add: "", vn1: "", vnNear1: "", sphere2: "", cylinder2: "", axis2: "" },
        },
        notes: "Wears spectacles for distance"
      },
      objectiveRefraction: {
        type: "DilRR",
        OD: { sphere: "-1.00", cylinder: "-0.50", axis: "90", qualityOfRef: "Good", cycloSphere: "", cycloCylinder: "", cycloAxis: "" },
        OS: { sphere: "-1.25", cylinder: "-0.75", axis: "180", qualityOfRef: "Good", cycloSphere: "", cycloCylinder: "", cycloAxis: "" },
      },
      glassPrescription: {
        glassType: "SVN",
        OD: { sphere: "-1.00", cylinder: "-0.50", axis: "90", bcva: "6/6", nearDsph: "", nearCylinder: "", nearAxis: "", nearAdd: "", nearBcva: "", nearCm: "" },
        OS: { sphere: "-1.25", cylinder: "-0.75", axis: "180", bcva: "6/6", nearDsph: "", nearCylinder: "", nearAxis: "", nearAdd: "", nearBcva: "", nearCm: "" },
      },
      contactLensPrescription: {
        clType: ["Soft CL"],
        OD: { sphere: "", cylinder: "", axis: "", bcva: "", nearDsph: "", nearCylinder: "", nearAxis: "", nearAdd: "", nearBcva: "", nearCm: "" },
        OS: { sphere: "", cylinder: "", axis: "", bcva: "", nearDsph: "", nearCylinder: "", nearAxis: "", nearAdd: "", nearBcva: "", nearCm: "" },
      },
      arMeterEnabled: false,
      arMeter: {
        OD: { SPH: "", CYL: "", AXIS: "" },
        OS: { SPH: "", CYL: "", AXIS: "" },
      },
      refining: {
        duochrome: { OD: "Equal", OS: "Equal" },
        jcc: { OD: "NAD", OS: "NAD" },
      },
      binocular: "Balanced",
      optometristNotes: "Advised spectacles use for all distance activities",
      keratometry: { OD: [], OS: [] },
      schirmerTest: { OD: "Normal (> 15 mm)", OS: "Normal (> 15 mm)" },
      ctrr: "",
      orthoptics: "",
      jcc: "",
      amslerGrid: "",
      ishiharaTest: { status: "Normal", notes: "17/17 plates read" },
      contrastSensitivity: "Normal",
      autoRef: {
        OD: { sphere1: "-1.00", cylinder1: "-0.50", axis1: "90" },
        OS: { sphere1: "-1.25", cylinder1: "-0.75", axis1: "180" },
      },
      tonometryDetails: {
        nct: { OD: { mean: ["14"], iop: "14" }, OS: { mean: ["15"], iop: "15" } },
        gat: { OD: { reading: [], iop: "" }, OS: { reading: [], iop: "" } },
        schiotz: { OD: { reading: "", weight: "5.5", iop: "" }, OS: { reading: "", weight: "5.5", iop: "" } }
      },
      acceptance: {
        distance: { OD: { sphere: "-1.00", cylinder: "-0.50", axis: "90", vn: "6/6" }, OS: { sphere: "-1.25", cylinder: "-0.75", axis: "180", vn: "6/6" } },
        near: { OD: { sphere: "", cylinder: "", axis: "", vn: "" }, OS: { sphere: "", cylinder: "", axis: "", vn: "" } },
        remarks: { OD: "Good acceptance", OS: "Good acceptance" }
      },
      systemicHistory: []
    },
    {
      id: "visit-5",
      visitId: "visit-5",
      patientId: "visit-5",
      ocularComplaint: "Post-op checkup, regular follow-up",
      refractionistName: "Demo Optometrist",
      createdAt: new Date().toISOString(),
      complaints: ["Post-op checkup"],
      complaintNotes: "",
      visualAcuity: {
        OD: { unaided: "6/6", nearVision: "N6", aided: "6/6", aidedNear: "N6", contactLens: "", contactLensNear: "", pinhole: "" },
        OS: { unaided: "6/6", nearVision: "N6", aided: "6/6", aidedNear: "N6", contactLens: "", contactLensNear: "", pinhole: "" },
        OU: { unaided: "6/6", nearVision: "N6", aided: "6/6", aidedNear: "N6", contactLens: "", contactLensNear: "", pinhole: "" },
      },
      pgPower: {
        activeTab: "glass",
        glass: {
          glassType: "SVN",
          OD: { sphere1: "", cylinder1: "", axis1: "", add: "", vn1: "", vnNear1: "", sphere2: "", cylinder2: "", axis2: "" },
          OS: { sphere1: "", cylinder1: "", axis1: "", add: "", vn1: "", vnNear1: "", sphere2: "", cylinder2: "", axis2: "" },
        },
        contact: {
          clType: ["Soft CL"],
          OD: { sphere1: "", cylinder1: "", axis1: "", add: "", vn1: "", vnNear1: "", sphere2: "", cylinder2: "", axis2: "" },
          OS: { sphere1: "", cylinder1: "", axis1: "", add: "", vn1: "", vnNear1: "", sphere2: "", cylinder2: "", axis2: "" },
        },
        notes: "No glasses currently used"
      },
      objectiveRefraction: {
        type: "DilRR",
        OD: { sphere: "0.00", cylinder: "0.00", axis: "0", qualityOfRef: "Good", cycloSphere: "", cycloCylinder: "", cycloAxis: "" },
        OS: { sphere: "0.00", cylinder: "0.00", axis: "0", qualityOfRef: "Good", cycloSphere: "", cycloCylinder: "", cycloAxis: "" },
      },
      glassPrescription: {
        glassType: "SVN",
        OD: { sphere: "0.00", cylinder: "0.00", axis: "0", bcva: "6/6", nearDsph: "", nearCylinder: "", nearAxis: "", nearAdd: "", nearBcva: "", nearCm: "" },
        OS: { sphere: "0.00", cylinder: "0.00", axis: "0", bcva: "6/6", nearDsph: "", nearCylinder: "", nearAxis: "", nearAdd: "", nearBcva: "", nearCm: "" },
      },
      contactLensPrescription: {
        clType: ["Soft CL"],
        OD: { sphere: "", cylinder: "", axis: "", bcva: "", nearDsph: "", nearCylinder: "", nearAxis: "", nearAdd: "", nearBcva: "", nearCm: "" },
        OS: { sphere: "", cylinder: "", axis: "", bcva: "", nearDsph: "", nearCylinder: "", nearAxis: "", nearAdd: "", nearBcva: "", nearCm: "" },
      },
      arMeterEnabled: false,
      arMeter: {
        OD: { SPH: "", CYL: "", AXIS: "" },
        OS: { SPH: "", CYL: "", AXIS: "" },
      },
      refining: {
        duochrome: { OD: "Equal", OS: "Equal" },
        jcc: { OD: "NAD", OS: "NAD" },
      },
      binocular: "Balanced",
      optometristNotes: "Optically clear, regular post-op check",
      keratometry: { OD: [], OS: [] },
      schirmerTest: { OD: "Normal (> 15 mm)", OS: "Normal (> 15 mm)" },
      ctrr: "",
      orthoptics: "",
      jcc: "",
      amslerGrid: "",
      ishiharaTest: { status: "Normal", notes: "17/17 plates read" },
      contrastSensitivity: "Normal",
      autoRef: {
        OD: { sphere1: "0.00", cylinder1: "0.00", axis1: "0" },
        OS: { sphere1: "0.00", cylinder1: "0.00", axis1: "0" },
      },
      tonometryDetails: {
        nct: { OD: { mean: ["12"], iop: "12" }, OS: { mean: ["13"], iop: "13" } },
        gat: { OD: { reading: [], iop: "" }, OS: { reading: [], iop: "" } },
        schiotz: { OD: { reading: "", weight: "5.5", iop: "" }, OS: { reading: "", weight: "5.5", iop: "" } }
      },
      acceptance: {
        distance: { OD: { sphere: "0.00", cylinder: "0.00", axis: "0", vn: "6/6" }, OS: { sphere: "0.00", cylinder: "0.00", axis: "0", vn: "6/6" } },
        near: { OD: { sphere: "", cylinder: "", axis: "", vn: "" }, OS: { sphere: "", cylinder: "", axis: "", vn: "" } },
        remarks: { OD: "Comfortable", OS: "Comfortable" }
      },
      systemicHistory: []
    }
  ];
};

const getInitialConsultations = () => {
  return [
    {
      id: "visit-4",
      visitId: "visit-4",
      createdAt: new Date().toISOString(),
      notes: "Prescribed SVN glass for reading and distance.",
      diagnosisText: "OD: Blurred vision | OS: Blurred vision",
      medicalPrescription: [],
      finalGlassPrescription: {
        glassType: "SVN",
        OD: { sphere: "-1.00", cylinder: "-0.50", axis: "90", bcva: "6/6" },
        OS: { sphere: "-1.25", cylinder: "-0.75", axis: "180", bcva: "6/6" }
      },
      finalContactLensPrescription: {
        clType: ["Soft CL"],
        OD: { sphere: "", cylinder: "", axis: "", bcva: "" },
        OS: { sphere: "", cylinder: "", axis: "", bcva: "" }
      }
    },
    {
      id: "visit-5",
      visitId: "visit-5",
      createdAt: new Date().toISOString(),
      notes: "No glass prescription required. Eye clinically clear.",
      diagnosisText: "OD: Post-op clear | OS: Post-op clear",
      medicalPrescription: [
        { id: "med-1", drug: "Tears Natural", dosage: "1 drop", route: "Topical", frequency: "QID", duration: "1 month", eye: "Both" }
      ],
      finalGlassPrescription: {
        glassType: "SVN",
        OD: { sphere: "", cylinder: "", axis: "", bcva: "" },
        OS: { sphere: "", cylinder: "", axis: "", bcva: "" }
      },
      finalContactLensPrescription: {
        clType: ["Soft CL"],
        OD: { sphere: "", cylinder: "", axis: "", bcva: "" },
        OS: { sphere: "", cylinder: "", axis: "", bcva: "" }
      }
    }
  ];
};

// --- Seed Inventory ---
const INITIAL_INVENTORY = [
  { id: "inv-1", name: "Moxifloxacin 0.5%", category: "Antibiotics", route: "Topical", isActive: true, createdAt: new Date().toISOString() },
  { id: "inv-2", name: "Ciprofloxacin 0.3%", category: "Antibiotics", route: "Topical", isActive: true, createdAt: new Date().toISOString() },
  { id: "inv-3", name: "Timolol 0.5%", category: "Anti-Glaucoma", route: "Topical", isActive: true, createdAt: new Date().toISOString() },
  { id: "inv-4", name: "Bimatoprost 0.03%", category: "Anti-Glaucoma", route: "Topical", isActive: true, createdAt: new Date().toISOString() },
  { id: "inv-5", name: "Carboxymethylcellulose 0.5%", category: "Lubricants", route: "Topical", isActive: true, createdAt: new Date().toISOString() },
  { id: "inv-6", name: "Hydroxypropyl Methylcellulose", category: "Lubricants", route: "Topical", isActive: true, createdAt: new Date().toISOString() },
  { id: "inv-7", name: "Tropicamide 1%", category: "Mydriatics", route: "Topical", isActive: true, createdAt: new Date().toISOString() },
  { id: "inv-8", name: "Phenylephrine 2.5%", category: "Mydriatics", route: "Topical", isActive: true, createdAt: new Date().toISOString() },
  { id: "inv-9", name: "Nepafenac 0.1%", category: "NSAIDs", route: "Topical", isActive: true, createdAt: new Date().toISOString() },
  { id: "inv-10", name: "Ketorolac 0.5%", category: "NSAIDs", route: "Topical", isActive: true, createdAt: new Date().toISOString() },
  { id: "inv-11", name: "Prednisolone Acetate 1%", category: "Steroids", route: "Topical", isActive: true, createdAt: new Date().toISOString() },
  { id: "inv-12", name: "Dexamethasone 0.1%", category: "Steroids", route: "Topical", isActive: true, createdAt: new Date().toISOString() },
];

// --- Seed Audit Logs ---
const INITIAL_AUDIT_LOGS = [
  { id: "log-1", userId: "user-admin", username: "admin", name: "Admin User", role: "ADMIN", action: "LOGIN", details: "Admin logged in successfully", ipAddress: "192.168.1.10", createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: "log-2", userId: "user-receptionist", username: "reception", name: "Demo Receptionist", role: "RECEPTIONIST", action: "PATIENT_REGISTERED", details: "Registered new patient: Karthik Kumar (MR-100430)", ipAddress: "192.168.1.11", createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString() },
  { id: "log-3", userId: "user-doctor", username: "doctor", name: "Dr. John Doe", role: "DOCTOR", action: "CONSULTATION_CREATED", details: "Completed consultation for MR-100423", ipAddress: "192.168.1.12", createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString() },
  { id: "log-4", userId: "user-optometrist", username: "optometrist", name: "Demo Optometrist", role: "OPTOMETRIST", action: "REFRACTION_SAVED", details: "Refraction data recorded for MR-100424", ipAddress: "192.168.1.13", createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
  { id: "log-5", userId: "user-admin", username: "admin", name: "Admin User", role: "ADMIN", action: "USER_CREATED", details: "Created new staff account: Dr. Jane Smith (DOCTOR)", ipAddress: "192.168.1.10", createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString() },
  { id: "log-6", userId: "user-receptionist", username: "reception", name: "Demo Receptionist", role: "RECEPTIONIST", action: "PATIENT_REGISTERED", details: "Registered new patient: Priya Sundar (MR-100431)", ipAddress: "192.168.1.11", createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
];

// --- Seed Family Groups ---
const INITIAL_FAMILY_GROUPS = [
  {
    id: "family-1",
    name: "Kumar Family",
    primaryPatientMrNumber: "100423",
    members: [
      { mrNumber: "100423", name: "Karthik Kumar", relationship: "Self" },
      { mrNumber: "100424", name: "Priya Kumar", relationship: "Spouse" },
    ],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// --- Seed Admin Users ---
const INITIAL_ADMIN_USERS = [
  { id: "user-admin", name: "Admin User", username: "admin", role: "ADMIN", email: "admin@vpneye.com", isActive: true, createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "user-receptionist", name: "Demo Receptionist", username: "reception", role: "RECEPTIONIST", email: "reception@vpneye.com", isActive: true, createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "user-doctor", name: "Dr. John Doe", username: "doctor", role: "DOCTOR", email: "doctor@vpneye.com", isActive: true, createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "user-optometrist", name: "Demo Optometrist", username: "optometrist", role: "OPTOMETRIST", email: "optometrist@vpneye.com", isActive: true, createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "user-pharmacy", name: "Demo Pharmacist", username: "pharmacy", role: "PHARMACIST", email: "pharmacy@vpneye.com", isActive: true, createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
];

export class DemoDatabase {
  private getStore<T>(key: string): T[] {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  }

  private setStore<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  private populateVisitRelations(visit: any) {
    if (!visit) return visit;
    const refractions = this.getStore<any>("demo_refractions") || [];
    const consultations = this.getStore<any>("demo_consultations") || [];
    const opticals = this.getStore<any>("demo_opticals") || [];

    return {
      ...visit,
      refraction: refractions.find((r: any) => r.visitId === visit.id) || null,
      consultation: consultations.find((c: any) => c.visitId === visit.id) || null,
      optical: opticals.find((o: any) => o.visitId === visit.id) || null,
    };
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
        street: p.street || "Broadway",
        city: p.city || "Los Angeles",
        district: p.district || "Los Angeles County",
        state: p.state || "California",
        pincode: p.pincode || "90001",
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

    // 5. Seed Refractions
    if (!localStorage.getItem("demo_refractions")) {
      this.setStore("demo_refractions", getInitialRefractions());
    }

    // 6. Seed Consultations
    if (!localStorage.getItem("demo_consultations")) {
      this.setStore("demo_consultations", getInitialConsultations());
    }

    // 7. Seed Inventory
    if (!localStorage.getItem("demo_inventory")) {
      this.setStore("demo_inventory", INITIAL_INVENTORY);
    }

    // 8. Seed Audit Logs
    if (!localStorage.getItem("demo_audit_logs")) {
      this.setStore("demo_audit_logs", INITIAL_AUDIT_LOGS);
    }

    // 9. Seed Family Groups
    if (!localStorage.getItem("demo_family_groups")) {
      this.setStore("demo_family_groups", INITIAL_FAMILY_GROUPS);
    }

    // 10. Seed Admin Users
    if (!localStorage.getItem("demo_admin_users")) {
      this.setStore("demo_admin_users", INITIAL_ADMIN_USERS);
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
      const populatedVisits = patientVisits.map((v) => this.populateVisitRelations(v));
      return {
        ...p,
        visits: populatedVisits.sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime()),
      };
    });
  }

  public getPatientByMrn(mrNumber: string) {
    const patients = this.getStore<Patient>("demo_patients");
    const p = patients.find((pat) => pat.mrNumber === mrNumber);
    if (!p) return null;

    const visits = this.getVisitsWithTokens().filter((v) => v.mrNumber === mrNumber);
    const populatedVisits = visits.map((v) => this.populateVisitRelations(v));
    return {
      ...p,
      visits: populatedVisits.sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime()),
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
      parentMrNumber: formData.parentMrn || formData.parentMrNumber || "",
      relationshipType: formData.relationshipType || "",
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
    const visits = this.getVisitsWithTokens();
    return visits.map((v) => this.populateVisitRelations(v));
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

  // Refraction Operations
  public getRefraction(visitId: string) {
    const refractions = this.getStore<any>("demo_refractions");
    return refractions.find((r) => r.visitId === visitId) || null;
  }

  public saveRefraction(visitId: string, refractionData: any) {
    const refractions = this.getStore<any>("demo_refractions");
    const existingIndex = refractions.findIndex((r) => r.visitId === visitId);

    const updatedRecord = {
      ...refractionData,
      id: visitId,
      visitId: visitId,
      patientId: visitId,
      createdAt: refractionData.createdAt || new Date().toISOString(),
    };

    if (existingIndex !== -1) {
      refractions[existingIndex] = updatedRecord;
    } else {
      refractions.push(updatedRecord);
    }
    this.setStore("demo_refractions", refractions);

    // Update corresponding visit status to REFRACTION_DONE
    const visits = this.getVisitsWithTokens();
    const updatedVisits = visits.map((v) => {
      if (v.id === visitId) {
        return { ...v, status: "REFRACTION_DONE" };
      }
      return v;
    });
    this.setStore("demo_visits", updatedVisits);

    return updatedRecord;
  }

  public advanceToRefraction(visitId: string) {
    const visits = this.getVisitsWithTokens();
    const updatedVisits = visits.map((v) => {
      if (v.id === visitId) {
        return { ...v, status: "IN_REFRACTION" };
      }
      return v;
    });
    this.setStore("demo_visits", updatedVisits);
    return updatedVisits.find((v) => v.id === visitId);
  }

  // Consultation Operations
  public getConsultation(visitId: string) {
    const consultations = this.getStore<any>("demo_consultations") || [];
    const consultation = consultations.find((c: any) => c.visitId === visitId) || null;
    if (consultation) {
      const visits = this.getStore<any>("demo_visits") || [];
      consultation.visit = visits.find((v: any) => v.id === visitId) || null;
    }
    return consultation;
  }

  public saveConsultation(visitId: string, consultationData: any) {
    const consultations = this.getStore<any>("demo_consultations") || [];
    const existingIndex = consultations.findIndex((c: any) => c.visitId === visitId);

    const updatedRecord = {
      ...consultationData,
      id: visitId,
      visitId: visitId,
      createdAt: consultationData.createdAt || new Date().toISOString(),
    };

    if (existingIndex !== -1) {
      consultations[existingIndex] = updatedRecord;
    } else {
      consultations.push(updatedRecord);
    }
    this.setStore("demo_consultations", consultations);

    // Update corresponding visit status
    const visits = this.getVisitsWithTokens();
    const updatedVisits = visits.map((v) => {
      if (v.id === visitId) {
        const hasGlasses = consultationData.finalGlassPrescription && 
          ((consultationData.finalGlassPrescription.OD?.sphere && consultationData.finalGlassPrescription.OD.sphere !== "0.00") || 
           (consultationData.finalGlassPrescription.OS?.sphere && consultationData.finalGlassPrescription.OS.sphere !== "0.00") ||
           (consultationData.finalGlassPrescription.distance?.OD?.sphere && consultationData.finalGlassPrescription.distance.OD.sphere !== "0.00") ||
           (consultationData.finalGlassPrescription.distance?.OS?.sphere && consultationData.finalGlassPrescription.distance.OS.sphere !== "0.00"));
        return { 
          ...v, 
          status: hasGlasses ? "AT_OPTICAL" : "CONSULTED",
          followUpDate: consultationData.followUpDate || null,
          followUpTimeFrame: consultationData.followUpTimeFrame || null,
          followUpStatus: consultationData.followUpStatus || v.followUpStatus || "PENDING"
        };
      }
      return v;
    });
    this.setStore("demo_visits", updatedVisits);

    return updatedRecord;
  }

  public getFollowUps() {
    const visits = this.getVisitsWithTokens();
    return visits
      .filter((v: any) => v.followUpDate)
      .map((v: any) => this.populateVisitRelations(v));
  }

  public updateFollowUpStatus(visitId: string, status: string) {
    const visits = this.getVisitsWithTokens();
    const updated = visits.map((v: any) => {
      if (v.id === visitId) {
        return { ...v, followUpStatus: status };
      }
      return v;
    });
    this.setStore("demo_visits", updated);
    return { success: true };
  }

  public attendVisit(visitId: string) {
    const visits = this.getVisitsWithTokens();
    const updatedVisits = visits.map((v) => {
      if (v.id === visitId) {
        return { ...v, status: "WITH_DOCTOR" };
      }
      return v;
    });
    this.setStore("demo_visits", updatedVisits);
    return updatedVisits.find((v) => v.id === visitId);
  }

  public saveOptical(visitId: string, opticalData: any) {
    const opticals = this.getStore<any>("demo_opticals") || [];
    const existingIndex = opticals.findIndex((o: any) => o.visitId === visitId);

    const updatedRecord = {
      ...opticalData,
      id: visitId,
      visitId: visitId,
      createdAt: opticalData.createdAt || new Date().toISOString(),
    };

    if (existingIndex !== -1) {
      opticals[existingIndex] = updatedRecord;
    } else {
      opticals.push(updatedRecord);
    }
    this.setStore("demo_opticals", opticals);

    // Update corresponding visit status to COMPLETED
    const visits = this.getVisitsWithTokens();
    const updatedVisits = visits.map((v) => {
      if (v.id === visitId) {
        return { ...v, status: "COMPLETED" };
      }
      return v;
    });
    this.setStore("demo_visits", updatedVisits);

    return updatedRecord;
  }

  // -------------------------
  // Inventory Operations
  // -------------------------
  public getInventory() {
    return this.getStore<any>("demo_inventory");
  }

  public addInventoryItem(data: { name: string; category: string; route: string }) {
    const items = this.getStore<any>("demo_inventory");
    const newItem = {
      id: `inv-${Date.now()}`,
      name: data.name,
      category: data.category,
      route: data.route || "Topical",
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.setStore("demo_inventory", [...items, newItem]);
    return newItem;
  }

  public updateInventoryItem(id: string, data: Partial<{ name: string; category: string; route: string; isActive: boolean }>) {
    const items = this.getStore<any>("demo_inventory");
    const updated = items.map((item: any) =>
      item.id === id ? { ...item, ...data } : item
    );
    this.setStore("demo_inventory", updated);
    return updated.find((i: any) => i.id === id);
  }

  public deleteInventoryItem(id: string) {
    const items = this.getStore<any>("demo_inventory");
    this.setStore("demo_inventory", items.filter((i: any) => i.id !== id));
    return { success: true };
  }

  // -------------------------
  // Audit Log Operations
  // -------------------------
  public addAuditLog(log: { action: string; details: string; role?: string; username?: string; name?: string }) {
    try {
      const session = JSON.parse(localStorage.getItem("user_session") || "{}");
      const logs = this.getStore<any>("demo_audit_logs");
      const newLog = {
        id: `log-${Date.now()}`,
        userId: session.id || "system",
        username: log.username || session.username || "system",
        name: log.name || session.name || "System",
        role: log.role || session.role || "SYSTEM",
        action: log.action,
        details: log.details,
        ipAddress: "127.0.0.1",
        createdAt: new Date().toISOString(),
      };
      this.setStore("demo_audit_logs", [newLog, ...logs].slice(0, 200));
      return newLog;
    } catch {
      return null;
    }
  }

  public getAuditLogs(page: number = 1, limit: number = 15, search: string = "") {
    const logs = this.getStore<any>("demo_audit_logs");
    const filtered = search
      ? logs.filter((l: any) =>
          l.action?.toLowerCase().includes(search.toLowerCase()) ||
          l.details?.toLowerCase().includes(search.toLowerCase()) ||
          l.username?.toLowerCase().includes(search.toLowerCase()) ||
          l.name?.toLowerCase().includes(search.toLowerCase())
        )
      : logs;
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    return {
      logs: filtered.slice(start, start + limit),
      pagination: { total, totalPages, page, limit },
    };
  }

  // -------------------------
  // Family Groups
  // -------------------------
  public getFamilyGroups(search: string = "", page: number = 1, limit: number = 10) {
    const groups = this.getStore<any>("demo_family_groups");
    const filtered = search
      ? groups.filter((g: any) =>
          g.name?.toLowerCase().includes(search.toLowerCase()) ||
          g.primaryPatientMrNumber?.includes(search) ||
          g.members?.some((m: any) => m.name?.toLowerCase().includes(search.toLowerCase()) || m.mrNumber?.includes(search))
        )
      : groups;
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    return {
      groups: filtered.slice(start, start + limit).map((g: any) => ({
        ...g,
        memberCount: g.members?.length || 0,
      })),
      pagination: { total, totalPages, page, limit },
    };
  }

  public createFamilyGroup(data: { name: string; primaryPatientMrNumber: string }) {
    const groups = this.getStore<any>("demo_family_groups");
    const patients = this.getStore<any>("demo_patients");
    const primary = patients.find((p: any) => p.mrNumber === data.primaryPatientMrNumber);
    const newGroup = {
      id: `family-${Date.now()}`,
      name: data.name,
      primaryPatientMrNumber: data.primaryPatientMrNumber,
      members: primary ? [{ mrNumber: data.primaryPatientMrNumber, name: primary.name, relationship: "Self" }] : [],
      createdAt: new Date().toISOString(),
    };
    this.setStore("demo_family_groups", [...groups, newGroup]);
    return newGroup;
  }

  public addFamilyMember(groupId: string, member: { mrNumber: string; relationship: string }) {
    const groups = this.getStore<any>("demo_family_groups");
    const patients = this.getStore<any>("demo_patients");
    const patient = patients.find((p: any) => p.mrNumber === member.mrNumber);
    if (!patient) throw new Error("Patient not found");
    const updated = groups.map((g: any) => {
      if (g.id === groupId) {
        const alreadyMember = g.members?.some((m: any) => m.mrNumber === member.mrNumber);
        if (alreadyMember) throw new Error("Patient is already in this group");
        return {
          ...g,
          members: [...(g.members || []), { mrNumber: member.mrNumber, name: patient.name, relationship: member.relationship }],
        };
      }
      return g;
    });
    this.setStore("demo_family_groups", updated);
    return updated.find((g: any) => g.id === groupId);
  }

  public removeFamilyMember(groupId: string, mrNumber: string) {
    const groups = this.getStore<any>("demo_family_groups");
    const updated = groups.map((g: any) => {
      if (g.id === groupId) {
        return { ...g, members: g.members.filter((m: any) => m.mrNumber !== mrNumber) };
      }
      return g;
    });
    this.setStore("demo_family_groups", updated);
    return { success: true };
  }

  public deleteFamilyGroup(groupId: string) {
    const groups = this.getStore<any>("demo_family_groups");
    this.setStore("demo_family_groups", groups.filter((g: any) => g.id !== groupId));
    return { success: true };
  }

  public getPatientFamilyGroup(mrNumber: string) {
    const groups = this.getStore<any>("demo_family_groups");
    return groups.find((g: any) => g.members?.some((m: any) => m.mrNumber === mrNumber)) || null;
  }

  // -------------------------
  // Admin Users
  // -------------------------
  public getAdminUsers(page: number = 1, limit: number = 10, search: string = "", role: string = "") {
    const users = this.getStore<any>("demo_admin_users");
    let filtered = users;
    if (search) {
      filtered = filtered.filter((u: any) =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.username?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (role) {
      filtered = filtered.filter((u: any) => u.role === role);
    }
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    return {
      users: filtered.slice(start, start + limit),
      pagination: { total, totalPages, page, limit },
    };
  }

  public createAdminUser(data: any) {
    const users = this.getStore<any>("demo_admin_users");
    const exists = users.find((u: any) => u.username === data.username);
    if (exists) throw new Error("Username already exists");
    const newUser = {
      id: `user-${Date.now()}`,
      name: data.name,
      username: data.username,
      role: data.role,
      email: data.email || `${data.username}@vpneye.com`,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.setStore("demo_admin_users", [...users, newUser]);
    this.addAuditLog({ action: "USER_CREATED", details: `Created new staff account: ${data.name} (${data.role})` });
    return newUser;
  }

  public updateAdminUser(id: string, data: any) {
    const users = this.getStore<any>("demo_admin_users");
    const updated = users.map((u: any) => u.id === id ? { ...u, ...data } : u);
    this.setStore("demo_admin_users", updated);
    return updated.find((u: any) => u.id === id);
  }

  public deleteAdminUser(id: string) {
    const users = this.getStore<any>("demo_admin_users");
    this.setStore("demo_admin_users", users.filter((u: any) => u.id !== id));
    return { success: true };
  }

  public resetUserPassword(userId: string, _newPassword: string) {
    // In demo mode, password reset is acknowledged but not actually enforced
    this.addAuditLog({ action: "PASSWORD_RESET", details: `Password reset for user ID: ${userId}` });
    return { success: true, message: "Password reset successfully (demo mode)" };
  }

  // -------------------------
  // Admin Stats / Reports
  // -------------------------
  public getAdminStats() {
    const visits = this.getStore<any>("demo_visits");
    const patients = this.getStore<any>("demo_patients");
    const users = this.getStore<any>("demo_admin_users");
    const today = new Date().toDateString();
    const todayVisits = visits.filter((v: any) => new Date(v.visitedAt || v.createdAt).toDateString() === today);

    const statusCounts: Record<string, number> = {};
    todayVisits.forEach((v: any) => {
      const s = v.status || "AT_RECEPTION";
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    const roleCounts: Record<string, number> = {};
    users.forEach((u: any) => {
      roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
    });

    return {
      totalPatients: patients.length,
      totalVisits: visits.length,
      totalUsers: users.length,
      todayVisits: todayVisits.length,
      completedToday: todayVisits.filter((v: any) => ["COMPLETED", "CONSULTED", "AT_OPTICAL"].includes(v.status)).length,
      pendingToday: todayVisits.filter((v: any) => ["AT_RECEPTION", "IN_REFRACTION", "REFRACTION_DONE"].includes(v.status)).length,
      withDoctorToday: todayVisits.filter((v: any) => v.status === "WITH_DOCTOR").length,
      visitsStatusGroup: statusCounts,
      usersRoleGroup: roleCounts,
    };
  }

  public getReports(type: string = "patients", page: number = 1, limit: number = 20, search: string = "") {
    if (type === "patients") {
      const patients = this.getStore<any>("demo_patients");
      const filtered = search
        ? patients.filter((p: any) =>
            p.name?.toLowerCase().includes(search.toLowerCase()) ||
            p.mrNumber?.includes(search) ||
            p.contactNumber?.includes(search)
          )
        : patients;
      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const start = (page - 1) * limit;
      return {
        data: filtered.slice(start, start + limit),
        pagination: { total, totalPages, page, limit },
        type,
      };
    } else if (type === "visits") {
      const visits = this.getStore<any>("demo_visits");
      const enriched = visits.map((v: any) => this.populateVisitRelations(v));
      const filtered = search
        ? enriched.filter((v: any) =>
            v.patient?.name?.toLowerCase().includes(search.toLowerCase()) ||
            v.mrNumber?.includes(search) ||
            v.status?.toLowerCase().includes(search.toLowerCase())
          )
        : enriched;
      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const start = (page - 1) * limit;
      return {
        data: filtered.slice(start, start + limit),
        pagination: { total, totalPages, page, limit },
        type,
      };
    }
    return { data: [], pagination: { total: 0, totalPages: 1, page: 1, limit }, type };
  }
}

export const demoDb = new DemoDatabase();
