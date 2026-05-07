import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Stethoscope, Glasses, Activity, Pill } from "lucide-react";
import { cn } from "@/lib/utils";

const stations = [
    { id: "reception", label: "Reception", icon: ClipboardList, color: "bg-blue-500" },
    { id: "refraction", label: "Refraction Room", icon: Activity, color: "bg-emerald-500" },
    { id: "doctor", label: "Doctor Room", icon: Stethoscope, color: "bg-indigo-500" },
    { id: "optical", label: "Optical", icon: Glasses, color: "bg-violet-500" },
    { id: "pharmacy", label: "Pharmacy", icon: Pill, color: "bg-cyan-500" },
];

const Home = () => {
    const navigate = useNavigate();

    // If a valid session already exists, skip station selection and go straight to the dashboard
    useEffect(() => {
        const existingSession = localStorage.getItem("user_session");
        if (existingSession) {
            try {
                const { role } = JSON.parse(existingSession);
                if (role === "ADMIN") {
                    navigate("/admin", { replace: true });
                } else {
                    navigate("/dashboard", { replace: true });
                }
            } catch {
                // Corrupted session — clear and stay on home
                localStorage.removeItem("user_session");
                localStorage.removeItem("token");
            }
        }
    }, [navigate]);

    return (
        <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-6">
            <div className="max-w-4xl w-full text-center space-y-12">
                <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center mb-6 gap-2">
                        <img
                            src="https://res.cloudinary.com/autodapp/image/upload/v1775219907/VPN%20Eye%20Hospital%20Logo.png"
                            alt="VPN Eye Hospital"
                            className="h-24 w-auto object-contain"
                        />
                        <p className="text-sm text-slate-500 max-w-sm font-medium">
                            25, Neela West Street, Velippalayam, Nagapattinam - 611001, Tamil Nadu
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stations.map((station) => (
                        <button
                            key={station.id}
                            onClick={() => navigate(`/login?station=${station.id}`)}
                            className="group relative flex flex-col items-center gap-4 p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className={cn(
                                "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                                station.color,
                                "bg-opacity-10"
                            )}>
                                <station.icon className={cn("w-8 h-8", station.color.replace('bg-', 'text-'))} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-semibold text-slate-900">{station.label}</h3>
                                <p className="text-xs text-slate-400">Click to enter</p>
                            </div>
                        </button>
                    ))}
                </div>

                <p className="text-slate-400 text-xs pt-8 text-dark font-bold">
                    Supported by Ragavarshini Traders @ 9840957945
                </p>
            </div>
        </div>
    );
};

export default Home;
