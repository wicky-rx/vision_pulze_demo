import React from 'react';
import BarcodeGenerator from '@/components/BarcodeGenerator';
import { getPatientAgeString, getPatientGenderString } from '@/lib/utils';

const normalizePrescription = (rx: any) => {
  if (!rx) return null;
  const norm = { ...rx };

  // Ensure nested structure
  if (!norm.distance) norm.distance = { OD: {}, OS: {} };
  if (!norm.near) norm.near = { OD: {}, OS: {} };
  if (!norm.distPD) norm.distPD = { OD: "", OS: "" };
  if (!norm.nearPD) norm.nearPD = { OD: "", OS: "" };

  const odFlat = norm.OD || {};
  const osFlat = norm.OS || {};

  // Map flat to nested
  if (odFlat.sphere !== undefined && !norm.distance.OD?.sphere) norm.distance.OD.sphere = odFlat.sphere;
  if (odFlat.cylinder !== undefined && !norm.distance.OD?.cylinder) norm.distance.OD.cylinder = odFlat.cylinder;
  if (odFlat.axis !== undefined && !norm.distance.OD?.axis) norm.distance.OD.axis = odFlat.axis;
  if (odFlat.bcva !== undefined && !norm.distance.OD?.vn) norm.distance.OD.vn = odFlat.bcva;
  if (odFlat.vn !== undefined && !norm.distance.OD?.vn) norm.distance.OD.vn = odFlat.vn;

  if (osFlat.sphere !== undefined && !norm.distance.OS?.sphere) norm.distance.OS.sphere = osFlat.sphere;
  if (osFlat.cylinder !== undefined && !norm.distance.OS?.cylinder) norm.distance.OS.cylinder = osFlat.cylinder;
  if (osFlat.axis !== undefined && !norm.distance.OS?.axis) norm.distance.OS.axis = osFlat.axis;
  if (osFlat.bcva !== undefined && !norm.distance.OS?.vn) norm.distance.OS.vn = osFlat.bcva;
  if (osFlat.vn !== undefined && !norm.distance.OS?.vn) norm.distance.OS.vn = osFlat.vn;

  // Near
  if (odFlat.nearDsph !== undefined && !norm.near.OD?.sphere) norm.near.OD.sphere = odFlat.nearDsph;
  if (odFlat.nearAdd !== undefined && !norm.near.OD?.sphere && odFlat.nearAdd) norm.near.OD.sphere = odFlat.nearAdd;
  if (odFlat.nearCylinder !== undefined && !norm.near.OD?.cylinder) norm.near.OD.cylinder = odFlat.nearCylinder;
  if (odFlat.nearAxis !== undefined && !norm.near.OD?.axis) norm.near.OD.axis = odFlat.nearAxis;
  if (odFlat.nearBcva !== undefined && !norm.near.OD?.vn) norm.near.OD.vn = odFlat.nearBcva;

  if (osFlat.nearDsph !== undefined && !norm.near.OS?.sphere) norm.near.OS.sphere = osFlat.nearDsph;
  if (osFlat.nearAdd !== undefined && !norm.near.OS?.sphere && osFlat.nearAdd) norm.near.OS.sphere = osFlat.nearAdd;
  if (osFlat.nearCylinder !== undefined && !norm.near.OS?.cylinder) norm.near.OS.cylinder = osFlat.nearCylinder;
  if (osFlat.nearAxis !== undefined && !norm.near.OS?.axis) norm.near.OS.axis = osFlat.nearAxis;
  if (osFlat.nearBcva !== undefined && !norm.near.OS?.vn) norm.near.OS.vn = osFlat.nearBcva;

  // Map nested to flat
  if (!norm.OD) norm.OD = {};
  if (!norm.OS) norm.OS = {};

  if (norm.distance?.OD?.sphere !== undefined && !norm.OD.sphere) norm.OD.sphere = norm.distance.OD.sphere;
  if (norm.distance?.OD?.cylinder !== undefined && !norm.OD.cylinder) norm.OD.cylinder = norm.distance.OD.cylinder;
  if (norm.distance?.OD?.axis !== undefined && !norm.OD.axis) norm.OD.axis = norm.distance.OD.axis;
  if (norm.distance?.OD?.vn !== undefined && !norm.OD.vn) norm.OD.vn = norm.distance.OD.vn;
  if (norm.distance?.OD?.vn !== undefined && !norm.OD.bcva) norm.OD.bcva = norm.distance.OD.vn;

  if (norm.distance?.OS?.sphere !== undefined && !norm.OS.sphere) norm.OS.sphere = norm.distance.OS.sphere;
  if (norm.distance?.OS?.cylinder !== undefined && !norm.OS.cylinder) norm.OS.cylinder = norm.distance.OS.cylinder;
  if (norm.distance?.OS?.axis !== undefined && !norm.OS.axis) norm.OS.axis = norm.distance.OS.axis;
  if (norm.distance?.OS?.vn !== undefined && !norm.OS.vn) norm.OS.vn = norm.distance.OS.vn;
  if (norm.distance?.OS?.vn !== undefined && !norm.OS.bcva) norm.OS.bcva = norm.distance.OS.vn;

  if (norm.near?.OD?.sphere !== undefined && !norm.OD.nearDsph) norm.OD.nearDsph = norm.near.OD.sphere;
  if (norm.near?.OD?.cylinder !== undefined && !norm.OD.nearCylinder) norm.OD.nearCylinder = norm.near.OD.cylinder;
  if (norm.near?.OD?.axis !== undefined && !norm.OD.nearAxis) norm.OD.nearAxis = norm.near.OD.axis;
  if (norm.near?.OD?.vn !== undefined && !norm.OD.nearBcva) norm.OD.nearBcva = norm.near.OD.vn;

  if (norm.near?.OS?.sphere !== undefined && !norm.OS.nearDsph) norm.OS.nearDsph = norm.near.OS.sphere;
  if (norm.near?.OS?.cylinder !== undefined && !norm.OS.nearCylinder) norm.OS.nearCylinder = norm.near.OS.cylinder;
  if (norm.near?.OS?.axis !== undefined && !norm.OS.nearAxis) norm.OS.nearAxis = norm.near.OS.axis;
  if (norm.near?.OS?.vn !== undefined && !norm.OS.nearBcva) norm.OS.nearBcva = norm.near.OS.vn;

  // DistPD / NearPD maps
  if (norm.distPD?.OD) {
    norm.OD.distPD = norm.distPD.OD;
  } else if (norm.OD?.distPD) {
    norm.distPD.OD = norm.OD.distPD;
  }
  if (norm.distPD?.OS) {
    norm.OS.distPD = norm.distPD.OS;
  } else if (norm.OS?.distPD) {
    norm.distPD.OS = norm.OS.distPD;
  }
  if (norm.nearPD?.OD) {
    norm.OD.nearPD = norm.nearPD.OD;
  } else if (norm.OD?.nearPD) {
    norm.nearPD.OD = norm.OD.nearPD;
  }
  if (norm.nearPD?.OS) {
    norm.OS.nearPD = norm.nearPD.OS;
  } else if (norm.OS?.nearPD) {
    norm.nearPD.OS = norm.OS.nearPD;
  }

  return norm;
};

export function preparePrintData(visit: any, patient?: any) {
  if (!visit) return null;
  const cons = visit.consultation || {};
  const pat = visit.patient || patient || {};

  const name = visit.patientName || pat.name || visit.name || "—";
  const ageString = getPatientAgeString(pat);
  const gender = getPatientGenderString(pat);
  const ageGender = `${ageString} / ${gender}`;

  // Glass Rx parsing
  const rawGlass = cons.finalGlassPrescription || visit.glassPrescription || cons.glassPrescription;
  const parsedGlass = typeof rawGlass === 'string' ? JSON.parse(rawGlass) : rawGlass;
  const glassRx = parsedGlass ? normalizePrescription({
    glassType: "SVN",
    lensDetails: "Plastic, White",
    instruction: "Constant Wear",
    ...parsedGlass
  }) : null;

  // Contact Lens Rx parsing
  const rawCL = cons.finalContactLensPrescription || visit.contactLensPrescription || cons.contactLensPrescription;
  const clRx = typeof rawCL === 'string' ? JSON.parse(rawCL) : rawCL || null;
  const normalizedCL = clRx ? normalizePrescription(clRx) : null;

  // Medications parsing
  const rawMeds = cons.medicalPrescription || cons.medications || visit.medicalPrescription;
  const medicationsList = typeof rawMeds === 'string' ? JSON.parse(rawMeds) : (rawMeds || []);

  const refData = visit.refraction || {};
  let parsedPgPower = null;
  try {
    const rawPgPower = refData.pgPower || (visit.refraction && (visit.refraction as any).pgPower);
    parsedPgPower = typeof rawPgPower === 'string' ? JSON.parse(rawPgPower) : rawPgPower;
  } catch (e) { }

  // Anterior Segment / Slit Lamp / EOM parsing
  let slitLamp: any = null;
  let eom: any = null;
  try {
    const rawAnt = cons.anteriorSegment || visit.anteriorSegment;
    const parsed = typeof rawAnt === 'string' ? JSON.parse(rawAnt) : rawAnt;
    if (parsed) {
      slitLamp = parsed.slitLamp || parsed;
      eom = parsed.eom;
    }
  } catch (e) { }

  // Posterior Segment / Fundus parsing
  let fundus: any = null;
  try {
    const rawFundus = cons.fundusObservation || visit.fundusObservation || cons.posteriorSegment?.fundusObservation;
    fundus = typeof rawFundus === 'string' ? JSON.parse(rawFundus) : rawFundus;
  } catch (e) { }

  let postSeg: any = null;
  try {
    const rawPost = cons.posteriorSegment || visit.posteriorSegment;
    postSeg = typeof rawPost === 'string' ? JSON.parse(rawPost) : rawPost;
  } catch (e) { }

  return {
    patientName: name,
    ageGender,
    co: pat.co || visit.co || pat.careOf || visit.careOf || null,
    mrNumber: pat.mrNumber || visit.mrNumber || "—",
    contactNumber: pat.contactNumber || visit.contactNumber || "—",
    date: visit.visitedAt ? new Date(visit.visitedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (visit.createdAt ? new Date(visit.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })),
    doctorName: cons.doctor?.name || cons.doctorName || visit.doctor?.name || visit.consultingDoctorName || "Dr. Gajendran MBBS DO",
    glassRx,
    clRx: normalizedCL,
    medications: medicationsList,
    refraction: {
      ...refData,
      pgPower: parsedPgPower || refData.pgPower
    },
    notes: cons.notes || visit.notes || "",
    posteriorSegment: postSeg || {},
    diagnosisText: cons.diagnosisText || visit.diagnosisText || "",
    slitLamp,
    eom,
    fundus
  };
}

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

const fmtLens = (val?: string) => {
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
const fmtVA = (val?: string) => val || "—";
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

export function SharedPrintLayout({ printData, printType }: { printData: any, printType: string }) {
  if (!printData) return null;

  if (printType === 'glass') {
    const rx = printData.glassRx;
    const cl = printData.clRx;

    const hasGlassRxData = !!(
      rx && (
        rx.distance?.OD?.sphere ||
        rx.distance?.OD?.cylinder ||
        rx.distance?.OD?.axis ||
        rx.distance?.OD?.vn ||
        rx.distance?.OS?.sphere ||
        rx.distance?.OS?.cylinder ||
        rx.distance?.OS?.axis ||
        rx.distance?.OS?.vn ||
        rx.near?.OD?.sphere ||
        rx.near?.OD?.cylinder ||
        rx.near?.OD?.axis ||
        rx.near?.OD?.vn ||
        rx.near?.OS?.sphere ||
        rx.near?.OS?.cylinder ||
        rx.near?.OS?.axis ||
        rx.near?.OS?.vn ||
        rx.distPD?.OD ||
        rx.distPD?.OS ||
        rx.nearPD?.OD ||
        rx.nearPD?.OS ||
        printData.refraction?.pd ||
        printData.refraction?.autoRef?.pd ||
        printData.refraction?.pdNear
      )
    );

    const hasContactLensRxData = !!(
      cl && (
        cl.distance?.OD?.sphere ||
        cl.distance?.OD?.cylinder ||
        cl.distance?.OD?.axis ||
        cl.distance?.OD?.vn ||
        cl.distance?.OS?.sphere ||
        cl.distance?.OS?.cylinder ||
        cl.distance?.OS?.axis ||
        cl.distance?.OS?.vn ||
        cl.near?.OD?.sphere ||
        cl.near?.OD?.cylinder ||
        cl.near?.OD?.axis ||
        cl.near?.OD?.vn ||
        cl.near?.OS?.sphere ||
        cl.near?.OS?.cylinder ||
        cl.near?.OS?.axis ||
        cl.near?.OS?.vn
      )
    );

    return (
      <div className="space-y-4 relative z-10 w-full bg-transparent text-black text-[9px] font-sans">
        {/* Logo Watermark */}
        <div className="print-watermark-container">
          <img
            src="https://res.cloudinary.com/autodapp/image/upload/v1775219907/VPN%20Eye%20Hospital%20Logo.png"
            alt="Watermark"
            className="print-watermark-img"
          />
        </div>
        {/* Hospital Header in the style of Vision Xpress */}
        <div className="border border-brand p-2.5 flex items-center justify-between gap-4 w-full mb-3 bg-transparent">
          <img
            src="https://res.cloudinary.com/autodapp/image/upload/v1775219907/VPN%20Eye%20Hospital%20Logo.png"
            alt="VPN Logo"
            className="h-10 w-auto object-contain shrink-0"
          />
          <div className="flex-1 text-center pr-10">
            <h1 className="text-sm font-black uppercase text-brand-hover tracking-wider">VPN EYE HOSPITAL</h1>
            <p className="text-[8px] font-bold text-gray-700">25, Neela West Street, Nagapattinam - 611001</p>
            <p className="text-[8px] font-medium text-gray-600">Phone: 04365-224000 | Mobile: 9324234343</p>
          </div>
        </div>
        <div className="text-center my-2">
          <span className="text-[10px] font-black uppercase tracking-widest bg-white px-3 py-0.5 border border-black">Glass Prescription</span>
        </div>

        {/* Outer report container with single orange border */}
        <div className="report-print-container space-y-4 p-4 border border-brand bg-transparent">
          {/* Aravind Style Header Info Block */}
          <div className="flex justify-between items-start border-b border-slate-300 pb-3">
            {/* Left Side: Patient details */}
            <div className="space-y-1 text-[8.5px] text-slate-800 text-left">
              <div className="flex items-center gap-1">
                <span className="font-bold text-gray-500 w-[80px]">Patient Name:</span>
                <span className="font-extrabold text-[9.5px] text-slate-900">{printData.patientName}</span>
              </div>
              {printData.co && (
                <div className="flex items-center gap-1">
                  <span className="font-bold text-gray-500 w-[80px]">C/O:</span>
                  <span className="font-extrabold text-slate-900">{printData.co}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <span className="font-bold text-gray-500 w-[80px]">Age / Gender:</span>
                <span className="font-extrabold text-slate-900">{printData.ageGender}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-gray-500 w-[80px]">Contact No:</span>
                <span className="font-extrabold text-slate-900">{printData.contactNumber || "—"}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-gray-500 w-[80px]">Consulting Dr:</span>
                <span className="font-extrabold text-slate-900">{printData.doctorName}</span>
              </div>
            </div>

            {/* Right Side: Barcode block */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex flex-col items-center p-1 bg-white border border-slate-200 shadow-sm">
                <BarcodeGenerator value={printData.mrNumber?.toString() || ""} height={28} barWidth={1} />
              </div>
              <div className="text-right text-[7.5px] text-gray-500">
                <div>Date: <span className="font-extrabold text-slate-900">{printData.date}</span></div>
              </div>
            </div>
          </div>

          {/* 1. Spectacles Rx Table */}
          {hasGlassRxData && (
            <div>
              <h3 className="text-[8.5px] font-black uppercase text-slate-700 tracking-wider mb-1.5 flex items-center gap-1.5 text-left">
                <span className="w-1.5 h-1.5 bg-brand rounded-full"></span>
                Spectacles Prescription (கண்ணாடி பரிந்துரைகள்)
              </h3>
              <table className="w-full border-collapse border border-slate-400 text-center text-[9px]">
                <thead>
                  <tr className="border-b border-slate-400 bg-slate-50">
                    <th rowSpan={2} className="border-r border-slate-400 p-1 w-[12%]"></th>
                    <th colSpan={4} className="border-r border-slate-400 p-1 font-black uppercase text-[8px]">RE (Right Eye)</th>
                    <th colSpan={4} className="p-1 font-black uppercase text-[8px]">LE (Left Eye)</th>
                  </tr>
                  <tr className="border-b border-slate-400 bg-slate-50/50 text-[8px]">
                    <th className="border-r border-slate-400 p-1 font-bold w-[11%]">SPH</th>
                    <th className="border-r border-slate-400 p-1 font-bold w-[11%]">CYL</th>
                    <th className="border-r border-slate-400 p-1 font-bold w-[11%]">AXIS</th>
                    <th className="border-r border-slate-400 p-1 font-bold w-[11%]">V/A</th>
                    <th className="border-r border-slate-400 p-1 font-bold w-[11%]">SPH</th>
                    <th className="border-r border-slate-400 p-1 font-bold w-[11%]">CYL</th>
                    <th className="border-r border-slate-400 p-1 font-bold w-[11%]">AXIS</th>
                    <th className="p-1 font-bold w-[11%]">V/A</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-400 text-[9px]">
                    <td className="border-r border-slate-400 p-1.5 font-bold text-left bg-slate-50">DV</td>
                    <td className="border-r border-slate-400 p-1.5 font-mono font-bold">{fmtLens(printData.glassRx?.distance?.OD?.sphere)}</td>
                    <td className="border-r border-slate-400 p-1.5 font-mono">{fmtLens(printData.glassRx?.distance?.OD?.cylinder)}</td>
                    <td className="border-r border-slate-400 p-1.5 font-mono">{printData.glassRx?.distance?.OD?.axis ? `${printData.glassRx.distance.OD.axis}°` : "—"}</td>
                    <td className="border-r border-slate-400 p-1.5 font-semibold">{printData.glassRx?.distance?.OD?.vn || printData.refraction?.acceptance?.distance?.OD?.vn || printData.refraction?.visualAcuity?.OD?.aided || "—"}</td>
                    <td className="border-r border-slate-400 p-1.5 font-mono font-bold">{fmtLens(printData.glassRx?.distance?.OS?.sphere)}</td>
                    <td className="border-r border-slate-400 p-1.5 font-mono">{fmtLens(printData.glassRx?.distance?.OS?.cylinder)}</td>
                    <td className="border-r border-slate-400 p-1.5 font-mono">{printData.glassRx?.distance?.OS?.axis ? `${printData.glassRx.distance.OS.axis}°` : "—"}</td>
                    <td className="p-1.5 font-semibold">{printData.glassRx?.distance?.OS?.vn || printData.refraction?.acceptance?.distance?.OS?.vn || printData.refraction?.visualAcuity?.OS?.aided || "—"}</td>
                  </tr>
                  <tr className="border-b border-slate-400 text-[9px]">
                    <td className="border-r border-slate-400 p-1.5 font-bold text-left bg-slate-50">NV</td>
                    <td className="border-r border-slate-400 p-1.5 font-mono font-bold">{fmtLens(printData.glassRx?.near?.OD?.sphere)}</td>
                    <td className="border-r border-slate-400 p-1.5 font-mono">{fmtLens(printData.glassRx?.near?.OD?.cylinder)}</td>
                    <td className="border-r border-slate-400 p-1.5 font-mono">{printData.glassRx?.near?.OD?.axis ? `${printData.glassRx.near.OD.axis}°` : "—"}</td>
                    <td className="border-r border-slate-400 p-1.5 font-semibold">{printData.glassRx?.near?.OD?.vn || printData.refraction?.acceptance?.near?.OD?.vn || printData.refraction?.visualAcuity?.OD?.nearVision || "—"}</td>
                    <td className="border-r border-slate-400 p-1.5 font-mono font-bold">{fmtLens(printData.glassRx?.near?.OS?.sphere)}</td>
                    <td className="border-r border-slate-400 p-1.5 font-mono">{fmtLens(printData.glassRx?.near?.OS?.cylinder)}</td>
                    <td className="border-r border-slate-400 p-1.5 font-mono">{printData.glassRx?.near?.OS?.axis ? `${printData.glassRx.near.OS.axis}°` : "—"}</td>
                    <td className="p-1.5 font-semibold">{printData.glassRx?.near?.OS?.vn || printData.refraction?.acceptance?.near?.OS?.vn || printData.refraction?.visualAcuity?.OS?.nearVision || "—"}</td>
                  </tr>
                  <tr className="border-b border-slate-400 text-[9px]">
                    <td className="border-r border-slate-400 p-1.5 font-bold text-left bg-slate-50">Dist PD</td>
                    <td colSpan={4} className="border-r border-slate-400 p-1.5 text-center font-semibold">{printData.glassRx?.distPD?.OD || printData.refraction?.pd || printData.refraction?.autoRef?.pd || "—"}{(printData.glassRx?.distPD?.OD || printData.refraction?.pd || printData.refraction?.autoRef?.pd) ? " mm" : ""}</td>
                    <td colSpan={4} className="p-1.5 text-center font-semibold">{printData.glassRx?.distPD?.OS || printData.refraction?.pd || printData.refraction?.autoRef?.pd || "—"}{(printData.glassRx?.distPD?.OS || printData.refraction?.pd || printData.refraction?.autoRef?.pd) ? " mm" : ""}</td>
                  </tr>
                  <tr className="text-[9px]">
                    <td className="border-r border-slate-400 p-1.5 font-bold text-left bg-slate-50">Near PD</td>
                    <td colSpan={4} className="border-r border-slate-400 p-1.5 text-center font-semibold">{printData.glassRx?.nearPD?.OD || printData.refraction?.pdNear || "—"}{(printData.glassRx?.nearPD?.OD || printData.refraction?.pdNear) ? " mm" : ""}</td>
                    <td colSpan={4} className="p-1.5 text-center font-semibold">{printData.glassRx?.nearPD?.OS || printData.refraction?.pdNear || "—"}{(printData.glassRx?.nearPD?.OS || printData.refraction?.pdNear) ? " mm" : ""}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* 2. Contact Lens Rx Table */}
          {hasContactLensRxData && (
            <div className={hasGlassRxData ? "mt-4" : ""}>
              <h3 className="text-[8.5px] font-black uppercase text-slate-700 tracking-wider mb-1.5 flex items-center gap-1.5 text-left">
                <span className="w-1.5 h-1.5 bg-brand rounded-full"></span>
                Contact Lens Prescription (காண்டாக்ட் லென்ஸ் பரிந்துரைகள்)
                {printData.clRx?.clType && Array.isArray(printData.clRx.clType) && printData.clRx.clType.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-[7px] font-bold bg-brand/10 text-brand border border-brand/20">
                    {printData.clRx.clType.join(", ")}
                  </span>
                )}
              </h3>
              <table className="w-full border-collapse border border-slate-400 text-center text-[9px]">
                <thead>
                  <tr className="border-b border-slate-400 bg-slate-50">
                    <th rowSpan={2} className="border-r border-slate-400 p-1 w-[12%]"></th>
                    <th colSpan={4} className="border-r border-slate-400 p-1 font-black uppercase text-[8px]">RE (Right Eye)</th>
                    <th colSpan={4} className="p-1 font-black uppercase text-[8px]">LE (Left Eye)</th>
                  </tr>
                  <tr className="border-b border-slate-400 bg-slate-50/50 text-[8px]">
                    <th className="border-r border-slate-400 p-1 font-bold w-[11%]">SPH</th>
                    <th className="border-r border-slate-400 p-1 font-bold w-[11%]">CYL</th>
                    <th className="border-r border-slate-400 p-1 font-bold w-[11%]">AXIS</th>
                    <th className="border-r border-slate-400 p-1 font-bold w-[11%]">V/A</th>
                    <th className="border-r border-slate-400 p-1 font-bold w-[11%]">SPH</th>
                    <th className="border-r border-slate-400 p-1 font-bold w-[11%]">CYL</th>
                    <th className="border-r border-slate-400 p-1 font-bold w-[11%]">AXIS</th>
                    <th className="p-1 font-bold w-[11%]">V/A</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-400 text-[9px]">
                    <td className="border-r border-slate-400 p-1.5 font-bold text-left bg-slate-50">DV</td>
                    <td className="border-r border-slate-400 p-1.5 font-mono font-bold">{fmtLens(printData.clRx?.distance?.OD?.sphere)}</td>
                    <td className="border-r border-slate-400 p-1.5 font-mono">{fmtLens(printData.clRx?.distance?.OD?.cylinder)}</td>
                    <td className="border-r border-slate-400 p-1.5 font-mono">{printData.clRx?.distance?.OD?.axis ? `${printData.clRx.distance.OD.axis}°` : "—"}</td>
                    <td className="border-r border-slate-400 p-1.5 font-semibold">{printData.clRx?.distance?.OD?.vn || printData.refraction?.acceptance?.distance?.OD?.vn || printData.refraction?.visualAcuity?.OD?.aided || "—"}</td>
                    <td className="border-r border-slate-400 p-1.5 font-mono font-bold">{fmtLens(printData.clRx?.distance?.OS?.sphere)}</td>
                    <td className="border-r border-slate-400 p-1.5 font-mono">{fmtLens(printData.clRx?.distance?.OS?.cylinder)}</td>
                    <td className="border-r border-slate-400 p-1.5 font-mono">{printData.clRx?.distance?.OS?.axis ? `${printData.clRx.distance.OS.axis}°` : "—"}</td>
                    <td className="p-1.5 font-semibold">{printData.clRx?.distance?.OS?.vn || printData.refraction?.acceptance?.distance?.OS?.vn || printData.refraction?.visualAcuity?.OS?.aided || "—"}</td>
                  </tr>
                  <tr className="text-[9px]">
                    <td className="border-r border-slate-400 p-1.5 font-bold text-left bg-slate-50">NV</td>
                    <td className="border-r border-slate-400 p-1.5 font-mono font-bold">{fmtLens(printData.clRx?.near?.OD?.sphere)}</td>
                    <td className="border-r border-slate-400 p-1.5 font-mono">{fmtLens(printData.clRx?.near?.OD?.cylinder)}</td>
                    <td className="border-r border-slate-400 p-1.5 font-mono">{printData.clRx?.near?.OD?.axis ? `${printData.clRx.near.OD.axis}°` : "—"}</td>
                    <td className="border-r border-slate-400 p-1.5 font-semibold">{printData.clRx?.near?.OD?.vn || printData.refraction?.acceptance?.near?.OD?.vn || printData.refraction?.visualAcuity?.OD?.nearVision || "—"}</td>
                    <td className="border-r border-slate-400 p-1.5 font-mono font-bold">{fmtLens(printData.clRx?.near?.OS?.sphere)}</td>
                    <td className="border-r border-slate-400 p-1.5 font-mono">{fmtLens(printData.clRx?.near?.OS?.cylinder)}</td>
                    <td className="border-r border-slate-400 p-1.5 font-mono">{printData.clRx?.near?.OS?.axis ? `${printData.clRx.near.OS.axis}°` : "—"}</td>
                    <td className="p-1.5 font-semibold">{printData.clRx?.near?.OS?.vn || printData.refraction?.acceptance?.near?.OS?.vn || printData.refraction?.visualAcuity?.OS?.nearVision || "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {!hasGlassRxData && !hasContactLensRxData && (
            <div className="text-center py-6 text-slate-400 font-medium text-[9px] border border-dashed border-slate-350">
              No prescription values entered. / பரிந்துரைக்கப்பட்ட அளவுகள் எதுவும் இல்லை.
            </div>
          )}

          {/* Details and Signatures Layout */}
          <div className="grid grid-cols-2 gap-6 my-4 text-[9px] leading-relaxed border-t border-slate-300 pt-3">
            {/* Left Side: Lens parameters */}
            <div className="space-y-2 border-r border-slate-300 pr-4 text-left">
              {hasGlassRxData && (
                <>
                  {(() => {
                    const glassType = printData.glassRx?.glassType || 'SVN';
                    const lensTypesOpts = [
                      { label: "Single Vision", active: glassType === 'SVN' },
                      { label: "Bifocals", active: glassType === 'KBF' },
                      { label: "Progressive", active: glassType === 'PAL' },
                      { label: "Double D Bifocal", active: glassType === 'DBF' },
                      { label: "Reading Glass", active: glassType === 'READING' }
                    ];
                    return (
                      <div className="flex gap-2 items-center">
                        <span className="font-bold w-[60px] text-slate-700">Lens types:</span>
                        <div className="flex gap-1.5">
                          {lensTypesOpts.map((opt, i) => (
                            <div key={i} className="flex flex-col items-center gap-0.5">
                              <div
                                className="flex items-center justify-center w-[38px] h-[38px] rounded-full border bg-white"
                                style={opt.active
                                  ? { borderColor: '#ea580c', borderWidth: 2 }
                                  : { borderColor: '#cbd5e1' }}
                              >
                                <span className={`text-[6px] text-center font-bold px-0.5 select-none leading-none ${opt.active ? 'text-brand-hover font-extrabold' : 'text-slate-400'}`}>
                                  {opt.label}
                                </span>
                              </div>
                              {/* Tick mark below circle — visible only for selected */}
                              <span className={`text-[12px] font-black leading-none ${opt.active ? 'text-brand' : 'text-transparent'}`}>✓</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  <div><strong>Instruction:</strong> {printData.glassRx?.instruction || "Constant Wear"}</div>
                </>
              )}
              <div><strong>Remarks:</strong> {printData.notes || "For Regular Use"}</div>
            </div>

            {/* Right Side: Doctor and Refractionist Info */}
            <div className="flex flex-col justify-between pl-2">
              <div className="space-y-4">
                <div className="flex flex-col text-right">
                  <span className="text-[8px] uppercase text-slate-500 font-bold">Ophthalmologist</span>
                  <span className="font-black text-slate-800 text-[10px]">{printData.doctorName}</span>
                  <div className="mt-1 border-t border-dotted border-slate-400 w-36 ml-auto pt-0.5 text-[7px] text-slate-400">Signature</div>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[8px] uppercase text-slate-500 font-bold">Refraction done by</span>
                  <span className="font-black text-slate-800 text-[9px]">{printData.refraction?.optometristName || printData.refraction?.refractionist?.name || "Sr. Muppudathi K S"}</span>
                  <div className="mt-1 border-t border-dotted border-slate-400 w-36 ml-auto pt-0.5 text-[7px] text-slate-400">Signature</div>
                </div>
              </div>
            </div>
          </div>

          {/* Glass Handling Tips */}
          <div className="border-t border-slate-300 pt-2 mt-4 text-left">
            <h3 className="font-bold text-[9px] uppercase mb-1 text-slate-700">Glass Handling Tips / கண்ணாடி கையாளும் குறிப்புகள்:</h3>
            <div className="grid grid-cols-2 gap-4 text-[7.5px] leading-tight">
              <div className="space-y-1.5 text-slate-600">
                <p><strong>1. Use the spectacles after washing with normal water.</strong><br /><span className="text-slate-400">தண்ணீரில் கழுவிய பின் கண்ணாடியை அணிய வேண்டும்.</span></p>
                <p><strong>2. Use only a soft cloth for cleaning spectacles.</strong><br /><span className="text-slate-400">மென்மையான துணி கொண்டு கண்ணாடியை சுத்தம் செய்ய வேண்டும்.</span></p>
                <p><strong>3. Store the spectacles in the box when not in use.</strong><br /><span className="text-slate-400">கண்ணாடியைக் கழற்றிய பின் அதற்குரிய பெட்டியில் வைக்கவும்.</span></p>
                <p><strong>4. Spectacles with coated lenses should not be kept on the car dashboard.</strong><br /><span className="text-slate-400">வெப்பநிலை அதிகமாக உள்ள இடத்தில் கண்ணாடியை வைப்பதைத் தவிர்க்கவும் (கார் Dashboard, சமையலறை).</span></p>
                <p><strong>5. Change the nose pad and check the frame alignment every 3 months.</strong><br /><span className="text-slate-400">மூன்று மாதங்களுக்கு ஒருமுறை மூக்குப்பட்டையை மாற்ற வேண்டும், கண்ணாடி நிலையை சரிபார்க்க வேண்டும்.</span></p>
              </div>
              <div className="space-y-1.5 text-slate-600">
                <p><strong>6. Avoid contact with any chemical solutions for special coated lenses.</strong><br /><span className="text-slate-400">கோட்டிங் செய்த கண்ணாடிகளில் ரசாயன திரவங்கள் படக்கூடாது.</span></p>
                <p><strong>7. Wear and remove the spectacles with both hands.</strong><br /><span className="text-slate-400">கண் கண்ணாடியை இரண்டு கைகளால் அணிந்து இரண்டு கைகளால் கழற்ற வேண்டும்.</span></p>
                <p><strong>8. Change your spectacles if there is any variation in the power.</strong><br /><span className="text-slate-400">பார்வையில் மாற்றம் இருந்தால் கண்ணாடியை மாற்ற வேண்டும்.</span></p>
                <p><strong>9. Do not use the spectacles with scratches.</strong><br /><span className="text-slate-400">கீறல் விழுந்த கண்ணாடியை உபயோகப்படுத்தாதீர்கள்.</span></p>
                <p><strong>10. Adapt to first-time glass usage or new lenses takes time.</strong><br /><span className="text-slate-400">முதல் முறை கண்ணாடி அணியும் போதும் அல்லது புதிய லென்ஸ்களைப் பயன்படுத்தும் போதும் நம் கண்களோடு பொருந்த சிறிது காலம் தேவைப்படும்.</span></p>
              </div>
            </div>
            <p className="text-[7.5px] font-bold mt-2 border-t border-dotted border-slate-300 pt-1.5 text-center text-slate-500">
              Please note: Spectacle power should be reviewed at least once a year for adults and once in 6 months for children (below 15 years).
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (printType === 'medical') {
    return (
      <div className="space-y-4 relative z-10 w-full bg-transparent text-black text-[9px] font-sans">
        {/* Logo Watermark */}
        <div className="print-watermark-container">
          <img
            src="https://res.cloudinary.com/autodapp/image/upload/v1775219907/VPN%20Eye%20Hospital%20Logo.png"
            alt="Watermark"
            className="print-watermark-img"
          />
        </div>
        <div className="border border-brand p-2.5 flex items-center justify-between gap-4 w-full mb-3 bg-transparent">
          <img
            src="https://res.cloudinary.com/autodapp/image/upload/v1775219907/VPN%20Eye%20Hospital%20Logo.png"
            alt="VPN Logo"
            className="h-10 w-auto object-contain shrink-0"
          />
          <div className="flex-1 text-center pr-10">
            <h1 className="text-sm font-black uppercase text-brand-hover tracking-wider">VPN EYE HOSPITAL</h1>
            <p className="text-[8px] font-bold text-gray-700">25, Neela West Street, Nagapattinam - 611001</p>
            <p className="text-[8px] font-medium text-gray-600">Phone: 04365-224000 | Mobile: 9324234343</p>
          </div>
        </div>
        <div className="text-center my-2">
          <span className="text-[10px] font-black uppercase tracking-widest bg-white px-3 py-0.5 border border-black">Medical Prescription</span>
        </div>

        <div className="report-print-container space-y-4 p-4 border border-brand bg-transparent">
          <div className="flex justify-between items-start border-b border-slate-300 pb-3">
            <div className="space-y-1 text-left">
              <p className="text-[10px]"><strong className="text-gray-500">Name:</strong> <span className="font-extrabold text-slate-900">{printData.patientName}</span></p>
              <p className="text-[10px]"><strong className="text-gray-500">Age/Gender:</strong> <span className="font-extrabold text-slate-900">{printData.ageGender}</span></p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[10px]"><strong className="text-gray-500">Date:</strong> <span className="font-extrabold text-slate-900">{printData.date}</span></p>
              <div className="mt-1 flex justify-end">
                <BarcodeGenerator value={printData.mrNumber?.toString() || ""} height={20} barWidth={1} />
              </div>
            </div>
          </div>

          <div className="py-2 min-h-[300px]">
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-left">
                  <th className="p-2 font-bold">Medicine</th>
                  <th className="p-2 font-bold">Dose/Route</th>
                  <th className="p-2 font-bold">Frequency</th>
                  <th className="p-2 font-bold">Duration</th>
                  <th className="p-2 font-bold">Instruction</th>
                </tr>
              </thead>
              <tbody>
                {printData.medications?.map((m: any, idx: number) => (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="p-2 font-bold">{m.drug || m.name || "—"}</td>
                    <td className="p-2">{m.dosage || m.dose || "—"} ({m.route || "Topical"})</td>
                    <td className="p-2">{m.frequency || "—"}</td>
                    <td className="p-2">{m.duration || "—"}</td>
                    <td className="p-2">{m.route?.toLowerCase() === "oral" ? (m.foodRelation || "After Food") : (m.eye || "Both")}</td>
                  </tr>
                ))}
                {(!printData.medications || printData.medications.length === 0) && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center italic text-gray-500">No medications prescribed.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-end pt-8 mt-auto">
            <div className="w-1/2"></div>
            <div className="text-center w-1/3">
              <div className="border-b border-black w-3/4 mx-auto mb-1"></div>
              <p className="text-[9px] font-bold uppercase">{printData.doctorName}</p>
              <p className="text-[7px] text-gray-500">Consultant Signature</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ALL or DOCTOR REPORT
  const glassRx = printData.glassRx;
  const f = printData.fundus || printData.posteriorSegment;
  const slitLamp = printData.slitLamp || printData.anteriorSegment?.slitLamp || printData.anteriorSegment;
  const eom = printData.eom || printData.anteriorSegment?.eom;

  const hasDiagnosis = printType === 'refraction' ? false : !!printData.diagnosisText;
  const hasRefraction = !!printData.refraction;
  const hasAnterior = printType === 'refraction' ? false : !!(slitLamp && Object.keys(slitLamp).some(k => k !== 'dilation' && k !== 'gonioscopy' && k !== 'synaptophore' && (slitLamp[k]?.OD || slitLamp[k]?.OS)) || (eom && (eom.OD || eom.OS)));
  const hasPosterior = printType === 'refraction' ? false : !!(f && Object.keys(f).some(k => k !== 'vitreous' && k !== 'retina' && k !== 'disc' ? false : (f[k]?.OD || f[k]?.OS)));
  const hasPrescriptions = printType === 'refraction' ? false : !!(printData.medications && printData.medications.length > 0);
  const hasDistance = glassRx && ['OD', 'OS'].some(eye => glassRx.distance?.[eye]?.sphere || glassRx.distance?.[eye]?.cylinder || glassRx.distance?.[eye]?.axis);
  const hasNear = glassRx && ['OD', 'OS'].some(eye => glassRx.near?.[eye]?.sphere || glassRx.near?.[eye]?.cylinder || glassRx.near?.[eye]?.axis);
  const hasGlassRx = printType === 'refraction' ? false : !!(hasDistance || hasNear);

  const postSeg = printData.posteriorSegment;
  const required = postSeg?.required && postSeg.required !== "Nothing selected" ? postSeg.required : null;
  const adminInstructions = postSeg?.adminInstructions && postSeg.adminInstructions !== "Standard administration" ? postSeg.adminInstructions : null;
  const hasRemarks = printType === 'refraction' ? false : !!(printData.notes || required || adminInstructions);

  let index = 1;
  const secDiagnosisNum = hasDiagnosis ? index++ : 0;
  const secRefractionNum = hasRefraction ? index++ : 0;
  const secAnteriorNum = hasAnterior ? index++ : 0;
  const secPosteriorNum = hasPosterior ? index++ : 0;
  const secPrescriptionsNum = hasPrescriptions ? index++ : 0;
  const secGlassRxNum = hasGlassRx ? index++ : 0;
  const secRemarksNum = hasRemarks ? index++ : 0;

  return (
    <div className="space-y-4 relative z-10 w-full bg-transparent text-black text-[9px] font-sans">
      {/* Logo Watermark */}
      <div className="print-watermark-container">
        <img
          src="https://res.cloudinary.com/autodapp/image/upload/v1775219907/VPN%20Eye%20Hospital%20Logo.png"
          alt="Watermark"
          className="print-watermark-img"
        />
      </div>
      <div className="border border-brand p-2.5 flex items-center justify-between gap-4 w-full mb-3 bg-transparent">
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
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <div className="p-1 bg-white border border-slate-200 shadow-sm">
            <BarcodeGenerator value={printData.mrNumber?.toString() || ""} height={24} barWidth={1} />
          </div>
          <span className="text-[7px] font-extrabold text-slate-900">MR-{printData.mrNumber}</span>
        </div>
      </div>
      <div className="text-center my-2">
        <span className="text-[10px] font-black uppercase tracking-widest bg-white px-3 py-0.5 border border-black">
          {printType === 'refraction' ? 'Optometry Summary' : 'Clinical Consultation Report'}
        </span>
      </div>

      <div className="report-print-container space-y-4">
        <table className="w-full text-[8.5px]">
          <tbody>
            <tr>
              <td className="p-1 font-bold bg-gray-50 w-[20%]">Patient Name:</td>
              <td className="p-1 w-[30%]"><span className="font-extrabold text-slate-900">{printData.patientName}</span></td>
              <td className="p-1 font-bold bg-gray-50 w-[20%]">Age / Gender:</td>
              <td className="p-1 w-[30%]"><span className="font-extrabold text-slate-900">{printData.ageGender}</span></td>
            </tr>
            <tr>
              <td className="p-1 font-bold bg-gray-50">MR Number:</td>
              <td className="p-1"><span className="font-extrabold text-slate-900">MR-{printData.mrNumber}</span></td>
              <td className="p-1 font-bold bg-gray-50">Contact Number:</td>
              <td className="p-1"><span className="font-extrabold text-slate-900">{printData.contactNumber || "—"}</span></td>
            </tr>
            <tr>
              <td className="p-1 font-bold bg-gray-50">Consulting Doctor:</td>
              <td className="p-1"><span className="font-extrabold text-slate-900">{printData.doctorName}</span></td>
              <td className="p-1 font-bold bg-gray-50">Visit Date:</td>
              <td className="p-1"><span className="font-extrabold text-slate-900">{printData.date}</span></td>
            </tr>
          </tbody>
        </table>

        {hasDiagnosis && (
          <div className="space-y-1">
            <h2 className="text-[9px] font-bold uppercase border-b border-black pb-0.5">{secDiagnosisNum}. Clinical Diagnosis</h2>
            {(() => {
              const parts = printData.diagnosisText.split(' | ') || [];
              const od = parts[0]?.replace('OD: ', '') || "—";
              const os = parts.length > 1 ? parts[1].replace('OS: ', '') : "—";
              return (
                <table className="w-full border-collapse border border-black text-[8px]">
                  <thead>
                    <tr className="bg-gray-100 border-b border-black text-center font-bold">
                      <th className="border-r border-black p-0.5 w-[50%]">OD (Right Eye)</th>
                      <th className="p-0.5 w-[50%]">OS (Left Eye)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border-r border-black p-1 text-center font-bold text-red-700">{od}</td>
                      <td className="p-1 text-center font-bold text-red-700">{os}</td>
                    </tr>
                  </tbody>
                </table>
              );
            })()}
          </div>
        )}

        {hasRefraction && (() => {
          const rd = printData.refraction;
          let subIdx = 1;
          return (
            <div className="space-y-3">
              <h2 className="text-[9px] font-bold uppercase border-b border-black pb-0.5">
                {printType === 'refraction' ? "" : `${secRefractionNum}. `}Optometry & Refraction
              </h2>

              {rd.visualAcuity && (
                <div className="space-y-1">
                  <span className="text-[7.5px] font-bold uppercase text-gray-500">
                    {printType === 'refraction' ? `${subIdx++}. ` : ""}Visual Acuity
                  </span>
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

              {(() => {
                const pg = rd.pgPower || {};
                const glass = pg.glass || {};
                const contact = pg.contact || {};
                const hasGlass = ['OD', 'OS'].some(eye => glass[eye]?.sphere1 || glass[eye]?.cylinder1 || glass[eye]?.axis1 || glass[eye]?.add || glass[eye]?.vn1 || glass[eye]?.vnNear1);
                const hasContact = ['OD', 'OS'].some(eye => contact[eye]?.sphere1 || contact[eye]?.cylinder1 || contact[eye]?.axis1 || contact[eye]?.add || contact[eye]?.vn1 || contact[eye]?.vnNear1);
                const notes = pg.notes || "";

                if (!hasGlass && !hasContact && !notes) return null;

                return (
                  <div className="grid grid-cols-2 gap-4 my-2">
                    {hasGlass && (
                      <div className="space-y-1">
                        <span className="text-[7.5px] font-bold uppercase text-gray-500">
                          {printType === 'refraction' ? `${subIdx++}. ` : ""}Previous Spectacles Rx {glass.glassType ? `(${glass.glassType})` : ""}
                        </span>
                        <table className="w-full border-collapse border border-black text-[8px]">
                          <thead>
                            <tr className="bg-gray-100 border-b border-black text-center font-bold">
                              <th className="border-r border-black p-0.5 text-left w-[35px]">Eye</th>
                              <th className="border-r border-black p-0.5">SPH</th>
                              <th className="border-r border-black p-0.5">CYL</th>
                              <th className="border-r border-black p-0.5">AXIS</th>
                              <th className="border-r border-black p-0.5">ADD</th>
                              <th className="border-r border-black p-0.5">VA(DV)</th>
                              <th className="p-0.5">VA(NV)</th>
                            </tr>
                          </thead>
                          <tbody className="text-center">
                            {['OD', 'OS'].map((eye) => (
                              <tr key={eye} className="border-b border-black last:border-0">
                                <td className="border-r border-black p-0.5 text-left font-semibold">{eye}</td>
                                <td className="border-r border-black p-0.5">{fmtLens(glass[eye]?.sphere1)}</td>
                                <td className="border-r border-black p-0.5">{fmtLens(glass[eye]?.cylinder1)}</td>
                                <td className="border-r border-black p-0.5">{glass[eye]?.axis1 ? `${glass[eye].axis1}°` : "—"}</td>
                                <td className="border-r border-black p-0.5">{fmtLens(glass[eye]?.add)}</td>
                                <td className="border-r border-black p-0.5">{fmtVA(glass[eye]?.vn1)}</td>
                                <td className="p-0.5">{fmtVA(glass[eye]?.vnNear1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {hasContact && (
                      <div className="space-y-1">
                        <span className="text-[7.5px] font-bold uppercase text-gray-500">
                          {printType === 'refraction' ? `${subIdx++}. ` : ""}Previous Contact Lens Rx {contact.clType ? `(${Array.isArray(contact.clType) ? contact.clType.join(', ') : contact.clType})` : ""}
                        </span>
                        <table className="w-full border-collapse border border-black text-[8px]">
                          <thead>
                            <tr className="bg-gray-100 border-b border-black text-center font-bold">
                              <th className="border-r border-black p-0.5 text-left w-[35px]">Eye</th>
                              <th className="border-r border-black p-0.5">SPH</th>
                              <th className="border-r border-black p-0.5">CYL</th>
                              <th className="border-r border-black p-0.5">AXIS</th>
                              <th className="border-r border-black p-0.5">ADD</th>
                              <th className="border-r border-black p-0.5">VA(DV)</th>
                              <th className="p-0.5">VA(NV)</th>
                            </tr>
                          </thead>
                          <tbody className="text-center">
                            {['OD', 'OS'].map((eye) => (
                              <tr key={eye} className="border-b border-black last:border-0">
                                <td className="border-r border-black p-0.5 text-left font-semibold">{eye}</td>
                                <td className="border-r border-black p-0.5">{fmtLens(contact[eye]?.sphere1)}</td>
                                <td className="border-r border-black p-0.5">{fmtLens(contact[eye]?.cylinder1)}</td>
                                <td className="border-r border-black p-0.5">{contact[eye]?.axis1 ? `${contact[eye].axis1}°` : "—"}</td>
                                <td className="border-r border-black p-0.5">{fmtLens(contact[eye]?.add)}</td>
                                <td className="border-r border-black p-0.5">{fmtVA(contact[eye]?.vn1)}</td>
                                <td className="p-0.5">{fmtVA(contact[eye]?.vnNear1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {notes && (
                      <div className="col-span-2 text-[7.5px] border-t border-gray-300 pt-1 mt-0.5">
                        <strong>Previous Rx Notes:</strong> {notes}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[7.5px] font-bold uppercase text-gray-500">
                    {printType === 'refraction' ? `${subIdx++}. ` : ""}Objective Measurements
                  </span>
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
                          {rd.autoRef?.OS?.sphere1 ? `${fmtLens(rd.autoRef.OS.sphere1)} / ${fmtLens(rd.autoRef.OS.cylinder1)} × ${rd.autoRef.OS.axis1}°` : "—"}
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

                <div className="space-y-1">
                  <span className="text-[7.5px] font-bold uppercase text-gray-500">
                    {printType === 'refraction' ? `${subIdx++}. ` : ""}Subjective Acceptance
                  </span>
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

              {/* Tonometry & Ophthalmic Matrix Grid */}
              {(() => {
                const hasNct = !!(rd.tonometryDetails?.nct?.OD?.mean?.length || rd.tonometryDetails?.nct?.OS?.mean?.length || rd.tonometryDetails?.nct?.OD?.iop || rd.tonometryDetails?.nct?.OS?.iop);
                const hasGat = !!(rd.tonometryDetails?.gat?.OD?.reading?.length || rd.tonometryDetails?.gat?.OS?.reading?.length || rd.tonometryDetails?.gat?.OD?.iop || rd.tonometryDetails?.gat?.OS?.iop);
                const hasSchiotz = !!(rd.tonometryDetails?.schiotz?.OD?.reading || rd.tonometryDetails?.schiotz?.OS?.reading);
                const hasTonometry = hasNct || hasGat || hasSchiotz;

                const hasIshihara = !!(rd.ishiharaTest?.status && rd.ishiharaTest.status !== "NOT TESTED");
                const hasSchirmer = !!(rd.schirmerTest?.OD || rd.schirmerTest?.OS);
                const hasKera = !!(rd.keratometry?.OD || rd.keratometry?.OS);
                const hasOphthalmic = hasIshihara || hasSchirmer || hasKera;

                if (!hasTonometry && !hasOphthalmic) return null;

                return (
                  <div className="grid grid-cols-2 gap-4 my-3">
                    {/* Tonometry Table */}
                    {hasTonometry ? (
                      <div className="space-y-1">
                        <span className="text-[7.5px] font-bold uppercase text-gray-500">
                          {printType === 'refraction' ? `${subIdx++}. ` : ""}Tonometry (mmHg)
                        </span>
                        <table className="w-full border-collapse border border-black text-[8px]">
                          <thead>
                            <tr className="bg-gray-100 border-b border-black text-center font-bold">
                              <th className="border-r border-black p-0.5 text-left w-[120px]">Method</th>
                              <th className="border-r border-black p-0.5">OD (Right)</th>
                              <th className="p-0.5">OS (Left)</th>
                            </tr>
                          </thead>
                          <tbody className="text-center">
                            <tr className="border-b border-black">
                              <td className="border-r border-black p-0.5 text-left font-semibold">NCT (Air-Puff)</td>
                              <td className="border-r border-black p-0.5">
                                {(() => {
                                  const vals = Array.isArray(rd.tonometryDetails?.nct?.OD?.mean) ? rd.tonometryDetails.nct.OD.mean : (rd.tonometryDetails?.nct?.OD?.mean ? [rd.tonometryDetails.nct.OD.mean] : []);
                                  const meanVal = vals.length > 0 ? vals.join(", ") : "—";
                                  const iopVal = rd.tonometryDetails?.nct?.OD?.iop;
                                  return iopVal ? `${meanVal} (IOP: ${iopVal})` : meanVal;
                                })()}
                              </td>
                              <td className="p-0.5">
                                {(() => {
                                  const vals = Array.isArray(rd.tonometryDetails?.nct?.OS?.mean) ? rd.tonometryDetails.nct.OS.mean : (rd.tonometryDetails?.nct?.OS?.mean ? [rd.tonometryDetails.nct.OS.mean] : []);
                                  const meanVal = vals.length > 0 ? vals.join(", ") : "—";
                                  const iopVal = rd.tonometryDetails?.nct?.OS?.iop;
                                  return iopVal ? `${meanVal} (IOP: ${iopVal})` : meanVal;
                                })()}
                              </td>
                            </tr>
                            <tr className="border-b border-black">
                              <td className="border-r border-black p-0.5 text-left font-semibold">GAT (Goldmann)</td>
                              <td className="border-r border-black p-0.5">
                                {(() => {
                                  const vals = Array.isArray(rd.tonometryDetails?.gat?.OD?.reading) ? rd.tonometryDetails.gat.OD.reading : (rd.tonometryDetails?.gat?.OD?.reading ? [rd.tonometryDetails.gat.OD.reading] : []);
                                  const readingVal = vals.length > 0 ? vals.join(", ") : "—";
                                  const iopVal = rd.tonometryDetails?.gat?.OD?.iop;
                                  return iopVal ? `${readingVal} (IOP: ${iopVal})` : readingVal;
                                })()}
                              </td>
                              <td className="p-0.5">
                                {(() => {
                                  const vals = Array.isArray(rd.tonometryDetails?.gat?.OS?.reading) ? rd.tonometryDetails.gat.OS.reading : (rd.tonometryDetails?.gat?.OS?.reading ? [rd.tonometryDetails.gat.OS.reading] : []);
                                  const readingVal = vals.length > 0 ? vals.join(", ") : "—";
                                  const iopVal = rd.tonometryDetails?.gat?.OS?.iop;
                                  return iopVal ? `${readingVal} (IOP: ${iopVal})` : readingVal;
                                })()}
                              </td>
                            </tr>
                            <tr>
                              <td className="border-r border-black p-0.5 text-left font-semibold">Schiotz Indentation</td>
                              <td className="border-r border-black p-0.5">
                                {rd.tonometryDetails?.schiotz?.OD?.reading ? (
                                  `${rd.tonometryDetails.schiotz.OD.reading} / ${rd.tonometryDetails.schiotz.OD.weight}g` +
                                  (rd.tonometryDetails.schiotz.OD.iop ? ` (${rd.tonometryDetails.schiotz.OD.iop} mmHg)` : "")
                                ) : "—"}
                              </td>
                              <td className="p-0.5">
                                {rd.tonometryDetails?.schiotz?.OS?.reading ? (
                                  `${rd.tonometryDetails.schiotz.OS.reading} / ${rd.tonometryDetails.schiotz.OS.weight}g` +
                                  (rd.tonometryDetails.schiotz.OS.iop ? ` (${rd.tonometryDetails.schiotz.OS.iop} mmHg)` : "")
                                ) : "—"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : <div />}

                    {/* Ophthalmic Tests Table */}
                    {hasOphthalmic ? (
                      <div className="space-y-1">
                        <span className="text-[7.5px] font-bold uppercase text-gray-500">
                          {printType === 'refraction' ? `${subIdx++}. ` : ""}Ophthalmic & Diagnostic Matrix
                        </span>
                        <table className="w-full border-collapse border border-black text-[8px]">
                          <thead>
                            <tr className="bg-gray-100 border-b border-black text-center font-bold">
                              <th className="border-r border-black p-0.5 text-left w-[120px]">Parameter</th>
                              <th className="border-r border-black p-0.5">OD (Right)</th>
                              <th className="p-0.5">OS (Left)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {hasKera && (
                              <tr className="border-b border-black last:border-b-0">
                                <td className="border-r border-black p-0.5 text-left font-semibold">Keratometry Matrix</td>
                                <td className="border-r border-black p-0.5 text-center">
                                  {(() => {
                                    const val = rd.keratometry?.OD;
                                    if (val && typeof val === 'object' && !Array.isArray(val)) return "—";
                                    return Array.isArray(val) ? val.join(", ") : (val || "—");
                                  })()}
                                </td>
                                <td className="p-0.5 text-center">
                                  {(() => {
                                    const val = rd.keratometry?.OS;
                                    if (val && typeof val === 'object' && !Array.isArray(val)) return "—";
                                    return Array.isArray(val) ? val.join(", ") : (val || "—");
                                  })()}
                                </td>
                              </tr>
                            )}
                            {hasSchirmer && (
                              <tr className="border-b border-black last:border-b-0">
                                <td className="border-r border-black p-0.5 text-left font-semibold">Schirmer's Tear Test</td>
                                <td className="border-r border-black p-0.5 text-center">{rd.schirmerTest?.OD ? `${rd.schirmerTest.OD} mm` : "—"}</td>
                                <td className="p-0.5 text-center">{rd.schirmerTest?.OS ? `${rd.schirmerTest.OS} mm` : "—"}</td>
                              </tr>
                            )}
                            {hasIshihara && (
                              <tr className="last:border-b-0">
                                <td className="border-r border-black p-0.5 text-left font-semibold">Color Vision (Ishihara)</td>
                                <td colSpan={2} className="p-0.5 text-center">
                                  <span className="font-bold">
                                    {rd.ishiharaTest?.status || "—"}
                                    {rd.ishiharaTest?.notes ? ` (${rd.ishiharaTest.notes})` : ""}
                                  </span>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : <div />}
                  </div>
                );
              })()}

              <div className="space-y-1">
                <span className="text-[7.5px] font-bold uppercase text-gray-500">
                  {printType === 'refraction' ? `${subIdx++}. ` : ""}Refinement, Binocular & Specialized Tests
                </span>
                <table className="w-full border-collapse border border-black text-[8px]">
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="border-r border-black p-0.5 text-left font-semibold w-[120px]">Binocular Functionality</td>
                      <td className="p-0.5 text-left pl-1">
                        {rd.binocular === "eom" ? "EOM Full" :
                          rd.binocular === "worth_four_dot" ? "Worth 4-Dot" :
                            rd.binocular === "stereopsis" ? "Stereopsis" :
                              rd.binocular === "prism" ? "Prism Cover" :
                                rd.binocular === "diplopia" ? "Diplopia Charting" :
                                  rd.binocular || "—"}
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="border-r border-black p-0.5 text-left font-semibold w-[120px]">Duo-Chrome Verification</td>
                      <td className="p-0.5 text-left pl-1">
                        OD: {rd.refining?.duochrome?.OD || "—"} | OS: {rd.refining?.duochrome?.OS || "—"}
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="border-r border-black p-0.5 text-left font-semibold w-[120px]">JCC Refining Notes</td>
                      <td className="p-0.5 text-left pl-1 italic">
                        {rd.jcc || "—"}
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="border-r border-black p-0.5 text-left font-semibold w-[120px]">Amsler Grid Test</td>
                      <td className="p-0.5 text-left pl-1">
                        {rd.amslerGrid || "—"}
                      </td>
                    </tr>
                    <tr>
                      <td className="border-r border-black p-0.5 text-left font-semibold w-[120px]">Contrast Sensitivity</td>
                      <td className="p-0.5 text-left pl-1">
                        {rd.contrastSensitivity || "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-2 gap-4">
          {hasAnterior && (() => {
            const activeKeys = slitLamp ? Object.keys(slitLamp).filter(key => key !== 'dilation' && key !== 'gonioscopy' && key !== 'synaptophore' && (slitLamp[key]?.OD || slitLamp[key]?.OS)) : [];
            return (
              <div className="space-y-1">
                <h2 className="text-[9px] font-bold uppercase border-b border-black pb-0.5">{secAnteriorNum}. Anterior Segment Findings</h2>
                <table className="w-full border-collapse border border-black text-[8px]">
                  <thead>
                    <tr className="bg-gray-100 border-b border-black text-center font-bold">
                      <th className="border-r border-black p-0.5 text-left w-[120px]">Parameter</th>
                      <th className="border-r border-black p-0.5">OD (Right Eye)</th>
                      <th className="p-0.5">OS (Left Eye)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeKeys.map((key) => {
                      const valOD = slitLamp[key]?.OD;
                      const valOS = slitLamp[key]?.OS;
                      return (
                        <tr key={key} className="border-b border-black last:border-b-0">
                          <td className="border-r border-black p-0.5 text-left font-semibold uppercase text-[7px]">{key}</td>
                          <td className="border-r border-black p-0.5 text-center">{formatValue(valOD)}</td>
                          <td className="p-0.5 text-center">{formatValue(valOS)}</td>
                        </tr>
                      );
                    })}
                    {slitLamp && slitLamp.dilation && (
                      <tr className="border-b border-black last:border-b-0">
                        <td className="border-r border-black p-0.5 text-left font-semibold uppercase text-[7px]">Pupillary Dilation</td>
                        <td className="border-r border-black p-0.5 text-center">
                          {typeof slitLamp.dilation === 'string' ? slitLamp.dilation : (slitLamp.dilation?.OD || "—")}
                        </td>
                        <td className="p-0.5 text-center">
                          {typeof slitLamp.dilation === 'string' ? "—" : (slitLamp.dilation?.OS || "—")}
                        </td>
                      </tr>
                    )}
                    {eom && (
                      <tr className="border-b border-black last:border-b-0">
                        <td className="border-r border-black p-0.5 text-left font-semibold uppercase text-[7px]">EOM motility</td>
                        <td className="border-r border-black p-0.5 text-center">{formatValue(eom.OD)}</td>
                        <td className="p-0.5 text-center">{formatValue(eom.OS)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {hasPosterior && (() => {
            const keys = Object.keys(f).filter(k => f[k]?.OD || f[k]?.OS);
            return (
              <div className="space-y-1">
                <h2 className="text-[9px] font-bold uppercase border-b border-black pb-0.5">{secPosteriorNum}. Posterior Segment (Fundus)</h2>
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
                        <td className="border-r border-black p-0.5 text-center">{f[key]?.OD || "—"}</td>
                        <td className="p-0.5 text-center">{f[key]?.OS || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>

        {hasPrescriptions && (
          <div className="space-y-1">
            <h2 className="text-[9px] font-bold uppercase border-b border-black pb-0.5">{secPrescriptionsNum}. Medical Prescriptions</h2>
            <table className="w-full border-collapse border border-black text-[8px]">
              <thead>
                <tr className="bg-gray-100 border-b border-black text-left">
                  <th className="border-r border-black p-0.5 font-bold">Medicine</th>
                  <th className="border-r border-black p-0.5 font-bold">Dose / Route</th>
                  <th className="border-r border-black p-0.5 font-bold">Frequency</th>
                  <th className="border-r border-black p-0.5 font-bold">Duration</th>
                  <th className="p-0.5 font-bold text-center">Eye / Food Timing</th>
                </tr>
              </thead>
              <tbody>
                {printData.medications.map((m: any, idx: number) => (
                  <tr key={idx} className="border-b border-black last:border-b-0">
                    <td className="border-r border-black p-0.5 font-bold">{m.drug || m.name || "—"}</td>
                    <td className="border-r border-black p-0.5">{m.dosage || m.dose || "—"} ({m.route || "Topical"})</td>
                    <td className="border-r border-black p-0.5">{m.frequency || "—"}</td>
                    <td className="border-r border-black p-0.5">{m.duration || "—"}</td>
                    <td className="p-0.5 text-center font-semibold">{m.route?.toLowerCase() === "oral" ? (m.foodRelation || "After Food") : (m.eye || "Both")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {hasGlassRx && (() => {
          return (
            <div className="space-y-1">
              <h2 className="text-[9px] font-bold uppercase border-b border-black pb-0.5">{secGlassRxNum}. Final Glass RX</h2>
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
                            <td className="border-r border-black p-0.5">{fmtLens(glassRx.distance?.[eye]?.sphere || "0.00")}</td>
                            <td className="border-r border-black p-0.5">{fmtLens(glassRx.distance?.[eye]?.cylinder || "0.00")}</td>
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
                            <td className="border-r border-black p-0.5">{fmtLens(glassRx.near?.[eye]?.sphere || "0.00")}</td>
                            <td className="border-r border-black p-0.5">{fmtLens(glassRx.near?.[eye]?.cylinder || "0.00")}</td>
                            <td className="p-0.5">{glassRx.near?.[eye]?.axis || "0"}°</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {(glassRx?.glassType || glassRx?.instruction) && (
                <div className="mt-1.5 text-[7.5px] space-y-0.5 border-t border-gray-300 pt-1">
                  {glassRx.glassType && (
                    <p><strong>Lens Type:</strong> {glassRx.glassType === 'SVN' ? 'Single Vision' : glassRx.glassType === 'KBF' ? 'Bifocals' : glassRx.glassType === 'PAL' ? 'Progressive' : glassRx.glassType}</p>
                  )}
                  {glassRx.instruction && (
                    <p><strong>Instruction:</strong> {glassRx.instruction}</p>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {hasRemarks && (() => {
          return (
            <div className="space-y-1.5">
              <h2 className="text-[9px] font-bold uppercase border-b border-black pb-0.5">{secRemarksNum}. Remarks & Instructions</h2>
              {printData.notes && <p className="text-[8px]"><strong>Clinical Advice / Notes:</strong> {printData.notes}</p>}
              {required && (
                <p className="text-[8px]"><strong>Investigations Required:</strong> {typeof required === 'object' ? (Array.isArray(required) ? required.map((r: string) => INVESTIGATION_MAP[r] || r).join(", ") : "—") : (INVESTIGATION_MAP[required] || required)} {postSeg.other ? `(${postSeg.other})` : ""}</p>
              )}
              {adminInstructions && <p className="text-[8px]"><strong>Administration Directions:</strong> {adminInstructions}</p>}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
