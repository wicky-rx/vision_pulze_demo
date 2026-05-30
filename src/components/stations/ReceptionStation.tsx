import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { UserPlus, Search, Calendar as CalendarIcon, Phone, ArrowRight, Printer, Check, ChevronsUpDown, ChevronLeft, ChevronRight, Clock, ClipboardList, Pencil, ChevronDown, History, FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import JsBarcode from "jsbarcode";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { RefractionSummaryView } from './RefractionSummaryView';
import { SharedPrintLayout, preparePrintData } from "./SharedPrintLayout";
import { ConsultationSummaryView } from "./ConsultationSummaryView";
import BarcodeGenerator from "@/components/BarcodeGenerator";
import { type Patient, statusColors, statusLabels, type PatientStatus } from "@/data/mockData";
import { api } from "@/lib/api";

const backendStatusMap: Record<string, PatientStatus> = {
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
import { useToast } from "@/hooks/use-toast";
import { toTitleCase, calculateAgeFromDob, parseDDMMYYYY, getPatientAgeString, getPatientGenderString } from "@/lib/utils";
import { US_CITIES } from "@/data/tnPlaces";
import { DoctorSchedulesPanel } from "@/components/DoctorSchedulesPanel";
import { format, addDays, subDays, startOfToday } from "date-fns";
import { formatToAMPM } from "@/lib/dateUtils";

const ReasonForVisitInput = ({
  value,
  onChange,
  placeholder = "Click to select ocular complaints..."
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) => {
  const complaints = [
    "Review / Followup",
    "Blurred Vision", "Headache", "Irritation", "Dry Eyes", "Eye Pain",
    "Redness", "Watering", "Itching", "Double Vision", "Floaters",
    "Photophobia", "Discharge", "Burning Sensation", "Foreign Body Sensation",
    "Flashes of Light", "Lid Swelling", "Eye Strain"
  ];

  const currentVals = value ? value.split(", ").map(s => s.trim()) : [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="relative cursor-pointer">
          <Input
            placeholder={placeholder}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 pr-8 text-[13px] border-0 border-b border-input rounded-none focus-visible:ring-0 focus-visible:border-b-primary bg-transparent shadow-none cursor-pointer"
          />
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-4 rounded-none border border-slate-200 shadow-xl" align="start">
        <div className="flex items-center justify-between mb-3 pb-1.5 border-b border-slate-100">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Select Ocular Complaints</span>
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[10px] font-bold text-brand hover:underline"
          >
            Clear All
          </button>
        </div>
        <div className="flex flex-wrap gap-2 max-h-[280px] overflow-y-auto pr-1">
          {complaints.map((comp) => {
            const isSelected = currentVals.includes(comp);
            return (
              <button
                key={comp}
                type="button"
                onClick={() => {
                  let nextVals;
                  if (isSelected) {
                    nextVals = currentVals.filter(v => v !== comp);
                  } else {
                    nextVals = [...currentVals, comp];
                  }
                  onChange(nextVals.filter(Boolean).join(", "));
                }}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold tracking-wide uppercase border transition-all active:scale-95",
                  isSelected
                    ? "bg-brand border-brand text-white shadow-sm"
                    : comp === "Review / Followup"
                      ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-800 hover:border-blue-300"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-brand/10 hover:text-brand hover:border-brand/20"
                )}
              >
                {comp}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export function ReceptionStation() {
  const US_STATES = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
    "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
    "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
    "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
    "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
    "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
  ];

  const US_COUNTIES = [
    "Los Angeles County", "Cook County", "Harris County", "Maricopa County", "San Diego County",
    "Orange County", "Miami-Dade County", "Dallas County", "Kings County", "Riverside County",
    "Queens County", "King County", "Clark County", "Tarrant County", "Santa Clara County",
    "Broward County", "Bexar County", "Wayne County", "Alameda County", "Middlesex County"
  ].sort();
  const [showOPCard, setShowOPCard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    co: "",
    age: "",
    gender: "",
    doorNo: "",
    street: "",
    area: "",
    city: "",
    district: "",
    state: "California",
    zip: "",
    contactNumber: "",
    secondaryContact: "",
    relationship: "",
    dob: "",
    mrNumber: "",
    complaint: "",
  });

  const [returningComplaint, setReturningComplaint] = useState("");

  // DOB helper states (also updates formData.dob)
  const [dobPickerValue, setDobPickerValue] = useState(""); // ISO date string for <input type="date">
  const [dobTextValue, setDobTextValue] = useState("");     // Raw DD/MM/YYYY text typed by user
  const [dobError, setDobError] = useState("");             // Inline validation message

  const [isMobileExisting, setIsMobileExisting] = useState(false);
  const [parentMrn, setParentMrn] = useState("");
  const [existingPatientName, setExistingPatientName] = useState("");
  const [patientData, setPatientData] = useState<any>(null);
  const [returningPatients, setReturningPatients] = useState<Patient[]>([]);
  const [todayQueueMrns, setTodayQueueMrns] = useState<Set<string>>(new Set());
  const [loadingReturning, setLoadingReturning] = useState(false);
  const [startingVisitMrn, setStartingVisitMrn] = useState<string | null>(null);
  const [printingOPCardMrn, setPrintingOPCardMrn] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dobPopoverOpen, setDobPopoverOpen] = useState(false);
  const [districtPopoverOpen, setDistrictPopoverOpen] = useState(false);
  const [cityPopoverOpen, setCityPopoverOpen] = useState(false);
  const [statePopoverOpen, setStatePopoverOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Doctor/Specialization selection states
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");

  // For returning patients doctor selection
  const [isDoctorSelectOpen, setIsDoctorSelectOpen] = useState(false);
  const [assigningPatientMrn, setAssigningPatientMrn] = useState<string | null>(null);

  // Appointment states
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [selectedAppointmentDate, setSelectedAppointmentDate] = useState<Date | undefined>(new Date());
  const [appointmentPatientMrn, setAppointmentPatientMrn] = useState<string | null>(null);
  const [appointmentPatientName, setAppointmentPatientName] = useState<string>("");
  const [appointmentNote, setAppointmentNote] = useState("");
  const [appointmentFollowUpVisitId, setAppointmentFollowUpVisitId] = useState<string | null>(null);
  const [settingAppointment, setSettingAppointment] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [appointmentDialogMode, setAppointmentDialogMode] = useState<"START_VISIT" | "SCHEDULE">("SCHEDULE");

  // Quick-edit patient modal (from returning patients list)
  const [editPatientModalOpen, setEditPatientModalOpen] = useState(false);
  const [editPatientData, setEditPatientData] = useState<any>(null);
  const [editSaving, setEditSaving] = useState(false);
  // Mobile-linked-account detection for the edit modal
  const [editMobileExisting, setEditMobileExisting] = useState(false);
  const [editParentMrn, setEditParentMrn] = useState("");
  const [editExistingName, setEditExistingName] = useState("");
  const [editRelationship, setEditRelationship] = useState("");
  
  // Past Records State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedRecordPatient, setSelectedRecordPatient] = useState<Patient | null>(null);
  const [patientHistory, setPatientHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [printVisit, setPrintVisit] = useState<any>(null);
  const [printType, setPrintType] = useState<string | null>(null);
  const [viewingHistoricalVisit, setViewingHistoricalVisit] = useState<any>(null);
  const [viewingRefractionVisit, setViewingRefractionVisit] = useState<any>(null);

  const { toast } = useToast();

  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintVisit(null);
      setPrintType(null);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handlePrintReport = (visit: any, type: string) => {
    // Prevent printing doctor report/glass/medical if the patient hasn't been attended by the doctor yet
    if (type !== 'refraction' && (visit.status === 'AT_RECEPTION' || visit.status === 'IN_REFRACTION' || visit.status === 'REFRACTION_DONE')) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "This report/prescription cannot be printed because the patient hasn't been attended by the doctor yet."
      });
      return;
    }

    const pData = preparePrintData(visit, selectedRecordPatient);
    if (!pData) return;

    setPrintVisit(pData);
    setPrintType(type);

    const namePart = (pData.patientName || '').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const mrnPart = String(pData.mrNumber || '').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const datePart = new Date().toISOString().split('T')[0];
    const typeLabel = type === 'glass' ? 'Rx_Glass' : type === 'medical' ? 'Rx_Medical' : type === 'refraction' ? 'Refraction_Report' : 'Consultation_Report';
    const oldTitle = document.title;
    document.title = `${namePart}_${mrnPart}_${typeLabel}_${datePart}`;

    setTimeout(() => {
      window.print();
      document.title = oldTitle;
    }, 500);
  };

  // Helper to determine if a doctor is currently active (on-duty within their schedule session)
  const isDoctorActiveNow = (doc: any) => {
    const today = new Date().getDay();
    const now = new Date();
    const currentTimeNum = now.getHours() * 60 + now.getMinutes();
    return doc.schedules?.some((s: any) => {
      if (s.dayOfWeek !== today) return false;
      const [sh, sm] = s.startTime.split(":").map(Number);
      const [eh, em] = s.endTime.split(":").map(Number);
      const startNum = sh * 60 + sm;
      const endNum = eh * 60 + em;
      // Active if within schedule window (with 45 mins buffer)
      return (currentTimeNum >= startNum - 45 && currentTimeNum <= endNum + 45);
    });
  };

  // Sort doctors: on-duty (active now) first, then alphabetical
  const sortedDoctors = [...doctors].sort((a, b) => {
    const aActive = isDoctorActiveNow(a);
    const bActive = isDoctorActiveNow(b);
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return a.name.localeCompare(b.name);
  });

  const onDutySortedDoctors = sortedDoctors.filter((doc) => isDoctorActiveNow(doc));

  // Helper to truncate doctor name to 12 characters max
  const truncateDoctorName = (name: string) => {
    if (!name) return "";
    return name.length > 12 ? name.substring(0, 12) + "..." : name;
  };

  useEffect(() => {
    if (dobPopoverOpen && formData.dob) {
      setCalendarMonth(new Date(formData.dob));
    }
  }, [dobPopoverOpen, formData.dob]);

  const fetchTodayQueueMrns = useCallback(async () => {
    try {
      const data = await api.getQueue();
      if (Array.isArray(data)) {
        setTodayQueueMrns(new Set(data.map((v: { mrNumber: string | number }) => String(v.mrNumber))));
      }
    } catch (e) {
      console.error("Error fetching today queue:", e);
    }
  }, []);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const data = await api.getDoctorSlots();
        setDoctors(data);
      } catch (e) { console.error("Error fetching doctors", e); }
    };
    fetchDocs();
    fetchTodayQueueMrns();

    const handleUpdate = () => {
      fetchDocs();
      fetchTodayQueueMrns();
    };
    window.addEventListener("patientQueueUpdated", handleUpdate);
    window.addEventListener("doctorSchedulesUpdated", handleUpdate);
    return () => {
      window.removeEventListener("patientQueueUpdated", handleUpdate);
      window.removeEventListener("doctorSchedulesUpdated", handleUpdate);
    };
  }, [fetchTodayQueueMrns]);

  useEffect(() => {
    setSelectedTimeSlot("");
  }, [selectedDoctorId, selectedAppointmentDate]);

  const applyDob = useCallback((dob: Date | null, source: "picker" | "text") => {
    setDobError("");
    if (!dob) {
      setFormData((prev) => ({ ...prev, dob: "", age: "" }));
      setDobTextValue("");
      setDobPickerValue("");
      return;
    }
    const today = new Date();
    const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dobNorm = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate());

    if (dobNorm > todayNorm) {
      setDobError("DOB cannot be in the future.");
      return;
    }

    const ageStr = calculateAgeFromDob(dob);
    const dobIso = `${dob.getFullYear()}-${String(dob.getMonth() + 1).padStart(2, "0")}-${String(dob.getDate()).padStart(2, "0")}`;
    const dd = String(dob.getDate()).padStart(2, "0");
    const mm = String(dob.getMonth() + 1).padStart(2, "0");
    const yyyy = dob.getFullYear();
    const dobDisplay = `${dd}/${mm}/${yyyy}`;

    setFormData((prev) => ({ ...prev, age: ageStr, dob: dobIso }));
    setDobTextValue(dobDisplay);
    setDobPickerValue(dobIso);
  }, []);

  const handleDobTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const rawDigits = rawInput.replace(/\D/g, "");
    let formatted = "";

    if (rawDigits.length > 0) {
      formatted = rawDigits.slice(0, 2);
      if (rawDigits.length >= 3) {
        formatted += "/" + rawDigits.slice(2, 4);
      }
      if (rawDigits.length >= 5) {
        formatted += "/" + rawDigits.slice(4, 8);
      }
    }

    setDobTextValue(formatted);
    setDobError("");

    if (formatted.length === 10) {
      const parsed = parseDDMMYYYY(formatted);
      if (parsed) {
        applyDob(parsed, "text");
      } else {
        setDobError("Invalid date. Use DD/MM/YYYY.");
      }
    } else if (formatted.trim() === "") {
      setFormData((prev) => ({ ...prev, dob: "", age: "" }));
      setDobPickerValue("");
    }
  };

  useEffect(() => {
    const checkMobile = async () => {
      const mobile = formData.contactNumber?.trim();
      if (!mobile || mobile.length < 5) {
        setIsMobileExisting(false);
        setParentMrn("");
        setExistingPatientName("");
        return;
      }
      try {
        const data = await api.checkMobile(mobile);
        setIsMobileExisting(!!data.exists);
        if (data.exists && data.patients && data.patients.length > 0) {
          const p = data.patients[0];
          setParentMrn(p.mrNumber.toString());
          setExistingPatientName(p.name);
        } else {
          setParentMrn("");
          setExistingPatientName("");
        }
      } catch (error) {
        console.error("Error checking mobile:", error);
        setIsMobileExisting(false);
      }
    };

    const debounceTimer = setTimeout(checkMobile, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.contactNumber]);

  useEffect(() => {
    const mobile = editPatientData?.contactNumber?.trim();
    const originalMobile = editPatientData?._originalContactNumber?.trim();

    if (!editPatientModalOpen || !mobile || mobile.length < 5) {
      setEditMobileExisting(false);
      setEditParentMrn("");
      setEditExistingName("");
      return;
    }
    if (mobile === originalMobile) {
      setEditMobileExisting(false);
      setEditParentMrn("");
      setEditExistingName("");
      return;
    }

    const checkEditMobile = async () => {
      try {
        const data = await api.checkMobile(mobile);
        const otherPatients = (data.patients || []).filter(
          (p: any) => String(p.mrNumber) !== String(editPatientData?.mrNumber)
        );
        const exists = !!data.exists && otherPatients.length > 0;
        setEditMobileExisting(exists);
        if (exists) {
          setEditParentMrn(String(otherPatients[0].mrNumber));
          setEditExistingName(otherPatients[0].name);
        } else {
          setEditParentMrn("");
          setEditExistingName("");
        }
      } catch {
        setEditMobileExisting(false);
      }
    };

    const timer = setTimeout(checkEditMobile, 500);
    return () => clearTimeout(timer);
  }, [editPatientData?.contactNumber, editPatientData?.mrNumber, editPatientModalOpen]);

  const patientHasVisitToday = useCallback((p: { mrNumber?: string | number; visits?: any[] }) => {
    const mr = p.mrNumber != null ? String(p.mrNumber) : "";
    if (mr && todayQueueMrns.has(mr)) return true;
    return p.visits?.some((v: any) => {
      const visitDate = new Date(v.visitedAt || v.updatedAt || v.createdAt);
      return visitDate.toDateString() === new Date().toDateString();
    });
  }, [todayQueueMrns]);

  useEffect(() => {
    setReturningPatients((prev) =>
      prev.map((p) => ({
        ...p,
        hasActiveVisitToday: patientHasVisitToday(p),
      }))
    );
  }, [todayQueueMrns, patientHasVisitToday]);

  const fetchReturningPatients = useCallback(async (query: string) => {
    const trimmed = query.trim();
    const isNumeric = /^\d+$/.test(trimmed);

    if (isNumeric) {
      if (trimmed.startsWith("20")) {
        if (trimmed.length < 3) {
          setReturningPatients([]);
          return;
        }
      } else {
        if (trimmed.length !== 10) {
          setReturningPatients([]);
          return;
        }
      }
    } else {
      if (trimmed.length < 3) {
        setReturningPatients([]);
        return;
      }
    }

    setLoadingReturning(true);
    try {
      const data = await api.searchPatients(query);
      if (!Array.isArray(data)) {
        setReturningPatients([]);
        return;
      }

      const availablePatients = data.filter((p: any) => {
        if (!p.visits || p.visits.length === 0) return true;
        return p.visits;
      });

      const mapped = availablePatients.map((p: any) => {
        const hasActiveVisitToday = patientHasVisitToday(p);
        return {
          ...p,
          id: p.mrNumber,
          name: p.name || "",
          mrNumber: p.mrNumber || "",
          lastVisit: p.visits && p.visits.length > 0
            ? new Date(p.visits[0].visitedAt || p.visits[0].updatedAt).toLocaleDateString()
            : "No Visits",
          lastVisitStatus: p.visits && p.visits.length > 0 ? p.visits[0].status : null,
          mobile: p.contactNumber || p.mobile || "",
          hasActiveVisitToday: !!hasActiveVisitToday
        };
      });
      setReturningPatients(mapped);
    } catch (error) {
      console.error("Error searching patients:", error);
      setReturningPatients([]);
    } finally {
      setLoadingReturning(false);
    }
  }, [patientHasVisitToday]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => fetchReturningPatients(searchQuery), 500);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, fetchReturningPatients]);

  const handleInputChange = (field: string, value: string) => {
    let filteredValue = value;

    if (field === "name" || field === "co") {
      filteredValue = value.replace(/[0-9]/g, "");
    } else if (field === "contactNumber" || field === "secondaryContact") {
      filteredValue = value.replace(/\D/g, "").slice(0, 10);
    } else if (field === "zip") {
      filteredValue = value.replace(/\D/g, "").slice(0, 5);
    }

    setFormData((prev) => ({ ...prev, [field]: filteredValue }));
  };

  const handleStartNewVisit = async (mrNumber: string) => {
    if (todayQueueMrns.has(String(mrNumber))) {
      toast({
        variant: "destructive",
        title: "Already in today's queue",
        description: "This patient already has a visit today. Complete or remove it before starting another.",
      });
      return;
    }
    setAssigningPatientMrn(mrNumber);
    setReturningComplaint("");
    setSelectedDoctorId("");
    setIsDoctorSelectOpen(true);
  };

  const confirmStartNewVisit = async () => {
    if (!assigningPatientMrn) return;
    if (startingVisitMrn) return;

    const mrNumber = assigningPatientMrn;
    const doctor = doctors.find(d => d.id === selectedDoctorId);

    try {
      setStartingVisitMrn(mrNumber);
      await api.startVisit(mrNumber, {
        doctorId: selectedDoctorId || undefined,
        doctorName: doctor ? doctor.name : undefined,
        timeSlot: selectedTimeSlot || undefined,
        complaint: returningComplaint || undefined
      });

      toast({
        title: "New visit created successfully."
      });

      setIsDoctorSelectOpen(false);
      setAssigningPatientMrn(null);
      setSelectedDoctorId("");
      setReturningComplaint("");

      setReturningPatients(prev => prev.map(p =>
        p.mrNumber === mrNumber ? { ...p, hasActiveVisitToday: true, lastVisitStatus: 'WAITING' } : p
      ));

      window.dispatchEvent(new CustomEvent("patientQueueUpdated"));
      window.dispatchEvent(new CustomEvent("appointmentUpdated"));

    } catch (error: any) {
      console.error("Start new visit error:", error);
      toast({
        variant: "destructive",
        title: "Failed to start new visit",
        description: error.message || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setStartingVisitMrn(null);
    }
  };

  const handleOpenAppointmentDialog = (
    mrNumber: string | null,
    name: string,
    mode: "START_VISIT" | "SCHEDULE" = "SCHEDULE",
    followUpVisitId: string | null = null
  ) => {
    setAppointmentPatientMrn(mrNumber);
    setAppointmentPatientName(name);
    setAppointmentDialogMode(mode);
    setAppointmentFollowUpVisitId(followUpVisitId);
    if (mode === "START_VISIT") {
      setSelectedAppointmentDate(new Date());
    }
    setIsAppointmentDialogOpen(true);
  };

  const confirmSetAppointment = async () => {
    if (!selectedDoctorId || !selectedAppointmentDate || !selectedTimeSlot) {
      toast({ variant: "destructive", title: "Fill all details", description: "Date, Doctor, and Time Slot are required." });
      return;
    }

    if (appointmentPatientMrn === null) {
      setIsAppointmentDialogOpen(false);
      return;
    }

    setSettingAppointment(true);
    try {
      const data = await api.createAppointment({
        patientMrNumber: appointmentPatientMrn,
        doctorId: selectedDoctorId,
        appointmentDate: selectedAppointmentDate,
        notes: appointmentNote,
        timeSlot: selectedTimeSlot,
        followUpVisitId: appointmentFollowUpVisitId
      });

      toast({
        title: data.type === 'VISIT_CREATED' ? "Visit created for today" : "Appointment scheduled",
        description: data.message
      });

      setIsAppointmentDialogOpen(false);
      setAppointmentPatientMrn(null);
      setAppointmentNote("");
      setAppointmentFollowUpVisitId(null);
      setSelectedDoctorId("");
      setSelectedTimeSlot("");

      if (data.type === 'VISIT_CREATED') {
        setReturningPatients(prev => prev.map(p =>
          p.mrNumber === appointmentPatientMrn ? { ...p, hasActiveVisitToday: true, lastVisitStatus: 'WAITING' } : p
        ));
        window.dispatchEvent(new CustomEvent("patientQueueUpdated"));
      }

      window.dispatchEvent(new CustomEvent("appointmentUpdated"));

    } catch (error: any) {
      console.error("Set appointment error:", error);
      toast({ variant: "destructive", title: "Failed to set appointment", description: error.message });
    } finally {
      setSettingAppointment(false);
    }
  };

  const handlePrintOPCard = async (mrNumber: string) => {
    if (printingOPCardMrn) return;
    try {
      setPrintingOPCardMrn(mrNumber);
      const p = await api.getPatientDetails(mrNumber);
      setPatientData({
        mrNumber: p.mrNumber ?? mrNumber,
        name: p.name,
        contactNumber: p.contactNumber ?? p.mobile,
        secondaryContact: p.secondaryContact ?? "",
        age: p.age, // Fallback
        dob: p.dob,
        gender: p.gender,
        doorNo: p.doorNo,
        street: p.street,
        area: p.area,
        city: p.city,
        district: p.district,
        state: p.state,
        zip: p.pincode != null ? String(p.pincode) : "",
        address: p.address, // Fallback
        co: p.co,
      });
      setShowOPCard(true);
    } catch (error: any) {
      console.error("Print OP card error:", error);
      toast({
        variant: "destructive",
        title: "Could not print OP Card",
        description: error.message || "Please try again.",
      });
    } finally {
      setPrintingOPCardMrn(null);
    }
  };

  const openRecordsModal = async (patient: Patient) => {
    setSelectedRecordPatient(patient);
    setIsRecordModalOpen(true);
    setLoadingHistory(true);
    try {
      const data = await api.getVisitHistory(patient.mrNumber);
      setPatientHistory(data.visits || []);
    } catch (error) {
      console.error("Failed to fetch history:", error);
      toast({ title: "Error", description: "Could not fetch patient records.", variant: "destructive" });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRegisterPatient = async () => {
    if (!formData.name || !formData.age || !formData.gender || !formData.contactNumber || (!formData.street && !formData.city) || (isMobileExisting && !formData.relationship)) {
      toast({
        variant: "destructive",
        title: "Please fill in all required fields.",
        description: "Name, Age, Gender, Mobile, and at least Street/City are required.",
      });
      return;
    }

    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!nameRegex.test(formData.name)) {
      toast({
        variant: "destructive",
        title: "Invalid Name",
        description: "Special characters and numbers are not allowed in the patient name.",
      });
      return;
    }

    if (formData.contactNumber.length !== 10) {
      toast({
        variant: "destructive",
        title: "Invalid Mobile Number",
        description: "Mobile number must be exactly 10 digits.",
      });
      return;
    }

    if (formData.zip && formData.zip.length !== 5) {
      toast({
        variant: "destructive",
        title: "Invalid ZIP Code",
        description: "ZIP code must be exactly 5 digits.",
      });
      return;
    }

    if (formData.secondaryContact && formData.secondaryContact.length !== 10) {
      toast({
        variant: "destructive",
        title: "Invalid Secondary Contact",
        description: "Secondary contact must be exactly 10 digits.",
      });
      return;
    }

    try {
      setLoading(true);
      const formattedName = toTitleCase(formData.name.trim());
      const doctor = doctors.find(d => d.id === selectedDoctorId);

      const submissionData: any = {
        ...formData,
        pincode: formData.zip,
        name: formattedName,
        doctorId: selectedDoctorId || undefined,
        doctorName: doctor ? doctor.name : undefined,
        timeSlot: selectedTimeSlot || undefined,
        appointmentDate: selectedAppointmentDate || undefined
      };
      delete submissionData.zip;
      delete submissionData.age;

      if (isMobileExisting && parentMrn) {
        submissionData.parentMrn = parentMrn;
        submissionData.relationshipType = formData.relationship;
        delete submissionData.relationship;
      }

      const data = await api.registerPatient(submissionData);

      setPatientData({ ...data.patient, visit: data.visit });
      setShowOPCard(true);

      setFormData({
        name: "",
        co: "",
        age: "",
        gender: "",
        doorNo: "",
        street: "",
        area: "",
        city: "",
        district: "",
        state: "California",
        zip: "",
        contactNumber: "",
        secondaryContact: "",
        relationship: "",
        dob: "",
        mrNumber: "",
        complaint: "",
      });
      setSelectedDoctorId("");
      setSelectedTimeSlot("");
      setSelectedAppointmentDate(new Date());

      setDobPickerValue("");
      setDobTextValue("");
      setDobError("");
      setIsMobileExisting(false);
      setParentMrn("");
      setExistingPatientName("");
      setAppointmentNote("");
      toast({
        title: "Patient registered successfully!"
      });

      window.dispatchEvent(new CustomEvent("patientQueueUpdated"));
      window.dispatchEvent(new CustomEvent("appointmentUpdated"));

    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePatient = async () => {
    if (!editPatientData) return;
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!editPatientData.name || !nameRegex.test(editPatientData.name)) {
      toast({ variant: "destructive", title: "Invalid Name", description: "Name cannot be empty or contain special characters." });
      return;
    }
    if (editPatientData.contactNumber && String(editPatientData.contactNumber).length !== 10) {
      toast({ variant: "destructive", title: "Invalid Mobile", description: "Mobile number must be exactly 10 digits." });
      return;
    }
    if (editPatientData.secondaryContact && String(editPatientData.secondaryContact).length !== 10) {
      toast({ variant: "destructive", title: "Invalid Secondary Contact", description: "Secondary contact must be exactly 10 digits." });
      return;
    }
    if (editPatientData.zip && String(editPatientData.zip).length !== 5) {
      toast({ variant: "destructive", title: "Invalid ZIP", description: "ZIP code must be exactly 5 digits." });
      return;
    }
    try {
      setEditSaving(true);
      const payload: any = {
        name: toTitleCase(editPatientData.name.trim()),
        co: editPatientData.co || undefined,
        gender: editPatientData.gender || undefined,
        dob: editPatientData.dob || undefined,
        contactNumber: editPatientData.contactNumber || undefined,
        secondaryContact: editPatientData.secondaryContact || undefined,
        doorNo: editPatientData.doorNo || undefined,
        street: editPatientData.street || undefined,
        area: editPatientData.area || undefined,
        city: editPatientData.city || undefined,
        district: editPatientData.district || undefined,
        state: editPatientData.state || undefined,
        pincode: editPatientData.zip || undefined,
      };
      if (editMobileExisting && editParentMrn && editRelationship) {
        payload.parentMrn = editParentMrn;
        payload.relationshipType = editRelationship;
      }
      await api.updatePatient(editPatientData.mrNumber, payload);
      toast({ title: "Patient updated successfully!" });
      setEditPatientModalOpen(false);
      setEditPatientData(null);
      setEditMobileExisting(false);
      setEditParentMrn("");
      setEditExistingName("");
      setEditRelationship("");
      fetchReturningPatients(searchQuery);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update Failed", description: err.message });
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white relative">
      <div className="bg-white border-b border-brand/10 px-4 md:px-8 py-3 flex items-center justify-between shrink-0 shadow-sm z-20 relative">
        <div className="flex items-center gap-5">
          <div className="p-3 bg-brand text-white shadow-lg shrink-0">
            <UserPlus className="w-6 h-6 shrink-0" />
          </div>
          <div className="flex flex-col">
            <span className="text-[12px] font-black uppercase tracking-widest text-brand mb-0.5">Patient Enrollment</span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tighter">Registration Profile</h1>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6 bg-slate-50 border border-slate-100 px-6 py-2 rounded-lg">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Visits</span>
            <span className="text-2xl font-black text-slate-800 leading-none">{todayQueueMrns.size}</span>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">On Duty Doctors</span>
            <span className="text-2xl font-black text-emerald-600 leading-none">{onDutySortedDoctors.length}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-3 lg:p-6 flex flex-col lg:flex-row gap-4 lg:gap-6 overflow-y-auto lg:overflow-y-hidden bg-brand/5 relative overflow-x-hidden">
        <div className="absolute inset-0 pointer-events-none bg-sprinkles z-0"></div>
        <Tabs defaultValue="new" className="w-full lg:flex-1 flex flex-col lg:min-h-0 lg:overflow-y-auto px-1 relative z-10
          lg:[&::-webkit-scrollbar]:w-1 
          lg:[&::-webkit-scrollbar-track]:bg-transparent 
          lg:[&::-webkit-scrollbar-thumb]:bg-slate-200/50 
          lg:[&::-webkit-scrollbar-thumb]:rounded-full">
          <TabsList className="h-12 bg-slate-100 p-1 mb-6 flex gap-1.5 w-full max-w-2xl mx-auto rounded-none border border-slate-200/80 shadow-inner backdrop-blur-sm shrink-0">
            <TabsTrigger
              value="new"
              className="h-full flex-1 rounded-none gap-1 sm:gap-2 font-black text-[10px] sm:text-[12px] uppercase tracking-wider transition-all duration-300 whitespace-nowrap
              data-[state=active]:bg-white data-[state=active]:text-brand data-[state=active]:shadow-md
              data-[state=active]:after:w-full data-[state=active]:after:h-1 data-[state=active]:after:bg-brand data-[state=active]:after:absolute data-[state=active]:after:bottom-0 
              relative hover:bg-slate-50 hover:text-brand px-1.5 sm:px-4"
            >
              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>New <span className="hidden sm:inline">Patient</span></span>
            </TabsTrigger>
            <TabsTrigger
              value="returning"
              className="h-full flex-1 rounded-none gap-1 sm:gap-2 font-black text-[10px] sm:text-[12px] uppercase tracking-wider transition-all duration-300 whitespace-nowrap
              data-[state=active]:bg-white data-[state=active]:text-brand data-[state=active]:shadow-md
              data-[state=active]:after:w-full data-[state=active]:after:h-1 data-[state=active]:after:bg-brand data-[state=active]:after:absolute data-[state=active]:after:bottom-0 
              relative hover:bg-slate-50 hover:text-brand px-1.5 sm:px-4"
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Returning <span className="hidden sm:inline">Patient</span></span>
            </TabsTrigger>
            <TabsTrigger
              value="records"
              className="h-full flex-1 rounded-none gap-1 sm:gap-2 font-black text-[10px] sm:text-[12px] uppercase tracking-wider transition-all duration-300 whitespace-nowrap
              data-[state=active]:bg-white data-[state=active]:text-brand data-[state=active]:shadow-md
              data-[state=active]:after:w-full data-[state=active]:after:h-1 data-[state=active]:after:bg-brand data-[state=active]:after:absolute data-[state=active]:after:bottom-0 
              relative hover:bg-slate-50 hover:text-brand px-1.5 sm:px-4"
            >
              <ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span><span className="hidden sm:inline">Past </span>Records</span>
            </TabsTrigger>
          </TabsList>

          {/* New Patient Registration */}
          <TabsContent value="new" className="px-1">
            <Card className="clinical-card bg-white shadow-md overflow-hidden border-slate-200">
              <CardContent className="p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <Label className="clinical-label">Full Name *</Label>
                    <Input
                      placeholder="Full name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="rounded-none"
                    />
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <Label className="clinical-label">Date of Birth</Label>
                    <div className="relative">
                      <Input
                        placeholder="DD/MM/YYYY"
                        value={dobTextValue}
                        onChange={handleDobTextChange}
                        maxLength={10}
                        className="pr-24 font-mono text-sm rounded-none"
                        title="Type date in DD/MM/YYYY format or choose from calendar"
                      />
                      <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                        {formData.age && formData.age !== "—" && (
                          <span className="text-[10px] font-bold text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded border shadow-sm">
                            {formData.age}
                          </span>
                        )}
                      </div>
                      <Popover open={dobPopoverOpen} onOpenChange={setDobPopoverOpen}>
                        <PopoverTrigger asChild disabled={appointmentDialogMode === "START_VISIT"}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-9 px-3 py-2 hover:bg-transparent"
                            type="button"
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
                            month={calendarMonth}
                            onMonthChange={setCalendarMonth}
                            classNames={{
                              caption_label: "hidden",
                            }}
                            selected={dobPickerValue ? new Date(dobPickerValue) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                applyDob(date, "picker");
                                setDobPopoverOpen(false);
                              } else {
                                applyDob(null, "picker");
                              }
                            }}
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    {dobError && (
                      <p className="text-[11px] text-destructive mt-0.5">{dobError}</p>
                    )}
                  </div>

                   <div className="space-y-1.5">
                     <Label className="clinical-label">Gender *</Label>
                     <div className="flex gap-2 h-10">
                       {[
                         { value: "Male", label: (formData.age && parseInt(formData.age, 10) < 18) || (formData.age === "0") ? "Master" : "Male" },
                         { value: "Female", label: (formData.age && parseInt(formData.age, 10) < 18) || (formData.age === "0") ? "Miss" : "Female" },
                         { value: "Other", label: "Other" }
                       ].map((opt) => {
                         const isSelected = formData.gender === opt.value;
                         return (
                           <button
                             key={opt.value}
                             type="button"
                             onClick={() => handleInputChange("gender", opt.value)}
                             disabled={appointmentDialogMode === "START_VISIT"}
                             className={cn(
                               "flex-1 text-[11px] font-black uppercase tracking-wider transition-all border rounded-none h-full px-4 min-w-[70px]",
                               isSelected
                                 ? "bg-brand text-white border-brand-hover shadow-md"
                                 : "bg-white text-slate-500 border-slate-200 hover:bg-brand/5 hover:border-brand/20 hover:text-brand",
                               appointmentDialogMode === "START_VISIT" && "opacity-50 cursor-not-allowed"
                             )}
                           >
                             {opt.label}
                           </button>
                         );
                       })}
                     </div>
                   </div>

                    <div className="space-y-1.5">
                    <Label className="clinical-label">Mobile Number *</Label>
                    <Input
                      placeholder="10-digit mobile number"
                      value={formData.contactNumber}
                      onChange={(e) => handleInputChange("contactNumber", e.target.value)}
                      maxLength={10}
                      className="rounded-none"
                    />

                    {isMobileExisting && (
                      <div className="bg-emerald-50 rounded-none border border-emerald-200 mt-2 p-3 space-y-3">
                        <div className="text-xs text-emerald-800 leading-tight">
                          This mobile number is registered to <span className="font-semibold">{existingPatientName}</span> <span className="opacity-80">(MRN: {parentMrn})</span>.
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-emerald-950 font-medium">
                          <span>You are</span>
                          <Select value={formData.relationship} onValueChange={(val) => handleInputChange("relationship", val)}>
                            <SelectTrigger className="h-8 w-40 text-[11px] bg-white border-emerald-200 focus:ring-emerald-500 rounded-none shrink-0">
                              <SelectValue placeholder="Select Relationship" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                              <SelectItem value="Spouse">Spouse</SelectItem>
                              <SelectItem value="In-Law">In-Law</SelectItem>
                              <SelectItem value="Parent">Parent</SelectItem>
                              <SelectItem value="Child">Child</SelectItem>
                              <SelectItem value="Sibling">Sibling</SelectItem>
                              <SelectItem value="Grandparent">Grandparent</SelectItem>
                              <SelectItem value="Grandchild">Grandchild</SelectItem>
                              <SelectItem value="Uncle / Aunt">Uncle / Aunt</SelectItem>
                              <SelectItem value="Other">Other / Relative</SelectItem>
                            </SelectContent>
                          </Select>
                          <span>of <span className="font-bold">{existingPatientName}</span></span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="clinical-label">Secondary Contact</Label>
                    <Input
                      placeholder="10-digit mobile number"
                      value={formData.secondaryContact}
                      onChange={(e) => handleInputChange("secondaryContact", e.target.value)}
                      maxLength={10}
                      className="rounded-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <Label className="clinical-label">Care Of (C/o)</Label>
                    <Input
                      placeholder="Enter care of name"
                      value={formData.co}
                      onChange={(e) => handleInputChange("co", e.target.value)}
                      className="rounded-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="clinical-label">Consulting Doctor</Label>
                    <Select value={selectedDoctorId} onValueChange={(val) => {
                      setSelectedDoctorId(val);
                      setSelectedTimeSlot("");
                    }}>
                      <SelectTrigger className="h-10 text-xs rounded-none border-slate-200 bg-white w-full">
                        {selectedDoctorId ? (
                          (() => {
                            const doc = doctors.find(d => d.id === selectedDoctorId);
                            if (!doc) return <SelectValue placeholder="Identify Consultant..." />;
                            const isActive = isDoctorActiveNow(doc);
                            return (
                              <div className="flex items-center justify-between w-full pr-6 text-left">
                                <span className="font-bold text-slate-900 uppercase tracking-tight text-[11px] truncate mr-2">{truncateDoctorName(doc.name)}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isActive && (
                                    <Badge className="h-4 px-1.5 text-[8px] bg-emerald-100 hover:bg-emerald-100/80 text-emerald-700 border-0 font-black tracking-widest uppercase rounded-sm whitespace-nowrap">ON DUTY</Badge>
                                  )}
                                  <span className="text-[9px] font-bold bg-brand/10 text-brand border border-brand/10 px-1.5 py-0.5 rounded-sm uppercase tracking-wider whitespace-nowrap">{doc.specialization?.name || "General"}</span>
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <SelectValue placeholder="Identify Consultant..." />
                        )}
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-slate-200 shadow-xl">
                        {sortedDoctors.map(doc => {
                          const isActive = isDoctorActiveNow(doc);
                          return (
                            <SelectItem key={doc.id} value={doc.id} className="group focus:bg-slate-50 focus:text-slate-900 cursor-pointer rounded-none">
                              <div className="flex items-center justify-between w-full py-1.5 gap-4 pr-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 uppercase tracking-tight text-xs">{truncateDoctorName(doc.name)}</span>
                                  {isActive && (
                                    <Badge className="h-4 px-1.5 text-[8px] bg-emerald-100 hover:bg-emerald-100 text-emerald-700 border-0 font-black tracking-widest uppercase rounded-sm">ON DUTY</Badge>
                                  )}
                                </div>
                                <span className="text-[10px] font-bold bg-brand/10 text-brand border border-brand/10 px-2 py-0.5 rounded-sm uppercase tracking-wider shrink-0">{doc.specialization?.name || "General"}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 flex flex-col justify-end">
                    <div className="flex items-center justify-between">
                      <Label className="clinical-label">Appointment Slot</Label>
                      {selectedAppointmentDate && format(selectedAppointmentDate, "yyyy-MM-dd") !== format(new Date(), "yyyy-MM-dd") && (
                        <Badge variant="secondary" className="h-4 text-[8px] font-black uppercase tracking-widest px-1.5 rounded-none bg-amber-50 text-amber-600 border-amber-100/50">
                          {format(selectedAppointmentDate, "MMM d")}
                        </Badge>
                      )}
                    </div>
                    {selectedDoctorId ? (
                      <Select
                        value={selectedTimeSlot}
                        onValueChange={(val) => {
                          if (val === "ACTION:SCHEDULE") {
                            handleOpenAppointmentDialog(formData.mrNumber || null, formData.name || "New Patient", "SCHEDULE");
                          } else {
                            setSelectedTimeSlot(val);
                          }
                        }}
                      >
                        <SelectTrigger className="h-10 text-[11px] font-black uppercase tracking-widest gap-2 bg-blue-50/30 border-slate-200 text-brand rounded-none shadow-sm">
                          <div className="flex items-center gap-2 overflow-hidden flex-1">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <SelectValue placeholder="CHOOSE SLOT" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-none">
                          <div className="max-h-[200px] overflow-y-auto">
                            {(() => {
                              const doc = doctors.find(d => d.id === selectedDoctorId);
                              const day = selectedAppointmentDate ? selectedAppointmentDate.getDay() : new Date().getDay();
                              const isToday = !selectedAppointmentDate || format(selectedAppointmentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                              const now = new Date();
                              const currentTimeNum = now.getHours() * 60 + now.getMinutes();

                              const daySlots = (doc?.schedules || []).filter((s: any) => s.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));

                              const availableSlots = daySlots.filter((s: any) => {
                                if (!isToday) return true;
                                const [eh, em] = s.endTime.split(":").map(Number);
                                const isPast = (eh * 60 + em) <= currentTimeNum;
                                const isSelected = selectedTimeSlot === `${s.startTime}-${s.endTime}`;
                                return !isPast || isSelected;
                              });

                              if (availableSlots.length === 0) return <div className="py-2 px-3 text-[10px] text-muted-foreground italic text-center uppercase tracking-tighter">No slots {isToday ? 'today' : 'on selected date'}</div>;

                              return availableSlots.map((s: any) => {
                                const slotIdx = daySlots.findIndex(allS => allS.id === s.id);
                                return (
                                  <SelectItem key={s.id} value={`${s.startTime}-${s.endTime}`} className="text-[10px] font-black uppercase tracking-widest py-2.5 cursor-pointer">
                                    S{slotIdx + 1} — {formatToAMPM(s.startTime)} - {formatToAMPM(s.endTime)}
                                  </SelectItem>
                                );
                              });
                            })()}
                          </div>
                          <div className="border-t border-slate-100 mt-1">
                            <SelectItem
                              value="ACTION:SCHEDULE"
                              className="text-[10px] font-bold text-brand focus:bg-brand/10 focus:text-brand rounded-none py-3 cursor-pointer flex items-center gap-2"
                            >
                              <CalendarIcon className="w-3.5 h-3.5" />
                              Schedule for later Date?
                            </SelectItem>
                          </div>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Button
                        variant="outline"
                        disabled
                        className="h-10 text-[10px] font-bold uppercase tracking-widest gap-2 bg-brand/5 border-dashed border-slate-200 text-slate-300 rounded-none cursor-not-allowed"
                      >
                        Select Doctor first
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 space-y-3.5 p-4 border border-slate-100 bg-slate-50/10 rounded-sm">
                    <Label className="clinical-label text-slate-700">Address Details</Label>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase">Door No</Label>
                        <Input
                          placeholder="Door No"
                          className="h-9 text-[13px] border-0 border-b border-input rounded-none focus-visible:ring-0 focus-visible:border-b-primary bg-transparent shadow-none"
                          value={formData.doorNo}
                          onChange={(e) => handleInputChange("doorNo", e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-4 space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase">Street</Label>
                        <Input
                          placeholder="Street"
                          className="h-9 text-[13px] border-0 border-b border-input rounded-none focus-visible:ring-0 focus-visible:border-b-primary bg-transparent shadow-none"
                          value={formData.street}
                          onChange={(e) => handleInputChange("street", e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase">Area</Label>
                        <Input
                          placeholder="Area"
                          className="h-9 text-[13px] border-0 border-b border-input rounded-none focus-visible:ring-0 focus-visible:border-b-primary bg-transparent shadow-none"
                          value={formData.area}
                          onChange={(e) => handleInputChange("area", e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-3 space-y-1 relative group">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase">City</Label>
                        <Input
                          placeholder="City"
                          className="h-9 text-[13px] border-0 border-b border-input rounded-none focus-visible:ring-0 focus-visible:border-b-primary bg-transparent shadow-none"
                          value={formData.city}
                          onChange={(e) => handleInputChange("city", e.target.value)}
                          onFocus={() => setCityPopoverOpen(true)}
                          onBlur={() => setTimeout(() => setCityPopoverOpen(false), 200)}
                        />
                        {cityPopoverOpen && formData.city.length >= 1 && (
                          <div className="absolute bottom-full left-0 w-64 z-50 mb-1 bg-white border border-border rounded-md shadow-xl max-h-40 overflow-y-auto">
                            {US_CITIES.filter(d => d.toLowerCase().includes(formData.city.toLowerCase())).map((ct) => (
                              <div
                                key={ct}
                                className="px-3 py-2 text-[13px] hover:bg-accent hover:text-accent-foreground cursor-pointer border-b border-border/50 last:border-0 transition-colors"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleInputChange("city", ct);
                                  setCityPopoverOpen(false);
                                }}
                              >
                                {ct}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="sm:col-span-4 relative group space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase">County</Label>
                        <Input
                          placeholder="County"
                          className="h-9 text-[13px] border-0 border-b border-input rounded-none focus-visible:ring-0 focus-visible:border-b-primary bg-transparent shadow-none"
                          value={formData.district}
                          onChange={(e) => handleInputChange("district", e.target.value)}
                          onFocus={() => setDistrictPopoverOpen(true)}
                          onBlur={() => setTimeout(() => setDistrictPopoverOpen(false), 200)}
                        />
                        {districtPopoverOpen && formData.district.length >= 1 && (
                          <div className="absolute bottom-full left-0 w-64 z-50 mb-1 bg-white border border-border rounded-md shadow-xl max-h-40 overflow-y-auto">
                            {US_COUNTIES.filter(d => d.toLowerCase().includes(formData.district.toLowerCase())).map((dist) => (
                              <div
                                key={dist}
                                className="px-3 py-2 text-[13px] hover:bg-accent hover:text-accent-foreground cursor-pointer border-b border-border/50 last:border-0 transition-colors"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleInputChange("district", dist);
                                  setDistrictPopoverOpen(false);
                                }}
                              >
                                {dist}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="sm:col-span-5 relative group space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase">State</Label>
                        <Input
                          placeholder="State"
                          className="h-9 text-[13px] border-0 border-b border-input rounded-none focus-visible:ring-0 focus-visible:border-b-primary bg-transparent shadow-none"
                          value={formData.state}
                          onChange={(e) => handleInputChange("state", e.target.value)}
                          onFocus={() => setStatePopoverOpen(true)}
                          onBlur={() => setTimeout(() => setStatePopoverOpen(false), 200)}
                        />
                        {statePopoverOpen && formData.state.length >= 1 && (
                          <div className="absolute bottom-full left-0 w-64 z-50 mb-1 bg-white border border-border rounded-md shadow-xl max-h-40 overflow-y-auto">
                            {US_STATES.filter(s => s.toLowerCase().includes(formData.state.toLowerCase())).map((st) => (
                              <div
                                key={st}
                                className="px-3 py-2 text-[13px] hover:bg-accent hover:text-accent-foreground cursor-pointer border-b border-border/50 last:border-0 transition-colors"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleInputChange("state", st);
                                  setStatePopoverOpen(false);
                                }}
                              >
                                {st}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase">ZIP</Label>
                        <Input
                          placeholder="ZIP"
                          className="h-9 text-[13px] border-0 border-b border-input rounded-none focus-visible:ring-0 focus-visible:border-b-primary bg-transparent shadow-none"
                          value={formData.zip}
                          onChange={(e) => handleInputChange("zip", e.target.value)}
                          maxLength={5}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 space-y-4 p-4 border border-blue-50 bg-blue-50/10 rounded-sm flex flex-col justify-between min-h-[175px]">
                    <div className="space-y-2">
                      <Label className="clinical-label text-slate-700">Reason for Visit</Label>
                      <ReasonForVisitInput
                        value={formData.complaint}
                        onChange={(val) => handleInputChange("complaint", val)}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center lg:justify-end gap-3 mt-4 w-full">
                      {patientData && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setPatientData(null);
                            setFormData({
                              name: "",
                              co: "",
                              age: "",
                              gender: "",
                              doorNo: "",
                              street: "",
                              area: "",
                              city: "",
                              district: "",
                              state: "California",
                              zip: "",
                              contactNumber: "",
                              secondaryContact: "",
                              relationship: "",
                              dob: "",
                              mrNumber: "",
                              complaint: "",
                            });
                            setParentMrn("");
                            setSelectedDoctorId("");
                            setSelectedTimeSlot("");
                            setSelectedAppointmentDate(new Date());
                          }}
                          className="h-10 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-destructive rounded-none"
                        >
                          Cancel Edit
                        </Button>
                      )}
                      <Button
                        onClick={handleRegisterPatient}
                        disabled={loading}
                        className={cn(
                          "w-full lg:w-auto h-10 px-8 gap-2.5 font-black uppercase tracking-widest text-[11px] rounded-none shadow-lg hover:shadow-xl transition-all duration-300",
                          "bg-brand/10 hover:bg-brand text-brand hover:text-white border border-brand/20"
                        )}
                      >
                        {patientData ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                        {loading ? "Processing..." : patientData ? "Update Record" : "Register Patient"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="returning">
            <div className="space-y-4 px-1 w-full md:w-[90%] lg:w-[85%] xl:w-[75%] max-w-4xl mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Name, MR Number, or Mobile..."
                  className="pl-9 h-11 rounded-none border-slate-200 focus:ring-brand/20 bg-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-2 
              [&::-webkit-scrollbar]:w-1 
              [&::-webkit-scrollbar-track]:bg-transparent 
              [&::-webkit-scrollbar-thumb]:bg-slate-200/50 
              [&::-webkit-scrollbar-thumb]:rounded-full
              hover:[&::-webkit-scrollbar-thumb]:bg-slate-300/50
              transition-all flex-1">
                <div className="grid gap-3 pb-8">
                  {loadingReturning ? (
                    <div className="text-center text-muted-foreground py-8">Loading patients...</div>
                  ) : returningPatients.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8 italic border-2 border-dashed border-slate-100 rounded-xl">No returning patients found.</div>
                  ) : (
                    returningPatients.map((p) => (
                      <Card key={p.id} className="shadow-sm hover:shadow-md transition-all duration-300 border-slate-100 hover:border-slate-200">
                        <CardContent className="p-3 lg:p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
                            <div className="w-10 h-10 rounded-none bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
                              <span className="text-sm font-black text-brand">
                                {p.name.split(" ").map((n) => n[0]).join("")}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="font-bold text-sm text-slate-800 uppercase tracking-tight truncate">{p.name}</span>
                                <Badge variant="outline" className="text-[10px] font-black bg-slate-50 text-slate-500 border-slate-200 rounded-none uppercase tracking-widest px-2">MRN: {p.mrNumber != null ? p.mrNumber.toString() : "N/A"}</Badge>
                                {p.lastVisitStatus && (
                                  <Badge
                                    variant="secondary"
                                    className={`text-[9px] uppercase font-black tracking-widest px-2 py-0.5 border-0 rounded-none ${p.lastVisitStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                      p.lastVisitStatus === 'WAITING' ? 'bg-amber-100 text-amber-700' :
                                        p.lastVisitStatus === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                          'bg-slate-100 text-slate-700'
                                      }`}
                                  >
                                    {p.lastVisitStatus}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 font-medium">
                                <span className="flex items-center gap-1.5 shrink-0 bg-slate-50 px-2 py-0.5 border border-slate-100/50">
                                  <CalendarIcon className="w-3 h-3 text-slate-400" />
                                  Last: {p.lastVisit}
                                </span>
                                <span className="flex items-center gap-1.5 shrink-0 bg-slate-50 px-2 py-0.5 border border-slate-100/50">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  {p.mobile}
                                </span>
                                
                                {(!p.contactNumber || !p.city || !p.dob) && (
                                  <span className="flex items-center gap-1.5 shrink-0 bg-rose-50 text-rose-600 px-2 py-0.5 border border-rose-200 font-black uppercase tracking-widest text-[9px]" title="Please update patient details">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                    Missing Info: {[!p.contactNumber && "Phone", !p.city && "City", !p.dob && "DOB"].filter(Boolean).join(", ")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 mt-1 md:mt-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditPatientData({
                                  mrNumber: String(p.mrNumber),
                                  name: p.name,
                                  co: p.co || "",
                                  gender: p.gender || "",
                                  dob: p.dob || "",
                                  contactNumber: String(p.contactNumber || ""),
                                  _originalContactNumber: String(p.contactNumber || ""),
                                  secondaryContact: p.secondaryContact != null ? String(p.secondaryContact) : "",
                                  doorNo: p.doorNo || "",
                                  street: p.street || "",
                                  area: p.area || "",
                                  city: p.city || "",
                                  district: p.district || "",
                                  state: p.state || "California",
                                  zip: p.pincode != null ? String(p.pincode) : "",
                                });
                                setEditRelationship("");
                                setEditMobileExisting(false);
                                setEditPatientModalOpen(true);
                              }}
                              className="w-9 h-9 p-0 shrink-0 text-slate-400 hover:text-brand hover:bg-white border border-transparent hover:border-slate-200 transition-all rounded-none"
                              title="Edit Patient Details"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePrintOPCard(p.mrNumber)}
                              disabled={printingOPCardMrn === p.mrNumber}
                              className="w-9 h-9 p-0 shrink-0 text-slate-400 hover:text-brand hover:bg-white border border-transparent hover:border-slate-200 transition-all rounded-none"
                              title="Print OP Card"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenAppointmentDialog(p.mrNumber, p.name, "SCHEDULE")}
                              className="h-9 px-3 gap-2 text-[10px] font-black uppercase tracking-widest border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-brand transition-all shrink-0 rounded-none shadow-sm flex-1 sm:flex-none"
                            >
                              <CalendarIcon className="w-3.5 h-3.5" />
                              Schedule
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleStartNewVisit(p.mrNumber)}
                              disabled={p.hasActiveVisitToday || startingVisitMrn === p.mrNumber}
                              className="h-9 px-5 gap-2 bg-brand/10 hover:bg-brand text-brand hover:text-white font-black uppercase tracking-widest text-[10px] disabled:opacity-50 transition-all rounded-none border border-brand/20 shadow-sm hover:shadow-md flex-1 sm:flex-none"
                            >
                              {startingVisitMrn === p.mrNumber ? "Starting..." : p.hasActiveVisitToday ? "Active Today" : "Start Visit"}
                              {!p.hasActiveVisitToday && startingVisitMrn !== p.mrNumber && <ArrowRight className="w-3.5 h-3.5" />}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Past Records Search */}
          <TabsContent value="records">
            <div className="space-y-4 px-1 w-full md:w-[90%] lg:w-[85%] xl:w-[75%] max-w-4xl mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Name, MR Number, or Mobile to view history..."
                  className="pl-9 h-11 rounded-none border-slate-200 focus:ring-brand/20 bg-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-2 
              [&::-webkit-scrollbar]:w-1 
              [&::-webkit-scrollbar-track]:bg-transparent 
              [&::-webkit-scrollbar-thumb]:bg-slate-200/50 
              [&::-webkit-scrollbar-thumb]:rounded-full
              hover:[&::-webkit-scrollbar-thumb]:bg-slate-300/50
              transition-all flex-1">
                <div className="grid gap-3 pb-8">
                  {loadingReturning ? (
                    <div className="text-center text-muted-foreground py-8">Loading patients...</div>
                  ) : returningPatients.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8 italic border-2 border-dashed border-slate-100 rounded-xl">No patients found.</div>
                  ) : (
                    returningPatients.map((p) => (
                      <Card 
                        key={p.id} 
                        className="shadow-sm hover:shadow-md transition-all duration-300 border-slate-100 hover:border-brand/20 cursor-pointer"
                        onClick={() => openRecordsModal(p)}
                      >
                        <CardContent className="p-3 lg:p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
                            <div className="w-10 h-10 rounded-none bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
                              <span className="text-sm font-black text-slate-400">
                                <ClipboardList className="w-5 h-5" />
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="font-bold text-sm text-slate-800 uppercase tracking-tight truncate">{p.name}</span>
                                <Badge variant="outline" className="text-[10px] font-black bg-slate-50 text-slate-500 border-slate-200 rounded-none uppercase tracking-widest px-2">MRN: {p.mrNumber != null ? p.mrNumber.toString() : "N/A"}</Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 font-medium">
                                <span className="flex items-center gap-1.5 shrink-0 bg-slate-50 px-2 py-0.5 border border-slate-100/50">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  {p.mobile}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center text-brand font-bold text-xs uppercase tracking-widest">
                            View Records <ArrowRight className="w-4 h-4 ml-2" />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Right section for doctor availability and daily bookings */}
        <DoctorSchedulesPanel
          onScheduleAppointment={(mrNumber, name, followUpVisitId) =>
            handleOpenAppointmentDialog(mrNumber, name, "SCHEDULE", followUpVisitId)
          }
        />

        {/* OP Card Modal */}
        <Dialog open={showOPCard} onOpenChange={(open) => {
          setShowOPCard(open);
          if (!open) {
            setPatientData(null);
            setFormData(prev => ({ ...prev, mrNumber: "" }));
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader className="print:hidden no-print">
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
                  <Printer className="w-4 h-4 text-brand" />
                </div>
                OP Card Generated
              </DialogTitle>
              <DialogDescription className="hidden">
                Detailed patient information and registration card for printing.
              </DialogDescription>
            </DialogHeader>
            <style>
              {`
                @media print {
                  @page {
                    size: 60mm 40mm;
                    margin: 0;
                  }
                  html, body {
                    width: 60mm !important;
                    height: 40mm !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                  }
                  div[role="dialog"], 
                  div[data-state="open"] {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 60mm !important;
                    height: 40mm !important;
                    min-width: 0 !important;
                    max-width: none !important;
                    min-height: 0 !important;
                    max-height: none !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    transform: none !important;
                    background: transparent !important;
                  }
                  button, 
                  [class*="DialogClose"],
                  [class*="absolute right-4"] {
                    display: none !important;
                  }
                  body #print-section {
                    display: flex !important;
                    width: 60mm !important;
                    height: 40mm !important;
                    padding: 2.5mm !important;
                    margin: 0 !important;
                    box-sizing: border-box !important;
                    overflow: hidden !important;
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    background: white !important;
                    color: black !important;
                  }
                }
              `}
            </style>

            {/* Screen Preview (Hidden in Print) */}
            <div className="border-4 border-brand/20 rounded-none p-8 bg-brand/5 space-y-6 print:hidden">
              <div className="text-center border-b border-border pb-3 flex flex-col items-center">
                <div className="flex flex-col leading-none gap-0.5 mb-2">
                  <span
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                    className="font-extrabold text-xl tracking-tight leading-none"
                  >
                    <span className="text-slate-900">Vision</span>
                    <span className="text-brand">Pulze</span>
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400 mt-0.5">
                    Ophthalmic Ecosystem
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">25, Neela West Street, Velippalayam, Nagapattinam - 611001, Tamil Nadu</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 text-xs">
                <div>
                  <span className="text-muted-foreground">MR Number</span>
                  <p className="font-semibold font-mono text-foreground">{patientData?.mrNumber != null ? patientData.mrNumber.toString() : "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Patient Name</span>
                  <p className="font-semibold text-foreground">{patientData?.name || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date</span>
                  <p className="font-semibold text-foreground">{new Date().toLocaleDateString("en-IN")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Mobile</span>
                  <p className="font-semibold text-foreground">{patientData?.contactNumber || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Age / Gender</span>
                  <p className="font-semibold text-foreground">
                    {getPatientAgeString(patientData)} / {getPatientGenderString(patientData)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Address</span>
                  <p className="font-semibold text-foreground">
                    {([
                      patientData?.doorNo,
                      patientData?.street,
                      patientData?.area,
                      patientData?.city,
                      patientData?.district,
                      patientData?.state,
                      patientData?.zip
                    ].filter(Boolean).join(", ")
                    ) || patientData?.address || "—"}
                  </p>
                </div>
                {patientData?.co && (
                  <div>
                    <span className="text-muted-foreground">Care Of (C/o)</span>
                    <p className="font-semibold text-foreground">{patientData.co}</p>
                  </div>
                )}
                {patientData?.secondaryContact && (
                  <div>
                    <span className="text-muted-foreground">Secondary Contact</span>
                    <p className="font-semibold text-foreground">{patientData.secondaryContact}</p>
                  </div>
                )}
                <div className="flex justify-start md:col-span-2 lg:col-span-3 pt-2">
                  {patientData?.mrNumber != null && (
                    <BarcodeGenerator value={patientData.mrNumber.toString()} />
                  )}
                </div>
              </div>
            </div>

            {/* Print Version (Hidden on Screen, Tag Size 60x40mm) */}
            <div id="print-section" className="hidden print:flex print:flex-col print:justify-start print:bg-white print:text-black print:p-1 print:w-[60mm] print:h-[40mm] print:box-border overflow-hidden" style={{ fontFamily: 'monospace' }}>
              <div className="text-center border-b-2 border-black pb-0.5 mb-1 flex flex-col items-center shrink-0 w-full">
                <h2 className="font-black text-[9px] m-0 p-0 leading-tight uppercase tracking-tighter text-center w-full">VisionPulze</h2>
              </div>

              <div className="flex flex-row w-full flex-1 gap-1">
                <div className="flex flex-col gap-0.5 text-[7px] leading-tight flex-1">
                  <div className="flex justify-between items-center border-b border-gray-300 pb-[1px]">
                    <span className="font-bold uppercase text-[6px]">Name:</span>
                    <span className="truncate max-w-[20mm] text-right">{patientData?.name || "—"}</span>
                  </div>
                  {patientData?.co && (
                    <div className="flex justify-between items-center border-b border-gray-300 pb-[1px]">
                      <span className="font-bold uppercase text-[6px]">C/O:</span>
                      <span className="truncate max-w-[20mm] text-right">{patientData.co}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-b border-gray-300 pb-[1px]">
                    <span className="font-bold uppercase text-[6px]">Date:</span>
                    <span>{new Date().toLocaleDateString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-300 pb-[1px]">
                    <span className="font-bold uppercase text-[6px]">Mobile:</span>
                    <span>{patientData?.contactNumber || "—"}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-300 pb-[1px]">
                    <span className="font-bold uppercase text-[6px]">Age/Sex:</span>
                    <span>
                      {getPatientAgeString(patientData)} / {(() => { const g = getPatientGenderString(patientData); return g === "Male" ? "M" : g === "Female" ? "F" : g; })()}
                    </span>
                  </div>
                  <div className="flex flex-col pb-[1px]">
                    <span className="font-bold uppercase text-[6px]">Address:</span>
                    <span className="mt-[1px] line-clamp-2 leading-[1.1] text-[5px]">
                      {([
                        patientData?.doorNo,
                        patientData?.street,
                        patientData?.area,
                        patientData?.city,
                        patientData?.district,
                        patientData?.state,
                        patientData?.zip
                      ].filter(Boolean).join(", ")
                      ) || patientData?.address || "—"}
                    </span>
                  </div>
                </div>

                <div className="w-[15mm] shrink-0 relative flex items-center justify-center">
                  {patientData?.mrNumber != null && (
                    <div className="absolute -rotate-90 flex items-center justify-center">
                      <BarcodeGenerator value={patientData.mrNumber.toString()} height={50} barWidth={1} />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="print:hidden no-print">
              <Button variant="outline" onClick={() => setShowOPCard(false)}>Close</Button>
              <Button onClick={() => window.print()} className="gap-2 bg-brand/10 hover:bg-brand text-brand hover:text-white border border-brand/20 font-bold transition-all shadow-md">
                <Printer className="w-4 h-4" />
                Print OP Card
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Doctor Selection Dialog for Returning Patient */}
        <Dialog open={isDoctorSelectOpen} onOpenChange={setIsDoctorSelectOpen}>
          <DialogContent className="max-w-md p-0 overflow-hidden border-slate-200 rounded-none shadow-2xl">
            {(() => {
              const selectedPatientForVisit = returningPatients.find(p => p.mrNumber === assigningPatientMrn);
              return (
                <>
                  <div className="bg-white border-b border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center shrink-0 border border-brand/10">
                      <ClipboardList className="w-6 h-6 text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900">
                        Start Patient Visit
                      </DialogTitle>
                      {selectedPatientForVisit ? (
                        <div className="mt-1 flex flex-col gap-0.5 text-left">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-black text-brand uppercase tracking-wider">Patient:</span>
                            <span className="text-xs font-black text-slate-800 uppercase truncate">
                              {selectedPatientForVisit.name}
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-400 font-bold tracking-wider font-mono">
                            MRN: {selectedPatientForVisit.mrNumber}
                          </span>
                        </div>
                      ) : (
                        <DialogDescription className="text-xs text-slate-500 font-medium mt-1">
                          Assign a consulting physician and initiate the clinical workflow.
                        </DialogDescription>
                      )}
                    </div>
                  </div>

                  <div className="p-6 pt-4 space-y-4">
                    <div className="space-y-2.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Consulting Physician</Label>
                      <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                        <SelectTrigger className="h-12 border-slate-200 focus:ring-brand/10 hover:border-brand/40 focus:border-brand transition-all bg-white font-medium shadow-sm data-[state=open]:border-brand rounded-none w-full">
                          {selectedDoctorId ? (
                            (() => {
                              const doc = doctors.find(d => d.id === selectedDoctorId);
                              if (!doc) return <SelectValue placeholder="Select a consulting doctor..." />;
                              const isActive = isDoctorActiveNow(doc);
                              return (
                                <div className="flex items-center justify-between w-full pr-6 text-left">
                                  <span className="font-bold text-slate-900 uppercase tracking-tight text-[11px] sm:text-xs truncate mr-2">{truncateDoctorName(doc.name)}</span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {isActive && (
                                      <Badge className="h-4 px-1.5 text-[8px] bg-emerald-100 hover:bg-emerald-100/80 text-emerald-700 border-0 font-black tracking-widest uppercase rounded-sm whitespace-nowrap">On Duty</Badge>
                                    )}
                                    <span className="text-[10px] font-bold bg-brand/10 text-brand border border-brand/10 px-1.5 py-0.5 rounded-sm uppercase tracking-wider whitespace-nowrap">{doc.specialization?.name || "General"}</span>
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            <SelectValue placeholder="Select a consulting doctor..." />
                          )}
                        </SelectTrigger>
                        <SelectContent className="border-slate-200 shadow-xl rounded-none">
                          {onDutySortedDoctors.length === 0 ? (
                            <div className="px-3 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
                              No physicians on duty right now
                            </div>
                          ) : (
                            onDutySortedDoctors.map((doc) => (
                              <SelectItem key={doc.id} value={doc.id} className="text-xs group focus:bg-slate-50 focus:text-slate-900 cursor-pointer rounded-none">
                                <div className="flex items-center justify-between w-full py-1.5 gap-4 pr-4">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 uppercase tracking-tight text-xs">{truncateDoctorName(doc.name)}</span>
                                    <Badge className="h-4 px-1.5 text-[8px] bg-emerald-100 hover:bg-emerald-100 text-emerald-700 border-0 font-black tracking-widest uppercase rounded-sm">On Duty</Badge>
                                  </div>
                                  <span className="text-[10px] font-bold bg-brand/10 text-brand border border-brand/10 px-2 py-0.5 rounded-sm uppercase tracking-wider shrink-0">{doc.specialization?.name || "General"}</span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-slate-100">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Reason for Visit</Label>
                      <ReasonForVisitInput
                        value={returningComplaint}
                        onChange={setReturningComplaint}
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50/50 border-t border-slate-100 p-4 px-6 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDoctorSelectOpen(false)} className="border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-bold uppercase tracking-widest text-xs h-10 rounded-none">Cancel</Button>
                    <Button
                      onClick={confirmStartNewVisit}
                      disabled={!selectedDoctorId || !!startingVisitMrn}
                      className="gap-2 bg-brand hover:bg-black text-white border border-transparent shadow-sm hover:shadow font-bold uppercase tracking-widest text-xs h-10 transition-all rounded-none"
                    >
                      {startingVisitMrn ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          Start Visit
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </Button>
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Set Appointment Dialog */}
        <Dialog open={isAppointmentDialogOpen} onOpenChange={setIsAppointmentDialogOpen}>
          <DialogContent className="max-w-md p-0 overflow-hidden border-slate-200 rounded-none shadow-2xl">
            <div className="bg-white border-b border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center shrink-0 border border-brand/10">
                <CalendarIcon className="w-6 h-6 text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900">
                  Set Appointment
                </DialogTitle>
                <div className="mt-1 flex flex-col gap-0.5 text-left">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-black text-brand uppercase tracking-wider">Patient:</span>
                    <span className="text-xs font-black text-slate-800 uppercase truncate">
                      {appointmentPatientName}
                    </span>
                  </div>
                  {appointmentPatientMrn && (
                    <span className="text-[9px] text-slate-400 font-bold tracking-wider font-mono">
                      MRN: {appointmentPatientMrn}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 pt-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Appointment Date</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0 border-slate-200 text-slate-400 hover:text-primary transition-colors"
                    onClick={() => {
                      const today = startOfToday();
                      const prevDate = selectedAppointmentDate ? subDays(selectedAppointmentDate, 1) : today;
                      if (prevDate >= today) {
                        setSelectedAppointmentDate(prevDate);
                      }
                    }}
                    disabled={!selectedAppointmentDate || subDays(selectedAppointmentDate, 1) < startOfToday()}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <Popover>
                    <PopoverTrigger asChild disabled={appointmentDialogMode === "START_VISIT"}>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal h-10 border-brand/20 bg-brand/10/10 hover:bg-brand hover:text-white transition-all group",
                          (!selectedAppointmentDate || appointmentDialogMode === "START_VISIT") && "text-muted-foreground"
                        )}
                        disabled={appointmentDialogMode === "START_VISIT"}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-brand group-hover:text-white" />
                        {selectedAppointmentDate ? (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-x-2 leading-none">
                            <span className="font-bold text-brand-hover group-hover:text-white uppercase text-[10px] sm:text-xs transition-colors">{format(selectedAppointmentDate, "EEEE")}</span>
                            <span className="hidden sm:inline-block w-[1px] h-3 bg-brand/20 group-hover:bg-white/30"></span>
                            <span className="text-slate-700 group-hover:text-white font-semibold transition-colors">{format(selectedAppointmentDate, "PPP")}</span>
                          </div>
                        ) : <span className="text-slate-500">Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedAppointmentDate}
                        onSelect={setSelectedAppointmentDate}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0 border-slate-200 text-slate-400 hover:text-primary transition-colors"
                    onClick={() => {
                      const nextDate = selectedAppointmentDate ? addDays(selectedAppointmentDate, 1) : addDays(startOfToday(), 1);
                      setSelectedAppointmentDate(nextDate);
                    }}
                    disabled={appointmentDialogMode === "START_VISIT"}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Consulting Doctor</Label>
                <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                  <SelectTrigger className="w-full">
                    {selectedDoctorId ? (
                      (() => {
                        const doc = doctors.find(d => d.id === selectedDoctorId);
                        if (!doc) return <SelectValue placeholder="Select Doctor" />;
                        return (
                          <div className="flex items-center justify-between w-full pr-6 text-left">
                            <span className="font-bold text-slate-900 uppercase tracking-tight text-[11px] truncate mr-2">{truncateDoctorName(doc.name)}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge className="h-4 px-1 text-[8px] bg-emerald-100 hover:bg-emerald-100/80 text-emerald-700 border-0 font-black tracking-widest uppercase rounded-sm whitespace-nowrap">Available</Badge>
                              <span className="text-[10px] font-bold bg-brand/10 text-brand border border-brand/10 px-1.5 py-0.5 rounded-sm uppercase tracking-wider whitespace-nowrap">{doc.specialization?.name || "General"}</span>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <SelectValue placeholder="Select Doctor" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.filter(doc => {
                      const day = selectedAppointmentDate?.getDay();
                      return day !== undefined && doc.schedules?.some((s: any) => s.dayOfWeek === day);
                    }).length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400 italic">
                        No doctors scheduled/available for this date
                      </div>
                    ) : (
                      doctors
                        .filter(doc => {
                          const day = selectedAppointmentDate?.getDay();
                          return day !== undefined && doc.schedules?.some((s: any) => s.dayOfWeek === day);
                        })
                        .map(doc => (
                          <SelectItem key={doc.id} value={doc.id} className="group">
                            <div className="flex flex-col py-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold leading-none group-hover:text-brand group-focus:text-brand group-data-[state=checked]:text-brand uppercase tracking-tighter transition-colors">{truncateDoctorName(doc.name)}</span>
                                <Badge className="h-3.5 px-1 text-[8px] bg-emerald-500 hover:bg-emerald-600 border-0 text-white font-bold tracking-tighter shadow-sm">AVAILABLE</Badge>
                              </div>
                              <span className="text-[9px] text-muted-foreground/70 group-hover:text-brand/80 group-focus:text-brand/80 group-data-[state=checked]:text-brand/80 uppercase tracking-tight mt-1 transition-colors">{doc.specialization?.name || "General"}</span>
                            </div>
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Time Slot</Label>
                <Select value={selectedTimeSlot} onValueChange={setSelectedTimeSlot} disabled={!selectedDoctorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Time Slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedDoctorId && (() => {
                      const doc = doctors.find(d => d.id === selectedDoctorId);
                      const day = selectedAppointmentDate?.getDay();
                      const now = new Date();
                      const isToday = selectedAppointmentDate?.toDateString() === now.toDateString();
                      const currentTimeNum = now.getHours() * 60 + now.getMinutes();

                      const daySlots = (doc?.schedules || [])
                        .filter((s: any) => s.dayOfWeek === day)
                        .sort((a, b) => {
                          const [ah, am] = a.startTime.split(":").map(Number);
                          const [bh, bm] = b.startTime.split(":").map(Number);
                          return (ah * 60 + am) - (bh * 60 + bm);
                        });

                      const availableSlots = daySlots.filter((s: any) => {
                        if (!isToday) return true;
                        const [eh, em] = s.endTime.split(":").map(Number);
                        return (eh * 60 + em) > currentTimeNum;
                      });

                      if (availableSlots.length === 0) {
                        return (
                          <div className="py-6 text-center text-xs text-slate-400 italic">
                            No active time slots remaining for this physician today
                          </div>
                        );
                      }

                      return availableSlots.map((s: any, idx: number) => (
                        <SelectItem key={s.id} value={`${s.startTime}-${s.endTime}`} className="text-xs">
                          Slot {idx + 1} — {formatToAMPM(s.startTime)} - {formatToAMPM(s.endTime)}
                        </SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Notes (Optional)</Label>
                <Textarea
                  placeholder="Reason, referral or special instructions..."
                  value={appointmentNote}
                  onChange={(e) => setAppointmentNote(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </div>

            <div className="bg-slate-50/50 border-t border-slate-100 p-4 px-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAppointmentDialogOpen(false)} className="border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-bold uppercase tracking-widest text-xs h-10 rounded-none">Cancel</Button>
              <Button
                onClick={confirmSetAppointment}
                disabled={!selectedTimeSlot || settingAppointment}
                className="gap-2 bg-brand hover:bg-black text-white border border-transparent shadow-sm hover:shadow font-bold uppercase tracking-widest text-xs h-10 transition-all rounded-none"
              >
                {settingAppointment ? "Booking..." : appointmentDialogMode === "START_VISIT" ? "Start Visit" : "Schedule Appointment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Patient Modal — quick-edit from returning patients list */}
        <Dialog open={editPatientModalOpen} onOpenChange={(open) => { if (!open) { setEditPatientModalOpen(false); setEditPatientData(null); } }}>
          <DialogContent className="max-w-2xl rounded-none border-slate-200 p-0 overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 bg-brand/5">
              <DialogTitle className="flex items-center gap-3 text-slate-900">
                <div className="p-2 bg-brand text-white">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-widest text-brand mb-0.5">Patient Enrollment</div>
                  <div className="text-base font-black uppercase tracking-tighter">Edit Patient Details</div>
                </div>
                {editPatientData && (
                  <Badge variant="outline" className="ml-auto text-[10px] font-black bg-white text-slate-500 border-slate-200 rounded-none uppercase tracking-widest px-2">
                    MRN: {editPatientData.mrNumber}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="hidden">Edit basic patient information.</DialogDescription>
            </DialogHeader>

            {editPatientData && (
              <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto overflow-x-hidden">
                {/* Row 1: Name, DOB, Gender */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-5 space-y-1.5">
                    <Label className="clinical-label">Full Name *</Label>
                    <Input
                      placeholder="Full name"
                      value={editPatientData.name}
                      onChange={(e) => setEditPatientData((prev: any) => ({ ...prev, name: e.target.value }))}
                      className="rounded-none"
                    />
                  </div>
                  <div className="sm:col-span-3 space-y-1.5">
                    <Label className="clinical-label">Date of Birth</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-mono text-sm h-10 rounded-none border-slate-200 hover:bg-brand/5 hover:border-brand/20 transition-all",
                            !editPatientData.dob && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {editPatientData.dob
                            ? format(new Date(editPatientData.dob), "dd/MM/yyyy")
                            : "Pick date"}
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
                          selected={editPatientData.dob ? new Date(editPatientData.dob) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const yyyy = date.getFullYear();
                              const mm = String(date.getMonth() + 1).padStart(2, '0');
                              const dd = String(date.getDate()).padStart(2, '0');
                              setEditPatientData((prev: any) => ({ ...prev, dob: `${yyyy}-${mm}-${dd}` }));
                            } else {
                              setEditPatientData((prev: any) => ({ ...prev, dob: "" }));
                            }
                          }}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="sm:col-span-4 space-y-1.5">
                    <Label className="clinical-label">Gender</Label>
                    <div className="flex gap-1.5 h-10">
                      {[
                        { value: "Male", label: "Male" },
                        { value: "Female", label: "Female" },
                        { value: "Other", label: "Other" }
                      ].map((opt) => {
                        const isSelected = editPatientData.gender === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setEditPatientData((prev: any) => ({ ...prev, gender: opt.value }))}
                            className={cn(
                              "flex-1 text-[11px] font-black uppercase tracking-wider transition-all border rounded-none h-full px-2",
                              isSelected
                                ? "bg-brand text-white border-brand-hover shadow-md"
                                : "bg-white text-slate-500 border-slate-200 hover:bg-brand/5 hover:border-brand/20 hover:text-brand"
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Row 2: Care Of, Mobile, Secondary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="clinical-label">Care Of (C/o)</Label>
                    <Input
                      placeholder="Care of name"
                      value={editPatientData.co}
                      onChange={(e) => setEditPatientData((prev: any) => ({ ...prev, co: e.target.value }))}
                      className="rounded-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="clinical-label">Mobile Number</Label>
                    <Input
                      placeholder="10-digit mobile"
                      value={editPatientData.contactNumber}
                      onChange={(e) => setEditPatientData((prev: any) => ({ ...prev, contactNumber: e.target.value }))}
                      maxLength={10}
                      className="rounded-none"
                    />
                    {editMobileExisting && (
                      <div className="bg-emerald-50 rounded-none border border-emerald-200 mt-2 p-3 space-y-3">
                        <div className="text-xs text-emerald-800 leading-tight">
                          This number is registered to <span className="font-semibold">{editExistingName}</span>{" "}
                          <span className="opacity-80">(MRN: {editParentMrn})</span>. Linking will add this patient to their family group.
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-emerald-950 font-medium">
                          <span>You are</span>
                          <Select value={editRelationship} onValueChange={setEditRelationship}>
                            <SelectTrigger className="h-8 w-40 text-[11px] bg-white border-emerald-200 focus:ring-emerald-500 rounded-none shrink-0">
                              <SelectValue placeholder="Select Relationship" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                              <SelectItem value="Spouse">Spouse</SelectItem>
                              <SelectItem value="In-Law">In-Law</SelectItem>
                              <SelectItem value="Parent">Parent</SelectItem>
                              <SelectItem value="Child">Child</SelectItem>
                              <SelectItem value="Sibling">Sibling</SelectItem>
                              <SelectItem value="Grandparent">Grandparent</SelectItem>
                              <SelectItem value="Grandchild">Grandchild</SelectItem>
                              <SelectItem value="Uncle / Aunt">Uncle / Aunt</SelectItem>
                              <SelectItem value="Other">Other / Relative</SelectItem>
                            </SelectContent>
                          </Select>
                          <span>of <span className="font-bold">{editExistingName}</span> *</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="clinical-label">Secondary Contact</Label>
                    <Input
                      placeholder="10-digit mobile"
                      value={editPatientData.secondaryContact}
                      onChange={(e) => setEditPatientData((prev: any) => ({ ...prev, secondaryContact: e.target.value }))}
                      maxLength={10}
                      className="rounded-none"
                    />
                  </div>
                </div>

                {/* Row 3: Address */}
                <div className="p-4 border border-slate-100 bg-slate-50/30 space-y-3">
                  <Label className="clinical-label text-slate-600">Address Details</Label>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase">Door No</Label>
                      <Input
                        placeholder="No."
                        className="h-9 text-[13px] border-0 border-b border-input rounded-none focus-visible:ring-0 focus-visible:border-b-primary bg-transparent shadow-none"
                        value={editPatientData.doorNo}
                        onChange={(e) => setEditPatientData((prev: any) => ({ ...prev, doorNo: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-4 space-y-1">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase">Street</Label>
                      <Input
                        placeholder="Street"
                        className="h-9 text-[13px] border-0 border-b border-input rounded-none focus-visible:ring-0 focus-visible:border-b-primary bg-transparent shadow-none"
                        value={editPatientData.street}
                        onChange={(e) => setEditPatientData((prev: any) => ({ ...prev, street: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase">Area</Label>
                      <Input
                        placeholder="Area"
                        className="h-9 text-[13px] border-0 border-b border-input rounded-none focus-visible:ring-0 focus-visible:border-b-primary bg-transparent shadow-none"
                        value={editPatientData.area}
                        onChange={(e) => setEditPatientData((prev: any) => ({ ...prev, area: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase">City</Label>
                      <Input
                        placeholder="City"
                        className="h-9 text-[13px] border-0 border-b border-input rounded-none focus-visible:ring-0 focus-visible:border-b-primary bg-transparent shadow-none"
                        value={editPatientData.city}
                        onChange={(e) => setEditPatientData((prev: any) => ({ ...prev, city: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-4 space-y-1">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase">County</Label>
                      <Input
                        placeholder="County"
                        className="h-9 text-[13px] border-0 border-b border-input rounded-none focus-visible:ring-0 focus-visible:border-b-primary bg-transparent shadow-none"
                        value={editPatientData.district}
                        onChange={(e) => setEditPatientData((prev: any) => ({ ...prev, district: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-5 space-y-1">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase">State</Label>
                      <Input
                        placeholder="State"
                        className="h-9 text-[13px] border-0 border-b border-input rounded-none focus-visible:ring-0 focus-visible:border-b-primary bg-transparent shadow-none"
                        value={editPatientData.state}
                        onChange={(e) => setEditPatientData((prev: any) => ({ ...prev, state: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase">ZIP</Label>
                      <Input
                        placeholder="ZIP"
                        className="h-9 text-[13px] border-0 border-b border-input rounded-none focus-visible:ring-0 focus-visible:border-b-primary bg-transparent shadow-none"
                        value={editPatientData.zip}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 5);
                          setEditPatientData((prev: any) => ({ ...prev, zip: val }));
                        }}
                        maxLength={5}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/30">
              <Button
                variant="ghost"
                onClick={() => { setEditPatientModalOpen(false); setEditPatientData(null); }}
                className="rounded-none text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-destructive"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdatePatient}
                disabled={editSaving}
                className="rounded-none gap-2 bg-brand/10 hover:bg-brand text-brand hover:text-white border border-brand/20 font-black uppercase tracking-widest text-[11px] shadow-md hover:shadow-xl transition-all"
              >
                <Check className="w-4 h-4" />
                {editSaving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

        {/* Past Records Modal */}
        <Dialog open={isRecordModalOpen} onOpenChange={setIsRecordModalOpen}>
          <DialogContent className="print:hidden no-print max-w-3xl p-0 overflow-hidden border-0 bg-white rounded-none shadow-2xl flex flex-col max-h-[85vh]">
            <DialogHeader className="p-4 md:p-6 bg-slate-50 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-brand/10 flex items-center justify-center rounded-none shadow-inner border border-brand/20 shrink-0">
                  <ClipboardList className="w-5 h-5 md:w-6 md:h-6 text-brand" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tighter truncate">
                    {selectedRecordPatient?.name || "Patient Records"}
                  </DialogTitle>
                  <DialogDescription className="text-[9px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex flex-wrap items-center gap-2 md:gap-4">
                    <span>MRN: {selectedRecordPatient?.mrNumber}</span>
                    <span className="hidden md:inline">•</span>
                    <span>{selectedRecordPatient?.mobile}</span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-3">
                  <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Loading Patient History...</span>
                </div>
              ) : patientHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                    <History className="w-6 h-6 text-slate-300" />
                  </div>
                  <h3 className="text-sm font-black text-slate-600 uppercase tracking-tighter mb-1">No Past Records Found</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">This patient does not have any recorded visits in the system yet.</p>
                </div>
              ) : (
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  {patientHistory.map((visit, idx) => {
                    const isPreDoctor = visit.status === 'AT_RECEPTION' || visit.status === 'IN_REFRACTION' || visit.status === 'REFRACTION_DONE' || visit.status === 'WITH_DOCTOR';
                    const hasGlassRx = (() => {
                      const rawGlass = visit.glassPrescription || visit.consultation?.finalGlassPrescription;
                      if (!rawGlass) return false;
                      try {
                        const parsed = typeof rawGlass === 'string' ? JSON.parse(rawGlass) : rawGlass;
                        const dist = parsed?.distance || {};
                        const nr = parsed?.near || {};
                        const hasDist = ['OD', 'OS'].some(eye => dist[eye]?.sphere || dist[eye]?.cylinder || dist[eye]?.axis);
                        const hasNr = ['OD', 'OS'].some(eye => nr[eye]?.sphere || nr[eye]?.cylinder || nr[eye]?.axis || nr[eye]?.nearAdd || nr[eye]?.nearDsph || nr[eye]?.add);
                        if (hasDist || hasNr) return true;

                        const hasFlat = ['OD', 'OS'].some(eye => {
                          const e = parsed?.[eye] || {};
                          return e.sphere || e.cylinder || e.axis || e.add || e.nearDsph || e.nearCylinder || e.nearAxis || e.nearAdd || e.nearDsph;
                        });
                        return hasFlat;
                      } catch (e) {
                        return true;
                      }
                    })();

                    const hasMedicalRx = (() => {
                      const rawMeds = visit.medicalPrescription || visit.consultation?.medicalPrescription || visit.consultation?.medications;
                      if (!rawMeds) return false;
                      try {
                        const parsed = typeof rawMeds === 'string' ? JSON.parse(rawMeds) : rawMeds;
                        return Array.isArray(parsed) ? parsed.length > 0 : !!parsed;
                      } catch (e) {
                        return true;
                      }
                    })();

                    const hasDoctorReport = (() => {
                      const c = visit.consultation;
                      if (!c) return false;
                      if (c.notes && c.notes.trim() !== "") return true;
                      if (c.diagnosisText && c.diagnosisText.trim() !== "") return true;
                      if (c.diagnosisCode && c.diagnosisCode.trim() !== "") return true;
                      if (c.anteriorSegment || c.slitLampObservation) {
                        try {
                          const parsed = typeof c.anteriorSegment === 'string' ? JSON.parse(c.anteriorSegment) : (c.anteriorSegment || c.slitLampObservation);
                          if (parsed) {
                            const slitLamp = parsed.slitLamp || parsed;
                            const activeKeys = Object.keys(slitLamp).filter(key => key !== 'dilation' && (slitLamp[key]?.OD || slitLamp[key]?.OS));
                            if (activeKeys.length > 0) return true;
                          }
                        } catch (e) {}
                      }
                      if (c.fundusObservation) {
                        try {
                          const parsed = typeof c.fundusObservation === 'string' ? JSON.parse(c.fundusObservation) : c.fundusObservation;
                          if (parsed) {
                            const activeKeys = Object.keys(parsed).filter(key => parsed[key]?.OD || parsed[key]?.OS);
                            if (activeKeys.length > 0) return true;
                          }
                        } catch (e) {}
                      }
                      if (c.medicalPrescription || c.medications) {
                        try {
                          const parsed = typeof c.medicalPrescription === 'string' ? JSON.parse(c.medicalPrescription) : (c.medicalPrescription || c.medications);
                          if (Array.isArray(parsed) && parsed.length > 0) return true;
                        } catch (e) {}
                      }
                      if (c.finalGlassPrescription) {
                        try {
                          const parsed = typeof c.finalGlassPrescription === 'string' ? JSON.parse(c.finalGlassPrescription) : c.finalGlassPrescription;
                          if (parsed && Object.keys(parsed).length > 0) return true;
                        } catch (e) {}
                      }
                      return false;
                    })();

                    return (
                      <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-100 text-slate-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 group-[.is-active]:bg-brand group-[.is-active]:text-white z-10">
                          <CalendarIcon className="w-4 h-4" />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-none border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all">
                          <div className="flex flex-col gap-1 mb-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {(visit.visitedAt || visit.date || visit.createdAt) 
                                ? format(new Date(visit.visitedAt || visit.date || visit.createdAt), "dd MMM yyyy") 
                                : "Unknown Date"}
                            </span>
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{visit.doctorName || visit.consultingDoctorName || "General Checkup"}</h4>
                            <span className="text-xs text-slate-500 font-medium">{visit.reasonForVisit || "Routine Visit"}</span>
                            
                            <div className="flex flex-wrap gap-2 mt-2">
                               {(() => {
                                 const rawStatus = visit.status || "COMPLETED";
                                 const normalizedStatus = (backendStatusMap[rawStatus] || "completed") as PatientStatus;
                                 const statusColorClass = statusColors[normalizedStatus] || "bg-slate-500";
                                 const statusLabel = (statusLabels[normalizedStatus] || rawStatus).toUpperCase();
                                 return (
                                   <Badge className={cn("text-[9px] border-0 px-2.5 py-0.5 font-bold text-white rounded-full flex items-center justify-center uppercase tracking-wider shadow-sm", statusColorClass)}>
                                     {statusLabel}
                                   </Badge>
                                 );
                                })()}
                               {(() => {
                                 if (!visit.consultingDoctorName) return null;
                                 const docName = visit.consultingDoctorName;
                                 const cleanDocName = docName.toUpperCase().startsWith("DR") ? docName : `Dr. ${docName}`;
                                 return (
                                   <Badge variant="outline" className="text-[9px] uppercase tracking-widest bg-slate-50 text-slate-600 border-slate-200">
                                     {cleanDocName}
                                   </Badge>
                                 );
                                })()}
                               {visit.id && <Badge variant="outline" className="text-[9px] uppercase tracking-widest bg-slate-50 text-slate-400 border-slate-200 font-mono">REF: {(visit.id).substring(0,8)}</Badge>}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                            <Button size="sm" variant="outline" className="h-7 text-[9px] font-black uppercase tracking-widest rounded-none border-slate-200 hover:bg-slate-50" onClick={() => setViewingRefractionVisit(visit)} disabled={!visit.refraction}>
                              <Eye className="w-3 h-3 mr-1.5" /> Refraction
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-[9px] font-black uppercase tracking-widest rounded-none border-slate-200 hover:bg-slate-50" onClick={() => setViewingHistoricalVisit(visit)} disabled={(!visit.consultation || isPreDoctor) && !hasDoctorReport}>
                              <FileText className="w-3 h-3 mr-1.5" /> Doctor Report
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-[9px] font-black uppercase tracking-widest rounded-none border-slate-200 hover:bg-slate-50" onClick={() => handlePrintReport(visit, 'glass')} disabled={!hasGlassRx}>
                              <Printer className="w-3 h-3 mr-1.5" /> Glass Rx
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-[9px] font-black uppercase tracking-widest rounded-none border-slate-200 hover:bg-slate-50" onClick={() => handlePrintReport(visit, 'medical')} disabled={!hasMedicalRx}>
                              <Printer className="w-3 h-3 mr-1.5" /> Medical Rx
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Unified Print Layout for Reception */}
        {printType && printVisit && createPortal(
          <div id="print-section" className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 m-0 overflow-visible print-section">
            <SharedPrintLayout printData={printVisit} printType={printType} />
          </div>,
          document.body
        )}
        
        {/* Refraction Report Modal */}
        <Dialog open={!!viewingRefractionVisit} onOpenChange={(open) => !open && setViewingRefractionVisit(null)}>
          <DialogContent className="print:hidden no-print max-w-[95vw] w-full md:w-[1200px] h-[95vh] md:h-[85vh] p-0 overflow-hidden bg-slate-50 flex flex-col rounded-xl border border-slate-200 shadow-2xl">
            <DialogTitle className="sr-only">Refraction Report</DialogTitle>
            <DialogHeader className="p-4 md:p-6 bg-slate-50 border-b border-slate-100 shrink-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-lg md:text-xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-brand" />
                  Clinical Refraction Report Summary
                </DialogTitle>
                <DialogDescription className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
                  Comprehensive summary of patient diagnostics, visual acuity matrix, objective results, subjective acceptance protocols, and prescription recommends.
                </DialogDescription>
              </div>
              <Button
                size="sm"
                className="w-full md:w-auto h-10 md:h-9 px-4 bg-brand hover:bg-brand-hover text-white font-black uppercase tracking-widest text-[10px] gap-2 rounded-none shadow-sm md:mr-6 border-0"
                onClick={() => handlePrintReport(viewingRefractionVisit, 'refraction')}
              >
                <Printer className="w-4 h-4" /> Print Refraction
              </Button>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/30">
              {viewingRefractionVisit && (
                <RefractionSummaryView
                  refractionData={{
                    ...viewingRefractionVisit.refraction,
                    consultantName: viewingRefractionVisit.doctorName || viewingRefractionVisit.consultingDoctorName || "Dr. Gajendran MBBS DO",
                    optometristName: viewingRefractionVisit.refraction?.refractionistName || viewingRefractionVisit.refraction?.optometristName || "Not Attended"
                  }}
                  patient={selectedRecordPatient}
                  hideHeader={true}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Doctor Report Modal */}
        <Dialog open={!!viewingHistoricalVisit} onOpenChange={(open) => !open && setViewingHistoricalVisit(null)}>
          <DialogContent className="print:hidden no-print max-w-[95vw] w-full md:w-[1200px] h-[95vh] md:h-[85vh] p-0 overflow-hidden bg-slate-50 flex flex-col rounded-xl border border-slate-200 shadow-2xl">
            <DialogTitle className="sr-only">Doctor Report</DialogTitle>
            {viewingHistoricalVisit && (
              <ConsultationSummaryView 
                selectedHistoricalVisit={viewingHistoricalVisit} 
                patient={selectedRecordPatient} 
                triggerPrint={(type) => {
                  handlePrintReport(viewingHistoricalVisit, type);
                }} 
              />
            )}
          </DialogContent>
        </Dialog>
    </div>
  );
}

export default ReceptionStation;
