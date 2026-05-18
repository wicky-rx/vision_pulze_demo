import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, ClipboardList, Activity, Thermometer, FileText, Zap, ExternalLink, Glasses, ShieldCheck, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "@/config";
import { cn } from "@/lib/utils";

function SectionHeader({ icon: Icon, title, category = "Clinical Assessment" }: { icon: any, title: string, category?: string }) {
  return (
    <div className="flex items-center gap-4 py-3 mb-4 border-b border-slate-100">
      <div className="p-3 bg-orange-600 text-white shadow-lg"><Icon className="w-6 h-6 shrink-0" /></div>
      <div className="flex flex-col">
        <span className="text-[12px] font-black uppercase tracking-widest text-orange-600 mb-0.5">{category}</span>
        <h3 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tighter">{title}</h3>
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

  const renderLens = (val: string, threshold = 1.5) => {
    if (!val || val === "—") return "—";
    if (isAbnormalLens(val, threshold)) return <span className="inline-block px-1.5 py-0.5 bg-red-100/80 text-red-700 font-black rounded border border-red-200 animate-pulse shadow-sm">{val}</span>;
    return val;
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 py-3 bg-orange-50/50 border border-slate-100 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-50 text-orange-600">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Lead Consultant</p>
            <p className="text-sm font-black text-orange-600 uppercase">{rd.consultantName || rd.visit?.doctor?.name || "Dr. Gajendran MBBS DO"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 md:border-l md:border-orange-200 md:pl-6 pt-4 md:pt-0 border-t md:border-t-0 border-orange-100">
          <div className="p-2 bg-orange-50/30 text-slate-600">
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
          <div className="px-4 py-2 bg-orange-50 border-l-4 border-orange-600">
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
                        : "bg-orange-50 border-y border-orange-100 text-orange-600"
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
        <Table className="border border-slate-200">
          <TableHeader className="bg-orange-50 border-y border-orange-100">
            <TableRow className="hover:bg-orange-50 border-y border-orange-100 border-b-0">
              <TableHead className="text-orange-600 font-black uppercase text-[12px] tracking-widest h-10 w-[200px]">Modality</TableHead>
              <TableHead className="text-orange-600 font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-orange-200/30">OD (Right)</TableHead>
              <TableHead className="text-orange-600 font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-orange-200/30">OS (Left)</TableHead>
              <TableHead className="text-orange-600 font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-orange-200/30 bg-orange-100/50">OU (Both)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              { label: "Unaided Vision (DV)", od: rd.visualAcuity?.OD?.unaided, os: rd.visualAcuity?.OS?.unaided, ou: rd.visualAcuity?.OU?.unaided },
              { label: "Unaided Vision (NV)", od: rd.visualAcuity?.OD?.nearVision, os: rd.visualAcuity?.OS?.nearVision, ou: rd.visualAcuity?.OU?.nearVision },
              { label: "Aided Vision (DV)", od: rd.visualAcuity?.OD?.aided, os: rd.visualAcuity?.OS?.aided, ou: rd.visualAcuity?.OU?.aided },
              { label: "Pinhole Potential", od: rd.visualAcuity?.OD?.pinhole, os: rd.visualAcuity?.OS?.pinhole, ou: rd.visualAcuity?.OU?.pinhole },
            ].map((row, i) => (
              <TableRow key={i} className="hover:bg-orange-50 border-b border-slate-100">
                <TableCell className="text-[12px] font-black uppercase text-slate-600">{row.label}</TableCell>
                <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{renderVA(row.od)}</TableCell>
                <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{renderVA(row.os)}</TableCell>
                <TableCell className="text-center font-bold text-orange-600 border-l border-slate-100 bg-orange-50/50">{renderVA(row.ou)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 3. Objective Measurements */}
      <div className="space-y-4">
        <SectionHeader icon={Zap} title="Objective measurements" />
        <Table className="border border-slate-200">
          <TableHeader className="bg-orange-50 border-y border-orange-100">
            <TableRow className="hover:bg-orange-50 border-y border-orange-100 border-b-0">
              <TableHead className="text-orange-600 font-black uppercase text-[12px] tracking-widest h-10 w-[200px]">Method</TableHead>
              <TableHead className="text-orange-600 font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-orange-200/30">OD (Right Eye)</TableHead>
              <TableHead className="text-orange-600 font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-orange-200/30">OS (Left Eye)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="hover:bg-orange-50 border-b border-slate-100">
              <TableCell className="text-[12px] font-black uppercase text-slate-600">Autoref (AR)</TableCell>
              <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">
                {renderLens(rd.autoRef?.OD?.sphere1 || "0.00")} / {renderLens(rd.autoRef?.OD?.cylinder1 || "0.00")} × {rd.autoRef?.OD?.axis1 || "0"}°
              </TableCell>
              <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">
                {renderLens(rd.autoRef?.OS?.sphere1 || "0.00")} / {renderLens(rd.autoRef?.OS?.cylinder1 || "0.00")} × {rd.autoRef?.OS?.axis1 || "0"}°
              </TableCell>
            </TableRow>
            <TableRow className="hover:bg-orange-50 border-b border-slate-100">
              <TableCell className="text-[12px] font-black uppercase text-slate-600">Clinical Retinoscopy</TableCell>
              <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">
                {renderLens((rd.objectiveRefraction?.OD?.sphere || rd.retinoscopy?.OD?.sphere) || "—")} / {renderLens((rd.objectiveRefraction?.OD?.cylinder || rd.retinoscopy?.OD?.cylinder) || "—")} × {(rd.objectiveRefraction?.OD?.axis || rd.retinoscopy?.OD?.axis) || "0"}°
              </TableCell>
              <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">
                {renderLens((rd.objectiveRefraction?.OS?.sphere || rd.retinoscopy?.OS?.sphere) || "—")} / {renderLens((rd.objectiveRefraction?.OS?.cylinder || rd.retinoscopy?.OS?.cylinder) || "—")} × {(rd.objectiveRefraction?.OS?.axis || rd.retinoscopy?.OS?.axis) || "0"}°
              </TableCell>
            </TableRow>
            {(rd.cycloplegic || (rd.objectiveRefraction?.OD?.cycloSphere)) && (
              <TableRow className="hover:bg-amber-50 border-b border-slate-100 bg-amber-50/20">
                <TableCell className="text-[12px] font-black uppercase text-amber-700">Cycloplegic Refraction</TableCell>
                <TableCell className="text-center font-bold text-amber-900 border-l border-amber-100">
                  {renderLens((rd.objectiveRefraction?.OD?.cycloSphere || rd.cycloplegic?.OD?.sphere) || "—")} /
                  {renderLens((rd.objectiveRefraction?.OD?.cycloCylinder || rd.cycloplegic?.OD?.cylinder) || "—")} ×
                  {(rd.objectiveRefraction?.OD?.cycloAxis || rd.cycloplegic?.OD?.axis) || "0"}°
                </TableCell>
                <TableCell className="text-center font-bold text-amber-900 border-l border-amber-100">
                  {renderLens((rd.objectiveRefraction?.OS?.cycloSphere || rd.cycloplegic?.OS?.sphere) || "—")} /
                  {renderLens((rd.objectiveRefraction?.OS?.cycloCylinder || rd.cycloplegic?.OS?.cylinder) || "—")} ×
                  {(rd.objectiveRefraction?.OS?.cycloAxis || rd.cycloplegic?.OS?.axis) || "0"}°
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 4. Subjective Acceptance Protocol */}
      <div className="space-y-4">
        <SectionHeader icon={ShieldCheck} title="Subjective Acceptance Protocol" />
        <Table className="border border-slate-200">
          <TableHeader className="bg-orange-50 border-y border-orange-100">
            <TableRow className="hover:bg-orange-50 border-y border-orange-100 border-b-0">
              <TableHead className="text-orange-600 font-black uppercase text-[12px] tracking-widest h-10 w-[100px]">Eye</TableHead>
              <TableHead className="text-orange-600 font-black uppercase text-[12px] tracking-widest h-10 w-[100px]">Phase</TableHead>
              <TableHead className="text-orange-600 font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-orange-200/30">SPH</TableHead>
              <TableHead className="text-orange-600 font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-orange-200/30">CYL</TableHead>
              <TableHead className="text-orange-600 font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-orange-200/30">AXIS</TableHead>
              <TableHead className="text-white font-black uppercase text-[12px] tracking-widest h-10 text-center border-l border-orange-200/30 bg-orange-600">BCVA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {['OD', 'OS'].map((eye) => (
              <React.Fragment key={eye}>
                <TableRow className="hover:bg-orange-50 border-b border-slate-100">
                  <TableCell rowSpan={2} className={cn("text-[12px] font-black uppercase border-r border-slate-100 bg-orange-50/50", eye === 'OD' ? "text-blue-600" : "text-emerald-600")}>{eye === 'OD' ? 'Right Eye' : 'Left Eye'}</TableCell>
                  <TableCell className="text-[11px] font-bold uppercase text-slate-500">Distance</TableCell>
                  <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{renderLens(getAcceptanceValue('distance', eye as any, 'sphere'))}</TableCell>
                  <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{renderLens(getAcceptanceValue('distance', eye as any, 'cylinder'))}</TableCell>
                  <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{getAcceptanceValue('distance', eye as any, 'axis')}</TableCell>
                  <TableCell className="text-center font-black text-orange-600 border-l border-slate-100 bg-orange-50/30">{renderVA(getAcceptanceValue('distance', eye as any, 'vn'))}</TableCell>
                </TableRow>
                <TableRow className="hover:bg-orange-50 border-b border-slate-100">
                  <TableCell className="text-[11px] font-bold uppercase text-slate-500">Near</TableCell>
                  <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{renderLens(getAcceptanceValue('near', eye as any, 'sphere'))}</TableCell>
                  <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{renderLens(getAcceptanceValue('near', eye as any, 'cylinder'))}</TableCell>
                  <TableCell className="text-center font-bold text-slate-900 border-l border-slate-100">{getAcceptanceValue('near', eye as any, 'axis')}</TableCell>
                  <TableCell className="text-center font-black text-orange-600 border-l border-slate-100 bg-orange-50/30">{renderVA(getAcceptanceValue('near', eye as any, 'vn'))}</TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 5. Final Optometrist Recommendation */}
      <div className="space-y-4">
        <SectionHeader icon={Glasses} title="Final Optometrist Recommendation" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spectacles Table */}
          <div className="space-y-2">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-2.5 bg-orange-600 text-white shadow-md"><Glasses className="w-5 h-5 shrink-0" /></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-0.5">Clinical Optics</span>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Final Spectacles Prescription</h4>
                  {rd.glassPrescription?.glassType && (
                    <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-none rounded-sm px-2 text-[10px]">
                      {rd.glassPrescription.glassType}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Table className="border border-orange-100">
              <TableHeader className="bg-orange-600">
                <TableRow className="hover:bg-orange-600 border-b-0">
                  <TableHead className="text-white font-black uppercase text-[12px] tracking-widest h-8">Eye</TableHead>
                  <TableHead className="text-white font-black uppercase text-[12px] tracking-widest h-8 text-center">SPH</TableHead>
                  <TableHead className="text-white font-black uppercase text-[12px] tracking-widest h-8 text-center">CYL</TableHead>
                  <TableHead className="text-white font-black uppercase text-[12px] tracking-widest h-8 text-center">AXIS</TableHead>
                  <TableHead className="text-white font-black uppercase text-[12px] tracking-widest h-8 text-center">ADD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {['OD', 'OS'].map((eye) => (
                  <TableRow key={eye} className="hover:bg-orange-50/30 border-b border-orange-50">
                    <TableCell className={cn("text-[12px] font-black uppercase", eye === 'OD' ? "text-blue-600" : "text-emerald-600")}>{eye}</TableCell>
                    <TableCell className="text-center font-bold text-slate-900">{renderLens(rd.glassPrescription?.[eye]?.sphere)}</TableCell>
                    <TableCell className="text-center font-bold text-slate-900">{renderLens(rd.glassPrescription?.[eye]?.cylinder)}</TableCell>
                    <TableCell className="text-center font-bold text-slate-900">{rd.glassPrescription?.[eye]?.axis || "—"}</TableCell>
                    <TableCell className="text-center font-bold text-orange-600 bg-orange-50/50">{renderLens(rd.glassPrescription?.[eye]?.nearAdd, 3.0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Contact Lens Table */}
          <div className="space-y-2">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-2.5 bg-orange-600 text-white shadow-md"><Eye className="w-5 h-5 shrink-0" /></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-0.5">Clinical Optics</span>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Final Contact Lens Prescription</h4>
                  {rd.contactLensPrescription?.clType && Array.isArray(rd.contactLensPrescription.clType) && rd.contactLensPrescription.clType.length > 0 && (
                    <div className="flex gap-1 ml-2">
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
            <Table className="border border-orange-100">
              <TableHeader className="bg-orange-600">
                <TableRow className="hover:bg-orange-600 border-b-0">
                  <TableHead className="text-white font-black uppercase text-[12px] tracking-widest h-8">Eye</TableHead>
                  <TableHead className="text-white font-black uppercase text-[12px] tracking-widest h-8 text-center">SPH</TableHead>
                  <TableHead className="text-white font-black uppercase text-[12px] tracking-widest h-8 text-center">CYL</TableHead>
                  <TableHead className="text-white font-black uppercase text-[12px] tracking-widest h-8 text-center">AXIS</TableHead>
                  <TableHead className="text-white font-black uppercase text-[12px] tracking-widest h-8 text-center">BCVA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {['OD', 'OS'].map((eye) => (
                  <TableRow key={eye} className="hover:bg-orange-50/30 border-b border-orange-50">
                    <TableCell className={cn("text-[12px] font-black uppercase", eye === 'OD' ? "text-blue-600" : "text-emerald-600")}>{eye}</TableCell>
                    <TableCell className="text-center font-bold text-slate-900">{renderLens(rd.contactLensPrescription?.[eye]?.sphere)}</TableCell>
                    <TableCell className="text-center font-bold text-slate-900">{renderLens(rd.contactLensPrescription?.[eye]?.cylinder)}</TableCell>
                    <TableCell className="text-center font-bold text-slate-900">{rd.contactLensPrescription?.[eye]?.axis || "—"}</TableCell>
                    <TableCell className="text-center font-bold text-orange-600 bg-orange-50/50">{renderVA(rd.contactLensPrescription?.[eye]?.bcva)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* 6. Supplementary Protocol Matrix */}
      <div className="space-y-4">
        <SectionHeader icon={Thermometer} title="Supplementary Protocol Matrix" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tonometry Table */}
          <Table className="border border-slate-200">
            <TableHeader className="bg-orange-50 border-y border-orange-100">
              <TableRow className="hover:bg-orange-50 border-y border-orange-100 border-b-0">
                <TableHead className="text-orange-600 font-black uppercase text-[12px] h-10">Tonometry (mmHg)</TableHead>
                <TableHead className="text-orange-600 font-black uppercase text-[12px] h-10 text-center">OD</TableHead>
                <TableHead className="text-orange-600 font-black uppercase text-[12px] h-10 text-center">OS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-orange-50">
                <TableCell className="text-[12px] font-black uppercase text-slate-500">MEAN (Air-Puff)</TableCell>
                <TableCell className="text-center font-bold">
                  {(() => {
                    const vals = Array.isArray(rd.tonometryDetails?.nct?.OD?.mean) ? rd.tonometryDetails.nct.OD.mean : (rd.tonometryDetails?.nct?.OD?.mean ? [rd.tonometryDetails.nct.OD.mean] : []);
                    return vals.length > 0 ? renderIOP(vals.join(", ")) : "—";
                  })()}
                </TableCell>
                <TableCell className="text-center font-bold">
                  {(() => {
                    const vals = Array.isArray(rd.tonometryDetails?.nct?.OS?.mean) ? rd.tonometryDetails.nct.OS.mean : (rd.tonometryDetails?.nct?.OS?.mean ? [rd.tonometryDetails.nct.OS.mean] : []);
                    return vals.length > 0 ? renderIOP(vals.join(", ")) : "—";
                  })()}
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-orange-50/50 bg-orange-50/30">
                <TableCell className="text-[12px] font-black uppercase text-orange-600">GAT (Goldmann)</TableCell>
                <TableCell className="text-center font-black text-orange-600">
                  {(() => {
                    const vals = Array.isArray(rd.tonometryDetails?.gat?.OD?.reading) ? rd.tonometryDetails.gat.OD.reading : (rd.tonometryDetails?.gat?.OD?.reading ? [rd.tonometryDetails.gat.OD.reading] : []);
                    return vals.length > 0 ? renderIOP(vals.join(", ")) : "—";
                  })()}
                </TableCell>
                <TableCell className="text-center font-black text-orange-600">
                  {(() => {
                    const vals = Array.isArray(rd.tonometryDetails?.gat?.OS?.reading) ? rd.tonometryDetails.gat.OS.reading : (rd.tonometryDetails?.gat?.OS?.reading ? [rd.tonometryDetails.gat.OS.reading] : []);
                    return vals.length > 0 ? renderIOP(vals.join(", ")) : "—";
                  })()}
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-orange-50">
                <TableCell className="text-[12px] font-black uppercase text-slate-500">Schiotz Indentation</TableCell>
                <TableCell className="text-center font-bold">
                  {rd.tonometryDetails?.schiotz?.OD?.reading ? (
                    `${rd.tonometryDetails.schiotz.OD.reading} / ${rd.tonometryDetails.schiotz.OD.weight}g` +
                    (rd.tonometryDetails.schiotz.OD.iop ? ` (${rd.tonometryDetails.schiotz.OD.iop} mmHg)` : "")
                  ) : "—"}
                </TableCell>
                <TableCell className="text-center font-bold">
                  {rd.tonometryDetails?.schiotz?.OS?.reading ? (
                    `${rd.tonometryDetails.schiotz.OS.reading} / ${rd.tonometryDetails.schiotz.OS.weight}g` +
                    (rd.tonometryDetails.schiotz.OS.iop ? ` (${rd.tonometryDetails.schiotz.OS.iop} mmHg)` : "")
                  ) : "—"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* Ophthalmic Tests Table */}
          <Table className="border border-slate-200">
            <TableHeader className="bg-orange-50 border-y border-orange-100">
              <TableRow className="hover:bg-orange-50 border-y border-orange-100 border-b-0">
                <TableHead className="text-orange-600 font-black uppercase text-[12px] h-10">Clinical Tests</TableHead>
                <TableHead className="text-orange-600 font-black uppercase text-[12px] h-10 text-center">Finding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className={cn("hover:bg-orange-50", rd.ishiharaTest?.status === 'DEFICIENCY' && "bg-red-50/50")}>
                <TableCell className="text-[12px] font-black uppercase text-slate-500">Color Vision (Ishihara)</TableCell>
                <TableCell className={cn("text-center font-black uppercase text-[11px]", rd.ishiharaTest?.status === 'DEFICIENCY' ? 'text-red-600' : 'text-emerald-600')}>
                  {rd.ishiharaTest?.status === 'DEFICIENCY' 
                    ? <span className="flex items-center justify-center gap-2 animate-pulse">DEFICIENCY{rd.ishiharaTest.notes ? ` (${rd.ishiharaTest.notes})` : ""}</span>
                    : (rd.ishiharaTest?.status || "NOT TESTED")}
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-orange-50">
                <TableCell className="text-[12px] font-black uppercase text-slate-500">Schirmer's Tear Test</TableCell>
                <TableCell className="text-center font-bold text-slate-900">
                  OD: {rd.schirmerTest?.OD ? `${rd.schirmerTest.OD} mm` : "—"} / OS: {rd.schirmerTest?.OS ? `${rd.schirmerTest.OS} mm` : "—"}
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-orange-50">
                <TableCell className="text-[12px] font-black uppercase text-slate-500">Keratometry Matrix</TableCell>
                <TableCell className="text-center font-bold text-slate-900">
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
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 7. Final Clinical Remarks */}
      <div className="space-y-2">
        <SectionHeader icon={FileText} title="Optometrist Clinical Remarks" />
        <div className="p-4 bg-orange-50 border border-slate-200 italic font-medium text-slate-600 text-sm leading-relaxed">
          {rd.optometristNotes || "No specific clinical remarks documented by the attending optometrist."}
        </div>
      </div>
    </div>
  );
}
