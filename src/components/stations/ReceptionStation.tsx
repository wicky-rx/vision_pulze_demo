import { useState, useEffect, useRef, useCallback } from "react";
import { UserPlus, Search, Calendar as CalendarIcon, Phone, ArrowRight, Printer, Check, ChevronsUpDown, ChevronLeft, ChevronRight, Clock, ClipboardList, Pencil } from "lucide-react";
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
import { API_BASE_URL } from "@/config";
import { type Patient } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { toTitleCase, calculateAgeFromDob, parseDDMMYYYY, getPatientAgeString, getPatientAgeNumber } from "@/lib/utils";
import { TN_PLACES } from "@/data/tnPlaces";
import { DoctorSchedulesPanel } from "@/components/DoctorSchedulesPanel";
import { format, addDays, subDays, startOfToday } from "date-fns";
import { formatToAMPM } from "@/lib/dateUtils";

const BarcodeGenerator = ({ value, height = 30, barWidth = 1 }: { value: string, height?: number, barWidth?: number }) => {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current && value) {
      try {
        JsBarcode(barcodeRef.current, value, {
          format: "CODE128",
          displayValue: true,
          text: value,
          fontSize: 14,
          height: height,
          width: barWidth,
          margin: 0,
        });
      } catch (error) {
        console.error("Barcode generation error:", error);
      }
    }
  }, [value]);

  if (!value) return null;

  return <svg ref={barcodeRef} className="max-w-full h-auto"></svg>;
};



export function ReceptionStation() {
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
    state: "Tamil Nadu",
    pincode: "",
    contactNumber: "",
    secondaryContact: "",
    relationship: "",
    dob: "",
    mrNumber: "",
  });

  // DOB helper states (also updates formData.dob)
  const [dobPickerValue, setDobPickerValue] = useState(""); // ISO date string for <input type="date">
  const [dobTextValue, setDobTextValue] = useState("");     // Raw DD/MM/YYYY text typed by user
  const [dobError, setDobError] = useState("");             // Inline validation message

  const [isMobileExisting, setIsMobileExisting] = useState(false);
  const [parentMrn, setParentMrn] = useState("");
  const [existingPatientName, setExistingPatientName] = useState("");
  const [patientData, setPatientData] = useState<any>(null);
  const [returningPatients, setReturningPatients] = useState<Patient[]>([]);
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
  const [settingAppointment, setSettingAppointment] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [appointmentDialogMode, setAppointmentDialogMode] = useState<"START_VISIT" | "SCHEDULE">("SCHEDULE");

  const { toast } = useToast();

  useEffect(() => {
    if (dobPopoverOpen && formData.dob) {
      setCalendarMonth(new Date(formData.dob));
    }
  }, [dobPopoverOpen, formData.dob]);


  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/api/appointments/doctors/slots`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) setDoctors(await res.json());
      } catch (e) { console.error("Error fetching doctors", e); }
    };
    fetchDocs();

    const handleUpdate = () => {
      fetchDocs();
    };
    window.addEventListener("patientQueueUpdated", handleUpdate);
    window.addEventListener("doctorSchedulesUpdated", handleUpdate);
    return () => {
      window.removeEventListener("patientQueueUpdated", handleUpdate);
      window.removeEventListener("doctorSchedulesUpdated", handleUpdate);
    };
  }, []);

  useEffect(() => {
    setSelectedTimeSlot("");
  }, [selectedDoctorId, selectedAppointmentDate]);

  // Core DOB → age resolver (shared between picker & text input)

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



  // Handler: manual DD/MM/YYYY text input changed
  const handleDobTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const rawDigits = rawInput.replace(/\D/g, "");
    let formatted = "";

    if (rawDigits.length > 0) {
      // DD
      formatted = rawDigits.slice(0, 2);
      // /MM
      if (rawDigits.length >= 3) {
        formatted += "/" + rawDigits.slice(2, 4);
      }
      // /YYYY
      if (rawDigits.length >= 5) {
        formatted += "/" + rawDigits.slice(4, 8);
      }
    }

    setDobTextValue(formatted);
    setDobError("");

    // Only attempt parse when we have 10 chars (DD/MM/YYYY)
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
        const token = localStorage.getItem("token");
        console.log("mob fetch req");
        const response = await fetch(`${API_BASE_URL}/api/patients/check-mobile?mobile=${encodeURIComponent(mobile)}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setIsMobileExisting(!!data.exists);
          if (data.exists && data.patients && data.patients.length > 0) {
            const p = data.patients[0];
            setParentMrn(p.mrNumber.toString());
            setExistingPatientName(p.name);
          } else {
            setParentMrn("");
            setExistingPatientName("");
          }
        } else {
          setIsMobileExisting(false);
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
    const fetchReturningPatients = async () => {
      if (searchQuery.trim().length < 3) {
        setReturningPatients([]);
        return;
      }
      setLoadingReturning(true);
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/api/patients/search?query=${encodeURIComponent(searchQuery)}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (!Array.isArray(data)) {
            setReturningPatients([]);
            return;
          }

          const availablePatients = data.filter((p: any) => {
            if (!p.visits || p.visits.length === 0) return true;
            return p.visits;
          });

          const mapped = availablePatients.map((p: any) => {
            const hasActiveVisitToday = p.visits?.some((v: any) => {
              if (v.status === 'COMPLETED') return false;
              const visitDate = new Date(v.visitedAt || v.updatedAt || v.createdAt);
              const today = new Date();
              return visitDate.toDateString() === today.toDateString();
            });

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
        } else {
          setReturningPatients([]);
        }
      } catch (error) {
        console.error("Error searching patients:", error);
        setReturningPatients([]);
      } finally {
        setLoadingReturning(false);
      }
    };

    const debounceTimer = setTimeout(fetchReturningPatients, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleInputChange = (field: string, value: string) => {
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

    setFormData((prev) => ({ ...prev, [field]: filteredValue }));
  };


  const handleStartNewVisit = async (mrNumber: string) => {
    setAssigningPatientMrn(mrNumber);
    setIsDoctorSelectOpen(true);
  };

  const confirmStartNewVisit = async () => {
    if (!assigningPatientMrn) return;
    if (startingVisitMrn) return;

    const mrNumber = assigningPatientMrn;
    const doctor = doctors.find(d => d.id === selectedDoctorId);

    try {
      setStartingVisitMrn(mrNumber);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/patients/${mrNumber}/visits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          doctorId: selectedDoctorId || undefined,
          doctorName: doctor ? doctor.name : undefined,
          timeSlot: selectedTimeSlot || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to start new visit");
      }

      toast({
        title: "New visit created successfully."
      });

      setIsDoctorSelectOpen(false);
      setAssigningPatientMrn(null);
      setSelectedDoctorId("");

      // Update the local list so the button becomes disabled without a full refetch
      setReturningPatients(prev => prev.map(p =>
        p.mrNumber === mrNumber ? { ...p, hasActiveVisitToday: true, lastVisitStatus: 'WAITING' } : p
      ));

      // Update patient queue and appointments on the side panel
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

  const handleOpenAppointmentDialog = (mrNumber: string | null, name: string, mode: "START_VISIT" | "SCHEDULE" = "SCHEDULE") => {
    setAppointmentPatientMrn(mrNumber);
    setAppointmentPatientName(name);
    setAppointmentDialogMode(mode);
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

    // For New Patient registration tab:
    // We just save the selection locally to be submitted with Register Patient.
    if (appointmentPatientMrn === null) {
      setIsAppointmentDialogOpen(false);
      // selectedDoctorId, selectedAppointmentDate, selectedTimeSlot are already in state.
      // We just need to make sure we don't clear them for the new patient.
      return;

    }

    // For Returning Patient:
    setSettingAppointment(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          patientMrNumber: appointmentPatientMrn,
          doctorId: selectedDoctorId,
          appointmentDate: selectedAppointmentDate,
          notes: appointmentNote,
          timeSlot: selectedTimeSlot
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to set appointment");

      toast({
        title: data.type === 'VISIT_CREATED' ? "Visit created for today" : "Appointment scheduled",
        description: data.message
      });

      setIsAppointmentDialogOpen(false);
      setAppointmentPatientMrn(null);
      setAppointmentNote("");
      setSelectedDoctorId("");
      setSelectedTimeSlot("");

      // Update the returning patients list to reflect the new state (if today's visit)
      if (data.type === 'VISIT_CREATED') {
        setReturningPatients(prev => prev.map(p =>
          p.mrNumber === appointmentPatientMrn ? { ...p, hasActiveVisitToday: true, lastVisitStatus: 'WAITING' } : p
        ));
        window.dispatchEvent(new CustomEvent("patientQueueUpdated"));
      }

      // Refresh the right panel
      window.dispatchEvent(new CustomEvent("appointmentUpdated"));

    } catch (error: any) {
      console.error("Set appointment error:", error);
      toast({ variant: "destructive", title: "Failed to set appointment", description: error.message });
    } finally {
      setSettingAppointment(false);
    }
  }

  const handlePrintOPCard = async (mrNumber: string) => {
    if (printingOPCardMrn) return;
    try {
      setPrintingOPCardMrn(mrNumber);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/patients/search?query=${mrNumber}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to fetch patient data");
      const data = await response.json();
      // API returns an array; pick the first match
      const p = Array.isArray(data) ? data[0] : data.patient ?? data;
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
        pincode: p.pincode,
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

    // Mobile validation: Exact 10 digits
    if (formData.contactNumber.length !== 10) {
      toast({
        variant: "destructive",
        title: "Invalid Mobile Number",
        description: "Mobile number must be exactly 10 digits.",
      });
      return;
    }

    // PIN validation: Exact 6 digits (if provided)
    if (formData.pincode && formData.pincode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid PIN Code",
        description: "PIN code must be exactly 6 digits.",
      });
      return;
    }

    // Secondary contact validation: Exact 10 digits (if provided)
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
      const token = localStorage.getItem("token");

      const formattedName = toTitleCase(formData.name.trim());
      const doctor = doctors.find(d => d.id === selectedDoctorId);

      const submissionData: any = {
        ...formData,
        name: formattedName,
        doctorId: selectedDoctorId || undefined,
        doctorName: doctor ? doctor.name : undefined,
        timeSlot: selectedTimeSlot || undefined,
        appointmentDate: selectedAppointmentDate || undefined
      };
      delete submissionData.age; // DOB is the single source of truth now. Backend handles parsing or storing DOB

      // If mobile exists, we act on the backend logic found in registerPatient endpoint
      // The backend expects the relationship field to be named 'relationshipType'.
      if (isMobileExisting && parentMrn) {
        submissionData.parentMrn = parentMrn;
        submissionData.relationshipType = formData.relationship;
        delete submissionData.relationship; // clean up payload
      }

      const response = await fetch(`${API_BASE_URL}/api/patients/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(submissionData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to register patient");
      }

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
        state: "Tamil Nadu",
        pincode: "",
        contactNumber: "",
        secondaryContact: "",
        dob: "",
        mrNumber: "",
      });
      // Reset selections
      setSelectedDoctorId("");
      setSelectedTimeSlot("");
      setSelectedAppointmentDate(new Date());

      // Reset DOB fields
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

      // Dispatch events to update the side panel and queue
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

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white relative">
      <div className="bg-white border-b border-orange-100 px-4 md:px-8 py-3 flex items-center justify-between shrink-0 shadow-sm z-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-sprinkles z-0"></div>
        <div className="flex items-center gap-5 relative z-10">
          <div className="p-3 bg-orange-600 text-white shadow-lg"><UserPlus className="w-6 h-6 shrink-0" /></div>
          <div className="flex flex-col">
            <span className="text-[12px] font-black uppercase tracking-widest text-orange-600 mb-0.5">Patient Enrollment</span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tighter">Registration Profile</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 p-3 lg:p-6 flex flex-col lg:flex-row gap-4 lg:gap-6 overflow-y-auto lg:overflow-y-hidden bg-orange-50/30 relative overflow-x-hidden">
        <div className="absolute inset-0 pointer-events-none bg-sprinkles z-0"></div>
        <Tabs defaultValue="new" className="flex-1 flex flex-col min-w-0 lg:overflow-y-auto px-1 relative z-10
          lg:[&::-webkit-scrollbar]:w-1 
          lg:[&::-webkit-scrollbar-track]:bg-transparent 
          lg:[&::-webkit-scrollbar-thumb]:bg-slate-200/50 
          lg:[&::-webkit-scrollbar-thumb]:rounded-full">
          <TabsList className="h-12 bg-slate-100 p-1 mb-6 grid grid-cols-2 w-full max-w-md mx-auto rounded-none border border-slate-200/80 shadow-inner backdrop-blur-sm shrink-0">
            <TabsTrigger
              value="new"
              className="h-full rounded-none gap-2 font-black text-[12px] uppercase tracking-wider transition-all duration-300 whitespace-nowrap
              data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-md
              data-[state=active]:after:w-full data-[state=active]:after:h-1 data-[state=active]:after:bg-orange-600 data-[state=active]:after:absolute data-[state=active]:after:bottom-0 
              relative hover:bg-slate-50 hover:text-orange-600"
            >
              <UserPlus className="w-4 h-4" />
              New Patient
            </TabsTrigger>
            <TabsTrigger
              value="returning"
              className="h-full rounded-none gap-2 font-black text-[12px] uppercase tracking-wider transition-all duration-300 whitespace-nowrap
              data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-md
              data-[state=active]:after:w-full data-[state=active]:after:h-1 data-[state=active]:after:bg-orange-600 data-[state=active]:after:absolute data-[state=active]:after:bottom-0 
              relative hover:bg-slate-50 hover:text-orange-600"
            >
              <Search className="w-4 h-4" />
              Returning Patient
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

                  <div className="space-y-1.5 w-[140px]">
                    <Label className="clinical-label">Gender *</Label>
                    <Select value={formData.gender} onValueChange={(val) => handleInputChange("gender", val)}>
                      <SelectTrigger className="px-2 rounded-none">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="rounded-none">
                        <SelectItem value="Male">{(formData.age && parseInt(formData.age, 10) < 18) || (formData.age === "0") ? "Master" : "Male"}</SelectItem>
                        <SelectItem value="Female">{(formData.age && parseInt(formData.age, 10) < 18) || (formData.age === "0") ? "Miss" : "Female"}</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
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
                      <div className="bg-amber-50 rounded-none border border-amber-200 mt-2 p-3 space-y-3">
                        <div className="text-xs text-amber-800 leading-tight">
                          This mobile number is registered to <span className="font-semibold">{existingPatientName}</span> <span className="opacity-80">(MRN: {parentMrn})</span>.
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-amber-900">Relationship to Patient *</Label>
                          <Select value={formData.relationship} onValueChange={(val) => handleInputChange("relationship", val)}>
                            <SelectTrigger className="h-8 text-xs bg-white border-amber-200 focus:ring-amber-500 rounded-none"><SelectValue placeholder="Select Relationship" /></SelectTrigger>
                            <SelectContent className="rounded-none">
                              <SelectItem value="Father">Father</SelectItem>
                              <SelectItem value="Mother">Mother</SelectItem>
                              <SelectItem value="Son">Son</SelectItem>
                              <SelectItem value="Daughter">Daughter</SelectItem>
                              <SelectItem value="Spouse">Spouse</SelectItem>
                              <SelectItem value="Brother">Brother</SelectItem>
                              <SelectItem value="Sister">Sister</SelectItem>
                              <SelectItem value="Grandfather">Grandfather</SelectItem>
                              <SelectItem value="Grandmother">Grandmother</SelectItem>
                              <SelectItem value="Grandson">Grandson</SelectItem>
                              <SelectItem value="Granddaughter">Granddaughter</SelectItem>
                              <SelectItem value="Uncle">Uncle</SelectItem>
                              <SelectItem value="Aunt">Aunt</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
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
                      <SelectTrigger className="h-9 text-xs rounded-none border-slate-200 bg-white">
                        <SelectValue placeholder="Identify Consultant..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-none">
                        {doctors.map(doc => (
                          <SelectItem key={doc.id} value={doc.id} className="group">
                            <div className="flex flex-col py-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold leading-none group-hover:text-orange-900 group-focus:text-orange-900 group-data-[state=checked]:text-orange-900 uppercase tracking-tight text-sm transition-colors">{doc.name}</span>
                                {doc.schedules?.some((s: any) => s.dayOfWeek === new Date().getDay()) && (
                                  <Badge className="h-3.5 px-1 text-[8px] bg-emerald-500 hover:bg-emerald-600 border-0 font-black tracking-widest text-white">ON DUTY</Badge>
                                )}
                              </div>
                              <span className="text-[9px] text-muted-foreground/70 group-hover:text-orange-900/80 group-focus:text-orange-900/80 group-data-[state=checked]:text-orange-900/80 uppercase tracking-tight mt-1 transition-colors">{doc.specialization?.name || "General Specialist"}</span>
                            </div>
                          </SelectItem>
                        ))}
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
                        <SelectTrigger className="h-9 text-[11px] font-black uppercase tracking-widest gap-2 bg-blue-50/30 border-slate-200 text-orange-600 rounded-none shadow-sm">
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
                              className="text-[9px] font-bold text-slate-400 hover:text-primary rounded-none py-2 cursor-pointer flex items-center gap-2"
                            >
                              <CalendarIcon className="w-3 h-3" />
                              Schedule for later Date?
                            </SelectItem>
                          </div>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Button
                        variant="outline"
                        disabled
                        className="h-9 text-[10px] font-bold uppercase tracking-widest gap-2 bg-orange-50/50 border-dashed border-slate-200 text-slate-300 rounded-none cursor-not-allowed"
                      >
                        Select Doctor first
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="clinical-label">Address Details</Label>
                  <div className="space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-2 h-auto md:h-9 w-full">
                      <div className="flex-[0.9] min-w-0">
                        <Input
                          placeholder="Door No"
                          className="h-10 text-[13px] px-1 border-0 border-b border-input rounded-none focus-visible:ring-0 focus-visible:border-b-primary bg-transparent shadow-none"
                          value={formData.doorNo}
                          onChange={(e) => handleInputChange("doorNo", e.target.value)}
                        />
                      </div>
                      <div className="flex-[2] min-w-0">
                        <Input
                          placeholder="Street"
                          className="h-10 text-[13px] px-1 border-0 border-b border-input rounded-none focus-visible:ring-0 focus-visible:border-b-primary bg-transparent shadow-none"
                          value={formData.street}
                          onChange={(e) => handleInputChange("street", e.target.value)}
                        />
                      </div>
                      <div className="flex-[1.5] min-w-0">
                        <Input
                          placeholder="Area"
                          className="h-10 text-[13px] px-1 border-0 border-b border-input rounded-none focus-visible:ring-0 focus-visible:border-b-primary bg-transparent shadow-none"
                          value={formData.area}
                          onChange={(e) => handleInputChange("area", e.target.value)}
                        />
                      </div>
                      <div className="flex-[1.5] min-w-0 relative group">
                        <Input
                          placeholder="City"
                          className="h-10 text-[13px] px-1 border-0 border-b border-input rounded-none focus-visible:ring-0 focus-visible:border-b-primary bg-transparent shadow-none"
                          value={formData.city}
                          onChange={(e) => handleInputChange("city", e.target.value)}
                          onFocus={() => setCityPopoverOpen(true)}
                          onBlur={() => setTimeout(() => setCityPopoverOpen(false), 200)}
                        />
                        {cityPopoverOpen && formData.city.length >= 1 && (
                          <div className="absolute top-full left-0 w-64 z-50 mt-1 bg-white border border-border rounded-md shadow-xl max-h-60 overflow-y-auto">
                            {TN_PLACES.filter(d => d.toLowerCase().includes(formData.city.toLowerCase())).map((ct) => (
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
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-2 h-auto md:h-10 w-full md:w-3/4">
                      <div className="flex-1 min-w-0 relative group">
                        <Input
                          placeholder="District"
                          className="h-10 text-[13px] px-1 border-0 border-b border-input rounded-none focus-visible:ring-0 focus-visible:border-b-primary bg-transparent shadow-none"
                          value={formData.district}
                          onChange={(e) => handleInputChange("district", e.target.value)}
                          onFocus={() => setDistrictPopoverOpen(true)}
                          onBlur={() => setTimeout(() => setDistrictPopoverOpen(false), 200)}
                        />
                        {districtPopoverOpen && formData.district.length >= 1 && (
                          <div className="absolute top-full left-0 w-64 z-50 mt-1 bg-white border border-border rounded-md shadow-xl max-h-60 overflow-y-auto">
                            {TN_DISTRICTS.filter(d => d.toLowerCase().includes(formData.district.toLowerCase())).map((dist) => (
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
                      <div className="flex-1 min-w-0 relative group">
                        <Input
                          placeholder="State"
                          className="h-10 text-[13px] px-1 border-0 border-b border-input rounded-none focus-visible:ring-0 focus-visible:border-b-primary bg-transparent shadow-none"
                          value={formData.state}
                          onChange={(e) => handleInputChange("state", e.target.value)}
                          onFocus={() => setStatePopoverOpen(true)}
                          onBlur={() => setTimeout(() => setStatePopoverOpen(false), 200)}
                        />
                        {statePopoverOpen && formData.state.length >= 1 && (
                          <div className="absolute top-full left-0 w-64 z-50 mt-1 bg-white border border-border rounded-md shadow-xl max-h-60 overflow-y-auto">
                            {INDIAN_STATES.filter(s => s.toLowerCase().includes(formData.state.toLowerCase())).map((st) => (
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
                      <div className="flex-[0.7] min-w-0">
                        <Input
                          placeholder="PIN"
                          className="h-10 text-[13px] px-1 border-0 border-b border-input rounded-none focus-visible:ring-0 focus-visible:border-b-primary bg-transparent shadow-none"
                          value={formData.pincode}
                          onChange={(e) => handleInputChange("pincode", e.target.value)}
                          maxLength={6}
                        />

                      </div>
                    </div>
                  </div>
                </div>


                <div className="mt-4 flex flex-col sm:flex-row justify-center md:justify-end gap-3">
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
                          state: "Tamil Nadu",
                          pincode: "",
                          contactNumber: "",
                          secondaryContact: "",
                          relationship: "",
                          dob: "",
                        });
                        setParentMrn("");
                        setSelectedDoctorId("");
                        setSelectedTimeSlot("");
                        setSelectedAppointmentDate(new Date());
                      }}
                      className="h-12 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-destructive rounded-none"
                    >
                      Cancel Edit
                    </Button>
                  )}
                  <Button
                    onClick={handleRegisterPatient}
                    disabled={loading}
                    className={cn(
                      "w-full md:w-auto h-12 px-10 gap-2.5 font-black uppercase tracking-widest text-[11px] rounded-none shadow-lg hover:shadow-xl transition-all duration-300",
                      patientData ? "bg-orange-50 hover:bg-orange-600 text-orange-600 hover:text-white border border-orange-200" : "bg-orange-50 hover:bg-orange-600 text-orange-600 hover:text-white border border-orange-200"
                    )}
                  >
                    {patientData ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {loading ? "Processing..." : patientData ? "Update Patient Record" : "Register Patient"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="returning">
            <div className="space-y-4 px-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Name, MR Number, or Mobile..."
                  className="pl-9 h-11 rounded-none border-slate-200 focus:ring-orange-600/20 bg-white"
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
                        <CardContent className="p-3 lg:p-4 flex flex-col xl:flex-row items-start xl:items-center gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
                            <div className="w-10 h-10 rounded-none bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
                              <span className="text-sm font-black text-orange-600">
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
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 w-full xl:w-auto border-t xl:border-t-0 pt-3 xl:pt-0 mt-1 xl:mt-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setPatientData(p);
                                setParentMrn(p.parentMrNumber || "");
                                setFormData({
                                  name: p.name,
                                  co: p.co || "",
                                  age: p.age || "",
                                  gender: p.gender || "",
                                  doorNo: p.doorNo || "",
                                  street: p.street || "",
                                  area: p.area || "",
                                  city: p.city || "",
                                  district: p.district || "",
                                  state: p.state || "Tamil Nadu",
                                  pincode: p.pincode || "",
                                  contactNumber: p.contactNumber || "",
                                  secondaryContact: p.secondaryContact || "",
                                  relationship: p.relationshipType || "",
                                  dob: p.dob || "",
                                  mrNumber: p.mrNumber || ""
                                });
                                // We are on returning tab, but we want to show the Form
                                document.querySelector('[data-value="new"]')?.dispatchEvent(new MouseEvent('click', {bubbles: true}));
                              }}
                              className="w-9 h-9 p-0 shrink-0 text-slate-400 hover:text-orange-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all rounded-none"
                              title="Edit Patient Details"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePrintOPCard(p.mrNumber)}
                              disabled={printingOPCardMrn === p.mrNumber}
                              className="w-9 h-9 p-0 shrink-0 text-slate-400 hover:text-orange-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all rounded-none"
                              title="Print OP Card"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenAppointmentDialog(p.mrNumber, p.name, "SCHEDULE")}
                              disabled={p.hasActiveVisitToday}
                              className="h-9 px-3 gap-2 text-[10px] font-black uppercase tracking-widest border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-orange-600 transition-all shrink-0 rounded-none shadow-sm flex-1 sm:flex-none"
                            >
                              <CalendarIcon className="w-3.5 h-3.5" />
                              Schedule
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleStartNewVisit(p.mrNumber)}
                              disabled={p.hasActiveVisitToday || startingVisitMrn === p.mrNumber}
                              className="h-9 px-5 gap-2 bg-orange-50 hover:bg-orange-600 text-orange-600 hover:text-white font-black uppercase tracking-widest text-[10px] disabled:opacity-50 transition-all rounded-none border border-orange-200 shadow-sm hover:shadow-md flex-1 sm:flex-none"
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
        </Tabs>

        {/* Right section for doctor availability and daily bookings */}
        <DoctorSchedulesPanel />

        {/* OP Card Modal */}
        <Dialog open={showOPCard} onOpenChange={(open) => {
          setShowOPCard(open);
          if (!open) {
            setPatientData(null);
            setFormData(prev => ({ ...prev, mrNumber: "" }));
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                  <Printer className="w-4 h-4 text-orange-600" />
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
                    width: 60mm;
                    height: 40mm;
                  }
                }
              `}
            </style>
            
            {/* Screen Preview (Hidden in Print) */}
            <div className="border-4 border-orange-600/20 rounded-none p-8 bg-orange-50/50 space-y-6 print:hidden">
              <div className="text-center border-b border-border pb-3 flex flex-col items-center">
                <img
                  src="https://res.cloudinary.com/autodapp/image/upload/v1775219907/VPN%20Eye%20Hospital%20Logo.png"
                  alt="VPN Eye Hospital"
                  className="h-12 w-auto object-contain mb-2"
                />
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
                    {getPatientAgeString(patientData)} / {
                      (patientData?.dob || patientData?.age) && getPatientAgeNumber(patientData) < 18
                        ? (patientData?.gender === "Male" ? "Master" : patientData?.gender === "Female" ? "Miss" : patientData?.gender || "—")
                        : (patientData?.gender || "—")
                    }
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
                        patientData?.pincode
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
            <div id="print-section" className="hidden print:flex print:flex-col print:justify-start print:bg-white print:text-black print:p-1 print:w-[60mm] print:h-[40mm] print:font-sans print:box-border overflow-hidden">
              <div className="text-center border-b-2 border-black pb-0.5 mb-1 flex flex-col items-center shrink-0 w-full">
                <h2 className="font-black text-[9px] m-0 p-0 leading-tight uppercase tracking-tighter text-center w-full">VPN Eye Hospital</h2>
              </div>
              
              <div className="flex flex-row w-full flex-1 gap-1">
                <div className="flex flex-col gap-0.5 text-[7px] leading-tight flex-1">
                  <div className="flex justify-between items-center border-b border-gray-300 pb-[1px]">
                    <span className="font-bold uppercase text-[6px]">MRN:</span>
                    <span className="font-mono text-[7px]">{patientData?.mrNumber != null ? patientData.mrNumber.toString() : "—"}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-300 pb-[1px]">
                    <span className="font-bold uppercase text-[6px]">Name:</span>
                    <span className="truncate max-w-[20mm] text-right">{patientData?.name || "—"}</span>
                  </div>
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
                      {getPatientAgeString(patientData)} / {patientData?.gender?.charAt(0) || "—"}
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
                          patientData?.pincode
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOPCard(false)}>Close</Button>
              <Button onClick={() => window.print()} className="gap-2 bg-orange-50 hover:bg-orange-600 text-orange-600 hover:text-white border border-orange-200 font-bold transition-all shadow-md">
                <Printer className="w-4 h-4" />
                Print OP Card
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Doctor Selection Dialog for Returning Patient */}
        <Dialog open={isDoctorSelectOpen} onOpenChange={setIsDoctorSelectOpen}>
          <DialogContent className="max-w-md">
            <CardHeader className="bg-slate-50/10 border-b border-slate-100/50 pb-6">
              <CardTitle className="text-xl font-black uppercase tracking-tighter text-orange-600 flex items-center gap-4">
                <div className="w-1.5 h-6 bg-orange-600" /> Patient Information System
              </CardTitle>
              <DialogDescription className="hidden">
                Select a consultant and an available time slot to start a patient visit.
              </DialogDescription>
            </CardHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Consulting Personal</Label>
                <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                  <SelectTrigger className="h-auto min-h-[40px] py-2">
                    <SelectValue placeholder="Select Doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const today = new Date().getDay();
                      const now = new Date();
                      const currentTimeNum = now.getHours() * 60 + now.getMinutes();

                      const activeDoctors = doctors.filter(doc => {
                        return doc.schedules?.some((s: any) => {
                          if (s.dayOfWeek !== today) return false;
                          const [sh, sm] = s.startTime.split(":").map(Number);
                          const [eh, em] = s.endTime.split(":").map(Number);
                          const startNum = sh * 60 + sm;
                          const endNum = eh * 60 + em;
                          return (currentTimeNum >= startNum - 45 && currentTimeNum <= endNum + 45);
                        });
                      });

                      if (activeDoctors.length === 0) {
                        return <div className="py-4 px-3 text-[10px] text-muted-foreground italic text-center font-bold tracking-widest uppercase">No doctors currently available in their active session</div>;
                      }

                      return activeDoctors.map(doc => (
                        <SelectItem key={doc.id} value={doc.id} className="text-xs group">
                          <div className="flex items-center flex-wrap gap-2 py-0.5">
                            <span className="font-semibold leading-none group-hover:text-orange-900 group-focus:text-orange-900 group-data-[state=checked]:text-orange-900 uppercase tracking-tighter text-sm transition-colors">{doc.name}</span>
                            <Badge className="h-3.5 px-1 text-[8px] bg-emerald-500 hover:bg-emerald-600 border-0 text-white font-bold shrink-0">ON DUTY</Badge>
                            <span className="text-[9px] text-muted-foreground/70 group-hover:text-orange-900/80 group-focus:text-orange-900/80 group-data-[state=checked]:text-orange-900/80 uppercase tracking-tight transition-colors sm:ml-auto">{doc.specialization?.name || "General"}</span>
                          </div>
                        </SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDoctorSelectOpen(false)} className="border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800">Cancel</Button>
              <Button
                onClick={confirmStartNewVisit}
                disabled={!selectedDoctorId || startingVisitMrn}
                className="gap-2 bg-orange-50 hover:bg-orange-600 text-orange-600 hover:text-white border border-orange-200 shadow-sm"
              >
                {startingVisitMrn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Confirm Appointment
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Set Appointment Dialog */}
        <Dialog open={isAppointmentDialogOpen} onOpenChange={setIsAppointmentDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" />
                Set Appointment: {appointmentPatientName}
              </DialogTitle>
              <DialogDescription>
                Schedule an appointment on a specific date with your preferred consultant.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
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
                        variant={"outline"}
                        className={cn(
                          "flex-1 justify-start text-left font-normal h-10 border-slate-200 transition-all hover:bg-orange-600 hover:text-white group",
                          (!selectedAppointmentDate || appointmentDialogMode === "START_VISIT") && "text-muted-foreground"
                        )}
                        disabled={appointmentDialogMode === "START_VISIT"}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 group-hover:text-orange-900" />
                        {selectedAppointmentDate ? (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-x-2 leading-none">
                            <span className="font-bold text-orange-600 group-hover:text-orange-900 uppercase text-[10px] sm:text-xs transition-colors">{format(selectedAppointmentDate, "EEEE")}</span>
                            <span className="hidden sm:inline-block w-[1px] h-3 bg-slate-200 group-hover:bg-white/30"></span>
                            <span className="text-slate-500 group-hover:text-orange-900/90 font-medium transition-colors">{format(selectedAppointmentDate, "PPP")}</span>
                          </div>
                        ) : <span>Pick a date</span>}
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select Doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors
                      .filter(doc => {
                        const day = selectedAppointmentDate?.getDay();
                        return day !== undefined && doc.schedules?.some((s: any) => s.dayOfWeek === day);
                      })
                      .map(doc => (
                        <SelectItem key={doc.id} value={doc.id} className="group">
                          <div className="flex flex-col py-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold leading-none group-hover:text-orange-900 group-focus:text-orange-900 group-data-[state=checked]:text-orange-900 uppercase tracking-tighter transition-colors">{doc.name}</span>
                              <Badge className="h-3.5 px-1 text-[8px] bg-emerald-500 hover:bg-emerald-600 border-0 text-white font-bold tracking-tighter shadow-sm">AVAILABLE</Badge>
                            </div>
                            <span className="text-[9px] text-muted-foreground/70 group-hover:text-orange-900/80 group-focus:text-orange-900/80 group-data-[state=checked]:text-orange-900/80 uppercase tracking-tight mt-1 transition-colors">{doc.specialization?.name || "General"}</span>
                          </div>
                        </SelectItem>
                      ))}
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
                        const isSelected = selectedTimeSlot === `${s.startTime}-${s.endTime}`;
                        if (isToday) {
                          const [sh, sm] = s.startTime.split(":").map(Number);
                          const [eh, em] = s.endTime.split(":").map(Number);
                          const startNum = sh * 60 + sm;
                          const endNum = eh * 60 + em;

                          if (appointmentDialogMode === "START_VISIT") {
                            return endNum > currentTimeNum || isSelected;
                          }
                          return startNum > currentTimeNum || isSelected;
                        }
                        return true;
                      });

                      const displaySlots = (isToday && availableSlots.length === 0) ? daySlots : availableSlots;

                      if (displaySlots.length === 0) {
                        return (
                          <div className="py-2 px-3 text-[10px] text-muted-foreground italic text-center">
                            {isToday ? "No slots configured for today" : "No slots configured for this day"}
                          </div>
                        );
                      }

                      return displaySlots.map((s: any) => {
                        const [eh, em] = s.endTime.split(":").map(Number);
                        const endNum = eh * 60 + em;
                        const isEnded = isToday && endNum <= currentTimeNum;
                        
                        const slotIdx = daySlots.findIndex(allS => allS.id === s.id);
                        const slotLabel = `S${slotIdx + 1}`;
                        return (
                          <SelectItem key={s.id} value={`${s.startTime}-${s.endTime}`} className="text-xs focus:bg-orange-600 focus:text-white group">
                            <span className={cn(isEnded && "text-muted-foreground line-through opacity-50")}>
                              {slotLabel} — {formatToAMPM(s.startTime)} - {formatToAMPM(s.endTime)}
                            </span>
                            {(!isToday && daySlots.length > 0) && <span className="ml-2 text-[9px] opacity-50 group-focus:opacity-100 italic font-medium">(Alt Day)</span>}
                          </SelectItem>
                        );
                      });
                    })()}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Notes (Optional)</Label>
                <Textarea
                  placeholder="Any special instructions..."
                  className="resize-none h-20 text-xs"
                  value={appointmentNote}
                  onChange={(e) => setAppointmentNote(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAppointmentDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={confirmSetAppointment}
                disabled={!selectedDoctorId || !selectedAppointmentDate || !selectedTimeSlot || settingAppointment}
                className="gap-2 bg-orange-50 hover:bg-orange-600 text-orange-600 hover:text-white border border-orange-200 font-bold transition-all shadow-md hover:shadow-xl"
              >
                {settingAppointment ? "Scheduling..." : "Book Slot"}
                {!settingAppointment && <Check className="w-4 h-4" />}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default ReceptionStation;
