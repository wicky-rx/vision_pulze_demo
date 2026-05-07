import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toTitleCase(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function calculateAgeFromDob(dob: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const birth = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate());

  if (birth > today) return ""; // future date

  const diffMs = today.getTime() - birth.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "0 days";

  let months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
  if (today.getDate() < birth.getDate()) months -= 1;

  if (months < 1) return `${diffDays} days`;
  if (months < 12) return `${months}mo`;

  const todayMonth = today.getFullYear() * 12 + today.getMonth();
  const birthMonth = birth.getFullYear() * 12 + birth.getMonth();
  const totalMonths = todayMonth - birthMonth;
  const years = Math.floor(totalMonths / 12);
  return `${years}y`;
}

export function calculateWaitTime(visitedAt: string | Date | undefined | null): string {
  if (!visitedAt) return "—";
  const start = new Date(visitedAt);
  if (isNaN(start.getTime())) return "—";
  
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  
  if (diffMin < 0) return "0m";
  if (diffMin < 60) return `${diffMin}m`;
  
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return `${hours}h ${mins}m`;
}

export function parseDDMMYYYY(raw: string): Date | null {
  const parts = raw.trim().split("/");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy || yyyy < 1900) return null;
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  return d;
}

export function getPatientAgeString(patient: any): string {
  if (patient?.dob) return calculateAgeFromDob(new Date(patient.dob));
  return patient?.age || "—";
}

export function getPatientAgeNumber(patient: any): number {
  if (patient?.dob) {
    const dob = new Date(patient.dob);
    const now = new Date();
    const todayMonth = now.getFullYear() * 12 + now.getMonth();
    const birthMonth = dob.getFullYear() * 12 + dob.getMonth();
    return Math.floor((todayMonth - birthMonth) / 12);
  }
  return patient?.age ? parseInt(patient.age, 10) || 0 : 0;
}

export function truncateFileName(name: string, maxLength: number = 36) {
  if (!name || name.length <= maxLength) return name;
  const lastDotIndex = name.lastIndexOf('.');
  if (lastDotIndex === -1) return name.substring(0, maxLength - 3) + "...";
  
  const extension = name.substring(lastDotIndex);
  const nameWithoutExtension = name.substring(0, lastDotIndex);
  
  // Show start and end of filename
  const charsToShow = maxLength - extension.length - 3; // 3 for ellipsis
  if (charsToShow <= 3) return name.substring(0, maxLength - 3) + "...";
  
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);
  
  return (
    nameWithoutExtension.substring(0, frontChars) +
    "..." +
    nameWithoutExtension.substring(nameWithoutExtension.length - backChars) +
    extension
  );
}

export function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
export function calculateSessionSlot(patient: any, doctorsList: any[]): string | null {
  if (!patient?.appointment?.timeSlot || !patient?.consultingDoctorId || !doctorsList?.length) return null;
  const doc = doctorsList.find(d => d.id === patient.consultingDoctorId);
  if (!doc?.schedules) return null;

  const today = new Date().getDay();
  const sortedSlots = doc.schedules
    .filter((s: any) => s.dayOfWeek === today)
    .sort((a: any, b: any) => {
      const [ah, am] = a.startTime.split(":").map(Number);
      const [bh, bm] = b.startTime.split(":").map(Number);
      return (ah * 60 + am) - (bh * 60 + bm);
    });

  const index = sortedSlots.findIndex((s: any) => `${s.startTime}-${s.endTime}` === patient.appointment.timeSlot);
  return index !== -1 ? `S${index + 1}` : null;
}
