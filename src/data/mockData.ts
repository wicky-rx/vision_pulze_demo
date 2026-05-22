export type PatientStatus = "reception" | "optometrist" | "refraction_done" | "doctor" | "consulted" | "optical" | "pharmacy" | "completed";


export interface Patient {
  id: string;
  mrNumber: string;
  tokenNumber?: string | number;
  name: string;
  co?: string;
  age: number | string;
  gender: "Male" | "Female" | "Other";
  contactNumber: string;
  secondaryContact?: string;
  doorNo?: string;
  street?: string;
  area?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  address: string;
  dob: string;
  lastVisit?: string;
  status: PatientStatus;
  waitTime: string;
  registeredAt: string;
  hasActiveVisitToday?: boolean;
  lastVisitStatus?: string;
  appointmentId?: string;
  consultingDoctorName?: string;
  appointment?: any;
  consultation?: any;
  optical?: any;
  refraction?: any;
  mobile?: string;
  parentMrNumber?: string;
  relationshipType?: string;
  complaint?: string;
}

export const mockPatients: Patient[] = [
  {
    id: "1", mrNumber: "100423", name: "Robert Taylor",
    age: 42, gender: "Male", contactNumber: "9876543210", address: "12, MG Road, Chennai",
    dob: "1979-03-15", lastVisit: "2025-11-20", status: "doctor", waitTime: "32 min",
    registeredAt: "09:15 AM",
  },
  {
    id: "2", mrNumber: "100424", name: "Sarah Jenkins",
    age: 34, gender: "Female", contactNumber: "8765432109", address: "45, Anna Nagar, Chennai",
    dob: "1992-07-22", lastVisit: "2026-01-10", status: "optometrist", waitTime: "18 min",
    registeredAt: "09:30 AM",
  },
  {
    id: "3", mrNumber: "100425", name: "David Miller",
    age: 62, gender: "Male", contactNumber: "7654321098", address: "78, T. Nagar, Chennai",
    dob: "1964-01-08", status: "reception", waitTime: "5 min",
    registeredAt: "09:45 AM",
  },
  {
    id: "4", mrNumber: "100426", name: "Alice Johnson",
    age: 55, gender: "Female", contactNumber: "6543210987", address: "23, Adyar, Chennai",
    dob: "1971-11-30", lastVisit: "2025-08-05", status: "optical", waitTime: "45 min",
    registeredAt: "08:50 AM",
  },
  {
    id: "5", mrNumber: "100427", name: "Charlie Brown",
    age: 39, gender: "Male", contactNumber: "5432109876", address: "56, Velachery, Chennai",
    dob: "1987-05-12", status: "completed", waitTime: "—",
    registeredAt: "08:30 AM",
  },
  {
    id: "6", mrNumber: "100428", name: "Emily Davis",
    age: 41, gender: "Female", contactNumber: "9345678901", address: "90, Mylapore, Chennai",
    dob: "1985-09-18", status: "reception", waitTime: "2 min",
    registeredAt: "09:55 AM",
  },
  {
    id: "7", mrNumber: "100429", name: "Michael Wilson",
    age: 58, gender: "Male", contactNumber: "8234567890", address: "34, Besant Nagar, Chennai",
    dob: "1968-04-25", lastVisit: "2025-12-01", status: "doctor", waitTime: "28 min",
    registeredAt: "09:10 AM",
  },
];

export const statusLabels: Record<PatientStatus, string> = {
  reception: "At Reception",
  optometrist: "In Refraction",
  refraction_done: "Refraction Done",
  doctor: "With Doctor",
  consulted: "Consulted",
  optical: "At Optical",
  pharmacy: "At Pharmacy",
  completed: "Completed",
};

export const statusColors: Record<PatientStatus, string> = {
  reception: "bg-status-reception",
  optometrist: "bg-status-optometrist",
  refraction_done: "bg-status-refraction-done",
  doctor: "bg-status-doctor",
  consulted: "bg-status-consulted",
  optical: "bg-status-optical",
  pharmacy: "bg-status-pharmacy",
  completed: "bg-status-completed",
};
