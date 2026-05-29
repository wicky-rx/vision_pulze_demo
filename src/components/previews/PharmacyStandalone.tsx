import { 
  Pill, CheckCircle2, ChevronDown, ClipboardList, Printer,
  User, Calendar as CalendarIcon, Users, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Patient, statusLabels, statusColors } from "@/data/mockData";
import { cn } from "@/lib/utils";

const mockPatients: Patient[] = [
  { id: "1", name: "Robert Taylor", mrNumber: "100423", age: "47y", address: "12, MG Road, Chennai", status: "pharmacy", tokenNumber: 1, gender: "Male", contactNumber: "9876543210", dob: "1979-05-27", waitTime: "10m", registeredAt: "10:00 AM" },
  { id: "2", name: "Sarah Jenkins", mrNumber: "100424", age: "23y", address: "45, Anna Nagar, Chennai", status: "optometrist", tokenNumber: 2, gender: "Female", contactNumber: "9876543211", dob: "2003-05-27", waitTime: "5m", registeredAt: "10:05 AM" },
] as Patient[];

function LocalTopHeader() {
  return (
    <header className="h-16 border-b border-[#8b3d87]/20 bg-white/85 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 shadow-sm z-50 sticky top-0">
      <div className="flex items-center gap-6">
        <div className="flex items-center lg:pr-6 lg:border-r border-slate-200/60 shrink-0">
          <div className="flex flex-col leading-none gap-0.5">
            <span style={{ fontFamily: "'Outfit', sans-serif" }} className="font-extrabold text-xl tracking-tight leading-none text-slate-900">
              Vision<span className="text-blue-600">Pulze</span>
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400 mt-0.5">
              Ophthalmic Ecosystem
            </span>
          </div>
        </div>
        <div className="space-y-0.5">
          <h2 className="text-sm font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#8b3d87] animate-pulse" />
            Pharmacy Desk
          </h2>
          <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
            <CalendarIcon className="w-3 h-3" />
            {new Date().toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-full border border-slate-200 bg-slate-50/50">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-tr from-[#8b3d87] to-rose-500 text-white shadow-md">
            <User className="w-4 h-4" />
          </div>
          <div className="flex flex-col items-start text-left">
            <span className="text-[10px] font-black uppercase tracking-tight text-slate-900">DEMO PHARMACIST</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Inventory Manager</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function LocalPatientQueue({ selectedPatientId }: { selectedPatientId: string }) {
  return (
    <div className="w-full lg:w-[280px] border-b lg:border-b-0 lg:border-r border-slate-200 bg-white flex flex-col shrink-0 lg:h-full overflow-hidden">
      <div className="px-4 py-4 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#8b3d87]" />
            <h3 className="text-sm font-semibold text-slate-800">Live Queue</h3>
            <Badge className="bg-[#8b3d87]/10 text-[#8b3d87] border-0 text-[10px]">{mockPatients.length}</Badge>
          </div>
        </div>
        <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg">
          <div className="flex-1 px-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md text-center bg-[#8b3d87] text-white shadow-sm cursor-default">
            All
          </div>
          <div className="flex-1 px-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md text-center text-slate-400 cursor-default">
            Pharmacy
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {mockPatients.map((patient) => (
          <div
            key={patient.id}
            className={cn(
              "w-full px-4 py-3 flex items-center justify-between border-l-4 cursor-default",
              selectedPatientId === patient.id ? "bg-[#8b3d87]/10 border-l-[#8b3d87]" : "border-l-transparent"
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{patient.name}</p>
              <p className="text-[9px] text-slate-400 font-mono mt-0.5">MRN-{patient.mrNumber}</p>
              <p className="text-[9px] text-slate-500 mt-1">Age {patient.age} • Token {patient.tokenNumber}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
              <Badge className={cn("text-[8px] uppercase tracking-wider text-white border-0 px-1.5 py-0.5 rounded-none font-bold", statusColors[patient.status] || "bg-slate-500")}>
                {statusLabels[patient.status] || patient.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DiagnosticCard({ title, icon: Icon, badge, children }: { title: string; icon: any; badge?: string; children: React.ReactNode }) {
  return (
    <Card className="border border-slate-200 rounded-none shadow-sm overflow-hidden bg-white">
      <div className="px-4 py-2.5 flex items-center justify-between border-l-4 border-l-[#8b3d87] bg-[#8b3d87]/10">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-[#8b3d87]" />
          <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-800">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {badge && <Badge variant="outline" className="border-[#8b3d87]/30 text-[#8b3d87] text-[8px] font-black uppercase tracking-widest rounded-none bg-white">{badge}</Badge>}
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>
      <CardContent className="p-4 space-y-3">
        {children}
      </CardContent>
    </Card>
  );
}

export function PharmacyStandalone() {
  const activePatient = mockPatients[0]; // Robert Taylor

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 overflow-hidden pointer-events-none select-none">
      <LocalTopHeader />
      <div className="flex-1 flex overflow-hidden p-3 gap-3">
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 overflow-hidden flex shadow-sm">
          <LocalPatientQueue selectedPatientId={activePatient.id} />
          
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-[#8b3d87]/5 relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="absolute inset-0 pointer-events-none bg-sprinkles z-0"></div>
            
            <div className="p-4 lg:p-6 space-y-4 relative z-10 flex-1">
              {/* Patient Header */}
              <div className="bg-white border border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl shadow-sm gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-[#8b3d87] to-[#722f6e] text-white p-2.5 rounded-lg shrink-0">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">{activePatient.name}</h2>
                      <Badge className="bg-[#722f6e] text-white text-[9px] px-1.5 font-mono rounded-full font-bold">MR-{activePatient.mrNumber}</Badge>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-[9px] px-1.5 font-bold rounded-full">Token-{activePatient.tokenNumber}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                      <span>{activePatient.gender}</span>
                      <span>•</span>
                      <span>{activePatient.age}</span>
                      <span>•</span>
                      <span className="text-[#8b3d87] font-bold">Dispensing Desk</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pharmacy Details */}
              <div className="space-y-4 max-w-4xl mx-auto">
                
                {/* 1. Medication Orders List */}
                <DiagnosticCard title="Medication Orders" icon={ClipboardList} badge="Active Prescription">
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-3 px-3 py-2 bg-slate-900 text-white text-[8px] font-black uppercase tracking-wider">
                      <div className="col-span-6">Drug Description</div>
                      <div className="col-span-3 text-center">Dosage</div>
                      <div className="col-span-3 text-right">Frequency</div>
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-3 px-3 py-3 border-b border-slate-100 items-center bg-white text-xs font-bold text-slate-700">
                        <div className="col-span-6">1. Carboxymethylcellulose 0.5% eye drops <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Qty: 2 vials</p></div>
                        <div className="col-span-3 text-center">1 drop OD/OS</div>
                        <div className="col-span-3 text-right"><Badge variant="outline" className="text-[8px] font-black">4 times daily</Badge></div>
                      </div>
                      <div className="grid grid-cols-12 gap-3 px-3 py-3 border-b border-slate-100 items-center bg-white text-xs font-bold text-slate-700">
                        <div className="col-span-6">2. Multivitamin Tablets (Macular Support) <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Qty: 30 Tablets</p></div>
                        <div className="col-span-3 text-center">1 tablet PO</div>
                        <div className="col-span-3 text-right"><Badge variant="outline" className="text-[8px] font-black">Once daily</Badge></div>
                      </div>
                    </div>
                  </div>
                </DiagnosticCard>

                {/* 2. Dispensing Notes and Controls */}
                <DiagnosticCard title="Dispensing Verification & Remarks" icon={Pill} badge="Pharmacist Notes">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black text-slate-500 uppercase">Internal Dispatch Notes</Label>
                      <textarea 
                        disabled
                        value="Batch #CMC2026B verified. Dispensed 2 vials of artificial tears and 3 strips of multivitamins. Checked expiry dates."
                        className="w-full h-16 p-3 text-xs border border-slate-200 bg-slate-50 text-slate-600 resize-none font-bold"
                      />
                    </div>
                    <div className="bg-blue-50 p-3 border-l-4 border-blue-600 text-xs">
                      <div className="flex gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                          <p className="font-black text-blue-600 uppercase text-[9px] tracking-wider mb-0.5">Safety Check</p>
                          <p className="text-blue-800 leading-relaxed font-bold italic">Verify correct batch and check patient sensitivity/diabetic indicators before handing over medication package.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </DiagnosticCard>

                {/* Actions footer */}
                <div className="border border-slate-200 bg-white p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                  <Button variant="outline" className="h-10 border-2 font-black uppercase text-[10px] tracking-wider w-full sm:w-auto gap-2" disabled>
                    <Printer className="w-3.5 h-3.5" /> Print Invoice
                  </Button>
                  <Button className="h-10 bg-emerald-600 hover:bg-black text-white font-bold uppercase tracking-wider px-6 rounded-none shadow-sm w-full sm:w-auto gap-2" disabled>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Dispensing Completed
                  </Button>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PharmacyStandalone;
