import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Send, Eye, UserCheck, Loader2, User, ClipboardList, Stethoscope, Microscope, Glasses, Pill, History, Plus, Trash2, ChevronRight, ChevronUp, ChevronDown, X, FileText, RefreshCw, ShieldCheck, Activity, AlertCircle, CheckCircle2, Clock, Heart, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Patient } from "@/data/mockData";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { RefractionSummaryView } from "./RefractionSummaryView";
import { getPatientAgeString, getPatientAgeNumber, cn, calculateSessionSlot } from "@/lib/utils";
import { sanitizeOptometryInput, getFieldTypeFromName } from "@/lib/validation";
import { ScanReportGallery } from "@/components/ScanReportGallery";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";

// --- Helper Components ---

function SectionHeader({ icon: Icon, category, title }: { icon: any, category: string, title: string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="p-3 bg-orange-600 text-white shadow-lg"><Icon className="w-6 h-6 shrink-0" /></div>
      <div className="flex flex-col">
        <span className="text-[12px] font-black uppercase tracking-widest text-orange-600 mb-0.5">{category}</span>
        <h3 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tighter">{title}</h3>
      </div>
    </div>
  );
}

function EyeIndicator({ eye, compact }: { eye: "OD" | "OS", compact?: boolean }) {
  const isOD = eye === "OD";
  return (
    <div className={cn(
      "flex items-center gap-3 w-full",
      !compact && "border-b-2 border-slate-200 pb-2 mb-3"
    )}>
      <div className={cn(
        "w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center font-black text-[12px] sm:text-xs border-2 shrink-0 transition-colors",
        isOD
          ? "border-blue-600 text-blue-600 bg-blue-50/10"
          : "border-emerald-600 text-emerald-600 bg-emerald-50/10"
      )}>{eye}</div>
      <div className="flex flex-col min-w-0 flex-1">
        <span className={cn(
          "text-[7px] sm:text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-1 truncate",
          isOD ? "text-blue-600/60" : "text-emerald-600/60"
        )}>
          {isOD ? "Right Eye" : "Left Eye"}
        </span>
        <span className={cn(
          "text-[11px] sm:text-[12px] font-bold tracking-tight truncate uppercase",
          isOD ? "text-blue-600" : "text-emerald-600"
        )}>
          {isOD ? "Oculus Dexter" : "Oculus Sinister"}
        </span>
      </div>
    </div>
  );
}

const DIST_VISION_OPTIONS = ["6/6", "6/6(P)", "6/7.5", "6/7.5(P)", "6/9", "6/9(P)", "6/12", "6/12(P)", "6/18", "6/18(P)", "6/24", "6/24(P)", "6/36", "6/36(P)", "6/60", "6/60(P)", "5/60", "4/60", "3/60", "2/60", "1/60", "CF at 50", "HM(+)", "CFCC", "PLPR accurate", "PLPR inaccurate"] as const;
const NEAR_VISION_OPTIONS = ["<N36", "N36", "N24", "N18", "N12", "N10", "N8", "N6"] as const;

interface PowerPaletteInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  label: string;
  type: "sph" | "cyl" | "axis" | "add" | "dv" | "nv" | "iop" | "schiotz_scale";
  disabled?: boolean;
}

const PowerPaletteInput = React.memo(({
  value = "",
  onChange,
  placeholder = "0.00",
  className,
  label,
  type,
  disabled
}: PowerPaletteInputProps) => {
  const [open, setOpen] = useState(false);
  const [sign, setSign] = useState<"+" | "-">(() => {
    const valStr = String(value || "");
    if (valStr.startsWith("-")) return "-";
    return "+";
  });
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync sign with value when value changes externally
  useEffect(() => {
    const valStr = String(value || "");
    if (valStr.startsWith("-")) {
      setSign("-");
    } else if (valStr.startsWith("+")) {
      setSign("+");
    }
  }, [value]);

  const powerValues = [
    "0.00", "0.25", "0.50", "0.75", "1.00", "1.25", "1.50", "1.75", "2.00",
    "2.25", "2.50", "2.75", "3.00", "3.25", "3.50", "3.75", "4.00", "4.25",
    "4.50", "4.75", "5.00"
  ];

  const axisValues = [
    "90", "180", "45", "135", "30", "150", "60", "120", "0", "10", "20", "170", "160", "110", "100", "80", "70", "50"
  ];

  const focusNext = () => {
    const inputs = Array.from(document.querySelectorAll('.doctor-palette-input')) as HTMLInputElement[];
    const idx = inputs.findIndex(el => el === inputRef.current);
    if (idx !== -1 && idx < inputs.length - 1) {
      setOpen(false);
      setTimeout(() => {
        inputs[idx + 1].focus();
        inputs[idx + 1].select();
      }, 50);
    }
  };

  const focusPrev = () => {
    const inputs = Array.from(document.querySelectorAll('.doctor-palette-input')) as HTMLInputElement[];
    const idx = inputs.findIndex(el => el === inputRef.current);
    if (idx > 0) {
      setOpen(false);
      setTimeout(() => {
        inputs[idx - 1].focus();
        inputs[idx - 1].select();
      }, 50);
    }
  };

  const handleSelect = (val: string) => {
    let finalVal = val;
    if (type !== "axis" && type !== "dv" && type !== "nv" && type !== "iop" && type !== "schiotz_scale" && val !== "0.00") {
      finalVal = sign + val;
    }
    onChange(finalVal);
    setOpen(false);
  };

  const handleStep = (direction: "up" | "down", e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (type === "dv" || type === "nv") {
      const arr = (type === "dv" ? DIST_VISION_OPTIONS : NEAR_VISION_OPTIONS) as readonly string[];
      let idx = arr.indexOf(value);
      if (idx === -1) {
        idx = 0;
      }
      if (direction === "up") {
        idx = (idx - 1 + arr.length) % arr.length;
      } else {
        idx = (idx + 1) % arr.length;
      }
      onChange(arr[idx]);
      return;
    }

    let num = parseFloat(value) || 0;
    
    if (type === "axis") {
      const step = 5;
      if (direction === "up") {
        num = num + step;
        if (num > 180) num = 0;
      } else {
        num = num - step;
        if (num < 0) num = 180;
      }
      onChange(String(num));
    } else {
      const step = 0.25;
      if (direction === "up") {
        num = num + step;
      } else {
        num = num - step;
      }
      
      let signPrefix = "";
      if (num > 0) {
        signPrefix = "+";
      } else if (num < 0) {
        signPrefix = "-";
      }
      const absoluteVal = Math.abs(num).toFixed(2);
      onChange(absoluteVal === "0.00" ? "0.00" : signPrefix + absoluteVal);
    }
  };

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <div className="relative flex items-center w-full group">
        <PopoverAnchor asChild>
          <Input
            ref={inputRef}
            className={cn("doctor-palette-input pr-7", className)}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => {
              if (!disabled && !open) {
                setOpen(true);
                setTimeout(() => {
                  inputRef.current?.select();
                }, 50);
              }
            }}
            onClick={() => {
              if (!disabled && !open) {
                setOpen(true);
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
          />
        </PopoverAnchor>
        {!disabled && (
          <div className="absolute right-1 flex flex-col items-center justify-center h-full py-0.5 z-10">
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleStep("up", e)}
              className="text-slate-400 hover:text-orange-600 active:scale-95 transition-all p-0 h-[14px] flex items-center justify-center cursor-pointer"
              title="Increment"
            >
              <ChevronUp className="w-3.5 h-3.5 stroke-[3]" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleStep("down", e)}
              className="text-slate-400 hover:text-orange-600 active:scale-95 transition-all p-0 h-[14px] flex items-center justify-center cursor-pointer"
              title="Decrement"
            >
              <ChevronDown className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
        )}
      </div>
      <PopoverContent 
        className="w-[340px] p-4 bg-white border border-slate-200 shadow-xl rounded-xl z-50 relative mt-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute left-1/2 -translate-x-1/2 -top-4 w-7 h-7 flex items-center justify-center bg-[#4f6f96] hover:bg-slate-700 text-white rounded-full border-2 border-white shadow-md transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <button
              type="button"
              onClick={focusPrev}
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            >
              <ChevronUp className="-rotate-90 w-4 h-4" />
            </button>
            <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest text-center truncate px-2 flex-1">
              {label}
            </span>
            <button
              type="button"
              onClick={focusNext}
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {type !== "axis" && type !== "dv" && type !== "nv" && (
            <div className="flex justify-center bg-slate-50 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setSign("+")}
                className={cn(
                  "flex-1 py-1.5 text-xs font-black uppercase rounded-md tracking-wider transition-all",
                  sign === "+"
                    ? "bg-white text-orange-600 shadow-sm border border-slate-100"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                + Plus
              </button>
              <button
                type="button"
                onClick={() => setSign("-")}
                className={cn(
                  "flex-1 py-1.5 text-xs font-black uppercase rounded-md tracking-wider transition-all",
                  sign === "-"
                    ? "bg-white text-orange-600 shadow-sm border border-slate-100"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                - Minus
              </button>
            </div>
          )}

          <div className="grid grid-cols-4 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
            {type === "axis" ? (
              axisValues.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleSelect(val)}
                  className="py-2 text-[10px] font-black border border-slate-100 hover:border-orange-500 hover:text-orange-600 bg-slate-50 hover:bg-orange-50/30 transition-all rounded-md"
                >
                  {val}°
                </button>
              ))
            ) : type === "dv" ? (
              DIST_VISION_OPTIONS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleSelect(val)}
                  className="py-2 text-[10px] font-black border border-slate-100 hover:border-orange-500 hover:text-orange-600 bg-slate-50 hover:bg-orange-50/30 transition-all rounded-md col-span-2"
                >
                  {val}
                </button>
              ))
            ) : type === "nv" ? (
              NEAR_VISION_OPTIONS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleSelect(val)}
                  className="py-2 text-[10px] font-black border border-slate-100 hover:border-orange-500 hover:text-orange-600 bg-slate-50 hover:bg-orange-50/30 transition-all rounded-md col-span-2"
                >
                  {val}
                </button>
              ))
            ) : (
              powerValues.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleSelect(val)}
                  className="py-2 text-[10px] font-black border border-slate-100 hover:border-orange-500 hover:text-orange-600 bg-slate-50 hover:bg-orange-50/30 transition-all rounded-md"
                >
                  {val === "0.00" ? "0.00" : sign + val}
                </button>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

// --- Types ---

interface Medication {
  id: string;
  drug: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  eye: string;
}

interface PrescriptionState {
  glassType?: string;
  clType?: string[];
  distance: {
    OD: { sphere: string; cylinder: string; axis: string };
    OS: { sphere: string; cylinder: string; axis: string };
  };
  near: {
    OD: { sphere: string; cylinder: string; axis: string };
    OS: { sphere: string; cylinder: string; axis: string };
  };
}

export function DoctorStation({ patient, doctors = [] }: { patient?: Patient | null, doctors?: any[] }) {
  const { toast } = useToast();
  const [localStatus, setLocalStatus] = useState<string | undefined>(patient?.status);
  const [isAttending, setIsAttending] = useState(false);
  const isConsultationStarted = localStatus === "doctor" || localStatus === "consulted" || (patient?.status === "doctor" && localStatus !== "refraction_done");
  const isLocked = !isConsultationStarted;
  const [activeTab, setActiveTab] = useState("summary");
  const [visitHistory, setVisitHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [refractionData, setRefractionData] = useState<any>(null);
  const [selectedHistoricalVisit, setSelectedHistoricalVisit] = useState<any>(null);
  const [isHistoryDetailsOpen, setIsHistoryDetailsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLockedToast, setShowLockedToast] = useState(false);

  const [printType, setPrintType] = useState<'all' | 'glass' | 'medical' | null>(null);

  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintType(null);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const triggerPrint = (type: 'all' | 'glass' | 'medical') => {
    setPrintType(type);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const fmtLens = (val: any) => {
    if (val === undefined || val === null || val === "" || val === "—") return "—";
    const parsed = parseFloat(val);
    if (isNaN(parsed)) return val;
    if (parsed === 0) return "0.00";
    return parsed > 0 ? `+${parsed.toFixed(2)}` : parsed.toFixed(2);
  };

  const fmtVA = (val: any) => {
    if (!val || val === "—") return "—";
    return val;
  };



  useEffect(() => {
    if (showLockedToast) {
      const timer = setTimeout(() => {
        setShowLockedToast(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showLockedToast]);

  const [activeSection, setActiveSection] = useState("sec-surface-adnexa");
  const [isNavHovered, setIsNavHovered] = useState(false);
  const navHoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNavMouseEnter = () => {
    if (navHoverTimeoutRef.current) {
      clearTimeout(navHoverTimeoutRef.current);
      navHoverTimeoutRef.current = null;
    }
    setIsNavHovered(true);
  };

  const handleNavMouseLeave = () => {
    if (navHoverTimeoutRef.current) {
      clearTimeout(navHoverTimeoutRef.current);
    }
    navHoverTimeoutRef.current = setTimeout(() => {
      setIsNavHovered(false);
    }, 300); // 300ms delay to prevent flickering and boundary hover loops
  };

  useEffect(() => {
    return () => {
      if (navHoverTimeoutRef.current) {
        clearTimeout(navHoverTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "investigation") return;
    if (typeof window === "undefined" || !window.IntersectionObserver) return;

    const sections = [
      "sec-surface-adnexa",
      "sec-intraocular-pupil",
      "sec-motility-angles",
      "sec-vitreous",
      "sec-retina-macula",
      "sec-optic-disc",
      "sec-required-investigations",
      "sec-clinical-opinion",
      "sec-final-diagnosis"
    ];
    const observerOptions = {
      root: null,
      rootMargin: "-10% 0px -80% 0px",
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      sections.forEach((id) => {
        const el = document.getElementById(id);
        if (el) observer.unobserve(el);
      });
    };
  }, [activeTab]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      setActiveSection(id);
    }
  };

  const OCULAR_COMPLAINTS = [
    { key: 'eyePain', label: 'Eye Pain' },
    { key: 'blurredVision', label: 'Blurred Vision' },
    { key: 'irritation', label: 'Irritation' },
    { key: 'photophobia', label: 'Photophobia' },
    { key: 'redness', label: 'Redness' },
    { key: 'watering', label: 'Watering' },
    { key: 'discharge', label: 'Discharge' },
    { key: 'itching', label: 'Itching' },
    { key: 'dryness', label: 'Dry Eyes' },
    { key: 'headache', label: 'Headache' },
    { key: 'doubleVision', label: 'Double Vision' },
    { key: 'floaters', label: 'Floaters' },
    { key: 'burningSensation', label: 'Burning Sensation' },
    { key: 'foreignBodySensation', label: 'Foreign Body Sensation' },
    { key: 'flashesOfLight', label: 'Flashes of Light' },
    { key: 'lidSwelling', label: 'Lid Swelling' },
    { key: 'eyeStrain', label: 'Eye Strain' }
  ] as const;

  // Form States
  const [investigation, setInvestigation] = useState({
    diagnosisList: {
      OD: { eyePain: 'No', blurredVision: 'No', irritation: 'No', photophobia: 'No', redness: 'No', watering: 'No', discharge: 'No', itching: 'No', dryness: 'No', headache: 'No', doubleVision: 'No', floaters: 'No', burningSensation: 'No', foreignBodySensation: 'No', flashesOfLight: 'No', lidSwelling: 'No', eyeStrain: 'No' } as Record<string, string>,
      OS: { eyePain: 'No', blurredVision: 'No', irritation: 'No', photophobia: 'No', redness: 'No', watering: 'No', discharge: 'No', itching: 'No', dryness: 'No', headache: 'No', doubleVision: 'No', floaters: 'No', burningSensation: 'No', foreignBodySensation: 'No', flashesOfLight: 'No', lidSwelling: 'No', eyeStrain: 'No' } as Record<string, string>
    },
    eom: { OD: "", OS: "" },
    eyePain: "No",
    slitLamp: {
      lids: { OD: "", OS: "" },
      conjunctiva: { OD: "", OS: "" },
      sclera: { OD: "", OS: "" },
      cornea: { OD: "", OS: "" },
      ac: { OD: "", OS: "" },
      iris: { OD: "", OS: "" },
      pupil: { OD: "", OS: "" },
      lens: { OD: "", OS: "" },
      tonometry: { OD: "", OS: "" },
      gonioscopy: { OD: "", OS: "" },
      synaptophore: { OD: "", OS: "" },
      dilation: { OD: "", OS: "" },
    },
    fundus: {
      vitreous: { OD: "", OS: "" },
      retina: { OD: "", OS: "" },
      disc: { OD: "", OS: "" },
    },
    required: "Nothing selected",
    other: "",
    opinion: "",
    adminInstructions: "",
  });

  const [finalDiagnosis, setFinalDiagnosis] = useState({
    OD: "",
    OS: "",
  });

  const [medications, setMedications] = useState<Medication[]>([
    { id: "1", drug: "", dosage: "", route: "Topical", frequency: "", duration: "", eye: "Both" }
  ]);

  const [glassPrescription, setGlassPrescription] = useState<PrescriptionState>({
    distance: {
      OD: { sphere: "", cylinder: "", axis: "" },
      OS: { sphere: "", cylinder: "", axis: "" },
    },
    near: {
      OD: { sphere: "", cylinder: "", axis: "" },
      OS: { sphere: "", cylinder: "", axis: "" },
    }
  });

  const [contactLensPrescription, setContactLensPrescription] = useState<PrescriptionState>({
    distance: {
      OD: { sphere: "", cylinder: "", axis: "" },
      OS: { sphere: "", cylinder: "", axis: "" },
    },
    near: {
      OD: { sphere: "", cylinder: "", axis: "" },
      OS: { sphere: "", cylinder: "", axis: "" },
    }
  });

  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const storageKey = `doctor_work_draft_${patient?.mrNumber}`;

  const printData = useMemo(() => {
    if (selectedHistoricalVisit) {
      const cons = selectedHistoricalVisit.consultation || {};
      const rawGlass = cons.finalGlassPrescription;
      const glassRx = typeof rawGlass === 'string' ? JSON.parse(rawGlass) : rawGlass;
      const rawCL = cons.finalContactLensPrescription;
      const clRx = typeof rawCL === 'string' ? JSON.parse(rawCL) : rawCL;
      const rawMeds = cons.medicalPrescription || cons.medications;
      const medicationsList = typeof rawMeds === 'string' ? JSON.parse(rawMeds) : (rawMeds || []);
      const refData = selectedHistoricalVisit.refraction || {};

      let slitLamp: any = null;
      let eom: any = null;
      try {
        const parsed = typeof cons.anteriorSegment === 'string' ? JSON.parse(cons.anteriorSegment) : cons.anteriorSegment;
        if (parsed) {
          slitLamp = parsed.slitLamp || parsed;
          eom = parsed.eom;
        }
      } catch (e) {}

      let fundus: any = null;
      try {
        fundus = typeof cons.fundusObservation === 'string' ? JSON.parse(cons.fundusObservation) : cons.fundusObservation;
      } catch (e) {}

      let postSeg: any = null;
      try {
        postSeg = typeof cons.posteriorSegment === 'string' ? JSON.parse(cons.posteriorSegment) : cons.posteriorSegment;
      } catch (e) {}

      return {
        patientName: selectedHistoricalVisit.name || patient?.name || "—",
        ageGender: selectedHistoricalVisit.patient ? `${getPatientAgeString(selectedHistoricalVisit.patient)} / ${selectedHistoricalVisit.patient.gender || "—"}` : (patient ? `${getPatientAgeString(patient)} / ${patient.gender}` : "—"),
        mrNumber: selectedHistoricalVisit.mrNumber || patient?.mrNumber || "—",
        contactNumber: selectedHistoricalVisit.patient?.contactNumber || patient?.contactNumber || "—",
        date: selectedHistoricalVisit.visitedAt ? new Date(selectedHistoricalVisit.visitedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        doctorName: cons.doctor?.name || cons.doctorName || selectedHistoricalVisit.doctor?.name || selectedHistoricalVisit.consultingDoctorName || "Dr. Gajendran MBBS DO",
        glassRx,
        clRx,
        medications: medicationsList,
        refraction: refData,
        notes: cons.notes || "",
        posteriorSegment: postSeg || {},
        diagnosisText: cons.diagnosisText || "",
        slitLamp,
        eom,
        fundus
      };
    } else {
      // Current active consultation
      const generateDiagnosisText = (diagList: any, manual: string) => {
        const present: string[] = [];
        if (diagList) {
          OCULAR_COMPLAINTS.forEach(c => {
            if (diagList[c.key] === 'Yes') present.push(c.label);
          });
        }
        if (manual && manual.trim()) present.push(manual.trim());
        return present.length > 0 ? present.join(', ') : 'NAD';
      };

      return {
        patientName: patient?.name || "—",
        ageGender: patient ? `${getPatientAgeString(patient)} / ${patient.gender}` : "—",
        mrNumber: patient?.mrNumber || "—",
        contactNumber: patient?.contactNumber || "—",
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        doctorName: patient?.consultingDoctorName || "Dr. Gajendran MBBS DO",
        glassRx: glassPrescription,
        clRx: contactLensPrescription,
        medications: medications,
        refraction: refractionData || {},
        notes: investigation.opinion || "",
        posteriorSegment: {
          required: investigation.required,
          other: investigation.other,
          adminInstructions: investigation.adminInstructions
        },
        diagnosisText: `OD: ${generateDiagnosisText(investigation.diagnosisList?.OD, finalDiagnosis.OD)} | OS: ${generateDiagnosisText(investigation.diagnosisList?.OS, finalDiagnosis.OS)}`,
        slitLamp: investigation.slitLamp,
        eom: investigation.eom,
        fundus: investigation.fundus
      };
    }
  }, [selectedHistoricalVisit, patient, glassPrescription, contactLensPrescription, medications, refractionData, investigation, finalDiagnosis]);

  // 1. Load Draft System
  useEffect(() => {
    if (!patient?.id) {
      setIsDraftLoaded(false);
      return;
    }

    setIsDraftLoaded(false);
    const today = new Date().toISOString().split('T')[0];

    const savedDraft = localStorage.getItem(storageKey);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed && parsed.date === today && parsed.data) {
          const d = parsed.data;
          if (d.investigation) {
            const loadedInv = { ...d.investigation };
            if (loadedInv.slitLamp && typeof loadedInv.slitLamp.dilation === 'string') {
              loadedInv.slitLamp = {
                ...loadedInv.slitLamp,
                dilation: { OD: loadedInv.slitLamp.dilation, OS: loadedInv.slitLamp.dilation }
              };
            }
            setInvestigation({
              ...loadedInv,
              diagnosisList: loadedInv.diagnosisList || {
                OD: { eyePain: 'No', blurredVision: 'No', irritation: 'No', photophobia: 'No', redness: 'No', watering: 'No', discharge: 'No', itching: 'No', dryness: 'No', headache: 'No', doubleVision: 'No', floaters: 'No', burningSensation: 'No', foreignBodySensation: 'No', flashesOfLight: 'No', lidSwelling: 'No', eyeStrain: 'No' },
                OS: { eyePain: 'No', blurredVision: 'No', irritation: 'No', photophobia: 'No', redness: 'No', watering: 'No', discharge: 'No', itching: 'No', dryness: 'No', headache: 'No', doubleVision: 'No', floaters: 'No', burningSensation: 'No', foreignBodySensation: 'No', flashesOfLight: 'No', lidSwelling: 'No', eyeStrain: 'No' }
              }
            });
          }
          if (d.finalDiagnosis) setFinalDiagnosis(d.finalDiagnosis);
          if (d.medications && Array.isArray(d.medications) && d.medications.length > 0) {
            // Ensure medications have IDs for stable removal
            const withIds = d.medications.map((m: any) => ({
              ...m,
              id: m.id || Math.random().toString(36).slice(2, 11)
            }));
            setMedications(withIds);
          }
          if (d.glassPrescription) setGlassPrescription(d.glassPrescription);
          if (d.contactLensPrescription) setContactLensPrescription(d.contactLensPrescription);
        }
      } catch (e) {
        console.error("Draft load error", e);
      }
    }
    setIsDraftLoaded(true);
  }, [patient?.id, storageKey]);

  // 2. Auto-Save System (Debounced)
  useEffect(() => {
    if (!patient?.id || !isDraftLoaded) return;

    const saveTimer = setTimeout(() => {
      const draft = {
        date: new Date().toISOString().split('T')[0],
        data: {
          investigation,
          finalDiagnosis,
          medications,
          glassPrescription,
          contactLensPrescription
        }
      };
      localStorage.setItem(storageKey, JSON.stringify(draft));
    }, 1500);

    return () => clearTimeout(saveTimer);
  }, [investigation, finalDiagnosis, medications, glassPrescription, contactLensPrescription, patient?.id, storageKey, isDraftLoaded]);

  useEffect(() => {
    // 0. Reset Tab to Summary
    setActiveTab("summary");

    // 1. Reset all internal form states to prevent data leakage from previous patient
    setInvestigation({
      diagnosisList: {
        OD: { eyePain: 'No', blurredVision: 'No', irritation: 'No', photophobia: 'No', redness: 'No', watering: 'No', discharge: 'No', itching: 'No', dryness: 'No', headache: 'No', doubleVision: 'No', floaters: 'No', burningSensation: 'No', foreignBodySensation: 'No', flashesOfLight: 'No', lidSwelling: 'No', eyeStrain: 'No' },
        OS: { eyePain: 'No', blurredVision: 'No', irritation: 'No', photophobia: 'No', redness: 'No', watering: 'No', discharge: 'No', itching: 'No', dryness: 'No', headache: 'No', doubleVision: 'No', floaters: 'No', burningSensation: 'No', foreignBodySensation: 'No', flashesOfLight: 'No', lidSwelling: 'No', eyeStrain: 'No' }
      },
      eom: { OD: "", OS: "" },
      eyePain: "No",
      slitLamp: {
        lids: { OD: "", OS: "" },
        conjunctiva: { OD: "", OS: "" },
        sclera: { OD: "", OS: "" },
        cornea: { OD: "", OS: "" },
        ac: { OD: "", OS: "" },
        iris: { OD: "", OS: "" },
        pupil: { OD: "", OS: "" },
        lens: { OD: "", OS: "" },
        tonometry: { OD: "", OS: "" },
        gonioscopy: { OD: "", OS: "" },
        synaptophore: { OD: "", OS: "" },
        dilation: { OD: "", OS: "" },
      },
      fundus: {
        vitreous: { OD: "", OS: "" },
        retina: { OD: "", OS: "" },
        disc: { OD: "", OS: "" },
      },
      required: "Nothing selected",
      other: "",
      opinion: "",
      adminInstructions: "",
    });
    setFinalDiagnosis({ OD: "", OS: "" });
    setMedications([{ id: Math.random().toString(36).slice(2, 11), drug: "", dosage: "", route: "Topical", frequency: "", duration: "", eye: "Both" }]);
    setGlassPrescription({
      distance: { OD: { sphere: "", cylinder: "", axis: "" }, OS: { sphere: "", cylinder: "", axis: "" } },
      near: { OD: { sphere: "", cylinder: "", axis: "" }, OS: { sphere: "", cylinder: "", axis: "" } }
    });
    setContactLensPrescription({
      distance: { OD: { sphere: "", cylinder: "", axis: "" }, OS: { sphere: "", cylinder: "", axis: "" } },
      near: { OD: { sphere: "", cylinder: "", axis: "" }, OS: { sphere: "", cylinder: "", axis: "" } }
    });

    // 2. Sync Status and Fetch New Data
    setLocalStatus(patient?.status);
    if (patient?.id) {
      fetchVisitHistory();
      fetchCurrentRefraction();
      fetchCurrentConsultation();
    }

    const handleQueueUpdate = () => {
      if (patient?.id) fetchCurrentRefraction();
    };
    window.addEventListener("patientQueueUpdated", handleQueueUpdate);
    return () => window.removeEventListener("patientQueueUpdated", handleQueueUpdate);
  }, [patient?.id, patient?.mrNumber, patient?.status]);
  const handleContainerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      if (!target || target.tagName === 'TEXTAREA' || e.isDefaultPrevented()) return;
      if (!target.closest('[role="tabpanel"]')) return;

      e.preventDefault();

      const tabsList = ["summary", "diagnosis_history", "clinical", "investigation", "glass", "medical", "history"];

      setActiveTab(prev => {
        const currentIndex = tabsList.indexOf(prev);
        const nextIndex = (currentIndex + 1) % tabsList.length;
        const nextTab = tabsList[nextIndex];
        return nextTab;
      });

      setTimeout(() => {
        const tabContent = document.querySelector(`[data-state="active"][role="tabpanel"]`) as HTMLElement;
        if (tabContent) {
          const focusableSelector = 'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
          const firstInput = tabContent.querySelector(focusableSelector) as HTMLElement;
          if (firstInput) {
            firstInput.focus();
          } else {
            tabContent.tabIndex = -1;
            tabContent.focus();
          }
        }
      }, 100);
    }
  }, []);


  const fetchVisitHistory = async () => {
    if (!patient?.mrNumber) return;
    try {
      setIsLoadingHistory(true);
      const data = await api.getVisitHistory(patient.mrNumber);
      setVisitHistory(data.visits || []);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchCurrentRefraction = async () => {
    if (!patient?.id) return;
    try {
      const data = await api.getRefraction(patient.id);
      if (data) {
        setRefractionData(data);

        // Sync initial diagnosis values if provided by refraction
        if (!finalDiagnosis.OD && !finalDiagnosis.OS && data?.ocularComplaint) {
          const newDiagList = {
            OD: { eyePain: 'No', blurredVision: 'No', irritation: 'No', photophobia: 'No', redness: 'No', watering: 'No', discharge: 'No', itching: 'No', dryness: 'No', headache: 'No', doubleVision: 'No', floaters: 'No', burningSensation: 'No', foreignBodySensation: 'No', flashesOfLight: 'No', lidSwelling: 'No', eyeStrain: 'No' } as Record<string, string>,
            OS: { eyePain: 'No', blurredVision: 'No', irritation: 'No', photophobia: 'No', redness: 'No', watering: 'No', discharge: 'No', itching: 'No', dryness: 'No', headache: 'No', doubleVision: 'No', floaters: 'No', burningSensation: 'No', foreignBodySensation: 'No', flashesOfLight: 'No', lidSwelling: 'No', eyeStrain: 'No' } as Record<string, string>
          };

          // Split complaints by comma
          const parts = data.ocularComplaint.split(',').map((s: string) => s.trim()).filter(Boolean);
          const manualTextsOD: string[] = [];
          const manualTextsOS: string[] = [];

          parts.forEach((part: string) => {
            const trimmed = part.trim().replace(/\.$/, ""); // remove trailing period if any
            let complaintLabel = trimmed;
            let eye = "OU";

            // 1. Try matching sentence format: e.g. "Eye pain in the right eye for the past 3 days"
            let match = trimmed.match(/^(.+?)\s+in\s+(?:the\s+)?(right\s+eye|left\s+eye|both\s+eyes)?(?:\s+for\s+the\s+past\s+(\d+)\s+(day|days|month|months|year|years))?$/i);
            if (match) {
              complaintLabel = match[1].trim();
              if (match[2]) {
                const eyeStr = match[2].toLowerCase();
                if (eyeStr.includes("right")) eye = "OD";
                else if (eyeStr.includes("left")) eye = "OS";
                else if (eyeStr.includes("both")) eye = "OU";
              }
            } else {
              // 1b. Try matching sentence format without eye (e.g. Headache for the past 5 days)
              match = trimmed.match(/^(.+?)\s+for\s+the\s+past\s+(\d+)\s+(day|days|month|months|year|years)$/i);
              if (match) {
                complaintLabel = match[1].trim();
                eye = "OU";
              } else {
                // 2. Fallback to older parenthesized format: e.g. "Blurred Vision (OD, 3 days)"
                match = trimmed.match(/^(.+?)\s*\((OD|OS|OU)(?:,\s*(\d+)\s*(days|months|years))?\)$/i);
                if (match) {
                  complaintLabel = match[1].trim();
                  eye = (match[2] || "OU").toUpperCase();
                } else {
                  // 3. Fallback to older non-ocular parenthesized format: e.g. "Headache (5 days)"
                  match = trimmed.match(/^(.+?)\s*\((\d+)\s*(days|months|years)\)$/i);
                  if (match) {
                    complaintLabel = match[1].trim();
                    eye = "OU";
                  }
                }
              }
            }

            const standardComplaint = OCULAR_COMPLAINTS.find(c => c.label.toLowerCase() === complaintLabel.toLowerCase());
            if (standardComplaint) {
              if (eye === "OD" || eye === "OU") {
                newDiagList.OD[standardComplaint.key] = 'Yes';
              }
              if (eye === "OS" || eye === "OU") {
                newDiagList.OS[standardComplaint.key] = 'Yes';
              }
            } else {
              if (eye === "OD" || eye === "OU") {
                manualTextsOD.push(part);
              }
              if (eye === "OS" || eye === "OU") {
                manualTextsOS.push(part);
              }
            }
          });

          setInvestigation(prev => ({ ...prev, diagnosisList: newDiagList }));
          setFinalDiagnosis({
            OD: manualTextsOD.join(', '),
            OS: manualTextsOS.join(', ')
          });
        }

        // Initialize glass prescription state from Refraction's final glass prescription, fallback to acceptance
        if (data?.glassPrescription?.OD?.sphere !== undefined || data?.acceptance?.distance) {
          setGlassPrescription(prev => {
            const isEmpty = !prev.distance.OD.sphere && !prev.distance.OS.sphere;
            if (isEmpty || !isDraftLoaded) {
              return {
                glassType: data?.glassPrescription?.glassType || data?.pgPower?.glass?.glassType || "SVN",
                distance: {
                  OD: {
                    sphere: data?.glassPrescription?.OD?.sphere || data?.acceptance?.distance?.OD?.sphere || "",
                    cylinder: data?.glassPrescription?.OD?.cylinder || data?.acceptance?.distance?.OD?.cylinder || "",
                    axis: data?.glassPrescription?.OD?.axis || data?.acceptance?.distance?.OD?.axis || ""
                  },
                  OS: {
                    sphere: data?.glassPrescription?.OS?.sphere || data?.acceptance?.distance?.OS?.sphere || "",
                    cylinder: data?.glassPrescription?.OS?.cylinder || data?.acceptance?.distance?.OS?.cylinder || "",
                    axis: data?.glassPrescription?.OS?.axis || data?.acceptance?.distance?.OS?.axis || ""
                  },
                },
                near: {
                  OD: {
                    sphere: data?.glassPrescription?.OD?.nearDsph || data?.glassPrescription?.OD?.nearAdd || data?.acceptance?.near?.OD?.sphere || "",
                    cylinder: data?.glassPrescription?.OD?.nearCylinder || data?.acceptance?.near?.OD?.cylinder || "",
                    axis: data?.glassPrescription?.OD?.nearAxis || data?.acceptance?.near?.OD?.axis || ""
                  },
                  OS: {
                    sphere: data?.glassPrescription?.OS?.nearDsph || data?.glassPrescription?.OS?.nearAdd || data?.acceptance?.near?.OS?.sphere || "",
                    cylinder: data?.glassPrescription?.OS?.nearCylinder || data?.acceptance?.near?.OS?.cylinder || "",
                    axis: data?.glassPrescription?.OS?.nearAxis || data?.acceptance?.near?.OS?.axis || ""
                  },
                }
              };
            }
            return prev;
          });
        }

        if (data?.contactLensPrescription) {
          // Map from Refraction station's flat eye format to PrescriptionState format
          setContactLensPrescription(prev => {
            const isEmpty = !prev.distance.OD.sphere && !prev.distance.OS.sphere;
            if (isEmpty || !isDraftLoaded) {
              return {
                clType: data.contactLensPrescription.clType || ["Soft CL"],
                distance: {
                  OD: {
                    sphere: data.contactLensPrescription.OD?.sphere || "",
                    cylinder: data.contactLensPrescription.OD?.cylinder || "",
                    axis: data.contactLensPrescription.OD?.axis || ""
                  },
                  OS: {
                    sphere: data.contactLensPrescription.OS?.sphere || "",
                    cylinder: data.contactLensPrescription.OS?.cylinder || "",
                    axis: data.contactLensPrescription.OS?.axis || ""
                  },
                },
                near: {
                  OD: {
                    sphere: data.contactLensPrescription.OD?.nearDsph || data.contactLensPrescription.OD?.nearAdd || "",
                    cylinder: data.contactLensPrescription.OD?.nearCylinder || "",
                    axis: data.contactLensPrescription.OD?.nearAxis || ""
                  },
                  OS: {
                    sphere: data.contactLensPrescription.OS?.nearDsph || data.contactLensPrescription.OS?.nearAdd || "",
                    cylinder: data.contactLensPrescription.OS?.nearCylinder || "",
                    axis: data.contactLensPrescription.OS?.nearAxis || ""
                  },
                }
              };
            }
            return prev;
          });
        }

        // Sync GAT Tonometry if available and current investigation fields are empty
        if (data?.tonometryDetails?.gat) {
          setInvestigation(prev => {
            if (!prev.slitLamp.tonometry.OD && !prev.slitLamp.tonometry.OS) {
              const getGatStr = (eyeData: any) => {
                if (!eyeData) return "";
                if (typeof eyeData === 'string') return eyeData;
                const readings = Array.isArray(eyeData.reading) ? eyeData.reading : [];
                return readings.length > 0 ? readings.join(", ") : (eyeData.iop || "");
              };

              return {
                ...prev,
                slitLamp: {
                  ...prev.slitLamp,
                  tonometry: {
                    OD: getGatStr(data.tonometryDetails.gat.OD),
                    OS: getGatStr(data.tonometryDetails.gat.OS)
                  }
                }
              };
            }
            return prev;
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch refraction data:", error);
    }
  };

  const fetchCurrentConsultation = async () => {
    if (!patient?.id) return;
    try {
      const data = await api.getConsultation(patient.id);
      if (data) {
          // If we have saved data in DB, it becomes the source of truth if the draft was empty or not loaded yet.
          // Note: for safety, we only overwrite if the current fields are relatively empty.

          if (data.anteriorSegment) {
            try {
              const raw = data.anteriorSegment;
              const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

              setInvestigation(prev => {
                // Determine if the current slitLamp state is effectively empty
                const isSlitLampEmpty = Object.values(prev.slitLamp).every(v =>
                  typeof v === 'object' && v !== null ? Object.values(v).every(x => !x) : !v
                );

                if (isSlitLampEmpty || !isDraftLoaded) {
                  return {
                    ...prev,
                    slitLamp: parsed.slitLamp || parsed,
                    eom: parsed.eom || prev.eom
                  };
                }
                return prev;
              });
            } catch (e) { }
          }

          if (data.posteriorSegment) {
            try {
              const raw = data.posteriorSegment;
              const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
              setInvestigation(prev => {
                if (((!prev.required || prev.required === "Nothing selected") && !prev.other && !prev.adminInstructions) || !isDraftLoaded) {
                  return {
                    ...prev,
                    required: parsed.required || prev.required,
                    other: parsed.other || prev.other,
                    adminInstructions: parsed.adminInstructions || prev.adminInstructions
                  };
                }
                return prev;
              });
            } catch (e) { }
          }

          if (data.fundusObservation) {
            try {
              const raw = data.fundusObservation;
              const fundus = typeof raw === 'string' ? JSON.parse(raw) : raw;
              setInvestigation(prev => {
                const isFundusEmpty = !prev.fundus.vitreous.OD && !prev.fundus.vitreous.OS && !prev.fundus.retina.OD && !prev.fundus.retina.OS && !prev.fundus.disc.OD && !prev.fundus.disc.OS;
                if ((isFundusEmpty || !isDraftLoaded) && fundus) {
                  return {
                    ...prev, fundus: {
                      vitreous: fundus.vitreous || prev.fundus.vitreous,
                      retina: fundus.retina || prev.fundus.retina,
                      disc: fundus.disc || prev.fundus.disc
                    }
                  };
                }
                return prev;
              });
            } catch (e) { }
          }

          if (data.notes) {
            setInvestigation(prev => {
              if (!prev.opinion || !isDraftLoaded) return { ...prev, opinion: data.notes };
              return prev;
            });
          }

          if (data.diagnosisText) {
            setFinalDiagnosis(prev => {
              // Determine if current diagnosis is effectively empty
              if ((!prev.OD && !prev.OS) || !isDraftLoaded) {
                const text = data.diagnosisText;
                // Case 1: Format "OD: ... | OS: ..."
                if (text.includes(' | ')) {
                  const parts = text.split(' | ');
                  const od = parts[0]?.replace(/^OD:\s*/i, '') || "";
                  const os = parts.length > 1 ? parts[1].replace(/^OS:\s*/i, '') : "";
                  return { OD: od, OS: os };
                }
                // Case 2: Unified diagnosis or single eye
                return { OD: text, OS: text };
              }
              return prev;
            });
          }

          if (data.medicalPrescription && Array.isArray(data.medicalPrescription) && data.medicalPrescription.length > 0) {
            setMedications(prev => {
              // Only overwrite if current medications are mostly empty or if force loading from DB
              const isDefaultMed = prev.length === 1 && !prev[0].drug;
              if (isDefaultMed || !isDraftLoaded) {
                // Ensure IDs are present
                return data.medicalPrescription.map((m: any) => ({
                  ...m,
                  id: m.id || Math.random().toString(36).slice(2, 11)
                }));
              }
              return prev;
            });
          }

          if (data.finalGlassPrescription) {
            setGlassPrescription(prev => {
              const isGlassEmpty = !prev.distance.OD.sphere && !prev.distance.OS.sphere;
              if (isGlassEmpty || !isDraftLoaded) {
                const raw = data.finalGlassPrescription;
                // Normalize: if the saved data is a flat {OD, OS} format (legacy),
                // or missing distance/near keys, wrap it safely.
                const emptyEye = { sphere: '', cylinder: '', axis: '' };
                const normalizedGlass: PrescriptionState = {
                  glassType: raw.glassType,
                  clType: raw.clType,
                  distance: {
                    OD: raw.distance?.OD ?? raw.OD ?? emptyEye,
                    OS: raw.distance?.OS ?? raw.OS ?? emptyEye,
                  },
                  near: {
                    OD: raw.near?.OD ?? emptyEye,
                    OS: raw.near?.OS ?? emptyEye,
                  },
                };
                return normalizedGlass;
              }
              return prev;
            });
          }

          if (data.finalContactLensPrescription) {
            setContactLensPrescription(prev => {
              const isCLEmpty = !prev.distance.OD.sphere && !prev.distance.OS.sphere;
              if (isCLEmpty || !isDraftLoaded) {
                const raw = data.finalContactLensPrescription;
                const emptyEye = { sphere: '', cylinder: '', axis: '' };
                const normalizedCL: PrescriptionState = {
                  glassType: raw.glassType,
                  clType: raw.clType,
                  distance: {
                    OD: raw.distance?.OD ?? raw.OD ?? emptyEye,
                    OS: raw.distance?.OS ?? raw.OS ?? emptyEye,
                  },
                  near: {
                    OD: raw.near?.OD ?? emptyEye,
                    OS: raw.near?.OS ?? emptyEye,
                  },
                };
                return normalizedCL;
              }
              return prev;
            });
          }
        }
    } catch (error) {
      console.error("Failed to fetch current consultation record:", error);
    }
  };

  const handleAttend = async () => {
    if (!patient?.id) return;
    try {
      setIsAttending(true);
      const updatedVisit = await api.attendVisit(patient.id);
      if (updatedVisit) {
        toast({ title: "Started Consultation", description: `You are now attending to ${patient.name}.` });
        setLocalStatus("doctor");
        window.dispatchEvent(new Event("patientQueueUpdated"));
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsAttending(false);
    }
  };

  const addMedication = () => {
    setMedications([...medications, { id: Math.random().toString(36).slice(2, 11), drug: "", dosage: "", route: "Topical", frequency: "", duration: "", eye: "Both" }]);
  };

  const removeMedication = (id: string) => {
    setMedications(medications.filter(m => m.id !== id));
  };

  const updateMedication = (id: string, field: keyof Medication, value: string) => {
    const sanitizedVal = sanitizeOptometryInput(value, 'notes');
    setMedications(medications.map(m => m.id === id ? { ...m, [field]: sanitizedVal } : m));
  };

  const updateGlassPrescription = (type: "distance" | "near", eye: "OD" | "OS", field: string, value: string) => {
    const fieldType = getFieldTypeFromName(field);
    const sanitizedVal = sanitizeOptometryInput(value, fieldType);
    setGlassPrescription(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [eye]: {
          ...(prev[type] as any)[eye],
          [field]: sanitizedVal
        }
      }
    }));
  };

  const updateContactLensPrescription = (type: "distance" | "near", eye: "OD" | "OS", field: string, value: string) => {
    const fieldType = getFieldTypeFromName(field);
    const sanitizedVal = sanitizeOptometryInput(value, fieldType);
    setContactLensPrescription(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [eye]: {
          ...(prev[type] as any)[eye],
          [field]: sanitizedVal
        }
      }
    }));
  };

  const updateInvestigation = (path: string[], value: string, type: any = 'notes') => {
    const sanitizedVal = sanitizeOptometryInput(value, type);
    setInvestigation(prev => {
      const newInv = { ...prev };
      let current: any = newInv;
      for (let i = 0; i < path.length - 1; i++) {
        current[path[i]] = { ...current[path[i]] };
        current = current[path[i]];
      }
      current[path[path.length - 1]] = sanitizedVal;
      return newInv;
    });
  };

  const saveConsultation = async () => {
    if (!patient?.id || isSubmitting) return;
    setIsSubmitting(true);

    const generateDiagnosisText = (diagList: any, manual: string) => {
      const present: string[] = [];
      if (diagList) {
        OCULAR_COMPLAINTS.forEach(c => {
          if (diagList[c.key] === 'Yes') present.push(c.label);
        });
      }
      if (manual && manual.trim()) present.push(manual.trim());
      return present.length > 0 ? present.join(', ') : 'NAD';
    };

    try {
      const data = await api.saveConsultation(patient.id, {
        anteriorSegment: { slitLamp: investigation.slitLamp, eom: investigation.eom, eyePain: (investigation.diagnosisList?.OD?.eyePain === 'Yes' || investigation.diagnosisList?.OS?.eyePain === 'Yes') ? 'Yes' : 'No' },
        fundusObservation: investigation.fundus,
        posteriorSegment: {
          required: investigation.required,
          other: investigation.other,
          adminInstructions: investigation.adminInstructions
        },
        diagnosisText: `OD: ${generateDiagnosisText(investigation.diagnosisList?.OD, finalDiagnosis.OD)} | OS: ${generateDiagnosisText(investigation.diagnosisList?.OS, finalDiagnosis.OS)}`,
        medicalPrescription: medications,
        finalGlassPrescription: glassPrescription,
        finalContactLensPrescription: contactLensPrescription,
        notes: investigation.opinion
      });

      toast({
        title: "Consultation Completed",
        description: "Clinical records and prescriptions have been successfully synchronized.",
        className: "bg-orange-600 text-white border-0 rounded-none font-bold"
      });

      // Clear draft on successful save
      const storageKey = `doctor_work_draft_${patient.mrNumber}`;
      localStorage.removeItem(storageKey);

      // Determine local status from glass prescription
      const hasGlasses = glassPrescription && 
        ((glassPrescription.distance?.OD?.sphere && glassPrescription.distance.OD.sphere !== "0.00") || 
         (glassPrescription.distance?.OS?.sphere && glassPrescription.distance.OS.sphere !== "0.00"));
      setLocalStatus(hasGlasses ? "AT_OPTICAL" : "consulted");
      fetchVisitHistory();
      fetchCurrentConsultation();
      window.dispatchEvent(new Event("patientQueueUpdated"));

      // Navigate to a blank state or next patient
      // For now, staying on the same patient with updated status
    } catch (error: any) {
      toast({
        title: "Synchronization Error",
        description: error.message || "Could not save consultation. Please check your connection.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!patient || !patient.id) {
    return (
      <div className="flex-1 p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Eye className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">No Patient Selected</h3>
        <p className="text-sm text-muted-foreground max-w-sm">Please select a patient from the queue to start the consultation.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-orange-50/30 relative" onKeyDown={handleContainerKeyDown}>
      {/* Premium Diagnostic Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-2 md:py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 shadow-sm z-30 gap-4 md:gap-8 sticky top-0">
        <div className="flex items-center gap-4 md:gap-6 w-full sm:w-auto relative z-10">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-2 md:p-3 rounded-xl shrink-0 shadow-lg shadow-orange-200/50 hidden xs:flex items-center justify-center">
            <Stethoscope className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h2 className="text-sm md:text-lg font-black text-slate-900 tracking-tight uppercase truncate">{patient.name || "UNNAMED PATIENT"}</h2>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge className="bg-orange-600 text-white text-[9px] md:text-[10px] px-2 md:px-2.5 font-mono tracking-widest rounded-full h-4 md:h-5 font-black border-2 border-white shadow-sm">MR-{patient.mrNumber || "0000"}</Badge>
                <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-[8px] md:text-[10px] px-2 font-black rounded-full h-4 md:h-5">T-{patient.tokenNumber || "—"}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50 w-fit px-2 py-0.5 rounded-md">
              <User className="w-3 h-3 text-slate-400" />
              <span>{patient.gender}</span>
              <span className="text-slate-300">•</span>
              <span>{getPatientAgeString(patient)}</span>
              <span className="text-slate-300">•</span>
              <span className="text-orange-600 font-black tracking-widest uppercase">Clinical Consultation</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 md:gap-8 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 relative z-10">
          {localStatus === "completed" && (
            <Badge className="bg-emerald-600 text-white border-0 gap-2 h-8 md:h-10 px-4 md:px-5 rounded-none font-black uppercase text-[9px] md:text-[10px] tracking-widest shadow-md shrink-0">
              <CheckCircle2 className="w-4 h-4 md:w-4 md:h-4" />
              Visit Completed
            </Badge>
          )}
          {localStatus === "refraction_done" && (
            <div className="relative">
              <Button
                onClick={handleAttend}
                disabled={isAttending}
                className="h-8 md:h-10 bg-orange-600 hover:bg-black text-white px-5 md:px-6 font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] rounded-none shadow-xl transition-all gap-2"
              >
                {isAttending ? "Accessing..." : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" /> Begin Consultation
                  </>
                )}
              </Button>
              {showLockedToast && (
                <div
                  onClick={() => setShowLockedToast(false)}
                  className="absolute right-0 top-full mt-3 z-[999] w-[280px] sm:w-[320px] bg-white text-slate-800 p-4 shadow-2xl rounded-none cursor-pointer transform transition-all duration-300 ease-out animate-bounce-short border-2 border-orange-500"
                >
                  <div className="absolute right-6 -top-2 w-4 h-4 bg-white rotate-45 border-t-2 border-l-2 border-orange-500" />

                  <div className="space-y-3 relative">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 bg-orange-100 rounded-none mt-0.5">
                        <UserCheck className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <h4 className="text-xs font-black uppercase tracking-wider text-orange-600">Start Consultation First</h4>
                        <p className="text-[11px] font-semibold text-slate-600 leading-relaxed">
                          Please click this <strong className="text-orange-600 underline font-black">Begin Consultation</strong> button to unlock editing on clinical findings.
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Click to close</span>
                      <button className="text-[10px] font-black uppercase px-3 py-1 bg-orange-600 text-white hover:bg-black transition-colors rounded-none">
                        Got it
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {(localStatus === "doctor" || localStatus === "consulted") && (
            <Button
              className={cn(
                "h-8 md:h-10 px-5 md:px-6 font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] rounded-none shadow-xl transition-all gap-2",
                localStatus === "consulted" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-orange-600 hover:bg-black text-white"
              )}
              onClick={saveConsultation}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              {isSubmitting ? "Processing..." : (localStatus === "consulted" ? "Update Clinical Record" : "Finish and Signout")}
            </Button>
          )}


          <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
            <div className="text-right shrink-0">
              <div className="flex items-center justify-end gap-1.5 mb-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Medical Officer</p>
              </div>
              <p className="text-[11px] md:text-xs font-black text-slate-900 truncate max-w-[150px]">Lead Physician</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative overflow-x-hidden">
        <div className="absolute inset-0 pointer-events-none bg-sprinkles z-0"></div>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10"
          style={{ zoom: 1.1 } as React.CSSProperties}
        >
          <div className="bg-white border-b shadow-sm z-10 sticky top-0 px-0 sm:px-8">
            <div className="flex overflow-x-auto sm:overflow-x-visible no-scrollbar scroll-smooth snap-x snap-mandatory w-full sm:w-auto">
              <TabsList className="h-14 sm:h-16 bg-transparent gap-0 sm:gap-10 p-0 flex flex-nowrap sm:flex-wrap w-full sm:w-auto border-0 justify-start">
                {[
                  { id: "summary", icon: User, label: "Summary" },
                  { id: "diagnosis_history", icon: ClipboardList, label: "Diagnosis" },
                  { id: "clinical", icon: Stethoscope, label: "Refraction" },
                  { id: "investigation", icon: Microscope, label: "Investigation" },
                  { id: "glass", icon: Glasses, label: "Glass Rx" },
                  { id: "medical", icon: Pill, label: "Medical Rx" },
                  { id: "history", icon: History, label: "Records" },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-4 data-[state=active]:border-orange-600 rounded-none px-5 sm:px-0 text-[12px] sm:text-[11px] font-black uppercase tracking-widest h-full text-slate-600 opacity-60 hover:opacity-100 data-[state=active]:opacity-100 data-[state=active]:text-orange-600 flex gap-2 sm:gap-2.5 items-center transition-all shrink-0 snap-start whitespace-nowrap"
                  >
                    <tab.icon className={cn("w-3.5 h-3.5 transition-colors hidden md:block", activeTab === tab.id ? "text-orange-600" : "text-slate-400")} />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent relative z-10 bg-orange-50/50">
            <TabsContent value="summary" className="p-4 sm:p-6 outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Demographics - col-span-3 */}
                <Card className="lg:col-span-3 clinical-card border border-slate-200 shadow-sm">
                  <div className="p-4 border-b bg-orange-50/30 flex items-center justify-between">
                    <h3 className="text-sm font-black text-orange-600 uppercase tracking-wider flex items-center gap-2">
                      <User className="w-4 h-4" /> Patient Demographics
                    </h3>
                    <Badge className="bg-orange-600 text-[10px] font-black h-5 uppercase px-2 rounded-none">
                      MRN: {patient.mrNumber || "N/A"}
                    </Badge>
                  </div>

                  <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-slate-400 font-black tracking-wider">Full Legal Name</label>
                      <p className="font-bold text-base text-orange-600 truncate" title={patient.name}>{patient.name}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-slate-400 font-black tracking-wider">Gender & Age</label>
                      <p className="font-bold text-base text-slate-700">{patient.gender}, {getPatientAgeString(patient)}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-slate-400 font-black tracking-wider">Primary Contact</label>
                      <p className="font-bold text-base text-slate-700">{patient.contactNumber}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-slate-400 font-black tracking-wider">Emergency Contact</label>
                      <p className="font-bold text-base text-slate-500 truncate">{patient.secondaryContact || "—"}</p>
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-none flex flex-col gap-1">
                      <label className="text-[10px] uppercase text-slate-400 font-black tracking-wider">Residential Address</label>
                      <p className="font-medium text-xs text-slate-700 leading-relaxed truncate">
                        {[patient.doorNo, patient.street, patient.area, patient.city, patient.pincode].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Administrative Details / Scan Reports */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                  <Card className="clinical-card !shadow-sm border border-slate-200">
                    <div className="p-3 bg-orange-600 text-white flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-95">Administrative Details</span>
                      <Badge className="bg-white text-orange-600 text-[9px] font-black h-4 uppercase px-1.5 rounded-none">Active</Badge>
                    </div>
                    <div className="p-3 grid grid-cols-3 gap-2 divide-x divide-slate-100 text-center">
                      <div className="px-1">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Registered</span>
                        <span className="text-xs font-black text-slate-700">{patient.registeredAt || "09:12 AM"}</span>
                      </div>
                      <div className="px-1">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phase</span>
                        <span className="text-xs font-black text-orange-600 uppercase tracking-wider">Clinical</span>
                      </div>
                      <div className="px-1">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Wait Time</span>
                        <span className="text-xs font-mono font-bold text-slate-700">{patient.waitTime || "14m"}</span>
                      </div>
                    </div>
                  </Card>

                  <Card className="border border-slate-200 shadow-sm p-4 bg-white">
                    <ScanReportGallery mrNumber={patient.mrNumber?.toString()} variant="compact" />
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* 2. Diagnosis (from Refraction Station) */}
            <TabsContent value="diagnosis_history" className="p-4 sm:p-6 outline-none">
              <div className="max-w-5xl mx-auto space-y-4">
                <Card className="clinical-card bg-white shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-100 bg-white">
                    <SectionHeader icon={ClipboardList} category="Clinical Assessment" title="Primary Diagnosis & History" />
                  </div>
                  <div className="clinical-section p-4 sm:p-6 space-y-6">
                    {/* Row 1: Complaints & Duration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Ocular Complaints */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-blue-100 text-blue-600 rounded-md">
                            <Eye className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 border border-blue-200/50">
                            Ocular Complaints
                          </span>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-blue-50/40 to-sky-50/20 border-l-4 border-blue-500 shadow-sm text-sm font-bold text-slate-800 min-h-[70px] flex items-center">
                          {refractionData?.ocularComplaint || "No primary complaints recorded."}
                        </div>
                      </div>

                      {/* Detailed Symptomology */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-indigo-100 text-indigo-600 rounded-md">
                            <Activity className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 border border-indigo-200/50">
                            Detailed Symptomology
                          </span>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-indigo-50/40 to-purple-50/20 border-l-4 border-indigo-500 shadow-sm text-sm font-medium text-slate-700 min-h-[70px] flex items-center">
                          {refractionData?.complaintNotes || "No detailed symptomology described."}
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Systemic History & Remarks */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Systemic Health History */}
                      <div className="space-y-2 flex flex-col h-full">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-rose-100 text-rose-600 rounded-md">
                            <Heart className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-0.5 border border-rose-200/50">
                            Systemic Health History
                          </span>
                        </div>
                        <div className="flex gap-2 flex-wrap flex-1 content-start">
                          {(() => {
                            let items = refractionData?.systemicHistory;
                            if (typeof items === 'string' && items.startsWith('[')) {
                              try { items = JSON.parse(items); } catch (e) { }
                            }
                            if (items && Array.isArray(items) && items.length > 0) {
                              return items.map((h: any, i: number) => {
                                const condition = typeof h === 'string' ? h : h.condition || h.name || 'Condition';
                                const duration = typeof h === 'string' ? '' : h.duration;
                                const details = typeof h === 'string' ? [] : h.details || [];
                                const medNotes = typeof h === 'string' ? '' : h.medicationNotes;
                                return (
                                  <div key={i} className="border border-rose-100 bg-rose-50/30 p-3.5 shadow-sm min-w-[140px] flex-1 flex flex-col justify-between transition-all hover:shadow-md hover:border-rose-300">
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between border-b border-rose-200/50 pb-1.5">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-800">{condition}</span>
                                        {duration && <span className="text-[8px] font-black text-rose-700 bg-rose-100/50 px-1.5 py-0.2 uppercase tracking-wider">{duration}</span>}
                                      </div>
                                      {details.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1.5">
                                          {details.map((d: any) => (
                                            <span key={d} className="text-[10px] font-bold uppercase tracking-wider bg-white text-slate-700 border border-slate-300 px-2 py-0.5 rounded-none">{d}</span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    {medNotes && (
                                      <div className="text-[10px] font-bold text-rose-700 mt-3 pt-2 border-t border-rose-200/30 leading-tight bg-white/40 px-2 py-1.5 border border-dashed border-rose-100 flex items-center gap-1.5">
                                        <Pill className="w-3 h-3 text-rose-600 shrink-0" />
                                        <span>Medication: {medNotes}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              });
                            }
                            if (items && typeof items === 'string') {
                              return (
                                <div className="border border-rose-100 bg-rose-50/30 p-3 shadow-sm flex-1 flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-800">{items}</span>
                                </div>
                              );
                            }
                            return (
                              <div className="border border-dashed border-slate-200 bg-slate-50/50 p-4 flex-1 flex items-center justify-center text-slate-400 italic text-[10px] font-bold">
                                No systemic health factors reported.
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Optometrist's Clinical Remarks */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-amber-100 text-amber-600 rounded-md">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 border border-amber-200/50">
                            Optometrist's Clinical Remarks
                          </span>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-amber-50/40 to-yellow-50/20 border-l-4 border-amber-500 shadow-sm italic text-sm leading-relaxed text-slate-700 relative min-h-[90px] flex items-center">
                          <span className="absolute -top-3 -left-1 text-4xl opacity-10 font-serif">“</span>
                          {refractionData?.optometristNotes ? refractionData.optometristNotes : "No specific remarks provided by the optometrist."}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* 3. Clinical Examination (Refraction Summary) */}
            <TabsContent value="clinical" className=" p-8 outline-none">
              <SectionHeader icon={ShieldCheck} category="Refraction Analysis" title="Subjective Acceptance Protocol" />
              <RefractionSummaryView data={{ ...refractionData, visitStatus: patient.status }} patient={patient} />
            </TabsContent>

            <TabsContent value="investigation" className=" p-2 lg:p-6 outline-none relative">
              {isLocked && (
                <div
                  className="absolute inset-0 z-40 cursor-default"
                  onClick={() => setShowLockedToast(true)}
                />
              )}
              <fieldset disabled={isLocked} className="contents">
                <div className="flex flex-row items-start relative max-w-7xl mx-auto mb-8 gap-6">
                  {/* Isolated Left Navigation - zero width, overflow visible self-stretch */}
                  <div className="hidden lg:block w-0 relative overflow-visible self-stretch">
                    <div className="sticky top-[120px] z-30">
                      <div
                        onMouseEnter={handleNavMouseEnter}
                        onMouseLeave={handleNavMouseLeave}
                        className={cn(
                          "absolute left-[-72px] top-[-40px] bg-white border border-slate-200 shadow-lg transition-all duration-300 overflow-hidden rounded-lg py-1 border-l-4 border-l-orange-500",
                          isNavHovered ? "w-60" : "w-16"
                        )}
                      >
                        <p className={cn(
                          "text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] my-3 px-3 truncate whitespace-nowrap transition-opacity duration-200",
                          isNavHovered ? "block" : "hidden"
                        )}>
                          Investigation Map
                        </p>
                        <p className={cn(
                          "text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] my-3 px-3 text-center transition-opacity duration-200",
                          isNavHovered ? "hidden" : "block"
                        )}>
                          MAP
                        </p>
                        <div>
                          {[
                            { id: "sec-surface-adnexa", label: "Surface & Adnexa" },
                            { id: "sec-intraocular-pupil", label: "Intraocular & Pupil" },
                            { id: "sec-motility-angles", label: "Motility & Angles" },
                            { id: "sec-vitreous", label: "Vitreous Environment" },
                            { id: "sec-retina-macula", label: "Retina & Macula" },
                            { id: "sec-optic-disc", label: "Optic Disc Profile" },
                            { id: "sec-required-investigations", label: "Required Labs" },
                            { id: "sec-clinical-opinion", label: "Clinical Opinion" },
                            { id: "sec-final-diagnosis", label: "Final Diagnosis" },
                          ].map((sec) => (
                            <button
                              key={sec.id}
                              type="button"
                              onClick={() => scrollToSection(sec.id)}
                              className={cn(
                                "w-full text-left transition-all leading-tight flex items-center py-2.5 px-3 border-b border-slate-100 last:border-b-0",
                                activeSection === sec.id
                                  ? "text-orange-600 border-l-2 border-l-orange-600 bg-orange-50/50"
                                  : "text-slate-400 border-l-2 border-l-transparent hover:text-slate-600 hover:border-l-slate-300 hover:bg-slate-50/30"
                              )}
                            >
                              {/* Collapsed state: show first letter */}
                              <span className={cn(
                                "w-8 text-center text-xs font-black uppercase shrink-0",
                                isNavHovered ? "hidden" : "inline-block"
                              )}>
                                {sec.label.charAt(0)}
                              </span>
                              {/* Expanded state: show full label */}
                              <span className={cn(
                                "truncate text-[10px] font-black uppercase tracking-wider pl-2 whitespace-nowrap inline-block",
                                isNavHovered ? "inline-block" : "hidden"
                              )}>
                                {sec.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-6">
                    {isLocked && (
                      <div className="bg-orange-100 border-l-4 border-orange-500 p-4 mb-4 flex items-center gap-4 shadow-sm animate-pulse-slow">
                        <AlertCircle className="w-6 h-6 text-orange-600" />
                        <div>
                          <h4 className="text-sm font-black text-orange-600 uppercase">Input Locked</h4>
                          <p className="text-xs font-bold text-orange-600">Please click "Begin Consultation" at the top to start entering diagnostic findings.</p>
                        </div>
                      </div>
                    )}
                    <Card className="clinical-card bg-white shadow-md border border-slate-200">
                      <div className="p-6 sm:p-8 border-b border-slate-100 bg-white">
                        <SectionHeader icon={Microscope} category="Clinical Investigation" title="Diagnostic Profile & Findings" />
                      </div>

                      <div className="clinical-section !p-4 sm:!p-10 space-y-12">
                        <div id="sec-anterior" className="scroll-mt-6 space-y-6 bg-slate-50/60 p-4 sm:p-8 border border-slate-200 shadow-sm rounded-none">
                          <SectionHeader icon={Eye} category="Slit Lamp & Specialized Profile" title="Anterior Segment" />

                          <div className="space-y-6">
                            {/* Group 1: Ocular Surface & Adnexa */}
                            <div id="sec-surface-adnexa" className="scroll-mt-24 bg-white border border-slate-200/80 p-4 sm:p-6 shadow-sm space-y-4">
                              <h4 className="text-[12px] font-black uppercase text-orange-600 tracking-wider border-b border-orange-100/50 pb-2 flex items-center gap-2"><Eye className="w-3.5 h-3.5 text-orange-500" /> Ocular Surface & Adnexa</h4>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {[
                                  { id: "lids", label: "Lids" },
                                  { id: "conjunctiva", label: "Conjunctiva" },
                                  { id: "sclera", label: "Sclera" },
                                  { id: "cornea", label: "Cornea" },
                                ].map((item) => (
                                  <div key={item.id} className="clinical-group bg-white border border-slate-300/80 p-2 sm:p-4 space-y-4 shadow-sm">
                                    <label className="clinical-label !bg-slate-100 !text-slate-700 !border-slate-200 border px-2 py-1 text-[11px] font-black uppercase tracking-wider inline-block">{item.label}</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div className="flex flex-col group">
                                        <EyeIndicator eye="OD" />
                                        {(() => {
                                          const optionsMap: Record<string, string[]> = {
                                            lids: ["Normal", "Ptosis (Partial)", "Ptosis (Complete)", "Hordeolum Internum", "Chalazion", "Lid Tear (Partial)", "Lid Tear (Complete)"],
                                            conjunctiva: ["Normal", "Congestion", "Pterygium", "Pinguecula", "Tear", "Cyst", "Symblepharon", "Adhesion"],
                                            sclera: ["Normal", "Scleritis", "Episcleritis", "Nodule", "Thinning", "Blue Sclera", "Staphyloma"],
                                            cornea: ["Normal", "Edema", "Opacity", "Ulcer", "Foreign Body", "SPK", "Vascularization", "Keratoconus", "Arcus Senilis", "Abrasion"],
                                          };
                                          const opts = optionsMap[item.id];
                                          if (opts) {
                                            return (
                                              <div className="flex flex-col gap-2 w-full">
                                                <div className={cn("grid gap-2 mt-1", opts.length > 10 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2")}>
                                                  {opts.map(opt => (
                                                    <button
                                                      key={opt}
                                                      type="button"
                                                      onClick={() => updateInvestigation(['slitLamp', item.id, 'OD'], opt)}
                                                      className={cn(
                                                        "p-2 min-h-[40px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-2 rounded-none leading-tight",
                                                        (investigation.slitLamp as any)[item.id].OD === opt
                                                          ? "bg-orange-600 text-white border-orange-600 shadow-md"
                                                          : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-600"
                                                      )}
                                                    >
                                                      {opt}
                                                    </button>
                                                  ))}
                                                </div>
                                              </div>
                                            );
                                          }
                                          return (
                                            <Input placeholder="NAD" className="h-10 sm:h-12 text-sm sm:text-lg font-black rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white transition-all shadow-sm" value={(investigation.slitLamp as any)[item.id].OD} onChange={e => updateInvestigation(['slitLamp', item.id, 'OD'], e.target.value)} />
                                          );
                                        })()}
                                      </div>
                                      <div className="flex flex-col group">
                                        <EyeIndicator eye="OS" />
                                        {(() => {
                                          const optionsMap: Record<string, string[]> = {
                                            lids: ["Normal", "Ptosis (Partial)", "Ptosis (Complete)", "Hordeolum Internum", "Chalazion", "Lid Tear (Partial)", "Lid Tear (Complete)"],
                                            conjunctiva: ["Normal", "Congestion", "Pterygium", "Pinguecula", "Tear", "Cyst", "Symblepharon", "Adhesion"],
                                            sclera: ["Normal", "Scleritis", "Episcleritis", "Nodule", "Thinning", "Blue Sclera", "Staphyloma"],
                                            cornea: ["Normal", "Edema", "Opacity", "Ulcer", "Foreign Body", "SPK", "Vascularization", "Keratoconus", "Arcus Senilis", "Abrasion"],
                                          };
                                          const opts = optionsMap[item.id];
                                          if (opts) {
                                            return (
                                              <div className="flex flex-col gap-2 w-full">
                                                <div className={cn("grid gap-2 mt-1", opts.length > 10 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2")}>
                                                  {opts.map(opt => (
                                                    <button
                                                      key={opt}
                                                      type="button"
                                                      onClick={() => updateInvestigation(['slitLamp', item.id, 'OS'], opt)}
                                                      className={cn(
                                                        "p-2 min-h-[40px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-2 rounded-none leading-tight",
                                                        (investigation.slitLamp as any)[item.id].OS === opt
                                                          ? "bg-orange-600 text-white border-orange-600 shadow-md"
                                                          : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-600"
                                                      )}
                                                    >
                                                      {opt}
                                                    </button>
                                                  ))}
                                                </div>
                                              </div>
                                            );
                                          }
                                          return (
                                            <Input placeholder="NAD" className="h-10 sm:h-12 text-sm sm:text-lg font-black rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white transition-all shadow-sm" value={(investigation.slitLamp as any)[item.id].OS} onChange={e => updateInvestigation(['slitLamp', item.id, 'OS'], e.target.value)} />
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Group 2: Anterior Chamber & Lens */}
                            <div id="sec-intraocular-pupil" className="scroll-mt-24 bg-white border border-slate-200/80 p-4 sm:p-6 shadow-sm space-y-4">
                              <h4 className="text-[12px] font-black uppercase text-orange-600 tracking-wider border-b border-orange-100/50 pb-2 flex items-center gap-2"><Microscope className="w-3.5 h-3.5 text-orange-500" /> Intraocular Structures & Pupil</h4>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {[
                                  { id: "ac", label: "Anterior Chamber" },
                                  { id: "iris", label: "Iris" },
                                  { id: "pupil", label: "Pupil" },
                                ].map((item) => (
                                  <div key={item.id} className="clinical-group bg-white border border-slate-300/80 p-2 sm:p-4 space-y-4 shadow-sm">
                                    <label className="clinical-label !bg-slate-100 !text-slate-700 !border-slate-200 border px-2 py-1 text-[11px] font-black uppercase tracking-wider inline-block">{item.label}</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div className="flex flex-col group">
                                        <EyeIndicator eye="OD" />
                                        {(() => {
                                          const optionsMap: Record<string, string[]> = {
                                            ac: ["Normal Depth", "Shallow", "Deep", "Cells", "Flare", "Hyphema", "Hypopyon", "Irregular"],
                                            iris: ["Normal", "Synechiae", "Atrophy", "Nodule", "Coloboma", "Neovasc", "Iridodonesis", "PI Present"],
                                            pupil: ["Normal", "Round", "Abnormal", "Dilated", "Constricted", "RAPD Positive", "Sluggish", "Non-Reactive"]
                                          };
                                          const opts = optionsMap[item.id];
                                          if (opts) {
                                            return (
                                              <div className="flex flex-col gap-2 w-full">
                                                <div className={cn("grid gap-2 mt-1", opts.length > 10 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2")}>
                                                  {opts.map(opt => (
                                                    <button
                                                      key={opt}
                                                      type="button"
                                                      onClick={() => updateInvestigation(['slitLamp', item.id, 'OD'], opt)}
                                                      className={cn(
                                                        "p-2 min-h-[40px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-2 rounded-none leading-tight",
                                                        (investigation.slitLamp as any)[item.id].OD === opt
                                                          ? "bg-orange-600 text-white border-orange-600 shadow-md"
                                                          : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-600"
                                                      )}
                                                    >
                                                      {opt}
                                                    </button>
                                                  ))}
                                                </div>
                                                {item.id === 'pupil' && (investigation.slitLamp as any).pupil.OD === "Dilated" && (
                                                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200 shadow-inner w-full">
                                                    <label className="text-[10px] font-black uppercase text-orange-600 tracking-widest block mb-2">Dilation Agent</label>
                                                    <div className="grid grid-cols-2 gap-1.5">
                                                      {["Tropicacyl", "Tropicacyl Plus", "Cyclopentolate", "Homatropine", "Atropine", "Phenylephrine 10%", "Already Dilated", "Poor Dilation"].map(drug => (
                                                        <button
                                                          key={drug}
                                                          type="button"
                                                          onClick={() => updateInvestigation(['slitLamp', 'dilation', 'OD'], drug)}
                                                          className={cn("p-1.5 min-h-[32px] text-[8px] font-black uppercase tracking-widest transition-all border-2 rounded-none leading-tight", typeof investigation.slitLamp.dilation === 'object' && investigation.slitLamp.dilation?.OD === drug ? "bg-orange-500 text-white border-orange-500 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:border-orange-300")}
                                                        >
                                                          {drug}
                                                        </button>
                                                      ))}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          }
                                          return (
                                            <Input placeholder="NAD" className="h-10 sm:h-12 text-sm sm:text-lg font-black rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white transition-all shadow-sm" value={(investigation.slitLamp as any)[item.id].OD} onChange={e => updateInvestigation(['slitLamp', item.id, 'OD'], e.target.value)} />
                                          );
                                        })()}
                                      </div>
                                      <div className="flex flex-col group">
                                        <EyeIndicator eye="OS" />
                                        {(() => {
                                          const optionsMap: Record<string, string[]> = {
                                            ac: ["Normal Depth", "Shallow", "Deep", "Cells", "Flare", "Hyphema", "Hypopyon", "Irregular"],
                                            iris: ["Normal", "Synechiae", "Atrophy", "Nodule", "Coloboma", "Neovasc", "Iridodonesis", "PI Present"],
                                            pupil: ["Normal", "Round", "Abnormal", "Dilated", "Constricted", "RAPD Positive", "Sluggish", "Non-Reactive"]
                                          };
                                          const opts = optionsMap[item.id];
                                          if (opts) {
                                            return (
                                              <div className="flex flex-col gap-2 w-full">
                                                <div className={cn("grid gap-2 mt-1", opts.length > 10 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2")}>
                                                  {opts.map(opt => (
                                                    <button
                                                      key={opt}
                                                      type="button"
                                                      onClick={() => updateInvestigation(['slitLamp', item.id, 'OS'], opt)}
                                                      className={cn(
                                                        "p-2 min-h-[40px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-2 rounded-none leading-tight",
                                                        (investigation.slitLamp as any)[item.id].OS === opt
                                                          ? "bg-orange-600 text-white border-orange-600 shadow-md"
                                                          : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-600"
                                                      )}
                                                    >
                                                      {opt}
                                                    </button>
                                                  ))}
                                                </div>
                                                {item.id === 'pupil' && (investigation.slitLamp as any).pupil.OS === "Dilated" && (
                                                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200 shadow-inner w-full">
                                                    <label className="text-[10px] font-black uppercase text-orange-600 tracking-widest block mb-2">Dilation Agent</label>
                                                    <div className="grid grid-cols-2 gap-1.5">
                                                      {["Tropicacyl", "Tropicacyl Plus", "Cyclopentolate", "Homatropine", "Atropine", "Phenylephrine 10%", "Already Dilated", "Poor Dilation"].map(drug => (
                                                        <button
                                                          key={drug}
                                                          type="button"
                                                          onClick={() => updateInvestigation(['slitLamp', 'dilation', 'OS'], drug)}
                                                          className={cn("p-1.5 min-h-[32px] text-[8px] font-black uppercase tracking-widest transition-all border-2 rounded-none leading-tight", typeof investigation.slitLamp.dilation === 'object' && investigation.slitLamp.dilation?.OS === drug ? "bg-orange-500 text-white border-orange-500 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:border-orange-300")}
                                                        >
                                                          {drug}
                                                        </button>
                                                      ))}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          }
                                          return (
                                            <Input placeholder="NAD" className="h-10 sm:h-12 text-sm sm:text-lg font-black rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white transition-all shadow-sm" value={(investigation.slitLamp as any)[item.id].OS} onChange={e => updateInvestigation(['slitLamp', item.id, 'OS'], e.target.value)} />
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="border-t border-slate-100 pt-6">
                                {[
                                  { id: "lens", label: "Lens" },
                                ].map((item) => (
                                  <div key={item.id} className="clinical-group bg-white border border-slate-300/80 p-2 sm:p-4 space-y-4 shadow-sm">
                                    <label className="clinical-label !bg-slate-100 !text-slate-700 !border-slate-200 border px-2 py-1 text-[11px] font-black uppercase tracking-wider inline-block">{item.label}</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="flex flex-col group">
                                        <EyeIndicator eye="OD" />
                                        {(() => {
                                          const opts = ["Normal", "Immature Cataract (1)", "Immature Cataract (2)", "Immature Cataract (3)", "Immature Cataract (4)", "Nuclear Cataract (G1)", "Nuclear Cataract (G2)", "Nuclear Cataract (G3)", "Nuclear Cataract (G4)", "Mature Cataract", "Posterior Subcapsular", "Traumatic Cataract", "Liquified Morgagnian", "Cortical Cataract", "Hypermature Cataract"];
                                          return (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-1">
                                              {opts.map(opt => (
                                                <button
                                                  key={opt}
                                                  type="button"
                                                  onClick={() => updateInvestigation(['slitLamp', item.id, 'OD'], opt)}
                                                  className={cn(
                                                    "p-2 min-h-[40px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-2 rounded-none leading-tight",
                                                    (investigation.slitLamp as any)[item.id].OD === opt
                                                      ? "bg-orange-600 text-white border-orange-600 shadow-md"
                                                      : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-600"
                                                  )}
                                                >
                                                  {opt}
                                                </button>
                                              ))}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                      <div className="flex flex-col group">
                                        <EyeIndicator eye="OS" />
                                        {(() => {
                                          const opts = ["Normal", "Immature Cataract (1)", "Immature Cataract (2)", "Immature Cataract (3)", "Immature Cataract (4)", "Nuclear Cataract (G1)", "Nuclear Cataract (G2)", "Nuclear Cataract (G3)", "Nuclear Cataract (G4)", "Mature Cataract", "Posterior Subcapsular", "Traumatic Cataract", "Liquified Morgagnian", "Cortical Cataract", "Hypermature Cataract"];
                                          return (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-1">
                                              {opts.map(opt => (
                                                <button
                                                  key={opt}
                                                  type="button"
                                                  onClick={() => updateInvestigation(['slitLamp', item.id, 'OS'], opt)}
                                                  className={cn(
                                                    "p-2 min-h-[40px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-2 rounded-none leading-tight",
                                                    (investigation.slitLamp as any)[item.id].OS === opt
                                                      ? "bg-orange-600 text-white border-orange-600 shadow-md"
                                                      : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-600"
                                                  )}
                                                >
                                                  {opt}
                                                </button>
                                              ))}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Group 3: Motility & Angles */}
                            <div id="sec-motility-angles" className="scroll-mt-24 bg-white border border-slate-200/80 p-4 sm:p-6 shadow-sm space-y-4">
                              <h4 className="text-[12px] font-black uppercase text-orange-600 tracking-wider border-b border-orange-100/50 pb-2 flex items-center gap-2"><Activity className="w-3.5 h-3.5 text-orange-500" /> Motility & Angles</h4>
                              <div className="grid grid-cols-1 gap-6">

                                {/* EOM */}
                                <div className="clinical-group bg-slate-50/50 border border-slate-200 p-3 sm:p-6 shadow-sm">
                                  <label className="clinical-label !bg-slate-100 !text-slate-700 !border-slate-200 border px-2 py-1 text-[11px] font-black uppercase tracking-wider inline-block mb-3">Extra Ocular Movements (EOM)</label>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="flex flex-col flex-1 group">
                                      <EyeIndicator eye="OD" />
                                      <div className="grid grid-cols-2 gap-2 mt-1">
                                        {["Normal", "Restricted", "Sixth Nerve Palsy", "Third Nerve Palsy"].map(opt => (
                                          <button
                                            key={opt}
                                            type="button"
                                            onClick={() => updateInvestigation(['eom', 'OD'], opt)}
                                            className={cn(
                                              "p-2 h-12 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-2 rounded-none leading-tight",
                                              investigation.eom.OD === opt
                                                ? "bg-orange-600 text-white border-orange-600 shadow-md"
                                                : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-600"
                                            )}
                                          >
                                            {opt}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="flex flex-col flex-1 group">
                                      <EyeIndicator eye="OS" />
                                      <div className="grid grid-cols-2 gap-2 mt-1">
                                        {["Normal", "Restricted", "Sixth Nerve Palsy", "Third Nerve Palsy"].map(opt => (
                                          <button
                                            key={opt}
                                            type="button"
                                            onClick={() => updateInvestigation(['eom', 'OS'], opt)}
                                            className={cn(
                                              "p-2 h-12 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-2 rounded-none leading-tight",
                                              investigation.eom.OS === opt
                                                ? "bg-orange-600 text-white border-orange-600 shadow-md"
                                                : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-600"
                                            )}
                                          >
                                            {opt}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Side-by-Side: Gonioscopy & Synaptophore */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  <div className="space-y-4 border border-slate-200 p-4 bg-slate-50/50">
                                    <label className="text-[11px] font-black uppercase !text-slate-700 !bg-slate-100 !border-slate-200 border px-3 py-1.5 inline-block tracking-widest">Gonioscopy Evaluation</label>
                                    <div className="flex flex-col gap-4">
                                      <div className="flex flex-col group">
                                        <EyeIndicator eye="OD" />
                                        <div className="grid grid-cols-2 gap-2 mt-1">
                                          {["Normal", "Grade 4 (Wide Open)", "Grade 3 (Open)", "Grade 2 (Narrow)", "Grade 1 (Very Narrow)", "Grade 0 (Closed)"].map(opt => (
                                            <button
                                              key={opt}
                                              type="button"
                                              onClick={() => updateInvestigation(['slitLamp', 'gonioscopy', 'OD'], opt)}
                                              className={cn(
                                                "p-2 min-h-[40px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-2 rounded-none leading-tight",
                                                investigation.slitLamp.gonioscopy.OD === opt
                                                  ? "bg-orange-600 text-white border-orange-600 shadow-md"
                                                  : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-600"
                                              )}
                                            >
                                              {opt}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="flex flex-col group">
                                        <EyeIndicator eye="OS" />
                                        <div className="grid grid-cols-2 gap-2 mt-1">
                                          {["Normal", "Grade 4 (Wide Open)", "Grade 3 (Open)", "Grade 2 (Narrow)", "Grade 1 (Very Narrow)", "Grade 0 (Closed)"].map(opt => (
                                            <button
                                              key={opt}
                                              type="button"
                                              onClick={() => updateInvestigation(['slitLamp', 'gonioscopy', 'OS'], opt)}
                                              className={cn(
                                                "p-2 min-h-[40px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-2 rounded-none leading-tight",
                                                investigation.slitLamp.gonioscopy.OS === opt
                                                  ? "bg-orange-600 text-white border-orange-600 shadow-md"
                                                  : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-600"
                                              )}
                                            >
                                              {opt}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-4 border border-slate-200 p-4 bg-slate-50/50">
                                    <label className="text-[11px] font-black uppercase !text-slate-700 !bg-slate-100 !border-slate-200 border px-3 py-1.5 inline-block tracking-widest">Synaptophore Profile</label>
                                    <div className="flex flex-col gap-4">
                                      <div className="flex flex-col group">
                                        <EyeIndicator eye="OD" />
                                        <div className="grid grid-cols-2 gap-2 mt-1">
                                          {["Normal BSV", "SMP Present", "Fusion", "Stereopsis", "Suppression", "ARC", "NRC"].map(opt => (
                                            <button
                                              key={opt}
                                              type="button"
                                              onClick={() => updateInvestigation(['slitLamp', 'synaptophore', 'OD'], opt)}
                                              className={cn(
                                                "p-2 min-h-[40px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-2 rounded-none leading-tight",
                                                investigation.slitLamp.synaptophore.OD === opt
                                                  ? "bg-orange-600 text-white border-orange-600 shadow-md"
                                                  : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-600"
                                              )}
                                            >
                                              {opt}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="flex flex-col group">
                                        <EyeIndicator eye="OS" />
                                        <div className="grid grid-cols-2 gap-2 mt-1">
                                          {["Normal BSV", "SMP Present", "Fusion", "Stereopsis", "Suppression", "ARC", "NRC"].map(opt => (
                                            <button
                                              key={opt}
                                              type="button"
                                              onClick={() => updateInvestigation(['slitLamp', 'synaptophore', 'OS'], opt)}
                                              className={cn(
                                                "p-2 min-h-[40px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-2 rounded-none leading-tight",
                                                investigation.slitLamp.synaptophore.OS === opt
                                                  ? "bg-orange-600 text-white border-orange-600 shadow-md"
                                                  : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-600"
                                              )}
                                            >
                                              {opt}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                              </div>
                            </div>

                          </div>    </div>

                        <Separator className="!my-8 opacity-25" />

                        <div id="sec-posterior" className="scroll-mt-6 space-y-6 bg-orange-50/50 p-3 sm:p-8 border-2 border-orange-200/70 rounded-none">
                          <SectionHeader icon={Activity} category="Retinal Analysis" title="Posterior Segment" />
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div id="sec-vitreous" className="scroll-mt-24 clinical-group bg-white border border-slate-300 p-2 sm:p-5 space-y-4 shadow-sm">
                              <label className="clinical-label !bg-orange-50 !text-orange-600 !border-orange-100 border px-2 py-1 text-[11px] inline-block mb-3 sm:mb-0">Vitreous Environment</label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col group">
                                  <EyeIndicator eye="OD" />
                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                    {["Normal", "Hemorrhage", "PVD", "Schaffer's Sign", "Inflammation"].map(opt => (
                                      <button
                                        key={opt}
                                        type="button"
                                        onClick={() => updateInvestigation(['fundus', 'vitreous', 'OD'], opt)}
                                        className={cn(
                                          "p-2 min-h-[40px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-2 rounded-none leading-tight",
                                          investigation.fundus.vitreous.OD === opt
                                            ? "bg-orange-600 text-white border-orange-600 shadow-md"
                                            : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-600"
                                        )}
                                      >
                                        {opt}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex flex-col group">
                                  <EyeIndicator eye="OS" />
                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                    {["Normal", "Hemorrhage", "PVD", "Schaffer's Sign", "Inflammation"].map(opt => (
                                      <button
                                        key={opt}
                                        type="button"
                                        onClick={() => updateInvestigation(['fundus', 'vitreous', 'OS'], opt)}
                                        className={cn(
                                          "p-2 min-h-[40px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-2 rounded-none leading-tight",
                                          investigation.fundus.vitreous.OS === opt
                                            ? "bg-orange-600 text-white border-orange-600 shadow-md"
                                            : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-600"
                                        )}
                                      >
                                        {opt}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div id="sec-retina-macula" className="scroll-mt-24 clinical-group bg-white border border-slate-300 p-2 sm:p-5 space-y-4 shadow-sm">
                              <label className="clinical-label !bg-orange-50 !text-orange-600 !border-orange-100 border px-2 py-1 text-[11px] inline-block mb-3 sm:mb-0">Retina & Macula Findings</label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col group">
                                  <EyeIndicator eye="OD" />
                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                    {["Normal", "Detached", "Diabetic Retinopathy", "Hypertensive Retinopathy", "CSR", "BRVO / CRVO / CRAO / BRAO"].map(opt => (
                                      <button
                                        key={opt}
                                        type="button"
                                        onClick={() => updateInvestigation(['fundus', 'retina', 'OD'], opt)}
                                        className={cn(
                                          "p-2 min-h-[40px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-2 rounded-none leading-tight",
                                          investigation.fundus.retina.OD === opt
                                            ? "bg-orange-600 text-white border-orange-600 shadow-md"
                                            : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-600"
                                        )}
                                      >
                                        {opt}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex flex-col group">
                                  <EyeIndicator eye="OS" />
                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                    {["Normal", "Detached", "Diabetic Retinopathy", "Hypertensive Retinopathy", "CSR", "BRVO / CRVO / CRAO / BRAO"].map(opt => (
                                      <button
                                        key={opt}
                                        type="button"
                                        onClick={() => updateInvestigation(['fundus', 'retina', 'OS'], opt)}
                                        className={cn(
                                          "p-2 min-h-[40px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-2 rounded-none leading-tight",
                                          investigation.fundus.retina.OS === opt
                                            ? "bg-orange-600 text-white border-orange-600 shadow-md"
                                            : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-600"
                                        )}
                                      >
                                        {opt}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                            <div id="sec-optic-disc" className="scroll-mt-24 clinical-group bg-white border border-slate-300 p-2 sm:p-5 space-y-4 shadow-sm">
                              <label className="clinical-label !bg-orange-50 !text-orange-600 !border-orange-100 border px-2 py-1 text-[11px] inline-block mb-3 sm:mb-0">Optic Disc Profile</label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col group">
                                  <EyeIndicator eye="OD" />
                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                    {["Healthy Disc", "Disc Vessels Normal", "Disc Edema", "Papilledema"].map(opt => (
                                      <button
                                        key={opt}
                                        type="button"
                                        onClick={() => updateInvestigation(['fundus', 'disc', 'OD'], opt)}
                                        className={cn(
                                          "p-2 min-h-[40px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-2 rounded-none leading-tight",
                                          investigation.fundus.disc.OD === opt
                                            ? "bg-orange-600 text-white border-orange-600 shadow-md"
                                            : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-600"
                                        )}
                                      >
                                        {opt}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex flex-col group">
                                  <EyeIndicator eye="OS" />
                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                    {["Healthy Disc", "Disc Vessels Normal", "Disc Edema", "Papilledema"].map(opt => (
                                      <button
                                        key={opt}
                                        type="button"
                                        onClick={() => updateInvestigation(['fundus', 'disc', 'OS'], opt)}
                                        className={cn(
                                          "p-2 min-h-[40px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border-2 rounded-none leading-tight",
                                          investigation.fundus.disc.OS === opt
                                            ? "bg-orange-600 text-white border-orange-600 shadow-md"
                                            : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-600"
                                        )}
                                      >
                                        {opt}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <Separator className="!my-8 opacity-25" />

                        <div className="space-y-6">
                          <div id="sec-required-investigations" className="scroll-mt-24 clinical-group bg-white border border-slate-300 p-3 sm:p-5 shadow-sm">
                            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-end">
                              <div className="space-y-2 w-full sm:w-1/3 transition-all duration-300">
                                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Required Investigations</Label>
                                <Select value={investigation.required} onValueChange={v => {
                                  setInvestigation({ ...investigation, required: v, other: v === "Other" ? investigation.other : "" });
                                }}>
                                  <SelectTrigger className="h-12 text-sm font-bold rounded-none border-slate-300 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-sm focus:ring-0 focus:ring-offset-0 focus:border-orange-600"><SelectValue placeholder="Select type..." /></SelectTrigger>
                                  <SelectContent className="rounded-none font-bold">
                                    <SelectItem value="Nothing selected">Nothing selected</SelectItem>
                                    <SelectItem value="OCT">OCT: Optical Coherence Tomography</SelectItem>
                                    <SelectItem value="Fundus Photography">Fundus Photography / FFA</SelectItem>
                                    <SelectItem value="HVFA">HVFA: Humphrey Fields</SelectItem>
                                    <SelectItem value="Topography">Corneal Topography</SelectItem>
                                    <SelectItem value="Biometry">A-Scan / Biometry</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {investigation.required === "Other" && (
                                <div className="flex-1 space-y-2 animate-in fade-in slide-in-from-right-4 duration-300 w-full">
                                  <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Other / Specification</Label>
                                  <Input placeholder="Specify other investigations..." className="h-12 text-sm font-bold rounded-none border-slate-300 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-sm focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={investigation.other} onChange={e => updateInvestigation(['other'], e.target.value)} />
                                </div>
                              )}
                            </div>
                          </div>
                          <div id="sec-clinical-opinion" className="scroll-mt-24 clinical-group bg-white border border-slate-300 p-2 sm:p-5 space-y-4 shadow-sm">
                            <Label className="text-[12px] font-black uppercase tracking-widest text-slate-500">Clinical Opinion</Label>
                            <Textarea placeholder="Detailed findings..." className="min-h-[140px] text-base font-medium rounded-none border-slate-300 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 p-5 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={investigation.opinion} onChange={e => updateInvestigation(['opinion'], e.target.value)} />
                          </div>
                          <div id="sec-final-diagnosis" className="scroll-mt-24 clinical-group bg-white border border-slate-300 p-3 sm:p-8 space-y-4 shadow-md">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 border-b border-slate-100 pb-4">
                              <Label className="clinical-label !bg-orange-50 !text-orange-600 !border-orange-100 border px-3 py-1.5 inline-block m-0">Final Clinical Diagnosis</Label>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                              <div className="flex flex-col flex-1 group gap-4">
                                <EyeIndicator eye="OD" />
                                <div className="space-y-1 bg-white p-3 border border-slate-200 shadow-sm">
                                  {OCULAR_COMPLAINTS.map((c) => (
                                    <div key={c.key} className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-2 transition-colors">
                                      <span className="text-xs font-black text-slate-600 uppercase tracking-wider">{c.label}</span>
                                      <div className="flex gap-1.5 shrink-0">
                                        <button type="button" onClick={() => setInvestigation(prev => ({ ...prev, diagnosisList: { ...prev.diagnosisList, OD: { ...prev.diagnosisList?.OD, [c.key]: 'Yes' } } }))} className={cn("px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-all border rounded-none", investigation.diagnosisList?.OD?.[c.key] === 'Yes' ? "bg-red-500 text-white border-red-500 shadow-sm" : "bg-slate-50 text-slate-400 border-slate-200 hover:border-red-400 hover:text-red-500")}>Yes</button>
                                        <button type="button" onClick={() => setInvestigation(prev => ({ ...prev, diagnosisList: { ...prev.diagnosisList, OD: { ...prev.diagnosisList?.OD, [c.key]: 'No' } } }))} className={cn("px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-all border rounded-none", investigation.diagnosisList?.OD?.[c.key] === 'No' || !investigation.diagnosisList?.OD?.[c.key] ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-slate-50 text-slate-400 border-slate-200 hover:border-emerald-400 hover:text-emerald-500")}>No</button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <Textarea placeholder="Other manual diagnosis..." className="min-h-[80px] text-sm font-black text-orange-600 rounded-none border-orange-200 bg-orange-50/30 p-3 shadow-inner focus:bg-white focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all" value={finalDiagnosis.OD || ""} onChange={e => setFinalDiagnosis(prev => ({ ...prev, OD: sanitizeOptometryInput(e.target.value, 'notes') }))} />
                              </div>
                              <div className="flex flex-col flex-1 group gap-4">
                                <EyeIndicator eye="OS" />
                                <div className="space-y-1 bg-white p-3 border border-slate-200 shadow-sm">
                                  {OCULAR_COMPLAINTS.map((c) => (
                                    <div key={c.key} className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-2 transition-colors">
                                      <span className="text-xs font-black text-slate-600 uppercase tracking-wider">{c.label}</span>
                                      <div className="flex gap-1.5 shrink-0">
                                        <button type="button" onClick={() => setInvestigation(prev => ({ ...prev, diagnosisList: { ...prev.diagnosisList, OS: { ...prev.diagnosisList?.OS, [c.key]: 'Yes' } } }))} className={cn("px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-all border rounded-none", investigation.diagnosisList?.OS?.[c.key] === 'Yes' ? "bg-red-500 text-white border-red-500 shadow-sm" : "bg-slate-50 text-slate-400 border-slate-200 hover:border-red-400 hover:text-red-500")}>Yes</button>
                                        <button type="button" onClick={() => setInvestigation(prev => ({ ...prev, diagnosisList: { ...prev.diagnosisList, OS: { ...prev.diagnosisList?.OS, [c.key]: 'No' } } }))} className={cn("px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-all border rounded-none", investigation.diagnosisList?.OS?.[c.key] === 'No' || !investigation.diagnosisList?.OS?.[c.key] ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-slate-50 text-slate-400 border-slate-200 hover:border-emerald-400 hover:text-emerald-500")}>No</button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <Textarea placeholder="Other manual diagnosis..." className="min-h-[80px] text-sm font-black text-orange-600 rounded-none border-orange-200 bg-orange-50/30 p-3 shadow-inner focus:bg-white focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all" value={finalDiagnosis.OS || ""} onChange={e => setFinalDiagnosis(prev => ({ ...prev, OS: sanitizeOptometryInput(e.target.value, 'notes') }))} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </fieldset>
            </TabsContent>
            {/* 5. Glass Prescription */}
            <TabsContent value="glass" className=" p-8 outline-none">
              <fieldset disabled={isLocked} className="contents">
                <div className="max-w-5xl mx-auto space-y-10 mb-12">
                  {isLocked && (
                    <div className="bg-orange-100 border-l-4 border-orange-500 p-4 mb-4 flex items-center gap-4 shadow-sm animate-pulse-slow">
                      <AlertCircle className="w-6 h-6 text-orange-600" />
                      <div>
                        <h4 className="text-sm font-black text-orange-600 uppercase">Input Locked</h4>
                        <p className="text-xs font-bold text-orange-600">Please click "Begin Consultation" at the top to enable lens prescription fields.</p>
                      </div>
                    </div>
                  )}
                  <Card className="clinical-card bg-white shadow-md overflow-hidden">
                    <div className="p-6 sm:p-8 border-b border-slate-100 bg-white">
                      <SectionHeader icon={Glasses} category="Optometry Outcome" title="Final Optometrist Recommendation" />
                    </div>
                    <div className="p-6 sm:p-8 space-y-8">
                      <div className="bg-orange-50/80 border border-orange-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-3 bg-orange-100/50 border-b border-orange-200 flex items-center gap-3">
                          <Activity className="w-4 h-4 text-orange-600" />
                          <label className="text-[11px] font-black uppercase tracking-[0.15em] text-orange-600">Refraction Acceptance Data (Read-Only)</label>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-orange-200/50">
                          <div className="p-5 flex flex-col gap-1.5">
                            <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">OD - DISTANCE</span>
                            <span className="text-lg font-black text-orange-600 font-mono tracking-tighter">
                              {refractionData?.acceptance?.distance?.OD ?
                                `${refractionData.acceptance.distance.OD.sphere || '0.00'} / ${refractionData.acceptance.distance.OD.cylinder || '0.00'} @ ${refractionData.acceptance.distance.OD.axis || '0'}°`
                                : "No Data"}
                            </span>
                          </div>
                          <div className="p-5 flex flex-col gap-1.5">
                            <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">OS - DISTANCE</span>
                            <span className="text-lg font-black text-orange-600 font-mono tracking-tighter">
                              {refractionData?.acceptance?.distance?.OS ?
                                `${refractionData.acceptance.distance.OS.sphere || '0.00'} / ${refractionData.acceptance.distance.OS.cylinder || '0.00'} @ ${refractionData.acceptance.distance.OS.axis || '0'}°`
                                : "No Data"}
                            </span>
                          </div>
                          <div className="p-5 flex flex-col gap-1.5">
                            <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">OD - NEAR</span>
                            <span className="text-lg font-black text-orange-600 font-mono tracking-tighter">
                              {refractionData?.acceptance?.near?.OD ?
                                `${refractionData.acceptance.near.OD.sphere || '+0.00'} / ${refractionData.acceptance.near.OD.cylinder || '0.00'} @ ${refractionData.acceptance.near.OD.axis || '0'}°`
                                : "No Data"}
                            </span>
                          </div>
                          <div className="p-5 flex flex-col gap-1.5">
                            <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">OS - NEAR</span>
                            <span className="text-lg font-black text-orange-600 font-mono tracking-tighter">
                              {refractionData?.acceptance?.near?.OS ?
                                `${refractionData.acceptance.near.OS.sphere || '+0.00'} / ${refractionData.acceptance.near.OS.cylinder || '0.00'} @ ${refractionData.acceptance.near.OS.axis || '0'}°`
                                : "No Data"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Editable Spectacles Power Table (Desktop) */}
                  <Card className="clinical-card group overflow-hidden mt-6">
                    <div className="p-5 sm:p-6 bg-white border-b border-slate-100 flex items-center gap-4">
                      <div className="p-3 bg-orange-600 text-white shadow-lg"><Glasses className="w-6 h-6 shrink-0" /></div>
                      <div className="flex flex-col">
                        <span className="text-[12px] font-black uppercase tracking-widest text-orange-600 mb-0.5">Clinical Optics</span>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tighter">Final Spectacles RX</h3>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="space-y-6 pb-6 mb-6 border-b border-orange-100">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest block">Prescribed Lens Architecture</label>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {[
                              { label: "Single Vision (SVN)", value: "SVN" },
                              { label: "Bifocals (KBF)", value: "KBF" },
                              { label: "Progressive (PAL)", value: "PAL" }
                            ].map((opt) => {
                              const isSelected = (glassPrescription.glassType || "SVN") === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setGlassPrescription(p => ({ ...p, glassType: opt.value }))}
                                  className={cn(
                                    "px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all border-2 rounded-none",
                                    isSelected
                                      ? "bg-orange-600 text-white border-orange-600 shadow-md"
                                      : "bg-white text-slate-400 border-slate-100 hover:border-orange-200 hover:text-orange-600"
                                  )}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="hidden md:block space-y-6">
                        <div className="overflow-hidden border border-slate-200">
                          <Table className="font-mono">
                            <TableHeader className="bg-orange-600">
                              <TableRow className="hover:bg-orange-600">
                                <TableHead className="w-[120px] text-white font-black uppercase text-[12px] tracking-widest h-14">EYE</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[12px] tracking-widest">DV (SPH)</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[12px] tracking-widest">DV (CYL)</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[12px] tracking-widest">DV (AXIS)</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[12px] tracking-widest bg-orange-600/80">NV (SPH)</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[12px] tracking-widest bg-orange-600/80 border-l border-orange-500/30">NV (CYL)</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[12px] tracking-widest bg-orange-600/80">NV (AXIS)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {["OD", "OS"].map((eye, idx) => (
                                <TableRow key={eye} className={cn("h-20", idx === 0 ? "bg-orange-50/50" : "bg-white")}>
                                  <TableCell className="pl-6">
                                    <EyeIndicator eye={eye as "OD" | "OS"} compact />
                                  </TableCell>
                                  <TableCell>
                                    <PowerPaletteInput
                                      className="h-12 text-center text-lg font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all"
                                      value={(glassPrescription.distance as any)[eye].sphere}
                                      onChange={val => updateGlassPrescription('distance', eye as any, 'sphere', val)}
                                      label={`${eye} DV (SPH)`}
                                      type="sph"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <PowerPaletteInput
                                      className="h-12 text-center text-lg font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all"
                                      value={(glassPrescription.distance as any)[eye].cylinder}
                                      onChange={val => updateGlassPrescription('distance', eye as any, 'cylinder', val)}
                                      label={`${eye} DV (CYL)`}
                                      type="cyl"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <PowerPaletteInput
                                      className="h-12 text-center text-lg font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all"
                                      value={(glassPrescription.distance as any)[eye].axis}
                                      onChange={val => updateGlassPrescription('distance', eye as any, 'axis', val)}
                                      label={`${eye} DV (AXIS)`}
                                      type="axis"
                                    />
                                  </TableCell>
                                  <TableCell className="bg-orange-50/20">
                                    <PowerPaletteInput
                                      className="h-12 text-center text-lg font-black bg-white rounded-none border-orange-100 focus:border-orange-600 focus:ring-0 transition-all"
                                      value={(glassPrescription.near as any)[eye].sphere}
                                      onChange={val => updateGlassPrescription('near', eye as any, 'sphere', val)}
                                      placeholder="+"
                                      label={`${eye} NV (SPH)`}
                                      type="sph"
                                    />
                                  </TableCell>
                                  <TableCell className="bg-orange-50/20 border-l border-slate-200">
                                    <PowerPaletteInput
                                      className="h-12 text-center text-lg font-black bg-white rounded-none border-orange-100 focus:border-orange-600 focus:ring-0 transition-all"
                                      value={(glassPrescription.near as any)[eye].cylinder}
                                      onChange={val => updateGlassPrescription('near', eye as any, 'cylinder', val)}
                                      label={`${eye} NV (CYL)`}
                                      type="cyl"
                                    />
                                  </TableCell>
                                  <TableCell className="bg-orange-50/20">
                                    <PowerPaletteInput
                                      className="h-12 text-center text-lg font-black bg-white rounded-none border-orange-100 focus:border-orange-600 focus:ring-0 transition-all"
                                      value={(glassPrescription.near as any)[eye].axis}
                                      onChange={val => updateGlassPrescription('near', eye as any, 'axis', val)}
                                      label={`${eye} NV (AXIS)`}
                                      type="axis"
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* Editable Power List (Mobile) */}
                      <div className="md:hidden space-y-8 mt-4">
                        {["OD", "OS"].map((eye) => (
                          <div key={eye} className="space-y-4">
                            <EyeIndicator eye={eye as "OD" | "OS"} />

                            <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400">DV (SPH)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center text-sm font-black bg-white rounded-none border-slate-200"
                                  value={(glassPrescription.distance as any)[eye].sphere}
                                  onChange={val => updateGlassPrescription('distance', eye as any, 'sphere', val)}
                                  label={`${eye} DV (SPH)`}
                                  type="sph"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400">DV (CYL)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center text-sm font-black bg-white rounded-none border-slate-200"
                                  value={(glassPrescription.distance as any)[eye].cylinder}
                                  onChange={val => updateGlassPrescription('distance', eye as any, 'cylinder', val)}
                                  label={`${eye} DV (CYL)`}
                                  type="cyl"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400">DV (AXIS)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center text-sm font-black bg-white rounded-none border-slate-200"
                                  value={(glassPrescription.distance as any)[eye].axis}
                                  onChange={val => updateGlassPrescription('distance', eye as any, 'axis', val)}
                                  label={`${eye} DV (AXIS)`}
                                  type="axis"
                                />
                              </div>
                            </div>
                            <div className="pt-2 grid grid-cols-3 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-orange-600">NV (SPH)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center font-black bg-orange-50/10 border-orange-100 rounded-none text-orange-600"
                                  value={(glassPrescription.near as any)[eye].sphere}
                                  onChange={val => updateGlassPrescription('near', eye as any, 'sphere', val)}
                                  placeholder="+"
                                  label={`${eye} NV (SPH)`}
                                  type="sph"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-orange-600">NV (CYL)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center font-black bg-orange-50/10 border-orange-100 rounded-none text-orange-600"
                                  value={(glassPrescription.near as any)[eye].cylinder}
                                  onChange={val => updateGlassPrescription('near', eye as any, 'cylinder', val)}
                                  label={`${eye} NV (CYL)`}
                                  type="cyl"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-orange-600">NV (AXIS)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center font-black bg-orange-50/10 border-orange-100 rounded-none text-orange-600"
                                  value={(glassPrescription.near as any)[eye].axis}
                                  onChange={val => updateGlassPrescription('near', eye as any, 'axis', val)}
                                  label={`${eye} NV (AXIS)`}
                                  type="axis"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-6 border-t border-slate-100 flex justify-end gap-4 mt-6">
                        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest italic">
                          Values from Acceptance are synced automatically if no overrides are provided.
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Editable Contact Lens Power Table (Desktop) */}
                  <Card className="clinical-card group overflow-hidden mt-6">
                    <div className="p-5 sm:p-6 bg-white border-b border-slate-100 flex items-center gap-4">
                      <div className="p-3 bg-orange-600 text-white shadow-lg"><Eye className="w-6 h-6 shrink-0" /></div>
                      <div className="flex flex-col">
                        <span className="text-[12px] font-black uppercase tracking-widest text-orange-600 mb-0.5">Clinical Optics</span>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tighter">Final Contact Lens RX</h3>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="space-y-6 pb-6 mb-6 border-b border-orange-100">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest block">Prescribed Contact Lens Type</label>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {["Soft CL", "RGP", "Scleral"].map((type) => {
                              const currentTypes = Array.isArray(contactLensPrescription.clType) ? contactLensPrescription.clType : [];
                              const isSelected = currentTypes.includes(type);
                              const isDisabled = type === "RGP" || type === "Scleral";
                              return (
                                <button key={type} type="button" disabled={isDisabled} onClick={() => {
                                  const nextTypes = isSelected ? currentTypes.filter(t => t !== type) : [...currentTypes, type];
                                  setContactLensPrescription(p => ({ ...p, clType: nextTypes }));
                                }} className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all border-2 rounded-none", isSelected ? "bg-orange-600 text-white border-orange-600 shadow-md" : "bg-white text-slate-400 border-slate-100 hover:border-orange-200 hover:text-orange-600", isDisabled && "opacity-50 cursor-not-allowed hover:border-slate-100 hover:text-slate-400")}>{type}</button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      {/* Editable Contact Lens Power Table (Desktop) */}
                      <div className="hidden md:block space-y-6">
                        <div className="overflow-hidden border border-slate-200">
                          <Table className="font-mono">
                            <TableHeader className="bg-orange-600">
                              <TableRow className="hover:bg-orange-600">
                                <TableHead className="w-[120px] text-white font-black uppercase text-[12px] tracking-widest h-14">EYE</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[12px] tracking-widest">DV (SPH)</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[12px] tracking-widest">DV (CYL)</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[12px] tracking-widest">DV (AXIS)</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[12px] tracking-widest bg-orange-600/80">NV (SPH)</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[12px] tracking-widest bg-orange-600/80 border-l border-orange-500/30">NV (CYL)</TableHead>
                                <TableHead className="text-center text-white font-black uppercase text-[12px] tracking-widest bg-orange-600/80">NV (AXIS)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {["OD", "OS"].map((eye, idx) => (
                                <TableRow key={eye} className={cn("h-20", idx === 0 ? "bg-orange-50/50" : "bg-white")}>
                                  <TableCell className="pl-6">
                                    <EyeIndicator eye={eye as "OD" | "OS"} compact />
                                  </TableCell>
                                  <TableCell>
                                    <PowerPaletteInput
                                      className="h-12 text-center text-lg font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all"
                                      value={(contactLensPrescription.distance as any)[eye].sphere}
                                      onChange={val => updateContactLensPrescription('distance', eye as any, 'sphere', val)}
                                      label={`${eye} DV (SPH)`}
                                      type="sph"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <PowerPaletteInput
                                      className="h-12 text-center text-lg font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all"
                                      value={(contactLensPrescription.distance as any)[eye].cylinder}
                                      onChange={val => updateContactLensPrescription('distance', eye as any, 'cylinder', val)}
                                      label={`${eye} DV (CYL)`}
                                      type="cyl"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <PowerPaletteInput
                                      className="h-12 text-center text-lg font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all"
                                      value={(contactLensPrescription.distance as any)[eye].axis}
                                      onChange={val => updateContactLensPrescription('distance', eye as any, 'axis', val)}
                                      label={`${eye} DV (AXIS)`}
                                      type="axis"
                                    />
                                  </TableCell>
                                  <TableCell className="bg-orange-50/20">
                                    <PowerPaletteInput
                                      className="h-12 text-center text-lg font-black bg-white rounded-none border-orange-100 focus:border-orange-600 focus:ring-0 transition-all"
                                      value={(contactLensPrescription.near as any)[eye].sphere}
                                      onChange={val => updateContactLensPrescription('near', eye as any, 'sphere', val)}
                                      placeholder="+"
                                      label={`${eye} NV (SPH)`}
                                      type="sph"
                                    />
                                  </TableCell>
                                  <TableCell className="bg-orange-50/20 border-l border-slate-200">
                                    <PowerPaletteInput
                                      className="h-12 text-center text-lg font-black bg-white rounded-none border-orange-100 focus:border-orange-600 focus:ring-0 transition-all"
                                      value={(contactLensPrescription.near as any)[eye].cylinder}
                                      onChange={val => updateContactLensPrescription('near', eye as any, 'cylinder', val)}
                                      label={`${eye} NV (CYL)`}
                                      type="cyl"
                                    />
                                  </TableCell>
                                  <TableCell className="bg-orange-50/20">
                                    <PowerPaletteInput
                                      className="h-12 text-center text-lg font-black bg-white rounded-none border-orange-100 focus:border-orange-600 focus:ring-0 transition-all"
                                      value={(contactLensPrescription.near as any)[eye].axis}
                                      onChange={val => updateContactLensPrescription('near', eye as any, 'axis', val)}
                                      label={`${eye} NV (AXIS)`}
                                      type="axis"
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* Editable Contact Lens Power List (Mobile) */}
                      <div className="md:hidden space-y-8 mt-4">
                        {["OD", "OS"].map((eye) => (
                          <div key={eye} className="space-y-4">
                            <EyeIndicator eye={eye as "OD" | "OS"} />

                            <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400">DV (SPH)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center text-sm font-black bg-white rounded-none border-slate-200"
                                  value={(contactLensPrescription.distance as any)[eye].sphere}
                                  onChange={val => updateContactLensPrescription('distance', eye as any, 'sphere', val)}
                                  label={`${eye} DV (SPH)`}
                                  type="sph"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400">DV (CYL)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center text-sm font-black bg-white rounded-none border-slate-200"
                                  value={(contactLensPrescription.distance as any)[eye].cylinder}
                                  onChange={val => updateContactLensPrescription('distance', eye as any, 'cylinder', val)}
                                  label={`${eye} DV (CYL)`}
                                  type="cyl"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400">DV (AXIS)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center text-sm font-black bg-white rounded-none border-slate-200"
                                  value={(contactLensPrescription.distance as any)[eye].axis}
                                  onChange={val => updateContactLensPrescription('distance', eye as any, 'axis', val)}
                                  label={`${eye} DV (AXIS)`}
                                  type="axis"
                                />
                              </div>
                            </div>
                            <div className="pt-2 grid grid-cols-3 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-orange-600">NV (SPH)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center font-black bg-orange-50/10 border-orange-100 rounded-none text-orange-600"
                                  value={(contactLensPrescription.near as any)[eye].sphere}
                                  onChange={val => updateContactLensPrescription('near', eye as any, 'sphere', val)}
                                  placeholder="+"
                                  label={`${eye} NV (SPH)`}
                                  type="sph"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-orange-600">NV (CYL)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center font-black bg-orange-50/10 border-orange-100 rounded-none text-orange-600"
                                  value={(contactLensPrescription.near as any)[eye].cylinder}
                                  onChange={val => updateContactLensPrescription('near', eye as any, 'cylinder', val)}
                                  label={`${eye} NV (CYL)`}
                                  type="cyl"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-orange-600">NV (AXIS)</label>
                                <PowerPaletteInput
                                  className="h-11 text-center font-black bg-orange-50/10 border-orange-100 rounded-none text-orange-600"
                                  value={(contactLensPrescription.near as any)[eye].axis}
                                  onChange={val => updateContactLensPrescription('near', eye as any, 'axis', val)}
                                  label={`${eye} NV (AXIS)`}
                                  type="axis"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                    </div>
                  </Card>
                </div>
              </fieldset>
            </TabsContent>

            {/* 6. Medical Prescription */}
            <TabsContent value="medical" className=" p-8 outline-none">
              <fieldset disabled={isLocked} className="contents">
                <div className="max-w-6xl mx-auto space-y-10 mb-12">
                  {isLocked && (
                    <div className="bg-orange-100 border-l-4 border-orange-500 p-4 mb-4 flex items-center gap-4 shadow-sm animate-pulse-slow">
                      <AlertCircle className="w-6 h-6 text-orange-600" />
                      <div>
                        <h4 className="text-sm font-black text-orange-600 uppercase">Medical Rx Locked</h4>
                        <p className="text-xs font-bold text-orange-600">Medication entry is only permitted after starting the patient consultation.</p>
                      </div>
                    </div>
                  )}
                  <Card className="clinical-card bg-white shadow-md overflow-hidden border border-slate-200">
                    <div className="p-6 sm:p-8 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <SectionHeader icon={Pill} category="Clinical Pharmacy" title="Drug Prescription Portfolio" />
                      <Button size="lg" className="h-14 gap-3 font-black bg-orange-600 hover:bg-black rounded-none px-8 tracking-widest shadow-xl uppercase w-full sm:w-auto" onClick={addMedication}>
                        <Plus className="w-5 h-5 border-2 border-white rounded-full" /> New Medication
                      </Button>
                    </div>
                    <div className="p-0">
                      {/* Desktop View (Table) */}
                      <div className="hidden md:block overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-slate-50 border-b-2 border-slate-100">
                            <TableRow className="h-16 hover:bg-transparent">
                              <TableHead className="w-16 text-center text-[12px] font-black uppercase tracking-widest text-slate-400">#</TableHead>
                              <TableHead className="min-w-[280px] text-[12px] font-black uppercase tracking-widest text-orange-600">Drug / Formula Name</TableHead>
                              <TableHead className="text-[12px] font-black uppercase tracking-widest text-orange-600">Dosage</TableHead>
                              <TableHead className="text-[12px] font-black uppercase tracking-widest text-orange-600">Route</TableHead>
                              <TableHead className="text-[12px] font-black uppercase tracking-widest text-orange-600">Frequency</TableHead>
                              <TableHead className="text-[12px] font-black uppercase tracking-widest text-orange-600">Duration</TableHead>
                              <TableHead className="text-[12px] font-black uppercase tracking-widest text-orange-600">Eye</TableHead>
                              <TableHead className="w-20"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {medications.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center py-24 text-slate-300">
                                  <div className="flex flex-col items-center gap-4">
                                    <Pill className="w-12 h-12 opacity-10" />
                                    <p className="font-bold uppercase tracking-[0.3em] text-xs">No active prescriptions for this visit</p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : medications.map((med, index) => (
                              <TableRow key={med.id} className="group hover:bg-orange-50/50 transition-colors">
                                <TableCell className="text-center font-black text-slate-300 py-4 align-top">{index + 1}</TableCell>
                                <TableCell className="py-4 align-top">
                                  <Input className="h-12 text-sm font-black border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none bg-white focus:bg-yellow-50/30 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all" value={med.drug} onChange={e => updateMedication(med.id, "drug", e.target.value)} placeholder="e.g. Moxifloxacin Eye Drops" />
                                  <div className="flex flex-wrap gap-1 max-h-0 opacity-0 overflow-hidden group-hover:max-h-20 group-hover:opacity-100 group-hover:mt-1.5 focus-within:max-h-20 focus-within:opacity-100 focus-within:mt-1.5 transition-all duration-200 ease-out max-w-[280px]">
                                    {[
                                      { label: "Moxifloxacin", value: "Moxifloxacin Eye Drops" },
                                      { label: "CMC 0.5%", value: "Carboxymethylcellulose 0.5%" },
                                      { label: "Prednisolone", value: "Prednisolone Acetate 1%" },
                                      { label: "Homatropine", value: "Homatropine Eye Drops" },
                                      { label: "Diamox", value: "Tab. Acetazolamide 250mg" },
                                    ].map(p => (
                                      <button
                                        key={p.label}
                                        type="button"
                                        onClick={() => updateMedication(med.id, "drug", p.value)}
                                        className="text-[9px] font-bold text-orange-600 hover:text-white bg-orange-50/60 hover:bg-orange-600 border border-orange-200/50 px-1.5 py-0.5 transition-all cursor-pointer"
                                      >
                                        {p.label}
                                      </button>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 align-top">
                                  <Input className="h-12 text-sm font-bold border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none bg-white focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={med.dosage} onChange={e => updateMedication(med.id, "dosage", e.target.value)} placeholder="1 Drop" />
                                  <div className="flex flex-wrap gap-1 max-h-0 opacity-0 overflow-hidden group-hover:max-h-20 group-hover:opacity-100 group-hover:mt-1.5 focus-within:max-h-20 focus-within:opacity-100 focus-within:mt-1.5 transition-all duration-200 ease-out max-w-[120px]">
                                    {["1 Drop", "2 Drops", "1 Tab", "1 Cap"].map(p => (
                                      <button
                                        key={p}
                                        type="button"
                                        onClick={() => updateMedication(med.id, "dosage", p)}
                                        className="text-[9px] font-bold text-orange-600 hover:text-white bg-orange-50/60 hover:bg-orange-600 border border-orange-200/50 px-1.5 py-0.5 transition-all cursor-pointer"
                                      >
                                        {p}
                                      </button>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 align-top">
                                  <div className="flex items-center gap-1.5 min-w-[140px]">
                                    <button
                                      type="button"
                                      onClick={() => updateMedication(med.id, "route", "Topical")}
                                      className={cn(
                                        "px-3 py-2 text-[9px] font-black uppercase tracking-wider transition-all border-2 rounded-none leading-none grow text-center h-12 flex items-center justify-center",
                                        med.route === "Topical"
                                          ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                                          : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-600"
                                      )}
                                    >
                                      Topical
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateMedication(med.id, "route", "Oral")}
                                      className={cn(
                                        "px-3 py-2 text-[9px] font-black uppercase tracking-wider transition-all border-2 rounded-none leading-none grow text-center h-12 flex items-center justify-center",
                                        med.route === "Oral"
                                          ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                                          : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-600"
                                      )}
                                    >
                                      Oral
                                    </button>
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 align-top">
                                  <Input className="h-12 text-sm font-bold border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none bg-white focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={med.frequency} onChange={e => updateMedication(med.id, "frequency", e.target.value)} placeholder="QID (4 times)" />
                                  <div className="flex flex-wrap gap-1 max-h-0 opacity-0 overflow-hidden group-hover:max-h-20 group-hover:opacity-100 group-hover:mt-1.5 focus-within:max-h-20 focus-within:opacity-100 focus-within:mt-1.5 transition-all duration-200 ease-out max-w-[140px]">
                                    {[
                                      { label: "QID", value: "QID (4 times)" },
                                      { label: "TID", value: "TID (3 times)" },
                                      { label: "BD", value: "BD (2 times)" },
                                      { label: "OD", value: "OD (Once daily)" },
                                      { label: "2hrly", value: "Every 2 Hours" },
                                    ].map(p => (
                                      <button
                                        key={p.label}
                                        type="button"
                                        onClick={() => updateMedication(med.id, "frequency", p.value)}
                                        className="text-[9px] font-bold text-orange-600 hover:text-white bg-orange-50/60 hover:bg-orange-600 border border-orange-200/50 px-1.5 py-0.5 transition-all cursor-pointer"
                                      >
                                        {p.label}
                                      </button>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 align-top">
                                  <Input className="h-12 text-sm font-bold border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none bg-white font-mono focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={med.duration} onChange={e => updateMedication(med.id, "duration", e.target.value)} placeholder="5 Days" />
                                  <div className="flex flex-wrap gap-1 max-h-0 opacity-0 overflow-hidden group-hover:max-h-20 group-hover:opacity-100 group-hover:mt-1.5 focus-within:max-h-20 focus-within:opacity-100 focus-within:mt-1.5 transition-all duration-200 ease-out max-w-[120px]">
                                    {["5 Days", "7 Days", "10 Days", "15 Days", "1 Mo"].map(p => (
                                      <button
                                        key={p}
                                        type="button"
                                        onClick={() => updateMedication(med.id, "duration", p)}
                                        className="text-[9px] font-bold text-orange-600 hover:text-white bg-orange-50/60 hover:bg-orange-600 border border-orange-200/50 px-1.5 py-0.5 transition-all cursor-pointer"
                                      >
                                        {p}
                                      </button>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 align-top">
                                  <div className="flex items-center gap-1.5 min-w-[140px]">
                                    {[
                                      { label: "RE", value: "Right", title: "Right Eye (OD)" },
                                      { label: "LE", value: "Left", title: "Left Eye (OS)" },
                                      { label: "BE", value: "Both", title: "Both Eyes (OU)" },
                                    ].map(p => (
                                      <button
                                        key={p.value}
                                        type="button"
                                        title={p.title}
                                        onClick={() => updateMedication(med.id, "eye", p.value)}
                                        className={cn(
                                          "px-2 py-2 text-[10px] font-black uppercase tracking-wider transition-all border-2 rounded-none leading-none grow text-center h-12 flex items-center justify-center",
                                          med.eye === p.value
                                            ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                                            : "bg-white text-slate-500 border-slate-200 hover:border-orange-400 hover:text-orange-600"
                                        )}
                                      >
                                        {p.label}
                                      </button>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon" className="h-12 w-12 text-slate-300 hover:text-red-600 hover:bg-orange-50 transition-all" onClick={() => removeMedication(med.id)}>
                                    <Trash2 className="w-5 h-5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile View (Card List) */}
                      <div className="md:hidden divide-y divide-slate-100">
                        {medications.length === 0 ? (
                          <div className="text-center py-16 text-slate-300 px-6">
                            <Pill className="w-12 h-12 opacity-10 mx-auto mb-4" />
                            <p className="font-bold uppercase tracking-[0.2em] text-[12px]">No active prescriptions</p>
                          </div>
                        ) : medications.map((med, index) => (
                          <div key={med.id} className="p-4 space-y-4 bg-white relative">
                            <div className="flex items-center justify-between">
                              <span className="text-[12px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-0.5">DRUG #{index + 1}</span>
                              <Button variant="ghost" size="sm" className="h-8 w-8 text-slate-300 hover:text-red-600 p-0" onClick={() => removeMedication(med.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="space-y-3">
                              <div className="group/mobilefield">
                                <Input className="h-12 text-sm font-black border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none bg-slate-50/30" value={med.drug} onChange={e => updateMedication(med.id, "drug", e.target.value)} placeholder="Drug Name" />
                                <div className="flex flex-wrap gap-1 max-h-0 opacity-0 overflow-hidden focus-within:max-h-20 focus-within:opacity-100 focus-within:mt-1.5 transition-all duration-200 ease-out">
                                  {[
                                    { label: "Moxifloxacin", value: "Moxifloxacin Eye Drops" },
                                    { label: "CMC 0.5%", value: "Carboxymethylcellulose 0.5%" },
                                    { label: "Prednisolone", value: "Prednisolone Acetate 1%" },
                                    { label: "Homatropine", value: "Homatropine Eye Drops" },
                                    { label: "Diamox", value: "Tab. Acetazolamide 250mg" },
                                  ].map(p => (
                                    <button
                                      key={p.label}
                                      type="button"
                                      onClick={() => updateMedication(med.id, "drug", p.value)}
                                      className="text-[8px] font-bold text-orange-600 hover:text-white bg-orange-50 hover:bg-orange-600 border border-orange-200/50 px-1.5 py-0.5 transition-all cursor-pointer"
                                    >
                                      {p.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black uppercase text-slate-400">Dosage</label>
                                  <Input className="h-10 text-xs font-bold rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={med.dosage} onChange={e => updateMedication(med.id, "dosage", e.target.value)} placeholder="Dosage" />
                                  <div className="flex flex-wrap gap-1 max-h-0 opacity-0 overflow-hidden focus-within:max-h-16 focus-within:opacity-100 focus-within:mt-1 transition-all duration-200 ease-out">
                                    {["1 Drop", "2 Drops", "1 Tab", "1 Cap"].map(p => (
                                      <button
                                        key={p}
                                        type="button"
                                        onClick={() => updateMedication(med.id, "dosage", p)}
                                        className="text-[8px] font-bold text-orange-600 hover:text-white bg-orange-50 hover:bg-orange-600 border border-orange-200/50 px-1 py-0.5 transition-all cursor-pointer"
                                      >
                                        {p}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black uppercase text-slate-400">Duration</label>
                                  <Input className="h-10 text-xs font-bold rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={med.duration} onChange={e => updateMedication(med.id, "duration", e.target.value)} placeholder="Duration" />
                                  <div className="flex flex-wrap gap-1 max-h-0 opacity-0 overflow-hidden focus-within:max-h-16 focus-within:opacity-100 focus-within:mt-1 transition-all duration-200 ease-out">
                                    {["5 Days", "7 Days", "10 Days", "15 Days", "1 Mo"].map(p => (
                                      <button
                                        key={p}
                                        type="button"
                                        onClick={() => updateMedication(med.id, "duration", p)}
                                        className="text-[8px] font-bold text-orange-600 hover:text-white bg-orange-50 hover:bg-orange-600 border border-orange-200/50 px-1 py-0.5 transition-all cursor-pointer"
                                      >
                                        {p}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black uppercase text-slate-400">Frequency</label>
                                  <Input className="h-10 text-xs font-bold rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={med.frequency} onChange={e => updateMedication(med.id, "frequency", e.target.value)} placeholder="Frequency" />
                                  <div className="flex flex-wrap gap-1 max-h-0 opacity-0 overflow-hidden focus-within:max-h-20 focus-within:opacity-100 focus-within:mt-1 transition-all duration-200 ease-out">
                                    {[
                                      { label: "QID", value: "QID (4 times)" },
                                      { label: "TID", value: "TID (3 times)" },
                                      { label: "BD", value: "BD (2 times)" },
                                      { label: "OD", value: "OD (Once daily)" },
                                      { label: "2hrly", value: "Every 2 Hours" },
                                    ].map(p => (
                                      <button
                                        key={p.label}
                                        type="button"
                                        onClick={() => updateMedication(med.id, "frequency", p.value)}
                                        className="text-[8px] font-bold text-orange-600 hover:text-white bg-orange-50 hover:bg-orange-600 border border-orange-200/50 px-1.5 py-0.5 transition-all cursor-pointer"
                                      >
                                        {p.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-black uppercase text-slate-400">Eye</label>
                                  <div className="flex items-center gap-1.5">
                                    {[
                                      { label: "RE", value: "Right" },
                                      { label: "LE", value: "Left" },
                                      { label: "BE", value: "Both" },
                                    ].map(p => (
                                      <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => updateMedication(med.id, "eye", p.value)}
                                        className={cn(
                                          "px-2 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all border-2 rounded-none leading-none grow text-center h-10 flex items-center justify-center",
                                          med.eye === p.value
                                            ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                                            : "bg-white text-slate-500 border-slate-200 hover:border-orange-400"
                                        )}
                                      >
                                        {p.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-1.5 pt-1">
                                <label className="text-[10px] font-black uppercase text-slate-400">Route</label>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => updateMedication(med.id, "route", "Topical")}
                                    className={cn(
                                      "px-3 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all border-2 rounded-none leading-none grow text-center h-10 flex items-center justify-center",
                                      med.route === "Topical"
                                        ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                                        : "bg-white text-slate-500 border-slate-200 hover:border-orange-400"
                                    )}
                                  >
                                    Topical
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateMedication(med.id, "route", "Oral")}
                                    className={cn(
                                      "px-3 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all border-2 rounded-none leading-none grow text-center h-10 flex items-center justify-center",
                                      med.route === "Oral"
                                        ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                                        : "bg-white text-slate-500 border-slate-200 hover:border-orange-400"
                                    )}
                                  >
                                    Oral
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-10 bg-orange-600/5 border-t-2 border-slate-100">
                        <label className="text-xs font-black uppercase tracking-widest text-orange-600 mb-4 block">Special Administration Instructions</label>
                        <Textarea
                          placeholder="Instructions for patient counseling or pharmacist (e.g. Shake well, Avoid light...)"
                          className="min-h-[120px] text-lg font-medium border-slate-200 rounded-none bg-white p-6 shadow-inner leading-relaxed"
                          value={investigation.adminInstructions}
                          onChange={e => updateInvestigation(['adminInstructions'], e.target.value)}
                        />
                      </div>
                    </div>
                  </Card>
                </div>
              </fieldset>
            </TabsContent>

            {/* 7. Case Record (History) */}
            <TabsContent value="history" className=" p-8 outline-none">
              <div className="max-w-5xl mx-auto space-y-12 mb-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-lg sm:text-2xl font-black text-orange-600 uppercase tracking-tighter flex items-center gap-3">
                      <History className="w-6 h-6 sm:w-8 sm:h-8 opacity-40 shrink-0" /> Patient Longitudinal Profile
                    </h3>
                    <p className="text-xs sm:text-sm font-bold text-slate-400 pl-9 sm:pl-11">Total Clinical Footprint: {visitHistory.length} Comprehensive Visits</p>
                  </div>
                </div>

                {isLoadingHistory ? (
                  <div className="space-y-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-none border border-slate-200" />)}
                  </div>
                ) : visitHistory.length === 0 ? (
                  <div className="bg-white p-24 rounded-none border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center">
                    <FileText className="w-16 h-16 text-slate-200 mb-6" />
                    <h4 className="font-black text-2xl text-slate-400 uppercase tracking-tighter mb-2">Primary Admission</h4>
                    <p className="text-sm font-medium text-slate-400 max-w-xs">No historical records synchronized for this MR Number. This visit constitutes the patient's inaugural record.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {visitHistory.map((visit) => (
                      <div
                        key={visit.id}
                        className="group relative clinical-card !shadow-sm hover:shadow-xl hover:border-orange-600/20 border border-slate-100 transition-all cursor-pointer overflow-hidden"
                        onClick={() => {
                          setSelectedHistoricalVisit(visit);
                          setIsHistoryDetailsOpen(true);
                        }}
                      >
                        <div className="flex items-stretch min-h-[140px]">
                          <div className="w-1.5 sm:w-3 bg-slate-200 group-hover:bg-orange-600 transition-colors shrink-0" />
                          <div className="flex-1 p-5 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
                              <div className="flex flex-col min-w-0">
                                <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-1">Diagnostic Date</span>
                                <span className="text-xl sm:text-2xl font-black text-orange-600 tracking-tighter uppercase whitespace-nowrap">
                                  {new Date(visit.visitedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge className="h-5 rounded-none bg-orange-50 text-orange-600 border-orange-200 font-black text-[10px] uppercase tracking-widest shrink-0">{visit.status}</Badge>
                                  <span className="text-[12px] font-mono text-slate-400 truncate md:hidden">ID: {(visit.id || "").substring(0, 8)}</span>
                                </div>
                              </div>

                              <Separator orientation="vertical" className="h-16 hidden md:block" />

                              <div className="hidden lg:flex flex-col gap-1">
                                <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Medical Unit ID</span>
                                <span className="text-xs font-mono font-bold text-slate-600 tracking-wider">REF-{(visit.id || "VISIT").substring(0, 12).toUpperCase()}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-12 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100 sm:border-slate-0 w-full sm:w-auto">
                              <div className="text-left sm:text-right flex flex-col sm:items-end">
                                <p className="text-[12px] uppercase font-black text-slate-400 tracking-[0.2em] mb-1">Lead Consultant</p>
                                <div className="flex items-center gap-2">
                                  <Stethoscope className="w-4 h-4 text-orange-500 sm:hidden" />
                                  <p className="text-base sm:text-lg font-black text-slate-800 tracking-tight whitespace-nowrap">{visit.consultingDoctorName || visit.consultation?.doctorName || "Dr. Clinical Lead"}</p>
                                </div>
                              </div>
                              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-none border-2 border-slate-100 flex items-center justify-center group-hover:bg-orange-600 group-hover:border-orange-600 transition-all shrink-0">
                                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>


          </div>
        </Tabs>
      </div>

      <Dialog open={isHistoryDetailsOpen} onOpenChange={(open) => {
        setIsHistoryDetailsOpen(open);
        if (!open) setSelectedHistoricalVisit(null);
      }}>
        <DialogContent className="max-w-[95vw] w-[1200px] h-[85vh] p-0 overflow-hidden bg-slate-50 flex flex-col rounded-xl border border-slate-200 shadow-2xl">
          {selectedHistoricalVisit && (() => {
            const structureLabels: Record<string, string> = {
              lids: "Lids",
              conjunctiva: "Conjunctiva",
              sclera: "Sclera",
              cornea: "Cornea",
              ac: "Anterior Chamber",
              iris: "Iris",
              pupil: "Pupil",
              lens: "Lens",
              tonometry: "Tonometry",
              gonioscopy: "Gonioscopy",
              synaptophore: "Synaptophore",
            };
            const fundusLabels: Record<string, string> = {
              vitreous: "Vitreous",
              retina: "Retina & Macula",
              disc: "Optic Disc"
            };
            const patientName = selectedHistoricalVisit.patient?.name || patient?.name || "UNNAMED PATIENT";
            const patientMRN = selectedHistoricalVisit.patient?.mrNumber || selectedHistoricalVisit.mrNumber || patient?.mrNumber || "0000";
            const patientGender = selectedHistoricalVisit.patient?.gender || patient?.gender || "—";
            const patientAge = selectedHistoricalVisit.patient
              ? getPatientAgeString(selectedHistoricalVisit.patient)
              : patient
                ? getPatientAgeString(patient)
                : "—";



            return (
              <>
                <DialogHeader className="bg-white border-b border-slate-200 p-5 sm:p-6 shrink-0 print:hidden">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    {/* Branding Group */}
                    <div className="flex flex-col gap-0.5 leading-none shrink-0">
                      <span
                        style={{ fontFamily: "'Outfit', sans-serif" }}
                        className="font-extrabold text-xl tracking-tight leading-none"
                      >
                        <span style={{ color: "#0F172A" }}>Vision</span>
                        <span style={{ color: "#2563EB" }}>Pulze</span>
                      </span>
                      <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400 mt-0.5">
                        Ophthalmic Ecosystem
                      </span>
                    </div>

                    {/* Metadata Group */}
                    <div className="flex flex-row items-center gap-6">
                      <div className="text-right">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Consulting Lead</span>
                        <span className="text-sm font-black text-slate-800 uppercase">
                          {selectedHistoricalVisit.consultation?.doctorName || selectedHistoricalVisit.consultingDoctorName || "Dr. Clinical Lead"}
                        </span>
                      </div>
                      <div className="h-8 w-px bg-slate-200" />
                      <div className="text-right">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Visit Date</span>
                        <span className="text-sm font-black text-orange-600 uppercase">
                          {new Date(selectedHistoricalVisit.visitedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="h-8 w-px bg-slate-200 no-print" />
                      <Button
                        onClick={() => window.print()}
                        className="no-print bg-orange-600 hover:bg-orange-700 text-white rounded-none font-bold uppercase text-xs tracking-wider flex items-center gap-2 h-9"
                      >
                        <Printer className="w-4 h-4" />
                        Print Report
                      </Button>
                    </div>
                  </div>

                  {/* Patient Info Bar */}
                  <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-x-8 gap-y-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Patient Name</span>
                        <span className="text-xs font-black text-slate-800 uppercase">{patientName}</span>
                      </div>
                    </div>
                    <div className="h-8 w-px bg-slate-200" />
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Age / Gender</span>
                      <span className="text-xs font-bold text-slate-700 uppercase">{patientAge} / {patientGender}</span>
                    </div>
                    <div className="h-8 w-px bg-slate-200" />
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">MR Number</span>
                      <Badge className="bg-orange-50 text-orange-600 border border-orange-100 text-[10px] font-mono px-2.5 py-0.5 rounded-none font-black">MR-{patientMRN}</Badge>
                    </div>
                    {(selectedHistoricalVisit.patient?.contactNumber || patient?.contactNumber) && (
                      <>
                        <div className="h-8 w-px bg-slate-200" />
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Contact Number</span>
                          <span className="text-xs font-bold text-slate-700">{selectedHistoricalVisit.patient?.contactNumber || patient?.contactNumber}</span>
                        </div>
                      </>
                    )}
                  </div>
                </DialogHeader>

                <ScrollArea className="flex-1 overflow-y-auto w-full bg-white p-0 print:hidden">
                  <div className="w-full max-w-none bg-white p-6 sm:p-10 space-y-6 rounded-none">
                    {/* 1. Optometry Evaluation */}
                    <Card className="border border-slate-300 rounded-none bg-white overflow-hidden shadow-none">
                      <div className="p-4 border-b border-slate-300 bg-slate-50 flex items-center gap-3">
                        <div className="p-1.5 bg-orange-100 text-orange-600 rounded"><Eye className="w-4 h-4" /></div>
                        <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Optometry Evaluation</h4>
                      </div>
                      <div className="p-6">
                        {selectedHistoricalVisit.refraction ? (
                          <RefractionSummaryView data={selectedHistoricalVisit.refraction} patient={selectedHistoricalVisit} />
                        ) : (
                          <div className="text-center py-6 text-sm text-slate-400 italic font-medium">No refraction data documented.</div>
                        )}
                      </div>
                    </Card>

                    {/* 2. Doctor Consultation Details */}
                    {selectedHistoricalVisit.consultation ? (
                      <>

                          {/* Clinical Investigation Findings */}
                          <Card className="border border-slate-300 rounded-none bg-white overflow-hidden shadow-none">
                            <div className="p-4 border-b border-slate-300 bg-slate-50 flex items-center gap-3">
                              <div className="p-1.5 bg-orange-100 text-orange-600 rounded"><Microscope className="w-4 h-4" /></div>
                              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Ocular Examination Findings</h4>
                            </div>
                            <div className="p-6 space-y-6">
                              {/* Slit Lamp Profile */}
                              {(() => {
                                try {
                                  const raw = selectedHistoricalVisit.consultation?.anteriorSegment;
                                  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                                  if (!parsed) return null;

                                  const slitLamp = parsed.slitLamp || parsed;
                                  const eom = parsed.eom;

                                  // Filter to only keys that have findings
                                  const activeKeys = Object.keys(slitLamp).filter(key => key !== 'dilation' && (slitLamp[key]?.OD || slitLamp[key]?.OS));

                                  return (
                                    <div className="space-y-4">
                                      <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest block border-b border-slate-200 pb-1">Anterior Segment (Slit Lamp)</span>

                                      {activeKeys.length > 0 ? (
                                        <div className="border border-slate-300 overflow-hidden rounded-none">
                                          <div className="grid grid-cols-3 pb-2 border-b border-slate-300 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-600 p-3">
                                            <span>Structure</span>
                                            <span>Right Eye (OD)</span>
                                            <span>Left Eye (OS)</span>
                                          </div>
                                          <div className="divide-y divide-slate-300">
                                            {activeKeys.map((key) => (
                                              <div key={key} className="grid grid-cols-3 py-3 text-xs divide-x divide-slate-200 p-3 hover:bg-slate-50/50">
                                                <span className="font-bold text-slate-500 uppercase tracking-tight pr-2">{structureLabels[key] || key}</span>
                                                <span className="text-slate-800 font-semibold px-3 whitespace-pre-wrap">{slitLamp[key]?.OD || "—"}</span>
                                                <span className="text-slate-800 font-semibold px-3 whitespace-pre-wrap">{slitLamp[key]?.OS || "—"}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-xs font-bold text-slate-400 italic py-2">No anterior segment defects noted.</p>
                                      )}

                                      {/* Dilation response */}
                                      {slitLamp.dilation && (
                                        <div className="p-3 bg-white border border-slate-300 rounded-none flex flex-row items-center justify-between text-xs">
                                          <span className="font-bold text-orange-600 uppercase tracking-wider">Pupillary Dilation</span>
                                          <span className="font-black text-slate-700">
                                            {typeof slitLamp.dilation === 'string' ? slitLamp.dilation : (
                                              `OD: ${slitLamp.dilation?.OD || "—"}  |  OS: ${slitLamp.dilation?.OS || "—"}`
                                            )}
                                          </span>
                                        </div>
                                      )}

                                      {/* EOM */}
                                      {eom && (eom.OD || eom.OS) && (
                                        <div className="p-3 bg-white border border-slate-300 rounded-none flex flex-row items-center justify-between text-xs">
                                          <span className="font-bold text-slate-500 uppercase tracking-wider">Extra Ocular Movements</span>
                                          <span className="font-black text-slate-700">
                                            OD: {eom.OD || "—"}  |  OS: {eom.OS || "—"}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                } catch (e) { return null; }
                              })()}

                              {/* Fundus Observation */}
                              {(() => {
                                try {
                                  const raw = selectedHistoricalVisit.consultation?.fundusObservation;
                                  const fundus = typeof raw === 'string' ? JSON.parse(raw) : raw;
                                  if (!fundus) return null;

                                  const activeKeys = Object.keys(fundus).filter(key => fundus[key]?.OD || fundus[key]?.OS);

                                  return (
                                    <div className="space-y-4 pt-4 border-t border-slate-300">
                                      <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest block border-b border-slate-200 pb-1">Posterior Segment (Fundus)</span>

                                      {activeKeys.length > 0 ? (
                                        <div className="border border-slate-300 overflow-hidden rounded-none">
                                          <div className="grid grid-cols-3 pb-2 border-b border-slate-300 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-600 p-3">
                                            <span>Structure</span>
                                            <span>Right Eye (OD)</span>
                                            <span>Left Eye (OS)</span>
                                          </div>
                                          <div className="divide-y divide-slate-300">
                                            {activeKeys.map((key) => (
                                              <div key={key} className="grid grid-cols-3 py-3 text-xs divide-x divide-slate-200 p-3 hover:bg-slate-50/50">
                                                <span className="font-bold text-slate-500 uppercase tracking-tight pr-2">{fundusLabels[key] || key}</span>
                                                <span className="text-slate-800 font-semibold px-3 whitespace-pre-wrap">{fundus[key]?.OD || "—"}</span>
                                                <span className="text-slate-800 font-semibold px-3 whitespace-pre-wrap">{fundus[key]?.OS || "—"}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-xs font-bold text-slate-400 italic py-2">No fundus anomalies observed.</p>
                                      )}
                                    </div>
                                  );
                                } catch (e) { return null; }
                              })()}
                            </div>
                          </Card>

                          {/* Clinical Diagnosis Card */}
                          <Card className="border border-slate-300 rounded-none bg-white overflow-hidden shadow-none">
                            <div className="p-4 border-b border-slate-300 bg-slate-50 flex items-center gap-3">
                              <div className="p-1.5 bg-orange-100 text-orange-600 rounded"><Activity className="w-4 h-4" /></div>
                              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Clinical Diagnosis</h4>
                            </div>
                            <div className="p-6">
                              {(() => {
                                const parts = selectedHistoricalVisit.consultation?.diagnosisText?.split(' | ') || [];
                                const od = parts[0]?.replace('OD: ', '') || "—";
                                const os = parts.length > 1 ? parts[1].replace('OS: ', '') : "—";
                                return (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-4 bg-white border border-slate-300 rounded-none">
                                      <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest block mb-1">Right Eye (OD)</span>
                                      <p className="text-sm font-black text-slate-800 uppercase leading-snug">{od}</p>
                                    </div>
                                    <div className="p-4 bg-white border border-slate-300 rounded-none">
                                      <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest block mb-1">Left Eye (OS)</span>
                                      <p className="text-sm font-black text-slate-800 uppercase leading-snug">{os}</p>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </Card>

                          {/* Medical Prescriptions Card */}
                          <Card className="border border-slate-300 rounded-none bg-white overflow-hidden shadow-none">
                            <div className="p-4 border-b border-slate-300 bg-slate-50 flex items-center gap-3">
                              <div className="p-1.5 bg-orange-100 text-orange-600 rounded"><Pill className="w-4 h-4" /></div>
                              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Medical Prescription</h4>
                            </div>
                            <div className="p-0 bg-white">
                              {(() => {
                                const rawMeds = selectedHistoricalVisit.consultation?.medicalPrescription || (selectedHistoricalVisit.consultation as any)?.medications;
                                const meds = typeof rawMeds === 'string' ? JSON.parse(rawMeds) : rawMeds;
                                if (meds && Array.isArray(meds) && meds.length > 0) {
                                  return (
                                    <div className="overflow-x-auto border-t border-slate-300">
                                      <Table className="w-full border-collapse">
                                        <TableHeader className="bg-slate-50 border-b border-slate-300">
                                          <TableRow className="hover:bg-transparent">
                                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-600 pl-4 py-3 border-r border-slate-200">Medicine</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-600 py-3 border-r border-slate-200">Dose / Route</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-600 py-3 border-r border-slate-200">Frequency</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-600 py-3 border-r border-slate-200">Duration</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-600 pr-4 py-3 text-right">Eye</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {meds.map((m: any, idx: number) => (
                                            <TableRow key={idx} className="hover:bg-slate-50/30 border-b border-slate-200 last:border-0">
                                              <TableCell className="pl-4 py-3 border-r border-slate-200">
                                                <span className="text-xs font-black text-slate-800 uppercase block">{m.drug || m.name || "—"}</span>
                                              </TableCell>
                                              <TableCell className="py-3 border-r border-slate-200">
                                                <span className="text-xs text-slate-600 font-bold block">{m.dosage || m.dose || "—"}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{m.route || "Topical"}</span>
                                              </TableCell>
                                              <TableCell className="py-3 text-xs font-medium text-slate-600 border-r border-slate-200">{m.frequency || "—"}</TableCell>
                                              <TableCell className="py-3 text-xs font-medium text-slate-600 border-r border-slate-200">{m.duration || "—"}</TableCell>
                                              <TableCell className="pr-4 py-3 text-right">
                                                <Badge className="bg-orange-50 text-orange-600 border border-orange-100/50 text-[9px] rounded-none px-2 font-black uppercase">
                                                  {m.eye || "Both"}
                                                </Badge>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  );
                                }
                                return <p className="text-xs font-bold text-slate-400 italic text-center py-8 uppercase tracking-widest border-t border-slate-300">No medications prescribed</p>;
                              })()}
                            </div>
                          </Card>

                          {/* Glass Prescription Card */}
                          <Card className="border border-slate-300 rounded-none bg-white overflow-hidden shadow-none">
                            <div className="p-4 border-b border-slate-300 bg-slate-50 flex items-center gap-3">
                              <div className="p-1.5 bg-orange-100 text-orange-600 rounded"><Glasses className="w-4 h-4" /></div>
                              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Glass RX</h4>
                            </div>
                            <div className="p-6 bg-white">
                              {(() => {
                                const rawGlass = selectedHistoricalVisit.consultation?.finalGlassPrescription;
                                const glassRx = typeof rawGlass === 'string' ? JSON.parse(rawGlass) : rawGlass;
                                if (glassRx) {
                                  return (
                                    <div className="space-y-6">
                                      {['distance', 'near'].map((part) => {
                                        const hasData = ['OD', 'OS'].some(eye => glassRx[part]?.[eye]?.sphere || glassRx[part]?.[eye]?.cylinder || glassRx[part]?.[eye]?.axis);
                                        if (!hasData) return null;
                                        return (
                                          <div key={part} className="space-y-2">
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">{part === 'distance' ? 'Distance Vision (DV)' : 'Near Vision (NV)'}</span>
                                            <div className="border border-slate-300 overflow-hidden rounded-none">
                                              <Table className="w-full border-collapse">
                                                <TableHeader className="bg-slate-50 border-b border-slate-300">
                                                  <TableRow className="hover:bg-transparent">
                                                    <TableHead className="text-[10px] font-black uppercase text-slate-600 py-2.5 text-center border-r border-slate-200">EYE</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase text-slate-600 py-2.5 text-center border-r border-slate-200">SPH</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase text-slate-600 py-2.5 text-center border-r border-slate-200">CYL</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase text-slate-600 py-2.5 text-center">AXIS</TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {['OD', 'OS'].map((eye) => (
                                                    <TableRow key={eye} className="border-b border-slate-200 last:border-0 hover:bg-slate-50/50">
                                                      <TableCell className="text-center text-xs font-black border-r border-slate-200">{eye}</TableCell>
                                                      <TableCell className="text-center text-xs font-semibold border-r border-slate-200">{glassRx[part]?.[eye]?.sphere || "0.00"}</TableCell>
                                                      <TableCell className="text-center text-xs font-semibold border-r border-slate-200">{glassRx[part]?.[eye]?.cylinder || "0.00"}</TableCell>
                                                      <TableCell className="text-center text-xs font-semibold">{glassRx[part]?.[eye]?.axis || "0"}°</TableCell>
                                                    </TableRow>
                                                  ))}
                                                </TableBody>
                                              </Table>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                }
                                return <p className="text-xs font-bold text-slate-400 italic text-center py-6 uppercase tracking-widest">No glass RX documented</p>;
                              })()}
                            </div>
                          </Card>

                          {/* Remarks & Clinical Instructions Card */}
                          <Card className="border border-slate-300 rounded-none bg-white overflow-hidden shadow-none">
                            <div className="p-4 border-b border-slate-300 bg-slate-50 flex items-center gap-3">
                              <div className="p-1.5 bg-orange-100 text-orange-600 rounded"><FileText className="w-4 h-4" /></div>
                              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Clinical Remarks & Directions</h4>
                            </div>
                            <div className="p-6 space-y-6">
                              <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Doctor's Clinical Notes</span>
                                <p className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50 p-4 border-l-4 border-slate-400 rounded-none">
                                  {selectedHistoricalVisit.consultation?.notes || "No clinical remarks documented."}
                                </p>
                              </div>
                              {(() => {
                                try {
                                  const raw = selectedHistoricalVisit.consultation?.posteriorSegment;
                                  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                                  if (!parsed) return null;
                                  const hasInvestigations = parsed.required && parsed.required !== "Nothing selected";
                                  const hasAdmin = parsed.adminInstructions && parsed.adminInstructions !== "Standard administration";
                                  if (!hasInvestigations && !hasAdmin) return null;
                                  return (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-300">
                                      {hasInvestigations && (
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Required Investigations</span>
                                          <p className="text-xs font-bold text-slate-700 bg-slate-50 p-2 border border-slate-300 rounded-none">
                                            {typeof parsed.required === 'object' ? (Array.isArray(parsed.required) ? parsed.required.join(", ") : "—") : parsed.required}
                                          </p>
                                          {parsed.other && <p className="text-[11px] text-slate-500 font-medium italic">Specs: {parsed.other}</p>}
                                        </div>
                                      )}
                                      {hasAdmin && (
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Admin Instructions</span>
                                          <p className="text-xs font-bold text-slate-700 bg-slate-50 p-2 border border-slate-300 rounded-none">{parsed.adminInstructions}</p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                } catch { return null; }
                              })()}
                            </div>
                          </Card>
                      </>
                    ) : (
                      <div className="p-8 bg-white border border-slate-300 rounded-none text-center opacity-60 italic font-bold text-slate-400">
                        No doctor's consultation data available for this visit.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </>
            );
          })()}
          {selectedHistoricalVisit && (() => {
        const structureLabels: Record<string, string> = {
          lids: "Lids",
          conjunctiva: "Conjunctiva",
          sclera: "Sclera",
          cornea: "Cornea",
          ac: "Anterior Chamber",
          iris: "Iris",
          pupil: "Pupil",
          lens: "Lens",
          tonometry: "Tonometry",
          gonioscopy: "Gonioscopy",
          synaptophore: "Synaptophore",
        };
        const fundusLabels: Record<string, string> = {
          vitreous: "Vitreous",
          retina: "Retina & Macula",
          disc: "Optic Disc"
        };
        const patientName = selectedHistoricalVisit.patient?.name || patient?.name || "UNNAMED PATIENT";
        const patientMRN = selectedHistoricalVisit.patient?.mrNumber || selectedHistoricalVisit.mrNumber || patient?.mrNumber || "0000";
        const patientGender = selectedHistoricalVisit.patient?.gender || patient?.gender || "—";
        const patientAge = selectedHistoricalVisit.patient
          ? getPatientAgeString(selectedHistoricalVisit.patient)
          : patient
            ? getPatientAgeString(patient)
            : "—";

        return (
          <div id="print-section" className="hidden print:block w-full bg-white text-black text-[9px] font-sans p-4 space-y-4 leading-tight">
                  {/* Hospital Header */}
                  <div className="border-b-2 border-black pb-1.5 flex justify-between items-start">
                    <div className="flex flex-col gap-0.5 leading-none">
                      <span
                        style={{ fontFamily: "'Outfit', sans-serif" }}
                        className="font-extrabold text-xs tracking-tight leading-none"
                      >
                        <span style={{ color: "#0F172A" }}>Vision</span>
                        <span style={{ color: "#2563EB" }}>Pulze</span>
                      </span>
                      <span className="text-[7px] font-semibold uppercase tracking-[0.22em] text-slate-400 mt-0.5">
                        Ophthalmic Ecosystem
                      </span>
                    </div>
                    <div className="text-right text-[8px] space-y-0.5">
                      <p><strong>Consulting Doctor:</strong> {selectedHistoricalVisit.consultation?.doctorName || selectedHistoricalVisit.consultingDoctorName || "Dr. Clinical Lead"}</p>
                      <p><strong>Visit Date:</strong> {new Date(selectedHistoricalVisit.visitedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>

                  {/* Patient Info Block */}
                  <div className="border border-black p-1.5 grid grid-cols-4 gap-2 text-[8px] bg-gray-50">
                    <div><strong>Patient Name:</strong> {patientName}</div>
                    <div><strong>Age / Gender:</strong> {patientAge} / {patientGender}</div>
                    <div><strong>MR Number:</strong> MR-{patientMRN}</div>
                    <div><strong>Contact Number:</strong> {selectedHistoricalVisit.patient?.contactNumber || patient?.contactNumber || "—"}</div>
                  </div>

                  {/* Optometry & Refraction */}
                  {selectedHistoricalVisit.refraction && (() => {
                    const rd = selectedHistoricalVisit.refraction;
                    return (
                      <div className="space-y-3">
                        <h2 className="text-[9px] font-bold uppercase border-b border-black pb-0.5">1. Optometry & Refraction</h2>
                        
                        {/* Visual Acuity Table */}
                        {rd.visualAcuity && (
                          <div className="space-y-1">
                            <span className="text-[7.5px] font-bold uppercase text-gray-500">Visual Acuity</span>
                            <table className="w-full border-collapse border border-black text-[8px]">
                              <thead>
                                <tr className="bg-gray-100 border-b border-black text-center">
                                  <th className="border-r border-black p-0.5 text-left font-bold w-[120px]">Modality</th>
                                  <th className="border-r border-black p-0.5 font-bold">OD (Right Eye)</th>
                                  <th className="border-r border-black p-0.5 font-bold">OS (Left Eye)</th>
                                  <th className="p-0.5 font-bold">OU (Both Eyes)</th>
                                </tr>
                              </thead>
                              <tbody className="text-center">
                                <tr className="border-b border-black">
                                  <td className="border-r border-black p-0.5 text-left font-semibold">Unaided DV</td>
                                  <td className="border-r border-black p-0.5">{fmtVA(rd.visualAcuity.OD?.unaided)}</td>
                                  <td className="border-r border-black p-0.5">{fmtVA(rd.visualAcuity.OS?.unaided)}</td>
                                  <td className="p-0.5">{fmtVA(rd.visualAcuity.OU?.unaided)}</td>
                                </tr>
                                <tr className="border-b border-black">
                                  <td className="border-r border-black p-0.5 text-left font-semibold">Unaided NV</td>
                                  <td className="border-r border-black p-0.5">{fmtVA(rd.visualAcuity.OD?.nearVision)}</td>
                                  <td className="border-r border-black p-0.5">{fmtVA(rd.visualAcuity.OS?.nearVision)}</td>
                                  <td className="p-0.5">{fmtVA(rd.visualAcuity.OU?.nearVision)}</td>
                                </tr>
                                <tr className="border-b border-black">
                                  <td className="border-r border-black p-0.5 text-left font-semibold">Aided DV</td>
                                  <td className="border-r border-black p-0.5">{fmtVA(rd.visualAcuity.OD?.aided)}</td>
                                  <td className="border-r border-black p-0.5">{fmtVA(rd.visualAcuity.OS?.aided)}</td>
                                  <td className="p-0.5">{fmtVA(rd.visualAcuity.OU?.aided)}</td>
                                </tr>
                                <tr>
                                  <td className="border-r border-black p-0.5 text-left font-semibold">Pinhole Potential</td>
                                  <td className="border-r border-black p-0.5">{fmtVA(rd.visualAcuity.OD?.pinhole)}</td>
                                  <td className="border-r border-black p-0.5">{fmtVA(rd.visualAcuity.OS?.pinhole)}</td>
                                  <td className="p-0.5">{fmtVA(rd.visualAcuity.OU?.pinhole)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          {/* Objective Measurements */}
                          <div className="space-y-1">
                            <span className="text-[7.5px] font-bold uppercase text-gray-500">Objective Measurements</span>
                            <table className="w-full border-collapse border border-black text-[8px]">
                              <thead>
                                <tr className="bg-gray-100 border-b border-black">
                                  <th className="border-r border-black p-0.5 text-left font-bold">Method</th>
                                  <th className="border-r border-black p-0.5 text-center font-bold">OD</th>
                                  <th className="p-0.5 text-center font-bold">OS</th>
                                </tr>
                              </thead>
                              <tbody className="text-center">
                                <tr className="border-b border-black">
                                  <td className="border-r border-black p-0.5 text-left font-semibold">Autoref (AR)</td>
                                  <td className="border-r border-black p-0.5">
                                    {rd.autoRef?.OD?.sphere1 ? `${fmtLens(rd.autoRef.OD.sphere1)} / ${fmtLens(rd.autoRef.OD.cylinder1)} × ${rd.autoRef.OD.axis1}°` : "—"}
                                  </td>
                                  <td className="p-0.5">
                                    {rd.autoRef?.OS?.sphere1 ? `${fmtLens(rd.autoRef.OS.sphere1)} / ${fmtLens(rd.autoRef.OS.cylinder1)} × ${fmtLens(rd.autoRef.OS.axis1)}°` : "—"}
                                  </td>
                                </tr>
                                <tr className="border-b border-black">
                                  <td className="border-r border-black p-0.5 text-left font-semibold">Clinical Retinoscopy</td>
                                  <td className="border-r border-black p-0.5">
                                    {rd.objectiveRefraction?.OD?.sphere || rd.retinoscopy?.OD?.sphere ? `${fmtLens(rd.objectiveRefraction?.OD?.sphere || rd.retinoscopy?.OD?.sphere)} / ${fmtLens(rd.objectiveRefraction?.OD?.cylinder || rd.retinoscopy?.OD?.cylinder)} × ${rd.objectiveRefraction?.OD?.axis || rd.retinoscopy?.OD?.axis}°` : "—"}
                                  </td>
                                  <td className="p-0.5">
                                    {rd.objectiveRefraction?.OS?.sphere || rd.retinoscopy?.OS?.sphere ? `${fmtLens(rd.objectiveRefraction?.OS?.sphere || rd.retinoscopy?.OS?.sphere)} / ${fmtLens(rd.objectiveRefraction?.OS?.cylinder || rd.retinoscopy?.OS?.cylinder)} × ${rd.objectiveRefraction?.OS?.axis || rd.retinoscopy?.OS?.axis}°` : "—"}
                                  </td>
                                </tr>
                                {(rd.cycloplegic || rd.objectiveRefraction?.OD?.cycloSphere) && (
                                  <tr>
                                    <td className="border-r border-black p-0.5 text-left font-semibold">Cyclo / Dilated</td>
                                    <td className="border-r border-black p-0.5">
                                      {rd.objectiveRefraction?.OD?.cycloSphere || rd.cycloplegic?.OD?.sphere ? `${fmtLens(rd.objectiveRefraction?.OD?.cycloSphere || rd.cycloplegic?.OD?.sphere)} / ${fmtLens(rd.objectiveRefraction?.OD?.cycloCylinder || rd.cycloplegic?.OD?.cylinder)} × ${rd.objectiveRefraction?.OD?.cycloAxis || rd.cycloplegic?.OD?.axis}°` : "—"}
                                    </td>
                                    <td className="p-0.5">
                                      {rd.objectiveRefraction?.OS?.cycloSphere || rd.cycloplegic?.OS?.sphere ? `${fmtLens(rd.objectiveRefraction?.OS?.cycloSphere || rd.cycloplegic?.OS?.sphere)} / ${fmtLens(rd.objectiveRefraction?.OS?.cycloCylinder || rd.cycloplegic?.OS?.cylinder)} × ${rd.objectiveRefraction?.OS?.cycloAxis || rd.cycloplegic?.OS?.axis}°` : "—"}
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* Subjective Acceptance */}
                          <div className="space-y-1">
                            <span className="text-[7.5px] font-bold uppercase text-gray-500">Subjective Acceptance</span>
                            <table className="w-full border-collapse border border-black text-[8px]">
                              <thead>
                                <tr className="bg-gray-100 border-b border-black">
                                  <th className="border-r border-black p-0.5 text-left font-bold">Eye</th>
                                  <th className="border-r border-black p-0.5 text-center font-bold">SPH</th>
                                  <th className="border-r border-black p-0.5 text-center font-bold">CYL</th>
                                  <th className="border-r border-black p-0.5 text-center font-bold">AXIS</th>
                                  <th className="p-0.5 text-center font-bold">BCVA</th>
                                </tr>
                              </thead>
                              <tbody className="text-center">
                                <tr className="border-b border-black">
                                  <td className="border-r border-black p-0.5 text-left font-semibold">OD (DV)</td>
                                  <td className="border-r border-black p-0.5">{fmtLens(rd.acceptance?.distance?.OD?.sphere)}</td>
                                  <td className="border-r border-black p-0.5">{fmtLens(rd.acceptance?.distance?.OD?.cylinder)}</td>
                                  <td className="border-r border-black p-0.5">{rd.acceptance?.distance?.OD?.axis || "—"}</td>
                                  <td className="p-0.5">{fmtVA(rd.acceptance?.distance?.OD?.vn)}</td>
                                </tr>
                                <tr className="border-b border-black">
                                  <td className="border-r border-black p-0.5 text-left font-semibold">OD (NV)</td>
                                  <td className="border-r border-black p-0.5">{fmtLens(rd.acceptance?.near?.OD?.sphere)}</td>
                                  <td className="border-r border-black p-0.5">{fmtLens(rd.acceptance?.near?.OD?.cylinder)}</td>
                                  <td className="border-r border-black p-0.5">{rd.acceptance?.near?.OD?.axis || "—"}</td>
                                  <td className="p-0.5">{fmtVA(rd.acceptance?.near?.OD?.vn)}</td>
                                </tr>
                                <tr className="border-b border-black">
                                  <td className="border-r border-black p-0.5 text-left font-semibold">OS (DV)</td>
                                  <td className="border-r border-black p-0.5">{fmtLens(rd.acceptance?.distance?.OS?.sphere)}</td>
                                  <td className="border-r border-black p-0.5">{fmtLens(rd.acceptance?.distance?.OS?.cylinder)}</td>
                                  <td className="border-r border-black p-0.5">{rd.acceptance?.distance?.OS?.axis || "—"}</td>
                                  <td className="p-0.5">{fmtVA(rd.acceptance?.distance?.OS?.vn)}</td>
                                </tr>
                                <tr>
                                  <td className="border-r border-black p-0.5 text-left font-semibold">OS (NV)</td>
                                  <td className="border-r border-black p-0.5">{fmtLens(rd.acceptance?.near?.OS?.sphere)}</td>
                                  <td className="border-r border-black p-0.5">{fmtLens(rd.acceptance?.near?.OS?.cylinder)}</td>
                                  <td className="border-r border-black p-0.5">{rd.acceptance?.near?.OS?.axis || "—"}</td>
                                  <td className="p-0.5">{fmtVA(rd.acceptance?.near?.OS?.vn)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Final Spectacles & Contact Lens Recommendations */}
                        <div className="grid grid-cols-2 gap-4">
                          {/* Spectacles RX */}
                          <div className="space-y-1">
                            <span className="text-[7.5px] font-bold uppercase text-gray-500">Final Spectacles RX {rd.glassPrescription?.glassType ? `(${rd.glassPrescription.glassType})` : ""}</span>
                            <table className="w-full border-collapse border border-black text-[8px]">
                              <thead>
                                <tr className="bg-gray-100 border-b border-black">
                                  <th className="border-r border-black p-0.5 text-center font-bold">Eye</th>
                                  <th className="border-r border-black p-0.5 text-center font-bold">SPH</th>
                                  <th className="border-r border-black p-0.5 text-center font-bold">CYL</th>
                                  <th className="border-r border-black p-0.5 text-center font-bold">AXIS</th>
                                  <th className="p-0.5 text-center font-bold">ADD</th>
                                </tr>
                              </thead>
                              <tbody className="text-center">
                                <tr className="border-b border-black">
                                  <td className="border-r border-black p-0.5 font-semibold">OD</td>
                                  <td className="border-r border-black p-0.5">{fmtLens(rd.glassPrescription?.OD?.sphere)}</td>
                                  <td className="border-r border-black p-0.5">{fmtLens(rd.glassPrescription?.OD?.cylinder)}</td>
                                  <td className="border-r border-black p-0.5">{rd.glassPrescription?.OD?.axis || "—"}</td>
                                  <td className="p-0.5">{fmtLens(rd.glassPrescription?.OD?.nearAdd)}</td>
                                </tr>
                                <tr>
                                  <td className="border-r border-black p-0.5 font-semibold">OS</td>
                                  <td className="border-r border-black p-0.5">{fmtLens(rd.glassPrescription?.OS?.sphere)}</td>
                                  <td className="border-r border-black p-0.5">{fmtLens(rd.glassPrescription?.OS?.cylinder)}</td>
                                  <td className="border-r border-black p-0.5">{rd.glassPrescription?.OS?.axis || "—"}</td>
                                  <td className="p-0.5">{fmtLens(rd.glassPrescription?.OS?.nearAdd)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Contact Lens RX */}
                          <div className="space-y-1">
                            <span className="text-[7.5px] font-bold uppercase text-gray-500">Final Contact Lens RX {rd.contactLensPrescription?.clType && Array.isArray(rd.contactLensPrescription.clType) && rd.contactLensPrescription.clType.length > 0 ? `(${rd.contactLensPrescription.clType.join(", ")})` : ""}</span>
                            <table className="w-full border-collapse border border-black text-[8px]">
                              <thead>
                                <tr className="bg-gray-100 border-b border-black">
                                  <th className="border-r border-black p-0.5 text-center font-bold">Eye</th>
                                  <th className="border-r border-black p-0.5 text-center font-bold">SPH</th>
                                  <th className="border-r border-black p-0.5 text-center font-bold">CYL</th>
                                  <th className="border-r border-black p-0.5 text-center font-bold">AXIS</th>
                                  <th className="p-0.5 text-center font-bold">BCVA</th>
                                </tr>
                              </thead>
                              <tbody className="text-center">
                                <tr className="border-b border-black">
                                  <td className="border-r border-black p-0.5 font-semibold">OD</td>
                                  <td className="border-r border-black p-0.5">{fmtLens(rd.contactLensPrescription?.OD?.sphere)}</td>
                                  <td className="border-r border-black p-0.5">{fmtLens(rd.contactLensPrescription?.OD?.cylinder)}</td>
                                  <td className="border-r border-black p-0.5">{rd.contactLensPrescription?.OD?.axis || "—"}</td>
                                  <td className="p-0.5">{fmtVA(rd.contactLensPrescription?.OD?.bcva)}</td>
                                </tr>
                                <tr>
                                  <td className="border-r border-black p-0.5 font-semibold">OS</td>
                                  <td className="border-r border-black p-0.5">{fmtLens(rd.contactLensPrescription?.OS?.sphere)}</td>
                                  <td className="border-r border-black p-0.5">{fmtLens(rd.contactLensPrescription?.OS?.cylinder)}</td>
                                  <td className="border-r border-black p-0.5">{rd.contactLensPrescription?.OS?.axis || "—"}</td>
                                  <td className="p-0.5">{fmtVA(rd.contactLensPrescription?.OS?.bcva)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Tonometry & Other Tests */}
                        <div className="grid grid-cols-2 gap-4">
                          {/* Tonometry */}
                          {rd.tonometryDetails && (
                            <div className="space-y-1">
                              <span className="text-[7.5px] font-bold uppercase text-gray-500">Tonometry</span>
                              <table className="w-full border-collapse border border-black text-[8px]">
                                <thead>
                                  <tr className="bg-gray-100 border-b border-black">
                                    <th className="border-r border-black p-0.5 text-left font-bold">Method</th>
                                    <th className="border-r border-black p-0.5 text-center font-bold">OD</th>
                                    <th className="p-0.5 text-center font-bold">OS</th>
                                  </tr>
                                </thead>
                                <tbody className="text-center">
                                  <tr className="border-b border-black">
                                    <td className="border-r border-black p-0.5 text-left font-semibold">NCT (Air-Puff)</td>
                                    <td className="border-r border-black p-0.5">
                                      {(() => {
                                        const vals = Array.isArray(rd.tonometryDetails.nct?.OD?.mean) ? rd.tonometryDetails.nct.OD.mean : (rd.tonometryDetails.nct?.OD?.mean ? [rd.tonometryDetails.nct.OD.mean] : []);
                                        return vals.length > 0 ? vals.join(", ") : "—";
                                      })()}
                                    </td>
                                    <td className="p-0.5">
                                      {(() => {
                                        const vals = Array.isArray(rd.tonometryDetails.nct?.OS?.mean) ? rd.tonometryDetails.nct.OS.mean : (rd.tonometryDetails.nct?.OS?.mean ? [rd.tonometryDetails.nct.OS.mean] : []);
                                        return vals.length > 0 ? vals.join(", ") : "—";
                                      })()}
                                    </td>
                                  </tr>
                                  <tr className="border-b border-black">
                                    <td className="border-r border-black p-0.5 text-left font-semibold">GAT (Goldmann)</td>
                                    <td className="border-r border-black p-0.5">
                                      {(() => {
                                        const vals = Array.isArray(rd.tonometryDetails.gat?.OD?.reading) ? rd.tonometryDetails.gat.OD.reading : (rd.tonometryDetails.gat?.OD?.reading ? [rd.tonometryDetails.gat.OD.reading] : []);
                                        return vals.length > 0 ? vals.join(", ") : "—";
                                      })()}
                                    </td>
                                    <td className="p-0.5">
                                      {(() => {
                                        const vals = Array.isArray(rd.tonometryDetails.gat?.OS?.reading) ? rd.tonometryDetails.gat.OS.reading : (rd.tonometryDetails.gat?.OS?.reading ? [rd.tonometryDetails.gat.OS.reading] : []);
                                        return vals.length > 0 ? vals.join(", ") : "—";
                                      })()}
                                    </td>
                                  </tr>
                                  {rd.tonometryDetails.schiotz && (
                                    <tr>
                                      <td className="border-r border-black p-0.5 text-left font-semibold">Schiotz</td>
                                      <td className="border-r border-black p-0.5">
                                        {rd.tonometryDetails.schiotz.OD?.reading ? `${rd.tonometryDetails.schiotz.OD.reading} / ${rd.tonometryDetails.schiotz.OD.weight}g${rd.tonometryDetails.schiotz.OD.iop ? ` (${rd.tonometryDetails.schiotz.OD.iop} mmHg)` : ""}` : "—"}
                                      </td>
                                      <td className="p-0.5">
                                        {rd.tonometryDetails.schiotz.OS?.reading ? `${rd.tonometryDetails.schiotz.OS.reading} / ${rd.tonometryDetails.schiotz.OS.weight}g${rd.tonometryDetails.schiotz.OS.iop ? ` (${rd.tonometryDetails.schiotz.OS.iop} mmHg)` : ""}` : "—"}
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Supplementary Tests */}
                          {(rd.ishiharaTest || rd.schirmerTest || rd.keratometry) && (
                            <div className="space-y-1">
                              <span className="text-[7.5px] font-bold uppercase text-gray-500">Ophthalmic Tests</span>
                              <table className="w-full border-collapse border border-black text-[8px]">
                                <tbody>
                                  {rd.ishiharaTest && (
                                    <tr className="border-b border-black">
                                      <td className="border-r border-black p-0.5 font-semibold text-left">Color Vision (Ishihara)</td>
                                      <td className="p-0.5">{rd.ishiharaTest.status || "—"} {rd.ishiharaTest.notes ? `(${rd.ishiharaTest.notes})` : ""}</td>
                                    </tr>
                                  )}
                                  {rd.schirmerTest && (
                                    <tr className="border-b border-black">
                                      <td className="border-r border-black p-0.5 font-semibold text-left">Schirmer's Test</td>
                                      <td className="p-0.5">OD: {rd.schirmerTest.OD ? `${rd.schirmerTest.OD} mm` : "—"} / OS: {rd.schirmerTest.OS ? `${rd.schirmerTest.OS} mm` : "—"}</td>
                                    </tr>
                                  )}
                                  {rd.keratometry && (
                                    <tr>
                                      <td className="border-r border-black p-0.5 font-semibold text-left">Keratometry</td>
                                      <td className="p-0.5">
                                        OD: {Array.isArray(rd.keratometry.OD) ? rd.keratometry.OD.join(", ") : (rd.keratometry.OD || "—")} / 
                                        OS: {Array.isArray(rd.keratometry.OS) ? rd.keratometry.OS.join(", ") : (rd.keratometry.OS || "—")}
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Doctor Consultation Details */}
                  {selectedHistoricalVisit.consultation && (() => {
                    const cons = selectedHistoricalVisit.consultation;
                    let slitLamp: any = null;
                    let eom: any = null;
                    try {
                      const parsed = typeof cons.anteriorSegment === 'string' ? JSON.parse(cons.anteriorSegment) : cons.anteriorSegment;
                      if (parsed) {
                        slitLamp = parsed.slitLamp || parsed;
                        eom = parsed.eom;
                      }
                    } catch (e) {}

                    let fundus: any = null;
                    try {
                      fundus = typeof cons.fundusObservation === 'string' ? JSON.parse(cons.fundusObservation) : cons.fundusObservation;
                    } catch (e) {}

                    const activeSlitLamp = slitLamp ? Object.keys(slitLamp).filter(k => k !== 'dilation' && (slitLamp[k]?.OD || slitLamp[k]?.OS)) : [];
                    const activeFundus = fundus ? Object.keys(fundus).filter(k => fundus[k]?.OD || fundus[k]?.OS) : [];

                    return (
                      <div className="space-y-3">
                        {/* Anterior Segment Findings */}
                        {activeSlitLamp.length > 0 && (
                          <div className="space-y-1">
                            <h2 className="text-[9px] font-bold uppercase border-b border-black pb-0.5">2. Anterior Segment (Slit Lamp)</h2>
                            <table className="w-full border-collapse border border-black text-[8px]">
                              <thead>
                                <tr className="bg-gray-100 border-b border-black">
                                  <th className="border-r border-black p-0.5 text-left font-bold w-[120px]">Structure</th>
                                  <th className="border-r border-black p-0.5 text-left font-bold">Right Eye (OD)</th>
                                  <th className="p-0.5 text-left font-bold">Left Eye (OS)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeSlitLamp.map((key) => (
                                  <tr key={key} className="border-b border-black last:border-b-0">
                                    <td className="border-r border-black p-0.5 font-semibold">{structureLabels[key] || key}</td>
                                    <td className="border-r border-black p-0.5">{slitLamp[key]?.OD || "—"}</td>
                                    <td className="p-0.5">{slitLamp[key]?.OS || "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Pupillary Dilation & EOM */}
                        {((slitLamp && slitLamp.dilation) || (eom && (eom.OD || eom.OS))) && (
                          <div className="grid grid-cols-2 gap-4 text-[8px] border border-black p-1 bg-gray-50">
                            {slitLamp && slitLamp.dilation && (
                              <div><strong>Pupillary Dilation:</strong> {typeof slitLamp.dilation === 'string' ? slitLamp.dilation : `OD: ${slitLamp.dilation?.OD || "—"} | OS: ${slitLamp.dilation?.OS || "—"}`}</div>
                            )}
                            {eom && (eom.OD || eom.OS) && (
                              <div><strong>Extra Ocular Movements (EOM):</strong> OD: {eom.OD || "—"} | OS: {eom.OS || "—"}</div>
                            )}
                          </div>
                        )}

                        {/* Posterior Segment (Fundus) */}
                        {activeFundus.length > 0 && (
                          <div className="space-y-1">
                            <h2 className="text-[9px] font-bold uppercase border-b border-black pb-0.5">3. Posterior Segment (Fundus)</h2>
                            <table className="w-full border-collapse border border-black text-[8px]">
                              <thead>
                                <tr className="bg-gray-100 border-b border-black">
                                  <th className="border-r border-black p-0.5 text-left font-bold w-[120px]">Structure</th>
                                  <th className="border-r border-black p-0.5 text-left font-bold">Right Eye (OD)</th>
                                  <th className="p-0.5 text-left font-bold">Left Eye (OS)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeFundus.map((key) => (
                                  <tr key={key} className="border-b border-black last:border-b-0">
                                    <td className="border-r border-black p-0.5 font-semibold">{fundusLabels[key] || key}</td>
                                    <td className="border-r border-black p-0.5">{fundus[key]?.OD || "—"}</td>
                                    <td className="p-0.5">{fundus[key]?.OS || "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Clinical Diagnosis */}
                        {cons.diagnosisText && (
                          <div className="space-y-1">
                            <h2 className="text-[9px] font-bold uppercase border-b border-black pb-0.5">4. Clinical Diagnosis</h2>
                            {(() => {
                              const parts = cons.diagnosisText.split(' | ') || [];
                              const od = parts[0]?.replace('OD: ', '') || "—";
                              const os = parts.length > 1 ? parts[1].replace('OS: ', '') : "—";
                              return (
                                <div className="grid grid-cols-2 gap-4 text-[8px] border border-black p-1.5 bg-gray-50">
                                  <div><strong>Right Eye (OD):</strong> {od}</div>
                                  <div><strong>Left Eye (OS):</strong> {os}</div>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Medical Prescriptions */}
                        {(() => {
                          const rawMeds = cons.medicalPrescription || (cons as any).medications;
                          const meds = typeof rawMeds === 'string' ? JSON.parse(rawMeds) : rawMeds;
                          if (meds && Array.isArray(meds) && meds.length > 0) {
                            return (
                              <div className="space-y-1">
                                <h2 className="text-[9px] font-bold uppercase border-b border-black pb-0.5">5. Medical Prescriptions</h2>
                                <table className="w-full border-collapse border border-black text-[8px]">
                                  <thead>
                                    <tr className="bg-gray-100 border-b border-black text-left">
                                      <th className="border-r border-black p-0.5 font-bold">Medicine</th>
                                      <th className="border-r border-black p-0.5 font-bold">Dose / Route</th>
                                      <th className="border-r border-black p-0.5 font-bold">Frequency</th>
                                      <th className="border-r border-black p-0.5 font-bold">Duration</th>
                                      <th className="p-0.5 font-bold text-center">Eye</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {meds.map((m: any, idx: number) => (
                                      <tr key={idx} className="border-b border-black last:border-b-0">
                                        <td className="border-r border-black p-0.5 font-bold">{m.drug || m.name || "—"}</td>
                                        <td className="border-r border-black p-0.5">{m.dosage || m.dose || "—"} ({m.route || "Topical"})</td>
                                        <td className="border-r border-black p-0.5">{m.frequency || "—"}</td>
                                        <td className="border-r border-black p-0.5">{m.duration || "—"}</td>
                                        <td className="p-0.5 text-center font-semibold">{m.eye || "Both"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {/* Doctor Glass RX */}
                        {(() => {
                          const rawGlass = cons.finalGlassPrescription;
                          const glassRx = typeof rawGlass === 'string' ? JSON.parse(rawGlass) : rawGlass;
                          if (glassRx) {
                            const hasDistance = ['OD', 'OS'].some(eye => glassRx.distance?.[eye]?.sphere || glassRx.distance?.[eye]?.cylinder || glassRx.distance?.[eye]?.axis);
                            const hasNear = ['OD', 'OS'].some(eye => glassRx.near?.[eye]?.sphere || glassRx.near?.[eye]?.cylinder || glassRx.near?.[eye]?.axis);
                            if (hasDistance || hasNear) {
                              return (
                                <div className="space-y-1">
                                  <h2 className="text-[9px] font-bold uppercase border-b border-black pb-0.5">6. Final Glass RX</h2>
                                  <div className="grid grid-cols-2 gap-4">
                                    {hasDistance && (
                                      <div className="space-y-1">
                                        <span className="text-[7.5px] font-bold uppercase text-gray-500">Distance Vision (DV)</span>
                                        <table className="w-full border-collapse border border-black text-[8px]">
                                          <thead>
                                            <tr className="bg-gray-100 border-b border-black text-center">
                                              <th className="border-r border-black p-0.5 font-bold">Eye</th>
                                              <th className="border-r border-black p-0.5 font-bold">SPH</th>
                                              <th className="border-r border-black p-0.5 font-bold">CYL</th>
                                              <th className="p-0.5 font-bold">AXIS</th>
                                            </tr>
                                          </thead>
                                          <tbody className="text-center">
                                            {['OD', 'OS'].map((eye) => (
                                              <tr key={eye} className="border-b border-black last:border-b-0">
                                                <td className="border-r border-black p-0.5 font-semibold">{eye}</td>
                                                <td className="border-r border-black p-0.5">{glassRx.distance?.[eye]?.sphere || "0.00"}</td>
                                                <td className="border-r border-black p-0.5">{glassRx.distance?.[eye]?.cylinder || "0.00"}</td>
                                                <td className="p-0.5">{glassRx.distance?.[eye]?.axis || "0"}°</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                    {hasNear && (
                                      <div className="space-y-1">
                                        <span className="text-[7.5px] font-bold uppercase text-gray-500">Near Vision (NV)</span>
                                        <table className="w-full border-collapse border border-black text-[8px]">
                                          <thead>
                                            <tr className="bg-gray-100 border-b border-black text-center">
                                              <th className="border-r border-black p-0.5 font-bold">Eye</th>
                                              <th className="border-r border-black p-0.5 font-bold">SPH</th>
                                              <th className="border-r border-black p-0.5 font-bold">CYL</th>
                                              <th className="p-0.5 font-bold">AXIS</th>
                                            </tr>
                                          </thead>
                                          <tbody className="text-center">
                                            {['OD', 'OS'].map((eye) => (
                                              <tr key={eye} className="border-b border-black last:border-b-0">
                                                <td className="border-r border-black p-0.5 font-semibold">{eye}</td>
                                                <td className="border-r border-black p-0.5">{glassRx.near?.[eye]?.sphere || "0.00"}</td>
                                                <td className="border-r border-black p-0.5">{glassRx.near?.[eye]?.cylinder || "0.00"}</td>
                                                <td className="p-0.5">{glassRx.near?.[eye]?.axis || "0"}°</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          }
                          return null;
                        })()}

                        {/* Remarks & Notes */}
                        {(cons.notes || cons.posteriorSegment) && (() => {
                          let postSeg: any = null;
                          try {
                            postSeg = typeof cons.posteriorSegment === 'string' ? JSON.parse(cons.posteriorSegment) : cons.posteriorSegment;
                          } catch (e) {}

                          const required = postSeg?.required && postSeg.required !== "Nothing selected" ? postSeg.required : null;
                          const adminInstructions = postSeg?.adminInstructions && postSeg.adminInstructions !== "Standard administration" ? postSeg.adminInstructions : null;

                          return (
                            <div className="space-y-1.5">
                              <h2 className="text-[9px] font-bold uppercase border-b border-black pb-0.5">7. Remarks & Instructions</h2>
                              {cons.notes && <p className="text-[8px]"><strong>Clinical Notes:</strong> {cons.notes}</p>}
                              {required && (
                                <p className="text-[8px]"><strong>Investigations Required:</strong> {typeof required === 'object' ? (Array.isArray(required) ? required.join(", ") : "—") : required} {postSeg.other ? `(${postSeg.other})` : ""}</p>
                              )}
                              {adminInstructions && <p className="text-[8px]"><strong>Administration Directions:</strong> {adminInstructions}</p>}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}
        </div>
      );
    })()}

        </DialogContent>
      </Dialog>

        {/* Consolidated / Separate Print Section */}
        <div id="print-section" className="hidden print:block w-full bg-white text-black text-[9px] font-sans p-4 space-y-4 leading-tight">
          {printType === 'glass' && (
            <div className="space-y-4">
              {/* Hospital Header */}
              <div className="border-b-2 border-black pb-2 text-center flex flex-col items-center leading-none">
                <div className="flex flex-col items-center gap-0.5 leading-none">
                  <span
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                    className="font-extrabold text-lg tracking-tight leading-none"
                  >
                    <span style={{ color: "#0F172A" }}>Vision</span>
                    <span style={{ color: "#2563EB" }}>Pulze</span>
                  </span>
                  <span className="text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-400 mt-1">
                    Ophthalmic Ecosystem
                  </span>
                </div>
                <div className="mt-2 text-center border-t border-black pt-1">
                  <span className="text-sm font-black uppercase tracking-widest bg-white px-3 py-0.5 border border-black">Glass Prescription</span>
                </div>
              </div>

              {/* Patient Info Block */}
              <div className="border border-black p-2 bg-gray-50/50">
                <table className="w-full text-[9px] leading-relaxed">
                  <tbody>
                    <tr>
                      <td className="w-[15%] font-bold">Patient Name:</td>
                      <td className="w-[35%] font-medium">{printData.patientName}</td>
                      <td className="w-[15%] font-bold">UIN / MRN:</td>
                      <td className="w-[35%] font-semibold">{printData.mrNumber}</td>
                    </tr>
                    <tr>
                      <td className="font-bold">Age / Gender:</td>
                      <td className="font-medium">{printData.ageGender}</td>
                      <td className="font-bold">Prescription Date:</td>
                      <td className="font-semibold">{printData.date}</td>
                    </tr>
                    <tr>
                      <td className="font-bold">Contact No:</td>
                      <td className="font-medium">{printData.contactNumber}</td>
                      <td className="font-bold">Consultant:</td>
                      <td className="font-semibold">{printData.doctorName}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Glass prescription table */}
              <table className="w-full border-collapse border border-black text-center text-[9px] my-3">
                <thead>
                  <tr className="border-b border-black bg-gray-100">
                    <th rowSpan={2} className="border-r border-black p-1 w-[12%]"></th>
                    <th colSpan={4} className="border-r border-black p-1 font-black uppercase text-[8px]">RE (Right Eye)</th>
                    <th colSpan={4} className="p-1 font-black uppercase text-[8px]">LE (Left Eye)</th>
                  </tr>
                  <tr className="border-b border-black bg-gray-50 text-[8px]">
                    <th className="border-r border-black p-1 font-bold w-[11%]">SPH</th>
                    <th className="border-r border-black p-1 font-bold w-[11%]">CYL</th>
                    <th className="border-r border-black p-1 font-bold w-[11%]">AXIS</th>
                    <th className="border-r border-black p-1 font-bold w-[11%]">V/A</th>
                    <th className="border-r border-black p-1 font-bold w-[11%]">SPH</th>
                    <th className="border-r border-black p-1 font-bold w-[11%]">CYL</th>
                    <th className="border-r border-black p-1 font-bold w-[11%]">AXIS</th>
                    <th className="p-1 font-bold w-[11%]">V/A</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-black text-[9px]">
                    <td className="border-r border-black p-1.5 font-bold text-left bg-gray-50">DV</td>
                    <td className="border-r border-black p-1.5 font-mono font-bold">{fmtLens(printData.glassRx?.distance?.OD?.sphere)}</td>
                    <td className="border-r border-black p-1.5 font-mono">{fmtLens(printData.glassRx?.distance?.OD?.cylinder)}</td>
                    <td className="border-r border-black p-1.5 font-mono">{printData.glassRx?.distance?.OD?.axis ? `${printData.glassRx.distance.OD.axis}°` : "—"}</td>
                    <td className="border-r border-black p-1.5 font-semibold">{printData.refraction?.acceptance?.distance?.OD?.vn || printData.refraction?.visualAcuity?.OD?.aided || "—"}</td>
                    <td className="border-r border-black p-1.5 font-mono font-bold">{fmtLens(printData.glassRx?.distance?.OS?.sphere)}</td>
                    <td className="border-r border-black p-1.5 font-mono">{fmtLens(printData.glassRx?.distance?.OS?.cylinder)}</td>
                    <td className="border-r border-black p-1.5 font-mono">{printData.glassRx?.distance?.OS?.axis ? `${printData.glassRx.distance.OS.axis}°` : "—"}</td>
                    <td className="p-1.5 font-semibold">{printData.refraction?.acceptance?.distance?.OS?.vn || printData.refraction?.visualAcuity?.OS?.aided || "—"}</td>
                  </tr>
                  <tr className="border-b border-black text-[9px]">
                    <td className="border-r border-black p-1.5 font-bold text-left bg-gray-50">NV</td>
                    <td className="border-r border-black p-1.5 font-mono font-bold">{fmtLens(printData.glassRx?.near?.OD?.sphere)}</td>
                    <td className="border-r border-black p-1.5 font-mono">{fmtLens(printData.glassRx?.near?.OD?.cylinder)}</td>
                    <td className="border-r border-black p-1.5 font-mono">{printData.glassRx?.near?.OD?.axis ? `${printData.glassRx.near.OD.axis}°` : "—"}</td>
                    <td className="border-r border-black p-1.5 font-semibold">{printData.refraction?.acceptance?.near?.OD?.vn || printData.refraction?.visualAcuity?.OD?.nearVision || "—"}</td>
                    <td className="border-r border-black p-1.5 font-mono font-bold">{fmtLens(printData.glassRx?.near?.OS?.sphere)}</td>
                    <td className="border-r border-black p-1.5 font-mono">{fmtLens(printData.glassRx?.near?.OS?.cylinder)}</td>
                    <td className="border-r border-black p-1.5 font-mono">{printData.glassRx?.near?.OS?.axis ? `${printData.glassRx.near.OS.axis}°` : "—"}</td>
                    <td className="p-1.5 font-semibold">{printData.refraction?.acceptance?.near?.OS?.vn || printData.refraction?.visualAcuity?.OS?.nearVision || "—"}</td>
                  </tr>
                  <tr className="border-b border-black text-[9px]">
                    <td className="border-r border-black p-1.5 font-bold text-left bg-gray-50">Dist PD</td>
                    <td colSpan={4} className="border-r border-black p-1.5 text-center font-semibold">{printData.refraction?.pd || printData.refraction?.autoRef?.pd || "—"} mm</td>
                    <td colSpan={4} className="p-1.5 text-center font-semibold">{printData.refraction?.pd || printData.refraction?.autoRef?.pd || "—"} mm</td>
                  </tr>
                  <tr className="text-[9px]">
                    <td className="border-r border-black p-1.5 font-bold text-left bg-gray-50">Near PD</td>
                    <td colSpan={4} className="border-r border-black p-1.5 text-center font-semibold">{printData.refraction?.pdNear || "—"} mm</td>
                    <td colSpan={4} className="p-1.5 text-center font-semibold">{printData.refraction?.pdNear || "—"} mm</td>
                  </tr>
                </tbody>
              </table>

              {/* Details and Signatures Layout */}
              <div className="grid grid-cols-2 gap-6 my-4 text-[9px] leading-relaxed">
                {/* Left Side: Lens parameters */}
                <div className="space-y-2 border-r border-gray-300 pr-4">
                  {(() => {
                    const isPAL = printData.glassRx?.glassType === 'PAL';
                    const isKryptok = printData.glassRx?.glassType === 'KBF';
                    const isSVN = printData.glassRx?.glassType === 'SVN';
                    return (
                      <div className="flex gap-4 items-center">
                        <span className="font-bold w-[70px]">Lens types:</span>
                        <div className="flex gap-3">
                          <div className="flex items-center gap-1">
                            <span className={`w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center font-bold text-[8px] ${isPAL ? 'bg-black text-white' : ''}`}>{isPAL ? '✓' : ''}</span>
                            <span>PAL</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center font-bold text-[8px] ${isKryptok ? 'bg-black text-white' : ''}`}>{isKryptok ? '✓' : ''}</span>
                            <span>Kryptok</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center font-bold text-[8px] ${isSVN ? 'bg-black text-white' : ''}`}>{isSVN ? '✓' : ''}</span>
                            <span>Univis - D</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center font-bold text-[8px]"></span>
                            <span>Executive</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div><strong>Lens details:</strong> Plastic, White</div>
                  <div><strong>Instruction:</strong> Constant Wear</div>
                  <div><strong>Remarks:</strong> {printData.notes || "For Regular Use"}</div>
                </div>

                {/* Right Side: Doctor and Refractionist Info */}
                <div className="flex flex-col justify-between pl-2">
                  <div className="space-y-4">
                    <div className="flex flex-col text-right">
                      <span className="text-[8px] uppercase text-gray-500 font-bold">Ophthalmologist</span>
                      <span className="font-black text-slate-800 text-[10px]">{printData.doctorName}</span>
                      <span className="text-[7.5px] text-gray-400">Reg No: 120/09</span>
                      <div className="mt-1 border-t border-dotted border-gray-400 w-36 ml-auto pt-0.5 text-[7px] text-gray-400">Signature</div>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[8px] uppercase text-gray-500 font-bold">Refraction done by</span>
                      <span className="font-black text-slate-800 text-[9px]">{printData.refraction?.optometristName || printData.refraction?.refractionist?.name || "Sr. Muppudathi K S"}</span>
                      <div className="mt-1 border-t border-dotted border-gray-400 w-36 ml-auto pt-0.5 text-[7px] text-gray-400">Signature</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Glass Handling Tips */}
              <div className="border-t border-black pt-2 mt-4">
                <h3 className="font-bold text-[9px] uppercase mb-1">Glass Handling Tips / கண்ணாடி கையாளும் குறிப்புகள்:</h3>
                <div className="grid grid-cols-2 gap-4 text-[7.5px] leading-tight">
                  <div className="space-y-1.5">
                    <p><strong>1. Use the spectacles after washing with normal water.</strong><br/><span className="text-gray-500">தண்ணீரில் கழுவிய பின் கண்ணாடியை அணிய வேண்டும்.</span></p>
                    <p><strong>2. Use only a soft cloth for cleaning spectacles.</strong><br/><span className="text-gray-500">மென்மையான துணி கொண்டு கண்ணாடியை சுத்தம் செய்ய வேண்டும்.</span></p>
                    <p><strong>3. Store the spectacles in the box when not in use.</strong><br/><span className="text-gray-500">கண்ணாடியைக் கழற்றிய பின் அதற்குரிய பெட்டியில் வைக்கவும்.</span></p>
                    <p><strong>4. Spectacles with coated lenses should not be kept on the car dashboard.</strong><br/><span className="text-gray-500">வெப்பநிலை அதிகமாக உள்ள இடத்தில் கண்ணாடியை வைப்பதைத் தவிர்க்கவும் (கார் Dashboard, சமையலறை).</span></p>
                    <p><strong>5. Change the nose pad and check the frame alignment every 3 months.</strong><br/><span className="text-gray-500">மூன்று மாதங்களுக்கு ஒருமுறை மூக்குப்பட்டையை மாற்ற வேண்டும், கண்ணாடி நிலையை சரிபார்க்க வேண்டும்.</span></p>
                  </div>
                  <div className="space-y-1.5">
                    <p><strong>6. Avoid contact with any chemical solutions for special coated lenses.</strong><br/><span className="text-gray-500">கோட்டிங் செய்த கண்ணாடிகளில் ரசாயன திரவங்கள் படக்கூடாது.</span></p>
                    <p><strong>7. Wear and remove the spectacles with both hands.</strong><br/><span className="text-gray-500">கண் கண்ணாடியை இரண்டு கைகளால் அணிந்து இரண்டு கைகளால் அகற்ற வேண்டும்.</span></p>
                    <p><strong>8. Change your spectacles if there is any variation in the power.</strong><br/><span className="text-gray-500">பார்வையில் மாற்றம் இருந்தால் கண்ணாடியை மாற்ற வேண்டும்.</span></p>
                    <p><strong>9. Do not use the spectacles with scratches.</strong><br/><span className="text-gray-500">கீறல் விழுந்த கண்ணாடியை உபயோகப்படுத்தாதீர்கள்.</span></p>
                    <p><strong>10. Adapt to first-time glass usage or new lenses takes time.</strong><br/><span className="text-gray-500">முதல் முறை கண்ணாடி அணியும் போதும் அல்லது புதிய லென்ஸ்களைப் பயன்படுத்தும் போதும் நம் கண்களோடு பொருந்த சிறிது காலம் தேவைப்படும்.</span></p>
                  </div>
                </div>
                <p className="text-[7.5px] font-bold mt-2 border-t border-dotted border-black pt-1.5 text-center">
                  Please note: Spectacle power should be reviewed at least once a year for adults and once in 6 months for children (below 15 years).
                </p>
              </div>
            </div>
          )}

          {printType === 'medical' && (
            <div className="space-y-6">
              {/* Hospital Header */}
              <div className="border-b-2 border-black pb-2 text-center flex flex-col items-center leading-none">
                <div className="flex flex-col items-center gap-0.5 leading-none">
                  <span
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                    className="font-extrabold text-lg tracking-tight leading-none"
                  >
                    <span style={{ color: "#0F172A" }}>Vision</span>
                    <span style={{ color: "#2563EB" }}>Pulze</span>
                  </span>
                  <span className="text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-400 mt-1">
                    Ophthalmic Ecosystem
                  </span>
                </div>
                <div className="mt-2 text-center border-t border-black pt-1">
                  <span className="text-sm font-black uppercase tracking-widest bg-white px-3 py-0.5 border border-black">Medical Prescription</span>
                </div>
              </div>

              {/* Patient Info Block */}
              <div className="border border-black p-2 bg-gray-50/50">
                <table className="w-full text-[9px] leading-relaxed">
                  <tbody>
                    <tr>
                      <td className="w-[15%] font-bold">Patient Name:</td>
                      <td className="w-[35%] font-medium">{printData.patientName}</td>
                      <td className="w-[15%] font-bold">UIN / MRN:</td>
                      <td className="w-[35%] font-semibold">{printData.mrNumber}</td>
                    </tr>
                    <tr>
                      <td className="font-bold">Age / Gender:</td>
                      <td className="font-medium">{printData.ageGender}</td>
                      <td className="font-bold">Prescription Date:</td>
                      <td className="font-semibold">{printData.date}</td>
                    </tr>
                    <tr>
                      <td className="font-bold">Contact No:</td>
                      <td className="font-medium">{printData.contactNumber}</td>
                      <td className="font-bold">Consultant:</td>
                      <td className="font-semibold">{printData.doctorName}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Diagnosis Section */}
              {printData.diagnosisText && (
                <div className="space-y-1">
                  <h3 className="font-bold text-[9px] uppercase border-b border-black pb-0.5">Diagnosis / Clinical Indications</h3>
                  <p className="text-[9px] font-bold text-slate-800 p-1.5 border border-slate-300 bg-slate-50">{printData.diagnosisText}</p>
                </div>
              )}

              {/* Prescribed Medications Table */}
              <div className="space-y-1">
                <h3 className="font-bold text-[9px] uppercase border-b border-black pb-0.5">Prescribed Medications (Rx)</h3>
                {printData.medications && printData.medications.length > 0 ? (
                  <table className="w-full border-collapse border border-black text-[9px]">
                    <thead>
                      <tr className="bg-gray-100 border-b border-black text-left">
                        <th className="border-r border-black p-1.5 font-bold w-[35%]">Medicine / Eyedrops</th>
                        <th className="border-r border-black p-1.5 font-bold w-[20%]">Dose / Route</th>
                        <th className="border-r border-black p-1.5 font-bold w-[20%]">Frequency</th>
                        <th className="border-r border-black p-1.5 font-bold w-[15%]">Duration</th>
                        <th className="p-1.5 font-bold text-center w-[10%]">Eye</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printData.medications.map((m: any, idx: number) => (
                        <tr key={idx} className="border-b border-black last:border-b-0">
                          <td className="border-r border-black p-1.5 font-bold">{m.drug || m.name || "—"}</td>
                          <td className="border-r border-black p-1.5">{m.dosage || m.dose || "—"} ({m.route || "Topical"})</td>
                          <td className="border-r border-black p-1.5">{m.frequency || "—"}</td>
                          <td className="border-r border-black p-1.5">{m.duration || "—"}</td>
                          <td className="p-1.5 text-center font-bold">{m.eye || "Both"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-[9px] italic text-slate-500 p-2 text-center border border-dashed border-slate-300">No medical prescriptions entered for this visit.</p>
                )}
              </div>

              {/* Clinical Advice / Advice */}
              {printData.notes && (
                <div className="space-y-1">
                  <h3 className="font-bold text-[9px] uppercase border-b border-black pb-0.5">Advice / Special Instructions</h3>
                  <div className="p-2 border border-slate-300 bg-slate-50 italic text-[9px] text-slate-700 leading-relaxed font-medium">
                    {printData.notes}
                  </div>
                </div>
              )}

              {/* Signature Section */}
              <div className="pt-10 flex justify-end">
                <div className="text-center w-48">
                  <div className="border-t border-dotted border-black pt-1">
                    <p className="text-[9px] font-black text-slate-800 uppercase">{printData.doctorName}</p>
                    <p className="text-[7.5px] text-gray-500 uppercase">Consulting Ophthalmologist</p>
                    <p className="text-[7px] text-gray-400">Reg No: 120/09</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(printType === 'all' || !printType) && (
            <>
              {/* Hospital Header */}
              <div className="border-b-2 border-black pb-1.5 flex justify-between items-start">
                <div className="flex flex-col gap-0.5 leading-none">
                  <span
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                    className="font-extrabold text-xs tracking-tight leading-none"
                  >
                    <span style={{ color: "#0F172A" }}>Vision</span>
                    <span style={{ color: "#2563EB" }}>Pulze</span>
                  </span>
                  <span className="text-[7px] font-semibold uppercase tracking-[0.22em] text-slate-400 mt-0.5">
                    Ophthalmic Ecosystem
                  </span>
                </div>
                <div className="text-right text-[8px] space-y-0.5">
                  <p><strong>Consulting Doctor:</strong> {printData.doctorName}</p>
                  <p><strong>Visit Date:</strong> {printData.date}</p>
                </div>
              </div>

              {/* Patient Info Block */}
              <div className="border border-black p-1.5 grid grid-cols-4 gap-2 text-[8px] bg-gray-50">
                <div><strong>Patient Name:</strong> {printData.patientName}</div>
                <div><strong>Age / Gender:</strong> {printData.ageGender}</div>
                <div><strong>MR Number:</strong> MR-{printData.mrNumber}</div>
                <div><strong>Contact Number:</strong> {printData.contactNumber}</div>
              </div>

              {/* Optometry & Refraction */}
              {printData.refraction && (() => {
                const rd = printData.refraction;
                return (
                  <div className="space-y-3">
                    <h2 className="text-[9px] font-bold uppercase border-b border-black pb-0.5">1. Optometry & Refraction</h2>
                    
                    {/* Visual Acuity Table */}
                    {rd.visualAcuity && (
                      <div className="space-y-1">
                        <span className="text-[7.5px] font-bold uppercase text-gray-500">Visual Acuity</span>
                        <table className="w-full border-collapse border border-black text-[8px]">
                          <thead>
                            <tr className="bg-gray-100 border-b border-black text-center">
                              <th className="border-r border-black p-0.5 text-left font-bold w-[120px]">Modality</th>
                              <th className="border-r border-black p-0.5 font-bold">OD (Right Eye)</th>
                              <th className="border-r border-black p-0.5 font-bold">OS (Left Eye)</th>
                              <th className="p-0.5 font-bold">OU (Both Eyes)</th>
                            </tr>
                          </thead>
                          <tbody className="text-center">
                            <tr className="border-b border-black">
                              <td className="border-r border-black p-0.5 text-left font-semibold">Unaided DV</td>
                              <td className="border-r border-black p-0.5">{fmtVA(rd.visualAcuity.OD?.unaided)}</td>
                              <td className="border-r border-black p-0.5">{fmtVA(rd.visualAcuity.OS?.unaided)}</td>
                              <td className="p-0.5">{fmtVA(rd.visualAcuity.OU?.unaided)}</td>
                            </tr>
                            <tr className="border-b border-black">
                              <td className="border-r border-black p-0.5 text-left font-semibold">Unaided NV</td>
                              <td className="border-r border-black p-0.5">{fmtVA(rd.visualAcuity.OD?.nearVision)}</td>
                              <td className="border-r border-black p-0.5">{fmtVA(rd.visualAcuity.OS?.nearVision)}</td>
                              <td className="p-0.5">{fmtVA(rd.visualAcuity.OU?.nearVision)}</td>
                            </tr>
                            <tr className="border-b border-black">
                              <td className="border-r border-black p-0.5 text-left font-semibold">Aided DV</td>
                              <td className="border-r border-black p-0.5">{fmtVA(rd.visualAcuity.OD?.aided)}</td>
                              <td className="border-r border-black p-0.5">{fmtVA(rd.visualAcuity.OS?.aided)}</td>
                              <td className="p-0.5">{fmtVA(rd.visualAcuity.OU?.aided)}</td>
                            </tr>
                            <tr>
                              <td className="border-r border-black p-0.5 text-left font-semibold">Pinhole Potential</td>
                              <td className="border-r border-black p-0.5">{fmtVA(rd.visualAcuity.OD?.pinhole)}</td>
                              <td className="border-r border-black p-0.5">{fmtVA(rd.visualAcuity.OS?.pinhole)}</td>
                              <td className="p-0.5">{fmtVA(rd.visualAcuity.OU?.pinhole)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      {/* Objective Measurements */}
                      <div className="space-y-1">
                        <span className="text-[7.5px] font-bold uppercase text-gray-500">Objective Measurements</span>
                        <table className="w-full border-collapse border border-black text-[8px]">
                          <thead>
                            <tr className="bg-gray-100 border-b border-black">
                              <th className="border-r border-black p-0.5 text-left font-bold">Method</th>
                              <th className="border-r border-black p-0.5 text-center font-bold">OD</th>
                              <th className="p-0.5 text-center font-bold">OS</th>
                            </tr>
                          </thead>
                          <tbody className="text-center">
                            <tr className="border-b border-black">
                              <td className="border-r border-black p-0.5 text-left font-semibold">Autoref (AR)</td>
                              <td className="border-r border-black p-0.5">
                                {rd.autoRef?.OD?.sphere1 ? `${fmtLens(rd.autoRef.OD.sphere1)} / ${fmtLens(rd.autoRef.OD.cylinder1)} × ${rd.autoRef.OD.axis1}°` : "—"}
                              </td>
                              <td className="p-0.5">
                                {rd.autoRef?.OS?.sphere1 ? `${fmtLens(rd.autoRef.OS.sphere1)} / ${fmtLens(rd.autoRef.OS.cylinder1)} × ${fmtLens(rd.autoRef.OS.axis1)}°` : "—"}
                              </td>
                            </tr>
                            <tr className="border-b border-black">
                              <td className="border-r border-black p-0.5 text-left font-semibold">Clinical Retinoscopy</td>
                              <td className="border-r border-black p-0.5">
                                {rd.objectiveRefraction?.OD?.sphere || rd.retinoscopy?.OD?.sphere ? `${fmtLens(rd.objectiveRefraction?.OD?.sphere || rd.retinoscopy?.OD?.sphere)} / ${fmtLens(rd.objectiveRefraction?.OD?.cylinder || rd.retinoscopy?.OD?.cylinder)} × ${rd.objectiveRefraction?.OD?.axis || rd.retinoscopy?.OD?.axis}°` : "—"}
                              </td>
                              <td className="p-0.5">
                                {rd.objectiveRefraction?.OS?.sphere || rd.retinoscopy?.OS?.sphere ? `${fmtLens(rd.objectiveRefraction?.OS?.sphere || rd.retinoscopy?.OS?.sphere)} / ${fmtLens(rd.objectiveRefraction?.OS?.cylinder || rd.retinoscopy?.OS?.cylinder)} × ${rd.objectiveRefraction?.OS?.axis || rd.retinoscopy?.OS?.axis}°` : "—"}
                              </td>
                            </tr>
                            {(rd.cycloplegic || rd.objectiveRefraction?.OD?.cycloSphere) && (
                              <tr>
                                <td className="border-r border-black p-0.5 text-left font-semibold">Cyclo / Dilated</td>
                                <td className="border-r border-black p-0.5">
                                  {rd.objectiveRefraction?.OD?.cycloSphere || rd.cycloplegic?.OD?.sphere ? `${fmtLens(rd.objectiveRefraction?.OD?.cycloSphere || rd.cycloplegic?.OD?.sphere)} / ${fmtLens(rd.objectiveRefraction?.OD?.cycloCylinder || rd.cycloplegic?.OD?.cylinder)} × ${rd.objectiveRefraction?.OD?.cycloAxis || rd.cycloplegic?.OD?.axis}°` : "—"}
                                </td>
                                <td className="p-0.5">
                                  {rd.objectiveRefraction?.OS?.cycloSphere || rd.cycloplegic?.OS?.sphere ? `${fmtLens(rd.objectiveRefraction?.OS?.cycloSphere || rd.cycloplegic?.OS?.sphere)} / ${fmtLens(rd.objectiveRefraction?.OS?.cycloCylinder || rd.cycloplegic?.OS?.cylinder)} × ${rd.objectiveRefraction?.OS?.cycloAxis || rd.cycloplegic?.OS?.axis}°` : "—"}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Subjective Acceptance */}
                      <div className="space-y-1">
                        <span className="text-[7.5px] font-bold uppercase text-gray-500">Subjective Acceptance</span>
                        <table className="w-full border-collapse border border-black text-[8px]">
                          <thead>
                            <tr className="bg-gray-100 border-b border-black">
                              <th className="border-r border-black p-0.5 text-left font-bold">Eye</th>
                              <th className="border-r border-black p-0.5 text-center font-bold">SPH</th>
                              <th className="border-r border-black p-0.5 text-center font-bold">CYL</th>
                              <th className="border-r border-black p-0.5 text-center font-bold">AXIS</th>
                              <th className="p-0.5 text-center font-bold">BCVA</th>
                            </tr>
                          </thead>
                          <tbody className="text-center">
                            <tr className="border-b border-black">
                              <td className="border-r border-black p-0.5 text-left font-semibold">OD (DV)</td>
                              <td className="border-r border-black p-0.5">{fmtLens(rd.acceptance?.distance?.OD?.sphere)}</td>
                              <td className="border-r border-black p-0.5">{fmtLens(rd.acceptance?.distance?.OD?.cylinder)}</td>
                              <td className="border-r border-black p-0.5">{rd.acceptance?.distance?.OD?.axis || "—"}</td>
                              <td className="p-0.5">{fmtVA(rd.acceptance?.distance?.OD?.vn)}</td>
                            </tr>
                            <tr className="border-b border-black">
                              <td className="border-r border-black p-0.5 text-left font-semibold">OD (NV)</td>
                              <td className="border-r border-black p-0.5">{fmtLens(rd.acceptance?.near?.OD?.sphere)}</td>
                              <td className="border-r border-black p-0.5">{fmtLens(rd.acceptance?.near?.OD?.cylinder)}</td>
                              <td className="border-r border-black p-0.5">{rd.acceptance?.near?.OD?.axis || "—"}</td>
                              <td className="p-0.5">{fmtVA(rd.acceptance?.near?.OD?.vn)}</td>
                            </tr>
                            <tr className="border-b border-black">
                              <td className="border-r border-black p-0.5 text-left font-semibold">OS (DV)</td>
                              <td className="border-r border-black p-0.5">{fmtLens(rd.acceptance?.distance?.OS?.sphere)}</td>
                              <td className="border-r border-black p-0.5">{fmtLens(rd.acceptance?.distance?.OS?.cylinder)}</td>
                              <td className="border-r border-black p-0.5">{rd.acceptance?.distance?.OS?.axis || "—"}</td>
                              <td className="p-0.5">{fmtVA(rd.acceptance?.distance?.OS?.vn)}</td>
                            </tr>
                            <tr>
                              <td className="border-r border-black p-0.5 text-left font-semibold">OS (NV)</td>
                              <td className="border-r border-black p-0.5">{fmtLens(rd.acceptance?.near?.OS?.sphere)}</td>
                              <td className="border-r border-black p-0.5">{fmtLens(rd.acceptance?.near?.OS?.cylinder)}</td>
                              <td className="border-r border-black p-0.5">{rd.acceptance?.near?.OS?.axis || "—"}</td>
                              <td className="p-0.5">{fmtVA(rd.acceptance?.near?.OS?.vn)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Anterior Findings / Diagnosis */}
              <div className="grid grid-cols-2 gap-4">
                {/* Slit Lamp & Anterior Segment */}
                {(() => {
                  const slitLamp = printData.slitLamp;
                  const eom = printData.eom;
                  if (!slitLamp && !eom) return null;
                  return (
                    <div className="space-y-1">
                      <h2 className="text-[9px] font-bold uppercase border-b border-black pb-0.5">2. Anterior Segment Findings</h2>
                      <table className="w-full border-collapse border border-black text-[8px]">
                        <thead>
                          <tr className="bg-gray-100 border-b border-black text-center font-bold">
                            <th className="border-r border-black p-0.5 text-left w-[120px]">Parameter</th>
                            <th className="border-r border-black p-0.5">OD (Right Eye)</th>
                            <th className="p-0.5">OS (Left Eye)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {slitLamp && Object.keys(slitLamp).filter(key => key !== 'dilation' && key !== 'gonioscopy' && key !== 'synaptophore').map((key) => {
                            const valOD = slitLamp[key]?.OD;
                            const valOS = slitLamp[key]?.OS;
                            if (!valOD && !valOS) return null;
                            return (
                              <tr key={key} className="border-b border-black last:border-b-0">
                                <td className="border-r border-black p-0.5 text-left font-semibold uppercase text-[7px]">{key}</td>
                                <td className="border-r border-black p-0.5 text-center">{valOD || "NAD"}</td>
                                <td className="p-0.5 text-center">{valOS || "NAD"}</td>
                              </tr>
                            );
                          })}
                          {eom && (
                            <tr className="border-t border-black">
                              <td className="border-r border-black p-0.5 text-left font-semibold uppercase text-[7px]">EOM motility</td>
                              <td className="border-r border-black p-0.5 text-center">{eom.OD || "Full"}</td>
                              <td className="p-0.5 text-center">{eom.OS || "Full"}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}

                {/* Fundus Examination */}
                {printData.fundus && (() => {
                  const f = printData.fundus;
                  const keys = Object.keys(f).filter(k => f[k]?.OD || f[k]?.OS);
                  if (keys.length === 0) return null;
                  return (
                    <div className="space-y-1">
                      <h2 className="text-[9px] font-bold uppercase border-b border-black pb-0.5">3. Posterior Segment (Fundus)</h2>
                      <table className="w-full border-collapse border border-black text-[8px]">
                        <thead>
                          <tr className="bg-gray-100 border-b border-black text-center font-bold">
                            <th className="border-r border-black p-0.5 text-left w-[120px]">Observation</th>
                            <th className="border-r border-black p-0.5">OD (Right Eye)</th>
                            <th className="p-0.5">OS (Left Eye)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {keys.map((key) => (
                            <tr key={key} className="border-b border-black last:border-b-0">
                              <td className="border-r border-black p-0.5 text-left font-semibold uppercase text-[7px]">{key === 'vitreous' ? 'Vitreous' : key === 'retina' ? 'Retina & Macula' : 'Optic Disc'}</td>
                              <td className="border-r border-black p-0.5 text-center">{f[key]?.OD || "NAD"}</td>
                              <td className="p-0.5 text-center">{f[key]?.OS || "NAD"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* Diagnosis Info */}
              {printData.diagnosisText && (
                <div className="space-y-1">
                  <h2 className="text-[9px] font-bold uppercase border-b border-black pb-0.5">4. Diagnosis Summary</h2>
                  <div className="p-1 border border-black text-[8px] bg-gray-50 font-bold">
                    {printData.diagnosisText}
                  </div>
                </div>
              )}

              {/* Medical Prescriptions */}
              {printData.medications && printData.medications.length > 0 && (
                <div className="space-y-1">
                  <h2 className="text-[9px] font-bold uppercase border-b border-black pb-0.5">5. Medical Prescriptions</h2>
                  <table className="w-full border-collapse border border-black text-[8px]">
                    <thead>
                      <tr className="bg-gray-100 border-b border-black text-left">
                        <th className="border-r border-black p-0.5 font-bold">Medicine</th>
                        <th className="border-r border-black p-0.5 font-bold">Dose / Route</th>
                        <th className="border-r border-black p-0.5 font-bold">Frequency</th>
                        <th className="border-r border-black p-0.5 font-bold">Duration</th>
                        <th className="p-0.5 font-bold text-center">Eye</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printData.medications.map((m: any, idx: number) => (
                        <tr key={idx} className="border-b border-black last:border-b-0">
                          <td className="border-r border-black p-0.5 font-bold">{m.drug || m.name || "—"}</td>
                          <td className="border-r border-black p-0.5">{m.dosage || m.dose || "—"} ({m.route || "Topical"})</td>
                          <td className="border-r border-black p-0.5">{m.frequency || "—"}</td>
                          <td className="border-r border-black p-0.5">{m.duration || "—"}</td>
                          <td className="p-0.5 text-center font-semibold">{m.eye || "Both"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Doctor Glass RX */}
              {(() => {
                const glassRx = printData.glassRx;
                if (glassRx) {
                  const hasDistance = ['OD', 'OS'].some(eye => glassRx.distance?.[eye]?.sphere || glassRx.distance?.[eye]?.cylinder || glassRx.distance?.[eye]?.axis);
                  const hasNear = ['OD', 'OS'].some(eye => glassRx.near?.[eye]?.sphere || glassRx.near?.[eye]?.cylinder || glassRx.near?.[eye]?.axis);
                  if (hasDistance || hasNear) {
                    return (
                      <div className="space-y-1">
                        <h2 className="text-[9px] font-bold uppercase border-b border-black pb-0.5">6. Final Glass RX</h2>
                        <div className="grid grid-cols-2 gap-4">
                          {hasDistance && (
                            <div className="space-y-1">
                              <span className="text-[7.5px] font-bold uppercase text-gray-500">Distance Vision (DV)</span>
                              <table className="w-full border-collapse border border-black text-[8px]">
                                <thead>
                                  <tr className="bg-gray-100 border-b border-black text-center">
                                    <th className="border-r border-black p-0.5 font-bold">Eye</th>
                                    <th className="border-r border-black p-0.5 font-bold">SPH</th>
                                    <th className="border-r border-black p-0.5 font-bold">CYL</th>
                                    <th className="p-0.5 font-bold">AXIS</th>
                                  </tr>
                                </thead>
                                <tbody className="text-center">
                                  {['OD', 'OS'].map((eye) => (
                                    <tr key={eye} className="border-b border-black last:border-b-0">
                                      <td className="border-r border-black p-0.5 font-semibold">{eye}</td>
                                      <td className="border-r border-black p-0.5">{glassRx.distance?.[eye]?.sphere || "0.00"}</td>
                                      <td className="border-r border-black p-0.5">{glassRx.distance?.[eye]?.cylinder || "0.00"}</td>
                                      <td className="p-0.5">{glassRx.distance?.[eye]?.axis || "0"}°</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {hasNear && (
                            <div className="space-y-1">
                              <span className="text-[7.5px] font-bold uppercase text-gray-500">Near Vision (NV)</span>
                              <table className="w-full border-collapse border border-black text-[8px]">
                                <thead>
                                  <tr className="bg-gray-100 border-b border-black text-center">
                                    <th className="border-r border-black p-0.5 font-bold">Eye</th>
                                    <th className="border-r border-black p-0.5 font-bold">SPH</th>
                                    <th className="border-r border-black p-0.5 font-bold">CYL</th>
                                    <th className="p-0.5 font-bold">AXIS</th>
                                  </tr>
                                </thead>
                                <tbody className="text-center">
                                  {['OD', 'OS'].map((eye) => (
                                    <tr key={eye} className="border-b border-black last:border-b-0">
                                      <td className="border-r border-black p-0.5 font-semibold">{eye}</td>
                                      <td className="border-r border-black p-0.5">{glassRx.near?.[eye]?.sphere || "0.00"}</td>
                                      <td className="border-r border-black p-0.5">{glassRx.near?.[eye]?.cylinder || "0.00"}</td>
                                      <td className="p-0.5">{glassRx.near?.[eye]?.axis || "0"}°</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                }
                return null;
              })()}

              {/* Remarks & Notes */}
              {(printData.notes || printData.posteriorSegment) && (() => {
                const postSeg = printData.posteriorSegment;
                const required = postSeg?.required && postSeg.required !== "Nothing selected" ? postSeg.required : null;
                const adminInstructions = postSeg?.adminInstructions && postSeg.adminInstructions !== "Standard administration" ? postSeg.adminInstructions : null;

                return (
                  <div className="space-y-1.5">
                    <h2 className="text-[9px] font-bold uppercase border-b border-black pb-0.5">7. Remarks & Instructions</h2>
                    {printData.notes && <p className="text-[8px]"><strong>Clinical Advice / Notes:</strong> {printData.notes}</p>}
                    {required && (
                      <p className="text-[8px]"><strong>Investigations Required:</strong> {typeof required === 'object' ? (Array.isArray(required) ? required.join(", ") : "—") : required} {postSeg.other ? `(${postSeg.other})` : ""}</p>
                    )}
                    {adminInstructions && <p className="text-[8px]"><strong>Administration Directions:</strong> {adminInstructions}</p>}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
  );
}

export default DoctorStation;
