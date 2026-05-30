import {
  Stethoscope, Eye, CheckCircle2, ChevronDown, ClipboardList,
  User, ShieldCheck, Activity, Calendar as CalendarIcon, Users, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Patient, statusLabels, statusColors } from "@/data/mockData";
import { cn } from "@/lib/utils";

const mockPatients: Patient[] = [
  { id: "1", name: "Robert Taylor", mrNumber: "100423", age: "47y", address: "12, MG Road, Chennai", status: "doctor", tokenNumber: 1, gender: "Male", contactNumber: "9876543210", dob: "1979-05-27", waitTime: "10m", registeredAt: "10:00 AM" },
  { id: "2", name: "Sarah Jenkins", mrNumber: "100424", age: "23y", address: "45, Anna Nagar, Chennai", status: "optometrist", tokenNumber: 2, gender: "Female", contactNumber: "9876543211", dob: "2003-05-27", waitTime: "5m", registeredAt: "10:05 AM" },
  { id: "3", name: "David Miller", mrNumber: "100425", age: "62y", address: "78, T. Nagar, Chennai", status: "reception", tokenNumber: 3, gender: "Male", contactNumber: "9876543212", dob: "1964-05-27", waitTime: "2m", registeredAt: "10:08 AM" },
] as Patient[];

function LocalTopHeader() {
  return (
    <header className="h-16 border-b border-brand/20 bg-white/85 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 shadow-sm z-50 sticky top-0">
      <div className="flex items-center gap-6">
        <div className="flex items-center lg:pr-6 lg:border-r border-slate-200/60 shrink-0">
          <div className="flex flex-col leading-none gap-0.5">
            <span style={{ fontFamily: "'Outfit', sans-serif" }} className="font-extrabold text-xl tracking-tight leading-none text-slate-900">
              Vision<span className="text-brand">Pulze</span>
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400 mt-0.5">
              Ophthalmic Ecosystem
            </span>
          </div>
        </div>
        <div className="space-y-0.5">
          <h2 className="text-sm font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            Doctor Station
          </h2>
          <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
            <CalendarIcon className="w-3 h-3" />
            {new Date().toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-full border border-slate-200 bg-slate-50/50">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-tr from-brand to-rose-500 text-white shadow-md">
            <User className="w-4 h-4" />
          </div>
          <div className="flex flex-col items-start text-left">
            <span className="text-[10px] font-black uppercase tracking-tight text-slate-900">DEMO CLINICIAN</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Ophthalmologist</span>
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
            <Users className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-semibold text-slate-800">Live Queue</h3>
            <Badge className="bg-brand/10 text-brand border-0 text-[10px]">{mockPatients.length}</Badge>
          </div>
        </div>
        <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg">
          <div className="flex-1 px-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md text-center bg-brand text-white shadow-sm cursor-default">
            All
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
              "w-full px-4 py-3 flex items-center justify-between border-l-4 cursor-default",
              selectedPatientId === patient.id ? "bg-brand/10 border-l-brand" : "border-l-transparent"
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
      <div className="px-4 py-2.5 flex items-center justify-between border-l-4 border-l-brand bg-brand/10">
        <div className="flex items-center gap-2.5 relative">
          <Icon className="w-3.5 h-3.5 text-brand" />
          <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-800">{title}</h3>
        </div>
        <div className="flex items-center gap-2.5">
          {badge && <Badge variant="outline" className="border-brand/30 text-brand text-[8px] font-black uppercase tracking-widest rounded-none bg-white">{badge}</Badge>}
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>
      <CardContent className="p-4 space-y-3">
        {children}
      </CardContent>
    </Card>
  );
}

export function DoctorStandalone() {
  const activePatient = mockPatients[0]; // Robert Taylor

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 overflow-hidden pointer-events-none select-none">
      <LocalTopHeader />
      <div className="flex-1 flex overflow-hidden p-3 gap-3">
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 overflow-hidden flex shadow-sm">
          <LocalPatientQueue selectedPatientId={activePatient.id} />

          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-brand/5 relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="absolute inset-0 pointer-events-none bg-sprinkles z-0"></div>

            <div className="p-4 lg:p-6 space-y-4 relative z-10 flex-1">
              {/* Patient Header */}
              <div className="bg-white border border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl shadow-sm gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-brand to-brand-hover text-white p-2.5 rounded-lg shrink-0">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">{activePatient.name}</h2>
                      <Badge className="bg-brand text-white text-[9px] px-1.5 font-mono rounded-full font-bold">MR-{activePatient.mrNumber}</Badge>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-[9px] px-1.5 font-bold rounded-full">Token-{activePatient.tokenNumber}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                      <span>{activePatient.gender}</span>
                      <span>•</span>
                      <span>{activePatient.age}</span>
                      <span>•</span>
                      <span className="text-brand font-bold">Consultation</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Consultation Details */}
              <div className="space-y-4 max-w-4xl mx-auto">

                {/* 1. History & Complaints */}
                <DiagnosticCard title="Chief Complaint & History" icon={ClipboardList} badge="Active Symptoms">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black text-slate-500 uppercase">Primary Complaints</Label>
                      <Input value="Gradual blurred vision in right eye for 6 months. Difficulty reading text." disabled className="bg-slate-50 border-slate-200 text-xs font-bold" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black text-slate-500 uppercase">Systemic & Ocular History</Label>
                      <Input value="Known Diabetic (Controlled). Wears spectacles since 4 years." disabled className="bg-slate-50 border-slate-200 text-xs font-bold" />
                    </div>
                  </div>
                </DiagnosticCard>

                {/* 2. Visual Acuity & Refraction Review */}
                <DiagnosticCard title="Visual Acuity & Refraction Review" icon={Eye} badge="Optometrist Values">
                  <div className="border border-slate-100 overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-2.5 font-black text-slate-600 uppercase tracking-widest text-[9px]">Eye</th>
                          <th className="p-2.5 font-black text-slate-600 uppercase tracking-widest text-[9px]">Unaided SPH</th>
                          <th className="p-2.5 font-black text-slate-600 uppercase tracking-widest text-[9px]">Aided CYL</th>
                          <th className="p-2.5 font-black text-slate-600 uppercase tracking-widest text-[9px]">AXIS</th>
                          <th className="p-2.5 font-black text-slate-600 uppercase tracking-widest text-[9px]">BCVA (DV)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold">
                        <tr>
                          <td className="p-2.5 text-blue-600">OD (Right)</td>
                          <td className="p-2.5">-1.25 SPH</td>
                          <td className="p-2.5">-0.25 CYL</td>
                          <td className="p-2.5">90°</td>
                          <td className="p-2.5 text-emerald-600">6/6</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 text-emerald-600">OS (Left)</td>
                          <td className="p-2.5">-1.75 SPH</td>
                          <td className="p-2.5">-0.50 CYL</td>
                          <td className="p-2.5">180°</td>
                          <td className="p-2.5 text-emerald-600">6/6</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </DiagnosticCard>

                {/* 3. Clinical Examinations */}
                <DiagnosticCard title="Slit Lamp Exam & IOP" icon={Activity} badge="Clinical Examinations">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3 p-3 bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider border-b pb-1">Slit Lamp Findings</p>
                      <div className="space-y-2 text-xs">
                        <p><strong>Cornea:</strong> Clear & intact bilaterally</p>
                        <p><strong>Lens:</strong> Early nuclear sclerosis (Grade I Cataract) in OD</p>
                        <p><strong>Anterior Chamber:</strong> Quiet & deep</p>
                      </div>
                    </div>
                    <div className="space-y-3 p-3 bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider border-b pb-1">Fundus Examination & IOP</p>
                      <div className="space-y-2 text-xs">
                        <p><strong>IOP (NCT):</strong> OD: 14 mmHg | OS: 15 mmHg (Normal)</p>
                        <p><strong>Optic Disc:</strong> C/D Ratio 0.3, margins clear</p>
                        <p><strong>Retina:</strong> No signs of diabetic retinopathy</p>
                      </div>
                    </div>
                  </div>
                </DiagnosticCard>

                {/* 4. Prescription Area */}
                <DiagnosticCard title="Final Medical & Spectacle Prescription" icon={ShieldCheck} badge="Final Tx Plan">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-slate-900 text-white px-3 py-1.5 text-[9px] font-black uppercase tracking-widest">
                        <span>Medication (Rx)</span>
                        <span>Official Rx</span>
                      </div>
                      <div className="border border-slate-100 divide-y divide-slate-50">
                        <div className="p-3 bg-white flex justify-between text-xs font-bold text-slate-700">
                          <span>1. Carboxymethylcellulose 0.5% eye drops</span>
                          <span>1 drop / 4 times daily (Both Eyes) • 30 days</span>
                        </div>
                        <div className="p-3 bg-white flex justify-between text-xs font-bold text-slate-700">
                          <span>2. Multivitamin Tablets (Macular Support)</span>
                          <span>1 tablet / Once daily (Oral) • 30 days</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </DiagnosticCard>

                {/* Footer Cabin Actions */}
                <div className="border border-slate-200 bg-white p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand" />
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">Consultation summary and diagnostics verified by ophthalmologist</span>
                  </div>
                  <Button className="h-10 bg-brand hover:bg-brand-hover text-white font-bold uppercase tracking-wider px-6 rounded-none shadow-sm gap-2" disabled>
                    <Save className="w-3.5 h-3.5" />
                    Finalize & Route to Optical
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

export default DoctorStandalone;
