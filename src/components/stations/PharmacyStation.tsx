import { useState, useEffect } from "react";
import { type Patient } from "@/data/mockData";
import { Printer, CheckCircle2, Loader2, Pill, ClipboardList, User, Activity, AlertCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { getPatientAgeString, getPatientAgeNumber, calculateSessionSlot, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { API_BASE_URL } from "@/config";

export function PharmacyStation({ patient, doctors = [] }: { patient?: Patient | null, doctors?: any[] }) {
    const { toast } = useToast();
    const [showPrint, setShowPrint] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pharmacistNotes, setPharmacistNotes] = useState("");
    const [completed, setCompleted] = useState(false);
    
    const consultation = patient?.consultation;
    const patientAge = getPatientAgeNumber(patient);
    
    useEffect(() => {
        if (patient) {
            setCompleted(patient.status?.toUpperCase() === 'COMPLETED');
            if (patient.optical?.medications && !pharmacistNotes) {
                setPharmacistNotes(patient.optical.medications);
            }
        }
    }, [patient?.id, patient?.status]);

    const handleComplete = async () => {
        if (!patient?.id) return;
        try {
            setIsSubmitting(true);
            const token = localStorage.getItem("token");
            
            const response = await fetch(`${API_BASE_URL}/api/optical/${patient.id}`, {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ 
                    medications: pharmacistNotes || "Dispensed",
                    status: "COMPLETED"
                })
            });

            if (response.ok) {
                setCompleted(true);
                toast({ 
                    title: "Medication Fulfillment Successful", 
                    description: "Inventory records updated and visit marked as finalized.",
                    className: "bg-emerald-600 text-white rounded-none border-0 font-bold"
                });
                window.dispatchEvent(new Event("patientQueueUpdated"));
            } else {
                const err = await response.json();
                throw new Error(err.message || "Failed to update pharmacy status.");
            }
        } catch (error: any) {
            toast({ 
                variant: "destructive", 
                title: "Dispatch Error", 
                description: error.message 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!patient) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-white p-12">
                <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                    <Pill className="w-10 h-10 text-orange-200" />
                </div>
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-300">Awaiting Patient Selection</h2>
                <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">Select a patient from the queue to manage dispensing</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
            {/* Premium Station Header */}
            <div className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3 md:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 shadow-sm z-30 gap-4 md:gap-8 sticky top-0">
                <div className="flex items-center gap-4 md:gap-6 w-full sm:w-auto relative z-10">
                    <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white p-2.5 md:p-3.5 rounded-xl shrink-0 shadow-lg shadow-rose-200/50 hidden xs:flex items-center justify-center">
                        <Pill className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                            <h2 className="text-base md:text-xl font-black text-slate-900 tracking-tight uppercase truncate">{patient.name || "UNNAMED PATIENT"}</h2>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <Badge className="bg-rose-600 text-white text-[10px] md:text-xs px-2 md:px-3 font-mono tracking-widest rounded-full h-5 md:h-6 font-black border-2 border-white shadow-sm">MR-{patient.mrNumber || "0000"}</Badge>
                                <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-[9px] md:text-xs px-2 font-black rounded-full h-5 md:h-6">T-{patient.tokenNumber || "—"}</Badge>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] md:text-[11px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/50 w-fit px-2 py-0.5 rounded-md">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{patient.gender}</span>
                            <span className="text-slate-300">•</span>
                            <span>{getPatientAgeString(patient)}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-rose-600 font-black tracking-widest uppercase">Pharma fulfillment</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 md:gap-8 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 relative z-10">
                    {completed && (
                        <Badge className="bg-emerald-600 text-white border-0 gap-2 h-9 md:h-11 px-4 md:px-6 rounded-none font-black uppercase text-[10px] md:text-xs tracking-widest shadow-md shrink-0">
                            <CheckCircle2 className="w-4 h-4 md:w-5 h-5" />
                            Dispensed
                        </Badge>
                    )}
                    
                    {!completed && (
                        <Button 
                            onClick={handleComplete}
                            disabled={isSubmitting}
                            className="h-10 md:h-12 bg-rose-600 hover:bg-black text-white px-6 md:px-8 font-black uppercase tracking-[0.2em] text-[10px] md:text-xs rounded-none shadow-xl transition-all gap-2"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {isSubmitting ? "Processing..." : "Finalize Dispensing"}
                        </Button>
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

            {/* Main Clinical Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-slate-50/30 pb-24">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 max-w-7xl mx-auto">
                    
                    {/* Prescription Detail Column */}
                    <div className="xl:col-span-7 space-y-8">
                        <div className="bg-white border-2 border-orange-100 rounded-none shadow-sm overflow-hidden">
                            <div className="bg-orange-100 text-orange-600 px-6 py-3 flex items-center justify-between border-l-4 border-orange-600">
                                <div className="flex items-center gap-3">
                                    <ClipboardList className="w-4 h-4 text-orange-600" />
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em]">Medication Order #Rx-{patient.id?.slice(-6)}</h3>
                                </div>
                                <Badge variant="outline" className="border-orange-300 text-orange-600 text-[8px] font-black uppercase tracking-widest rounded-none bg-white/50">Official Rx</Badge>
                            </div>
                            
                            <div className="p-6 space-y-6">
                                {/* Diagnosis Header */}
                                <div className="bg-slate-50 p-4 border-l-4 border-slate-200">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Clinical Diagnosis</span>
                                    <p className="text-xs font-black text-slate-900 uppercase leading-relaxed">{consultation?.diagnosisText || "No recorded diagnosis"}</p>
                                </div>

                                {/* Medication List Table */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                                        <div className="col-span-5">Drug / Preparation</div>
                                        <div className="col-span-3 text-center">Dosage</div>
                                        <div className="col-span-2 text-center">Frequency</div>
                                        <div className="col-span-2 text-right">Eye</div>
                                    </div>

                                    <div className="space-y-3">
                                        {Array.isArray(consultation?.medicalPrescription) ? (
                                            consultation.medicalPrescription.map((m: any, i: number) => (
                                                <div key={i} className="grid grid-cols-12 gap-4 px-4 py-4 border-b border-slate-100 items-center bg-white hover:bg-orange-50/30 transition-colors">
                                                    <div className="col-span-5">
                                                        <div className="flex items-center gap-3">
                                                            <span className="w-6 h-6 flex items-center justify-center bg-orange-600 text-white text-[10px] font-black">{i+1}</span>
                                                            <p className="font-black text-slate-900 uppercase text-[11px] tracking-tight">{m.drug || m.medicine}</p>
                                                        </div>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 pl-9">Duration: {m.duration}</p>
                                                    </div>
                                                    <div className="col-span-3 text-center text-[11px] font-bold text-slate-600">{m.dosage}</div>
                                                    <div className="col-span-2 text-center">
                                                        <Badge variant="outline" className="rounded-none border-orange-100 text-orange-600 text-[9px] font-black">{m.frequency}</Badge>
                                                    </div>
                                                    <div className="col-span-2 text-right">
                                                        <span className={cn(
                                                            "px-2 py-0.5 text-[10px] font-black uppercase",
                                                            m.eye === 'OD' ? 'bg-blue-50 text-blue-600' : m.eye === 'OS' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'
                                                        )}>{m.eye}</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-12 text-center">
                                                <AlertCircle className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 italic">No structured medication list found</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dispensing Action Column */}
                    <div className="xl:col-span-5 space-y-8">
                        {/* Dispatch Control */}
                        <div className="bg-white border-2 border-slate-200 rounded-none shadow-sm">
                            <div className="p-6 space-y-6">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 border-b border-slate-100 pb-3">Dispensing Control</h3>
                                
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Internal Pharmacist Notes</label>
                                        <textarea 
                                            className="w-full h-32 p-4 text-[11px] font-bold border-2 border-slate-100 rounded-none focus:border-orange-600 focus:ring-0 transition-all bg-white placeholder:text-slate-300"
                                            placeholder="Enter inventory details, batch numbers, or dispensing remarks..."
                                            value={pharmacistNotes}
                                            onChange={(e) => setPharmacistNotes(e.target.value)}
                                            disabled={completed}
                                        />
                                    </div>

                                    <div className="bg-blue-50 p-4 border-l-4 border-blue-600">
                                        <div className="flex gap-3">
                                            <Activity className="w-4 h-4 text-blue-600 shrink-0" />
                                            <div>
                                                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Dispensing Verification</p>
                                                <p className="text-[10px] font-bold text-blue-800 leading-relaxed italic">
                                                    Ensure all drug labels match the prescribed dosage and patient identification MR-{patient.mrNumber} is verified before final dispatch.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Summary Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-100 p-6 text-center">
                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Patient Contact</span>
                                <span className="block text-sm font-black text-slate-900 font-mono tracking-tighter">{patient.contactNumber || "N/A"}</span>
                            </div>
                            <div className="bg-slate-900 p-6 text-center text-white">
                                <span className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Session Slot</span>
                                <span className="block text-sm font-black uppercase">{calculateSessionSlot(patient, doctors) || "No Slot"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="bg-white border-t border-slate-200 p-6 shadow-2xl z-30">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="h-14 px-8 rounded-none border-2 border-slate-200 font-black uppercase text-[10px] tracking-widest hover:bg-orange-600 hover:text-white transition-all gap-3" onClick={() => setShowPrint(true)}>
                            <Printer className="w-4 h-4" /> Print Invoice
                        </Button>
                    </div>

                    <div className="flex items-center gap-6 w-full sm:w-auto">
                        {!completed && (
                            <div className="flex items-center gap-3 text-slate-400 pr-4 border-r border-slate-100 mr-2 hidden lg:flex">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-[9px] font-black uppercase tracking-widest italic">Verification Required</span>
                            </div>
                        )}
                        <Button
                            size="lg"
                            className={cn(
                                "h-14 px-12 rounded-none font-black uppercase tracking-[0.2em] transition-all text-[10px] w-full sm:w-auto shadow-xl gap-3",
                                completed ? "bg-slate-100 text-slate-400 pointer-events-none" : "bg-emerald-600 text-white hover:bg-black"
                            )}
                            onClick={handleComplete}
                            disabled={completed || isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {completed ? "Visit Finalized" : "Confirm Dispatch"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Print Modal */}
            <Dialog open={showPrint} onOpenChange={setShowPrint}>
                <DialogContent className="max-w-xl p-0 border-0 rounded-none overflow-hidden shadow-2xl">
                    <div className="bg-orange-600 p-6 text-center no-print">
                        <h2 className="text-white font-black uppercase tracking-[0.4em] text-xs">Pharmacy Bill Preview</h2>
                    </div>
                    <div id="print-section" className="bg-white p-10 space-y-8">
                        <div className="text-center flex flex-col items-center leading-none">
                            <div className="flex flex-col items-center gap-0.5 leading-none mb-3">
                                <span
                                    style={{ fontFamily: "'Outfit', sans-serif" }}
                                    className="font-extrabold text-xl tracking-tight leading-none"
                                >
                                    <span style={{ color: "#0F172A" }}>Vision</span>
                                    <span style={{ color: "#2563EB" }}>Pulze</span>
                                </span>
                                <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400 mt-0.5">
                                    Ophthalmic Ecosystem
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-[10px] py-6 border-y border-slate-100">
                            <div><span className="text-slate-400 font-black uppercase tracking-widest block mb-1">Patient Name</span> <p className="font-black text-orange-600 uppercase text-xs">{patient.name}</p></div>
                            <div><span className="text-slate-400 font-black uppercase tracking-widest block mb-1">MR Number</span> <p className="font-black text-orange-600 font-mono text-xs">MR-{patient.mrNumber}</p></div>
                            <div><span className="text-slate-400 font-black uppercase tracking-widest block mb-1">Visit Date</span> <p className="font-bold text-slate-800">{new Date().toLocaleDateString("en-IN")}</p></div>
                            <div><span className="text-slate-400 font-black uppercase tracking-widest block mb-1">Token No.</span> <p className="font-bold text-slate-800 uppercase tracking-tighter">Token-{patient.tokenNumber}</p></div>
                        </div>

                        <div className="space-y-4">
                            <h5 className="text-[10px] font-black uppercase text-slate-900 tracking-[0.2em] border-b-2 border-slate-900 pb-1 w-fit">Bill Summary</h5>
                            <table className="w-full text-[10px]">
                                <thead className="border-b border-slate-200">
                                    <tr className="text-slate-400 font-black uppercase text-left">
                                        <th className="py-2">Item Description</th>
                                        <th className="py-2 text-center">Dosage</th>
                                        <th className="py-2 text-right">Eye</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.isArray(consultation?.medicalPrescription) && consultation.medicalPrescription.map((m: any, i: number) => (
                                        <tr key={i} className="border-b border-slate-50">
                                            <td className="py-3 font-black text-slate-900 uppercase">{m.drug || m.medicine}</td>
                                            <td className="py-3 text-center font-bold text-slate-600">{m.dosage}</td>
                                            <td className="py-3 text-right font-black text-orange-600">{m.eye}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="pt-12 flex justify-between items-end border-t border-slate-100 italic">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-orange-600 uppercase">Hospital Contact</p>
                                <p className="text-[8px] text-slate-400 font-bold">+91 4365 242000</p>
                            </div>
                            <div className="text-right">
                                <div className="w-24 h-px bg-slate-200 mb-2 ml-auto" />
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-900">Pharmacist Seal</p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="p-6 bg-slate-50 border-t flex flex-row items-center justify-center gap-4 no-print">
                        <Button variant="ghost" onClick={() => setShowPrint(false)} className="rounded-none font-bold text-slate-500 uppercase text-[10px] tracking-widest hover:bg-slate-100">Cancel</Button>
                        <Button className="rounded-none bg-orange-600 hover:bg-black font-black uppercase text-[10px] tracking-widest px-8 shadow-xl gap-3" onClick={() => window.print()}>
                            <Printer className="w-4 h-4" /> Print Document
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
