import { useState, useEffect } from "react";
import { type Patient } from "@/data/mockData";
import { Printer, CheckCircle2, Loader2, Glasses, Stethoscope, User, MapPin, Calendar, Clock, ChevronRight, UserCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getPatientAgeString, getPatientGenderString, calculateSessionSlot, cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { RefractionSummaryView } from "./RefractionSummaryView";

const frameLabels: Record<string, string> = {
  full: "Full Rimmed (Metal/Acetate)",
  half: "Supra / Half Rim",
  rimless: "Rimless / Silhouette",
  flexible: "Flexible / Memory Metal",
  titanium: "Pure Titanium Premium",
  children: "Pediatric / TR90 Specialty",
  sunglass: "Powered Sunglasses",
};

const lensLabels: Record<string, string> = {
  single_hmc: "Single Vision (ARC/HMC)",
  single_blue: "Single Vision (Blue Cut / UV)",
  photochromic: "Photochromic (Transition)",
  bifocal_d: "Bifocal (D-Add Segment)",
  bifocal_k: "Bifocal (Kryptok Invisible)",
  progressive_digital: "Digital Progressive (Advanced)",
  progressive_premium: "Premium Progressive (Wider View)",
  occupational: "Occupational Office Lens",
};

export function OpticalStation({ patient, doctors = [] }: { patient?: Patient | null, doctors?: any[] }) {
  const { toast } = useToast();
  const [showPrint, setShowPrint] = useState(false);
  const [completed, setCompleted] = useState(patient?.status?.toUpperCase() === 'COMPLETED');
  const consultation = patient?.consultation;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dispensing Form State
  const [frameType, setFrameType] = useState<string>(patient?.optical?.frameType || "");
  const [lensType, setLensType] = useState<string>(patient?.optical?.lensType || "");
  const [dispensingNotes, setDispensingNotes] = useState<string>(patient?.optical?.medications || "");

  useEffect(() => {
    if (patient) {
      setFrameType(patient.optical?.frameType || "");
      setLensType(patient.optical?.lensType || "");
      setDispensingNotes(patient.optical?.medications || "");
      setCompleted(patient.status?.toUpperCase() === 'COMPLETED');
    }
  }, [patient?.id, patient?.status]);



  const handleComplete = async () => {
    if (!patient?.id) return;
    try {
      setIsSubmitting(true);
      await api.saveOptical(patient.id, {
        frameType,
        lensType,
        medications: dispensingNotes,
        lensPower: consultation?.finalGlassPrescription
      });

      setCompleted(true);
      toast({
        title: "Order Fulfilled",
        description: "Optical dispensing data saved and patient visit closed.",
        className: "bg-emerald-600 text-white rounded-none border-0 font-bold"
      });
      window.dispatchEvent(new Event("patientQueueUpdated"));
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!patient) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs">
        Select a patient to view optical RX
      </div>
    );
  }

  const glassRx = consultation?.finalGlassPrescription || null;
  const clRx = consultation?.finalContactLensPrescription || null;
  const diagnosis = consultation?.diagnosisText || "No diagnosis recorded";

  const hasPrescriptionValues = (rx: any) => {
    if (!rx) return false;
    const checkEye = (e: any) => e && (e.sphere || e.cylinder || e.axis || e.add || e.nearAdd);
    return (
      checkEye(rx.distance?.OD) || checkEye(rx.distance?.OS) ||
      checkEye(rx.near?.OD) || checkEye(rx.near?.OS) ||
      checkEye(rx.OD) || checkEye(rx.OS)
    );
  };

  const hasGlassRx = hasPrescriptionValues(glassRx);
  const hasClRx = hasPrescriptionValues(clRx);

  // Helper to safely get eye data regardless of nesting
  const getEyeData = (rx: any, eye: "OD" | "OS", section: "distance" | "near" = "distance") => {
    if (!rx) return {};
    // Check if it's the nested structure from Consultation { distance: { OD: {} }, near: { OD: {} } }
    if (rx.distance || rx.near) {
      return rx[section]?.[eye] || {};
    }
    // Fallback to flat structure { OD: {}, OS: {} } from Refraction
    return rx[eye] || {};
  };

  return (
    <div className="flex-1 relative overflow-hidden bg-slate-50/30">
      <div className="absolute inset-0 pointer-events-none bg-sprinkles z-0"></div>
      <div className="absolute inset-0 h-full flex flex-col z-10">
        {/* Premium Station Header */}
        <div className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3 md:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 shadow-sm z-30 gap-4 md:gap-8">
          <div className="flex items-center gap-4 md:gap-6 w-full sm:w-auto relative z-10">
            <div className="bg-gradient-to-br from-violet-500 to-violet-600 text-white p-2.5 md:p-3.5 rounded-xl shrink-0 shadow-lg shadow-violet-200/50 hidden xs:flex items-center justify-center">
              <Glasses className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h2 className="text-base md:text-xl font-black text-slate-900 tracking-tight uppercase truncate">{patient.name || "UNNAMED PATIENT"}</h2>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge className="bg-violet-600 text-white text-[10px] md:text-xs px-2 md:px-3 font-mono tracking-widest rounded-full h-5 md:h-6 font-black border-2 border-white shadow-sm">MR-{patient.mrNumber || "0000"}</Badge>
                  <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-[9px] md:text-xs px-2 font-black rounded-full h-5 md:h-6">T-{patient.tokenNumber || "—"}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[9px] md:text-[11px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50 w-fit px-2 py-0.5 rounded-md">
                <User className="w-3 h-3 text-slate-400" />
                <span>{getPatientGenderString(patient)}</span>
                <span className="text-slate-300">•</span>
                <span>{getPatientAgeString(patient)}</span>
                <span className="text-slate-300">•</span>
                <span className="text-violet-600 font-black tracking-widest uppercase">Optical Dispensing</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 md:gap-8 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 relative z-10">
            {completed && (
              <Badge className="bg-emerald-600 text-white border-0 gap-2 h-9 md:h-11 px-4 md:px-6 rounded-none font-black uppercase text-[10px] md:text-xs tracking-widest shadow-md shrink-0">
                <CheckCircle2 className="w-4 h-4 md:w-5 h-5" />
                Visit Completed
              </Badge>
            )}

            <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
              <div className="text-right shrink-0">
                <div className="flex items-center justify-end gap-1.5 mb-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Consultant</p>
                </div>
                <p className="text-xs md:text-sm font-black text-slate-900 truncate max-w-[150px]">{patient?.consultingDoctorName || patient?.consultation?.doctor?.name || "Dr. Gajendran"}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 pl-4 border-l border-slate-200 hidden lg:flex">
              <div className="text-right shrink-0">
                <div className="flex items-center justify-end gap-1.5 mb-0.5">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Optometrist</p>
                </div>
                <p className="text-xs md:text-sm font-black text-slate-900 truncate max-w-[150px]">{patient?.refraction?.optometrist?.name || "Not Attended"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-6 relative z-10 flex flex-col min-h-0">
          {!consultation ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">No Active RX Found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0 relative z-10">
            {/* Clinical Reference Column */}
            <div className="xl:col-span-1 overflow-y-auto pr-1 space-y-6 h-full min-h-0">
              {/* Prescription Card */}
              <Card className="shadow-sm border-slate-200 rounded-none overflow-hidden h-fit">
                <CardHeader className="bg-white p-0 border-b border-slate-100 overflow-hidden">
                  <div className="flex items-stretch h-14">
                    <div className="w-1.5 bg-blue-600" />
                    <div className="flex-1 flex items-center px-5 gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 shadow-sm">
                        <Stethoscope className="w-4 h-4" />
                      </div>
                      <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800">
                        Lead Consultant's Rx
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6 bg-white">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Final Clinical Diagnosis</p>
                    <p className="font-bold text-slate-800 text-sm leading-relaxed">{diagnosis}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Optical Directives</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-blue-50 text-blue-700 border-blue-100 rounded-none text-[10px] font-black px-2 uppercase tracking-wider">Spectacles</Badge>
                      {consultation?.finalContactLensPrescription && (
                        <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 rounded-none text-[10px] font-black px-2 uppercase tracking-wider">Contact Lens</Badge>
                      )}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Correction Details</p>
                    {!glassRx ? (
                      <div className="p-8 border-2 border-dashed border-slate-100 text-center">
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No active RX found</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {["OD", "OS"].map((eye: any) => {
                          const distData = getEyeData(glassRx, eye, "distance");
                          const nearData = getEyeData(glassRx, eye, "near");
                          const hasNear = nearData.sphere || nearData.cylinder || nearData.axis || nearData.add || nearData.nearDsph || nearData.nearAdd;

                          return (
                            <div key={eye} className="p-3 bg-slate-50 border border-slate-100 shadow-sm relative overflow-hidden group">
                              <div className={cn(
                                "absolute left-0 top-0 bottom-0 w-1",
                                eye === "OD" ? "bg-blue-600" : "bg-emerald-600"
                              )} />
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-black text-slate-400">{eye === "OD" ? "RIGHT EYE" : "LEFT EYE"}</span>
                                <Badge variant="outline" className="text-[8px] h-4 px-1 rounded-none border-slate-200 font-bold">{eye}</Badge>
                              </div>
                              <div className="grid grid-cols-4 gap-2 mb-2">
                                <div className="text-center">
                                  <span className="text-[8px] text-slate-400 block font-bold mb-0.5">SPH</span>
                                  <span className="font-black text-base text-slate-800 tracking-tighter">{distData.sphere || "0.00"}</span>
                                </div>
                                <div className="text-center">
                                  <span className="text-[8px] text-slate-400 block font-bold mb-0.5">CYL</span>
                                  <span className="font-black text-base text-slate-800 tracking-tighter">{distData.cylinder || "0.00"}</span>
                                </div>
                                <div className="text-center">
                                  <span className="text-[8px] text-slate-400 block font-bold mb-0.5">AXIS</span>
                                  <span className="font-black text-base text-slate-800 tracking-tighter">{distData.axis || "0"}°</span>
                                </div>
                                <div className="text-center">
                                  <span className="text-[8px] text-brand block font-bold mb-0.5 uppercase">VA</span>
                                  <span className="font-black text-sm text-brand tracking-tighter line-clamp-1">{distData.bcva || distData.vn || "—"}</span>
                                </div>
                              </div>
                              {hasNear && (
                                <div className="pt-2 border-t border-slate-200 mt-2">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">NV Correction</span>
                                    <span className="text-[8px] font-black text-blue-900 uppercase">VA: {nearData.nearBcva || nearData.vn || "—"}</span>
                                  </div>
                                  <div className="grid grid-cols-4 gap-2">
                                    <div className="text-center">
                                      <span className="text-[8px] text-slate-400 block font-bold">SPH</span>
                                      <span className="font-bold text-sm text-blue-800 tracking-tighter">{nearData.nearDsph || (nearData.nearAdd ? `+${nearData.nearAdd}` : (nearData.sphere || "—"))}</span>
                                    </div>
                                    <div className="text-center">
                                      <span className="text-[8px] text-slate-400 block font-bold">CYL</span>
                                      <span className="font-bold text-sm text-blue-800 tracking-tighter">{nearData.nearCylinder || nearData.cylinder || "0.00"}</span>
                                    </div>
                                    <div className="text-center">
                                      <span className="text-[8px] text-slate-400 block font-bold">AXIS</span>
                                      <span className="font-bold text-sm text-blue-800 tracking-tighter">{nearData.nearAxis || nearData.axis || "0"}°</span>
                                    </div>
                                    <div className="text-center">
                                      <span className="text-[8px] text-slate-400 block font-bold uppercase">ADD</span>
                                      <span className="font-bold text-sm text-blue-800 tracking-tighter">{nearData.nearAdd || nearData.add ? `+${nearData.nearAdd || nearData.add}` : "—"}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {consultation?.finalContactLensPrescription && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-[10px] font-black uppercase text-indigo-400 tracking-wider mb-3">Contact Lens Specifications</p>
                        <div className="space-y-4">
                          {["OD", "OS"].map((eye: any) => {
                            const eyeData = getEyeData(consultation.finalContactLensPrescription, eye);
                            return (
                              <div key={eye} className="p-3 bg-indigo-50/20 border border-indigo-100 shadow-sm relative overflow-hidden group">
                                <div className={cn(
                                  "absolute left-0 top-0 bottom-0 w-1",
                                  eye === "OD" || eye === "od" ? "bg-blue-600" : "bg-emerald-600"
                                )} />
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-[10px] font-black text-indigo-400">{eye === "OD" ? "RIGHT EYE" : "LEFT EYE"}</span>
                                  <Badge variant="outline" className="text-[8px] h-4 px-1 rounded-none border-indigo-200 font-bold bg-white">{eye}</Badge>
                                </div>
                                <div className="grid grid-cols-4 gap-2 mb-2">
                                  <div className="text-center">
                                    <span className="text-[8px] text-slate-400 block font-bold mb-0.5">SPH</span>
                                    <span className="font-black text-base text-indigo-900 tracking-tighter">{eyeData.sphere || "0.00"}</span>
                                  </div>
                                  <div className="text-center">
                                    <span className="text-[8px] text-slate-400 block font-bold mb-0.5">CYL</span>
                                    <span className="font-black text-base text-indigo-900 tracking-tighter">{eyeData.cylinder || "0.00"}</span>
                                  </div>
                                  <div className="text-center">
                                    <span className="text-[8px] text-slate-400 block font-bold mb-0.5">AXIS</span>
                                    <span className="font-black text-base text-indigo-900 tracking-tighter">{eyeData.axis || "0"}°</span>
                                  </div>
                                  <div className="text-center">
                                    <span className="text-[8px] text-indigo-600 block font-bold mb-0.5 uppercase">VA</span>
                                    <span className="font-black text-sm text-indigo-600 tracking-tighter">{eyeData.bcva || eyeData.vn || "—"}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Lead Clinician</p>
                    <p className="font-black text-brand text-sm uppercase">{consultation?.doctorName || consultation?.doctor?.name || "Pending Signature"}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Reference: Refractionist Findings */}
              <Card className="shadow-sm border-slate-200 rounded-none overflow-hidden h-fit">
                <CardHeader className="bg-slate-50/50 p-0 border-b border-slate-100 overflow-hidden">
                  <div className="flex items-stretch h-12">
                    <div className="w-1.5 bg-slate-400" />
                    <div className="flex-1 flex items-center px-5 gap-3">
                      <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                        Refractionist's Acceptance
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                  {consultation?.visit?.refraction ? (
                    <div className="scale-[0.85] origin-top-left w-[117.6%]">
                      <RefractionSummaryView
                        refractionData={consultation.visit.refraction}
                        patient={patient as any}
                        hideHeader
                      />
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">
                      No Subjective Refraction Recorded
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Dispensing Form */}
            <div className="xl:col-span-2 flex flex-col h-full min-h-0">
              {/* Spectacle Order */}
              <Card className="shadow-sm border-slate-200 rounded-none overflow-hidden flex-1 overflow-y-auto min-h-0">
                <CardHeader className="bg-white p-0 border-b border-slate-100 overflow-hidden">
                  <div className="flex items-stretch h-14">
                    <div className="w-1.5 bg-emerald-500" />
                    <div className="flex-1 flex items-center px-5 gap-3">
                      <div className="p-2 bg-emerald-50 text-emerald-600 shadow-sm">
                        <Glasses className="w-4 h-4" />
                      </div>
                      <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800">
                        Dispensing & Lab Instructions
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Frame Architecture</Label>
                      <Select value={frameType} onValueChange={setFrameType} disabled={completed}>
                        <SelectTrigger className="h-12 rounded-none border-slate-200 bg-slate-50/50 font-bold focus:ring-0 focus:border-slate-400 disabled:opacity-80">
                          <SelectValue placeholder="Select frame category" />
                        </SelectTrigger>
                        <SelectContent className="rounded-none border-slate-200">
                          <SelectItem value="full">Full Rimmed (Metal/Acetate)</SelectItem>
                          <SelectItem value="half">Supra / Half Rim</SelectItem>
                          <SelectItem value="rimless">Rimless / Silhouette</SelectItem>
                          <SelectItem value="flexible">Flexible / Memory Metal</SelectItem>
                          <SelectItem value="titanium">Pure Titanium Premium</SelectItem>
                          <SelectItem value="children">Pediatric / TR90 Specialty</SelectItem>
                          <SelectItem value="sunglass">Powered Sunglasses</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Lens Technology</Label>
                      <Select value={lensType} onValueChange={setLensType} disabled={completed}>
                        <SelectTrigger className="h-12 rounded-none border-slate-200 bg-slate-50/50 font-bold focus:ring-0 focus:border-slate-400 disabled:opacity-80">
                          <SelectValue placeholder="Select lens design" />
                        </SelectTrigger>
                        <SelectContent className="rounded-none border-slate-200">
                          <SelectItem value="single_hmc">Single Vision (ARC/HMC)</SelectItem>
                          <SelectItem value="single_blue">Single Vision (Blue Cut / UV)</SelectItem>
                          <SelectItem value="photochromic">Photochromic (Transition)</SelectItem>
                          <SelectItem value="bifocal_d">Bifocal (D-Add Segment)</SelectItem>
                          <SelectItem value="bifocal_k">Bifocal (Kryptok Invisible)</SelectItem>
                          <SelectItem value="progressive_digital">Digital Progressive (Advanced)</SelectItem>
                          <SelectItem value="progressive_premium">Premium Progressive (Wider View)</SelectItem>
                          <SelectItem value="occupational">Occupational Office Lens</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Laboratory Instructions</Label>
                    <Textarea
                      placeholder="Enter specific fitting heights, blue cut requests, anti-reflective coating specs..."
                      className="min-h-[140px] rounded-none border-slate-200 bg-slate-50/50 p-6 text-base font-medium focus:ring-0 focus:border-slate-400 transition-all shadow-inner disabled:opacity-80"
                      value={dispensingNotes}
                      onChange={(e) => setDispensingNotes(e.target.value)}
                      disabled={completed}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4 mt-4 border-t border-slate-200 shrink-0">
                <Button
                  variant="outline"
                  className="h-12 w-full sm:w-auto px-8 rounded-none border-slate-300 font-black uppercase text-[10px] tracking-widest hover:bg-brand hover:text-white transition-all gap-3"
                  onClick={() => setShowPrint(true)}
                  disabled={!glassRx}
                >
                  <Printer className="w-4 h-4" />
                  Generate Optical Slip
                </Button>
                <Button
                  className={cn(
                    "h-12 w-full sm:w-auto px-8 rounded-none font-black uppercase text-[10px] tracking-widest shadow-lg transition-all gap-3 disabled:pointer-events-none disabled:cursor-not-allowed",
                    completed ? "bg-brand text-white opacity-80" : "bg-emerald-600 hover:bg-black text-white"
                  )}
                  onClick={handleComplete}
                  disabled={completed || !glassRx || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {completed ? "Order Synchronized" : "Confirm Fulfillment"}
                </Button>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Print Preview Modal */}
        <Dialog open={showPrint} onOpenChange={setShowPrint}>
          <DialogContent className="max-w-2xl p-0 border-0 rounded-none overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
            <DialogHeader className="p-6 bg-brand border-0 rounded-none flex flex-row items-center justify-between space-y-0 no-print shrink-0">
              <DialogTitle className="text-white font-black uppercase tracking-[0.3em] text-[10px]">Optical Order Specification</DialogTitle>
            </DialogHeader>
            <div id="print-section" className="bg-white p-8 space-y-6 overflow-y-auto flex-1 min-h-0 relative">
              {/* Logo Watermark */}
              <div className="print-watermark-container">
                <img
                  src="https://res.cloudinary.com/autodapp/image/upload/v1775219907/VPN%20Eye%20Hospital%20Logo.png"
                  alt="Watermark"
                  className="print-watermark-img"
                />
              </div>
              {/* Hospital Header in the style of Vision Xpress */}
              <div className="border border-brand p-2.5 flex items-center justify-between gap-4 w-full mb-3 bg-white text-left">
                <img
                  src="https://res.cloudinary.com/autodapp/image/upload/v1775219907/VPN%20Eye%20Hospital%20Logo.png"
                  alt="VPN Logo"
                  className="h-10 w-auto object-contain shrink-0"
                />
                <div className="flex-1 text-center">
                  <h1 className="text-sm font-black uppercase text-brand-hover tracking-wider">VPN EYE HOSPITAL</h1>
                  <p className="text-[8px] font-bold text-gray-700">25, Neela West Street, Nagapattinam - 611001</p>
                  <p className="text-[8px] font-medium text-gray-600">Phone: 04365-224000 | Mobile: 9324234343</p>
                </div>
                {/* Barcode */}
                <div className="shrink-0 flex flex-col items-center gap-0.5">
                  <svg viewBox="0 0 120 40" className="w-24 h-8">
                    {`MR${patient?.mrNumber || '0000'}`.split('').map((char, i) => {
                      const charCode = char.charCodeAt(0);
                      return Array.from({ length: 3 }, (_, j) => {
                        const x = i * 7 + j * 2 + 2;
                        const w = (charCode + j) % 2 === 0 ? 1.4 : 0.7;
                        return <rect key={`${i}-${j}`} x={x} y="2" width={w} height="32" fill="#1e293b" />;
                      });
                    })}
                  </svg>
                  <span className="text-[7px] font-mono font-bold text-slate-600 tracking-wider">MR-{patient?.mrNumber}</span>
                </div>
              </div>
              <div className="text-center my-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white px-3 py-0.5 border border-black text-slate-900">Optical RX Order</span>
              </div>

              {/* Outer report container with double borders */}
              <div className="report-print-container space-y-4 text-left border-2 border-brand/40 p-5 rounded-sm">
                {/* Patient Info Block structured as a clean 1px border table */}
                <table className="w-full text-[8.5px]">
                  <tbody>
                    <tr>
                      <td className="p-1 font-bold bg-gray-50 w-[20%] text-slate-900">Patient Name:</td>
                      <td className="p-1 w-[30%] text-slate-900">{patient?.name}</td>
                      <td className="p-1 font-bold bg-gray-50 w-[20%] text-slate-900">UIN / MRN:</td>
                      <td className="p-1 w-[30%] text-slate-900">MR-{patient?.mrNumber}</td>
                    </tr>
                    <tr>
                      <td className="p-1 font-bold bg-gray-50 text-slate-900">Diagnostic Date:</td>
                      <td className="p-1 text-slate-900">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="p-1 font-bold bg-gray-50 text-slate-900">Lead Physician:</td>
                      <td className="p-1 text-slate-900">{consultation?.doctorName || "—"}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Final Spectacle Specifications */}
                {hasGlassRx && (
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black uppercase text-slate-900 border-b-2 border-slate-900 pb-1 w-fit tracking-widest">Final Spectacle Specifications</h5>
                    <Table className="w-full border-collapse border border-slate-200">
                      <TableHeader className="bg-slate-50">
                        <TableRow className="h-10 border-b border-slate-200">
                          <TableHead className="w-16 font-black uppercase text-[9px] text-slate-500 border-r border-slate-200 text-center">EYE</TableHead>
                          <TableHead className="text-center font-black uppercase text-[9px] text-slate-500 border-r border-slate-200">DIST SPH</TableHead>
                          <TableHead className="text-center font-black uppercase text-[9px] text-slate-500 border-r border-slate-200">DIST CYL</TableHead>
                          <TableHead className="text-center font-black uppercase text-[9px] text-slate-500 border-r border-slate-200">AXIS</TableHead>
                          <TableHead className="text-center font-black uppercase text-[9px] text-blue-600 border-r border-slate-200">NEAR SPH</TableHead>
                          <TableHead className="text-center font-black uppercase text-[9px] text-blue-600 border-r border-slate-200">NEAR CYL</TableHead>
                          <TableHead className="text-center font-black uppercase text-[9px] text-blue-600">AXIS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {["OD", "OS"].map((eye: any) => {
                          const distData = getEyeData(glassRx, eye, "distance");
                          const nearData = getEyeData(glassRx, eye, "near");
                          return (
                            <TableRow key={eye} className="h-12 font-mono border-b border-slate-200">
                              <TableCell className="font-black text-xs border-r border-slate-200 text-center bg-slate-50/30">{eye}</TableCell>
                              <TableCell className="text-center font-bold border-r border-slate-200">{distData.sphere || "—"}</TableCell>
                              <TableCell className="text-center font-bold border-r border-slate-200">{distData.cylinder || "—"}</TableCell>
                              <TableCell className="text-center font-bold border-r border-slate-200">{distData.axis ? `${distData.axis}°` : "—"}</TableCell>
                              <TableCell className="text-center font-black text-blue-800 border-r border-slate-200">
                                {nearData.nearDsph || (nearData.nearAdd ? `+${nearData.nearAdd}` : (nearData.sphere || "—"))}
                              </TableCell>
                              <TableCell className="text-center font-black text-blue-800 border-r border-slate-200">{nearData.nearCylinder || nearData.cylinder || "—"}</TableCell>
                              <TableCell className="text-center font-black text-blue-800">{nearData.nearAxis || nearData.axis ? `${nearData.nearAxis || nearData.axis}°` : "—"}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Final Contact Lens Specifications */}
                {hasClRx && (
                  <div className="space-y-4 pt-6">
                    <h5 className="text-[10px] font-black uppercase text-indigo-900 border-b-2 border-indigo-900 pb-1 w-fit tracking-widest">Final Contact Lens Specifications</h5>
                    <Table className="w-full border-collapse border border-indigo-200">
                      <TableHeader className="bg-indigo-50">
                        <TableRow className="h-10 border-b border-indigo-200">
                          <TableHead className="w-16 font-black uppercase text-[9px] text-indigo-500 border-r border-indigo-200 text-center">EYE</TableHead>
                          <TableHead className="text-center font-black uppercase text-[9px] text-indigo-500 border-r border-indigo-200">DIST SPH</TableHead>
                          <TableHead className="text-center font-black uppercase text-[9px] text-indigo-500 border-r border-indigo-200">DIST CYL</TableHead>
                          <TableHead className="text-center font-black uppercase text-[9px] text-indigo-500 border-r border-indigo-200">AXIS</TableHead>
                          <TableHead className="text-center font-black uppercase text-[9px] text-indigo-700 border-r border-indigo-200">NEAR SPH</TableHead>
                          <TableHead className="text-center font-black uppercase text-[9px] text-indigo-700 border-r border-indigo-200">NEAR CYL</TableHead>
                          <TableHead className="text-center font-black uppercase text-[9px] text-indigo-700">AXIS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {["OD", "OS"].map((eye: any) => {
                          const distData = getEyeData(clRx, eye, "distance");
                          const nearData = getEyeData(clRx, eye, "near");
                          return (
                            <TableRow key={eye} className="h-12 font-mono border-b border-indigo-200">
                              <TableCell className="font-black text-xs border-r border-indigo-200 text-center bg-indigo-50/30">{eye}</TableCell>
                              <TableCell className="text-center font-bold border-r border-indigo-200">{distData.sphere || "—"}</TableCell>
                              <TableCell className="text-center font-bold border-r border-indigo-200">{distData.cylinder || "—"}</TableCell>
                              <TableCell className="text-center font-bold border-r border-indigo-200">{distData.axis ? `${distData.axis}°` : "—"}</TableCell>
                              <TableCell className="text-center font-black text-indigo-800 border-r border-indigo-200">
                                {nearData.nearDsph || (nearData.nearAdd ? `+${nearData.nearAdd}` : (nearData.sphere || "—"))}
                              </TableCell>
                              <TableCell className="text-center font-black text-indigo-800 border-r border-indigo-200">{nearData.nearCylinder || nearData.cylinder || "—"}</TableCell>
                              <TableCell className="text-center font-black text-indigo-800">{nearData.nearAxis || nearData.axis ? `${nearData.nearAxis || nearData.axis}°` : "—"}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}


                {/* Optical Product Configuration */}
                <div className="grid grid-cols-2 gap-10 pt-4">
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black uppercase text-slate-900 border-b-2 border-slate-900 pb-1 w-fit tracking-widest">Frame & Lens Selection</h5>
                    <div className="space-y-3">
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Frame Architecture</span>
                        <p className="font-bold text-xs text-slate-800 uppercase">{frameLabels[frameType] || "Standard Frame"}</p>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Lens Technology</span>
                        <p className="font-bold text-xs text-blue-600 uppercase">{lensLabels[lensType] || "Standard Index Lens"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black uppercase text-slate-900 border-b-2 border-slate-900 pb-1 w-fit tracking-widest">Laboratory Instructions</h5>
                    <p className="text-xs font-bold text-slate-700 leading-relaxed bg-slate-50 p-4 border border-dashed border-slate-200">
                      {dispensingNotes || "Standard fitting and centering required. Confirm PD measurements before processing."}
                    </p>
                  </div>
                </div>

                <div className="pt-8 flex justify-between items-end border-t border-slate-100 italic">
                  <p className="text-[10px] text-slate-400 font-bold max-w-xs leading-relaxed">This slip serves as a verified optical directive from VPN Eye Hospital. Authenticity can be verified via MRN-{patient?.mrNumber}.</p>
                  <div className="text-right">
                    <div className="w-32 h-px bg-slate-300 mb-2 ml-auto" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-brand">Official Optical Seal</p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="p-4 bg-slate-50 border-t items-center sm:justify-center no-print shrink-0">
              <Button variant="ghost" onClick={() => setShowPrint(false)} className="rounded-none font-bold text-slate-500 uppercase text-[10px] tracking-widest hover:bg-slate-100">Cancel & Edit</Button>
              <Button className="rounded-none bg-brand hover:bg-black font-black uppercase text-[10px] tracking-widest px-8 shadow-xl gap-3 ml-4" onClick={() => window.print()}>
                <Printer className="w-4 h-4" />
                Confirm & Print Slip
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
