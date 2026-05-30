import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, ClipboardList, Activity, Thermometer, FileText, Zap, ExternalLink, Glasses, ShieldCheck, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "@/config";
import { cn, eyeLabelClass, eyeValueClass, eyeVaInputClass } from "@/lib/utils";

function SectionHeader({ icon: Icon, title, category = "Clinical Assessment" }: { icon: any, title: string, category?: string }) {
  return (
    <div className="flex items-center gap-3 py-2 mb-3 border-b border-slate-100">
      <div className="p-2.5 bg-brand text-white shadow-md rounded-md"><Icon className="w-5 h-5 shrink-0" /></div>
      <div className="flex flex-col">
        <span className="text-[9.5px] font-black uppercase tracking-wider text-brand mb-0.5">{category}</span>
        <h3 className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-normal">{title}</h3>
      </div>
    </div>
  );
}

export function RefractionSummaryView({
  data,
  refractionData,
  hideHeader = false,
  patient
}: {
  data?: any,
  refractionData?: any,
  hideHeader?: boolean,
  patient?: any
}) {
  const rd = refractionData || data || {};

  const getImageUrl = (path: string) => {
    if (!path) return "";
    if (path.startsWith('data:image') || path.startsWith('http')) return path;
    return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const ctrrUrl = getImageUrl(rd.ctrr);

  const getAcceptanceValue = (part: 'distance' | 'near', eye: 'OD' | 'OS', key: string) => {
    return rd.acceptance?.[part]?.[eye]?.[key] || "—";
  };

  const isAbnormalVA = (va: string) => {
    if (!va || va === "—") return false;
    const abnormalList = ["6/18", "6/24", "6/36", "6/60", "5/60", "4/60", "3/60", "2/60", "1/60", "CF", "HM", "PL", "PR", "NIL", "N10", "N12", "N18", "N24", "N36"];
    return abnormalList.some(a => va.toUpperCase().includes(a));
  };

  const isAbnormalLens = (val: string, threshold = 1.5) => {
    if (!val || val === "—") return false;
    const num = parseFloat(val);
    return !isNaN(num) && Math.abs(num) >= threshold;
  };

  const renderVA = (va: string) => {
    if (!va || va === "—") return "—";
    if (isAbnormalVA(va)) return <span className="inline-block px-1.5 py-0.5 bg-red-100/80 text-red-700 font-black rounded border border-red-200 animate-pulse shadow-sm">{va}</span>;
    return va;
  };

  const formatLensSign = (val?: string) => {
    if (!val) return "—";
    const trimmed = val.trim();
    if (trimmed === "" || trimmed === "—") return "—";
    const cleanVal = trimmed.replace(/^\++/, '');
    const num = parseFloat(cleanVal);
    if (isNaN(num)) return val;
    if (num > 0) {
      return `+${cleanVal}`;
    }
    return cleanVal;
  };

  const renderLens = (val: string, threshold = 1.5) => {
    const formatted = formatLensSign(val);
    if (!formatted || formatted === "—") return "—";
    if (isAbnormalLens(formatted, threshold)) {
      return (
        <span className="inline-block px-1.5 py-0.5 bg-red-100/80 text-red-700 font-black rounded border border-red-200 animate-pulse shadow-sm">
          {formatted}
        </span>
      );
    }
    return formatted;
  };

  const isAbnormalIOP = (val: string) => {
    if (!val || val === "—") return false;
    const nums = val.split(',').map(s => parseFloat(s.trim()));
    return nums.some(num => !isNaN(num) && (num >= 22 || num < 8));
  };

  const renderIOP = (val: string) => {
    if (!val || val === "—") return "—";
    if (isAbnormalIOP(val)) return <span className="inline-block px-1.5 py-0.5 bg-red-100/80 text-red-700 font-black rounded border border-red-200 animate-pulse shadow-sm">{val} mmHg</span>;
    return `${val} mmHg`;
  };

  return (
    <div className="space-y-4 pb-6 max-w-[1400px] mx-auto bg-white p-4 sm:p-6 border border-slate-100 shadow-sm">

      {/* 0. Clinical Metadata (Responsibility) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 py-3 bg-brand/5 border border-slate-100 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand/10 text-brand">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Lead Consultant</p>
            <p className="text-sm font-black text-brand uppercase">
              {rd.consultantName || 
               rd.visit?.doctor?.name || 
               patient?.consultingDoctorName || 
               patient?.consultation?.doctor?.name || 
               patient?.doctor?.name || 
               "Dr. Gajendran MBBS DO"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 md:border-l md:border-brand/20 md:pl-6 pt-4 md:pt-0 border-t md:border-t-0 border-brand/10">
          <div className="p-2 bg-brand/5 text-slate-600">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Refractionist / Optometrist</p>
            <p className="text-sm font-black text-slate-700 uppercase">{rd.optometristName || rd.refractionist?.name || "Not Attended"}</p>
          </div>
        </div>
      </div>
      {/* 1. Clinical Presentation & Background */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <SectionHeader icon={ClipboardList} title="Clinical Presentation" />
          <div className="px-4 py-2 bg-brand/10 border-l-4 border-brand">
            <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">
              {rd.ocularComplaint || rd.complaint || "No primary complaints documented"}
            </p>
            {rd.complaintNotes && (
              <p className="text-xs text-slate-500 mt-1 italic">"{rd.complaintNotes}"</p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <SectionHeader icon={Activity} title="Systemic History" />
          <div className="px-4 py-2 flex flex-wrap gap-2">
            {(() => {
              let items = rd.systemicHistory;
              if (typeof items === 'string' && items.startsWith('[')) {
                try { items = JSON.parse(items); } catch (e) { }
              }
              if (items && Array.isArray(items) && items.length) {
                const isHighRiskSystemic = (condition: string) => {
                  if (!condition) return false;
                  const highRisk = ["DIABETES", "HYPERTENSION", "THYROID", "ARTHRITIS", "NEUROLOGICAL"];
                  return highRisk.some(hr => condition.toUpperCase().includes(hr));
                };

                return items.map((h: any, i: number) => {
                  const conditionText = typeof h === 'string' ? h : (h.condition || h.name || 'Condition');
                  const durationText = typeof h === 'object' && h.duration ? ` (${h.duration})` : '';
                  const isHighRisk = isHighRiskSystemic(conditionText);
                  
                  return (
                    <Badge key={i} className={cn(
                      "text-[11px] font-bold uppercase rounded-none px-3 py-1",
                      isHighRisk 
                        ? "bg-red-100/80 border-y border-red-200 text-red-700 animate-pulse shadow-sm flex items-center gap-1.5" 
                        : "bg-brand/10 border-y border-brand/10 text-brand"
                    )}>
                      <span>{conditionText}{durationText}</span>
                    </Badge>
                  );
                });
              }
              return <span className="text-xs text-slate-400 font-medium italic">Nil Significant</span>;
            })()}
          </div>
        </div>
      </div>

      {/* 2. Vision Matrix (Visual Acuity) */}
      <div className="space-y-4">
        <SectionHeader icon={Eye} title="Vision Matrix (Visual Acuity)" />
        <div className="overflow-x-auto w-full max-w-full pb-2"><Table className="border border-slate-200">
          <TableHeader className="bg-brand/10 border-y border-brand/10">
            <TableRow className="hover:bg-brand/10 border-y border-brand/10 border-b-0">
              <TableHead className="text-brand font-black uppercase text-[12px] tracking-widest h-10 w-[200px]">Modality</TableHead>
              <TableHead className={cn("font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-brand/20/30", eyeLabelClass("OD"))}>OD (Right)</TableHead>
              <TableHead className={cn("font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-brand/20/30", eyeLabelClass("OS"))}>OS (Left)</TableHead>
              <TableHead className="text-brand font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-brand/20/30 bg-brand/20">OU (Both)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              { label: "Unaided Vision (DV)", od: rd.visualAcuity?.OD?.unaided, os: rd.visualAcuity?.OS?.unaided, ou: rd.visualAcuity?.OU?.unaided },
              { label: "Unaided Vision (NV)", od: rd.visualAcuity?.OD?.nearVision, os: rd.visualAcuity?.OS?.nearVision, ou: rd.visualAcuity?.OU?.nearVision },
              { label: "Aided Vision (DV)", od: rd.visualAcuity?.OD?.aided, os: rd.visualAcuity?.OS?.aided, ou: rd.visualAcuity?.OU?.aided },
              { label: "Pinhole Potential", od: rd.visualAcuity?.OD?.pinhole, os: rd.visualAcuity?.OS?.pinhole, ou: rd.visualAcuity?.OU?.pinhole },
            ].map((row, i) => (
              <TableRow key={i} className="hover:bg-brand/10 border-b border-slate-100">
                <TableCell className="text-[12px] font-black uppercase text-slate-600">{row.label}</TableCell>
                <TableCell className={cn("text-center font-bold border-l border-slate-100", eyeValueClass("OD"))}>{renderVA(row.od)}</TableCell>
                <TableCell className={cn("text-center font-bold border-l border-slate-100", eyeValueClass("OS"))}>{renderVA(row.os)}</TableCell>
                <TableCell className="text-center font-bold text-brand border-l border-slate-100 bg-brand/5">{renderVA(row.ou)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></div>
      </div>

      {/* Previous Prescription (PG / CL) */}
      {(() => {
        const pg = rd.pgPower || {};
        const glass = pg.glass || {};
        const contact = pg.contact || {};
        const hasGlass = ['OD', 'OS'].some(eye => glass[eye]?.sphere1 || glass[eye]?.cylinder1 || glass[eye]?.axis1 || glass[eye]?.add || glass[eye]?.vn1 || glass[eye]?.vnNear1);
        const hasContact = ['OD', 'OS'].some(eye => contact[eye]?.sphere1 || contact[eye]?.cylinder1 || contact[eye]?.axis1 || contact[eye]?.add || contact[eye]?.vn1 || contact[eye]?.vnNear1);
        const notes = pg.notes || "";

        if (!hasGlass && !hasContact && !notes) return null;

        return (
          <div className="space-y-6">
            <SectionHeader icon={Glasses} title="Previous Prescription History" />
            
            {hasGlass && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Previous Spectacles Prescription</span>
                  {glass.glassType && (
                    <Badge variant="outline" className="text-[9px] uppercase tracking-widest bg-brand/10 text-brand border-brand/20">
                      {glass.glassType === 'SVN' ? 'Single Vision' : glass.glassType === 'KBF' ? 'Bifocals' : glass.glassType === 'PAL' ? 'Progressive' : glass.glassType === 'DBF' ? 'Double D Bifocal' : glass.glassType === 'READING' ? 'Reading Glass' : glass.glassType}
                    </Badge>
                  )}
                </div>
                <div className="overflow-x-auto w-full max-w-full pb-2"><Table className="border border-slate-200">
                  <TableHeader className="bg-brand/10 border-y border-brand/10">
                    <TableRow className="hover:bg-brand/10 border-y border-brand/10 border-b-0">
                      <TableHead className="text-brand font-black uppercase text-[12px] tracking-widest h-10 w-[120px]">Eye</TableHead>
                      <TableHead className="text-brand font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-brand/20/30">SPH</TableHead>
                      <TableHead className="text-brand font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-brand/20/30">CYL</TableHead>
                      <TableHead className="text-brand font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-brand/20/30">AXIS</TableHead>
                      <TableHead className="text-brand font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-brand/20/30">ADD</TableHead>
                      <TableHead className="text-brand font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-brand/20/30">VA (DV)</TableHead>
                      <TableHead className="text-brand font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-brand/20/30">VA (NV)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {['OD', 'OS'].map((eye) => (
                      <TableRow key={eye} className="hover:bg-brand/10 border-b border-slate-100">
                        <TableCell className={cn("text-[12px] font-black uppercase border-r border-slate-100", eye === 'OD' ? "text-blue-600 bg-blue-50/50" : "text-emerald-600 bg-emerald-50/50")}>
                          {eye === 'OD' ? 'Right Eye (OD)' : 'Left Eye (OS)'}
                        </TableCell>
                        <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{renderLens(glass[eye]?.sphere1)}</TableCell>
                        <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{renderLens(glass[eye]?.cylinder1)}</TableCell>
                        <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{glass[eye]?.axis1 ? `${glass[eye].axis1}°` : "—"}</TableCell>
                        <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{renderLens(glass[eye]?.add)}</TableCell>
                        <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{renderVA(glass[eye]?.vn1)}</TableCell>
                        <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{renderVA(glass[eye]?.vnNear1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table></div>
              </div>
            )}

            {hasContact && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Previous Contact Lens Prescription</span>
                  {contact.clType && (
                    <div className="flex gap-1">
                      {(Array.isArray(contact.clType) ? contact.clType : [contact.clType]).map((type: string) => (
                        <Badge key={type} variant="outline" className="text-[9px] uppercase tracking-widest bg-brand/10 text-brand border-brand/20">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto w-full max-w-full pb-2"><Table className="border border-slate-200">
                  <TableHeader className="bg-brand/10 border-y border-brand/10">
                    <TableRow className="hover:bg-brand/10 border-y border-brand/10 border-b-0">
                      <TableHead className="text-brand font-black uppercase text-[12px] tracking-widest h-10 w-[120px]">Eye</TableHead>
                      <TableHead className="text-brand font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-brand/20/30">SPH</TableHead>
                      <TableHead className="text-brand font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-brand/20/30">CYL</TableHead>
                      <TableHead className="text-brand font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-brand/20/30">AXIS</TableHead>
                      <TableHead className="text-brand font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-brand/20/30">ADD</TableHead>
                      <TableHead className="text-brand font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-brand/20/30">VA (DV)</TableHead>
                      <TableHead className="text-brand font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-brand/20/30">VA (NV)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {['OD', 'OS'].map((eye) => (
                      <TableRow key={eye} className="hover:bg-brand/10 border-b border-slate-100">
                        <TableCell className={cn("text-[12px] font-black uppercase border-r border-slate-100", eye === 'OD' ? "text-blue-600 bg-blue-50/50" : "text-emerald-600 bg-emerald-50/50")}>
                          {eye === 'OD' ? 'Right Eye (OD)' : 'Left Eye (OS)'}
                        </TableCell>
                        <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{renderLens(contact[eye]?.sphere1)}</TableCell>
                        <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{renderLens(contact[eye]?.cylinder1)}</TableCell>
                        <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{contact[eye]?.axis1 ? `${contact[eye].axis1}°` : "—"}</TableCell>
                        <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{renderLens(contact[eye]?.add)}</TableCell>
                        <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{renderVA(contact[eye]?.vn1)}</TableCell>
                        <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{renderVA(contact[eye]?.vnNear1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table></div>
              </div>
            )}

            {notes && (
              <div className="p-3 bg-slate-50 border border-slate-200 text-xs">
                <span className="font-black uppercase text-slate-500 tracking-wider block mb-1">Previous Rx Notes</span>
                <p className="font-semibold text-slate-700">{notes}</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* 3. Objective Measurements */}
      <div className="space-y-4">
        <SectionHeader icon={Zap} title="Objective measurements" />
        <div className="overflow-x-auto w-full max-w-full pb-2"><Table className="border border-slate-200">
          <TableHeader className="bg-brand/10 border-y border-brand/10">
            <TableRow className="hover:bg-brand/10 border-y border-brand/10 border-b-0">
              <TableHead className="text-brand font-black uppercase text-[12px] tracking-widest h-10 w-[200px]">Method</TableHead>
              <TableHead className={cn("font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-brand/20/30", eyeLabelClass("OD"))}>OD (Right Eye)</TableHead>
              <TableHead className={cn("font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-brand/20/30", eyeLabelClass("OS"))}>OS (Left Eye)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="hover:bg-brand/10 border-b border-slate-100">
              <TableCell className="text-[12px] font-black uppercase text-slate-600">Autoref (AR)</TableCell>
              <TableCell className={cn("text-center font-bold border-l border-slate-100", eyeValueClass("OD"))}>
                {renderLens(rd.autoRef?.OD?.sphere1 || "0.00")} / {renderLens(rd.autoRef?.OD?.cylinder1 || "0.00")} × {rd.autoRef?.OD?.axis1 || "0"}°
              </TableCell>
              <TableCell className={cn("text-center font-bold border-l border-slate-100", eyeValueClass("OS"))}>
                {renderLens(rd.autoRef?.OS?.sphere1 || "0.00")} / {renderLens(rd.autoRef?.OS?.cylinder1 || "0.00")} × {rd.autoRef?.OS?.axis1 || "0"}°
              </TableCell>
            </TableRow>
            <TableRow className="hover:bg-brand/10 border-b border-slate-100">
              <TableCell className="text-[12px] font-black uppercase text-slate-600">Clinical Retinoscopy</TableCell>
              <TableCell className={cn("text-center font-bold border-l border-slate-100", eyeValueClass("OD"))}>
                {renderLens((rd.objectiveRefraction?.OD?.sphere || rd.retinoscopy?.OD?.sphere) || "—")} / {renderLens((rd.objectiveRefraction?.OD?.cylinder || rd.retinoscopy?.OD?.cylinder) || "—")} × {(rd.objectiveRefraction?.OD?.axis || rd.retinoscopy?.OD?.axis) || "0"}°
              </TableCell>
              <TableCell className={cn("text-center font-bold border-l border-slate-100", eyeValueClass("OS"))}>
                {renderLens((rd.objectiveRefraction?.OS?.sphere || rd.retinoscopy?.OS?.sphere) || "—")} / {renderLens((rd.objectiveRefraction?.OS?.cylinder || rd.retinoscopy?.OS?.cylinder) || "—")} × {(rd.objectiveRefraction?.OS?.axis || rd.retinoscopy?.OS?.axis) || "0"}°
              </TableCell>
            </TableRow>
            {(rd.cycloplegic || (rd.objectiveRefraction?.OD?.cycloSphere)) && (() => {
              const isDilated = rd.cycloplegic?.type === "DilRR" || rd.objectiveRefraction?.type === "DilRR";
              const rowClass = isDilated 
                ? "hover:bg-teal-50/50 border-b border-slate-100 bg-teal-50/20" 
                : "hover:bg-amber-50 border-b border-slate-100 bg-amber-50/20";
              const cellClass = isDilated
                ? "text-[12px] font-black uppercase text-teal-700"
                : "text-[12px] font-black uppercase text-amber-700";
              const valClass = isDilated
                ? "text-center font-bold text-teal-900 border-l border-teal-100"
                : "text-center font-bold text-amber-900 border-l border-amber-100";
              return (
                <TableRow className={rowClass}>
                  <TableCell className={cellClass}>
                    {isDilated ? "Dilated Refraction (Dil RR)" : "Cycloplegic Refraction (Cyclo RR)"}
                  </TableCell>
                  <TableCell className={valClass}>
                    {renderLens((rd.objectiveRefraction?.OD?.cycloSphere || rd.cycloplegic?.OD?.sphere) || "—")} / {renderLens((rd.objectiveRefraction?.OD?.cycloCylinder || rd.cycloplegic?.OD?.cylinder) || "—")} × {(rd.objectiveRefraction?.OD?.cycloAxis || rd.cycloplegic?.OD?.axis) || "0"}°
                  </TableCell>
                  <TableCell className={valClass}>
                    {renderLens((rd.objectiveRefraction?.OS?.cycloSphere || rd.cycloplegic?.OS?.sphere) || "—")} / {renderLens((rd.objectiveRefraction?.OS?.cycloCylinder || rd.cycloplegic?.OS?.cylinder) || "—")} × {(rd.objectiveRefraction?.OS?.cycloAxis || rd.cycloplegic?.OS?.axis) || "0"}°
                  </TableCell>
                </TableRow>
              );
            })()}
          </TableBody>
        </Table></div>
      </div>

      {/* 4. Subjective Acceptance Protocol */}
      <div className="space-y-4">
        <SectionHeader icon={ShieldCheck} title="Subjective Acceptance Protocol" />
        <div className="overflow-x-auto w-full max-w-full pb-2"><Table className="border border-slate-200">
          <TableHeader className="bg-brand/10 border-y border-brand/10">
            <TableRow className="hover:bg-brand/10 border-y border-brand/10 border-b-0">
              <TableHead className="text-brand font-black uppercase text-[12px] tracking-widest h-10 w-[100px]">Eye</TableHead>
              <TableHead className="text-brand font-black uppercase text-[12px] tracking-widest h-10 w-[100px] border-l border-brand/20/30">Phase</TableHead>
              <TableHead className="text-brand font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-brand/20/30">SPH</TableHead>
              <TableHead className="text-brand font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-brand/20/30">CYL</TableHead>
              <TableHead className="text-brand font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-brand/20/30">AXIS</TableHead>
              <TableHead className="text-white font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-brand/20/30 bg-brand">BCVA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {['OD', 'OS'].map((eye) => (
              <React.Fragment key={eye}>
                <TableRow className="hover:bg-brand/10 border-b border-slate-100">
                  <TableCell rowSpan={2} className={cn("text-[12px] font-black uppercase border-r border-slate-100", eye === 'OD' ? "text-blue-600 bg-blue-50/50" : "text-emerald-600 bg-emerald-50/50")}>{eye === 'OD' ? 'Right Eye' : 'Left Eye'}</TableCell>
                  <TableCell className="text-[11px] font-bold uppercase text-slate-500">Distance</TableCell>
                  <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{renderLens(getAcceptanceValue('distance', eye as any, 'sphere'))}</TableCell>
                  <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{renderLens(getAcceptanceValue('distance', eye as any, 'cylinder'))}</TableCell>
                  <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{getAcceptanceValue('distance', eye as any, 'axis')}</TableCell>
                  <TableCell className={cn("text-center font-black border-l border-slate-100", eyeVaInputClass(eye))}>{renderVA(getAcceptanceValue('distance', eye as any, 'vn'))}</TableCell>
                </TableRow>
                <TableRow className="hover:bg-brand/10 border-b border-slate-100">
                  <TableCell className="text-[11px] font-bold uppercase text-slate-500">Near</TableCell>
                  <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{renderLens(getAcceptanceValue('near', eye as any, 'sphere'))}</TableCell>
                  <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{renderLens(getAcceptanceValue('near', eye as any, 'cylinder'))}</TableCell>
                  <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{getAcceptanceValue('near', eye as any, 'axis')}</TableCell>
                  <TableCell className={cn("text-center font-black border-l border-slate-100", eyeVaInputClass(eye))}>{renderVA(getAcceptanceValue('near', eye as any, 'vn'))}</TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table></div>
      </div>

      {/* 4.5. Subjective Refining & Binocular Tests */}
      <div className="space-y-4">
        <SectionHeader icon={Activity} title="Subjective Refining & Binocular Tests" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Binocular Functionality Card */}
          <div className="p-4 border border-slate-200 bg-slate-50/30 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Binocular Functionality</span>
            <div className="text-sm font-bold text-slate-800 uppercase">
              {(() => {
                const map: Record<string, string> = {
                  eom: "EOM Full",
                  worth_four_dot: "Worth 4-Dot",
                  stereopsis: "Stereopsis",
                  prism: "Prism Cover",
                  diplopia: "Diplopia Charting"
                };
                return map[rd.binocular] || rd.binocular || "—";
              })()}
            </div>
          </div>

          {/* Duo-Chrome Verification Card */}
          <div className="p-4 border border-slate-200 bg-slate-50/30 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Duo-Chrome Verification</span>
            <div className="text-sm font-bold text-slate-800">
              OD: <span className="text-blue-600 font-black">{rd.refining?.duochrome?.OD || "—"}</span> | OS: <span className="text-emerald-600 font-black">{rd.refining?.duochrome?.OS || "—"}</span>
            </div>
          </div>

          {/* JCC Refining Findings Card */}
          <div className="p-4 border border-slate-200 bg-slate-50/30 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">JCC Refining Notes</span>
            <div className="text-xs text-slate-700 italic leading-relaxed">
              {rd.jcc || "—"}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Final Optometrist Recommendation */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spectacles Table */}
          <div className="space-y-2">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-2.5 bg-brand text-white shadow-md"><Glasses className="w-5 h-5 shrink-0" /></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-brand mb-0.5">Clinical Optics</span>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-tight">Final Spectacles RX</h4>
                  {rd.glassPrescription?.glassType && (
                    <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-none rounded-sm px-2 text-[10px]">
                      {rd.glassPrescription.glassType === 'SVN' ? 'Single Vision' : rd.glassPrescription.glassType === 'KBF' ? 'Bifocals' : rd.glassPrescription.glassType === 'PAL' ? 'Progressive' : rd.glassPrescription.glassType === 'DBF' ? 'Double D Bifocal' : rd.glassPrescription.glassType === 'READING' ? 'Reading Glass' : rd.glassPrescription.glassType}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto w-full max-w-full pb-2"><Table className="border border-brand/20">
              <TableHeader className="bg-brand">
                <TableRow className="hover:bg-brand border-b-0">
                  <TableHead className="text-white font-black uppercase text-[12px] tracking-widest h-8">Eye</TableHead>
                  <TableHead className="text-white font-black uppercase text-[12px] tracking-widest h-8 text-center border-l border-white/20">Vision</TableHead>
                  <TableHead className="text-white font-black uppercase text-[12px] tracking-widest h-8 text-center border-l border-white/20">SPH</TableHead>
                  <TableHead className="text-white font-black uppercase text-[12px] tracking-widest h-8 text-center border-l border-white/20">CYL</TableHead>
                  <TableHead className="text-white font-black uppercase text-[12px] tracking-widest h-8 text-center border-l border-white/20">AXIS</TableHead>
                  <TableHead className="text-white font-black uppercase text-[12px] tracking-widest h-8 text-center border-l border-white/20">VA</TableHead>
                  <TableHead className="text-white font-black uppercase text-[12px] tracking-widest h-8 text-center border-l border-white/20">PD (mm)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {['OD', 'OS'].map((eye) => (
                  <React.Fragment key={eye}>
                    <TableRow className="hover:bg-brand/5 border-b border-brand/10">
                      <TableCell rowSpan={2} className={cn("text-[12px] font-black uppercase align-middle", eye === 'OD' ? "text-blue-600 bg-blue-50/30" : "text-emerald-600 bg-emerald-50/30")}>{eye}</TableCell>
                      <TableCell className="text-[11px] font-bold uppercase text-slate-500 border-l border-brand/10">DV</TableCell>
                      <TableCell className="text-center font-bold text-slate-900 border-l border-brand/10">{renderLens(rd.glassPrescription?.[eye]?.sphere)}</TableCell>
                      <TableCell className="text-center font-bold text-slate-900 border-l border-brand/10">{renderLens(rd.glassPrescription?.[eye]?.cylinder)}</TableCell>
                      <TableCell className="text-center font-bold text-slate-900 border-l border-brand/10">{rd.glassPrescription?.[eye]?.axis || "—"}</TableCell>
                      <TableCell className={cn("text-center font-bold border-l border-brand/10", eyeVaInputClass(eye))}>{renderVA(rd.glassPrescription?.[eye]?.bcva)}</TableCell>
                      <TableCell className={cn("text-center font-bold border-l border-brand/10", eyeValueClass(eye))}>
                        {rd.glassPrescription?.distPD?.[eye] ? `${rd.glassPrescription.distPD[eye]} mm` : "—"}
                      </TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-brand/5 border-b border-brand/10">
                      <TableCell className="text-[11px] font-bold uppercase text-slate-500 border-l border-brand/10">NV</TableCell>
                      <TableCell className="text-center font-bold text-slate-900 border-l border-brand/10">{renderLens(rd.glassPrescription?.[eye]?.nearDsph || rd.glassPrescription?.[eye]?.nearAdd)}</TableCell>
                      <TableCell className="text-center font-bold text-slate-900 border-l border-brand/10">{renderLens(rd.glassPrescription?.[eye]?.nearCylinder)}</TableCell>
                      <TableCell className="text-center font-bold text-slate-900 border-l border-brand/10">{rd.glassPrescription?.[eye]?.nearAxis || "—"}</TableCell>
                      <TableCell className={cn("text-center font-bold border-l border-brand/10", eyeVaInputClass(eye))}>
                        {renderVA(rd.glassPrescription?.[eye]?.nearBcva)}
                        {rd.glassPrescription?.[eye]?.nearCm ? (
                          <span className="block text-[9px] font-bold text-slate-500 mt-0.5">{rd.glassPrescription[eye].nearCm} cm</span>
                        ) : null}
                      </TableCell>
                      <TableCell className={cn("text-center font-bold border-l border-brand/10", eyeValueClass(eye))}>
                        {rd.glassPrescription?.nearPD?.[eye] ? `${rd.glassPrescription.nearPD[eye]} mm` : "—"}
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table></div>
          </div>

          {/* Contact Lens Table */}
          <div className="space-y-2">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-2.5 bg-brand text-white shadow-md"><Eye className="w-5 h-5 shrink-0" /></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-brand mb-0.5">Clinical Optics</span>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-tight">Final Contact Lens RX</h4>
                  {rd.contactLensPrescription?.clType && Array.isArray(rd.contactLensPrescription.clType) && rd.contactLensPrescription.clType.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {rd.contactLensPrescription.clType.map((type: string) => (
                        <Badge key={type} className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-none rounded-sm px-2 text-[10px]">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto w-full max-w-full pb-2"><Table className="border border-brand/20">
              <TableHeader className="bg-brand">
                <TableRow className="hover:bg-brand border-b-0">
                  <TableHead className="text-white font-black uppercase text-[12px] tracking-widest h-8">Eye</TableHead>
                  <TableHead className="text-white font-black uppercase text-[12px] tracking-widest h-8 text-center border-l border-white/20">Vision</TableHead>
                  <TableHead className="text-white font-black uppercase text-[12px] tracking-widest h-8 text-center border-l border-white/20">SPH</TableHead>
                  <TableHead className="text-white font-black uppercase text-[12px] tracking-widest h-8 text-center border-l border-white/20">CYL</TableHead>
                  <TableHead className="text-white font-black uppercase text-[12px] tracking-widest h-8 text-center border-l border-white/20">AXIS</TableHead>
                  <TableHead className="text-white font-black uppercase text-[12px] tracking-widest h-8 text-center border-l border-white/20">VA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {['OD', 'OS'].map((eye) => (
                  <React.Fragment key={eye}>
                    <TableRow className="hover:bg-brand/5 border-b border-brand/10">
                      <TableCell rowSpan={2} className={cn("text-[12px] font-black uppercase align-middle", eye === 'OD' ? "text-blue-600 bg-blue-50/30" : "text-emerald-600 bg-emerald-50/30")}>{eye}</TableCell>
                      <TableCell className="text-[11px] font-bold uppercase text-slate-500 border-l border-brand/10">DV</TableCell>
                      <TableCell className="text-center font-bold text-slate-900 border-l border-brand/10">{renderLens(rd.contactLensPrescription?.[eye]?.sphere)}</TableCell>
                      <TableCell className="text-center font-bold text-slate-900 border-l border-brand/10">{renderLens(rd.contactLensPrescription?.[eye]?.cylinder)}</TableCell>
                      <TableCell className="text-center font-bold text-slate-900 border-l border-brand/10">{rd.contactLensPrescription?.[eye]?.axis || "—"}</TableCell>
                      <TableCell className={cn("text-center font-bold border-l border-brand/10", eyeVaInputClass(eye))}>{renderVA(rd.contactLensPrescription?.[eye]?.bcva)}</TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-brand/5 border-b border-brand/10">
                      <TableCell className="text-[11px] font-bold uppercase text-slate-500 border-l border-brand/10">NV</TableCell>
                      <TableCell className="text-center font-bold text-slate-900 border-l border-brand/10">{renderLens(rd.contactLensPrescription?.[eye]?.nearDsph || rd.contactLensPrescription?.[eye]?.nearAdd)}</TableCell>
                      <TableCell className="text-center font-bold text-slate-900 border-l border-brand/10">{renderLens(rd.contactLensPrescription?.[eye]?.nearCylinder)}</TableCell>
                      <TableCell className="text-center font-bold text-slate-900 border-l border-brand/10">{rd.contactLensPrescription?.[eye]?.nearAxis || "—"}</TableCell>
                      <TableCell className={cn("text-center font-bold border-l border-brand/10", eyeVaInputClass(eye))}>{renderVA(rd.contactLensPrescription?.[eye]?.nearBcva)}</TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table></div>
          </div>
        </div>
      </div>

      {/* 6. Supplementary Protocol Matrix */}
      <div className="space-y-4">
        <SectionHeader icon={Thermometer} title="Supplementary Protocol Matrix" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tonometry Table */}
          <div className="overflow-x-auto w-full max-w-full pb-2"><Table className="border border-slate-200">
            <TableHeader className="bg-brand/10 border-y border-brand/10">
              <TableRow className="hover:bg-brand/10 border-y border-brand/10 border-b-0">
                <TableHead className="text-brand font-black uppercase text-[12px] h-10">Tonometry (mmHg)</TableHead>
                <TableHead className={cn("font-black uppercase text-[12px] h-10 text-center border-l border-slate-200", eyeLabelClass("OD"))}>OD</TableHead>
                <TableHead className={cn("font-black uppercase text-[12px] h-10 text-center border-l border-slate-200", eyeLabelClass("OS"))}>OS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-brand/10">
                <TableCell className="text-[12px] font-black uppercase text-slate-500">MEAN (Air-Puff)</TableCell>
                <TableCell className="text-center font-bold border-l border-slate-100">
                  {(() => {
                    const vals = Array.isArray(rd.tonometryDetails?.nct?.OD?.mean) ? rd.tonometryDetails.nct.OD.mean : (rd.tonometryDetails?.nct?.OD?.mean ? [rd.tonometryDetails.nct.OD.mean] : []);
                    return vals.length > 0 ? renderIOP(vals.join(", ")) : "—";
                  })()}
                </TableCell>
                <TableCell className="text-center font-bold border-l border-slate-100">
                  {(() => {
                    const vals = Array.isArray(rd.tonometryDetails?.nct?.OS?.mean) ? rd.tonometryDetails.nct.OS.mean : (rd.tonometryDetails?.nct?.OS?.mean ? [rd.tonometryDetails.nct.OS.mean] : []);
                    return vals.length > 0 ? renderIOP(vals.join(", ")) : "—";
                  })()}
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-brand/5 bg-brand/5">
                <TableCell className="text-[12px] font-black uppercase text-brand">GAT (Goldmann)</TableCell>
                <TableCell className="text-center font-black text-brand border-l border-brand/10">
                  {(() => {
                    const vals = Array.isArray(rd.tonometryDetails?.gat?.OD?.reading) ? rd.tonometryDetails.gat.OD.reading : (rd.tonometryDetails?.gat?.OD?.reading ? [rd.tonometryDetails.gat.OD.reading] : []);
                    return vals.length > 0 ? renderIOP(vals.join(", ")) : "—";
                  })()}
                </TableCell>
                <TableCell className="text-center font-black text-brand border-l border-brand/10">
                  {(() => {
                    const vals = Array.isArray(rd.tonometryDetails?.gat?.OS?.reading) ? rd.tonometryDetails.gat.OS.reading : (rd.tonometryDetails?.gat?.OS?.reading ? [rd.tonometryDetails.gat.OS.reading] : []);
                    return vals.length > 0 ? renderIOP(vals.join(", ")) : "—";
                  })()}
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-brand/10">
                <TableCell className="text-[12px] font-black uppercase text-slate-500">Schiotz Indentation</TableCell>
                <TableCell className="text-center font-bold border-l border-slate-100">
                  {rd.tonometryDetails?.schiotz?.OD?.reading ? (
                    `${rd.tonometryDetails.schiotz.OD.reading} / ${rd.tonometryDetails.schiotz.OD.weight}g` +
                    (rd.tonometryDetails.schiotz.OD.iop ? ` (${rd.tonometryDetails.schiotz.OD.iop} mmHg)` : "")
                  ) : "—"}
                </TableCell>
                <TableCell className="text-center font-bold border-l border-slate-100">
                  {rd.tonometryDetails?.schiotz?.OS?.reading ? (
                    `${rd.tonometryDetails.schiotz.OS.reading} / ${rd.tonometryDetails.schiotz.OS.weight}g` +
                    (rd.tonometryDetails.schiotz.OS.iop ? ` (${rd.tonometryDetails.schiotz.OS.iop} mmHg)` : "")
                  ) : "—"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table></div>

          {/* Ophthalmic Tests Table */}
          <div className="overflow-x-auto w-full max-w-full pb-2"><Table className="border border-slate-200">
            <TableHeader className="bg-brand/10 border-y border-brand/10">
              <TableRow className="hover:bg-brand/10 border-y border-brand/10 border-b-0">
                <TableHead className="text-brand font-black uppercase text-[12px] h-10">Clinical Tests</TableHead>
                <TableHead className="text-brand font-black uppercase text-[12px] h-10 text-center border-l border-slate-200">Finding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className={cn("hover:bg-brand/10", rd.ishiharaTest?.status === 'DEFICIENCY' && "bg-red-50/50")}>
                <TableCell className="text-[12px] font-black uppercase text-slate-500">Color Vision (Ishihara)</TableCell>
                <TableCell className={cn("text-center font-black uppercase text-[11px] border-l border-slate-100", rd.ishiharaTest?.status === 'DEFICIENCY' ? 'text-red-600' : 'text-emerald-600')}>
                  {rd.ishiharaTest?.status === 'DEFICIENCY' 
                    ? <span className="flex items-center justify-center gap-2 animate-pulse">DEFICIENCY{rd.ishiharaTest.notes ? ` (${rd.ishiharaTest.notes})` : ""}</span>
                    : (rd.ishiharaTest?.status || "NOT TESTED")}
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-brand/10">
                <TableCell className="text-[12px] font-black uppercase text-slate-500">Schirmer's Tear Test</TableCell>
                <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">
                  OD: {rd.schirmerTest?.OD ? `${rd.schirmerTest.OD} mm` : "—"} / OS: {rd.schirmerTest?.OS ? `${rd.schirmerTest.OS} mm` : "—"}
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-brand/10">
                <TableCell className="text-[12px] font-black uppercase text-slate-500">Keratometry Matrix</TableCell>
                <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">
                  OD: {(() => {
                    const val = rd.keratometry?.OD;
                    if (val && typeof val === 'object' && !Array.isArray(val)) return "—";
                    return Array.isArray(val) ? val.join(", ") : (val || "N/A");
                  })()} / OS: {(() => {
                    const val = rd.keratometry?.OS;
                    if (val && typeof val === 'object' && !Array.isArray(val)) return "—";
                    return Array.isArray(val) ? val.join(", ") : (val || "N/A");
                  })()}
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-brand/10">
                <TableCell className="text-[12px] font-black uppercase text-slate-500">Amsler Grid Test</TableCell>
                <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">
                  {rd.amslerGrid || "—"}
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-brand/10">
                <TableCell className="text-[12px] font-black uppercase text-slate-500">Contrast Sensitivity</TableCell>
                <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">
                  {rd.contrastSensitivity || "—"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table></div>
        </div>
      </div>

      {/* 7. Final Clinical Remarks */}
      <div className="space-y-2">
        <SectionHeader icon={FileText} title="Optometrist Clinical Remarks" />
        <div className="p-4 bg-brand/10 border border-slate-200 italic font-medium text-slate-600 text-sm leading-relaxed">
          {rd.optometristNotes || "No specific clinical remarks documented by the attending optometrist."}
        </div>
      </div>
    </div>
  );
}
