import { 
  Eye, CheckCircle2, ChevronDown, ClipboardList, 
  Crosshair, User, ShieldCheck, Activity, Calendar as CalendarIcon,
  Users, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Patient, statusLabels, statusColors } from "@/data/mockData";
import { cn } from "@/lib/utils";

// Static mock list of patients in queue
const mockPatients: Patient[] = [
  { id: "1", name: "Robert Taylor", mrNumber: "100423", age: "47y", address: "12, MG Road, Chennai", status: "doctor", tokenNumber: 1, gender: "Male", contactNumber: "9876543210", dob: "1979-05-27", waitTime: "10m", registeredAt: "10:00 AM" },
  { id: "2", name: "Sarah Jenkins", mrNumber: "100424", age: "23y", address: "45, Anna Nagar, Chennai", status: "optometrist", tokenNumber: 2, gender: "Female", contactNumber: "9876543211", dob: "2003-05-27", waitTime: "5m", registeredAt: "10:05 AM" },
  { id: "3", name: "David Miller", mrNumber: "100425", age: "62y", address: "78, T. Nagar, Chennai", status: "reception", tokenNumber: 3, gender: "Male", contactNumber: "9876543212", dob: "1964-05-27", waitTime: "2m", registeredAt: "10:08 AM" },
  { id: "4", name: "Alice Johnson", mrNumber: "100426", age: "54y", address: "23, Adyar, Chennai", status: "optical", tokenNumber: 4, gender: "Female", contactNumber: "9876543213", dob: "1972-05-27", waitTime: "1m", registeredAt: "10:10 AM" },
  { id: "5", name: "Charlie Brown", mrNumber: "100427", age: "39y", address: "56, Velachery, Chennai", status: "completed", tokenNumber: 5, gender: "Male", contactNumber: "9876543214", dob: "1987-05-27", waitTime: "0m", registeredAt: "10:12 AM" },
] as Patient[];

// ----------------------------------------------------
// LOCAL COMPONENTS
// ----------------------------------------------------

function LocalTopHeader() {
  const userName = "DEMO OPTOMETRIST";

  return (
    <header className="h-16 md:h-20 border-b border-[#8b3d87]/20 bg-white/85 backdrop-blur-xl flex items-center justify-between px-4 md:px-8 shrink-0 shadow-sm z-50 sticky top-0">
      <div className="flex items-center gap-6 md:gap-10">
        <div className="flex items-center lg:pr-10 lg:border-r border-slate-200/60 shrink-0">
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
          <h2 className="text-sm lg:text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#8b3d87] animate-pulse" />
            Refraction Room
          </h2>
          <div className="flex items-center gap-2 text-[9px] lg:text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <CalendarIcon className="w-3 h-3" />
            {new Date().toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
          </div>
        </div>

        <div className="hidden 2xl:flex flex-col justify-center border-l border-slate-200 pl-10">
          <span className="text-xs font-black tracking-tight text-slate-900 leading-none mb-1">VISIONPULZE</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Ophthalmic Ecosystem</span>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <div className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-full border border-slate-200 bg-slate-50/50">
          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-tr from-[#8b3d87] to-rose-500 text-white shadow-lg shadow-[#8b3d87]/20">
            <User className="w-5 h-5" />
          </div>
          <div className="hidden lg:flex flex-col items-start text-left">
            <span className="text-[11px] font-black uppercase tracking-tight text-slate-900">{userName}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Practitioner</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function LocalPatientQueue({ selectedPatientId }: { selectedPatientId: string }) {
  return (
    <div className="w-full lg:w-[300px] border-b lg:border-b-0 lg:border-r border-slate-200 bg-white flex flex-col shrink-0 lg:h-full overflow-hidden">
      <div className="px-4 py-4 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#8b3d87]" />
            <h3 className="text-sm font-semibold text-slate-800">Live Queue</h3>
            <Badge className="bg-[#8b3d87]/10 text-[#8b3d87] border-0 text-[11px]">{mockPatients.length}</Badge>
          </div>
        </div>

        <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg">
          <div className="flex-1 px-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md text-center bg-[#8b3d87] text-white shadow-sm cursor-default">
            All
          </div>
          <div className="flex-1 px-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md text-center text-slate-400 cursor-default">
            Refraction
          </div>
          <div className="flex-1 px-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md text-center text-slate-400 cursor-default">
            Doctor
          </div>
          <div className="flex-1 px-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md text-center text-slate-400 cursor-default">
            Completed
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {mockPatients.map((patient) => (
          <div
            key={patient.id}
            className={cn(
              "w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors border-l-4 cursor-default",
              selectedPatientId === patient.id ? "bg-[#8b3d87]/10 border-l-[#8b3d87]" : "border-l-transparent"
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 truncate leading-snug">{patient.name}</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">MRN-{patient.mrNumber}</p>
              <p className="text-[10px] text-slate-500 mt-1">Age {patient.age} • {patient.address || "—"}</p>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                Token-{patient.tokenNumber}
              </span>
              <Badge className={cn("text-[9px] uppercase tracking-wider text-white border-0 px-2 py-0.5 rounded-none font-bold", statusColors[patient.status] || "bg-slate-500")}>
                {statusLabels[patient.status] || patient.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Dummy Diagnostic Card with static expand collapse look
function DiagnosticCard({
  title,
  icon: Icon,
  badge,
  children
}: {
  title: string;
  icon: any;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border border-slate-200 rounded-none shadow-sm overflow-hidden bg-white">
      <div className="px-5 py-3 flex items-center justify-between border-l-4 border-l-[#8b3d87] bg-[#8b3d87]/10">
        <div className="flex items-center gap-3 relative">
          <Icon className="w-4 h-4 text-[#8b3d87]" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">{title}</h3>
        </div>
        <div className="flex items-center gap-3">
          {badge && <Badge variant="outline" className="border-[#8b3d87]/30 text-[#8b3d87] text-[8px] font-black uppercase tracking-widest rounded-none bg-white">{badge}</Badge>}
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </div>
      </div>
      <CardContent className="p-5 space-y-4">
        {children}
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------
// MAIN STANDALONE COMPONENT
// ----------------------------------------------------

export function RefractionStandalone() {
  const activePatient = mockPatients[1]; // Sarah Jenkins (In Refraction)

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 overflow-hidden">
      <LocalTopHeader />
      <div className="flex-1 flex overflow-hidden p-3 gap-3">
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 overflow-hidden flex shadow-sm">
          {/* Left Column: Live Queue */}
          <LocalPatientQueue selectedPatientId={activePatient.id} />

          {/* Center/Main Column: Refraction Workspace */}
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-[#8b3d87]/5 relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="absolute inset-0 pointer-events-none bg-sprinkles z-0"></div>

            <div className="p-6 lg:p-8 space-y-6 relative z-10 flex-1">
              {/* Premium Diagnostic Header */}
              <div className="bg-white border border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl shadow-sm gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-[#8b3d87] to-[#722f6e] text-white p-3 rounded-lg shrink-0 shadow-lg shadow-[#8b3d87]/20">
                    <Eye className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">{activePatient.name}</h2>
                      <Badge className="bg-[#8b3d87] text-white text-[10px] px-2 font-mono rounded-full font-bold">MR-{activePatient.mrNumber}</Badge>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-[10px] px-2 font-bold rounded-full">Token-{activePatient.tokenNumber}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                      <span>{activePatient.gender}</span>
                      <span>•</span>
                      <span>{activePatient.age}</span>
                      <span>•</span>
                      <span className="text-[#8b3d87] font-bold">Diagnostic Phase</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-100/50 p-1.5 rounded-lg border border-slate-200">
                    <Button variant="ghost" size="sm" className="h-8 px-3 text-[10px] font-black uppercase text-slate-600" disabled>Expand All</Button>
                    <div className="w-px h-4 bg-slate-200" />
                    <Button variant="ghost" size="sm" className="h-8 px-3 text-[10px] font-black uppercase text-slate-600" disabled>Collapse All</Button>
                  </div>
                </div>
              </div>

              {/* Form diagnostic cards stack */}
              <div className="space-y-6 max-w-5xl mx-auto">
                {/* 1. Systemic History */}
                <DiagnosticCard title="Systemic History" icon={ClipboardList} badge="2 Conditions">
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {["Diabetes", "Hypertension"].map((cond) => (
                        <span key={cond} className="px-3 py-1.5 bg-[#8b3d87]/10 text-[#8b3d87] border border-[#8b3d87]/20 text-xs font-black uppercase tracking-wider">
                          {cond}
                        </span>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-black text-slate-500 uppercase">Systemic Notes</Label>
                      <Input value="Patient has been diabetic for 5 years. Controlled on oral medication." disabled className="bg-slate-50 border-slate-200 text-xs font-bold" />
                    </div>
                  </div>
                </DiagnosticCard>

                {/* 2. Visual Acuity */}
                <DiagnosticCard title="Visual Acuity" icon={Crosshair} badge="Unaided & Aided">
                  <div className="border border-slate-100 overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-3 font-black text-slate-600 uppercase tracking-widest text-[9px]">Eye</th>
                          <th className="p-3 font-black text-slate-600 uppercase tracking-widest text-[9px]">Unaided (DV)</th>
                          <th className="p-3 font-black text-slate-600 uppercase tracking-widest text-[9px]">Aided (DV)</th>
                          <th className="p-3 font-black text-slate-600 uppercase tracking-widest text-[9px]">Near Vision</th>
                          <th className="p-3 font-black text-slate-600 uppercase tracking-widest text-[9px]">Pinhole</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="p-3 font-bold text-blue-600">OD (Right)</td>
                          <td className="p-3 font-bold">6/18</td>
                          <td className="p-3 font-bold">6/6</td>
                          <td className="p-3 font-bold">N6</td>
                          <td className="p-3 font-bold">6/9</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-bold text-emerald-600">OS (Left)</td>
                          <td className="p-3 font-bold">6/24</td>
                          <td className="p-3 font-bold">6/9</td>
                          <td className="p-3 font-bold">N8</td>
                          <td className="p-3 font-bold">6/12</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </DiagnosticCard>

                {/* 3. Objective Refraction */}
                <DiagnosticCard title="Objective Refraction" icon={Activity} badge="AR Values">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* OD */}
                    <div className="space-y-4 border border-slate-100 p-4 bg-slate-50/50">
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                        <span className="w-7 h-7 flex items-center justify-center font-bold border border-blue-600 text-blue-600 text-xs">OD</span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Right Eye AR Data</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-[9px] font-bold text-slate-400 uppercase">Sphere</Label>
                          <Input value="-1.50" disabled className="h-9 text-center font-bold text-slate-800 bg-white" />
                        </div>
                        <div>
                          <Label className="text-[9px] font-bold text-slate-400 uppercase">Cylinder</Label>
                          <Input value="-0.50" disabled className="h-9 text-center font-bold text-slate-800 bg-white" />
                        </div>
                        <div>
                          <Label className="text-[9px] font-bold text-slate-400 uppercase">Axis</Label>
                          <Input value="90" disabled className="h-9 text-center font-bold text-slate-800 bg-white" />
                        </div>
                      </div>
                    </div>

                    {/* OS */}
                    <div className="space-y-4 border border-slate-100 p-4 bg-slate-50/50">
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                        <span className="w-7 h-7 flex items-center justify-center font-bold border border-emerald-600 text-emerald-600 text-xs">OS</span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Left Eye AR Data</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-[9px] font-bold text-slate-400 uppercase">Sphere</Label>
                          <Input value="-2.00" disabled className="h-9 text-center font-bold text-slate-800 bg-white" />
                        </div>
                        <div>
                          <Label className="text-[9px] font-bold text-slate-400 uppercase">Cylinder</Label>
                          <Input value="-0.75" disabled className="h-9 text-center font-bold text-slate-800 bg-white" />
                        </div>
                        <div>
                          <Label className="text-[9px] font-bold text-slate-400 uppercase">Axis</Label>
                          <Input value="180" disabled className="h-9 text-center font-bold text-slate-800 bg-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </DiagnosticCard>

                {/* 4. Subjective Acceptance */}
                <DiagnosticCard title="Subjective Acceptance" icon={ShieldCheck} badge="Final Refined Powers">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* OD */}
                    <div className="space-y-4 border border-slate-100 p-4 bg-slate-50/50">
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                        <span className="w-7 h-7 flex items-center justify-center font-bold border border-blue-600 text-blue-600 text-xs">OD</span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Right Eye Power</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <Label className="text-[8px] font-bold text-slate-400 uppercase text-center block">SPH</Label>
                          <div className="h-10 border border-slate-200 bg-white text-center text-sm font-black text-slate-800 flex items-center justify-center">-1.25</div>
                        </div>
                        <div>
                          <Label className="text-[8px] font-bold text-slate-400 uppercase text-center block">CYL</Label>
                          <div className="h-10 border border-slate-200 bg-white text-center text-sm font-black text-slate-800 flex items-center justify-center">-0.25</div>
                        </div>
                        <div>
                          <Label className="text-[8px] font-bold text-slate-400 uppercase text-center block">AXIS</Label>
                          <div className="h-10 border border-slate-200 bg-white text-center text-sm font-black text-slate-800 flex items-center justify-center">90</div>
                        </div>
                        <div>
                          <Label className="text-[8px] font-bold text-slate-400 uppercase text-center block">BCVA</Label>
                          <div className="h-10 border border-slate-200 bg-white text-center text-sm font-black text-slate-800 flex items-center justify-center">6/6</div>
                        </div>
                      </div>
                    </div>

                    {/* OS */}
                    <div className="space-y-4 border border-slate-100 p-4 bg-slate-50/50">
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                        <span className="w-7 h-7 flex items-center justify-center font-bold border border-emerald-600 text-emerald-600 text-xs">OS</span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Left Eye Power</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <Label className="text-[8px] font-bold text-slate-400 uppercase text-center block">SPH</Label>
                          <div className="h-10 border border-slate-200 bg-white text-center text-sm font-black text-slate-800 flex items-center justify-center">-1.75</div>
                        </div>
                        <div>
                          <Label className="text-[8px] font-bold text-slate-400 uppercase text-center block">CYL</Label>
                          <div className="h-10 border border-slate-200 bg-white text-center text-sm font-black text-slate-800 flex items-center justify-center">-0.50</div>
                        </div>
                        <div>
                          <Label className="text-[8px] font-bold text-slate-400 uppercase text-center block">AXIS</Label>
                          <div className="h-10 border border-slate-200 bg-white text-center text-sm font-black text-slate-800 flex items-center justify-center">180</div>
                        </div>
                        <div>
                          <Label className="text-[8px] font-bold text-slate-400 uppercase text-center block">BCVA</Label>
                          <div className="h-10 border border-slate-200 bg-white text-center text-sm font-black text-slate-800 flex items-center justify-center">6/6</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </DiagnosticCard>

                {/* 5. Tonometry */}
                <DiagnosticCard title="Tonometry (Intraocular Pressure)" icon={Activity} badge="IOP Stable">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 flex items-center justify-center border border-blue-600 text-blue-600 font-bold text-xs">OD</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">NCT Mean</span>
                      </div>
                      <div className="h-10 border border-slate-200 bg-white px-3 flex items-center text-sm font-bold text-slate-700">14 mmHg</div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 flex items-center justify-center border border-emerald-600 text-emerald-600 font-bold text-xs">OS</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">NCT Mean</span>
                      </div>
                      <div className="h-10 border border-slate-200 bg-white px-3 flex items-center text-sm font-bold text-slate-700">15 mmHg</div>
                    </div>
                  </div>
                </DiagnosticCard>

                {/* 6. Verify and Complete Panel */}
                <div className="border border-slate-200 bg-white p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border border-slate-300 rounded bg-slate-50 flex items-center justify-center text-[#8b3d87]">
                      <CheckCircle2 className="w-4 h-4 text-[#8b3d87]" />
                    </div>
                    <span className="text-xs font-bold text-slate-500">I verify that the above refraction readings are accurate.</span>
                  </div>

                  <Button className="h-11 bg-[#8b3d87] hover:bg-[#722f6e] text-white font-bold uppercase tracking-wider px-8 rounded-none shadow-md gap-2">
                    <Save className="w-4 h-4" />
                    Advance to Doctor
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

export default RefractionStandalone;
