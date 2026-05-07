import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import {
  Activity, AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, ChevronDown,
  ChevronRight, ClipboardList, Clock, Crosshair, Eye, History, Save, Scan,
  Search, ShieldCheck, Stethoscope, User, X, Send, CloudUpload, Droplets, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { API_BASE_URL } from "@/config";
import { getPatientAgeString, getPatientAgeNumber, calculateSessionSlot } from "@/lib/utils";
import { ScanReportGallery } from "@/components/ScanReportGallery";
import { CTRRDrawingDialog } from "./CTRRDrawingDialog";
import { sanitizeOptometryInput, getFieldTypeFromName } from "@/lib/validation";

import { type Patient } from "@/data/mockData";

const systemic = ["Diabetes", "Hypertension", "Cardiac", "Thyroid", "Asthma", "Arthritis", "Kidney Disease", "Neurological"];
const complaints = ["Blurred Vision", "Eye Pain", "Redness", "Watering", "Itching", "Double Vision", "Floaters", "Other"];
const DIST_VISION_OPTIONS = ["6/6", "6/6(P)", "6/7.5", "6/7.5(P)", "6/9", "6/9(P)", "6/12", "6/12(P)", "6/18", "6/18(P)", "6/24", "6/24(P)", "6/36", "6/36(P)", "6/60", "6/60(P)", "5/60", "4/60", "3/60", "2/60", "1/60", "CF at 50", "HM(+)", "CFCC", "PLPR accurate", "PLPR inaccurate"] as const;
const NEAR_VISION_OPTIONS = ["<N36", "N36", "N24", "N18", "N12", "N10", "N8", "N6"] as const;
const SCHIRMER_OPTIONS = [
  "Normal (> 15 mm)",
  "Mildly Reduced (10 - 15 mm)",
  "Moderately Reduced (5 - 10 mm)",
  "Severely Reduced (< 5 mm)",
  "0 mm", "1 mm", "2 mm", "3 mm", "4 mm", "5 mm", "6 mm", "7 mm", "8 mm", "9 mm", "10 mm",
  "11 mm", "12 mm", "13 mm", "14 mm", "15 mm", "16 mm", "17 mm", "18 mm", "19 mm", "20 mm",
  "21 mm", "22 mm", "23 mm", "24 mm", "25 mm", "26 mm", "27 mm", "28 mm", "29 mm", "30 mm",
  "31 mm", "32 mm", "33 mm", "34 mm", "35 mm"
];

const TagInput = React.memo(({ 
  values, 
  onAdd, 
  onRemove, 
  placeholder 
}: { 
  values: string[]; 
  onAdd: (val: string) => void; 
  onRemove: (index: number) => void;
  placeholder: string;
}) => {
  const [inputValue, setInputValue] = useState("");
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      onAdd(inputValue.trim());
      setInputValue("");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1.5 border border-blue-100 bg-white min-h-[44px] flex-1">
      {(Array.isArray(values) ? values : (typeof values === 'string' && (values as string).trim() ? [(values as string).trim()] : [])).map((v, i) => (
        <span key={i} className="group flex items-center gap-1 bg-blue-100/50 text-[orange-600] text-[10px] font-black px-2 py-0.5 border border-blue-200 uppercase tracking-tighter transition-all">
          {v}
          <X className="w-2.5 h-2.5 cursor-pointer hover:text-red-600 transition-all opacity-0 group-hover:opacity-100" onClick={() => onRemove(i)} />
        </span>
      ))}
      <input
        className="flex-1 outline-none text-base font-black placeholder:text-slate-300 min-w-[50px] bg-transparent text-center"
        placeholder={values.length === 0 ? placeholder : ""}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (inputValue.trim()) {
            onAdd(inputValue.trim());
            setInputValue("");
          }
        }}
      />
    </div>
  );
});

const EyeGrid = React.memo(({
  label,
  fields,
  values,
  onChange
}: {
  label: string;
  fields: string[];
  values: Record<string, Record<string, string>>;
  onChange: (eye: string, field: string, value: string) => void;
}) => {
  return (
    <div className="clinical-group">
      <label className="clinical-label !mb-2">{label}</label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {["OD", "OS"].map((eye) => (
          <div key={eye} className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 border-slate-200 pb-3">
              <span className={cn(
                "w-10 h-10 flex items-center justify-center text-white font-black text-sm",
                eye === "OD" || eye === "od" ? "bg-blue-600" : "bg-emerald-600"
              )}>{eye}</span>
              <div className="flex flex-col min-w-0">
                <span className="text-[8px] sm:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] leading-none mb-1 truncate">{eye === "OD" || eye === "od" ? "Right Eye" : "Left Eye"}</span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-600 tracking-tight truncate">{eye === "OD" || eye === "od" ? "Oculus Dexter" : "Oculus Sinister"}</span>
              </div>
            </div>
            <div className="grid gap-6">
              {fields.map((f) => (
                <div key={f} className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-slate-500 tracking-widest pl-1">{f}</label>
                  <Input
                    className="h-10 sm:h-12 text-base sm:text-lg font-black bg-white rounded-none border-slate-200 focus:border-[orange-600] focus:ring-0 transition-all shadow-sm"
                    placeholder="—"
                    value={values[eye]?.[f] || ""}
                    onChange={(e) => onChange(eye, f, sanitizeOptometryInput(e.target.value, getFieldTypeFromName(f)))}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});


const DualEyePrescriptionBlock = React.memo(({
  title,
  stateKey,
  data,
  setFormData,
  isDraftLoaded,
  sectionNumber,
  onSync,
  syncTitle,
  isOpen,
  onToggle
}: {
  title: string;
  stateKey: any;
  data: any;
  setFormData: any;
  isDraftLoaded?: boolean;
  sectionNumber?: string;
  onSync?: () => void;
  syncTitle?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}) => {
  const update = (field: "distance" | "near", eye: "OD" | "OS", key: string, val: string) => {
    const sanitizedVal = sanitizeOptometryInput(val, getFieldTypeFromName(key));
    setFormData((p: any) => {
      const currentSection = p[stateKey] || {};
      const currentField = currentSection[field] || {};
      const currentEye = currentField[eye] || {};
      return {
        ...p,
        [stateKey]: {
          ...currentSection,
          [field]: {
            ...currentField,
            [eye]: { ...currentEye, [key]: sanitizedVal }
          }
        }
      };
    });
  };
  const updateRemark = (eye: "OD" | "OS", val: string) => {
    const sanitizedVal = sanitizeOptometryInput(val, 'notes');
    setFormData((p: any) => {
      const currentSection = p[stateKey] || {};
      const currentRemarks = currentSection.remarks || {};
      return {
        ...p,
        [stateKey]: {
          ...currentSection,
          remarks: { ...currentRemarks, [eye]: sanitizedVal }
        }
      };
    });
  };

  const dataRef = useRef(data);

  return (
    <div className="border-2 border-orange-100 bg-orange-50/10 rounded-none overflow-hidden shadow-sm">
      <div 
        className="bg-orange-100 text-orange-600 px-4 md:px-6 py-2.5 flex items-center justify-between cursor-pointer hover:bg-orange-200/50 transition-colors border-l-4 border-l-orange-500"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 relative">
          <ClipboardList className="w-4 h-4 text-orange-700" />
          <h3 className="text-[11px] font-black uppercase tracking-[0.3em]">{title}</h3>
        </div>
        <div className="flex items-center gap-4">
          {onSync && (
            <Button
              variant="default"
              size="sm"
              className="h-7 px-3 bg-orange-600 hover:bg-black text-white rounded-none text-[8px] font-black uppercase tracking-widest gap-2 shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                onSync();
              }}
            >
              <Droplets className="w-3 h-3" /> {syncTitle || "SYNC DATA"}
            </Button>
          )}
          <Badge variant="outline" className="border-orange-300 text-orange-700 text-[8px] font-black uppercase tracking-widest rounded-none bg-white/50">Subjective Assessment</Badge>
          {isOpen ? <ChevronDown className="w-4 h-4 text-orange-600" /> : <ChevronRight className="w-4 h-4 text-orange-600" />}
        </div>
      </div>

      <div className={cn(
        "transition-all duration-300 ease-in-out overflow-hidden",
        isOpen ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="p-2 sm:p-5 space-y-4 sm:space-y-6">
        {["OD", "OS"].map((eye) => (
          <div key={eye} className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-4 border-b border-orange-100 pb-2">
              <div className={cn(
                "w-9 h-9 flex items-center justify-center font-black text-xs border-2",
                eye === "OD" || eye === "od" ? "border-blue-600 text-blue-600" : eye === "OS" || eye === "os" ? "border-emerald-600 text-emerald-600" : "border-slate-600 text-slate-600"
              )}>{eye}</div>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{eye === "OD" ? "Right Eye" : "Left Eye"} Result</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Distance Group */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest bg-orange-50 px-2 py-0.5">Distance Vision (DV)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase text-slate-500 text-center block">SPH</span>
                    <Input className="h-11 text-center text-base font-black rounded-none border-orange-100 bg-white text-slate-950 focus:border-orange-400" value={(data as any)?.distance?.[eye]?.sphere || ""} onChange={(data as any)?.onChange ? (e) => (data as any).onChange("distance", eye as any, "sphere", e.target.value) : (e) => update("distance", eye as any, "sphere", e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase text-slate-500 text-center block">CYL</span>
                    <Input className="h-11 text-center text-base font-black rounded-none border-orange-100 bg-white text-slate-950 focus:border-orange-400" value={(data as any)?.distance?.[eye]?.cylinder || ""} onChange={(data as any)?.onChange ? (e) => (data as any).onChange("distance", eye as any, "cylinder", e.target.value) : (e) => update("distance", eye as any, "cylinder", e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase text-slate-500 text-center block">AXIS</span>
                    <Input className="h-11 text-center text-base font-black rounded-none border-orange-100 bg-white text-slate-950 focus:border-orange-400" value={(data as any)?.distance?.[eye]?.axis || ""} onChange={(data as any)?.onChange ? (e) => (data as any).onChange("distance", eye as any, "axis", e.target.value) : (e) => update("distance", eye as any, "axis", e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase text-slate-500 text-center block">BCVA</span>
                    <Select value={(data as any)?.distance?.[eye]?.vn || ""} onValueChange={(val) => (data as any)?.onChange ? (data as any).onChange("distance", eye as any, "vn", val) : update("distance", eye as any, "vn", val)}>
                      <SelectTrigger className="h-11 text-center text-sm font-black rounded-none border-orange-100 bg-white text-slate-950"><SelectValue placeholder="-" /></SelectTrigger>
                      <SelectContent className="max-h-[250px] overflow-y-auto font-mono uppercase">{DIST_VISION_OPTIONS.map((nv) => <SelectItem key={nv} value={nv}>{nv}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Near Group */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest bg-orange-50 px-2 py-0.5">Near Vision (NV)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase text-slate-500 text-center block">SPH</span>
                    <Input className="h-11 text-center text-base font-black rounded-none border-orange-100 bg-white text-slate-950 focus:border-orange-400" value={(data as any)?.near?.[eye]?.sphere || ""} onChange={(data as any)?.onChange ? (e) => (data as any).onChange("near", eye as any, "sphere", e.target.value) : (e) => update("near", eye as any, "sphere", e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase text-slate-500 text-center block">CYL</span>
                    <Input className="h-11 text-center text-base font-black rounded-none border-orange-100 bg-white text-slate-950 focus:border-orange-400" value={(data as any)?.near?.[eye]?.cylinder || ""} onChange={(data as any)?.onChange ? (e) => (data as any).onChange("near", eye as any, "cylinder", e.target.value) : (e) => update("near", eye as any, "cylinder", e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase text-slate-500 text-center block">AXIS</span>
                    <Input className="h-11 text-center text-base font-black rounded-none border-orange-100 bg-white text-slate-950 focus:border-orange-400" value={(data as any)?.near?.[eye]?.axis || ""} onChange={(data as any)?.onChange ? (e) => (data as any).onChange("near", eye as any, "axis", e.target.value) : (e) => update("near", eye as any, "axis", e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase text-slate-500 text-center block">BCVA</span>
                    <Select value={(data as any)?.near?.[eye]?.vn || ""} onValueChange={(val) => (data as any)?.onChange ? (data as any).onChange("near", eye as any, "vn", val) : update("near", eye as any, "vn", val)}>
                      <SelectTrigger className="h-11 text-center text-sm font-black rounded-none border-orange-100 bg-white text-slate-950"><SelectValue placeholder="-" /></SelectTrigger>
                      <SelectContent className="max-h-[250px] overflow-y-auto font-mono uppercase">{NEAR_VISION_OPTIONS.map((nv) => <SelectItem key={nv} value={nv}>{nv}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Input
                className="h-10 bg-white text-[11px] font-bold border-dashed border-orange-100 rounded-none italic placeholder:text-slate-300 text-slate-900"
                placeholder={`Notes...`}
                value={(data as any)?.remarks?.[eye] || ""}
                onChange={(e) => updateRemark(eye as any, e.target.value)}
              />
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
});

const TonometrySection = React.memo(({ 
  formData, 
  setFormData, 
  openSections, 
  toggleSection 
}: { 
  formData: any; 
  setFormData: any; 
  openSections: any; 
  toggleSection: (id: string) => void;
}) => {
  return (
    <Card className="border-2 border-sky-100 rounded-none shadow-sm overflow-hidden">
      <div 
        className="bg-sky-100 text-sky-950 px-4 md:px-5 py-2 md:py-2.5 flex items-center justify-between cursor-pointer hover:bg-sky-200/50 transition-colors border-l-4 border-l-sky-500"
        onClick={() => toggleSection('tonometry')}
      >
        <div className="flex items-center gap-3 relative">
          <Activity className="w-4 h-4 text-sky-700" />
          <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em]">Tonometry (Intraocular Pressure)</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-blue-200/50 px-3 py-1 hidden xl:block border border-blue-300" onClick={(e) => e.stopPropagation()}>
            <span className="text-[9px] md:text-[10px] font-black uppercase text-blue-900 tracking-widest">Schiotz Indentation (Manual)</span>
          </div>
          {openSections['tonometry'] ? <ChevronDown className="w-4 h-4 text-blue-600" /> : <ChevronRight className="w-4 h-4 text-blue-600" />}
        </div>
      </div>
      <div className={cn(
        "transition-all duration-300 ease-in-out overflow-hidden",
        openSections['tonometry'] ? "max-h-[3000px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <CardContent className="p-3 md:p-6 bg-blue-50/10">
        <div className="clinical-group !bg-transparent !border-none !p-0">
          <div className="space-y-8">
            {["OD", "OS"].map((eye) => (
              <div key={eye} className="border-2 border-slate-100 bg-white/50 p-2 md:border-0 md:bg-transparent md:p-0 md:mb-0 mb-6 last:mb-0">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start border-b border-blue-100/50 pb-8 last:border-0 last:pb-0">
                  {/* NCT & GAT (Left 8 Columns) */}
                  <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* MEAN Assessment */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "w-9 h-9 flex items-center justify-center font-black text-xs border-2",
                          eye === "OD" || eye === "od" ? "border-blue-600 text-blue-600" : eye === "OS" || eye === "os" ? "border-emerald-600 text-emerald-600" : "border-slate-600 text-slate-600"
                        )}>{eye}</span>
                        <span className="text-[9px] font-black uppercase text-blue-500 tracking-widest bg-blue-50 px-2 py-0.5">MEAN</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <TagInput 
                          placeholder="Value"
                          values={(formData.tonometryDetails?.nct as any)?.[eye]?.mean || []}
                          onAdd={(val) => setFormData((p: any) => {
                            const currentNct = p.tonometryDetails?.nct || {};
                            const currentEye = currentNct[eye] || { mean: [] };
                            const sanitized = sanitizeOptometryInput(val, 'iop');
                            if (!sanitized) return p;
                            return { ...p, tonometryDetails: { ...p.tonometryDetails, nct: { ...currentNct, [eye]: { ...currentEye, mean: [...currentEye.mean, sanitized] } } } };
                          })}
                          onRemove={(idx) => setFormData((p: any) => {
                            const currentNct = p.tonometryDetails?.nct || {};
                            const currentEye = currentNct[eye] || { mean: [] };
                            const newMean = [...currentEye.mean];
                            newMean.splice(idx, 1);
                            return { ...p, tonometryDetails: { ...p.tonometryDetails, nct: { ...currentNct, [eye]: { ...currentEye, mean: newMean } } } };
                          })}
                        />
                        <span className="text-[11px] font-bold text-slate-400 shrink-0">mmHg</span>
                      </div>
                    </div>

                    {/* GAT Assessment */}
                     <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "w-9 h-9 flex items-center justify-center font-black text-xs border-2",
                          eye === "OD" || eye === "od" ? "border-blue-600 text-blue-600" : eye === "OS" || eye === "os" ? "border-emerald-600 text-emerald-600" : "border-slate-600 text-slate-600"
                        )}>{eye}</span>
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest bg-blue-50 px-2 py-0.5">GAT (Goldmann)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <TagInput 
                          placeholder="Value"
                          values={(formData.tonometryDetails?.gat as any)?.[eye]?.reading || []}
                          onAdd={(val) => setFormData((p: any) => {
                            const currentGat = p.tonometryDetails?.gat || {};
                            const currentEye = currentGat[eye] || { reading: [] };
                            const sanitized = sanitizeOptometryInput(val, 'iop');
                            if (!sanitized) return p;
                            return { ...p, tonometryDetails: { ...p.tonometryDetails, gat: { ...currentGat, [eye]: { ...currentEye, reading: [...currentEye.reading, sanitized] } } } };
                          })}
                          onRemove={(idx) => setFormData((p: any) => {
                            const currentGat = p.tonometryDetails?.gat || {};
                            const currentEye = currentGat[eye] || { reading: [] };
                            const newReadings = [...currentEye.reading];
                            newReadings.splice(idx, 1);
                            return { ...p, tonometryDetails: { ...p.tonometryDetails, gat: { ...currentGat, [eye]: { ...currentEye, reading: newReadings } } } };
                          })}
                        />
                        <span className="text-[11px] font-bold text-slate-400 shrink-0">mmHg</span>
                      </div>
                    </div>
                  </div>

                  {/* Schiotz Assessment (Right 4 Columns) */}
                  <div className="xl:col-span-4 space-y-4 xl:border-l xl:border-blue-100 xl:pl-8 self-stretch">
                    <div className="flex items-center gap-3">
                        <span className={cn(
                          "w-9 h-9 flex items-center justify-center font-black text-xs border-2",
                          eye === "OD" || eye === "od" ? "border-blue-600 text-blue-600" : eye === "OS" || eye === "os" ? "border-emerald-600 text-emerald-600" : "border-slate-600 text-slate-600"
                        )}>{eye}</span>
                      <span className="text-[9px] font-black uppercase text-blue-500 tracking-widest bg-blue-50 px-2 py-0.5">Schiotz</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input className="h-11 flex-1 bg-white border-blue-100 text-[orange-600] text-center text-base font-black focus:border-blue-400" placeholder="Value" value={(formData.tonometryDetails?.schiotz as any)?.[eye]?.reading || ""} onChange={(e) => {
                        const val = sanitizeOptometryInput(e.target.value, 'iop');
                        setFormData((p: any) => {
                          const currentDetails = p.tonometryDetails || {};
                          const currentSchiotz = currentDetails.schiotz || {};
                          const currentEye = (currentSchiotz as any)[eye] || {};
                          return { ...p, tonometryDetails: { ...currentDetails, schiotz: { ...currentSchiotz, [eye]: { ...currentEye, reading: val } } } };
                        });
                      }} />
                      <Select value={(formData.tonometryDetails?.schiotz as any)?.[eye]?.weight || ""} onValueChange={(val) => {
                        setFormData((p: any) => {
                          const currentDetails = p.tonometryDetails || {};
                          const currentSchiotz = currentDetails.schiotz || {};
                          const currentEye = (currentSchiotz as any)[eye] || {};
                          return { ...p, tonometryDetails: { ...currentDetails, schiotz: { ...currentSchiotz, [eye]: { ...currentEye, weight: val } } } };
                        });
                      }}>
                        <SelectTrigger className="h-11 w-[70px] bg-white border-blue-100 text-[orange-600] text-[10px] font-black transition-none focus:border-blue-400"><SelectValue placeholder="W" /></SelectTrigger>
                        <SelectContent className="font-bold"><SelectItem value="5.5">5.5g</SelectItem><SelectItem value="7.5">7.5g</SelectItem><SelectItem value="10">10g</SelectItem></SelectContent>
                      </Select>
                      <Input className="h-11 w-16 bg-white border-blue-100 text-[orange-600] text-center text-[13px] font-black focus:border-blue-400" placeholder="Value" value={(formData.tonometryDetails?.schiotz as any)?.[eye]?.iop || ""} onChange={(e) => {
                        const val = sanitizeOptometryInput(e.target.value, 'iop');
                        setFormData((p: any) => {
                          const currentDetails = p.tonometryDetails || {};
                          const currentSchiotz = currentDetails.schiotz || {};
                          const currentEye = (currentSchiotz as any)[eye] || {};
                          return { ...p, tonometryDetails: { ...currentDetails, schiotz: { ...currentSchiotz, [eye]: { ...currentEye, iop: val } } } };
                        });
                      }} />
                      <span className="text-[11px] font-bold text-slate-400 shrink-0">mmHg</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      </div>
    </Card>
  );
});

export function RefractionStation({ patient, doctors = [] }: { patient?: Patient | null, doctors?: any[] }) {
  const { toast } = useToast();
  const [selectedChips, setSelectedChips] = useState<{ condition: string; duration: string }[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCTRR, setIsUploadingCTRR] = useState(false);
  const [advanceLoading, setAdvanceLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState<string | undefined>(patient?.status);

  // Sync local status when patient prop changes
  useEffect(() => {
    setLocalStatus(patient?.status);
  }, [patient?.id, patient?.status]);

  // Determine if the form should be locked (not editable)
  const isSigned = localStatus === "consulted" || localStatus === "completed" || localStatus === "COMPLETED" || localStatus === "at_optical" || localStatus === "AT_OPTICAL";
  const isLocked = !localStatus || 
    localStatus === "AT_RECEPTION" || 
    localStatus === "reception" ||
    isSigned;

  const isCurrentlyInRefraction = localStatus === "IN_REFRACTION" || localStatus === "optometrist";

  const handleAdvanceToRefraction = async () => {
    if (!patient?.id) return;
    try {
      setAdvanceLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/patients/visits/${patient.id}/advance-to-refraction`,
        {
          method: "PATCH",
          headers: { "Authorization": `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to advance patient");
      }
      toast({
        title: "Status Updated",
        description: `${patient.name} is now In Refraction.`,
      });
      setLocalStatus("IN_REFRACTION"); // Align with Prisma enum name
      // Dispatch event so PatientQueue refreshes
      window.dispatchEvent(new Event("patientQueueUpdated"));
    } catch (error: any) {
      console.error("Advance to refraction error:", error);
      toast({
        variant: "destructive",
        title: "Failed",
        description: error.message || "Could not advance patient to refraction.",
      });
    } finally {
      setAdvanceLoading(false);
    }
  };

  const handleCTRRUpload = async () => {
    if (!formData.ctrr || !patient?.id || !patient?.mrNumber) return;
    if (!formData.ctrr.startsWith('data:image')) {
      toast({ title: "Already Uploaded", description: "Drawing is already stored in the cloud." });
      return;
    }

    setIsUploadingCTRR(true);
    try {
      // 1. Convert Base64 (Data URI) to Blob
      const response = await fetch(formData.ctrr);
      const blob = await response.blob();
      const file = new File([blob], `ctrr_${patient.id}.png`, { type: "image/png" });

      // 2. Prepare FormData
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mrNumber", patient.mrNumber.toString());
      fd.append("visitId", patient.id);

      // 3. Upload to backend → Google Drive
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/refraction/upload-ctrr`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: fd,
      });

      if (!res.ok) {
        throw new Error("Cloud upload rejected");
      }

      const result = await res.json();
      const cloudUrl = result.url || result.path;

      // 4. Update Form State locally
      setFormData(prev => ({ ...prev, ctrr: cloudUrl }));

      toast({
        title: "Cloud Sync Successful",
        description: "Drawing is now stored securely in the patient's cloud directory.",
      });

      return cloudUrl;
    } catch (err) {
      console.error("CTRR Cloud Upload error:", err);
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: "Could not upload drawing to cloud drive. It will be sent as a local draft.",
      });
      return null;
    } finally {
      setIsUploadingCTRR(false);
    }
  };

  const initialFormData = {
    complaint: "",
    complaintNotes: "",
    visualAcuity: {
      OD: { unaided: "", nearVision: "", aided: "", aidedNear: "", contactLens: "", contactLensNear: "", pinhole: "" },
      OS: { unaided: "", nearVision: "", aided: "", aidedNear: "", contactLens: "", contactLensNear: "", pinhole: "" },
      OU: { unaided: "", nearVision: "", aided: "", aidedNear: "", contactLens: "", contactLensNear: "", pinhole: "" },
    },
    pgPower: {
      activeTab: "glass",
      glass: {
        glassType: "SVN",
        OD: { sphere1: "", cylinder1: "", axis1: "", add: "", vn1: "", vnNear1: "", sphere2: "", cylinder2: "", axis2: "" },
        OS: { sphere1: "", cylinder1: "", axis1: "", add: "", vn1: "", vnNear1: "", sphere2: "", cylinder2: "", axis2: "" },
      },
      contact: {
        clType: "Soft",
        OD: { sphere1: "", cylinder1: "", axis1: "", add: "", vn1: "", vnNear1: "", sphere2: "", cylinder2: "", axis2: "" },
        OS: { sphere1: "", cylinder1: "", axis1: "", add: "", vn1: "", vnNear1: "", sphere2: "", cylinder2: "", axis2: "" },
      },
      notes: ""
    },
    objectiveRefraction: {
      type: "DilRR",
      OD: { sphere: "", cylinder: "", axis: "", qualityOfRef: "", cycloSphere: "", cycloCylinder: "", cycloAxis: "" },
      OS: { sphere: "", cylinder: "", axis: "", qualityOfRef: "", cycloSphere: "", cycloCylinder: "", cycloAxis: "" },
    },
    glassPrescription: {
      OD: { sphere: "", cylinder: "", axis: "", bcva: "", nearDsph: "", nearCylinder: "", nearAxis: "", nearAdd: "", nearBcva: "", nearCm: "" },
      OS: { sphere: "", cylinder: "", axis: "", bcva: "", nearDsph: "", nearCylinder: "", nearAxis: "", nearAdd: "", nearBcva: "", nearCm: "" },
    },
    contactLensPrescription: {
      OD: { sphere: "", cylinder: "", axis: "", bcva: "", nearDsph: "", nearCylinder: "", nearAxis: "", nearAdd: "", nearBcva: "", nearCm: "" },
      OS: { sphere: "", cylinder: "", axis: "", bcva: "", nearDsph: "", nearCylinder: "", nearAxis: "", nearAdd: "", nearBcva: "", nearCm: "" },
    },
    arMeterEnabled: false,
    arMeter: {
      OD: { SPH: "", CYL: "", AXIS: "" },
      OS: { SPH: "", CYL: "", AXIS: "" },
    },
    refining: {
      duochrome: { OD: "", OS: "" },
      jcc: { OD: "", OS: "" },
    },
    binocular: "",
    optometristNotes: "",
    keratometry: { OD: [], OS: [] },
    schirmerTest: { OD: "", OS: "" },
    ctrr: "", // CTRR Drawing Data (Base64)
    orthoptics: "",
    jcc: "",
    amslerGrid: "",
    ishiharaTest: { status: "", notes: "" },
    contrastSensitivity: "",
    autoRef: {
      OD: { sphere1: "", cylinder1: "", axis1: "" },
      OS: { sphere1: "", cylinder1: "", axis1: "" },
    },
    tonometryDetails: {
      nct: { OD: { mean: [], iop: "" }, OS: { mean: [], iop: "" } },
      gat: { OD: { reading: [], iop: "" }, OS: { reading: [], iop: "" } },
      schiotz: { OD: { reading: "", weight: "5.5", iop: "" }, OS: { reading: "", weight: "5.5", iop: "" } }
    },
    acceptance: {
      distance: { OD: { sphere: "", cylinder: "", axis: "", vn: "" }, OS: { sphere: "", cylinder: "", axis: "", vn: "" } },
      near: { OD: { sphere: "", cylinder: "", axis: "", vn: "" }, OS: { sphere: "", cylinder: "", axis: "", vn: "" } },
      remarks: { OD: "", OS: "" }
    },
  };

  const [formData, _setFormData] = useState(() => JSON.parse(JSON.stringify(initialFormData)));
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all = {
      portfolio: true, systemic: true, ocular: true, visualAcuity: true, pgPower: true,
      autoRef: true, objective: true, glass: true, secondary: true, specialized: true,
      tonometry: true, remarks: true, acceptance: true, contactLens: true
    };
    setOpenSections(all);
  };

  const collapseAll = () => {
    setOpenSections({});
  };

  // Wrapper around setFormData that auto-resets the verified checkbox on any data change
  const setFormData: typeof _setFormData = useCallback((updater) => {
    // Optimization: Only update isVerified if it's currently true
    setIsVerified(v => {
      if (v) return false;
      return v;
    });
    _setFormData(updater);
  }, []);

  // Reset form data and selected chips when patient changes
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const storageKey = `refraction_draft_${patient?.mrNumber}`;

  useEffect(() => {
    if (!patient?.id) {
      _setFormData(() => JSON.parse(JSON.stringify(initialFormData)));
      setSelectedChips([]);
      setIsVerified(false);
      setIsDraftLoaded(false);
      return;
    }

    // Prepare for new patient
    setIsDraftLoaded(false);
    const today = new Date().toISOString().split('T')[0];

    // Cleanup logic: Remove drafts from other days to save space
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('refraction_draft_')) {
        try {
          const rawDraft = localStorage.getItem(key);
          const draft = typeof rawDraft === 'string' ? JSON.parse(rawDraft) : rawDraft;
          if (draft && draft.date && draft.date !== today) {
            localStorage.removeItem(key);
          }
        } catch (e) { localStorage.removeItem(key); }
      }
    });

    const loadRefractionData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/api/refraction/${patient.id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });

        // 1. Fetch Server Data
        let serverData = null;
        if (res.ok) {
          serverData = await res.json();
        }

        // 2. Fetch Local Draft
        const savedDraft = localStorage.getItem(storageKey);
        let draftData = null;
        if (savedDraft) {
          try {
            const raw = savedDraft;
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (parsed && parsed.date === today) {
              draftData = parsed;
            }
          } catch (e) { /* ignore */ }
        }

        // 3. Robust Deep Merge: Safely merges source into target while preserving target structure
        const mergeDeep = (target: any, source: any): any => {
          if (source === null || source === undefined) return target;
          if (typeof source !== 'object' || Array.isArray(source)) return source;
          if (!target || typeof target !== 'object' || Array.isArray(target)) return source;

          const output = { ...target };
          Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
              if (key in target && typeof target[key] === 'object' && target[key] !== null) {
                output[key] = mergeDeep(target[key], source[key]);
              } else {
                output[key] = source[key];
              }
            } else {
              // Only overwrite if source[key] is not null/undefined or if target[key] is also null/undefined
              if (source[key] !== null && source[key] !== undefined) {
                output[key] = source[key];
              }
            }
          });
          return output;
        };

        if (serverData || draftData) {
          _setFormData(() => {
            const merged = mergeDeep(initialFormData, serverData || {});
            const final = mergeDeep(merged, draftData?.data || {});

            // Normalize Tonometry arrays to prevent crashes with legacy data
            ["OD", "OS"].forEach((eye) => {
              if (final.tonometryDetails?.nct?.[eye]) {
                const current = final.tonometryDetails.nct[eye];
                if (current.mean && !Array.isArray(current.mean)) {
                  current.mean = [current.mean.toString()];
                }
              }
              if (final.tonometryDetails?.gat?.[eye]) {
                const current = final.tonometryDetails.gat[eye];
                if (current.reading && !Array.isArray(current.reading)) {
                  current.reading = [current.reading.toString()];
                }
              }
            });

            return final;
          });

          if (Array.isArray(draftData?.chips)) {
            // Handle both legacy string format and new object format
            const sanitizedChips = draftData.chips.map((c: any) =>
              typeof c === 'string' ? { condition: c, duration: "" } : c
            );
            setSelectedChips(sanitizedChips);
          } else if (Array.isArray(serverData?.systemicHistory)) {
            const sanitizedChips = serverData.systemicHistory.map((c: any) =>
              typeof c === 'string' ? { condition: c, duration: "" } : c
            );
            setSelectedChips(sanitizedChips);
          }
        } else {
          _setFormData(() => ({ ...initialFormData }));
          setSelectedChips([]);
          setIsVerified(false);
        }

        setIsDraftLoaded(true);
      } catch (err) {
        console.error("Failed to load refraction session:", err);
        setIsDraftLoaded(true); // Enable editing anyway
      }
    };

    loadRefractionData();
  }, [patient?.id, storageKey]);

  // 1.5 Auto-Open Filled Sections
  useEffect(() => {
    if (isDraftLoaded && formData) {
      const sectionsWithData: Record<string, boolean> = {};
      
      if (selectedChips.length > 0) sectionsWithData.systemic = true;
      if (formData.complaint || formData.complaintNotes) sectionsWithData.ocular = true;
      
      const hasContent = (obj: any) => {
        if (!obj) return false;
        if (typeof obj === 'string') return obj.trim() !== "";
        if (typeof obj !== 'object') return false;
        return Object.values(obj).some(v => hasContent(v));
      };

      if (hasContent(formData.visualAcuity)) sectionsWithData.visualAcuity = true;
      
      const pg = formData.pgPower;
      if ([pg.glass?.OD, pg.glass?.OS, pg.contact?.OD, pg.contact?.OS].some(eye => eye && ["sphere1", "cylinder1", "axis1", "add"].some(f => (eye as any)[f] !== ""))) {
        sectionsWithData.pgPower = true;
      }
      
      const ar = formData.autoRef;
      if ([ar.OD, ar.OS].some(eye => ["sphere1", "cylinder1", "axis1"].some(f => (eye as any)[f] !== ""))) {
        sectionsWithData.autoRef = true;
      }

      const obj = formData.objectiveRefraction;
      if ([obj.OD, obj.OS].some(eye => ["sphere", "cylinder", "axis", "cycloSphere", "cycloCylinder", "cycloAxis"].some(f => (eye as any)[f] !== ""))) {
        sectionsWithData.objective = true;
      }

      const gp = formData.glassPrescription;
      if ([gp.OD, gp.OS].some(eye => ["sphere", "cylinder", "axis", "nearDsph", "nearAdd"].some(f => (eye as any)[f] !== ""))) {
        sectionsWithData.glass = true;
      }

      const sd = formData.tonometryDetails;
      if (hasContent(sd.nct) || hasContent(sd.gat) || hasContent(sd.schiotz)) sectionsWithData.tonometry = true;

      if (formData.optometristNotes) sectionsWithData.remarks = true;

      if (hasContent(formData.keratometry) || formData.jcc || formData.amslerGrid || hasContent(formData.refining)) sectionsWithData.specialized = true;
      
      if (formData.contrastSensitivity || formData.ishiharaTest?.status || hasContent(formData.schirmerTest)) sectionsWithData.secondary = true;
      
      if (hasContent(formData.acceptance)) sectionsWithData.acceptance = true;
      
      if (hasContent(formData.contactLensPrescription)) sectionsWithData.contactLens = true;

      setOpenSections(prev => ({ ...prev, ...sectionsWithData }));
    }
  }, [isDraftLoaded]);

  // 2. Auto-Save Draft
  useEffect(() => {
    if (!patient?.id || !isDraftLoaded) return;

    const saveTimer = setTimeout(() => {
      const draft = {
        data: formData,
        chips: selectedChips,
        date: new Date().toISOString().split('T')[0]
      };
      localStorage.setItem(storageKey, JSON.stringify(draft));
    }, 3000);

    return () => clearTimeout(saveTimer);
  }, [formData, selectedChips, patient?.id, storageKey, isDraftLoaded]);

  // Also reset verified if selectedChips change
  useEffect(() => {
    setIsVerified(false);
  }, [selectedChips]);

  // Prevent form submission via Enter key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !isVerified) {
        const target = e.target as HTMLElement;
        // Allow Enter in textareas, but prevent it from triggering submit
        if (target.tagName !== "TEXTAREA") {
          e.preventDefault();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isVerified]);

  const updateEyeGrid = (grid: string, eye: string, field: string, value: string, subType?: string) => {
    const fieldType = getFieldTypeFromName(field);
    const sanitizedVal = sanitizeOptometryInput(value, fieldType);
    setFormData(prev => {
      const currentGrid = prev[grid] || {};
      
      if (grid === "pgPower" && subType) {
        const subtypeObj = currentGrid[subType] || {};
        return {
          ...prev,
          pgPower: {
            ...currentGrid,
            [subType]: {
              ...subtypeObj,
              [eye]: {
                ...(subtypeObj[eye] || {}),
                [field]: sanitizedVal
              }
            }
          }
        };
      }

      const currentEye = currentGrid[eye] || {};
      return {
        ...prev,
        [grid]: {
          ...currentGrid,
          [eye]: {
            ...currentEye,
            [field]: sanitizedVal
          }
        }
      };
    });
  };

  const syncObjectiveToAcceptance = () => {
    setFormData(prev => {
      const ar = prev.objectiveRefraction;
      const newAcc = { 
        ...prev.acceptance,
        distance: {
          OD: { ...prev.acceptance.distance.OD, sphere: ar.OD.sphere, cylinder: ar.OD.cylinder, axis: ar.OD.axis },
          OS: { ...prev.acceptance.distance.OS, sphere: ar.OS.sphere, cylinder: ar.OS.cylinder, axis: ar.OS.axis }
        }
      };
      return { ...prev, acceptance: newAcc };
    });
    toast({ title: "Objective Sync Complete", description: "Subjective powers (SPH/CYL/AXIS) initialized from AR findings." });
  };

  const syncAcceptanceToFinal = () => {
    setFormData(prev => {
      const acc = prev.acceptance;
      const newRx = { 
        ...prev.glassPrescription,
        OD: { 
          ...prev.glassPrescription.OD, 
          sphere: acc.distance.OD.sphere, 
          cylinder: acc.distance.OD.cylinder, 
          axis: acc.distance.OD.axis,
          bcva: acc.distance.OD.vn,
          nearDsph: acc.near?.OD?.sphere || "",
          nearCylinder: acc.near?.OD?.cylinder || "",
          nearAxis: acc.near?.OD?.axis || "",
          nearBcva: acc.near?.OD?.vn || "",
        },
        OS: { 
          ...prev.glassPrescription.OS, 
          sphere: acc.distance.OS.sphere, 
          cylinder: acc.distance.OS.cylinder, 
          axis: acc.distance.OS.axis,
          bcva: acc.distance.OS.vn,
          nearDsph: acc.near?.OS?.sphere || "",
          nearCylinder: acc.near?.OS?.cylinder || "",
          nearAxis: acc.near?.OS?.axis || "",
          nearBcva: acc.near?.OS?.vn || "",
        }
      };
      return { ...prev, glassPrescription: newRx };
    });
    toast({ title: "Prescription Sync Complete", description: "Values have been populated from Subjective Acceptance results." });
  };

  const syncAcceptanceToCL = () => {
    setFormData(prev => {
      const acc = prev.acceptance;
      const newCL = { 
        ...prev.contactLensPrescription,
        OD: { 
          ...prev.contactLensPrescription.OD, 
          sphere: acc.distance.OD.sphere, 
          cylinder: acc.distance.OD.cylinder, 
          axis: acc.distance.OD.axis,
          bcva: acc.distance.OD.vn,
          nearDsph: acc.near?.OD?.sphere || "",
          nearCylinder: acc.near?.OD?.cylinder || "",
          nearAxis: acc.near?.OD?.axis || "",
          nearBcva: acc.near?.OD?.vn || "",
        },
        OS: { 
          ...prev.contactLensPrescription.OS, 
          sphere: acc.distance.OS.sphere, 
          cylinder: acc.distance.OS.cylinder, 
          axis: acc.distance.OS.axis,
          bcva: acc.distance.OS.vn,
          nearDsph: acc.near?.OS?.sphere || "",
          nearCylinder: acc.near?.OS?.cylinder || "",
          nearAxis: acc.near?.OS?.axis || "",
          nearBcva: acc.near?.OS?.vn || "",
        }
      };
      return { ...prev, contactLensPrescription: newCL };
    });
    toast({ title: "Contact Lens Sync Complete", description: "Values have been populated from Subjective Acceptance results." });
  };

  // If we don't have a patient selected, show an empty state instead of the form
  if (!patient || !patient.id) {
    return (
      <div className="flex-1 p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">No Patient Selected</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Please select a patient from the queue on the left to begin the refraction assessment.
        </p>
      </div>
    );
  }

  const patientAge = getPatientAgeNumber(patient);

  let userSession: any = {};
  try {
    userSession = JSON.parse(localStorage.getItem("user_session") || "{}");
  } catch (e) {
    console.error("Failed to parse user session", e);
  }

  const userName = userSession?.name || "Not Attended";

  const toggleChip = (c: string) =>
    setSelectedChips((prev) =>
      prev.some(item => item.condition === c)
        ? prev.filter((x) => x.condition !== c)
        : [...prev, { condition: c, duration: "" }]
    );

  const updateChipDuration = (condition: string, duration: string) => {
    setSelectedChips(prev =>
      prev.map(item => item.condition === condition ? { ...item, duration: sanitizeOptometryInput(duration, 'notes') } : item)
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
      {/* Premium Diagnostic Header */}
      <div className="bg-orange-50/80 border-b border-orange-200/60 px-4 md:px-8 py-1.5 md:py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 shadow-sm z-20 gap-2 md:gap-6 text-slate-900 min-h-[56px] sm:min-h-0">
        <div className="flex items-center gap-3 md:gap-6 w-full sm:w-auto">
          <div className="bg-orange-100/50 text-slate-900 p-2 md:p-3 shrink-0 ring-1 ring-orange-200/50 hidden xs:block">
            <Crosshair className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
          </div>
          <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <h2 className="text-sm md:text-lg font-black text-slate-900 tracking-tighter uppercase leading-none truncate max-w-[140px] sm:max-w-none">{patient.name || "UNNAMED PATIENT"}</h2>
            <div className="flex items-center gap-2 shrink-0">
              {(() => {
                const slot = calculateSessionSlot(patient, doctors);
                if (!slot) return null;
                return (
                  <Badge className="bg-blue-600 text-white text-[7px] md:text-[9px] px-1 md:px-2 font-bold rounded-none h-3.5 md:h-4.5 border-0 shadow-sm">
                    {slot}
                  </Badge>
                );
              })()}
              <Badge className="bg-white text-slate-500 border border-slate-200 text-[8px] md:text-[11px] px-1.5 md:px-2.5 font-bold rounded-none h-4 md:h-5">
                T-{patient.tokenNumber || "—"}
              </Badge>
              <Badge className="bg-[orange-600] text-white text-[8px] md:text-[11px] px-2 md:px-3 font-mono tracking-widest rounded-none h-4 md:h-5 font-black">MR-{patient.mrNumber?.toString() || "0000"}</Badge>
            </div>
            <div className="hidden xs:block h-3.5 w-px bg-orange-200" />
            <p className="text-[8px] md:text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
              {patient.gender} • {getPatientAgeString(patient)} • Diagnostic Phase
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 md:gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0">
          {(localStatus === "completed" || localStatus === "COMPLETED") && (
            <Badge className="bg-emerald-600 text-white border-0 gap-2 h-9 md:h-11 px-4 md:px-6 rounded-none font-black uppercase text-[10px] md:text-xs tracking-widest shadow-md shrink-0">
              <CheckCircle2 className="w-4 h-4 md:w-5 h-5" />
              Visit Completed
            </Badge>
          )}
          <div className="flex items-center gap-1 bg-slate-50 p-1 mr-2 border border-slate-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={expandAll}
              className="h-7 px-2 text-[9px] font-black uppercase tracking-tighter text-slate-500 hover:text-blue-600 hover:bg-white transition-all"
            >
              Expand All
            </Button>
            <div className="w-px h-3 bg-slate-200" />
            <Button
              variant="ghost"
              size="sm"
              onClick={collapseAll}
              className="h-7 px-2 text-[9px] font-black uppercase tracking-tighter text-slate-500 hover:text-rose-600 hover:bg-white transition-all"
            >
              Collapse All
            </Button>
          </div>
          {(localStatus === "AT_RECEPTION" || localStatus === "reception") && (
            <Button
              size="sm"
              onClick={handleAdvanceToRefraction}
              disabled={advanceLoading}
              className="h-9 md:h-11 gap-2 bg-status-optometrist hover:bg-black text-white font-black uppercase tracking-widest rounded-none px-3 md:px-6 shadow-md transition-all text-[9px] md:text-xs"
            >
              <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
              {advanceLoading ? "..." : "Begin Refraction"}
            </Button>
          )}
          <div className="text-right border-l border-slate-100 pl-3 md:pl-5 shrink-0">
            <p className="text-[7px] md:text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Lead Optometrist</p>
            <p className="text-xs md:text-sm font-black text-[orange-600] truncate max-w-[120px] sm:max-w-none">{userName}</p>
          </div>
        </div>
      </div>
      {/* Main Clinical Workspace - Isolated Scrollable Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent hover:scrollbar-thumb-slate-300 transition-all bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-2 md:px-4 py-4">
          <fieldset 
            disabled={isLocked}
            className={cn("space-y-4 md:space-y-6 border-0 p-0 m-0 min-w-0 transition-all", isLocked && "opacity-80 pointer-events-none grayscale")}
          >

              {/* Clinical Scan Portfolio */}
            <Card className="border-2 border-slate-100 rounded-none shadow-sm overflow-hidden">
              <div 
                className="bg-slate-100 text-slate-950 px-4 md:px-5 py-2 md:py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-200/50 transition-colors border-l-4 border-l-slate-500"
                onClick={() => toggleSection('portfolio')}
              >
                <div className="flex items-center gap-3">
                  <Scan className="w-4 h-4 text-slate-700" />
                  <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em]">Clinical Scan Portfolio</h3>
                </div>
                {openSections['portfolio'] ? <ChevronDown className="w-4 h-4 text-slate-600" /> : <ChevronRight className="w-4 h-4 text-slate-600" />}
              </div>
              <div className={cn(
                "transition-all duration-300 ease-in-out overflow-hidden",
                openSections['portfolio'] ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
              )}>
                <CardContent className="p-3 md:p-4">
                <div className="bg-slate-50 p-3 md:p-4 border-2 border-dashed border-slate-200">
                  <ScanReportGallery mrNumber={patient.mrNumber?.toString()} visitId={patient.id} allowUpload={isCurrentlyInRefraction} />
                </div>
              </CardContent>
              </div>
            </Card>

            {/* Systemic History */}
            <Card className="border-2 border-rose-100 rounded-none shadow-sm overflow-hidden">
              <div 
                className="bg-rose-100 text-rose-950 px-4 md:px-5 py-2 md:py-2.5 flex items-center justify-between cursor-pointer hover:bg-rose-200/50 transition-colors border-l-4 border-l-rose-500"
                onClick={() => toggleSection('systemic')}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-rose-700" />
                  <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em]">Systemic Health Portfolio</h3>
                </div>
                {openSections['systemic'] ? <ChevronDown className="w-4 h-4 text-rose-600" /> : <ChevronRight className="w-4 h-4 text-rose-600" />}
              </div>
              <div className={cn(
                "transition-all duration-300 ease-in-out overflow-hidden",
                openSections['systemic'] ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
              )}>
                <CardContent className="p-3 md:p-4 bg-rose-50/10">
                <div className="clinical-group !bg-transparent !border-none !p-0">
                  <div className="border-2 border-slate-100 bg-white/50 p-3 md:border-0 md:bg-transparent md:p-0 space-y-6">
                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                      {systemic.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleChip(c)}
                          className={cn(
                            "px-4 py-2 rounded-none text-[9px] font-black uppercase tracking-widest border transition-all",
                            selectedChips.some(item => item.condition === c)
                              ? "bg-rose-600 text-white border-rose-600 shadow-lg translate-y-[-1px]"
                              : "bg-white text-slate-600 border-rose-100 hover:border-rose-300 hover:text-slate-800"
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>

                    {/* Selected Health Portfolios with Duration Inputs */}
                    {selectedChips.length > 0 && (
                      <div className="flex flex-wrap gap-3 pt-4 border-t border-rose-50">
                        {selectedChips.map((item) => (
                          <div key={item.condition} className="bg-white border border-rose-100 p-1.5 pl-3 flex items-center gap-3 shadow-sm hover:border-rose-400 transition-all shrink-0">
                            <div className="py-0.5 whitespace-nowrap">
                              <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-700 block leading-tight">
                                {item.condition}
                              </span>
                              <span className="text-[6.5px] font-bold text-slate-400 uppercase tracking-widest leading-none">Active Diagnosis</span>
                            </div>
                            <div className="w-24 shrink-0">
                              <Input
                                placeholder="Duration..."
                                value={item.duration}
                                onChange={(e) => updateChipDuration(item.condition, e.target.value)}
                                className="h-8 text-[10px] font-black rounded-none border-0 bg-rose-50/50 hover:bg-rose-50 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-rose-500 transition-all px-2 text-slate-900"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              </div>
            </Card>

            {/* Primary Ocular Complaints */}
            <Card className="border-2 border-amber-100 rounded-none shadow-sm overflow-hidden">
              <div 
                className="bg-amber-100 text-amber-950 px-4 md:px-5 py-2 md:py-2.5 flex items-center justify-between cursor-pointer hover:bg-amber-200/50 transition-colors border-l-4 border-l-amber-500"
                onClick={() => toggleSection('ocular')}
              >
                <div className="flex items-center gap-3">
                  <History className="w-4 h-4 text-amber-700" />
                  <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em]">Primary Ocular Complaints</h3>
                </div>
                {openSections['ocular'] ? <ChevronDown className="w-4 h-4 text-amber-600" /> : <ChevronRight className="w-4 h-4 text-amber-600" />}
              </div>
              <div className={cn(
                "transition-all duration-300 ease-in-out overflow-hidden",
                openSections['ocular'] ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
              )}>
                <CardContent className="p-3 md:p-4 bg-violet-50/10">
                <div className="clinical-group !bg-transparent !border-none !p-0">
                  <div className="border-2 border-slate-100 bg-white/50 p-4 md:border-0 md:bg-transparent md:p-0 space-y-6">
                    <div className="flex flex-col md:flex-row gap-4 md:gap-8">
                      <div className="w-full md:w-80 space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest pl-1">Chief Complaint</label>
                        <Select value={formData.complaint} onValueChange={(val) => setFormData(p => ({ ...p, complaint: val }))}>
                          <SelectTrigger className="h-10 text-sm font-black rounded-none border-violet-100 bg-white text-slate-900"><SelectValue placeholder="Select complaint" /></SelectTrigger>
                          <SelectContent className="rounded-none">
                            {complaints.map((c) => <SelectItem key={c} value={c.toLowerCase()} className="font-bold py-2">{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest pl-1">Detailed Symptomology</label>
                        <Textarea
                          className="min-h-[100px] font-bold p-3 md:p-4 bg-white/50 border-violet-100 text-slate-900 focus:border-violet-400"
                          placeholder="Describe symptoms..."
                          value={formData.complaintNotes}
                          onChange={(e) => setFormData(p => ({ ...p, complaintNotes: sanitizeOptometryInput(e.target.value, 'notes') }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              </div>
            </Card>

            {/* Visual Acuity */}
            <Card className="border-2 border-blue-100 rounded-none shadow-sm overflow-hidden">
              <div 
                className="bg-blue-100 text-blue-950 px-5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-blue-200/50 transition-colors border-l-4 border-l-blue-500"
                onClick={() => toggleSection('visualAcuity')}
              >
                <div className="flex items-center gap-3">
                  <Eye className="w-4 h-4 text-blue-700" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Quantitative Visual Acuity (VA)</h3>
                </div>
                {openSections['visualAcuity'] ? <ChevronDown className="w-4 h-4 text-blue-600" /> : <ChevronRight className="w-4 h-4 text-blue-600" />}
              </div>
              <div className={cn(
                "transition-all duration-300 ease-in-out overflow-hidden",
                openSections['visualAcuity'] ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
              )}>
                <CardContent className="p-6 bg-blue-50/10">
                <div className="clinical-group !bg-transparent !border-none !p-0">

                  {/* Mobile VA Card Layout */}
                  <div className="grid grid-cols-1 gap-4 md:hidden pt-3">
                    {["OD", "OS", "OU"].map((eye) => (
                      <div key={eye} className="border-2 border-slate-100 bg-white p-3 space-y-3">
                        <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
                          <span className={cn(
                            "w-9 h-9 flex items-center justify-center font-black text-xs border-2",
                            eye === "OD" ? "border-blue-600 text-blue-600" : eye === "OS" ? "border-emerald-600 text-emerald-600" : "border-slate-600 text-slate-600"
                          )}>{eye}</span>
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{eye === "OD" ? "Right Eye" : eye === "OS" ? "Left Eye" : "Both Eyes"}</span>
                        </div>

                        <div className="space-y-4">
                          {/* Unaided */}
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-blue-600 tracking-widest bg-blue-50 px-2 py-0.5">Unaided Vision (DV/NV)</label>
                            <div className="grid grid-cols-2 gap-2">
                              <Select value={(formData.visualAcuity as any)?.[eye]?.unaided || ""} onValueChange={(val) => updateEyeGrid("visualAcuity", eye, "unaided", val)}>
                                <SelectTrigger className="h-12 text-sm font-black rounded-none border-slate-200 focus:border-[orange-600] focus-visible:ring-0 focus-visible:ring-offset-0"><SelectValue placeholder="DV" /></SelectTrigger>
                                <SelectContent className="max-h-[300px] overflow-y-auto uppercase">{DIST_VISION_OPTIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                              </Select>
                              <Select value={(formData.visualAcuity as any)?.[eye]?.nearVision || ""} onValueChange={(val) => updateEyeGrid("visualAcuity", eye, "nearVision", val)}>
                                <SelectTrigger className="h-12 text-sm font-black rounded-none border-slate-200 focus:border-[orange-600] focus-visible:ring-0 focus-visible:ring-offset-0"><SelectValue placeholder="NV" /></SelectTrigger>
                                <SelectContent className="max-h-[300px] overflow-y-auto uppercase">{NEAR_VISION_OPTIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Aided */}
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-emerald-600 tracking-widest bg-emerald-50 px-2 py-0.5">Aided Vision (DV/NV)</label>
                            <div className="grid grid-cols-2 gap-2">
                              <Select value={(formData.visualAcuity as any)?.[eye]?.aided || ""} onValueChange={(val) => updateEyeGrid("visualAcuity", eye, "aided", val)}>
                                <SelectTrigger className="h-12 text-sm font-black rounded-none border-slate-200 focus:border-[orange-600] focus-visible:ring-0 focus-visible:ring-offset-0"><SelectValue placeholder="DV" /></SelectTrigger>
                                <SelectContent className="max-h-[300px] overflow-y-auto uppercase">{DIST_VISION_OPTIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                              </Select>
                              <Select value={(formData.visualAcuity as any)?.[eye]?.aidedNear || ""} onValueChange={(val) => updateEyeGrid("visualAcuity", eye, "aidedNear", val)}>
                                <SelectTrigger className="h-12 text-sm font-black rounded-none border-slate-200 focus:border-[orange-600] focus-visible:ring-0 focus-visible:ring-offset-0"><SelectValue placeholder="NV" /></SelectTrigger>
                                <SelectContent className="max-h-[300px] overflow-y-auto uppercase">{NEAR_VISION_OPTIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Contact Lens */}
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest bg-slate-100 px-2 py-0.5">Contact Lens (DV/NV)</label>
                            <div className="grid grid-cols-2 gap-2">
                              <Select value={(formData.visualAcuity as any)?.[eye]?.contactLens || ""} onValueChange={(val) => updateEyeGrid("visualAcuity", eye, "contactLens", val)}>
                                <SelectTrigger className="h-12 text-sm font-black rounded-none border-slate-200 focus:border-[orange-600] focus-visible:ring-0 focus-visible:ring-offset-0"><SelectValue placeholder="DV" /></SelectTrigger>
                                <SelectContent className="max-h-[300px] overflow-y-auto uppercase">{DIST_VISION_OPTIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                              </Select>
                              <Select value={(formData.visualAcuity as any)?.[eye]?.contactLensNear || ""} onValueChange={(val) => updateEyeGrid("visualAcuity", eye, "contactLensNear", val)}>
                                <SelectTrigger className="h-12 text-sm font-black rounded-none border-slate-200 focus:border-[orange-600] focus-visible:ring-0 focus-visible:ring-offset-0"><SelectValue placeholder="NV" /></SelectTrigger>
                                <SelectContent className="max-h-[300px] overflow-y-auto uppercase">{NEAR_VISION_OPTIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Pinhole */}
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-amber-600 tracking-widest bg-amber-50 px-2 py-0.5">Pinhole (DV ONLY)</label>
                            <Select value={(formData.visualAcuity as any)?.[eye]?.pinhole || ""} onValueChange={(val) => updateEyeGrid("visualAcuity", eye, "pinhole", val)}>
                              <SelectTrigger className="h-12 text-sm font-black rounded-none border-slate-200 focus:border-[orange-600] focus-visible:ring-0 focus-visible:ring-offset-0"><SelectValue placeholder="DV" /></SelectTrigger>
                              <SelectContent className="max-h-[300px] overflow-y-auto uppercase">{DIST_VISION_OPTIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop VA Table Layout */}
                  <div className="hidden md:block overflow-x-auto pt-3">
                    <div className="min-w-[800px] xl:min-w-0">
                      <Table className="border-collapse table-fixed w-full">
                        <TableHeader>
                          <TableRow className="h-16 hover:bg-transparent border-b-2 border-slate-200">
                            <TableHead className="w-[70px] text-[10px] font-black uppercase tracking-widest text-[orange-600] pl-6">Eye</TableHead>
                            <TableHead className="w-[190px] text-center bg-blue-50/50">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-1 block">Unaided Vision</span>
                              <div className="flex justify-around text-[8px] font-black text-blue-400"><span>DV</span><span>NV</span></div>
                            </TableHead>
                            <TableHead className="w-[190px] text-center bg-emerald-50/50">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-1 block">Aided Vision</span>
                              <div className="flex justify-around text-[8px] font-black text-emerald-400"><span>DV</span><span>NV</span></div>
                            </TableHead>
                            <TableHead className="w-[190px] text-center bg-slate-100/50">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-1 block">Contact Lens</span>
                              <div className="flex justify-around text-[8px] font-black text-slate-400"><span>DV</span><span>NV</span></div>
                            </TableHead>
                            <TableHead className="w-[120px] text-center bg-amber-50/50 pr-4">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 mb-1 block">Pinhole (PH)</span>
                              <div className="text-[8px] font-black text-amber-400">DV ONLY</div>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {["OD", "OS", "OU"].map((eye) => (
                            <TableRow key={eye} className="h-24 hover:bg-slate-50/30 transition-colors">
                              <TableCell className="pl-6">
                                <div className={cn(
                                  "w-9 h-9 flex items-center justify-center font-black text-xs border-2",
                                  eye === "OD" ? "border-blue-600 text-blue-600" : eye === "OS" ? "border-emerald-600 text-emerald-600" : "border-slate-600 text-slate-600"
                                )}>{eye}</div>
                              </TableCell>
                              <TableCell className="bg-blue-50/20 px-2 py-4">
                                <div className="grid grid-cols-2 gap-2 h-14">
                                  <Select value={(formData.visualAcuity as any)?.[eye]?.unaided || ""} onValueChange={(val) => updateEyeGrid("visualAcuity", eye, "unaided", val)}>
                                    <SelectTrigger className="h-full w-full text-center text-[13px] sm:text-sm font-black rounded-none border-slate-200 focus:border-[orange-600] focus-visible:ring-0 focus-visible:ring-offset-0 bg-white shadow-none transition-none min-w-0"><SelectValue placeholder="-" /></SelectTrigger>
                                    <SelectContent className="max-h-[300px] overflow-y-auto uppercase">{DIST_VISION_OPTIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                                  </Select>
                                  <Select value={(formData.visualAcuity as any)?.[eye]?.nearVision || ""} onValueChange={(val) => updateEyeGrid("visualAcuity", eye, "nearVision", val)}>
                                    <SelectTrigger className="h-full w-full text-center text-[13px] sm:text-sm font-black rounded-none border-slate-200 focus:border-[orange-600] focus-visible:ring-0 focus-visible:ring-offset-0 bg-white shadow-none transition-none min-w-0"><SelectValue placeholder="-" /></SelectTrigger>
                                    <SelectContent className="max-h-[300px] overflow-y-auto uppercase">{NEAR_VISION_OPTIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                                  </Select>
                                </div>
                              </TableCell>
                              <TableCell className="bg-emerald-50/20 px-2 py-4">
                                <div className="grid grid-cols-2 gap-2 h-14">
                                  <Select value={(formData.visualAcuity as any)?.[eye]?.aided || ""} onValueChange={(val) => updateEyeGrid("visualAcuity", eye, "aided", val)}>
                                    <SelectTrigger className="h-full w-full text-center text-[13px] sm:text-sm font-black rounded-none border-slate-200 focus:border-[orange-600] focus-visible:ring-0 focus-visible:ring-offset-0 bg-white shadow-none transition-none min-w-0"><SelectValue placeholder="-" /></SelectTrigger>
                                    <SelectContent className="max-h-[300px] overflow-y-auto uppercase">{DIST_VISION_OPTIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                                  </Select>
                                  <Select value={(formData.visualAcuity as any)?.[eye]?.aidedNear || ""} onValueChange={(val) => updateEyeGrid("visualAcuity", eye, "aidedNear", val)}>
                                    <SelectTrigger className="h-full w-full text-center text-[13px] sm:text-sm font-black rounded-none border-slate-200 focus:border-[orange-600] focus-visible:ring-0 focus-visible:ring-offset-0 bg-white shadow-none transition-none min-w-0"><SelectValue placeholder="-" /></SelectTrigger>
                                    <SelectContent className="max-h-[300px] overflow-y-auto uppercase">{NEAR_VISION_OPTIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                                  </Select>
                                </div>
                              </TableCell>
                              <TableCell className="bg-slate-100/20 px-2 py-4">
                                <div className="grid grid-cols-2 gap-2 h-14">
                                  <Select value={(formData.visualAcuity as any)?.[eye]?.contactLens || ""} onValueChange={(val) => updateEyeGrid("visualAcuity", eye, "contactLens", val)}>
                                    <SelectTrigger className="h-full w-full text-center text-[13px] sm:text-sm font-black rounded-none border-slate-200 focus:border-[orange-600] focus-visible:ring-0 focus-visible:ring-offset-0 bg-white shadow-none transition-none min-w-0"><SelectValue placeholder="-" /></SelectTrigger>
                                    <SelectContent className="max-h-[300px] overflow-y-auto uppercase">{DIST_VISION_OPTIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                                  </Select>
                                  <Select value={(formData.visualAcuity as any)?.[eye]?.contactLensNear || ""} onValueChange={(val) => updateEyeGrid("visualAcuity", eye, "contactLensNear", val)}>
                                    <SelectTrigger className="h-full w-full text-center text-[13px] sm:text-sm font-black rounded-none border-slate-200 focus:border-[orange-600] focus-visible:ring-0 focus-visible:ring-offset-0 bg-white shadow-none transition-none min-w-0"><SelectValue placeholder="-" /></SelectTrigger>
                                    <SelectContent className="max-h-[300px] overflow-y-auto uppercase">{NEAR_VISION_OPTIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                                  </Select>
                                </div>
                              </TableCell>
                              <TableCell className="bg-amber-50/20 px-2 py-4">
                                <div className="h-14">
                                  <Select value={(formData.visualAcuity as any)?.[eye]?.pinhole || ""} onValueChange={(val) => updateEyeGrid("visualAcuity", eye, "pinhole", val)}>
                                    <SelectTrigger className="h-full w-full text-center text-sm font-black rounded-none border-slate-200 focus:border-[orange-600] focus-visible:ring-0 focus-visible:ring-offset-0 bg-white shadow-none transition-none min-w-0"><SelectValue placeholder="-" /></SelectTrigger>
                                    <SelectContent className="max-h-[300px] overflow-y-auto uppercase">{DIST_VISION_OPTIONS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                                  </Select>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </CardContent>
              </div>
            </Card>

            {/* Previous Optical Prescription (PG Power) */}
            <Card className="border-2 border-emerald-100 rounded-none shadow-sm overflow-hidden">
              <div 
                className="bg-emerald-100 text-emerald-950 px-5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-emerald-200/50 transition-colors border-l-4 border-l-emerald-500"
                onClick={() => toggleSection('pgPower')}
              >
                <div className="flex items-center gap-3">
                  <ClipboardList className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Previous Optical Prescription (PG Power)</h3>
                </div>
                {openSections['pgPower'] ? <ChevronDown className="w-4 h-4 text-emerald-600" /> : <ChevronRight className="w-4 h-4 text-emerald-600" />}
              </div>
              <div className={cn(
                "transition-all duration-300 ease-in-out overflow-hidden",
                openSections['pgPower'] ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
              )}>
                <CardContent className="p-6 bg-orange-50/10">
                <div className="clinical-group !bg-transparent !border-none !p-0">
                  <div className="flex flex-wrap gap-6 pt-4">
                    <RadioGroup
                      value={formData.pgPower.activeTab}
                      onValueChange={(val) => setFormData(p => ({ ...p, pgPower: { ...p.pgPower, activeTab: val } }))}
                      className="flex flex-col sm:flex-row gap-4 sm:gap-8"
                    >
                      <div className={cn("flex items-center space-x-3 px-4 sm:px-6 py-3 sm:py-4 border cursor-pointer", formData.pgPower.activeTab === 'glass' ? 'bg-[orange-600]/5 border-[orange-600]' : 'bg-slate-50 border-slate-100')} onClick={() => setFormData(p => ({ ...p, pgPower: { ...p.pgPower, activeTab: 'glass' } }))}>
                        <RadioGroupItem value="glass" id="pg-glass" className="w-5 h-5 border-2 text-[orange-600]" />
                        <Label htmlFor="pg-glass" className="text-sm font-black uppercase tracking-widest text-[orange-600] cursor-pointer">Spectacles</Label>
                      </div>
                      <div className={cn("flex items-center space-x-3 px-4 sm:px-6 py-3 sm:py-4 border cursor-pointer", formData.pgPower.activeTab === 'contact' ? 'bg-[orange-600]/5 border-[orange-600]' : 'bg-slate-50 border-slate-100')} onClick={() => setFormData(p => ({ ...p, pgPower: { ...p.pgPower, activeTab: 'contact' } }))}>
                        <RadioGroupItem value="contact" id="pg-contact" className="w-5 h-5 border-2 text-[orange-600]" />
                        <Label htmlFor="pg-contact" className="text-sm font-black uppercase tracking-widest text-[orange-600] cursor-pointer">Contact Lens</Label>
                      </div>
                    </RadioGroup>

                    {formData.pgPower.activeTab === "glass" && (
                      <div className="space-y-3 min-w-[200px]">
                        <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest block">Lens Architecture</label>
                        <Select value={formData.pgPower.glass.glassType} onValueChange={(val) => setFormData(p => ({ ...p, pgPower: { ...p.pgPower, glass: { ...p.pgPower.glass, glassType: val } } }))}>
                          <SelectTrigger className="h-14 font-black uppercase text-xs rounded-none bg-white border-orange-100 text-slate-950 focus:border-orange-400"><SelectValue placeholder="Select Type" /></SelectTrigger>
                          <SelectContent className="font-bold">
                            <SelectItem value="SVN">Single Vision (SVN)</SelectItem>
                            <SelectItem value="KBF">Bifocals (KBF)</SelectItem>
                            <SelectItem value="PAL">Progressive (PAL)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {formData.pgPower.activeTab === "contact" && (
                      <div className="space-y-3 min-w-[200px]">
                        <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest block">Lens Architecture</label>
                        <Select value={formData.pgPower.contact.clType} onValueChange={(val) => setFormData(p => ({ ...p, pgPower: { ...p.pgPower, contact: { ...p.pgPower.contact, clType: val } } }))}>
                          <SelectTrigger className="h-14 font-black uppercase text-xs rounded-none bg-white border-orange-100 text-slate-950 focus:border-orange-400"><SelectValue placeholder="Select Type" /></SelectTrigger>
                          <SelectContent className="font-bold">
                            <SelectItem value="Soft">Soft Contact Lens</SelectItem>
                            <SelectItem value="RGP">RGP Lens</SelectItem>
                            <SelectItem value="Scleral">Scleral Lens</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                    {["OD", "OS"].map((eye) => (
                      <div key={eye} className="border-2 border-slate-100 bg-white/50 p-3 md:border-0 md:bg-transparent md:p-0 space-y-4">
                        <div className="flex items-center gap-3 border-b border-orange-100 pb-2">
                          <span className={cn(
                            "w-9 h-9 flex items-center justify-center font-black text-xs border-2",
                            eye === "OD" || eye === "od" ? "border-blue-600 text-blue-600" : eye === "OS" || eye === "os" ? "border-emerald-600 text-emerald-600" : "border-slate-600 text-slate-600"
                          )}>{eye}</span>
                          <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{eye === "OD" ? "Right Eye" : "Left Eye"} Result</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {["sphere1", "cylinder1", "axis1", "add", "vn1", "vnNear1"].map((f) => {
                            const labels: any = { sphere1: "SPH", cylinder1: "CYL", axis1: "AXIS", add: "ADD", vn1: "VA(DV)", vnNear1: "VA(NV)" };
                            return (
                              <div key={f} className="space-y-1">
                                <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest pl-1">{labels[f]}</label>
                                {f.startsWith("vn") ? (
                                  <Select value={(formData.pgPower as any)[formData.pgPower.activeTab]?.[eye]?.[f] || ""} onValueChange={(val) => updateEyeGrid("pgPower", eye, f, val, formData.pgPower.activeTab)}>
                                    <SelectTrigger className="h-11 text-center text-xs font-black rounded-none border-orange-100 bg-white text-slate-900 focus:border-orange-400"><SelectValue placeholder="-" /></SelectTrigger>
                                    <SelectContent className="max-h-[250px] overflow-y-auto uppercase">{f === "vnNear1" ? NEAR_VISION_OPTIONS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>) : DIST_VISION_OPTIONS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                                  </Select>
                                ) : (
                                  <Input className="h-11 text-center text-base font-black bg-white rounded-none border-orange-100 text-slate-900 focus:border-orange-400" value={(formData.pgPower as any)[formData.pgPower.activeTab]?.[eye]?.[f] || ""} onChange={(e) => updateEyeGrid("pgPower", eye, f, e.target.value, formData.pgPower.activeTab)} placeholder="0.00" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              </div>
            </Card>

            {/* Automated Refraction (AR/REK) */}
            <Card className="border-2 border-purple-100 rounded-none shadow-sm overflow-hidden">
              <div 
                className="bg-purple-100 text-purple-950 px-5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-purple-200/50 transition-colors border-l-4 border-l-purple-500"
                onClick={() => toggleSection('autoRef')}
              >
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-purple-700" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Automated Refraction (AR/REK)</h3>
                </div>
                {openSections['autoRef'] ? <ChevronDown className="w-4 h-4 text-purple-600" /> : <ChevronRight className="w-4 h-4 text-purple-600" />}
              </div>
              <div className={cn(
                "transition-all duration-300 ease-in-out overflow-hidden",
                openSections['autoRef'] ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
              )}>
                <CardContent className="p-6 bg-cyan-50/10">
                <div className="clinical-group !bg-transparent !border-none !p-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    {["OD", "OS"].map((eye) => (
                      <div key={eye} className="border-2 border-slate-100 bg-white/50 p-2 md:border-0 md:bg-transparent md:p-0 space-y-4">
                        <div className="flex items-center gap-3 border-b border-cyan-100 pb-2">
                          <span className={cn(
                            "w-9 h-9 flex items-center justify-center font-black text-xs border-2",
                            eye === "OD" || eye === "od" ? "border-blue-600 text-blue-600" : "border-emerald-600 text-emerald-600"
                          )}>{eye}</span>
                          <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Digital Sensing {eye === "OD" ? "Right" : "Left"}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {["sphere1", "cylinder1", "axis1"].map((f) => (
                            <div key={f} className="space-y-1">
                              <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest pl-1">{f.replace("1", "").toUpperCase()}</label>
                              <Input
                                className="h-11 text-center text-base font-black bg-white border-cyan-100 rounded-none focus:border-cyan-400 text-slate-900"
                                value={(formData.autoRef as any)[eye]?.[f] || ""}
                                onChange={(e) => updateEyeGrid("autoRef", eye, f, e.target.value)}
                                placeholder="—"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              </div>
            </Card>


            {/* Objective Refraction & Retinoscopy */}
            <Card className="border-2 border-teal-100 rounded-none shadow-sm overflow-hidden">
              <div 
                className="bg-teal-100 text-teal-950 px-5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-teal-200/50 transition-colors border-l-4 border-l-teal-500"
                onClick={() => toggleSection('objective')}
              >
                <div className="flex items-center gap-3">
                  <Crosshair className="w-4 h-4 text-teal-700" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em]">Objective Refraction (Retinoscopy)</h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-4 bg-emerald-200/50 px-3 py-1 border border-emerald-300" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[9px] font-black uppercase text-emerald-900 tracking-widest pl-2">Modality:</span>
                    <Select value={formData.objectiveRefraction?.type || "cycloRR"} onValueChange={(val) => setFormData(p => ({ ...p, objectiveRefraction: { ...p.objectiveRefraction, type: val } as any }))}>
                      <SelectTrigger className="h-8 text-[10px] font-black uppercase bg-white border-emerald-300 text-emerald-900 rounded-none min-w-[140px] shadow-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="font-bold">
                        <SelectItem value="DilRR">Dilated (Dil RR)</SelectItem>
                        <SelectItem value="cycloRR">Cycloplegic (Cyclo RR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {openSections['objective'] ? <ChevronDown className="w-4 h-4 text-emerald-600" /> : <ChevronRight className="w-4 h-4 text-emerald-600" />}
                </div>
              </div>
              <div className={cn(
                "transition-all duration-300 ease-in-out overflow-hidden",
                openSections['objective'] ? "max-h-[3000px] opacity-100" : "max-h-0 opacity-0"
              )}>
                <CardContent className="p-6 bg-emerald-50/10">
                <div className="clinical-group !bg-transparent !border-none !p-0">

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <div className="xl:col-span-8 space-y-6">
                      {["OD", "OS"].map((eye) => (
                        <div key={eye} className="border-2 border-slate-100 bg-white/50 p-2 md:border-0 md:bg-transparent md:p-0 space-y-4 mb-4 last:mb-0">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Dry RR */}
                            <div className="space-y-4">
                              <div className="flex items-center gap-3 border-b border-emerald-100 pb-2">
                                <span className={cn(
                                  "w-9 h-9 flex items-center justify-center font-black text-xs border-2",
                                  eye === "OD" || eye === "od" ? "border-blue-600 text-blue-600" : eye === "OS" || eye === "os" ? "border-emerald-600 text-emerald-600" : "border-slate-600 text-slate-600"
                                )}>{eye}</span>
                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest bg-emerald-50 px-2 py-0.5">Dry RR</span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">SPH</span><Input className="h-11 text-center text-base font-black bg-white rounded-none border-emerald-100 text-slate-900 focus:border-emerald-400" value={(formData.objectiveRefraction as any)?.[eye]?.sphere || ""} onChange={(e) => updateEyeGrid("objectiveRefraction" as any, eye, "sphere", e.target.value)} placeholder="0.00" /></div>
                                <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">CYL</span><Input className="h-11 text-center text-base font-black bg-white rounded-none border-emerald-100 text-slate-900 focus:border-emerald-400" value={(formData.objectiveRefraction as any)?.[eye]?.cylinder || ""} onChange={(e) => updateEyeGrid("objectiveRefraction" as any, eye, "cylinder", e.target.value)} placeholder="0.00" /></div>
                                <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">AXIS</span><Input className="h-11 text-center text-base font-black bg-white rounded-none border-emerald-100 text-slate-900 focus:border-emerald-400" value={(formData.objectiveRefraction as any)?.[eye]?.axis || ""} onChange={(e) => updateEyeGrid("objectiveRefraction" as any, eye, "axis", e.target.value)} placeholder="0" /></div>
                              </div>
                            </div>

                            {/* Modality RR */}
                            <div className="space-y-4">
                              <div className="flex items-center gap-3 border-b border-emerald-100 pb-2">
                                <span className={cn(
                                  "w-9 h-9 flex items-center justify-center font-black text-xs border-2",
                                  eye === "OD" || eye === "od" ? "border-blue-600 text-blue-600" : eye === "OS" || eye === "os" ? "border-emerald-600 text-emerald-600" : "border-slate-600 text-slate-600"
                                )}>{eye}</span>
                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest bg-emerald-50 px-2 py-0.5">{formData.objectiveRefraction?.type === "DilRR" ? "Dil RR" : "Cyclo RR"}</span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">SPH</span><Input className="h-11 text-center text-base font-black bg-white rounded-none border-emerald-100 text-slate-900 focus:border-emerald-400" value={(formData.objectiveRefraction as any)?.[eye]?.cycloSphere || ""} onChange={(e) => updateEyeGrid("objectiveRefraction" as any, eye, "cycloSphere", e.target.value)} placeholder="0.00" /></div>
                                <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">CYL</span><Input className="h-11 text-center text-base font-black bg-white rounded-none border-emerald-100 text-slate-900 focus:border-emerald-400" value={(formData.objectiveRefraction as any)?.[eye]?.cycloCylinder || ""} onChange={(e) => updateEyeGrid("objectiveRefraction" as any, eye, "cycloCylinder", e.target.value)} placeholder="0.00" /></div>
                                <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">AXIS</span><Input className="h-11 text-center text-base font-black bg-white rounded-none border-emerald-100 text-slate-900 focus:border-emerald-400" value={(formData.objectiveRefraction as any)?.[eye]?.cycloAxis || ""} onChange={(e) => updateEyeGrid("objectiveRefraction" as any, eye, "cycloAxis", e.target.value)} placeholder="0" /></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="xl:col-span-4 border-l-0 xl:border-l-2 border-emerald-100 pl-0 xl:pl-10 flex flex-col items-center">
                      <label className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] border-b-2 border-emerald-200 pb-2 mb-8 block text-center w-full">CTRR Diagnostic Documentation</label>

                      <CTRRDrawingDialog
                        initialData={formData.ctrr?.startsWith('/') ? `${API_BASE_URL}${formData.ctrr}` : formData.ctrr}
                        onSave={(data) => setFormData(p => ({ ...p, ctrr: data }))}
                        trigger={
                          <Button variant="outline" className="h-20 w-full rounded-none border-2 border-dashed border-slate-300 hover:border-[orange-600] hover:bg-slate-50 transition-all group">
                            <div className="flex flex-col items-center gap-1">
                              <Crosshair className="w-6 h-6 text-slate-300 group-hover:text-[orange-600]" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-[orange-600]">Capture CTRR (Power Cross)</span>
                            </div>
                          </Button>
                        }
                      />

                      {formData.ctrr && (
                        <div className="mt-12 w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <div className="relative p-2 bg-white border-2 border-slate-200 shadow-xl group overflow-hidden">
                            <img
                              src={formData.ctrr.startsWith('/') ? `${API_BASE_URL}${formData.ctrr}` : formData.ctrr}
                              alt="CTRR Grid"
                              className="w-full h-auto grayscale-0 group-hover:grayscale transition-all duration-300"
                              crossOrigin="anonymous"
                            />
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-white text-[10px] font-black uppercase tracking-[0.3em]">Update Diagnostic Diagram</p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {formData.ctrr.startsWith('data:image') && (
                              <Button
                                size="sm"
                                className="w-full h-12 bg-blue-600 hover:bg-black text-white rounded-none font-black uppercase tracking-widest text-[10px] shadow-lg"
                                onClick={handleCTRRUpload}
                                disabled={isUploadingCTRR}
                              >
                                {isUploadingCTRR ? "Synchronizing..." : "Sync to Patient Portfolio"}
                              </Button>
                            )}
                            <div className="flex items-center justify-center gap-2">
                              {formData.ctrr.startsWith('/') ? (
                                <span className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black tracking-widest uppercase">
                                  <ShieldCheck className="w-3.5 h-3.5" /> Immutable Archive
                                </span>
                              ) : (
                                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest italic opacity-60">Pending Cloud Sync</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
              </div>
            </Card>

            {/* Acceptance (Subjective Refraction) */}
            <Card className="border-none shadow-sm overflow-hidden min-h-0">
              <CardContent className="p-0">
                <DualEyePrescriptionBlock 
                  title="Acceptance (Subjective Refraction)" 
                  stateKey="acceptance" 
                  data={formData.acceptance} 
                  setFormData={setFormData}
                  isDraftLoaded={isDraftLoaded}
                  onSync={syncObjectiveToAcceptance}
                  syncTitle="Sync from Obj"
                  isOpen={!!openSections['acceptance']}
                  onToggle={() => toggleSection('acceptance')}
                />
              </CardContent>
            </Card>
            {/* Final Glass Prescription Correction */}
            <Card className="border-2 border-pink-100 rounded-none shadow-sm overflow-hidden font-bold">
              <div 
                className="bg-pink-100 text-pink-950 px-5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-pink-200/50 transition-colors border-l-4 border-l-pink-500"
                onClick={() => toggleSection('glass')}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-pink-700" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Final Glass Prescription Correction</h3>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    variant="default"
                    size="sm"
                    className="h-7 px-3 bg-pink-600 hover:bg-black text-white rounded-none text-[8px] font-black uppercase tracking-widest gap-2 shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      syncAcceptanceToFinal();
                    }}
                  >
                    <CheckCircle2 className="w-3 h-3" /> Sync from Subjective
                  </Button>
                  {openSections['glass'] ? <ChevronDown className="w-4 h-4 text-pink-600" /> : <ChevronRight className="w-4 h-4 text-pink-600" />}
                </div>
              </div>
              <div className={cn(
                "transition-all duration-300 ease-in-out overflow-hidden",
                openSections['glass'] ? "max-h-[3000px] opacity-100" : "max-h-0 opacity-0"
              )}>
                <CardContent className="p-6 bg-pink-50/10">
                <div className="clinical-group !bg-transparent !border-none !p-0">
                  <div className="space-y-4 pt-2">
                    {["OD", "OS"].map((eye) => (
                      <div key={eye} className="border-2 border-slate-100 bg-white/50 p-2 md:border-0 md:bg-transparent md:p-0 space-y-4 mb-4 last:mb-0">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          {/* Distance Vision Block */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 border-b border-pink-100 pb-2">
                                <span className={cn(
                                  "w-9 h-9 flex items-center justify-center font-black text-xs border-2",
                                  eye === "OD" || eye === "od" ? "border-blue-600 text-blue-600" : eye === "OS" || eye === "os" ? "border-emerald-600 text-emerald-600" : "border-slate-600 text-slate-600"
                                )}>{eye}</span>
                              <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest bg-pink-50 px-2 py-0.5">Distance</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">SPH</span><Input className="h-11 text-center text-base font-black bg-white rounded-none border-pink-100 text-slate-900 focus:border-pink-400" value={formData.glassPrescription[eye]?.sphere || ""} onChange={(e) => updateEyeGrid("glassPrescription", eye, "sphere", e.target.value)} placeholder="0.00" /></div>
                              <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">CYL</span><Input className="h-11 text-center text-base font-black bg-white rounded-none border-pink-100 text-slate-900 focus:border-pink-400" value={formData.glassPrescription[eye]?.cylinder || ""} onChange={(e) => updateEyeGrid("glassPrescription", eye, "cylinder", e.target.value)} placeholder="0.00" /></div>
                              <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">AXIS</span><Input className="h-11 text-center text-base font-black bg-white rounded-none border-pink-100 text-slate-900 focus:border-pink-400" value={formData.glassPrescription[eye]?.axis || ""} onChange={(e) => updateEyeGrid("glassPrescription", eye, "axis", e.target.value)} placeholder="0" /></div>
                              <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">BCVA</span>
                                <Select value={formData.glassPrescription[eye]?.bcva || ""} onValueChange={(val) => updateEyeGrid("glassPrescription", eye, "bcva", val)}>
                                  <SelectTrigger className="h-11 font-black bg-white rounded-none border-pink-100 focus:border-pink-400 focus-visible:ring-0 focus-visible:ring-offset-0"><SelectValue placeholder="-" /></SelectTrigger>
                                  <SelectContent className="max-h-[250px] overflow-y-auto font-mono uppercase text-sm font-black">{DIST_VISION_OPTIONS.map((nv) => <SelectItem key={nv} value={nv}>{nv}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center gap-3 border-b border-pink-100 pb-2">
                              <span className={cn(
                                "w-9 h-9 flex items-center justify-center font-black text-xs border-2",
                                eye === "OD" || eye === "od" ? "border-blue-600 text-blue-600" : "border-emerald-600 text-emerald-600"
                              )}>{eye}</span>
                              <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest bg-pink-50 px-2 py-0.5">Near Vision Correction</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
                              <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">DSPH</span><Input className="h-11 text-center text-base font-black bg-white rounded-none border-pink-100 text-slate-900 focus:border-pink-400" value={formData.glassPrescription[eye]?.nearDsph || ""} onChange={(e) => updateEyeGrid("glassPrescription", eye, "nearDsph", e.target.value)} placeholder="0.00" /></div>
                              <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">CYL</span><Input className="h-11 text-center text-base font-black bg-white rounded-none border-pink-100 text-slate-900 focus:border-pink-400" value={formData.glassPrescription[eye]?.nearCylinder || ""} onChange={(e) => updateEyeGrid("glassPrescription", eye, "nearCylinder", e.target.value)} placeholder="0.00" /></div>
                              <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">AXIS</span><Input className="h-11 text-center text-base font-black bg-white rounded-none border-pink-100 text-slate-900 focus:border-pink-400" value={formData.glassPrescription[eye]?.nearAxis || ""} onChange={(e) => updateEyeGrid("glassPrescription", eye, "nearAxis", e.target.value)} placeholder="0" /></div>
                              <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">ADD</span><Input className="h-11 text-center text-base font-black bg-white rounded-none border-pink-100 text-slate-900 focus:border-pink-400" value={formData.glassPrescription[eye]?.nearAdd || ""} onChange={(e) => updateEyeGrid("glassPrescription", eye, "nearAdd", e.target.value)} placeholder="0.00" /></div>
                              <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">BCVA</span>
                                <Select value={formData.glassPrescription[eye]?.nearBcva || ""} onValueChange={(val) => updateEyeGrid("glassPrescription", eye, "nearBcva", val)}>
                                  <SelectTrigger className="h-11 font-black bg-white rounded-none border-pink-100 focus:border-pink-400 focus-visible:ring-0 focus-visible:ring-offset-0"><SelectValue placeholder="-" /></SelectTrigger>
                                  <SelectContent className="max-h-[250px] overflow-y-auto font-mono uppercase text-sm font-black">{NEAR_VISION_OPTIONS.map((nv) => <SelectItem key={nv} value={nv}>{nv}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1 sm:col-span-1 xl:col-span-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">CM</span><Input className="h-11 text-center text-base font-black bg-white rounded-none border-pink-100 text-slate-900 focus:border-pink-400" value={formData.glassPrescription[eye]?.nearCm || ""} onChange={(e) => updateEyeGrid("glassPrescription", eye, "nearCm", e.target.value)} placeholder="33cm" /></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              </div>
            </Card>

            {/* Final Contact Lens Prescription Correction */}
            <Card className="border-2 border-orange-100 rounded-none shadow-sm overflow-hidden font-bold mt-4">
              <div 
                className="bg-orange-100 text-orange-600 px-5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-orange-200/50 transition-colors border-l-4 border-l-orange-500"
                onClick={() => toggleSection('contactLens')}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-orange-700" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Final Contact Lens Prescription</h3>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    variant="default"
                    size="sm"
                    className="h-7 px-3 bg-orange-600 hover:bg-black text-white rounded-none text-[8px] font-black uppercase tracking-widest gap-2 shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      syncAcceptanceToCL();
                    }}
                  >
                    <CheckCircle2 className="w-3 h-3" /> Sync from Subjective
                  </Button>
                  {openSections['contactLens'] ? <ChevronDown className="w-4 h-4 text-orange-600" /> : <ChevronRight className="w-4 h-4 text-orange-600" />}
                </div>
              </div>
              <div className={cn(
                "transition-all duration-300 ease-in-out overflow-hidden",
                openSections['contactLens'] ? "max-h-[3000px] opacity-100" : "max-h-0 opacity-0"
              )}>
                <CardContent className="p-6 bg-orange-50/10">
                <div className="clinical-group !bg-transparent !border-none !p-0">
                  <div className="space-y-4 pt-2">
                    {["OD", "OS"].map((eye) => (
                      <div key={eye} className="border-2 border-slate-100 bg-white/50 p-2 md:border-0 md:bg-transparent md:p-0 space-y-4 mb-4 last:mb-0">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          {/* Distance Vision Block */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 border-b border-orange-100 pb-2">
                                <span className={cn(
                                  "w-9 h-9 flex items-center justify-center font-black text-xs border-2",
                                  eye === "OD" || eye === "od" ? "border-blue-600 text-blue-600" : eye === "OS" || eye === "os" ? "border-emerald-600 text-emerald-600" : "border-slate-600 text-slate-600"
                                )}>{eye}</span>
                              <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest bg-orange-50 px-2 py-0.5">Distance</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">SPH</span><Input className="h-11 text-center text-base font-black bg-white rounded-none border-orange-100 text-slate-900 focus:border-orange-400" value={formData.contactLensPrescription[eye]?.sphere || ""} onChange={(e) => updateEyeGrid("contactLensPrescription", eye, "sphere", e.target.value)} placeholder="0.00" /></div>
                              <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">CYL</span><Input className="h-11 text-center text-base font-black bg-white rounded-none border-orange-100 text-slate-900 focus:border-orange-400" value={formData.contactLensPrescription[eye]?.cylinder || ""} onChange={(e) => updateEyeGrid("contactLensPrescription", eye, "cylinder", e.target.value)} placeholder="0.00" /></div>
                              <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">AXIS</span><Input className="h-11 text-center text-base font-black bg-white rounded-none border-orange-100 text-slate-900 focus:border-orange-400" value={formData.contactLensPrescription[eye]?.axis || ""} onChange={(e) => updateEyeGrid("contactLensPrescription", eye, "axis", e.target.value)} placeholder="0" /></div>
                              <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">BCVA</span>
                                <Select value={formData.contactLensPrescription[eye]?.bcva || ""} onValueChange={(val) => updateEyeGrid("contactLensPrescription", eye, "bcva", val)}>
                                  <SelectTrigger className="h-11 font-black bg-white rounded-none border-orange-100 focus:border-orange-400 focus-visible:ring-0 focus-visible:ring-offset-0"><SelectValue placeholder="-" /></SelectTrigger>
                                  <SelectContent className="max-h-[250px] overflow-y-auto font-mono uppercase text-sm font-black">{DIST_VISION_OPTIONS.map((nv) => <SelectItem key={nv} value={nv}>{nv}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center gap-3 border-b border-orange-100 pb-2">
                              <span className={cn(
                                "w-9 h-9 flex items-center justify-center font-black text-xs border-2",
                                eye === "OD" || eye === "od" ? "border-blue-600 text-blue-600" : "border-emerald-600 text-emerald-600"
                              )}>{eye}</span>
                              <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest bg-orange-50 px-2 py-0.5">Near Vision Correction</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
                              <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">DSPH</span><Input className="h-11 text-center text-base font-black bg-white rounded-none border-orange-100 text-slate-900 focus:border-orange-400" value={formData.contactLensPrescription[eye]?.nearDsph || ""} onChange={(e) => updateEyeGrid("contactLensPrescription", eye, "nearDsph", e.target.value)} placeholder="0.00" /></div>
                              <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">CYL</span><Input className="h-11 text-center text-base font-black bg-white rounded-none border-orange-100 text-slate-900 focus:border-orange-400" value={formData.contactLensPrescription[eye]?.nearCylinder || ""} onChange={(e) => updateEyeGrid("contactLensPrescription", eye, "nearCylinder", e.target.value)} placeholder="0.00" /></div>
                              <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">AXIS</span><Input className="h-11 text-center text-base font-black bg-white rounded-none border-orange-100 text-slate-900 focus:border-orange-400" value={formData.contactLensPrescription[eye]?.nearAxis || ""} onChange={(e) => updateEyeGrid("contactLensPrescription", eye, "nearAxis", e.target.value)} placeholder="0" /></div>
                              <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">ADD</span><Input className="h-11 text-center text-base font-black bg-white rounded-none border-orange-100 text-slate-900 focus:border-orange-400" value={formData.contactLensPrescription[eye]?.nearAdd || ""} onChange={(e) => updateEyeGrid("contactLensPrescription", eye, "nearAdd", e.target.value)} placeholder="0.00" /></div>
                              <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">BCVA</span>
                                <Select value={formData.contactLensPrescription[eye]?.nearBcva || ""} onValueChange={(val) => updateEyeGrid("contactLensPrescription", eye, "nearBcva", val)}>
                                  <SelectTrigger className="h-11 font-black bg-white rounded-none border-orange-100 focus:border-orange-400 focus-visible:ring-0 focus-visible:ring-offset-0"><SelectValue placeholder="-" /></SelectTrigger>
                                  <SelectContent className="max-h-[250px] overflow-y-auto font-mono uppercase text-sm font-black">{NEAR_VISION_OPTIONS.map((nv) => <SelectItem key={nv} value={nv}>{nv}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1 sm:col-span-1 xl:col-span-1"><span className="text-[8px] font-black text-slate-400 uppercase text-center block">CM</span><Input className="h-11 text-center text-base font-black bg-white rounded-none border-orange-100 text-slate-900 focus:border-orange-400" value={formData.contactLensPrescription[eye]?.nearCm || ""} onChange={(e) => updateEyeGrid("contactLensPrescription", eye, "nearCm", e.target.value)} placeholder="33cm" /></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              </div>
            </Card>
            {/* 9. Secondary Clinical Assessments */}
            <Card className="border-2 border-cyan-100 rounded-none shadow-sm overflow-hidden">
              <div 
                className="bg-cyan-100 text-cyan-950 px-5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-cyan-200/50 transition-colors border-l-4 border-l-cyan-500"
                onClick={() => toggleSection('secondary')}
              >
                <div className="flex items-center gap-3 relative">
                  <AlertCircle className="w-4 h-4 text-cyan-700" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Secondary Assessments (Color & Dryness)</h3>
                </div>
                {openSections['secondary'] ? <ChevronDown className="w-4 h-4 text-cyan-600" /> : <ChevronRight className="w-4 h-4 text-cyan-600" />}
              </div>
              <div className={cn(
                "transition-all duration-300 ease-in-out overflow-hidden",
                openSections['secondary'] ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
              )}>
                <CardContent className="p-6 bg-sky-50/10">
                <div className="clinical-group !bg-transparent !border-none !p-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-3">
                    <div className="border-2 border-slate-100 bg-white/50 p-4 md:border-0 md:bg-transparent md:p-0">
                      <div className="space-y-6 bg-slate-50 p-6">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] border-b border-slate-200 pb-2 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-emerald-600" /> Ishihara (Color Vision)
                        </label>
                        <div className="space-y-4">
                          <Select value={formData.ishiharaTest?.status || ""} onValueChange={(val) => setFormData(p => {
                            const current = p.ishiharaTest || {};
                            return { ...p, ishiharaTest: { ...current, status: val } };
                          })}>
                            <SelectTrigger className="h-14 font-black uppercase text-xs rounded-none bg-white border-slate-200 focus:border-[orange-600] focus-visible:ring-0 focus-visible:ring-offset-0"><SelectValue placeholder="Select Status" /></SelectTrigger>
                            <SelectContent className="font-bold">
                              <SelectItem value="CLEAR">CLEAR (Normal)</SelectItem>
                              <SelectItem value="DEFICIENCY">DEFICIENCY REPORTED</SelectItem>
                            </SelectContent>
                          </Select>
                          {formData.ishiharaTest?.status === "DEFICIENCY" && (
                            <Input className="h-14 text-sm font-bold bg-white rounded-none border-slate-200 focus:border-[orange-600] focus-visible:ring-0 focus-visible:ring-offset-0 italic" placeholder="Details (e.g. Red-Green)..." value={formData.ishiharaTest?.notes || ""} onChange={(e) => setFormData(p => {
                              const current = p.ishiharaTest || {};
                              return { ...p, ishiharaTest: { ...current, notes: sanitizeOptometryInput(e.target.value, 'notes') } };
                            })} />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="border-2 border-slate-100 bg-white/50 p-4 md:border-0 md:bg-transparent md:p-0">
                      <div className="space-y-6 bg-slate-50 p-6">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] border-b border-slate-200 pb-2 flex items-center gap-2">
                          <Droplets className="w-4 h-4 text-blue-600" /> Schirmer's Test (mm)
                        </label>
                        <div className="grid grid-cols-2 gap-6">
                          {["OD", "OS"].map((eye) => (
                            <div key={eye} className="space-y-2">
                              <span className="text-[9px] font-black text-slate-400 uppercase text-center block">{eye} Assessment</span>
                              <Select value={(formData.schirmerTest as any)[eye] || ""} onValueChange={(val) => setFormData(p => {
                                const current = p.schirmerTest || {};
                                return { ...p, schirmerTest: { ...current, [eye]: val } };
                              })}>
                                <SelectTrigger className="h-14 font-black bg-white rounded-none border-slate-200 focus:border-[orange-600] focus-visible:ring-0 focus-visible:ring-offset-0"><SelectValue placeholder="-" /></SelectTrigger>
                                <SelectContent className="max-h-[300px] font-bold">
                                  {SCHIRMER_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              </div>
            </Card>

            {/* 10. Specialized Diagnostics & Refining */}
            <Card className="border-2 border-orange-100 rounded-none shadow-sm overflow-hidden">
              <div 
                className="bg-orange-100 text-orange-600 px-5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-orange-200/50 transition-colors border-l-4 border-l-orange-500"
                onClick={() => toggleSection('specialized')}
              >
                <div className="flex items-center gap-3 relative">
                  <Stethoscope className="w-4 h-4 text-orange-700" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Specialized Diagnostics & JCC Refining</h3>
                </div>
                {openSections['specialized'] ? <ChevronDown className="w-4 h-4 text-orange-600" /> : <ChevronRight className="w-4 h-4 text-orange-600" />}
              </div>
              <div className={cn(
                "transition-all duration-300 ease-in-out overflow-hidden",
                openSections['specialized'] ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
              )}>
                <CardContent className="p-6 bg-purple-50/10">
                <div className="clinical-group !bg-transparent !border-none !p-0">
                  <div className="border-2 border-slate-100 bg-white/50 p-4 md:border-0 md:bg-transparent md:p-0">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-3">
                      {/* 1. Keratometry Matrix - Full Width for Tag Visibility */}
                      <div className="md:col-span-12 space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-600 pl-1 flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5 text-purple-600" /> Keratometry Matrix (K1/K2/Axis)
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3 bg-white p-4 border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-7 h-7 flex items-center justify-center border border-blue-200 text-blue-600 font-black text-[9px] bg-blue-50">OD</span>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Right Eye Clinical Readings</span>
                            </div>
                            <TagInput 
                              placeholder="K1/K2 @ Axis (e.g. 44.00/45.00 @ 90)"
                              values={formData.keratometry?.OD || []}
                              onAdd={(val) => setFormData(p => ({
                                ...p,
                                keratometry: { ...p.keratometry, OD: [...(Array.isArray(p.keratometry?.OD) ? p.keratometry.OD : []), sanitizeOptometryInput(val, 'notes')] }
                              }))}
                              onRemove={(idx) => setFormData(p => {
                                const arr = [...(Array.isArray(p.keratometry?.OD) ? p.keratometry.OD : [])];
                                arr.splice(idx, 1);
                                return { ...p, keratometry: { ...p.keratometry, OD: arr } };
                              })}
                            />
                          </div>
                          <div className="space-y-3 bg-white p-4 border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-7 h-7 flex items-center justify-center border border-emerald-200 text-emerald-600 font-black text-[9px] bg-emerald-50">OS</span>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Left Eye Clinical Readings</span>
                            </div>
                            <TagInput 
                              placeholder="K1/K2 @ Axis (e.g. 44.00/45.00 @ 90)"
                              values={formData.keratometry?.OS || []}
                              onAdd={(val) => setFormData(p => ({
                                ...p,
                                keratometry: { ...p.keratometry, OS: [...(Array.isArray(p.keratometry?.OS) ? p.keratometry.OS : []), sanitizeOptometryInput(val, 'notes')] }
                              }))}
                              onRemove={(idx) => setFormData(p => {
                                const arr = [...(Array.isArray(p.keratometry?.OS) ? p.keratometry.OS : [])];
                                arr.splice(idx, 1);
                                return { ...p, keratometry: { ...p.keratometry, OS: arr } };
                              })}
                            />
                          </div>
                        </div>
                      </div>

                      {/* 2. Jackson Cross Cylinder - Full Width for detailed refining */}
                      <div className="md:col-span-12 space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-600 pl-1 flex items-center gap-2">
                          <Crosshair className="w-3.5 h-3.5 text-orange-600" /> Jackson Cross Cylinder (JCC) Refining
                        </label>
                        <div className="bg-white border border-orange-100 p-1 flex items-stretch min-h-[120px] shadow-sm">
                          <Textarea 
                            className="flex-1 border-none focus-visible:ring-0 resize-none font-bold text-sm bg-transparent p-4" 
                            placeholder="Detailed JCC findings, refining axis and power... (e.g. Cyl +0.25 rejected, Axis shifted 5°)" 
                            value={formData.jcc || ""} 
                            onChange={(e) => setFormData(p => ({ ...p, jcc: sanitizeOptometryInput(e.target.value, 'notes') }))} 
                          />
                        </div>
                      </div>

                      {/* Row 3: Secondary Diagnostics - Standardized Grid */}
                      <div className="md:col-span-4 space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-600 pl-1 flex items-center gap-2">
                          <Scan className="w-3.5 h-3.5 text-orange-600" /> Amsler Grid
                        </label>
                        <Input className="h-14 font-bold border-slate-200 bg-white rounded-none focus:border-orange-400 text-slate-900" placeholder="Macular Grid Result" value={formData.amslerGrid || ""} onChange={(e) => setFormData(p => ({ ...p, amslerGrid: sanitizeOptometryInput(e.target.value, 'notes') }))} />
                      </div>

                      <div className="md:col-span-4 space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-600 pl-1 flex items-center gap-2 text-rose-600">
                          <Eye className="w-3.5 h-3.5" /> Contrast Sensitivity
                        </label>
                        <Input className="h-14 font-bold border-slate-200 bg-white rounded-none focus:border-rose-400 text-slate-900" placeholder="LogMAR / Pelli-Robson" value={formData.contrastSensitivity || ""} onChange={(e) => setFormData(p => ({ ...p, contrastSensitivity: sanitizeOptometryInput(e.target.value, 'notes') }))} />
                      </div>

                      <div className="md:col-span-4 space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-600 pl-1 flex items-center gap-2 text-emerald-600">
                          <Droplets className="w-3.5 h-3.5" /> Duo-Chrome Test
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input className="h-14 text-center font-bold border-slate-200 bg-white rounded-none focus:border-emerald-400 text-slate-900" placeholder="OD" value={formData.refining?.duochrome?.OD || ""} onChange={(e) => setFormData(p => {
                            const currentRef = p.refining || {};
                            const currentDuo = currentRef.duochrome || {};
                            return { ...p, refining: { ...currentRef, duochrome: { ...currentDuo, OD: sanitizeOptometryInput(e.target.value, 'va') } } };
                          })} />
                          <Input className="h-14 text-center font-bold border-slate-200 bg-white rounded-none focus:border-emerald-400 text-slate-900" placeholder="OS" value={formData.refining?.duochrome?.OS || ""} onChange={(e) => setFormData(p => {
                            const currentRef = p.refining || {};
                            const currentDuo = currentRef.duochrome || {};
                            return { ...p, refining: { ...currentRef, duochrome: { ...currentDuo, OS: sanitizeOptometryInput(e.target.value, 'va') } } };
                          })} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              </div>
            </Card>

            <TonometrySection 
              formData={formData}
              setFormData={setFormData}
              openSections={openSections}
              toggleSection={toggleSection}
            />

            {/* 12. Final Clinical Remarks */}
            <Card className="border-2 border-zinc-100 rounded-none shadow-sm overflow-hidden">
              <div 
                className="bg-zinc-100 text-zinc-950 px-5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-zinc-200/50 transition-colors border-l-4 border-l-zinc-500"
                onClick={() => toggleSection('remarks')}
              >
                <div className="flex items-center gap-3 relative">
                  <ClipboardList className="w-4 h-4 text-zinc-700" />
                  <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em]">Final Clinical Remarks</h3>
                </div>
                {openSections['remarks'] ? <ChevronDown className="w-4 h-4 text-slate-600" /> : <ChevronRight className="w-4 h-4 text-slate-600" />}
              </div>
              <div className={cn(
                "transition-all duration-300 ease-in-out overflow-hidden",
                openSections['remarks'] ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
              )}>
                <CardContent className="p-2 md:p-6 bg-slate-50/50">
                <div className="border-2 border-slate-100 bg-white/50 p-2 md:border-0 md:bg-transparent md:p-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                    <div className="space-y-4 md:space-y-6">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Binocular Functionality</label>
                      <Select value={formData.binocular} onValueChange={(val) => setFormData(v => ({ ...v, binocular: val }))}>
                        <SelectTrigger className="h-12 md:h-16 font-black uppercase bg-slate-50 border-slate-200 focus:border-[orange-600] focus-visible:ring-0 focus-visible:ring-offset-0"><SelectValue placeholder="Select Evaluation" /></SelectTrigger>
                        <SelectContent className="font-bold">
                          <SelectItem value="eom">EOM Full (Extra Ocular Muscles)</SelectItem>
                          <SelectItem value="worth_four_dot">Worth 4-Dot Test</SelectItem>
                          <SelectItem value="stereopsis">Stereopsis Assessment</SelectItem>
                          <SelectItem value="prism">Prism Cover Test</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-6">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Clinical Optometrist's Notes</label>
                      <Textarea
                        className="min-h-[140px] font-bold p-6 bg-slate-50 border-slate-200 font-mono text-sm"
                        placeholder="Enter final optometrist's observations..."
                        value={formData.optometristNotes || ""}
                        onChange={(e) => setFormData(v => ({ ...v, optometristNotes: sanitizeOptometryInput(e.target.value, 'notes') }))}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              </div>
            </Card>

            <Card className="clinical-card bg-white shadow-md overflow-hidden border-slate-200">
              <div className="p-8 space-y-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-5">
                    <div className="p-3 bg-orange-600 text-white shadow-lg"><Check className="w-6 h-6 shrink-0" /></div>
                    <div className="flex flex-col">
                      <span className="text-[12px] font-black uppercase tracking-widest text-orange-600 mb-0.5">Optometry Finalization</span>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tighter">Diagnostic Verification</h3>
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm max-w-md italic border-l-2 border-orange-100 pl-4 font-medium">I hereby certify that the above clinical findings are accurate and have been verified according to clinical protocols.</p>
                </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    <div
                      className={cn(
                        "flex items-center gap-4 px-8 py-4 cursor-pointer border-2 transition-all w-full sm:w-auto shadow-sm",
                        isVerified ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-emerald-500/10" : "bg-slate-50 border-slate-200 text-slate-400 hover:border-orange-200 hover:text-orange-600"
                      )}
                      onClick={() => setIsVerified(!isVerified)}
                    >
                      <Checkbox checked={isVerified} className="w-5 h-5 border-2 border-slate-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white" />
                      <span className="font-black uppercase tracking-widest text-xs">Verify Data</span>
                    </div>

                    <Button
                      size="lg"
                      disabled={!isVerified || isSubmitting}
                      className={cn(
                        "h-14 px-12 rounded-none font-black uppercase tracking-[0.2em] transition-all text-xs w-full sm:w-auto shadow-xl",
                        isVerified ? "bg-orange-600 text-white hover:bg-black" : "bg-slate-100 text-slate-300 pointer-events-none"
                      )}
                      onClick={async () => {
                        if (!isVerified || !patient?.id) return;
                        setIsSubmitting(true);
                        try {
                          let finalFormData = { ...formData };
                          if (formData.ctrr?.startsWith('data:image')) {
                            const cloudSyncedUrl = await handleCTRRUpload();
                            if (cloudSyncedUrl) finalFormData.ctrr = cloudSyncedUrl;
                          }
                          const token = localStorage.getItem("token");
                          const res = await fetch(`${API_BASE_URL}/api/refraction/${patient.id}`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ 
                              ...finalFormData, 
                              systemicHistory: selectedChips,
                              refractionistName: userName 
                            })
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.message || data.error || "Submission failed");
                          toast({ title: "Clinical Record Persistence Successful", description: "Record moved to Diagnostic Archive." });
                          localStorage.removeItem(storageKey);
                          window.dispatchEvent(new Event("patientQueueUpdated"));
                        } catch (err: any) {
                          toast({ variant: "destructive", title: "Persistence Failure", description: err.message });
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                    >
                      {isSubmitting ? "Processing..." : "Finish and Signout"}
                    </Button>
                  </div>
                </div>
              </Card>
          </fieldset>
        </div>
      </div>
    </div>
  );
}

export default RefractionStation;
