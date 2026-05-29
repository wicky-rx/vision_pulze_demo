import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar as CalendarIcon, MapPin, Clock, User, UserCheck, Settings, ArrowLeft, Plus, Trash2, X, Info, ChevronLeft, ChevronRight, Phone, PhoneCall, ChevronDown, ChevronUp, CalendarCheck, CheckCircle, PhoneOff, XCircle, CheckCheck } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatToAMPM } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DAYS = [
  { id: 1, name: "Monday" },
  { id: 2, name: "Tuesday" },
  { id: 3, name: "Wednesday" },
  { id: 4, name: "Thursday" },
  { id: 5, name: "Friday" },
  { id: 6, name: "Saturday" },
  { id: 0, name: "Sunday" },
];


export function DoctorSchedulesPanel({
  onScheduleAppointment
}: {
  onScheduleAppointment?: (mrNumber: string, name: string, followUpVisitId: string) => void
}) {
  const [viewMode, setViewMode] = useState<'DAILY' | 'MANAGE'>('DAILY');
  const [date, setDate] = useState<Date>(new Date());
  
  // Data states
  const [allDoctors, setAllDoctors] = useState<any[]>([]);
  const [dailySchedules, setDailySchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Manage states
  const [selectedManageDoctorId, setSelectedManageDoctorId] = useState<string>("");
  const [manageSchedules, setManageSchedules] = useState<any[]>([]);
  const [newSlot, setNewSlot] = useState({ dayOfWeek: "1", startTime: "09:00", endTime: "13:00" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Follow-up States
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const [followUpFilter, setFollowUpFilter] = useState<'WEEK' | 'MONTH' | 'ALL'>('WEEK');
  const [isFollowUpsCollapsed, setIsFollowUpsCollapsed] = useState(true);
  const [hasManuallyToggled, setHasManuallyToggled] = useState(false);

  const filteredFollowUps = followUps.filter((item: any) => {
    if (!item.followUpDate) return false;
    const dateObj = new Date(item.followUpDate);
    const today = new Date();

    // Set hours to 0 to compare dates accurately
    today.setHours(0, 0, 0, 0);
    dateObj.setHours(0, 0, 0, 0);

    if (followUpFilter === 'WEEK') {
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(today.getDate() + 7);
      return dateObj <= sevenDaysFromNow;
    }

    if (followUpFilter === 'MONTH') {
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      return dateObj <= thirtyDaysFromNow;
    }

    return true; // ALL
  });

  const weeklyUnattendedCount = followUps.filter((item: any) => {
    if (!item.followUpDate) return false;
    const dateObj = new Date(item.followUpDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateObj.setHours(0, 0, 0, 0);

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);
    if (dateObj > sevenDaysFromNow) return false;

    // Check if resolved
    const hasAppt = item.patient?.appointments && item.patient.appointments.length > 0;
    if (hasAppt || item.followUpStatus === 'CONFIRMED' || item.followUpStatus === 'ALREADY_VISITED') {
      return false;
    }
    return true;
  }).length;

  const hasFollowUps = filteredFollowUps.length > 0;
  const hasUnattendedFollowUps = weeklyUnattendedCount > 0;

  const sortedFollowUps = [...filteredFollowUps].sort((a, b) => {
    const getWeight = (item: any) => {
      const hasAppt = item.patient?.appointments && item.patient.appointments.length > 0;
      if (hasAppt || item.followUpStatus === 'CONFIRMED') return 2;
      if (item.followUpStatus === 'ALREADY_VISITED') return 3;
      if (item.followUpStatus === 'NOT_REACHABLE') return 1;
      if (item.followUpStatus === 'NOT_CONFIRMED') return 1;
      return 0; // PENDING
    };

    const weightA = getWeight(a);
    const weightB = getWeight(b);

    if (weightA !== weightB) {
      return weightA - weightB;
    }

    return new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime();
  });

  // Alert Dialog state
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ 
    title: "", 
    description: "", 
    action: () => {} 
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchDailyData();
    fetchFollowUps();
    
    const handleUpdate = () => {
      fetchDailyData();
      fetchFollowUps();
    };
    window.addEventListener("appointmentUpdated", handleUpdate);
    window.addEventListener("patientUpdated", handleUpdate);
    return () => {
      window.removeEventListener("appointmentUpdated", handleUpdate);
      window.removeEventListener("patientUpdated", handleUpdate);
    };
  }, [date]);

  useEffect(() => {
    if (viewMode === 'DAILY') {
      fetchDailyData();
      fetchFollowUps();
    } else if (viewMode === 'MANAGE' && allDoctors.length === 0) {
      fetchDailyData(); 
    }
  }, [viewMode]);

  useEffect(() => {
    if (selectedManageDoctorId) {
      fetchManageSchedules(selectedManageDoctorId);
    } else {
      setManageSchedules([]);
    }
  }, [selectedManageDoctorId]);

  const fetchDailyData = async () => {
    setLoading(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      
      const doctors = await api.getDoctorSlots();
      if (!Array.isArray(doctors)) throw new Error("Invalid doctors data format");
      setAllDoctors(doctors);

      const apps = await api.getDailyAppointments(dateStr);
      if (!Array.isArray(apps)) throw new Error("Invalid appointments data format");

      const dayOfWeek = date.getDay();
      const doctorsWithTodaySchedule = doctors.map((doc: any) => {
        const docApps = apps.filter((a: any) => a.doctorId === doc.id);
        
        // Deduplicate appointments by patient MRN - keep latest
        const uniqueAppsMap = new Map();
        docApps.forEach((app: any) => {
          const mrn = app.patient?.mrNumber;
          if (mrn) {
            const existing = uniqueAppsMap.get(mrn);
            if (!existing || new Date(app.createdAt) > new Date(existing.createdAt)) {
              uniqueAppsMap.set(mrn, app);
            }
          } else {
            // If no MRN, allow it (might be a placeholder)
            uniqueAppsMap.set(app.id, app);
          }
        });

        return {
          ...doc,
          todaySlots: doc.schedules?.filter((s: any) => s.dayOfWeek === dayOfWeek) || [],
          todayAppointments: Array.from(uniqueAppsMap.values()).filter((a: any) => a.status === 'PENDING')
        };
      }).filter((doc: any) => doc.todaySlots.length > 0 || doc.todayAppointments.length > 0);

      setDailySchedules(doctorsWithTodaySchedule);
    } catch (e) {
      console.error("Error fetching daily data", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowUps = async () => {
    setFollowUpsLoading(true);
    try {
      const data = await api.getFollowUps();
      setFollowUps(data);
    } catch (e) {
      console.error("Error fetching follow-ups", e);
    } finally {
      setFollowUpsLoading(false);
    }
  };

  const handleUpdateFollowUpStatus = async (visitId: string, status: string) => {
    const originalFollowUps = [...followUps];

    // Optimistic state update
    setFollowUps(prev => prev.map(item =>
      item.id === visitId ? { ...item, followUpStatus: status } : item
    ));

    try {
      await api.updateFollowUpStatus(visitId, status);
    } catch (err: any) {
      // Rollback on failure
      setFollowUps(originalFollowUps);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message
      });
    }
  };

  const fetchManageSchedules = async (doctorId: string) => {
    setLoading(true);
    try {
      const data = await api.getDoctorSchedules(doctorId);
      setManageSchedules(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error fetching schedules", e);
      setManageSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlot = async () => {
    if (!selectedManageDoctorId) return;
    setIsSubmitting(true);
    try {
      await api.addDoctorSchedule(selectedManageDoctorId, newSlot);
      toast({ title: "Slot added successfully" });
      fetchManageSchedules(selectedManageDoctorId);
      window.dispatchEvent(new CustomEvent("patientQueueUpdated"));
    } catch (e: any) {
      console.error("Error adding slot", e);
      toast({ variant: "destructive", title: "Please check, slot time mismatched", description: e.message || "Could not add slot" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSlot = (id: string) => {
    setAlertConfig({
      title: "Remove Slot?",
      description: "Are you sure you want to remove this availability slot?",
      action: async () => {
        try {
          await api.deleteDoctorSchedule(id);
          toast({ title: "Slot removed successfully" });
          fetchManageSchedules(selectedManageDoctorId);
          window.dispatchEvent(new CustomEvent("patientQueueUpdated"));
        } catch (e) {
          console.error("Error deleting slot", e);
        }
      }
    });
    setAlertOpen(true);
  };

  const handleDeleteAppointment = (id: string, patientName: string) => {
    setAlertConfig({
      title: "Delete Appointment?",
      description: `Are you sure you want to delete the appointment for ${patientName}? This action cannot be undone.`,
      action: async () => {
        try {
          await api.deleteAppointment(id);
          toast({ title: "Appointment deleted successfully" });
          fetchDailyData();
        } catch (e) {
          console.error("Error deleting appointment", e);
        }
      }
    });
    setAlertOpen(true);
  };

  const handleCreateVisit = async (appointmentId: string) => {
    try {
      const data = await api.convertAppointmentToVisit(appointmentId);
      if (data && data.success) {
        toast({ title: "Patient added to today's visit queue" });
        fetchDailyData();
        window.dispatchEvent(new CustomEvent("patientQueueUpdated"));
      } else {
        toast({ 
          variant: "destructive", 
          title: "Visit Creation Failed", 
          description: "Could not convert appointment to visit" 
        });
      }
    } catch (e: any) {
      console.error("Error converting appointment to visit", e);
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: e.message || "Failed to create visit" 
      });
    }
  };

  return (
    <div className="w-full lg:w-[320px] shrink-0 h-auto lg:h-full flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 pb-8 lg:pb-0 px-2 lg:px-0 lg:pl-4 bg-white relative z-10 overflow-x-hidden lg:overflow-y-hidden">
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertConfig.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertConfig.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={alertConfig.action} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            {viewMode === 'DAILY' ? (
               <><CalendarIcon className="w-4 h-4 text-orange-600" /> Appointments Panel</>
            ) : (
               <><Settings className="w-4 h-4 text-orange-600" /> Manage Slots</>
            )}
          </h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 rounded-full"
            onClick={() => setViewMode(v => v === 'DAILY' ? 'MANAGE' : 'DAILY')}
            title={viewMode === 'DAILY' ? 'Manage Doctor Slots' : 'Back to Daily View'}
          >
            {viewMode === 'DAILY' ? <Settings className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          </Button>
        </div>

        {viewMode === 'DAILY' ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
              onClick={() => setDate(d => subDays(d, 1))}
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex-1 justify-start text-sm h-10 font-bold bg-white border-slate-200 text-slate-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 data-[state=open]:bg-orange-50 data-[state=open]:text-orange-600 data-[state=open]:border-orange-200 transition-all duration-300 rounded-none shadow-sm group">
                  <CalendarIcon className="mr-2 h-4 w-4 text-slate-400 group-hover:text-orange-600 group-data-[state=open]:text-orange-600 transition-colors" />
                  {format(date, "MMMM do, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
              onClick={() => setDate(d => addDays(d, 1))}
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Select Doctor</Label>
            <Select value={selectedManageDoctorId} onValueChange={setSelectedManageDoctorId}>
              <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                <SelectValue placeholder="Identify Doctor..." />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(allDoctors) && allDoctors.map(doc => (
                  <SelectItem key={doc.id} value={doc.id} className="text-xs group">
                    <div className="flex flex-col py-0.5">
                      <span className="font-semibold group-hover:text-orange-900 group-focus:text-orange-900 group-data-[state=checked]:text-orange-900 transition-colors">{doc.name}</span>
                      <span className="text-[9px] text-muted-foreground/70 group-hover:text-orange-900/80 group-focus:text-orange-900/80 group-data-[state=checked]:text-orange-900/80 uppercase tracking-tight mt-1 transition-colors">{doc.specialization?.name || "General Specialist"}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-4 min-h-0">
        {viewMode === 'DAILY' ? (
          <>
            {/* Top: Appointments list */}
            <div className="flex-1 flex flex-col min-h-[45%] border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase text-slate-400 font-black tracking-wider">Scheduled Slots & Bookings</span>
                {loading && <span className="text-[10px] text-slate-400 animate-pulse">Refreshing...</span>}
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                {loading ? (
                  <div className="py-12 text-center text-slate-400 text-xs">Loading data...</div>
                ) : dailySchedules.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs italic">No doctors scheduled for this date</div>
                ) : (
                  dailySchedules.map((doc) => (
                    <Card key={doc.id} className="border-slate-200 shadow-none overflow-hidden bg-white">
                      <div className="bg-slate-50/50 p-2.5 border-b border-slate-100">
                        <p className="text-sm font-bold text-slate-900 truncate">{doc.name}</p>
                        <p className="text-[11px] text-slate-500 uppercase tracking-tighter">{doc.specialization?.name || "General"}</p>
                      </div>
                      <CardContent className="p-2 space-y-3">
                        <div className="space-y-1.5">
                           <p className="text-xs text-slate-400 font-bold px-0.5">Availability</p>
                            {doc.todaySlots
                              .sort((a: any, b: any) => {
                                const [ah, am] = a.startTime.split(":").map(Number);
                                const [bh, bm] = b.startTime.split(":").map(Number);
                                return (ah * 60 + am) - (bh * 60 + bm);
                              })
                              .map((s: any, idx: number) => {
                                const isToday = date.toDateString() === new Date().toDateString();
                                const now = new Date();
                                const currentTimeNum = now.getHours() * 60 + now.getMinutes();
                                const [eh, em] = s.endTime.split(":").map(Number);
                                const endNum = eh * 60 + em;
                                const isEnded = isToday && endNum <= currentTimeNum;

                                return (
                                  <div key={s.id} className={cn(
                                    "flex items-center gap-1.5 text-xs border rounded px-2.5 py-1.5 transition-all",
                                    isEnded
                                      ? "bg-slate-100/50 border-slate-200 text-slate-400 grayscale-[0.5]"
                                      : "bg-slate-50 border-slate-100/50 text-slate-600"
                                  )}>
                                     <span className={cn(
                                       "font-black mr-1 min-w-[16px]",
                                       isEnded ? "text-slate-300" : "text-primary/40"
                                     )}>S{idx+1}</span>
                                     <Clock className={cn("w-3 h-3", isEnded ? "text-slate-300" : "text-primary/60")} />
                                     <span className={cn(isEnded && "line-through opacity-60")}>
                                       {formatToAMPM(s.startTime)} - {formatToAMPM(s.endTime)}
                                     </span>
                                  </div>
                                );
                            })}
                        </div>

                        <div className="space-y-1.5">
                           <p className="text-xs text-slate-400 font-bold px-0.5">Appointments ({doc.todayAppointments.length})</p>
                           <div className="space-y-1.5 max-h-[180px] overflow-y-auto scrollbar-thin pr-1 pb-1">
                              {doc.todayAppointments.length === 0 ? (
                                 <p className="text-xs text-slate-300 italic px-1">No bookings yet</p>
                              ) : (
                                 doc.todayAppointments.map((app: any) => (
                                   <div key={app.id} className="group relative flex items-center justify-between p-2 rounded-lg bg-orange-50/30 border border-orange-100/30 hover:bg-orange-100/20 transition-all">
                                      <div className="min-w-0 flex-1 mr-2">
                                         <div className="flex items-center justify-between gap-3">
                                            <p className="text-sm font-bold text-slate-900 truncate tracking-tight">{app.patient?.name}</p>
                                            <p className="text-xs text-slate-500 font-bold font-mono tracking-tighter shrink-0">{app.patient?.mrNumber}</p>
                                         </div>
                                         <div className="flex items-center gap-1.5 mt-0.5 overflow-hidden">
                                            {app.appointmentId && (
                                              <p className="text-[11px] text-orange-600/70 font-bold shrink-0">ID: {app.appointmentId}</p>
                                            )}
                                            {app.timeSlot && (
                                              <div className="text-[11px] text-orange-600/90 font-bold shrink-0 flex items-center gap-1.5 border-l border-slate-200 pl-1.5 ml-0.5">
                                                 {(() => { const slotIdx = doc.todaySlots.findIndex((s: any) => `${s.startTime}-${s.endTime}` === app.timeSlot); const slotLabel = slotIdx !== -1 ? `S${slotIdx + 1}` : "W"; return <span className="bg-orange-50 text-orange-600 px-1 py-0.5 text-[9px] font-black rounded-sm leading-none min-w-[16px] text-center border border-orange-200/60 tracking-tighter">{slotLabel}</span>; })()} {app.patient?.city && ( <span className="text-slate-400 font-medium ml-0.5 flex items-center gap-1 truncate max-w-[80px]"> <MapPin className="w-2.5 h-2.5 text-slate-300" /> {app.patient.city} </span> )}
                                              </div>
                                            )}
                                            {app.notes && (
                                              <div className="border-l border-slate-200 pl-1.5 ml-0.5 pt-px">
                                                <TooltipProvider delayDuration={0}>
                                                  <Tooltip>
                                                    <TooltipTrigger asChild>
                                                      <div className="cursor-help transition-colors hover:text-orange-600">
                                                        <Info className="w-3 h-3 text-slate-400" />
                                                      </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-[200px] text-xs p-2 bg-slate-900 text-white border-0 shadow-xl">
                                                      <p className="font-medium mb-1 border-b border-white/10 pb-1 text-xs opacity-70">Instructional Note:</p>
                                                      <p>{app.notes}</p>
                                                    </TooltipContent>
                                                  </Tooltip>
                                                </TooltipProvider>
                                              </div>
                                            )}
                                         </div>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0 ml-1">
                                         {app.status === 'PENDING' && (
                                           <>
                                            {date.toDateString() === new Date().toDateString() && (
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 rounded-full bg-orange-50 hover:bg-orange-600 hover:text-white text-orange-600 border border-orange-200/50 transition-colors shrink-0"
                                                onClick={() => handleCreateVisit(app.id)}
                                                title="Add to Visit Queue"
                                              >
                                                <UserCheck className="w-3.5 h-3.5" />
                                              </Button>
                                            )}
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-7 w-7 rounded-full text-slate-300 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                                              onClick={() => handleDeleteAppointment(app.id, app.patient?.name)}
                                              title="Delete Appointment"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </Button>
                                           </>
                                         )}
                                         {app.status === 'VISITED' && (
                                           <Badge variant="secondary" className="bg-green-100 text-[11px] h-5 px-1.5 text-green-700 border-green-200">Visited</Badge>
                                         )}
                                      </div>
                                   </div>
                                 ))
                              )}
                           </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* Bottom: Follow-up Reminders Section */}
            <div className={cn(
              "flex flex-col pt-2 pb-1 px-2.5 transition-all duration-300 border border-orange-100 bg-orange-50/10 rounded-lg shadow-sm mb-4",
              isFollowUpsCollapsed ? "h-auto min-h-0 flex-none" : "flex-1 min-h-[45%]"
            )}>
              <div
                className={cn(
                  "flex items-center justify-between mb-2 cursor-pointer p-1.5 -m-1.5 transition-all rounded-sm",
                  hasUnattendedFollowUps && isFollowUpsCollapsed
                    ? "bg-orange-50 border border-orange-200/50 hover:bg-orange-100/70 animate-pulse shadow-sm"
                    : "hover:bg-slate-50/80"
                )}
                onClick={() => {
                  setIsFollowUpsCollapsed(prev => !prev);
                  setHasManuallyToggled(true);
                }}
              >
                <span className={cn(
                  "text-[10px] uppercase font-black tracking-wider flex items-center gap-1.5 select-none",
                  hasFollowUps ? "text-orange-700" : "text-slate-400"
                )}>
                  <span className="relative inline-flex items-center">
                    <PhoneCall className={cn("w-3.5 h-3.5", hasFollowUps ? "text-orange-600" : "text-slate-400")} />
                    {hasUnattendedFollowUps && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-600"></span>
                      </span>
                    )}
                  </span>
                  <span>Follow-up Reminders</span>
                  <span className={cn(
                    "ml-1 px-1.5 py-0.5 text-[9px] font-black rounded-full leading-none min-w-[16px] text-center",
                    hasFollowUps ? "bg-orange-600 text-white" : "bg-slate-200 text-slate-500"
                  )}>
                    {filteredFollowUps.length}
                  </span>
                  {isFollowUpsCollapsed ? (
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  ) : (
                    <ChevronUp className="w-3 h-3 text-slate-400" />
                  )}
                </span>

                {!isFollowUpsCollapsed && (
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    {(['WEEK', 'MONTH', 'ALL'] as const).map((filterOpt) => (
                      <button
                        key={filterOpt}
                        type="button"
                        onClick={() => setFollowUpFilter(filterOpt)}
                        className={cn(
                          "px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tighter border transition-all rounded-none",
                          followUpFilter === filterOpt
                            ? "bg-orange-600 border-orange-600 text-white"
                            : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-orange-50 hover:text-orange-600"
                        )}
                      >
                        {filterOpt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!isFollowUpsCollapsed && (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {followUpsLoading ? (
                    <div className="py-12 text-center text-slate-400 text-xs">Loading follow-ups...</div>
                  ) : sortedFollowUps.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs italic">No follow-ups for this period</div>
                  ) : (
                    sortedFollowUps.map((item: any) => {
                      const scheduledDate = new Date(item.followUpDate);
                      const isToday = new Date().toDateString() === scheduledDate.toDateString();
                      const hasAppt = item.patient?.appointments && item.patient.appointments.length > 0;

                      const getStatusBadge = () => {
                        if (hasAppt) {
                          return (
                            <Badge className="text-[8px] font-black uppercase px-1.5 h-6 rounded-none shrink-0 border bg-emerald-50 text-emerald-700 border-emerald-200/50 hover:bg-emerald-50 flex items-center gap-1 select-none pointer-events-none">
                              <CalendarCheck className="w-2.5 h-2.5 text-emerald-600" />
                              Appt Set
                            </Badge>
                          );
                        }
                        const status = item.followUpStatus || "PENDING";
                        switch (status) {
                          case "CONFIRMED":
                            return (
                              <Badge className="text-[8px] font-black uppercase px-1.5 h-6 rounded-none shrink-0 border bg-emerald-50 text-emerald-700 border-emerald-200/50 hover:bg-emerald-50 flex items-center gap-1 select-none pointer-events-none">
                                <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />
                                Confirmed
                              </Badge>
                            );
                          case "NOT_REACHABLE":
                            return (
                              <Badge className="text-[8px] font-black uppercase px-1.5 h-6 rounded-none shrink-0 border bg-amber-50 text-amber-700 border-amber-200/50 hover:bg-amber-50 flex items-center gap-1 select-none pointer-events-none">
                                <PhoneOff className="w-2.5 h-2.5 text-amber-600" />
                                No Reach
                              </Badge>
                            );
                          case "NOT_CONFIRMED":
                            return (
                              <Badge className="text-[8px] font-black uppercase px-1.5 h-6 rounded-none shrink-0 border bg-red-50 text-red-700 border-red-200/50 hover:bg-red-50 flex items-center gap-1 select-none pointer-events-none">
                                <XCircle className="w-2.5 h-2.5 text-red-600" />
                                No Conf
                              </Badge>
                            );
                          case "ALREADY_VISITED":
                            return (
                              <Badge className="text-[8px] font-black uppercase px-1.5 h-6 rounded-none shrink-0 border bg-emerald-50 text-emerald-700 border-emerald-200/50 hover:bg-emerald-50 flex items-center gap-1 select-none pointer-events-none">
                                <CheckCheck className="w-2.5 h-2.5 text-emerald-600" />
                                Visited
                              </Badge>
                            );
                          default:
                            return (
                              <Badge className="text-[8px] font-black uppercase px-1.5 h-6 rounded-none shrink-0 border bg-blue-50 text-blue-700 border-blue-200/50 hover:bg-blue-50 flex items-center gap-1 select-none pointer-events-none">
                                <Clock className="w-2.5 h-2.5 text-blue-600" />
                                Pending
                              </Badge>
                            );
                        }
                      };

                      return (
                        <Card key={item.id} className="border-slate-200 shadow-none bg-white hover:bg-slate-50/30 transition-colors">
                          <div className="p-2.5 flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-slate-900 truncate">{item.patient?.name}</p>
                                <TooltipProvider delayDuration={0}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="cursor-help text-slate-400 hover:text-orange-600 transition-colors shrink-0">
                                        <Info className="w-3.5 h-3.5" />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[280px] text-xs p-3 bg-slate-900 text-white border-0 shadow-xl space-y-2.5 rounded-none pointer-events-auto">
                                      <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Patient Details</p>
                                        <p className="font-bold text-white font-mono">MRN: {item.patient?.mrNumber || "—"}</p>
                                        <p className="font-bold text-white">Phone: {item.patient?.contactNumber || "—"}</p>
                                      </div>
                                      {item.followUpTimeFrame && (
                                        <div className="pt-1.5 border-t border-white/10 space-y-0.5">
                                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Scheduled Interval</p>
                                          <p className="font-semibold text-orange-400">{item.followUpTimeFrame}</p>
                                        </div>
                                      )}
                                      {item.consultation?.notes && (
                                        <div className="pt-1.5 border-t border-white/10 space-y-0.5">
                                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Doctor's Instruction</p>
                                          <p className="text-slate-200 italic font-medium leading-relaxed">{item.consultation.notes}</p>
                                        </div>
                                      )}
                                      {hasAppt && (
                                        <div className="pt-1.5 border-t border-white/10 space-y-1">
                                          <p className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Upcoming Appointment</p>
                                          <p className="font-bold text-white font-mono">Date: {format(new Date(item.patient.appointments[0].appointmentDate), "MMM d, yyyy")}</p>
                                          {item.patient.appointments[0].timeSlot && (
                                            <p className="font-bold text-white">Time: {item.patient.appointments[0].timeSlot}</p>
                                          )}
                                          <p className="font-bold text-white">Dr: {item.patient.appointments[0].doctor?.name || "Ophthalmologist"}</p>
                                        </div>
                                      )}
                                      {!hasAppt && (
                                        <div className="pt-2 border-t border-white/10 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Update Status</p>
                                          <div className="flex flex-wrap gap-1">
                                            {[
                                              { value: "PENDING", label: "Pending", color: "hover:bg-blue-600 hover:text-white border-blue-500 text-blue-400" },
                                              { value: "NOT_REACHABLE", label: "No Reach", color: "hover:bg-amber-600 hover:text-white border-amber-500 text-amber-400" },
                                              { value: "NOT_CONFIRMED", label: "No Conf", color: "hover:bg-red-600 hover:text-white border-red-500 text-red-400" },
                                              { value: "ALREADY_VISITED", label: "Visited", color: "hover:bg-emerald-600 hover:text-white border-emerald-500 text-emerald-400" },
                                            ].map((statusOpt) => {
                                              const isSelected = item.followUpStatus === statusOpt.value || (statusOpt.value === "PENDING" && !item.followUpStatus);
                                              return (
                                                <button
                                                  key={statusOpt.value}
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleUpdateFollowUpStatus(item.id, statusOpt.value);
                                                  }}
                                                  className={cn(
                                                    "px-1.5 py-0.5 text-[8px] font-black uppercase border rounded-sm transition-all cursor-pointer",
                                                    isSelected
                                                      ? "bg-orange-600 border-orange-600 text-white"
                                                      : cn("bg-slate-800", statusOpt.color)
                                                  )}
                                                >
                                                  {statusOpt.label}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <p className="text-[10px] text-slate-500 font-semibold truncate">
                                <span className="text-slate-400 font-medium">Dr:</span> {item.consultation?.doctorName || "Ophthalmologist"}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {getStatusBadge()}

                              {!hasAppt && item.followUpStatus !== "CONFIRMED" && item.followUpStatus !== "ALREADY_VISITED" && onScheduleAppointment && (
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => onScheduleAppointment(item.patient?.mrNumber, item.patient?.name, item.id)}
                                  className="h-6 w-6 border-orange-200 text-orange-600 hover:bg-orange-600 hover:text-white hover:border-orange-600 transition-all rounded-none shrink-0"
                                  title="Book Appointment"
                                >
                                  <CalendarIcon className="w-3.5 h-3.5" />
                                </Button>
                              )}

                              <Badge className={cn(
                                "text-[8px] font-black uppercase px-1.5 h-6 rounded-none shrink-0 border flex items-center justify-center",
                                isToday
                                  ? "bg-red-50 text-red-600 border-red-200/50"
                                  : "bg-orange-50 text-orange-600 border-orange-200/50"
                              )}>
                                {format(scheduledDate, "MMM d")}
                              </Badge>
                            </div>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-6">
            {!selectedManageDoctorId ? (
              <div className="py-20 text-center text-slate-400 text-xs italic bg-white border border-dashed border-slate-200 rounded-lg">
                Please select a doctor to manage their slots
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Add Availability</p>
                  
                  <div className="space-y-2">
                    <Label className="text-[10px]">Day</Label>
                    <Select value={newSlot.dayOfWeek} onValueChange={(v) => setNewSlot(p => ({ ...p, dayOfWeek: v }))}>
                      <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map(d => (
                          <SelectItem key={d.id} value={d.id.toString()} className="text-xs">{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                     <div className="space-y-1">
                        <Label className="text-[10px]">Start</Label>
                        <input 
                          type="time" 
                          className="flex h-8 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                          value={newSlot.startTime}
                          onChange={(e) => setNewSlot(p => ({ ...p, startTime: e.target.value }))}
                        />
                     </div>
                     <div className="space-y-1">
                        <Label className="text-[10px]">End</Label>
                        <input 
                          type="time" 
                          className="flex h-8 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                          value={newSlot.endTime}
                          onChange={(e) => setNewSlot(p => ({ ...p, endTime: e.target.value }))}
                        />
                     </div>
                  </div>

                  <Button className="w-full h-8 gap-2 text-xs bg-orange-600 hover:bg-black text-white rounded-none border border-transparent shadow-sm hover:shadow transition-colors" onClick={handleAddSlot} disabled={isSubmitting}>
                    <Plus className="w-3 h-3" />
                    {isSubmitting ? "Adding..." : "Add Slot"}
                  </Button>
                </div>

                <div className="space-y-2 pb-4">
                   <p className="text-[10px] font-bold uppercase text-slate-500 px-1">Current Slots</p>
                   {loading ? (
                     <p className="text-center py-4 text-xs text-slate-400">Loading...</p>
                   ) : manageSchedules.length === 0 ? (
                     <p className="text-center py-8 text-xs text-slate-300 italic border border-dashed border-slate-100 rounded">No slots configured</p>
                   ) : (
                     <div className="max-h-[300px] overflow-y-auto pr-1.5 scrollbar-thin">
                      {(() => {
                        const grouped = manageSchedules.reduce((acc: any, s: any) => {
                          const day = s.dayOfWeek;
                          if (!acc[day]) acc[day] = [];
                          acc[day].push(s);
                          return acc;
                        }, {});

                        const sortedDays = Object.keys(grouped)
                          .map(Number)
                          .sort((a, b) => {
                            const valA = a === 0 ? 7 : a;
                            const valB = b === 0 ? 7 : b;
                            return valA - valB;
                          });

                        return (
                          <div className="space-y-6 pb-8">
                            {sortedDays.map((day) => {
                              const daySlots = grouped[day].sort((a: any, b: any) => {
                                const [ah, am] = a.startTime.split(":").map(Number);
                                const [bh, bm] = b.startTime.split(":").map(Number);
                                return (ah * 60 + am) - (bh * 60 + bm);
                              });

                              return (
                                <div key={day} className="space-y-2">
                                  <div className="flex items-center gap-2 px-1">
                                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{DAYS.find(d => d.id === day)?.name}</p>
                                    <div className="h-px flex-1 bg-slate-100" />
                                  </div>
                                  <div className="space-y-1.5">
                                    {daySlots.map((s: any, idx: number) => (
                                      <div key={s.id} className="flex items-center justify-between p-2 rounded-none border border-slate-100 bg-white group hover:border-orange-200 hover:shadow-sm transition-all">
                                        <div className="flex items-center gap-3">
                                          <div className="w-7 h-7 rounded-none bg-slate-50 flex items-center justify-center text-[9px] font-black text-slate-400 border border-slate-100">
                                            S{idx + 1}
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-black text-slate-700 flex items-center gap-1.5">
                                              <Clock className="w-3 h-3 text-orange-500" /> {formatToAMPM(s.startTime)} — {formatToAMPM(s.endTime)}
                                            </p>
                                          </div>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0 text-slate-200 hover:text-destructive hover:bg-destructive/5 rounded-none"
                                          onClick={() => handleDeleteSlot(s.id)}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                     </div>
                   )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
