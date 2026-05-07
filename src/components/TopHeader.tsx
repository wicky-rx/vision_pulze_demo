import { useState } from "react";
import { cn } from "@/lib/utils";
import { Search, ChevronDown, LogOut, User, Calendar as CalendarIcon } from "lucide-react";
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
    navigate("/");
  };

  return (
    <header className="h-16 border-b border-orange-200 bg-orange-100 flex items-center justify-between px-6 shrink-0 shadow-lg z-50 transition-colors duration-300">
      <div className="flex items-center gap-8">
        {/* Logo Section */}
        <div className="flex items-center lg:pr-8 lg:border-r border-orange-200/50 shrink-0">
          <img
            src="https://res.cloudinary.com/autodapp/image/upload/v1775219907/VPN%20Eye%20Hospital%20Logo.png"
            alt="VPN Eye Hospital"
            className="h-7 lg:h-9 w-auto object-contain"
          />
        </div>

        <div>
          <h2 className="text-sm lg:text-base font-black font-display truncate max-w-[120px] lg:max-w-none uppercase tracking-wider text-slate-900">
            {stationTitles[activeStation] || "Dashboard"}
          </h2>
          <p className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest truncate text-slate-500">
            {new Date().toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
          </p>
        </div>
        <div className="hidden xl:flex flex-col justify-center border-l border-orange-200 pl-8">
          <span className="text-xs font-black text-black">VPN EYE HOSPITAL</span>
          <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-500">25, Neela West Street, Nagapattinam - 611001</span>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 flex-col items-end justify-center pr-8">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Supported by Ragavarshini Traders</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Global Search - Hidden for reception */}
        {activeStation !== "reception" && (
          <div className="relative w-64 hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search patients..."
              className="pl-9 h-9 text-xs border-transparent focus:border-white/30 rounded-none transition-all font-bold bg-orange-200/50 text-slate-900 placeholder:text-slate-400 focus:bg-orange-200/80"
            />
          </div>
        )}

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-none hover:bg-white/10 transition-all border border-transparent hover:border-white/5">
              <div className="w-8 h-8 rounded-none flex items-center justify-center border bg-orange-600/10 text-orange-600 border-orange-600/20">
                <User className="w-4 h-4" />
              </div>
              <span className="hidden lg:inline text-xs font-black uppercase tracking-wider text-black">{userName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl mt-1">
            <DropdownMenuLabel className="flex flex-col gap-0.5 px-3 py-2">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">My Account</span>
              <span className="text-xs font-black text-foreground truncate">{userName}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-xs cursor-pointer gap-2"
              onClick={() => setIsProfileOpen(true)}
            >
              <User className="w-3.5 h-3.5" />
              Change Password
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs cursor-pointer gap-2 text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ChangePasswordModal open={isProfileOpen} onOpenChange={setIsProfileOpen} />
    </header>
  );
}
