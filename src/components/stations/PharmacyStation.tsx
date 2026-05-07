import { useState, useEffect } from "react";
import { type Patient } from "@/data/mockData";
import { Printer, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getPatientAgeString, getPatientAgeNumber, calculateSessionSlot, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { API_BASE_URL } from "@/config";

export function PharmacyStation({ patient, doctors = [] }: { patient?: Patient | null, doctors?: any[] }) {
    const { toast } = useToast();
    const [showPrint, setShowPrint] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pharmacistNotes, setPharmacistNotes] = useState("");
    const consultation = patient?.consultation;
    
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
                    frameType: patient.optical?.frameType,
                    lensType: patient.optical?.lensType
                })
            });

            if (response.ok) {
                setCompleted(true);
                toast({ 
                    title: "Dispensing Completed", 
                    description: "Medications marked as dispensed and visit closed.",
                    className: "bg-emerald-600 text-white rounded-none border-0 font-bold"
                });
                window.dispatchEvent(new Event("patientQueueUpdated"));
            } else {
                const err = await response.json();
                throw new Error(err.message || "Failed to update status.");
            }
        } catch (error: any) {
            toast({ 
                variant: "destructive", 
                title: "Submission Failed", 
                description: error.message 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-1 p-4 sm:p-6 h-full flex flex-col overflow-y-auto bg-slate-50/30">
            {/* Station Header */}
            <div className="flex flex-col xl:grid xl:grid-cols-3 items-center gap-6 mb-6 bg-orange-50/80 border border-orange-200/60 p-4 shadow-sm text-slate-900">
                {/* Col 1: Identification Badges */}
                <div className="flex items-center gap-2">
                    {(() => {
                        const slot = calculateSessionSlot(patient, doctors);
                        if (!slot) return null;
                        return (
                            <Badge className="bg-blue-600 text-white text-[10px] px-2 font-bold rounded-none h-6 border-0">
                                {slot}
                            </Badge>
                        );
                    })()}
                    <Badge className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] px-2 font-bold rounded-none h-6">
                        Token-{patient?.tokenNumber || "—"}
                    </Badge>
                    <Badge className="bg-orange-50 text-orange-600 border border-orange-200 text-[10px] px-2 font-mono tracking-widest rounded-none h-6">MR-{patient?.mrNumber || "0000"}</Badge>
                </div>

                {/* Col 2: Patient Name & Details (Centered) */}
                <div className="flex flex-col items-center justify-center text-center">
                    <span className="text-xl md:text-2xl text-slate-900 font-black uppercase tracking-tight leading-none mb-1">{patient?.name || "Unknown Patient"}</span>
                    <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 mt-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                            {getPatientAgeString(patient)} • {patient?.gender} • {patient?.city || "Primary Center"}
                        </span>
                        <div className="hidden md:block h-3 w-px bg-slate-200" />
                        <div className="flex flex-wrap justify-center items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Consultant:</span>
                                <span className="text-[10px] font-black text-orange-600 uppercase tracking-tight">{consultation?.doctorName || patient?.consultingDoctor?.name || "Dr. Gajendran"}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Optometrist:</span>
                                <span className="text-[10px] font-black text-orange-600 uppercase tracking-tight">{(patient as any)?.refraction?.optometrist?.name || "Not Attended"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Col 3: Status Indicator (Right Aligned) */}
                <div className="flex justify-end items-center gap-3">
                    {completed && (
                        <Badge className="bg-emerald-600 text-white border-0 gap-1.5 rounded-none px-4 py-1.5 h-auto font-black uppercase text-[10px] tracking-widest shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Completed
                        </Badge>
                    )}
                </div>
            </div>

            {!consultation ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">No Active Consultation Found</p>
                </div>
            ) : (

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Prescription Card */}
                <Card className="shadow-sm border-status-pharmacy/20">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Doctor's Prescription</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div>
                            <p className="text-[11px] text-muted-foreground">Diagnosis</p>
                            <p className="font-bold text-[orange-600] uppercase text-xs">{consultation?.diagnosisText || "Not recorded"}</p>
                        </div>
                        <Separator />
                        <div>
                            <p className="text-[11px] text-muted-foreground">Prescription Type</p>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {Array.isArray(consultation?.prescriptionType) ? consultation.prescriptionType.map((t: string) => (
                                    <Badge key={t} className="bg-accent/10 text-accent border-0 text-[10px] uppercase font-bold">{t}</Badge>
                                )) : <Badge className="bg-accent/10 text-accent border-0 text-[10px]">Medication</Badge>}
                            </div>
                        </div>
                        <Separator />
                        <div>
                            <p className="text-[11px] text-muted-foreground mb-1">Medication List</p>
                            <div className="space-y-1 text-xs bg-muted/50 rounded-md p-2">
                                {(() => {
                                    const meds = consultation?.medicalPrescription;
                                    if (!meds) return <p className="text-muted-foreground italic">No medications prescribed</p>;
                                    
                                    if (typeof meds === 'string') return <p className="font-bold text-slate-700">{meds}</p>;
                                    
                                    if (Array.isArray(meds)) {
                                        return meds.map((m: any, i: number) => (
                                            <div key={i} className="mb-2 last:mb-0 pb-2 border-b border-slate-200 last:border-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[8px] font-bold">{i+1}</span>
                                                    <p className="font-black text-[orange-600] uppercase text-[10px]">{m.drug || m.medicine}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 pl-6">
                                                    <p className="text-[9px] text-slate-500 font-bold uppercase"><span className="opacity-50">Dose:</span> {m.dosage}</p>
                                                    <p className="text-[9px] text-slate-500 font-bold uppercase"><span className="opacity-50">Freq:</span> {m.frequency}</p>
                                                    <p className="text-[9px] text-slate-500 font-bold uppercase"><span className="opacity-50">Dur:</span> {m.duration}</p>
                                                    <p className="text-[9px] text-slate-500 font-bold uppercase"><span className="opacity-50">Eye:</span> {m.eye}</p>
                                                </div>
                                            </div>
                                        ));
                                    }
                                    return <p>{JSON.stringify(meds)}</p>;
                                })()}
                            </div>
                        </div>
                        <Separator />
                        <div>
                            <p className="text-[11px] text-muted-foreground">Doctor</p>
                            <p className="font-bold text-[orange-600] uppercase text-xs">{consultation?.doctorName || consultation?.doctor?.name || "Dr. Gajendran"}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Dispensing Form */}
                <div className="col-span-2 space-y-6">
                    {/* Medication Detail */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Medication Dispensing</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1.5 col-span-1">
                                    <Label className="text-xs font-medium">Prescription Summary</Label>
                                    <div className="p-2 bg-slate-50 border border-slate-100 text-[11px] font-bold text-slate-700 min-h-[40px]">
                                        {Array.isArray(consultation?.medicalPrescription) 
                                            ? `${consultation.medicalPrescription.length} Medications Prescribed` 
                                            : (typeof consultation?.medicalPrescription === 'string' ? consultation.medicalPrescription : "Clinical Rx Available")}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Dispensing Status</Label>
                                    <Badge className={cn(
                                        "w-full h-10 flex items-center justify-center rounded-none border-0 font-black uppercase text-[10px] tracking-widest",
                                        completed ? "bg-emerald-100 text-emerald-700" : "bg-blue-50 text-blue-700"
                                    )}>
                                        {completed ? "Fulfillment Complete" : "Pending Action"}
                                    </Badge>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Pharmacist Notes</Label>
                                    <Input 
                                        placeholder="Enter internal notes..." 
                                        disabled={completed} 
                                        className="disabled:opacity-80 rounded-none h-10 border-slate-200 text-xs font-bold" 
                                        value={pharmacistNotes}
                                        onChange={(e) => setPharmacistNotes(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row justify-end gap-4 mt-10 pb-12 border-t border-slate-100 pt-8">
                        <Button variant="outline" className="h-12 w-full sm:w-auto px-8 rounded-none border-slate-300 font-black uppercase text-[10px] tracking-widest hover:bg-orange-600 hover:text-white transition-all gap-3" onClick={() => setShowPrint(true)}>
                            <Printer className="w-4 h-4" />
                            Print Bill
                        </Button>
                        <Button
                            className={cn(
                                "h-12 w-full sm:w-auto px-8 rounded-none font-black uppercase text-[10px] tracking-widest shadow-lg transition-all gap-3 disabled:pointer-events-none disabled:cursor-not-allowed",
                                completed ? "bg-orange-600 text-white opacity-80" : "bg-emerald-600 hover:bg-black text-white"
                            )}
                            onClick={handleComplete}
                            disabled={completed || isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {completed ? "Order Synchronized" : "Mark as Dispensed"}
                        </Button>
                    </div>
                </div>
            </div>
            )}

            {/* Print Preview Modal */}
            <Dialog open={showPrint} onOpenChange={setShowPrint}>
                <DialogContent className="max-w-lg p-0 border-0 rounded-none overflow-hidden shadow-2xl">
                    <DialogHeader className="p-6 bg-orange-600 border-0 rounded-none flex flex-row items-center justify-between space-y-0">
                        <DialogTitle className="text-white font-black uppercase tracking-[0.3em] text-[10px]">Pharmacy Bill Preview</DialogTitle>
                    </DialogHeader>
                    <div className="bg-white p-8 space-y-6">
                        <div className="text-center border-b border-slate-100 pb-6 flex flex-col items-center">
                            <img
                                src="https://res.cloudinary.com/autodapp/image/upload/v1775219907/VPN%20Eye%20Hospital%20Logo.png"
                                alt="VPN Eye Hospital"
                                className="h-12 w-auto object-contain mb-2"
                            />
                            <h4 className="text-sm font-black text-[orange-600] uppercase tracking-tighter">Pharmacy Invoice</h4>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Nagapattinam • Primary Care Center</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-[10px] bg-slate-50 p-4 border border-slate-100">
                            <div><span className="text-slate-400 font-black uppercase tracking-widest">MR Number:</span> <p className="font-black text-[orange-600] font-mono">MR-{patient?.mrNumber}</p></div>
                            <div><span className="text-slate-400 font-black uppercase tracking-widest">Patient Name:</span> <p className="font-black text-[orange-600] uppercase">{patient?.name}</p></div>
                            <div><span className="text-slate-400 font-black uppercase tracking-widest">Invoice Date:</span> <p className="font-bold text-slate-800">{new Date().toLocaleDateString("en-IN")}</p></div>
                            <div><span className="text-slate-400 font-black uppercase tracking-widest">Consultant:</span> <p className="font-bold text-slate-800 uppercase">{consultation?.doctorName || patient?.consultingDoctor?.name || "Dr. Gajendran"}</p></div>
                        </div>
                        
                        <div className="space-y-4">
                            <h5 className="text-[10px] font-black uppercase text-slate-900 border-b border-slate-900 pb-1 w-fit tracking-widest">Dispensed Medications</h5>
                            <div className="space-y-2">
                                {(() => {
                                    const meds = consultation?.medicalPrescription;
                                    if (!meds) return <p className="text-[10px] italic text-slate-400">No active prescription found.</p>;
                                    if (typeof meds === 'string') return <div className="p-3 bg-slate-50/50 border border-slate-100 font-bold text-xs">{meds}</div>;
                                    if (Array.isArray(meds)) {
                                        return meds.map((m: any, i: number) => (
                                            <div key={i} className="flex justify-between items-start text-[10px] border-b border-slate-100 pb-2 last:border-0">
                                                <div>
                                                    <p className="font-black text-[orange-600] uppercase">{m.drug || m.medicine || m.name}</p>
                                                    <p className="text-slate-400 font-bold uppercase">{m.frequency} — {m.duration}</p>
                                                    <p className="text-[9px] text-slate-400">{m.dosage}</p>
                                                </div>
                                                <p className="font-bold text-slate-600">{m.eye}</p>
                                            </div>
                                        ));
                                    }
                                    return null;
                                })()}
                            </div>
                        </div>
                        <div className="pt-6 flex justify-between items-end border-t border-slate-100 italic">
                            <p className="text-[8px] text-slate-400 font-bold max-w-[150px] leading-relaxed">This invoice verifies medication dispensing at VPN Eye Hospital pharmacy counter.</p>
                            <div className="text-right">
                                <div className="w-20 h-px bg-slate-300 mb-1 ml-auto" />
                                <p className="text-[8px] font-black uppercase tracking-widest text-[orange-600]">Pharmacist</p>
                            </div>
                        </div>
                        <div className="pt-6 text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest border-t border-slate-100 mt-6">
                            Thank you for trusting us with your vision care.
                        </div>
                    </div>
                    <DialogFooter className="p-6 bg-slate-50 border-t flex items-center justify-center gap-4">
                        <Button variant="ghost" onClick={() => setShowPrint(false)} className="rounded-none font-bold text-slate-500 uppercase text-[10px] tracking-widest hover:bg-slate-100">Close</Button>
                        <Button className="rounded-none bg-[orange-600] hover:bg-black font-black uppercase text-[10px] tracking-widest px-8 shadow-xl gap-3" onClick={() => window.print()}>
                            <Printer className="w-4 h-4" />
                            Confirm & Print
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
