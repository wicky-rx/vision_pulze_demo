import { 
  Glasses, CheckCircle2, ChevronDown, ClipboardList, Printer,
  User, Calendar as CalendarIcon, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Patient, statusLabels, statusColors } from "@/data/mockData";
import { cn } from "@/lib/utils";

const mockPatients: Patient[] = [
  { id: "1", name: "Robert Taylor", mrNumber: "100423", age: "47y", address: "12, MG Road, Chennai", status: "optical", tokenNumber: 1, gender: "Male", contactNumber: "9876543210", dob: "1979-05-27", waitTime: "10m", registeredAt: "10:00 AM" },
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
            Optical Desk
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
            <span className="text-[10px] font-black uppercase tracking-tight text-slate-900">DEMO OPTICIAN</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Dispensing Expert</span>
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
            Optical
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

export function OpticalStandalone() {
  const activePatient = mockPatients[0]; // Robert Taylor

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 overflow-hidden">
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
                    <Glasses className="w-5 h-5" />
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

              {/* Optical Details */}
              <div className="space-y-4 max-w-4xl mx-auto">
                
                {/* 1. Clinical Prescription Reference */}
                <DiagnosticCard title="Spectacles Prescription" icon={ClipboardList} badge="Dr. Gajendran's Rx">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Right Eye (OD) */}
                    <div className="p-3 bg-blue-50/40 border border-blue-100 relative pl-4">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-slate-500">RIGHT EYE (OD)</span>
                        <Badge className="bg-blue-600 text-white text-[8px] font-black uppercase rounded-none">OD</Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-center">
                        <div>
                          <span className="text-[8px] text-slate-400 block font-bold">SPH</span>
                          <span className="font-black text-sm text-slate-800">-1.25</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 block font-bold">CYL</span>
                          <span className="font-black text-sm text-slate-800">-0.25</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 block font-bold">AXIS</span>
                          <span className="font-black text-sm text-slate-800">90°</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 block font-bold">VA</span>
                          <span className="font-black text-sm text-emerald-600">6/6</span>
                        </div>
                      </div>
                    </div>

                    {/* Left Eye (OS) */}
                    <div className="p-3 bg-emerald-50/40 border border-emerald-100 relative pl-4">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-slate-500">LEFT EYE (OS)</span>
                        <Badge className="bg-emerald-600 text-white text-[8px] font-black uppercase rounded-none">OS</Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-center">
                        <div>
                          <span className="text-[8px] text-slate-400 block font-bold">SPH</span>
                          <span className="font-black text-sm text-slate-800">-1.75</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 block font-bold">CYL</span>
                          <span className="font-black text-sm text-slate-800">-0.50</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 block font-bold">AXIS</span>
                          <span className="font-black text-sm text-slate-800">180°</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 block font-bold">VA</span>
                          <span className="font-black text-sm text-emerald-600">6/6</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </DiagnosticCard>

                {/* 2. Dispensing Configuration */}
                <DiagnosticCard title="Dispensing details & Frame Selection" icon={Glasses} badge="Spectacles Assembly">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black text-slate-500 uppercase">Frame Architecture</Label>
                      <div className="h-10 border border-slate-200 bg-white px-3 flex items-center justify-between text-xs text-slate-600">
                        <span>Full Rimmed (Metal/Acetate)</span>
                        <ChevronDown className="w-4 h-4 opacity-50" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black text-slate-500 uppercase">Lens Technology</Label>
                      <div className="h-10 border border-slate-200 bg-white px-3 flex items-center justify-between text-xs text-slate-600">
                        <span>Single Vision (Blue Cut / UV protection)</span>
                        <ChevronDown className="w-4 h-4 opacity-50" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-2">
                    <Label className="text-[9px] font-black text-slate-500 uppercase">Laboratory Notes</Label>
                    <textarea 
                      disabled
                      value="ARC coating required. Frame width fits size M. Patient prefers black acetate style."
                      className="w-full h-16 p-3 text-xs border border-slate-200 bg-slate-50 text-slate-600 resize-none font-bold"
                    />
                  </div>
                </DiagnosticCard>

                {/* Actions footer */}
                <div className="border border-slate-200 bg-white p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                  <Button variant="outline" className="h-10 border-2 font-black uppercase text-[10px] tracking-wider w-full sm:w-auto gap-2" disabled>
                    <Printer className="w-3.5 h-3.5" /> Print Optical Slip
                  </Button>
                  <Button className="h-10 bg-[#8b3d87] hover:bg-[#722f6e] text-white font-bold uppercase tracking-wider px-6 rounded-none shadow-sm w-full sm:w-auto gap-2" disabled>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirm Fulfillment & Close Visit
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

export default OpticalStandalone;
