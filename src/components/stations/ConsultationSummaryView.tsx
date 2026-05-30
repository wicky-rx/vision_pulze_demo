import React from 'react';
import { DialogHeader } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, Printer, Eye, Microscope, Activity, Pill, Glasses, FileText } from 'lucide-react';
import { getPatientAgeString, getPatientGenderString } from "@/lib/utils";
import { RefractionSummaryView } from "./RefractionSummaryView";

const INVESTIGATION_MAP: Record<string, string> = {
  "hba1c": "HbA1c",
  "rbs": "RBS",
  "fbs_ppbs": "FBS / PPBS",
  "lipid_profile": "Lipid Profile",
  "ecg": "ECG",
  "bp": "Blood Pressure",
  "hiv": "HIV Test",
  "hbsag": "HBsAg",
  "urine_routine": "Urine Routine"
};

export function ConsultationSummaryView({
  selectedHistoricalVisit,
  patient,
  triggerPrint
}: {
  selectedHistoricalVisit: any;
  patient: any;
  triggerPrint?: (type: any) => void;
}) {
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
  const patientGender = getPatientGenderString(selectedHistoricalVisit.patient || patient);
  const patientAge = selectedHistoricalVisit.patient
    ? getPatientAgeString(selectedHistoricalVisit.patient)
    : patient
      ? getPatientAgeString(patient)
      : "—";

  const formatValue = (val: any) => {
    if (val === null || val === undefined) return "—";
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      if (val.iop) return `${val.iop}${val.reading ? ` (${val.reading})` : ''}`;
      if (val.time && val.method) return `${val.method} at ${val.time}`;
      if (Array.isArray(val)) return val.join(", ");
      return JSON.stringify(val);
    }
    return String(val);
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

  return (
    <>
      <DialogHeader className="bg-white border-b border-slate-200 p-5 sm:p-6 shrink-0 print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-4">
            <img
              src="https://res.cloudinary.com/autodapp/image/upload/v1775219907/VPN%20Eye%20Hospital%20Logo.png"
              alt="VPN Logo"
              className="h-8 sm:h-10 w-auto object-contain shrink-0"
            />
            <div>
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">VPN Eye Hospital</h2>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                25, Neela West Street, Nagapattinam - 611001
              </p>
            </div>
          </div>
          <div className="flex flex-row flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-6 w-full sm:w-auto mt-4 sm:mt-0">
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
            {triggerPrint && (
              <>
                <div className="h-8 w-px bg-slate-200 no-print" />
                <Button
                  onClick={() => triggerPrint('all')}
                  className="no-print bg-orange-600 hover:bg-orange-700 text-white rounded-none font-bold uppercase text-xs tracking-wider flex items-center gap-2 h-9"
                >
                  <Printer className="w-4 h-4" />
                  Print Report
                </Button>
              </>
            )}
          </div>
        </div>

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

          {selectedHistoricalVisit.consultation ? (
            <>
              <Card className="border border-slate-300 rounded-none bg-white overflow-hidden shadow-none">
                <div className="p-4 border-b border-slate-300 bg-slate-50 flex items-center gap-3">
                  <div className="p-1.5 bg-orange-100 text-orange-600 rounded"><Microscope className="w-4 h-4" /></div>
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Ocular Examination Findings</h4>
                </div>
                <div className="p-6 space-y-6">
                  {(() => {
                    try {
                      const raw = selectedHistoricalVisit.consultation?.anteriorSegment;
                      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                      if (!parsed) return null;

                      const slitLamp = parsed.slitLamp || parsed;
                      const eom = parsed.eom;

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
                                    <span className="text-slate-800 font-semibold px-3 whitespace-pre-wrap">{formatValue(slitLamp[key]?.OD)}</span>
                                    <span className="text-slate-800 font-semibold px-3 whitespace-pre-wrap">{formatValue(slitLamp[key]?.OS)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs font-bold text-slate-400 italic py-2">No anterior segment defects noted.</p>
                          )}

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

                          {eom && (eom.OD || eom.OS) && (
                            <div className="p-3 bg-white border border-slate-300 rounded-none flex flex-row items-center justify-between text-xs">
                              <span className="font-bold text-slate-500 uppercase tracking-wider">Extra Ocular Movements</span>
                              <span className="font-black text-slate-700">
                                OD: {formatValue(eom.OD)}  |  OS: {formatValue(eom.OS)}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    } catch (e) { return null; }
                  })()}

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
                          <div className="overflow-x-auto w-full max-w-full pb-2"><Table className="w-full border-collapse">
                            <TableHeader className="bg-slate-50 border-b border-slate-300">
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-600 pl-4 py-3 border-r border-slate-200">Medicine</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-600 py-3 border-r border-slate-200">Dose / Route</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-600 py-3 border-r border-slate-200">Frequency</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-600 py-3 border-r border-slate-200">Duration</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-600 pr-4 py-3 text-right">Eye / Food Timing</TableHead>
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
                                      {m.route?.toLowerCase() === "oral" ? (m.foodRelation || "After Food") : (m.eye || "Both")}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table></div>
                        </div>
                      );
                    }
                    return <p className="text-xs font-bold text-slate-400 italic text-center py-8 uppercase tracking-widest border-t border-slate-300">No medications prescribed</p>;
                  })()}
                </div>
              </Card>

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
                                  <div className="overflow-x-auto w-full max-w-full pb-2"><Table className="w-full border-collapse">
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
                                          <TableCell className="text-center text-xs font-semibold border-r border-slate-200">
                                            {glassRx[part]?.[eye]?.sphere ? formatLensSign(glassRx[part][eye].sphere) : "0.00"}
                                          </TableCell>
                                          <TableCell className="text-center text-xs font-semibold border-r border-slate-200">
                                            {glassRx[part]?.[eye]?.cylinder ? formatLensSign(glassRx[part][eye].cylinder) : "0.00"}
                                          </TableCell>
                                          <TableCell className="text-center text-xs font-semibold">{glassRx[part]?.[eye]?.axis || "0"}°</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table></div>
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
                                {typeof parsed.required === 'object' ? (Array.isArray(parsed.required) ? parsed.required.map((r: string) => INVESTIGATION_MAP[r] || r).join(", ") : "—") : (INVESTIGATION_MAP[parsed.required] || parsed.required)}
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
}
