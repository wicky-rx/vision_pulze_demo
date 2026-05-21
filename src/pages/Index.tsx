import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TopHeader } from "@/components/TopHeader";
import { PatientQueue } from "@/components/PatientQueue";
import { ReceptionStation } from "@/components/stations/ReceptionStation";
import { RefractionStation } from "@/components/stations/RefractionStation";
import { DoctorStation } from "@/components/stations/DoctorStation";
import { OpticalStation } from "@/components/stations/OpticalStation";
import { PharmacyStation } from "@/components/stations/PharmacyStation";
import ErrorBoundary from "@/components/ErrorBoundary";
import { api } from "@/lib/api";

type Station = "reception" | "refraction" | "doctor" | "consultation" | "clinical" | "optical" | "pharmacy" | "inventory" | "admin";

const stationComponents: Record<string, React.FC<any>> = {
  reception: ReceptionStation,
  refraction: RefractionStation,
  doctor: DoctorStation,
  consultation: DoctorStation,
  clinical: DoctorStation,
  optical: OpticalStation,
  pharmacy: PharmacyStation,
};

const stationRoleMap: Record<string, string> = {
  reception: "RECEPTIONIST",
  refraction: "OPTOMETRIST",
  doctor: "DOCTOR",
  consultation: "DOCTOR",
  clinical: "DOCTOR",
  optical: "OPTICALS",
  pharmacy: "PHARMACIST",
};

const Index = () => {
  const navigate = useNavigate();
  const [activeStation, setActiveStation] = useState<Station | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const session = localStorage.getItem("user_session");
    if (!session) {
      navigate("/login");
      return;
    }

    try {
      const parsed = JSON.parse(session);
      const { stationId, role } = parsed;

      if (!stationId || !role) {
        throw new Error("Incomplete session data");
      }

      // Role-based Route Protection
      if (role === "ADMIN" || role === "SUPER_ADMIN") {
        navigate("/admin");
        return;
      }

      const requiredRole = stationRoleMap[stationId];
      const isRoleValid = requiredRole === role || 
                         (stationId === "optical" && (role === "OPTICAL" || role === "OPTICALS")) ||
                         (stationId === "pharmacy" && (role === "PHARMACY" || role === "PHARMACIST"));

      if (requiredRole && !isRoleValid) {
        // Unauthorized access, clear session and redirect
        localStorage.removeItem("user_session");
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      setActiveStation(stationId as Station);
      
      // Fetch common data: Doctors (for session slot identification across stations)
      const fetchDoctors = async () => {
        try {
          const data = await api.getDoctors();
          setDoctors(data);
        } catch (e) {
          console.error("Error fetching common data:", e);
        }
      };

      fetchDoctors();
    } catch (error) {
       console.error("Session corruption detected:", error);
       localStorage.removeItem("user_session");
       localStorage.removeItem("token");
       navigate("/login");
    } finally {
      setIsInitializing(false);
    }
  }, [navigate]);

  if (isInitializing) {
     return (
       <div className="flex flex-col h-screen w-full items-center justify-center bg-slate-50 gap-4">
          <div className="w-12 h-12 border-4 border-[#1a365d] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Initializing Workspace...</p>
       </div>
     );
  }

  if (!activeStation) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 font-medium">
        Station Route Not Found: {localStorage.getItem("user_session")}
      </div>
    );
  }

  const activeStationLower = activeStation?.toLowerCase() || "";
  const ActiveComponent = stationComponents[activeStationLower] || null;

  if (!ActiveComponent) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 font-medium">
        Module Conflict: {activeStation}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopHeader activeStation={activeStation} />
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-0 lg:p-4 lg:gap-4">
          <div className="flex-1 bg-white lg:rounded-3xl border-0 lg:border border-slate-200 overflow-hidden flex flex-col lg:flex-row shadow-sm">
            <PatientQueue 
              selectedPatientId={selectedPatient?.id} 
              onSelectPatient={setSelectedPatient} 
              doctors={doctors}
              setDoctors={setDoctors}
            />
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/10">
              <ErrorBoundary>
                <ActiveComponent patient={selectedPatient} doctors={doctors} />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
