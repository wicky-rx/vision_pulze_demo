// import { Eye, ClipboardList, Stethoscope, Glasses, Activity } from "lucide-react";
// import { cn } from "@/lib/utils";

// type Station = "reception" | "refraction" | "doctor" | "optical";

// const stations = [
//     { id: "reception" as Station, label: "Reception", icon: ClipboardList },
//     { id: "refraction" as Station, label: "Refraction Room", icon: Activity },
//     { id: "doctor" as Station, label: "Doctor Room", icon: Stethoscope },
//     { id: "optical" as Station, label: "Optical & Pharmacy", icon: Glasses },
// ];

// interface StationCardsProps {
//     activeStation: Station;
//     onStationChange: (station: Station) => void;
// }

// export function StationCards({ activeStation, onStationChange }: StationCardsProps) {
//     return (
//         <div className="grid grid-cols-4 gap-4 mb-6">
//             {stations.map((s) => {
//                 const isActive = activeStation === s.id;
//                 return (
//                     <button
//                         key={s.id}
//                         onClick={() => onStationChange(s.id)}
//                         className={cn(
//                             "flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 shadow-sm",
//                             isActive
//                                 ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/25 scale-105"
//                                 : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
//                         )}
//                     >
//                         <s.icon className={cn("w-8 h-8 mb-3", isActive ? "text-primary-foreground" : "text-primary")} />
//                         <span className="text-sm font-semibold text-center">{s.label}</span>
//                     </button>
//                 );
//             })}
//         </div>
//     );
// }
