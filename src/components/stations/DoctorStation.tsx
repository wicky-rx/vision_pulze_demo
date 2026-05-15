import { useState, useEffect, useCallback, useMemo } from "react";
import { Send, Eye, UserCheck, Loader2, User, ClipboardList, Stethoscope, Microscope, Glasses, Pill, History, Plus, Trash2, ChevronRight, FileText, RefreshCw, ShieldCheck, Activity, AlertCircle, CheckCircle2 } from "lucide-react";
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
import { API_BASE_URL } from "@/config";
import { RefractionSummaryView } from "./RefractionSummaryView";
import { getPatientAgeString, getPatientAgeNumber, cn, calculateSessionSlot } from "@/lib/utils";
import { sanitizeOptometryInput, getFieldTypeFromName } from "@/lib/validation";
import { ScanReportGallery } from "@/components/ScanReportGallery";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  // Form States
  const [investigation, setInvestigation] = useState({
    eom: { OD: "", OS: "" },
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
      dilation: "",
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
          if (d.investigation) setInvestigation(d.investigation);
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
      eom: { OD: "", OS: "" },
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
        dilation: "",
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
  }, [patient?.id, patient?.mrNumber]);
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
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/consultation/history/${patient.mrNumber}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setVisitHistory(data.visits || []);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchCurrentRefraction = async () => {
    if (!patient?.id) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/refraction/${patient.id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRefractionData(data);

        // Sync initial diagnosis values if provided by refraction
        if (!finalDiagnosis.OD && !finalDiagnosis.OS && data?.ocularComplaint) {
          setFinalDiagnosis({ OD: data.ocularComplaint, OS: data.ocularComplaint });
        }

        // Initialize glass prescription state from Refraction's final glass prescription, fallback to acceptance
        if (data?.glassPrescription?.OD?.sphere !== undefined || data?.acceptance?.distance) {
          setGlassPrescription({
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
          });
        }

        if (data?.contactLensPrescription) {
          // Map from Refraction station's flat eye format to PrescriptionState format
          setContactLensPrescription({
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
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/consultation/${patient.id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
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
                return data.finalGlassPrescription;
              }
              return prev;
            });
          }
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
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/patients/visits/${patient.id}/attend`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (response.ok) {
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

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/consultation/${patient.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          anteriorSegment: { slitLamp: investigation.slitLamp, eom: investigation.eom },
          fundusObservation: investigation.fundus,
          posteriorSegment: {
            required: investigation.required,
            other: investigation.other,
            adminInstructions: investigation.adminInstructions
          },
          diagnosisText: `OD: ${finalDiagnosis.OD} | OS: ${finalDiagnosis.OS}`,
          medicalPrescription: medications,
          finalGlassPrescription: glassPrescription,
          finalContactLensPrescription: contactLensPrescription,
          notes: investigation.opinion
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || "Failed to save consultation");

      toast({
        title: "Consultation Completed",
        description: "Clinical records and prescriptions have been successfully synchronized.",
        className: "bg-orange-600 text-white border-0 rounded-none font-bold"
      });

      // Clear draft on successful save
      const storageKey = `doctor_work_draft_${patient.mrNumber}`;
      localStorage.removeItem(storageKey);

      setLocalStatus("consulted");
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
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3 md:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 shadow-sm z-30 gap-4 md:gap-8 sticky top-0">
        <div className="flex items-center gap-4 md:gap-6 w-full sm:w-auto relative z-10">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-2.5 md:p-3.5 rounded-xl shrink-0 shadow-lg shadow-orange-200/50 hidden xs:flex items-center justify-center">
            <Stethoscope className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h2 className="text-base md:text-xl font-black text-slate-900 tracking-tight uppercase truncate">{patient.name || "UNNAMED PATIENT"}</h2>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge className="bg-orange-600 text-white text-[10px] md:text-xs px-2 md:px-3 font-mono tracking-widest rounded-full h-5 md:h-6 font-black border-2 border-white shadow-sm">MR-{patient.mrNumber || "0000"}</Badge>
                <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-[9px] md:text-xs px-2 font-black rounded-full h-5 md:h-6">T-{patient.tokenNumber || "—"}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[9px] md:text-[11px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50 w-fit px-2 py-0.5 rounded-md">
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
            <Badge className="bg-emerald-600 text-white border-0 gap-2 h-9 md:h-11 px-4 md:px-6 rounded-none font-black uppercase text-[10px] md:text-xs tracking-widest shadow-md shrink-0">
              <CheckCircle2 className="w-4 h-4 md:w-5 h-5" />
              Visit Completed
            </Badge>
          )}
          {localStatus === "refraction_done" && (
            <Button 
                onClick={handleAttend} 
                disabled={isAttending}
                className="h-10 md:h-12 bg-orange-600 hover:bg-black text-white px-6 md:px-8 font-black uppercase tracking-[0.2em] text-[10px] md:text-xs rounded-none shadow-xl transition-all gap-2"
            >
                {isAttending ? "Accessing..." : (
                    <>
                        <UserCheck className="w-4 h-4" /> Begin Consultation
                    </>
                )}
            </Button>
          )}
          {(localStatus === "doctor" || localStatus === "consulted") && (
            <Button
              className={cn(
                "h-10 md:h-12 px-6 md:px-8 font-black uppercase tracking-[0.2em] text-[10px] md:text-xs rounded-none shadow-xl transition-all gap-2",
                localStatus === "consulted" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-orange-600 hover:bg-black"
              )}
              onClick={saveConsultation}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {isSubmitting ? "Processing..." : (localStatus === "consulted" ? "Update Clinical Record" : "Finish and Signout")}
            </Button>
          )}

          <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
            <div className="text-right shrink-0">
              <div className="flex items-center justify-end gap-1.5 mb-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Medical Officer</p>
              </div>
              <p className="text-xs md:text-sm font-black text-slate-900 truncate max-w-[150px]">Lead Physician</p>
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

          <TabsContent value="summary" className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent bg-orange-50/50 p-8 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <Card className="col-span-2 clinical-card">
                <div className="p-8 border-b bg-orange-50/50">
                  <h3 className="text-lg font-black text-orange-600 uppercase tracking-wider flex items-center gap-3">
                    <User className="w-5 h-5" /> Patient Demographics
                  </h3>
                </div>
                <div className="p-4 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-y-8 sm:gap-y-10 gap-x-12">
                  <div className="space-y-2">
                    <label className="text-[12px] uppercase text-slate-400 font-black tracking-[0.2em]">Full Legal Name</label>
                    <p className="font-bold text-xl text-orange-600">{patient.name}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[12px] uppercase text-slate-400 font-black tracking-[0.2em]">Biological Gender & Age</label>
                    <p className="font-bold text-xl text-orange-600">{patient.gender}, {getPatientAgeString(patient)}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[12px] uppercase text-slate-400 font-black tracking-[0.2em]">Primary Contact</label>
                    <p className="font-bold text-lg">{patient.contactNumber}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[12px] uppercase text-slate-400 font-black tracking-[0.2em]">Secondary / Emergency</label>
                    <p className="font-bold text-lg text-slate-500">{patient.secondaryContact || "—"}</p>
                  </div>
                  <div className="space-y-2 col-span-2 p-6 bg-slate-50 border-l-4 border-slate-200">
                    <label className="text-[12px] uppercase text-slate-400 font-black tracking-[0.2em]">Residential Address</label>
                    <p className="font-medium text-base text-slate-700 leading-relaxed">
                      {patient.doorNo && `${patient.doorNo}, `}
                      {patient.street && `${patient.street}, `}
                      {patient.area && `${patient.area}, `}
                      {patient.city && `${patient.city}, `}
                      {patient.pincode}
                    </p>
                  </div>
                </div>
              </Card>

              <div className="space-y-8">
                <Card className="clinical-card !shadow-sm">
                  <div className="p-6 bg-orange-600 text-white">
                    <h4 className="text-xs font-black uppercase tracking-widest opacity-80 mb-1">Administrative Details</h4>
                    <p className="text-lg font-mono font-bold">MRN: {patient.mrNumber || "N/A"}</p>
                  </div>
                  <div className="p-6 space-y-5">
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registered At</span>
                      <span className="text-sm font-black text-orange-600">{patient.registeredAt || "09:12 AM"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Phase</span>
                      <Badge className="bg-status-doctor text-[12px] font-black h-6 uppercase px-3 rounded-none">Clinical Exam</Badge>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Waiting Duration</span>
                      <Badge variant="outline" className="border-slate-300 text-slate-600 font-mono font-bold rounded-none">{patient.waitTime || "14m"}</Badge>
                    </div>
                  </div>
                </Card>
                <Card className="shadow-md overflow-hidden bg-white p-4 sm:p-7 border-slate-200">
                  <ScanReportGallery mrNumber={patient.mrNumber?.toString()} />
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* 2. Diagnosis (from Refraction Station) */}
          <TabsContent value="diagnosis_history" className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent bg-orange-50/50 p-8 outline-none">
            <div className="max-w-5xl mx-auto space-y-8">
              <Card className="clinical-card bg-white shadow-md overflow-hidden">
                <div className="p-6 sm:p-8 border-b border-slate-100 bg-white">
                  <SectionHeader icon={ClipboardList} category="Clinical Assessment" title="Primary Diagnosis & History" />
                </div>
                <div className="clinical-section !p-10 space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-4">
                      <label className="clinical-label !bg-orange-50 !text-orange-700 !border-orange-200 border px-3 py-1.5 inline-block">Ocular Complaints</label>
                      <div className="p-6 bg-orange-50/30 border-l-8 border-orange-400 text-lg font-bold text-orange-600">
                        {refractionData?.ocularComplaint || "No primary complaints recorded."}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="clinical-label !bg-orange-50 !text-orange-700 !border-orange-200 border px-3 py-1.5 inline-block">Duration & Onset Details</label>
                      <div className="p-6 bg-slate-100/50 border-l-8 border-slate-400 text-lg font-medium">
                        {refractionData?.complaintNotes || "Duration not specified."}
                      </div>
                    </div>
                  </div>

                  <Separator className="my-8" />

                  <div className="space-y-4">
                    <label className="clinical-label !bg-orange-50 !text-orange-700 !border-orange-200 border px-3 py-1.5 inline-block">Systemic Health History</label>
                    <div className="flex gap-4 flex-wrap">
                      {(() => {
                        let items = refractionData?.systemicHistory;
                        if (typeof items === 'string' && items.startsWith('[')) {
                          try { items = JSON.parse(items); } catch (e) { }
                        }
                        if (items && Array.isArray(items) && items.length > 0) {
                          return items.map((h: any, i: number) => (
                            <Badge key={i} className="px-6 py-2 text-sm font-black border-2 border-orange-200 text-orange-600 bg-orange-50 rounded-none shadow-sm uppercase tracking-tighter">
                              {typeof h === 'string' ? h : `${h.condition || h.name || 'Condition'}${h.duration ? ` (${h.duration})` : ''}`}
                            </Badge>
                          ));
                        }
                        if (items && typeof items === 'string') {
                          return <Badge className="px-6 py-2 text-sm font-black border-2 border-orange-200 text-orange-600 bg-orange-50 rounded-none shadow-sm uppercase tracking-tighter">{items}</Badge>;
                        }
                        return <Badge className="px-6 py-2 text-sm font-bold border-2 border-slate-200 text-slate-500 bg-slate-50 rounded-none italic">No systemic factors reported</Badge>;
                      })()}
                    </div>
                  </div>

                  <Separator className="my-8" />

                  <div className="space-y-4">
                    <label className="clinical-label !bg-slate-100 !text-orange-600 !border-slate-200 border px-3 py-1.5 inline-block">Optometrist's Clinical Remarks</label>
                    <div className="p-8 bg-orange-600/5 rounded-none border border-orange-600/10 italic text-lg leading-relaxed text-orange-600 relative">
                      <span className="absolute -top-4 -left-2 text-6xl opacity-10 font-serif">“</span>
                      {refractionData?.optometristNotes ? refractionData.optometristNotes : "No specific remarks provided by the optometrist."}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* 3. Clinical Examination (Refraction Summary) */}
          <TabsContent value="clinical" className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent bg-orange-50/50 p-8 outline-none">
            <SectionHeader icon={ShieldCheck} category="Refraction Analysis" title="Subjective Acceptance Protocol" />
            <RefractionSummaryView data={{ ...refractionData, visitStatus: patient.status }} />
          </TabsContent>

          <TabsContent value="investigation" className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent bg-orange-50/50 p-2 lg:p-6 outline-none">
            <fieldset disabled={isLocked} className="contents">
              <div className="space-y-6 max-w-7xl mx-auto mb-8">
                {isLocked && (
                  <div className="bg-orange-100 border-l-4 border-orange-500 p-4 mb-4 flex items-center gap-4 shadow-sm animate-pulse-slow">
                    <AlertCircle className="w-6 h-6 text-orange-600" />
                    <div>
                      <h4 className="text-sm font-black text-orange-600 uppercase">Input Locked</h4>
                      <p className="text-xs font-bold text-orange-600">Please click "Begin Consultation" at the top to start entering diagnostic findings.</p>
                    </div>
                  </div>
                )}
                <Card className="clinical-card bg-white shadow-md overflow-hidden border border-slate-200">
                  <div className="p-6 sm:p-8 border-b border-slate-100 bg-white">
                    <SectionHeader icon={Microscope} category="Clinical Investigation" title="Diagnostic Profile & Findings" />
                  </div>
                  <div className="clinical-section !p-4 sm:!p-10 space-y-12">
                    <div className="space-y-6 bg-orange-50/50 p-4 sm:p-8 border border-orange-500/30">
                      <SectionHeader icon={Eye} category="Slit Lamp Profile" title="Anterior Segment" />
                      <div className="clinical-group bg-orange-50/30 border-2 border-orange-500/30 p-3 sm:p-6 shadow-sm">
                        <label className="clinical-label !bg-orange-50 !text-orange-600 !border-orange-100 border px-2 py-1 text-[12px] inline-block mb-3">Extra Ocular Movements (EOM)</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="flex flex-col flex-1 group">
                            <EyeIndicator eye="OD" />
                            <Input className="h-12 text-base sm:text-lg font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all shadow-sm" placeholder="NAD" value={investigation.eom.OD} onChange={e => updateInvestigation(['eom', 'OD'], e.target.value)} />
                          </div>
                          <div className="flex flex-col flex-1 group">
                            <EyeIndicator eye="OS" />
                            <Input className="h-12 text-base sm:text-lg font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all shadow-sm" placeholder="NAD" value={investigation.eom.OS} onChange={e => updateInvestigation(['eom', 'OS'], e.target.value)} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-orange-50/20 p-4 sm:p-6 border-x border-orange-100/30">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {[
                          { id: "lids", label: "Lids", color: "bg-orange-50 !text-orange-700 !border-orange-100 border" },
                          { id: "conjunctiva", label: "Conjunctiva", color: "bg-orange-50 !text-orange-700 !border-orange-100 border" },
                          { id: "sclera", label: "Sclera", color: "bg-orange-50 !text-orange-700 !border-orange-100 border" },
                          { id: "cornea", label: "Cornea", color: "bg-orange-50 !text-orange-700 !border-orange-100 border" },
                          { id: "ac", label: "Anterior Chamber", color: "bg-orange-50 !text-orange-700 !border-orange-100 border" },
                          { id: "iris", label: "Iris", color: "bg-orange-50 !text-orange-700 !border-orange-100 border" },
                          { id: "pupil", label: "Pupil", color: "bg-orange-50 !text-orange-700 !border-orange-100 border" },
                          { id: "lens", label: "Lens", color: "bg-orange-50 !text-orange-700 !border-orange-100 border" },
                        ].map((item) => (
                          <div key={item.id} className="clinical-group bg-white border border-slate-300 p-2 sm:p-4 space-y-4 shadow-sm">
                            <label className={cn("clinical-label !text-white px-2 py-1 text-[11px] inline-block", item.color)}>{item.label}</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="flex flex-col group">
                                <EyeIndicator eye="OD" />
                                <Input placeholder="NAD" className="h-10 sm:h-12 text-sm sm:text-lg font-black rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all shadow-sm" value={(investigation.slitLamp as any)[item.id].OD} onChange={e => updateInvestigation(['slitLamp', item.id, 'OD'], e.target.value)} />
                              </div>
                              <div className="flex flex-col group">
                                <EyeIndicator eye="OS" />
                                <Input placeholder="NAD" className="h-10 sm:h-12 text-sm sm:text-lg font-black rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all shadow-sm" value={(investigation.slitLamp as any)[item.id].OS} onChange={e => updateInvestigation(['slitLamp', item.id, 'OS'], e.target.value)} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-orange-50/10 p-4 sm:p-6 border-x border-b border-orange-100/30">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-4">
                          <label className="text-[12px] font-black uppercase !text-orange-700 !bg-orange-50 !border-orange-100 border px-3 py-1.5 inline-block tracking-widest">Gonioscopy Evaluation</label>
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-col group">
                              <EyeIndicator eye="OD" />
                              <Input placeholder="NAD" className="h-10 sm:h-11 text-sm font-black rounded-none bg-white border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-orange-600" value={investigation.slitLamp.gonioscopy.OD} onChange={e => updateInvestigation(['slitLamp', 'gonioscopy', 'OD'], e.target.value)} />
                            </div>
                            <div className="flex flex-col group">
                              <EyeIndicator eye="OS" />
                              <Input placeholder="NAD" className="h-10 sm:h-11 text-sm font-black rounded-none bg-white border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-orange-600" value={investigation.slitLamp.gonioscopy.OS} onChange={e => updateInvestigation(['slitLamp', 'gonioscopy', 'OS'], e.target.value)} />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <label className="text-[12px] font-black uppercase !text-orange-700 !bg-orange-50 !border-orange-100 border px-3 py-1.5 inline-block tracking-widest">Synaptophore Profile</label>
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-col group">
                              <EyeIndicator eye="OD" />
                              <Input placeholder="NAD" className="h-10 sm:h-11 text-sm font-black rounded-none bg-white border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-orange-600" value={investigation.slitLamp.synaptophore.OD} onChange={e => updateInvestigation(['slitLamp', 'synaptophore', 'OD'], e.target.value)} />
                            </div>
                            <div className="flex flex-col group">
                              <EyeIndicator eye="OS" />
                              <Input placeholder="NAD" className="h-10 sm:h-11 text-sm font-black rounded-none bg-white border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-orange-600" value={investigation.slitLamp.synaptophore.OS} onChange={e => updateInvestigation(['slitLamp', 'synaptophore', 'OS'], e.target.value)} />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <label className="text-[12px] font-black uppercase text-slate-400 tracking-widest pl-3 border-l-2 border-slate-300">Pupillary Dilation</label>
                          <Select value={investigation.slitLamp.dilation} onValueChange={v => updateInvestigation(['slitLamp', 'dilation'], v)}>
                            <SelectTrigger className="h-full min-h-[50px] text-sm font-bold rounded-none bg-white border-slate-200 focus:border-orange-600 focus:ring-0">
                              <SelectValue placeholder="Select Dilation Drug / Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                              <SelectItem value="NOT DILATED">NOT DILATED</SelectItem>
                              <SelectItem value="Tropicacyl (Tropicamide)">Tropicacyl (Tropicamide)</SelectItem>
                              <SelectItem value="Tropicacyl Plus (Phenylephrine)">Tropicacyl Plus (Phenylephrine)</SelectItem>
                              <SelectItem value="Cyclopentolate">Cyclopentolate</SelectItem>
                              <SelectItem value="Homatropine">Homatropine</SelectItem>
                              <SelectItem value="Atropine">Atropine</SelectItem>
                              <SelectItem value="Phenylephrine 10%">Phenylephrine 10%</SelectItem>
                              <SelectItem value="Fully Dilated">Fully Dilated (Already)</SelectItem>
                              <SelectItem value="Poor Dilation">Poor Dilation</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <Separator className="!my-8 opacity-25" />

                    <div className="space-y-6 bg-orange-50/50 p-3 sm:p-8 border-2 border-orange-200/70 rounded-none">
                      <SectionHeader icon={Activity} category="Retinal Analysis" title="Posterior Segment" />
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="clinical-group bg-white border border-slate-300 p-2 sm:p-5 space-y-4 shadow-sm">
                          <label className="clinical-label !bg-orange-50 !text-orange-700 !border-orange-100 border px-2 py-1 text-[11px] inline-block mb-3 sm:mb-0">Vitreous Environment</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col group">
                              <EyeIndicator eye="OD" />
                              <Input placeholder="NAD" className="h-10 sm:h-12 text-base font-black rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={investigation.fundus.vitreous.OD} onChange={e => updateInvestigation(['fundus', 'vitreous', 'OD'], e.target.value)} />
                            </div>
                            <div className="flex flex-col group">
                              <EyeIndicator eye="OS" />
                              <Input placeholder="NAD" className="h-10 sm:h-12 text-base font-black rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={investigation.fundus.vitreous.OS} onChange={e => updateInvestigation(['fundus', 'vitreous', 'OS'], e.target.value)} />
                            </div>
                          </div>
                        </div>
                        <div className="clinical-group bg-white border border-slate-300 p-2 sm:p-5 space-y-4 shadow-sm">
                          <label className="clinical-label !bg-orange-50 !text-orange-700 !border-orange-100 border px-2 py-1 text-[11px] inline-block mb-3 sm:mb-0">Retina & Macula Findings</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col group">
                              <EyeIndicator eye="OD" />
                              <Input placeholder="NAD" className="h-10 sm:h-12 text-base font-black rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={investigation.fundus.retina.OD} onChange={e => updateInvestigation(['fundus', 'retina', 'OD'], e.target.value)} />
                            </div>
                            <div className="flex flex-col group">
                              <EyeIndicator eye="OS" />
                              <Input placeholder="NAD" className="h-10 sm:h-12 text-base font-black rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={investigation.fundus.retina.OS} onChange={e => updateInvestigation(['fundus', 'retina', 'OS'], e.target.value)} />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                        <div className="clinical-group bg-white border border-slate-300 p-2 sm:p-5 space-y-4 shadow-sm">
                          <label className="clinical-label !bg-orange-50 !text-orange-600 !border-orange-100 border px-2 py-1 text-[11px] inline-block mb-3 sm:mb-0">Optic Disc Profile</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col group">
                              <EyeIndicator eye="OD" />
                              <Input placeholder="Healthy Disc" className="h-10 sm:h-12 text-base font-black rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={investigation.fundus.disc.OD} onChange={e => updateInvestigation(['fundus', 'disc', 'OD'], e.target.value)} />
                            </div>
                            <div className="flex flex-col group">
                              <EyeIndicator eye="OS" />
                              <Input placeholder="Healthy Disc" className="h-10 sm:h-12 text-base font-black rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={investigation.fundus.disc.OS} onChange={e => updateInvestigation(['fundus', 'disc', 'OS'], e.target.value)} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="!my-8 opacity-25" />

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="clinical-group bg-white border border-slate-300 p-2 sm:p-5 space-y-2 shadow-sm">
                          <Label className="text-[11px] font-black uppercase tracking-widest text-orange-600">Applanation Tonometry (IOP)</Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col flex-1">
                              <EyeIndicator eye="OD" />
                              <Input placeholder="mmHg" className="h-10 sm:h-12 text-sm sm:text-lg font-black rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={investigation.slitLamp.tonometry.OD} onChange={e => updateInvestigation(['slitLamp', 'tonometry', 'OD'], e.target.value, 'iop')} />
                            </div>
                            <div className="flex flex-col flex-1">
                              <EyeIndicator eye="OS" />
                              <Input placeholder="mmHg" className="h-10 sm:h-12 text-sm sm:text-lg font-black rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={investigation.slitLamp.tonometry.OS} onChange={e => updateInvestigation(['slitLamp', 'tonometry', 'OS'], e.target.value, 'iop')} />
                            </div>
                          </div>
                        </div>
                        <div className="clinical-group bg-white border border-slate-300 p-3 sm:p-5 space-y-2 shadow-sm">
                          <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Required Investigations</Label>
                          <Select value={investigation.required} onValueChange={v => setInvestigation({ ...investigation, required: v })}>
                            <SelectTrigger className="h-12 text-sm font-bold rounded-none border-slate-300 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-sm focus:ring-0 focus:ring-offset-0 focus:border-orange-600"><SelectValue placeholder="Select type..." /></SelectTrigger>
                            <SelectContent className="rounded-none font-bold">
                              <SelectItem value="Nothing selected">Nothing selected</SelectItem>
                              <SelectItem value="OCT">OCT: Optical Coherence Tomography</SelectItem>
                              <SelectItem value="Fundus Photography">Fundus Photography / FFA</SelectItem>
                              <SelectItem value="HVFA">HVFA: Humphrey Fields</SelectItem>
                              <SelectItem value="Topography">Corneal Topography</SelectItem>
                              <SelectItem value="Biometry">A-Scan / Biometry</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="clinical-group bg-white border border-slate-300 p-2 sm:p-5 space-y-4 shadow-sm">
                        <Label className="text-[12px] font-black uppercase tracking-widest text-slate-500">Other / Specification</Label>
                        <Input placeholder="Specify other investigations..." className="h-12 text-sm font-bold rounded-none border-slate-300 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-sm focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={investigation.other} onChange={e => updateInvestigation(['other'], e.target.value)} />
                      </div>
                      <div className="clinical-group bg-white border border-slate-300 p-2 sm:p-5 space-y-4 shadow-sm">
                        <Label className="text-[12px] font-black uppercase tracking-widest text-slate-500">Clinical Opinion</Label>
                        <Textarea placeholder="Detailed findings..." className="min-h-[140px] text-base font-medium rounded-none border-slate-300 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 p-5 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={investigation.opinion} onChange={e => updateInvestigation(['opinion'], e.target.value)} />
                      </div>
                      <div className="clinical-group bg-white border border-slate-300 p-3 sm:p-8 space-y-4 shadow-md">
                        <Label className="clinical-label !bg-orange-50 !text-orange-700 !border-orange-100 border px-3 py-1.5 inline-block">Final Clinical Diagnosis</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                          <div className="flex flex-col flex-1 group">
                            <EyeIndicator eye="OD" />
                            <Textarea placeholder="Final OD Diagnosis..." className="min-h-[100px] sm:min-h-[120px] text-lg sm:text-xl font-black text-orange-600 rounded-none border-orange-100 bg-orange-50/10 p-4 sm:p-6 flex-1 shadow-inner focus:bg-white focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all" value={finalDiagnosis.OD || ""} onChange={e => setFinalDiagnosis(prev => ({ ...prev, OD: sanitizeOptometryInput(e.target.value, 'notes') }))} />
                          </div>
                          <div className="flex flex-col flex-1 group" >
                            <EyeIndicator eye="OS" />
                            <Textarea placeholder="Final OS Diagnosis..." className="min-h-[100px] sm:min-h-[120px] text-lg sm:text-xl font-black text-orange-600 rounded-none border-orange-100 bg-orange-50/10 p-4 sm:p-6 flex-1 shadow-inner focus:bg-white focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all" value={finalDiagnosis.OS || ""} onChange={e => setFinalDiagnosis(prev => ({ ...prev, OS: sanitizeOptometryInput(e.target.value, 'notes') }))} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </fieldset>
          </TabsContent>
          {/* 5. Glass Prescription */}
          <TabsContent value="glass" className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent bg-orange-50/50 p-8 outline-none">
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
                        <label className="text-[11px] font-black uppercase tracking-[0.15em] text-orange-700">Refraction Acceptance Data (Read-Only)</label>
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
                      <h3 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tighter">Final Spectacles Prescription</h3>
                    </div>
                  </div>
                  <div className="p-6">
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
                                  <Input
                                    className="h-12 text-center text-lg font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all"
                                    value={(glassPrescription.distance as any)[eye].sphere}
                                    onChange={e => updateGlassPrescription('distance', eye as any, 'sphere', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    className="h-12 text-center text-lg font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all"
                                    value={(glassPrescription.distance as any)[eye].cylinder}
                                    onChange={e => updateGlassPrescription('distance', eye as any, 'cylinder', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    className="h-12 text-center text-lg font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all"
                                    value={(glassPrescription.distance as any)[eye].axis}
                                    onChange={e => updateGlassPrescription('distance', eye as any, 'axis', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell className="bg-orange-50/20">
                                  <Input
                                    className="h-12 text-center text-lg font-black bg-white rounded-none border-orange-100 focus:border-orange-600 focus:ring-0 transition-all"
                                    value={(glassPrescription.near as any)[eye].sphere}
                                    onChange={e => updateGlassPrescription('near', eye as any, 'sphere', e.target.value)}
                                    placeholder="+"
                                  />
                                </TableCell>
                                <TableCell className="bg-orange-50/20 border-l border-slate-200">
                                  <Input
                                    className="h-12 text-center text-lg font-black bg-white rounded-none border-orange-100 focus:border-orange-600 focus:ring-0 transition-all"
                                    value={(glassPrescription.near as any)[eye].cylinder}
                                    onChange={e => updateGlassPrescription('near', eye as any, 'cylinder', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell className="bg-orange-50/20">
                                  <Input
                                    className="h-12 text-center text-lg font-black bg-white rounded-none border-orange-100 focus:border-orange-600 focus:ring-0 transition-all"
                                    value={(glassPrescription.near as any)[eye].axis}
                                    onChange={e => updateGlassPrescription('near', eye as any, 'axis', e.target.value)}
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
                              <Input
                                className="h-11 text-center text-sm font-black bg-white rounded-none border-slate-200"
                                value={(glassPrescription.distance as any)[eye].sphere}
                                onChange={e => updateGlassPrescription('distance', eye as any, 'sphere', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-slate-400">DV (CYL)</label>
                              <Input
                                className="h-11 text-center text-sm font-black bg-white rounded-none border-slate-200"
                                value={(glassPrescription.distance as any)[eye].cylinder}
                                onChange={e => updateGlassPrescription('distance', eye as any, 'cylinder', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-slate-400">DV (AXIS)</label>
                              <Input
                                className="h-11 text-center text-sm font-black bg-white rounded-none border-slate-200"
                                value={(glassPrescription.distance as any)[eye].axis}
                                onChange={e => updateGlassPrescription('distance', eye as any, 'axis', e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="pt-2 grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-orange-600">NV (SPH)</label>
                              <Input
                                className="h-11 text-center font-black bg-orange-50/10 border-orange-100 rounded-none text-orange-600"
                                value={(glassPrescription.near as any)[eye].sphere}
                                onChange={e => updateGlassPrescription('near', eye as any, 'sphere', e.target.value)}
                                placeholder="+"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-orange-600">NV (CYL)</label>
                              <Input
                                className="h-11 text-center font-black bg-orange-50/10 border-orange-100 rounded-none text-orange-600"
                                value={(glassPrescription.near as any)[eye].cylinder}
                                onChange={e => updateGlassPrescription('near', eye as any, 'cylinder', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-orange-600">NV (AXIS)</label>
                              <Input
                                className="h-11 text-center font-black bg-orange-50/10 border-orange-100 rounded-none text-orange-600"
                                value={(glassPrescription.near as any)[eye].axis}
                                onChange={e => updateGlassPrescription('near', eye as any, 'axis', e.target.value)}
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
                      <h3 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tighter">Final Contact Lens Prescription</h3>
                    </div>
                  </div>
                  <div className="p-6">
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
                                  <Input
                                    className="h-12 text-center text-lg font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all"
                                    value={(contactLensPrescription.distance as any)[eye].sphere}
                                    onChange={e => updateContactLensPrescription('distance', eye as any, 'sphere', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    className="h-12 text-center text-lg font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all"
                                    value={(contactLensPrescription.distance as any)[eye].cylinder}
                                    onChange={e => updateContactLensPrescription('distance', eye as any, 'cylinder', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    className="h-12 text-center text-lg font-black bg-white rounded-none border-slate-200 focus:border-orange-600 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all"
                                    value={(contactLensPrescription.distance as any)[eye].axis}
                                    onChange={e => updateContactLensPrescription('distance', eye as any, 'axis', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell className="bg-orange-50/20">
                                  <Input
                                    className="h-12 text-center text-lg font-black bg-white rounded-none border-orange-100 focus:border-orange-600 focus:ring-0 transition-all"
                                    value={(contactLensPrescription.near as any)[eye].sphere}
                                    onChange={e => updateContactLensPrescription('near', eye as any, 'sphere', e.target.value)}
                                    placeholder="+"
                                  />
                                </TableCell>
                                <TableCell className="bg-orange-50/20 border-l border-slate-200">
                                  <Input
                                    className="h-12 text-center text-lg font-black bg-white rounded-none border-orange-100 focus:border-orange-600 focus:ring-0 transition-all"
                                    value={(contactLensPrescription.near as any)[eye].cylinder}
                                    onChange={e => updateContactLensPrescription('near', eye as any, 'cylinder', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell className="bg-orange-50/20">
                                  <Input
                                    className="h-12 text-center text-lg font-black bg-white rounded-none border-orange-100 focus:border-orange-600 focus:ring-0 transition-all"
                                    value={(contactLensPrescription.near as any)[eye].axis}
                                    onChange={e => updateContactLensPrescription('near', eye as any, 'axis', e.target.value)}
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
                              <Input
                                className="h-11 text-center text-sm font-black bg-white rounded-none border-slate-200"
                                value={(contactLensPrescription.distance as any)[eye].sphere}
                                onChange={e => updateContactLensPrescription('distance', eye as any, 'sphere', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-slate-400">DV (CYL)</label>
                              <Input
                                className="h-11 text-center text-sm font-black bg-white rounded-none border-slate-200"
                                value={(contactLensPrescription.distance as any)[eye].cylinder}
                                onChange={e => updateContactLensPrescription('distance', eye as any, 'cylinder', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-slate-400">DV (AXIS)</label>
                              <Input
                                className="h-11 text-center text-sm font-black bg-white rounded-none border-slate-200"
                                value={(contactLensPrescription.distance as any)[eye].axis}
                                onChange={e => updateContactLensPrescription('distance', eye as any, 'axis', e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="pt-2 grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-orange-600">NV (SPH)</label>
                              <Input
                                className="h-11 text-center font-black bg-orange-50/10 border-orange-100 rounded-none text-orange-600"
                                value={(contactLensPrescription.near as any)[eye].sphere}
                                onChange={e => updateContactLensPrescription('near', eye as any, 'sphere', e.target.value)}
                                placeholder="+"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-orange-600">NV (CYL)</label>
                              <Input
                                className="h-11 text-center font-black bg-orange-50/10 border-orange-100 rounded-none text-orange-600"
                                value={(contactLensPrescription.near as any)[eye].cylinder}
                                onChange={e => updateContactLensPrescription('near', eye as any, 'cylinder', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-orange-600">NV (AXIS)</label>
                              <Input
                                className="h-11 text-center font-black bg-orange-50/10 border-orange-100 rounded-none text-orange-600"
                                value={(contactLensPrescription.near as any)[eye].axis}
                                onChange={e => updateContactLensPrescription('near', eye as any, 'axis', e.target.value)}
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
          <TabsContent value="medical" className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent bg-orange-50/50 p-8 outline-none">
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
                            <TableRow key={med.id} className="h-20 hover:bg-orange-50/50 transition-colors">
                              <TableCell className="text-center font-black text-slate-300">{index + 1}</TableCell>
                              <TableCell>
                                <Input className="h-12 text-sm font-black border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none bg-white focus:bg-yellow-50/30 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all" value={med.drug} onChange={e => updateMedication(med.id, "drug", e.target.value)} placeholder="e.g. Moxifloxacin Eye Drops" />
                              </TableCell>
                              <TableCell>
                                <Input className="h-12 text-sm font-bold border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none bg-white focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={med.dosage} onChange={e => updateMedication(med.id, "dosage", e.target.value)} placeholder="1 Drop" />
                              </TableCell>
                              <TableCell>
                                <Select value={med.route} onValueChange={v => updateMedication(med.id, "route", v)}>
                                  <SelectTrigger className="h-12 text-sm font-bold rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0 focus:border-orange-600"><SelectValue /></SelectTrigger>
                                  <SelectContent className="rounded-none">
                                    <SelectItem value="Topical">Topical / Ocular</SelectItem>
                                    <SelectItem value="Oral">Oral / Systemic</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Input className="h-12 text-sm font-bold border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none bg-white focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={med.frequency} onChange={e => updateMedication(med.id, "frequency", e.target.value)} placeholder="QID (4 times)" />
                              </TableCell>
                              <TableCell>
                                <Input className="h-12 text-sm font-bold border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none bg-white font-mono focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={med.duration} onChange={e => updateMedication(med.id, "duration", e.target.value)} placeholder="5 Days" />
                              </TableCell>
                              <TableCell>
                                <Select value={med.eye} onValueChange={v => updateMedication(med.id, "eye", v)}>
                                  <SelectTrigger className="h-12 text-sm font-bold rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0"><SelectValue /></SelectTrigger>
                                  <SelectContent className="rounded-none">
                                    <SelectItem value="Both">Both Eyes (OU)</SelectItem>
                                    <SelectItem value="Right">Right Eye (OD)</SelectItem>
                                    <SelectItem value="Left">Left Eye (OS)</SelectItem>
                                  </SelectContent>
                                </Select>
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
                            <Input className="h-12 text-sm font-black border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none bg-slate-50/30" value={med.drug} onChange={e => updateMedication(med.id, "drug", e.target.value)} placeholder="Drug Name" />
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400">Dosage</label>
                                <Input className="h-10 text-xs font-bold rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={med.dosage} onChange={e => updateMedication(med.id, "dosage", e.target.value)} placeholder="Dosage" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400">Duration</label>
                                <Input className="h-10 text-xs font-bold rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={med.duration} onChange={e => updateMedication(med.id, "duration", e.target.value)} placeholder="Duration" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400">Frequency</label>
                                <Input className="h-10 text-xs font-bold rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0" value={med.frequency} onChange={e => updateMedication(med.id, "frequency", e.target.value)} placeholder="Frequency" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400">Eye</label>
                                <Select value={med.eye} onValueChange={v => updateMedication(med.id, "eye", v)}>
                                  <SelectTrigger className="h-10 text-xs font-bold rounded-none border-slate-200 focus:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0"><SelectValue /></SelectTrigger>
                                  <SelectContent className="rounded-none">
                                    <SelectItem value="Both">Both (OU)</SelectItem>
                                    <SelectItem value="Right">Right (OD)</SelectItem>
                                    <SelectItem value="Left">Left (OS)</SelectItem>
                                  </SelectContent>
                                </Select>
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
          <TabsContent value="history" className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent bg-orange-50/50 p-8 outline-none">
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
        </Tabs>
      </div>

      <Dialog open={isHistoryDetailsOpen} onOpenChange={(open) => {
        setIsHistoryDetailsOpen(open);
        if (!open) setSelectedHistoricalVisit(null);
      }}>
        <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] p-0 overflow-hidden bg-slate-50 flex flex-col rounded-none border-0 shadow-2xl">
          {selectedHistoricalVisit && (
            <>
              <DialogHeader className="bg-orange-600 text-white p-5 sm:p-7 shrink-0 border-b border-white/10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  {/* Branding & Visit Info Group */}
                  <div className="flex flex-1 items-center gap-4 sm:gap-6 min-w-0">
                    <div className="w-20 sm:w-48 h-10 sm:h-16 shrink-0 flex items-center justify-start">
                      <img
                        src="https://res.cloudinary.com/autodapp/image/upload/v1775219907/VPN%20Eye%20Hospital%20Logo.png"
                        alt="VPN Logo"
                        className="w-full h-full object-contain object-left"
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h2 className="text-lg sm:text-xl font-black tracking-tighter uppercase leading-none mb-1 truncate">VPN Eye Hospital</h2>
                      <p className="text-[10px] sm:text-[11px] font-bold text-white/50 uppercase tracking-widest leading-relaxed mb-2 truncate max-w-[200px] sm:max-w-none">
                        25, Neela West Street, Nagapattinam - 611001
                      </p>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Badge className="bg-orange-600/20 text-orange-400 border border-orange-500/30 text-[7px] sm:text-[10px] rounded-none px-2 font-black uppercase">Visit Record</Badge>
                        <span className="text-xs sm:text-sm font-black tracking-tight text-white/90">
                          {new Date(selectedHistoricalVisit.visitedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Context Group */}
                  <div className="flex flex-col sm:items-end gap-1 border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0 w-full sm:w-auto">
                    <span className="text-[11px] font-black text-orange-300 uppercase tracking-[0.2em] mb-1">Consulting Lead</span>
                    <p className="text-base font-black text-white tracking-tight uppercase">
                      {selectedHistoricalVisit.consultation?.doctorName || selectedHistoricalVisit.consultingDoctorName || "Dr. Clinical Lead"}
                    </p>
                    <span className="text-[11px] font-mono font-bold text-white/30 truncate max-w-[200px]">ID: {selectedHistoricalVisit.id}</span>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="flex-1 overflow-y-auto w-full">
                <div className="p-4 sm:p-6 space-y-8 sm:space-y-10">
                  {/* Refraction Data Part */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 border-b-2 border-slate-900 pb-3 mb-4 sm:mb-6 w-fit">
                      <Eye className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
                      <h3 className="text-xl sm:text-3xl font-black text-orange-600 uppercase tracking-tighter">Optometry Evaluation</h3>
                    </div>
                    {selectedHistoricalVisit.refraction ? (
                      <RefractionSummaryView data={selectedHistoricalVisit.refraction} />
                    ) : (
                      <div className="p-8 bg-white border-2 border-dashed border-slate-200 text-center opacity-60 italic font-bold text-slate-400">
                        No refraction protocol documented for this visit.
                      </div>
                    )}
                  </div>

                  {/* Consultation Summary Part */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 py-3 mb-4 border-b border-slate-100">
                      <div className="p-3 bg-orange-600 text-white shadow-lg"><Stethoscope className="w-6 h-6 shrink-0" /></div>
                      <div className="flex flex-col">
                        <span className="text-[12px] font-black uppercase tracking-widest text-orange-600 mb-0.5">Clinical Consultation</span>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tighter">Doctor's Consultation</h3>
                      </div>
                    </div>

                    {selectedHistoricalVisit.consultation ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="clinical-card col-span-2">
                          <div className="p-4 border-b border-slate-100 bg-white flex items-center gap-4">
                            <div className="p-2.5 bg-orange-600 text-white shadow-md"><Microscope className="w-5 h-5 shrink-0" /></div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-0.5">Clinical Investigation</span>
                              <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Diagnostic Observations</h4>
                            </div>
                          </div>
                          <div className="p-4 sm:p-6 space-y-6">
                            {/* Slit Lamp Profile */}
                            {(() => {
                              try {
                                const raw = selectedHistoricalVisit.consultation?.anteriorSegment;
                                const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                                if (!parsed) return null;

                                const slitLamp = parsed.slitLamp || parsed;
                                const eom = parsed.eom;

                                return (
                                  <div className="space-y-4">
                                    <label className="text-[12px] font-black uppercase text-slate-400 tracking-widest">Slit Lamp Assessment (Anterior Segment)</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {['OD', 'OS'].map((eye) => (
                                        <div key={eye} className="p-3 bg-white border border-slate-200 flex flex-col gap-2 shadow-sm">
                                          <div className={cn("text-[12px] font-black px-2 py-0.5 w-fit mb-1", eye === 'OD' ? "bg-orange-50 text-orange-600" : "bg-orange-50 text-orange-600")}>{eye} FINDINGS</div>
                                          <div className="space-y-1">
                                            {Object.entries(slitLamp).filter(([k, v]) => k !== 'dilation' && v && typeof v === 'object' && (v as any)[eye]).map(([key, val]: [string, any]) => {
                                              const displayVal = val[eye];
                                              if (displayVal && typeof displayVal === 'object' && !Array.isArray(displayVal)) {
                                                return null;
                                              }
                                              return (
                                                <div key={key} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0 gap-4">
                                                  <span className="text-[11px] font-bold uppercase text-slate-400 shrink-0">{key}</span>
                                                  <p className="text-[12px] font-black text-slate-700 text-right truncate">{displayVal || "—"}</p>
                                                </div>
                                              );
                                            })}
                                          </div>
                                          {eom && (eom as any)[eye] && (
                                            <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center gap-4">
                                              <span className="text-[11px] font-bold uppercase text-slate-400 shrink-0">EOM</span>
                                              <p className="text-[12px] font-black text-orange-600 text-right truncate">{(eom as any)[eye]}</p>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                    {slitLamp.dilation && (
                                      <div className="p-3 bg-orange-50/50 border border-orange-100 flex justify-between items-center">
                                        <span className="text-[11px] font-black uppercase text-orange-700 tracking-widest">Pupillary Dilation Response</span>
                                        <p className="text-xs font-black text-orange-600">{slitLamp.dilation}</p>
                                      </div>
                                    )}
                                  </div>
                                );
                              } catch (e) { return null; }
                            })()}

                            {/* Fundus Profile */}
                            {(() => {
                              try {
                                const raw = selectedHistoricalVisit.consultation?.fundusObservation;
                                const fundus = typeof raw === 'string' ? JSON.parse(raw) : raw;
                                if (!fundus) return null;
                                return (
                                  <div className="space-y-4">
                                    <label className="text-[12px] font-black uppercase text-slate-400 tracking-widest">Fundus Assessment (Posterior Segment)</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {['OD', 'OS'].map((eye) => (
                                        <div key={eye} className="p-3 bg-white border border-slate-200 flex flex-col gap-2 shadow-sm">
                                          <div className={cn("text-[12px] font-black px-2 py-0.5 w-fit mb-1", eye === 'OD' ? "bg-orange-50 text-orange-600" : "bg-orange-50 text-orange-600")}>{eye} OPHTHALMOSCOPY</div>
                                          <div className="space-y-1">
                                            {Object.entries(fundus).filter(([k, v]) => v && typeof v === 'object' && (v as any)[eye]).map(([key, val]: [string, any]) => {
                                              const displayVal = val[eye];
                                              if (displayVal && typeof displayVal === 'object' && !Array.isArray(displayVal)) {
                                                return null;
                                              }
                                              return (
                                                <div key={key} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0 gap-4">
                                                  <span className="text-[11px] font-bold uppercase text-slate-400 shrink-0">{key}</span>
                                                  <p className="text-[12px] font-black text-orange-600 text-right truncate">{displayVal || "—"}</p>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )
                              } catch (e) { return null; }
                            })()}
                          </div>
                        </Card>

                        <Card className="clinical-card col-span-2">
                          <div className="p-4 sm:p-6 border-b bg-orange-50/50">
                            <label className="text-[11px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-200 pb-2 mb-4 block">Final Assessment & Diagnosis</label>
                            {(() => {
                              const parts = selectedHistoricalVisit.consultation?.diagnosisText?.split(' | ') || [];
                              const od = parts[0]?.replace('OD: ', '') || "—";
                              const os = parts.length > 1 ? parts[1].replace('OS: ', '') : "—";
                              return (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                  <div className="space-y-3">
                                    <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-100 px-3 py-1">OD</span>
                                    <p className="text-base sm:text-lg font-black text-orange-600 bg-white p-3 border-l-[4px] border-orange-600 shadow-sm uppercase">{od}</p>
                                  </div>
                                  <div className="space-y-3">
                                    <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-100 px-3 py-1">OS</span>
                                    <p className="text-base sm:text-lg font-black text-orange-600 bg-white p-3 border-l-[4px] border-orange-600 shadow-sm uppercase">{os}</p>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                          <div className="p-4 sm:p-6 bg-slate-50/20 shadow-inner">
                            <label className="text-[11px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-200 pb-2 mb-4 block">Doctor's Clinical Notes</label>
                            <p className="text-base font-medium italic text-slate-700 leading-relaxed border-l-4 border-slate-400 pl-4 sm:pl-6">{selectedHistoricalVisit.consultation?.notes || "No specific consultative remarks."}</p>

                            {/* General Observations & Metadata */}
                            {(() => {
                              try {
                                const raw = selectedHistoricalVisit.consultation?.posteriorSegment;
                                const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                                if (!parsed) return null;
                                return (
                                  <div className="space-y-4 pt-6 mt-6 border-t border-slate-200">
                                    <label className="text-[12px] font-black uppercase text-slate-400 tracking-widest">Administrative & Diagnostic Metadata</label>
                                    <div className="p-4 sm:p-6 bg-slate-100/50 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                                      <div className="space-y-2">
                                        <span className="text-[12px] font-black text-slate-400 uppercase">Required Investigations</span>
                                        <p className="text-sm font-bold text-slate-900">{typeof parsed.required === 'object' ? (Array.isArray(parsed.required) ? parsed.required.join(", ") : "—") : (parsed.required || "No labs required")}</p>
                                        {parsed.other && <p className="text-xs font-medium text-slate-600 italic">Specification: {typeof parsed.other === 'object' ? JSON.stringify(parsed.other) : parsed.other}</p>}
                                      </div>
                                      <div className="space-y-2">
                                        <span className="text-[12px] font-black text-slate-400 uppercase">Pharmacist Instructions</span>
                                        <p className="text-sm font-bold text-slate-900">{typeof parsed.adminInstructions === 'object' ? JSON.stringify(parsed.adminInstructions) : (parsed.adminInstructions || "Standard administration")}</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              } catch (e) { return null; }
                            })()}
                          </div>
                        </Card>

                        {/* Prescriptions Summary */}
                        <Card className="clinical-card col-span-2">
                          <div className="p-4 border-b border-slate-100 bg-white flex items-center gap-4">
                            <div className="p-2.5 bg-orange-600 text-white shadow-md"><Pill className="w-5 h-5 shrink-0" /></div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-0.5">Clinical Pharmacy</span>
                              <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Medical Prescription</h4>
                            </div>
                          </div>
                          <div className="p-0 bg-white">
                            {(() => {
                              const rawMeds = selectedHistoricalVisit.consultation?.medicalPrescription || (selectedHistoricalVisit.consultation as any)?.medications;
                              const meds = typeof rawMeds === 'string' ? JSON.parse(rawMeds) : rawMeds;
                              if (meds && Array.isArray(meds) && meds.length > 0) {
                                return (
                                  <div className="overflow-x-auto">
                                    <Table>
                                      <TableHeader className="bg-slate-50 border-b border-slate-200">
                                        <TableRow className="h-12 hover:bg-transparent">
                                          <TableHead className="text-[12px] font-black uppercase tracking-widest pl-4 sm:pl-6 min-w-[200px]">Drug Name</TableHead>
                                          <TableHead className="text-[12px] font-black uppercase tracking-widest">Dose</TableHead>
                                          <TableHead className="text-[12px] font-black uppercase tracking-widest">Freq</TableHead>
                                          <TableHead className="text-[12px] font-black uppercase tracking-widest">Duration</TableHead>
                                          <TableHead className="text-[12px] font-black uppercase tracking-widest pr-4 sm:pr-6">Eye</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {meds.map((m: any, idx: number) => (
                                          <TableRow key={idx} className="h-12 hover:bg-orange-50/50 transition-colors border-slate-100">
                                            <TableCell className="pl-4 sm:pl-6">
                                              <div className="flex flex-col">
                                                <span className="text-[12px] font-black text-orange-600 uppercase tracking-tight">{m.drug || m.name || "—"}</span>
                                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{m.route || "Topical"}</span>
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-[11px] font-bold text-slate-600">{m.dosage || m.dose || "—"}</TableCell>
                                            <TableCell className="text-[11px] font-bold text-slate-600">{m.frequency || "—"}</TableCell>
                                            <TableCell className="text-[11px] font-bold text-slate-600 uppercase tracking-tighter">{m.duration || "—"}</TableCell>
                                            <TableCell className="pr-4 sm:pr-6">
                                              <Badge className="bg-orange-50 text-orange-600 border-orange-100 text-[10px] rounded-none px-2 font-black uppercase">{m.eye || "Both"}</Badge>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                );
                              }
                              return <p className="text-xs font-bold text-slate-400 italic text-center py-6 uppercase tracking-widest bg-slate-50 border border-dashed border-slate-200 m-4 sm:m-6">No medications documented for this visit</p>;
                            })()}
                          </div>
                        </Card>

                        <Card className="clinical-card">
                          <div className="p-6 border-b border-slate-100 bg-white flex items-center gap-4">
                            <div className="p-2.5 bg-orange-600 text-white shadow-md"><Glasses className="w-5 h-5 shrink-0" /></div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-0.5">Optical Department</span>
                              <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Glass Prescription</h4>
                            </div>
                          </div>
                          <div className="p-4 sm:p-6 bg-white font-mono">
                            {(() => {
                              const rawGlass = selectedHistoricalVisit.consultation?.finalGlassPrescription;
                              const glassRx = typeof rawGlass === 'string' ? JSON.parse(rawGlass) : rawGlass;
                              if (glassRx) {
                                return (
                                  <div className="space-y-6">
                                    {['distance', 'near'].map((part) => (
                                      <div key={part} className="space-y-3">
                                        <label className="text-[12px] font-black uppercase text-slate-400 tracking-widest">{part} (DV/NV)</label>
                                        <div className="grid grid-cols-2 gap-2 sm:gap-4">
                                          {['OD', 'OS'].map((eye) => (
                                            <div key={eye} className="p-3 bg-slate-50 border border-slate-100">
                                              <span className="text-[11px] font-black text-orange-600 block mb-2">{eye}</span>
                                              <p className="text-sm font-black text-orange-600">
                                                {glassRx[part]?.[eye]?.sphere || "0.00"} /
                                                {glassRx[part]?.[eye]?.cylinder || "0.00"} ×
                                                {glassRx[part]?.[eye]?.axis || "0"}°
                                              </p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              }
                              return <p className="text-sm font-bold text-slate-400 italic text-center py-6 uppercase tracking-widest bg-slate-50 border border-dashed border-slate-200">No glass prescription documented</p>;
                            })()}
                          </div>
                        </Card>
                      </div>
                    ) : (
                      <div className="p-8 bg-white border-2 border-dashed border-slate-200 text-center opacity-60 italic font-bold text-slate-400">
                        No doctor's consultation data available for this visit.
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DoctorStation;
