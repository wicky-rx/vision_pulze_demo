import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, LogOut, User, Calendar as CalendarIcon } from "lucide-react";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const stationTitles: Record<string, string> = {
  reception: "Reception Desk",
  refraction: "Refraction Room",
  doctor: "Doctor's Room",
  optical: "Optical",
  pharmacy: "Pharmacy",
};

interface TopHeaderProps {
  activeStation: string;
}

export function TopHeader({ activeStation }: TopHeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();

  const sessionStr = localStorage.getItem("user_session");
  const userSession = sessionStr ? JSON.parse(sessionStr) : null;
  const userName = userSession?.name || "User";
  const { toast } = useToast();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_session");
    toast({
      title: "Logged out successfully",
    });
    navigate("/home");
  };

  return (
    <header className="h-16 md:h-20 border-b border-orange-200/50 bg-white/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-8 shrink-0 shadow-sm z-50 sticky top-0 transition-all duration-500">
      <div className="flex items-center gap-6 md:gap-10">
        {/* Logo Section */}
        <div className="flex items-center lg:pr-10 lg:border-r border-slate-200/60 shrink-0">
          <div className="flex flex-col leading-none gap-0.5">
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

        <div className="space-y-0.5">
          <h2 className="text-sm lg:text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse hidden sm:block" />
            {stationTitles[activeStation] || "Dashboard"}
          </h2>
          <div className="flex items-center gap-2 text-[9px] lg:text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <CalendarIcon className="w-3 h-3" />
            {new Date().toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
          </div>
        </div>

        <div className="hidden 2xl:flex flex-col justify-center border-l border-slate-200 pl-10">
          <span className="text-xs font-black tracking-tight text-slate-900 leading-none mb-1">VISIONPULZE</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Ophthalmic Ecosystem</span>
        </div>
      </div>

      {/* <div className="hidden lg:flex flex-1 flex-col items-center justify-center">
        <div className="bg-orange-50/50 border border-orange-100 px-4 py-1.5 rounded-full shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-[0.1em] text-orange-900/40 italic">Supported by Ragavarshini Traders</span>
        </div>
      </div> */}

      <div className="flex items-center gap-3 md:gap-6">
        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="group flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-full hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200 shadow-sm hover:shadow-md">
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-tr from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-200 group-hover:scale-105 transition-transform">
                <User className="w-5 h-5" />
              </div>
              <div className="hidden lg:flex flex-col items-start text-left">
                <span className="text-[11px] font-black uppercase tracking-tight text-slate-900">{userName}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Practitioner</span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-orange-600 transition-colors" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-2xl mt-3 p-1 shadow-2xl border-slate-200/60">
            <DropdownMenuLabel className="flex items-center gap-3 px-3 py-4 bg-slate-50/50 rounded-xl mb-1">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                <User className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">My Profile</span>
                <span className="text-sm font-black text-slate-900 truncate">{userName}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-100" />
            <div className="p-1">
              <DropdownMenuItem
                className="text-xs font-bold rounded-xl py-2.5 px-3 cursor-pointer gap-3 focus:bg-orange-50 focus:text-orange-900 transition-colors"
                onClick={() => setIsProfileOpen(true)}
              >
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                Change Password
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs font-bold rounded-xl py-2.5 px-3 cursor-pointer gap-3 text-rose-600 focus:bg-rose-50 focus:text-rose-700 transition-colors"
                onClick={handleLogout}
              >
                <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center">
                  <LogOut className="w-4 h-4" />
                </div>
                Logout
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ChangePasswordModal open={isProfileOpen} onOpenChange={setIsProfileOpen} />
    </header>
  );
}
