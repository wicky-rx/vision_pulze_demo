import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserPlus, Search, Calendar as CalendarIcon, Phone, ArrowRight, Printer, Check,
  ChevronsUpDown, ChevronLeft, ChevronRight, Clock, ClipboardList, Pencil, ChevronDown,
  Users, Upload, Trash2, FileText, Loader2, AlertTriangle, Zap, Image as ImageIcon,
  ChevronUp, Stethoscope, Crosshair, Glasses, Pill, LogOut, User, MapPin, UserCheck, Settings, Info, X
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { type Patient, type PatientStatus, statusLabels, statusColors } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { toTitleCase, calculateAgeFromDob, parseDDMMYYYY, getPatientAgeString, calculateWaitTime } from "@/lib/utils";
import { TN_PLACES } from "@/data/tnPlaces";
import { format, addDays, subDays } from "date-fns";
import { formatToAMPM } from "@/lib/dateUtils";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ScanReportGallery } from "@/components/ScanReportGallery";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const DAYS = [
  { id: 1, name: "Monday" },
  { id: 2, name: "Tuesday" },
  { id: 3, name: "Wednesday" },
  { id: 4, name: "Thursday" },
  { id: 5, name: "Friday" },
  { id: 6, name: "Saturday" },
  { id: 0, name: "Sunday" },
];

const backendStatusMap: Record<string, PatientStatus> = {
  at_reception: "reception",
  AT_RECEPTION: "reception",
  in_refraction: "optometrist",
  IN_REFRACTION: "optometrist",
  refraction_done: "refraction_done",
  REFRACTION_DONE: "refraction_done",
  with_doctor: "doctor",
  WITH_DOCTOR: "doctor",
  consulted: "consulted",
  CONSULTED: "consulted",
  at_optical: "optical",
  AT_OPTICAL: "optical",
  completed: "completed",
  COMPLETED: "completed",
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
  complaint?: string;
}

// Barcode Generator helper
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

// ----------------------------------------------------
// LOCAL COMPONENTS
// ----------------------------------------------------

function LocalTopHeader() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const sessionStr = localStorage.getItem("user_session");
  const userSession = sessionStr ? JSON.parse(sessionStr) : null;
  const userName = userSession?.name || "DEMO RECEPTIONIST";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_session");
    toast({ title: "Logged out successfully" });
    navigate("/login");
  };

  return (
    <header className="h-16 md:h-20 border-b border-brand/20 bg-white/85 backdrop-blur-xl flex items-center justify-between px-4 md:px-8 shrink-0 shadow-sm z-50 sticky top-0">
      <div className="flex items-center gap-6 md:gap-10">
        <div className="flex items-center lg:pr-10 lg:border-r border-slate-200/60 shrink-0">
          <div className="flex flex-col leading-none gap-0.5">
            <span style={{ fontFamily: "'Outfit', sans-serif" }} className="font-extrabold text-xl tracking-tight leading-none text-slate-900">
              Vision<span className="text-brand">Pulze</span>
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400 mt-0.5">
              Ophthalmic Ecosystem
            </span>
          </div>
        </div>

        <div className="space-y-0.5">
          <h2 className="text-sm lg:text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            Reception Desk
          </h2>
          <div className="flex items-center gap-2 text-[9px] lg:text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <CalendarIcon className="w-3 h-3" />
            {new Date().toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
          </div>
        </div>

        <div className="hidden 2xl:flex flex-col justify-center border-l border-slate-200 pl-10">
          <span className="text-xs font-black tracking-tight text-slate-900 leading-none mb-1">VISIONPULZE</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Ophthalmic Ecosystem</span>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <div className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-full border border-slate-200 bg-slate-50/50">
          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-tr from-brand to-rose-500 text-white shadow-lg shadow-brand/20">
            <User className="w-5 h-5" />
          </div>
          <div className="hidden lg:flex flex-col items-start text-left">
            <span className="text-[11px] font-black uppercase tracking-tight text-slate-900">{userName}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Practitioner</span>
          </div>
        </div>
      </div>
    </header>
  );
}

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

function LocalPatientQueue({
  selectedPatientId,
  onSelectPatient,
  doctors,
  refreshTrigger
}: {
  selectedPatientId?: string;
  onSelectPatient?: (patient: Patient) => void;
  doctors: any[];
  refreshTrigger: number;
}) {
  const [filter, setFilter] = useState<"all" | "in-refraction" | "with-doctor" | "completed">("all");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isQueueExpanded, setIsQueueExpanded] = useState(false);
  const { toast } = useToast();

  const fetchPatients = async () => {
    try {
      const data = await api.getQueue();
      if (!Array.isArray(data)) throw new Error("Invalid queue data");

      const today = new Date().toDateString();
      const todayPatients = data.filter((p: any) => {
        const dateStr = p.visitedAt || p.createdAt || p.registeredAt;
        if (!dateStr) return true;
        return new Date(dateStr).toDateString() === today;
      });

      const mapped = todayPatients.map((p: any, index: number) => {
        const rawStatus = (p.status ?? "").toLowerCase();
        const normalizedStatus: PatientStatus = backendStatusMap[rawStatus] ?? "reception";

        return {
          ...p,
          id: p.id || p._id,
          status: normalizedStatus,
          tokenNumber: p.tokenNumber || (index + 1),
          name: p.patient?.name || "Unknown Patient",
          mrNumber: p.mrNumber != null ? p.mrNumber.toString() : "—",
          age: p.patient?.dob || p.dob ? getPatientAgeString(p.patient || p) : p.patient?.age || p.age || "—",
          dob: p.patient?.dob || p.dob || "",
          gender: p.patient?.gender || p.gender || "",
          address: p.patient?.city || p.patient?.address || p.city || p.address || "",
          contactNumber: p.patient?.contactNumber || p.mobile || p.contactNumber || "—",
          consultingDoctorName: p.consultingDoctorName || "",
        };
      });

      setPatients(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [refreshTrigger]);

  const filtered = filter === "all"
    ? patients
    : patients.filter(p => {
      if (filter === "in-refraction") return p.status === "optometrist";
      if (filter === "with-doctor") return ["doctor", "refraction_done"].includes(p.status);
      if (filter === "completed") return ["consulted", "completed", "optical", "pharmacy"].includes(p.status);
      return true;
    });

  return (
    <div className="w-full lg:w-[200px] border-b lg:border-b-0 lg:border-r border-slate-200 bg-white flex flex-col shrink-0 lg:h-full overflow-hidden">
      <div className="px-4 py-4 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-semibold text-slate-800">Live Queue</h3>
            <Badge className="bg-brand/10 text-brand border-0 text-[11px]">{patients.length}</Badge>
          </div>
        </div>

        <div className="flex gap-0.5 p-0.5 bg-slate-100 rounded-lg">
          <div className="flex-1 px-0.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-md text-center bg-brand text-white shadow-sm cursor-default">
            All
          </div>
          <div className="flex-1 px-0.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-md text-center text-slate-400 cursor-default">
            Refract
          </div>
          <div className="flex-1 px-0.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-md text-center text-slate-400 cursor-default">
            Doctor
          </div>
          <div className="flex-1 px-0.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-md text-center text-slate-400 cursor-default">
            Done
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading queue...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No patients in this list</div>
        ) : (
          filtered.map((patient) => (
            <div
              key={patient.id}
              onClick={() => onSelectPatient?.(patient)}
              className={cn(
                "w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer border-l-4",
                selectedPatientId === patient.id ? "bg-brand/10 border-l-brand" : "border-l-transparent"
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 truncate leading-snug">{patient.name}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">MRN-{patient.mrNumber}</p>
                <p className="text-[10px] text-slate-500 mt-1">Age {patient.age} • {patient.address || "—"}</p>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                  Token-{patient.tokenNumber}
                </span>
                <Badge className={cn("text-[9px] uppercase tracking-wider text-white border-0 px-2 py-0.5 rounded-none font-bold", statusColors[patient.status] || "bg-slate-500")}>
                  {statusLabels[patient.status] || patient.status}
                </Badge>
                {patient.consultingDoctorName && (
                  <span className="text-[9px] text-slate-400 italic">Dr. {patient.consultingDoctorName}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function LocalDoctorSchedulesPanel({ refreshTrigger }: { refreshTrigger: number }) {
  const [date, setDate] = useState<Date>(new Date());
  const [dailySchedules, setDailySchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchDailyData = async () => {
    setLoading(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const doctors = await api.getDoctorSlots();
      const apps = await api.getDailyAppointments(dateStr);

      const dayOfWeek = date.getDay();
      const mapped = doctors.map((doc: any) => {
        const docApps = apps.filter((a: any) => a.doctorId === doc.id);
        const uniqueAppsMap = new Map();
        docApps.forEach((app: any) => {
          const mrn = app.patient?.mrNumber;
          if (mrn) {
            const existing = uniqueAppsMap.get(mrn);
            if (!existing || new Date(app.createdAt) > new Date(existing.createdAt)) {
              uniqueAppsMap.set(mrn, app);
            }
          } else {
            uniqueAppsMap.set(app.id, app);
          }
        });

        return {
          ...doc,
          todaySlots: doc.schedules?.filter((s: any) => s.dayOfWeek === dayOfWeek) || [],
          todayAppointments: Array.from(uniqueAppsMap.values()).filter((a: any) => a.status === 'PENDING')
        };
      }).filter((doc: any) => doc.todaySlots.length > 0 || doc.todayAppointments.length > 0);

      setDailySchedules(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyData();
  }, [date, refreshTrigger]);

  const handleCreateVisit = async (appointmentId: string) => {
    try {
      const data = await api.convertAppointmentToVisit(appointmentId);
      if (data && data.success) {
        toast({ title: "Patient added to today's visit queue" });
        fetchDailyData();
        window.dispatchEvent(new CustomEvent("patientQueueUpdated"));
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to create visit" });
    }
  };

  return (
    <div className="w-full lg:w-[210px] border-t lg:border-t-0 lg:border-l border-slate-200 bg-white flex flex-col shrink-0 h-full p-2.5">
      <div className="flex flex-col gap-2 shrink-0 mb-3">
        <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
          <CalendarIcon className="w-3.5 h-3.5 text-brand" />
          Appointments
        </h3>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" disabled>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <div className="flex-1 flex items-center justify-start text-[10px] h-8 font-bold bg-white border border-slate-200 text-slate-700 px-2 gap-1.5">
            <CalendarIcon className="h-3 w-3 text-slate-400" />
            {format(date, "MMM d, yyyy")}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" disabled>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading...</div>
        ) : dailySchedules.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-300 italic">No schedules for today</div>
        ) : (
          dailySchedules.map((doc) => (
            <Card key={doc.id} className="border-slate-200 shadow-sm overflow-hidden bg-white rounded-none">
              <div className="bg-slate-50 p-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800">{doc.name}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">{doc.specialization?.name || "General"}</p>
              </div>
              <CardContent className="p-2.5 space-y-3">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold">Availability</p>
                  {doc.todaySlots.map((s: any, idx: number) => (
                    <div key={s.id} className="flex items-center gap-1.5 text-[11px] text-slate-600 border border-slate-100 p-1.5 bg-slate-50/50">
                      <span className="font-bold text-brand">S{idx + 1}</span>
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formatToAMPM(s.startTime)} - {formatToAMPM(s.endTime)}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold">Appointments ({doc.todayAppointments.length})</p>
                  <div className="space-y-1.5">
                    {doc.todayAppointments.map((app: any) => (
                      <div key={app.id} className="flex items-center justify-between p-2 rounded bg-brand/5 border border-brand/10">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 truncate">{app.patient?.name}</p>
                          <p className="text-[9px] font-mono text-slate-500 mt-0.5">{app.patient?.mrNumber}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-brand hover:bg-brand hover:text-white" onClick={() => handleCreateVisit(app.id)}>
                          <UserCheck className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// MAIN STANDALONE COMPONENT
// ----------------------------------------------------

export function ReceptionStandalone() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [activeTab, setActiveTab] = useState<string>("new");
  const [showOPCard, setShowOPCard] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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
    complaint: "",
  });

  const [dobPickerValue, setDobPickerValue] = useState("");
  const [dobTextValue, setDobTextValue] = useState("");
  const [isMobileExisting, setIsMobileExisting] = useState(false);
  const [existingPatientName, setExistingPatientName] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [appointmentSlot, setAppointmentSlot] = useState("");

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const fetchDoctors = async () => {
    try {
      const data = await api.getDoctors();
      setDoctors(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleInputChange = (field: string, val: string) => {
    let filteredVal = val;
    if (field === "name" || field === "co") {
      filteredVal = val.replace(/[0-9]/g, "");
    } else if (field === "contactNumber" || field === "secondaryContact") {
      filteredVal = val.replace(/\D/g, "").slice(0, 10);
    } else if (field === "pincode") {
      filteredVal = val.replace(/\D/g, "").slice(0, 6);
    }
    setFormData(prev => ({ ...prev, [field]: filteredVal }));
  };

  const applyDob = useCallback((dob: Date | null) => {
    if (!dob) {
      setFormData(prev => ({ ...prev, dob: "", age: "" }));
      setDobPickerValue("");
      setDobTextValue("");
      return;
    }
    const ageStr = calculateAgeFromDob(dob);
    const dobIso = `${dob.getFullYear()}-${String(dob.getMonth() + 1).padStart(2, "0")}-${String(dob.getDate()).padStart(2, "0")}`;
    const dd = String(dob.getDate()).padStart(2, "0");
    const mm = String(dob.getMonth() + 1).padStart(2, "0");

    setFormData(prev => ({ ...prev, dob: dobIso, age: ageStr }));
    setDobPickerValue(dobIso);
    setDobTextValue(`${dd}/${mm}/${dob.getFullYear()}`);
  }, []);

  const handleDobTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^\d/]/g, "");
    if (val.length === 2 && !val.includes("/")) val += "/";
    else if (val.length === 5 && val.split("/").length === 2) val += "/";

    setDobTextValue(val);
    if (val.length === 10) {
      const parsed = parseDDMMYYYY(val);
      if (parsed) applyDob(parsed);
    }
  };

  const checkMobileExists = async (mobile: string) => {
    if (mobile.length !== 10) return;
    try {
      const data = await api.checkMobile(mobile);
      setIsMobileExisting(!!data.exists);
      if (data.exists && data.patients && data.patients.length > 0) {
        setExistingPatientName(data.patients[0].name);
      } else {
        setExistingPatientName("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (formData.contactNumber.length === 10) {
      checkMobileExists(formData.contactNumber);
    } else {
      setIsMobileExisting(false);
      setExistingPatientName("");
    }
  }, [formData.contactNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.age || !formData.gender || !formData.contactNumber) {
      toast({ variant: "destructive", title: "Error", description: "Required fields missing" });
      return;
    }

    try {
      setLoading(true);
      const res = await api.registerPatient({
        name: formData.name,
        dob: formData.dob || undefined,
        age: parseInt(formData.age, 10) || undefined,
        gender: formData.gender,
        contactNumber: formData.contactNumber,
        secondaryContact: formData.secondaryContact || undefined,
        co: formData.co || undefined,
        doorNo: formData.doorNo || undefined,
        street: formData.street || undefined,
        area: formData.area || undefined,
        city: formData.city || undefined,
        district: formData.district || undefined,
        state: formData.state,
        pincode: formData.pincode || undefined,
        doctorId: selectedDoctorId || undefined,
        timeSlot: appointmentSlot || undefined,
        complaint: formData.complaint || undefined,
      });

      toast({ title: "Patient Registered Successfully", description: `MRN: ${res.patient.mrNumber}` });
      setFormData({
        name: "", co: "", age: "", gender: "", doorNo: "", street: "", area: "",
        city: "", district: "", state: "Tamil Nadu", pincode: "", contactNumber: "",
        secondaryContact: "", relationship: "", dob: "", mrNumber: "", complaint: ""
      });
      setDobTextValue("");
      setDobPickerValue("");
      setSelectedDoctorId("");
      setAppointmentSlot("");
      triggerRefresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Registration Failed", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 overflow-hidden pointer-events-none select-none">
      <LocalTopHeader />
      <div className="flex-1 flex overflow-hidden p-3 gap-3">
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 overflow-hidden flex shadow-sm">
          {/* Left Column: Live Queue */}
          <LocalPatientQueue
            selectedPatientId={selectedPatient?.id}
            onSelectPatient={setSelectedPatient}
            doctors={doctors}
            refreshTrigger={refreshTrigger}
          />

          {/* Center Column: Enrollment Forms */}
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-brand/5 relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="absolute inset-0 pointer-events-none bg-sprinkles z-0"></div>

            <div className="p-4 lg:p-5 space-y-4 relative z-10 flex-1">
              <div className="flex items-center gap-4 bg-white border border-brand/10 p-4 shadow-sm mb-6 rounded-xl">
                <div className="p-3 bg-brand text-white rounded-lg">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand block">Patient Enrollment</span>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">Registration Profile</h1>
                </div>
              </div>

              {/* Tab Selector matching layout */}
              <div className="flex justify-center mb-6 max-w-sm mx-auto bg-slate-100/80 p-1 rounded-lg border border-slate-200/50">
                <button
                  onClick={() => setActiveTab("new")}
                  className={cn(
                    "flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-md transition-all gap-2 flex items-center justify-center",
                    activeTab === "new" ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  New Patient
                </button>
                <button
                  onClick={() => setActiveTab("returning")}
                  className={cn(
                    "flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-md transition-all gap-2 flex items-center justify-center",
                    activeTab === "returning" ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  <Search className="w-3.5 h-3.5" />
                  Returning Patient
                </button>
              </div>

              {activeTab === "new" ? (
                <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto bg-white border border-slate-100 p-6 sm:p-8 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="clinical-label">Full Name *</Label>
                      <Input
                        placeholder="Full name"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        className="rounded-none border-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5 relative">
                      <Label className="clinical-label">Date of Birth</Label>
                      <div className="relative">
                        <Input
                          placeholder="DD/MM/YYYY"
                          value={dobTextValue}
                          onChange={handleDobTextChange}
                          maxLength={10}
                          className="pr-10 rounded-none border-slate-200 font-mono text-sm"
                        />
                        <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-9 px-3" disabled>
                          <CalendarIcon className="h-4 w-4 text-slate-400" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="clinical-label">Gender *</Label>
                      <div className="flex h-10 w-full items-center justify-between border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 rounded-none">
                        <span>Select</span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="clinical-label">Mobile Number *</Label>
                      <Input
                        placeholder="10-digit mobile number"
                        value={formData.contactNumber}
                        onChange={(e) => handleInputChange("contactNumber", e.target.value)}
                        maxLength={10}
                        className="rounded-none border-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="clinical-label">Secondary Contact</Label>
                      <Input
                        placeholder="10-digit mobile number"
                        value={formData.secondaryContact}
                        onChange={(e) => handleInputChange("secondaryContact", e.target.value)}
                        maxLength={10}
                        className="rounded-none border-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="clinical-label">Care Of (C/o)</Label>
                      <Input
                        placeholder="Enter care of name"
                        value={formData.co}
                        onChange={(e) => handleInputChange("co", e.target.value)}
                        className="rounded-none border-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="clinical-label">Consulting Doctor</Label>
                      <div className="flex h-10 w-full items-center justify-between border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 rounded-none">
                        <span>Identify Consultant...</span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="clinical-label">Appointment Slot</Label>
                      <div className="flex h-10 w-full items-center justify-between border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 rounded-none">
                        <span>Select doctor first</span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                    <div className="space-y-4 p-4 border border-slate-100 bg-slate-50/50">
                      <Label className="clinical-label text-slate-700">Address Details</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="Door No" value={formData.doorNo} onChange={(e) => handleInputChange("doorNo", e.target.value)} className="rounded-none border-slate-200 text-xs" />
                        <Input placeholder="Street" value={formData.street} onChange={(e) => handleInputChange("street", e.target.value)} className="rounded-none border-slate-200 text-xs" />
                        <Input placeholder="Area" value={formData.area} onChange={(e) => handleInputChange("area", e.target.value)} className="rounded-none border-slate-200 text-xs" />
                        <Input placeholder="City" value={formData.city} onChange={(e) => handleInputChange("city", e.target.value)} className="rounded-none border-slate-200 text-xs" />
                        <Input placeholder="District" value={formData.district} onChange={(e) => handleInputChange("district", e.target.value)} className="rounded-none border-slate-200 text-xs" />
                        <Input placeholder="PIN" value={formData.pincode} onChange={(e) => handleInputChange("pincode", e.target.value)} maxLength={6} className="rounded-none border-slate-200 text-xs" />
                      </div>
                    </div>

                    <div className="space-y-4 p-4 border border-slate-100 bg-slate-50/50 flex flex-col justify-between">
                      <div className="space-y-2">
                        <Label className="clinical-label text-slate-700">Ocular Complaint(s)</Label>
                        <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto">
                          {["Blurred Vision", "Eye Strain", "Dry Eyes", "Watering", "Redness", "Itching", "Headache"].map((comp) => {
                            const list = formData.complaint ? formData.complaint.split(", ") : [];
                            const isSel = list.includes(comp);
                            return (
                              <button
                                type="button"
                                key={comp}
                                onClick={() => {
                                  const next = isSel ? list.filter(x => x !== comp) : [...list, comp];
                                  setFormData(prev => ({ ...prev, complaint: next.join(", ") }));
                                }}
                                className={cn(
                                  "px-2.5 py-1 text-[10px] font-bold border transition-all rounded-none uppercase tracking-wider",
                                  isSel ? "bg-brand border-brand text-white" : "bg-white text-slate-600 border-slate-200"
                                )}
                              >
                                {comp}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <Button type="submit" disabled={loading} className="w-full h-11 bg-brand hover:bg-brand-hover text-white font-bold uppercase tracking-wider rounded-none shadow-md mt-4 gap-2">
                        <UserPlus className="w-4 h-4" />
                        {loading ? "Registering..." : "Register Patient"}
                      </Button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="max-w-md mx-auto py-12 text-center text-slate-400 border border-dashed border-slate-200 bg-white">
                  Returning Patient search functionality is integrated. Enter patient name/MRN to fetch info.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Appointments Panel */}
          <LocalDoctorSchedulesPanel refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
}

export default ReceptionStandalone;
