import { useState, useEffect } from "react";
import { ChevronRight, Clock, Users, Pencil, Calendar as CalendarIcon, Upload, Trash2, FileText, Loader2, Check, AlertTriangle, Zap, Image as ImageIcon, ChevronDown, ChevronUp, Stethoscope, Crosshair, Glasses, Pill } from "lucide-react";
import { ScanReportGallery } from "./ScanReportGallery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { getPatientAgeString, getPatientAgeNumber, calculateAgeFromDob, calculateWaitTime, parseDDMMYYYY, truncateFileName, formatFileSize } from "@/lib/utils";
import { statusLabels, statusColors, type PatientStatus, type Patient } from "@/data/mockData";
import { API_BASE_URL } from "@/config";
import { useToast } from "@/components/ui/use-toast";
import { io } from "socket.io-client";
import { TN_PLACES } from "@/data/tnPlaces";
import { formatToAMPM } from "@/lib/dateUtils";


type Filter = "all" | "in-refraction" | "with-doctor" | "completed";

const filterMap: Record<Filter, PatientStatus[] | null> = {
  all: null,
  "in-refraction": ["optometrist"],
  "with-doctor": ["doctor", "refraction_done"],
  completed: ["consulted", "completed", "optical", "pharmacy"],
};

const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka",
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const TN_DISTRICTS = [
  "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul",
  "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur", "Krishnagiri", "Madurai",
  "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai",
  "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni",
  "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur",
  "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"
];

// Maps backend VisitStatus enum values → frontend PatientStatus keys
const backendStatusMap: Record<string, PatientStatus> = {
  // Supports both lowercased and original backend enum names
  at_reception:  "reception",
  AT_RECEPTION:   "reception",
  in_refraction: "optometrist",
  IN_REFRACTION:  "optometrist",
  refraction_done: "refraction_done",
  REFRACTION_DONE: "refraction_done",
  with_doctor:   "doctor",
  WITH_DOCTOR:    "doctor",
  consulted:     "consulted",
  CONSULTED:      "consulted",
  at_optical:    "optical",
  AT_OPTICAL:     "optical",
  completed:     "completed",
  COMPLETED:      "completed",
};

interface EditFormData {
  name: string;
  age: string;
  dob: string;
  dobTextValue: string;
  dobPickerValue: string;
  gender: string;
  doorNo: string;
  street: string;
  area: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  contactNumber: string;
  secondaryContact: string;
  co: string;
  doctorId?: string;
  doctorName?: string;
  specializationId?: string;
  address?: string;
  timeSlot?: string;
}

export function PatientQueue({
  selectedPatientId,
  onSelectPatient,
  doctors: externalDoctors,
  setDoctors: setExternalDoctors
}: {
  selectedPatientId?: string,
  onSelectPatient?: (patient: Patient) => void,
  doctors?: any[],
  setDoctors?: (docs: any[]) => void
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isQueueExpanded, setIsQueueExpanded] = useState(false);
  const { toast } = useToast();

  // Role-based visibility
  const [userRole, setUserRole] = useState<string>("");

  // Edit modal state
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    name: "",
    age: "",
    dob: "",
    dobTextValue: "",
    dobPickerValue: "",
    gender: "",
    doorNo: "",
    street: "",
    area: "",
    city: "",
    district: "",
    state: "Tamil Nadu",
    pincode: "",
    contactNumber: "",
    secondaryContact: "",
    co: "",
    doctorId: "",
    doctorName: "",
    specializationId: "",
    address: "",
  });
  
  const [internalDoctors, setInternalDoctors] = useState<any[]>([]);
  const doctors = externalDoctors || internalDoctors;
  const setDoctors = setExternalDoctors || setInternalDoctors;
  
  const [editLoading, setEditLoading] = useState(false);
  const [districtPopoverOpen, setDistrictPopoverOpen] = useState(false);
  const [cityPopoverOpen, setCityPopoverOpen] = useState(false);
  const [statePopoverOpen, setStatePopoverOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Upload modal state
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);



  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/patients/queue`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch patients");
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Invalid patients data format");

      const today = new Date().toDateString();
      const todayPatients = data.filter((p: any) => {
        const dateString = p.visitedAt || p.createdAt || p.registeredAt || (p.patient && p.patient.createdAt);
        if (!dateString) return true; // Fallback to include if no date field is found
        return new Date(dateString).toDateString() === today;
      });

      const mappedPatients = todayPatients.map((p: any) => {
        // Normalise backend VisitStatus (e.g. "AT_RECEPTION") -> frontend key (e.g. "reception")
        const rawStatus = (p.status ?? "").toLowerCase();
        const normalizedStatus: PatientStatus =
          backendStatusMap[rawStatus] ?? "reception";

        return {
          ...p,
          id: p.id || p._id,
          status: normalizedStatus,
          waitTime: calculateWaitTime(p.visitedAt),
          name: p.patient?.name || "Unknown Patient",
          mrNumber: p.mrNumber != null ? p.mrNumber.toString() : (p.patientId != null ? p.patientId.toString() : "—"),
          age: p.patient?.dob || p.dob ? getPatientAgeString(p.patient || p) : p.patient?.age || p.age || "—",
          dob: p.patient?.dob || p.dob || "",
          gender: p.patient?.gender || p.gender || "",
          doorNo: p.patient?.doorNo || p.doorNo || "",
          street: p.patient?.street || p.street || "",
          area: p.patient?.area || p.area || "",
          city: p.patient?.city || p.city || "",
          district: p.patient?.district || p.district || "",
          state: p.patient?.state || p.state || "Tamil Nadu",
          pincode: p.patient?.pincode || p.pincode || "",
          address: p.patient?.address || p.address || "",
          contactNumber: p.patient?.contactNumber || p.mobile || p.contactNumber || "—",
          secondaryContact: p.patient?.secondaryContact || p.secondaryContact || "",
          co: p.patient?.co || p.co || "",
          registeredAt: p.visitedAt ? new Date(p.visitedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—",
          opId: p.opId || (p.mrNumber ? `OP-${p.mrNumber.toString().slice(-4)}` : "—"),
          appointmentId: p.consultation?.appointmentId || p.appointmentId || "",
          appointment: p.patient?.appointments?.[0] || p.appointment || null,
          consultingDoctorId: p.consultingDoctorId || "",
          consultingDoctorName: p.consultingDoctorName || "",
        };
      });

      setPatients(mappedPatients);
      if (selectedPatientId && onSelectPatient) {
        const updated = mappedPatients.find(p => p.id === selectedPatientId);
        if (updated) {
          onSelectPatient(updated);
        }
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Read user role from session
    let currentRole = "";
    try {
      const session = localStorage.getItem("user_session");
      if (session) {
        const { role } = JSON.parse(session);
        currentRole = role || "";
        setUserRole(currentRole);
      }
    } catch {
      setUserRole("");
    }

    fetchPatients();

    // 1. Establish connection to your backend
    const socket = io(API_BASE_URL);

    // 2. Listen for the 'queue_updated' event from backend
    socket.on('queue_updated', () => {
      fetchPatients();
    });

    const handlePatientUpdate = () => {
      fetchPatients();
      fetchDocs();
    };


    window.addEventListener("patientQueueUpdated", handlePatientUpdate);
    window.addEventListener("doctorSchedulesUpdated", handlePatientUpdate);
    
    const fetchDocs = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/api/admin/doctors`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setDoctors(data);
        }
      } catch (e) { console.error("Error fetching doctors", e); }
    };
    
    if (currentRole === "RECEPTIONIST" || currentRole === "ADMIN") {
      fetchDocs();
    }

    return () => {
      window.removeEventListener("patientQueueUpdated", handlePatientUpdate);
      socket.disconnect();
    };
  }, []);


  const canEdit = userRole === "RECEPTIONIST" || userRole === "ADMIN";

  const openEditModal = (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent row click bubbling
    setEditingPatient(patient);
    let dobTxt = "";
    let dobPck = "";
    if (patient.dob) {
      try {
        const [y, m, d] = (patient.dob as string).split("-");
        if (y && m && d) {
          dobTxt = `${d}/${m}/${y}`;
          dobPck = patient.dob;
        }
      } catch (e) {}
    }

    setEditFormData({
      name: patient.name || "",
      age: String(patient.age ?? ""),
      dob: patient.dob || "",
      dobTextValue: dobTxt,
      dobPickerValue: dobPck,
      gender: (patient as any).gender || "",
      doorNo: (patient as any).doorNo || "",
      street: (patient as any).street || "",
      area: (patient as any).area || "",
      city: (patient as any).city || "",
      district: (patient as any).district || "",
      state: (patient as any).state || "Tamil Nadu",
      pincode: (patient as any).pincode || "",
      contactNumber: (patient as any).contactNumber || (patient as any).mobile || "",
      secondaryContact: (patient as any).secondaryContact || "",
      co: (patient as any).co || "",
      address: (patient as any).address || "", // keep for display/fallback
      doctorId: (patient as any).consultingDoctorId || "",
      doctorName: (patient as any).consultingDoctorName || "",
      specializationId: "", // will be set if doctor is pre-assigned and found
      timeSlot: (patient as any).appointment?.timeSlot || "",
    } as any);
  };

  const handleEditField = (field: keyof EditFormData, value: string) => {
    let filteredValue = value;
    
    if (field === "name" || field === "co") {
      // Name and Care Of should not accept numbers
      filteredValue = value.replace(/[0-9]/g, "");
    } else if (field === "contactNumber" || field === "secondaryContact") {
      // Mobile numbers should only accept digits and max 10
      filteredValue = value.replace(/\D/g, "").slice(0, 10);
    } else if (field === "pincode") {
      // PIN should only accept digits and max 6
      filteredValue = value.replace(/\D/g, "").slice(0, 6);
    }

    setEditFormData((prev) => ({ ...prev, [field]: filteredValue }));
  };


  const applyEditDob = (dob: Date | null, source: "picker" | "text") => {
    if (!dob) {
      setEditFormData(prev => ({ ...prev, dob: "", age: "", dobPickerValue: "", dobTextValue: "" }));
      return;
    }
    const today = new Date();
    const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dobNorm = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate());
    
    if (dobNorm > todayNorm) return;

    const ageStr = calculateAgeFromDob(dob);
    const dobIso = `${dob.getFullYear()}-${String(dob.getMonth() + 1).padStart(2, "0")}-${String(dob.getDate()).padStart(2, "0")}`;
    
    setEditFormData((prev) => {
      let txt = prev.dobTextValue;
      let pck = prev.dobPickerValue;
      
      if (source === "picker") {
        const dd = String(dob.getDate()).padStart(2, "0");
        const mm = String(dob.getMonth() + 1).padStart(2, "0");
        const yyyy = dob.getFullYear();
        txt = `${dd}/${mm}/${yyyy}`;
        pck = dobIso;
      } else {
        const yyyy = dob.getFullYear();
        const mm = String(dob.getMonth() + 1).padStart(2, "0");
        const dd = String(dob.getDate()).padStart(2, "0");
        pck = `${yyyy}-${mm}-${dd}`;
      }
      return { ...prev, age: ageStr, dob: dobIso, dobTextValue: txt, dobPickerValue: pck };
    });
  };

  const handleEditDobTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^\d/]/g, "");
    if (val.length === 2 && !val.includes("/")) val += "/";
    else if (val.length === 5 && val.split("/").length === 2) val += "/";
    
    setEditFormData(prev => ({ ...prev, dobTextValue: val }));

    if (val.length === 10) {
      const parsed = parseDDMMYYYY(val);
      if (parsed) applyEditDob(parsed, "text");
    } else if (val === "") {
      applyEditDob(null, "text");
    }
  };

  const handleEditSubmit = async () => {
    if (!editingPatient) return;

    if (!editFormData.name || (!editFormData.age && !editFormData.dob) || !editFormData.gender || !editFormData.contactNumber) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields. DOB or Age must be provided.",
      });
      return;
    }

    const nameRegex = /^[a-zA-Z\s\.\-']+$/;
    if (!nameRegex.test(editFormData.name)) {
      toast({
        variant: "destructive",
        title: "Invalid Name",
        description: "Name can only contain letters, spaces, dots, hyphens, and apostrophes. Numbers are not allowed.",
      });
      return;
    }

    // Mobile validation: Exact 10 digits
    if (editFormData.contactNumber.length !== 10) {
      toast({
        variant: "destructive",
        title: "Invalid Mobile Number",
        description: "Mobile number must be exactly 10 digits.",
      });
      return;
    }

    // PIN validation: Exact 6 digits (if provided)
    if (editFormData.pincode && editFormData.pincode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid PIN Code",
        description: "PIN code must be exactly 6 digits.",
      });
      return;
    }

    // Secondary contact validation: Exact 10 digits (if provided)
    if (editFormData.secondaryContact && editFormData.secondaryContact.length !== 10) {
      toast({
        variant: "destructive",
        title: "Invalid Secondary Contact",
        description: "Secondary contact must be exactly 10 digits.",
      });
      return;
    }


    try {
      setEditLoading(true);
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_BASE_URL}/api/patients/${editingPatient.mrNumber}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editFormData.name,
          dob: editFormData.dob,
          gender: editFormData.gender,
          doorNo: editFormData.doorNo,
          street: editFormData.street,
          area: editFormData.area,
          city: editFormData.city,
          district: editFormData.district,
          state: editFormData.state,
          pincode: editFormData.pincode,
          contactNumber: editFormData.contactNumber,
          secondaryContact: editFormData.secondaryContact,
          co: editFormData.co,
          doctorId: editFormData.doctorId || undefined,
          doctorName: editFormData.doctorName || undefined,
          timeSlot: editFormData.timeSlot || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to update patient");
      }

      // Update local patient state immediately
      setPatients((prev) =>
        prev.map((p) =>
          p.id === editingPatient.id
            ? {
                ...p,
                name: editFormData.name,
                age: editFormData.age as any,
                dob: editFormData.dob as any,
                gender: editFormData.gender as any,
                doorNo: editFormData.doorNo as any,
                street: editFormData.street as any,
                area: editFormData.area as any,
                city: editFormData.city as any,
                district: editFormData.district as any,
                state: editFormData.state as any,
                pincode: editFormData.pincode as any,
                address: editFormData.city || editFormData.address || "", // legacy fallback
                contactNumber: editFormData.contactNumber as any,
                secondaryContact: editFormData.secondaryContact as any,
                co: editFormData.co as any,
                consultingDoctorId: editFormData.doctorId as any,
                consultingDoctorName: editFormData.doctorName as any,
              }
            : p
        )
      );

      toast({
        title: "Patient Updated",
        description: `${editFormData.name}'s details have been updated successfully.`,
      });

      setEditingPatient(null);
    } catch (error: any) {
      console.error("Edit patient error:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "An error occurred while updating the patient.",
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteVisit = () => {
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteVisit = async () => {
    if (!editingPatient?.id) return;
    
    try {
      setEditLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/patients/visits/${editingPatient.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to remove patient from queue");

      toast({
        title: "Removed from Queue",
        description: "Patient has been successfully removed from today's visit list."
      });
      
      setEditingPatient(null);
      fetchPatients(); // Local refresh
      window.dispatchEvent(new CustomEvent("appointmentUpdated")); // Refresh side panels
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Remove Failed",
        description: e.message
      });
    } finally {
      setEditLoading(false);
      setDeleteConfirmOpen(false);
    }
  };



  const filtered = filter === "all"
    ? patients
    : patients.filter((p) => filterMap[filter]?.includes(p.status));

  const getSlotLabel = (patient: any) => {
    if (!patient.appointment?.timeSlot || !patient.consultingDoctorId) return null;
    const doc = doctors.find(d => d.id === patient.consultingDoctorId);
    if (!doc?.schedules) return null;
    
    const now = new Date();
    const today = now.getDay();
    const todaySlots = doc.schedules
      .filter((s: any) => s.dayOfWeek === today)
      .sort((a: any, b: any) => {
        const [ah, am] = a.startTime.split(":").map(Number);
        const [bh, bm] = b.startTime.split(":").map(Number);
        return (ah * 60 + am) - (bh * 60 + bm);
      });
      
    const index = todaySlots.findIndex((s: any) => `${s.startTime}-${s.endTime}` === patient.appointment.timeSlot);
    if (index === -1) return null;
    return `S${index + 1}`;
  };

  const displayPatients = filtered;

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: patients.length },
    { id: "in-refraction", label: "Refraction", count: patients.filter((p) => p.status === "optometrist").length },
    { id: "with-doctor", label: "Doctor", count: patients.filter((p) => ["doctor", "refraction_done"].includes(p.status)).length },
    { id: "completed", label: "Completed", count: patients.filter((p) => ["consulted", "completed", "optical", "pharmacy"].includes(p.status)).length },
  ];

  return (
    <>
      <div className={cn("w-full lg:w-[320px] border-b lg:border-b-0 lg:border-r border-border bg-card flex flex-col shrink-0 static lg:sticky top-4 lg:h-[calc(100vh-100px)] rounded-t-xl lg:rounded-l-3xl overflow-hidden shadow-sm transition-all", isQueueExpanded ? "h-auto max-h-[60vh]" : "h-auto lg:h-[calc(100vh-100px)]")}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-600" />
              <h3 className="text-sm font-semibold text-foreground">Live Queue</h3>
              <Badge className="ml-auto lg:ml-2 bg-orange-50 text-orange-600 border-0 text-[11px]">
                {patients.length} patients
              </Badge>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-8 w-8 lg:hidden"
              onClick={() => setIsQueueExpanded(!isQueueExpanded)}
            >
              {isQueueExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

          {/* Filter tabs */}
          <div className={cn("lg:flex gap-1 p-0.5 bg-muted rounded-lg", !isQueueExpanded && "hidden")}>
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "flex-1 px-2 py-1.5 text-[11px] font-bold uppercase tracking-tight rounded-none transition-all",
                  filter === f.id
                    ? "bg-orange-600 text-white shadow-md"
                    : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Patient list */}
        <div className={cn("flex-1 overflow-y-auto scrollbar-thin", !isQueueExpanded && "hidden lg:block")}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium text-muted-foreground">Loading queue...</p>
            </div>
          ) : displayPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No patients</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Queue is empty for this filter</p>
            </div>
          ) : (
            <div className="py-1">
              {displayPatients.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => onSelectPatient?.(patient)}
                  className={cn(
                    "w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left group cursor-pointer border-l-4 relative",
                    selectedPatientId === patient.id
                      ? "bg-orange-50/50 border-l-orange-600"
                      : "border-l-transparent"
                  )}
                >
                  {/* Status dot */}
                  <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", statusColors[patient.status])} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{patient.name}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <span className="text-[11px] font-mono text-muted-foreground">MRN-{patient.mrNumber?.toString()}</span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">Age {patient.age}</span>
                        <span className="text-[10px] text-muted-foreground/50 shrink-0">•</span>
                        <span className="text-[10px] text-muted-foreground truncate" title={patient.address}>{patient.address || "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0 pl-2 pr-2">
                    <div className="flex items-center gap-1.5">
                      {(() => {
                        const slot = getSlotLabel(patient);
                        if (!slot) return null;
                        return (
                          <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1 py-0.5 rounded-sm border border-orange-200/50 shrink-0">
                            {slot}
                          </span>
                        );
                      })()}
                      <span className="text-[10px] font-medium bg-muted text-muted-foreground px-1 py-0.5 rounded-sm border shrink-0">
                        Token-{patient.tokenNumber || "—"}
                      </span>
                    </div>
                    <Badge
                      className={cn(
                        "text-[9px] border-0 px-2 py-0 h-5 font-bold text-white opacity-100 rounded-none w-24 flex items-center justify-center uppercase tracking-tighter shadow-sm",
                        statusColors[patient.status as PatientStatus] || "bg-slate-500"
                      )}
                    >
                      {statusLabels[patient.status as PatientStatus] || patient.status}
                    </Badge>
                    {patient.consultingDoctorName && (
                      <span className="text-[9px] text-muted-foreground/60 italic font-medium truncate max-w-[140px] text-right">
                        {patient.consultingDoctorName?.toLowerCase().startsWith('dr.') ? "" : "Dr. "}{patient.consultingDoctorName}
                      </span>
                    )}
                  </div>

                  {/* Absolute Edit button — only for RECEPTIONIST / ADMIN */}
                  {canEdit ? (
                    <button
                      onClick={(e) => openEditModal(patient, e)}
                      title="Edit patient details"
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 shadow-sm border border-border text-orange-600 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 z-10"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 shadow-sm border border-border text-orange-600 opacity-0 group-hover:opacity-100 transition-all z-10">
                      {userRole === "OPTOMETRIST" ? (
                        <Crosshair className="w-4 h-4" />
                      ) : userRole === "DOCTOR" ? (
                        <Stethoscope className="w-4 h-4" />
                      ) : userRole === "OPTICALS" ? (
                        <Glasses className="w-4 h-4" />
                      ) : userRole === "PHARMACIST" ? (
                        <Pill className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Patient Modal */}
      <Dialog open={!!editingPatient} onOpenChange={(open) => { if (!open) setEditingPatient(null); }}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                <Pencil className="w-4 h-4 text-orange-600" />
              </div>
              Edit Patient Details
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {/* Full Name */}
              <div className="col-span-1 sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-medium">Full Name *</Label>
                <Input
                  placeholder="Patient's full name"
                  value={editFormData.name}
                  onChange={(e) => handleEditField("name", e.target.value)}
                  disabled={editLoading}
                />
              </div>

              {/* DOB row: date picker + manual text entry */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Date of Birth</Label>
                <div className="relative">
                  <Input
                    placeholder="DD/MM/YYYY"
                    value={editFormData.dobTextValue}
                    onChange={handleEditDobTextChange}
                    maxLength={10}
                    className="pr-20 font-mono text-sm"
                    title="Type date in DD/MM/YYYY format or choose from calendar"
                    disabled={editLoading}
                  />
                  <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                    {editFormData.age && editFormData.age !== "—" && (
                      <span className="text-[9px] font-bold text-muted-foreground bg-muted/80 px-1 py-0.5 rounded border shadow-sm">
                        {editFormData.age}
                      </span>
                    )}
                  </div>
                  <Popover modal={true}>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-0 top-0 h-9 px-3 py-2 hover:bg-transparent"
                        type="button"
                        disabled={editLoading}
                      >
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        captionLayout="dropdown-buttons"
                        fromYear={1900}
                        toYear={new Date().getFullYear()}
                        classNames={{
                          caption_label: "hidden",
                        }}
                        selected={editFormData.dobPickerValue ? new Date(editFormData.dobPickerValue) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            applyEditDob(date, "picker");
                          } else {
                            applyEditDob(null, "picker");
                          }
                        }}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Gender *</Label>
                <Select
                  value={editFormData.gender}
                  onValueChange={(val) => handleEditField("gender", val)}
                  disabled={editLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">{editFormData.age && parseInt(editFormData.age, 10) < 18 ? "Master" : "Male"}</SelectItem>
                    <SelectItem value="Female">{editFormData.age && parseInt(editFormData.age, 10) < 18 ? "Miss" : "Female"}</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Address Grid */}
              <div className="col-span-1 sm:col-span-2 space-y-3">
                <Label className="text-xs font-medium">Address *</Label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <Input
                    placeholder="Door No"
                    className="h-8 text-[11px]"
                    value={editFormData.doorNo}
                    onChange={(e) => handleEditField("doorNo", e.target.value)}
                  />
                  <div className="col-span-1 sm:col-span-2 lg:col-span-2">
                    <Input
                      placeholder="Street"
                      className="h-8 text-[11px]"
                      value={editFormData.street}
                      onChange={(e) => handleEditField("street", e.target.value)}
                    />
                  </div>
                  <Input
                    placeholder="Area"
                    className="h-8 text-[11px]"
                    value={editFormData.area}
                    onChange={(e) => handleEditField("area", e.target.value)}
                  />
                  <div className="relative">
                    <Input
                      placeholder="City"
                      className="h-8 text-[11px]"
                      value={editFormData.city}
                      onChange={(e) => handleEditField("city", e.target.value)}
                      onFocus={() => setCityPopoverOpen(true)}
                      onBlur={() => setTimeout(() => setCityPopoverOpen(false), 200)}
                      disabled={editLoading}
                    />
                    {cityPopoverOpen && editFormData.city.length >= 1 && (
                      <div className="absolute top-full left-0 w-full z-50 mt-1 bg-white border border-border rounded-md shadow-xl max-h-40 overflow-y-auto">
                        {TN_PLACES.filter(d => d.toLowerCase().includes(editFormData.city.toLowerCase())).map((ct) => (
                          <div
                            key={ct}
                            className="px-3 py-2 text-[10px] hover:bg-accent hover:text-accent-foreground cursor-pointer border-b border-border/50 last:border-0"
                            onMouseDown={(e) => { e.preventDefault(); handleEditField("city", ct); setCityPopoverOpen(false); }}
                          >
                            {ct}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="District"
                      className="h-8 text-[11px]"
                      value={editFormData.district}
                      onChange={(e) => handleEditField("district", e.target.value)}
                      onFocus={() => setDistrictPopoverOpen(true)}
                      onBlur={() => setTimeout(() => setDistrictPopoverOpen(false), 200)}
                      disabled={editLoading}
                    />
                    {districtPopoverOpen && editFormData.district.length >= 1 && (
                      <div className="absolute top-full left-0 w-full z-50 mt-1 bg-white border border-border rounded-md shadow-xl max-h-40 overflow-y-auto">
                        {TN_DISTRICTS.filter(d => d.toLowerCase().includes(editFormData.district.toLowerCase())).map((dist) => (
                          <div
                            key={dist}
                            className="px-3 py-2 text-[10px] hover:bg-accent hover:text-accent-foreground cursor-pointer border-b border-border/50 last:border-0"
                            onMouseDown={(e) => { e.preventDefault(); handleEditField("district", dist); setDistrictPopoverOpen(false); }}
                          >
                            {dist}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="State"
                      className="h-8 text-[11px]"
                      value={editFormData.state}
                      onChange={(e) => handleEditField("state", e.target.value)}
                      onFocus={() => setStatePopoverOpen(true)}
                      onBlur={() => setTimeout(() => setStatePopoverOpen(false), 200)}
                      disabled={editLoading}
                    />
                    {statePopoverOpen && editFormData.state.length >= 1 && (
                      <div className="absolute top-full left-0 w-full z-50 mt-1 bg-white border border-border rounded-md shadow-xl max-h-40 overflow-y-auto">
                        {INDIAN_STATES.filter(s => s.toLowerCase().includes(editFormData.state.toLowerCase())).map((st) => (
                          <div
                            key={st}
                            className="px-3 py-2 text-[10px] hover:bg-accent hover:text-accent-foreground cursor-pointer border-b border-border/50 last:border-0"
                            onMouseDown={(e) => { e.preventDefault(); handleEditField("state", st); setStatePopoverOpen(false); }}
                          >
                            {st}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Input
                    placeholder="PIN"
                    className="h-8 text-[11px]"
                    value={editFormData.pincode}
                    onChange={(e) => handleEditField("pincode", e.target.value)}
                    maxLength={6}
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Mobile Number *</Label>
                <Input
                  className="h-9"
                  placeholder="10-digit mobile number"
                  value={editFormData.contactNumber}
                  onChange={(e) => handleEditField("contactNumber", e.target.value)}
                  disabled={editLoading}
                  maxLength={10}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Secondary Contact</Label>
                <Input
                  className="h-9"
                  placeholder="Optional 10-digit mobile"
                  value={editFormData.secondaryContact}
                  onChange={(e) => handleEditField("secondaryContact", e.target.value)}
                  disabled={editLoading}
                  maxLength={10}
                />
              </div>

              {/* Care Of & Doctor */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Care Of (C/o)</Label>
                <Input
                  className="h-9"
                  placeholder="Guardian/Relative name"
                  value={editFormData.co}
                  onChange={(e) => handleEditField("co", e.target.value)}
                  disabled={editLoading}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Consulting Personal</Label>
                <Select
                  value={editFormData.doctorId}
                  onValueChange={(val) => {
                    const doc = doctors.find(d => d.id === val);
                    setEditFormData(prev => ({ ...prev, doctorId: val, doctorName: doc?.name, timeSlot: "" }));
                  }}
                  disabled={editLoading}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select Doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map(doc => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.name} - {doc.specialization?.name || "General"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Time Slot & Scans */}
              <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                {editFormData.doctorId && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Time Slot</Label>
                    <Select
                      value={editFormData.timeSlot}
                      onValueChange={(val) => handleEditField("timeSlot", val)}
                      disabled={editLoading}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select Slot" />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const doc = doctors.find(d => d.id === editFormData.doctorId);
                          const daySlots = (doc?.schedules || [])
                            .filter((s: any) => s.dayOfWeek === new Date().getDay())
                            .sort((a, b) => a.startTime.localeCompare(b.startTime));
                          
                          const now = new Date();
                          const currentTimeNum = now.getHours() * 60 + now.getMinutes();

                          if (daySlots.length === 0) {
                            return <div className="py-2 px-3 text-[10px] text-muted-foreground italic text-center">No slots configured for today</div>;
                          }

                          return daySlots.map((s, idx) => {
                            const val = `${s.startTime}-${s.endTime}`;
                            const [eh, em] = s.endTime.split(":").map(Number);
                            const isEnded = (eh * 60 + em) <= currentTimeNum;
                            
                            return (
                              <SelectItem key={s.id} value={val} className="text-xs group focus:bg-orange-600 focus:text-white">
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "px-1 py-0.5 text-[9px] font-black rounded-sm border",
                                    isEnded ? "border-slate-200 text-slate-400 bg-slate-50" : "bg-orange-100 text-orange-700 border-orange-200 group-focus:bg-white group-focus:text-orange-600"
                                  )}>S{idx + 1}</span>
                                  <span className={cn(isEnded && "text-muted-foreground line-through opacity-50")}>
                                    {formatToAMPM(s.startTime)} - {formatToAMPM(s.endTime)}
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          });
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium opacity-0 sm:block hidden">Scan Gallery</Label>
                  <ScanReportGallery 
                    mrNumber={editingPatient?.mrNumber} 
                    visitId={editingPatient?.id}
                    variant="compact"
                    showButton={false}
                    allowUpload={true} 
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 border-t border-border bg-orange-50/30 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <ScanReportGallery 
                 mrNumber={editingPatient?.mrNumber} 
                 visitId={editingPatient?.id}
                 variant="compact"
                 showStatus={false}
                 allowUpload={true}
              />
              {canEdit && (
                <Button
                  variant="outline"
                  onClick={handleDeleteVisit}
                  disabled={editLoading}
                  className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/5 hover:text-destructive h-9 text-[10px] font-bold uppercase tracking-wider"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove from Queue
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="ghost"
                onClick={() => setEditingPatient(null)}
                disabled={editLoading}
                className="px-6 h-10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditSubmit}
                disabled={editLoading}
                className="bg-orange-50 hover:bg-orange-600 text-orange-600 hover:text-white border border-orange-200 px-8 h-10 font-bold shadow-md transition-all"
              >
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Remove Patient?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to remove <strong>{editingPatient?.name}</strong> from today's visit queue?
              <br /><br />
              All data entered for <span className="underline decoration-destructive/30">this specific visit</span> will be permanently deleted, but the main patient record will remain untouched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="hover:bg-slate-100 border-none h-11 px-6">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteVisit();
              }}
              className="bg-destructive hover:bg-destructive/90 text-white border-none h-11 px-8 font-bold shadow-lg shadow-destructive/20"
            >
              Confirm Removal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}
