import { LayoutDashboard, Users, ShieldAlert, LogOut, Activity, FileText, Network, History } from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminView = "overview" | "personnel" | "security" | "reports" | "families" | "logs";

interface AdminSidebarProps {
    activeView: AdminView;
    onViewChange: (view: AdminView) => void;
    isSuperAdmin: boolean;
    onLogout: () => void;
    userName: string;
    userRole: string;
}

const navItems: { id: AdminView; label: string; icon: React.FC<any>; superAdminOnly?: boolean }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "personnel", label: "Personnel Roster", icon: Users },
    { id: "reports", label: "Hospital Reports", icon: FileText },
    { id: "families", label: "Family Groups", icon: Network },
    { id: "logs", label: "System Logs", icon: History, superAdminOnly: true },
    { id: "security", label: "Security", icon: ShieldAlert, superAdminOnly: true },
];

export function AdminSidebar({ activeView, onViewChange, isSuperAdmin, onLogout, userName, userRole }: AdminSidebarProps) {
    const visibleItems = navItems.filter((item) => !item.superAdminOnly || isSuperAdmin);

    return (
        <aside className="w-64 min-h-screen bg-slate-900 text-white flex flex-col shrink-0">
            {/* Logo */}
            <div className="px-6 py-6 border-b border-slate-700/60 leading-none">
                <div className="flex flex-col gap-0.5 mb-3 leading-none">
                    <span
                        style={{ fontFamily: "'Outfit', sans-serif" }}
                        className="font-extrabold text-xl tracking-tight leading-none"
                    >
                        <span style={{ color: "#FFFFFF" }}>Vision</span>
                        <span className="text-brand">Pulze</span>
                    </span>
                    <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400 mt-0.5">
                        Ophthalmic Ecosystem
                    </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">Admin Control Panel</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {visibleItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onViewChange(item.id)}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                            activeView === item.id
                                ? "bg-primary text-white shadow-lg shadow-primary/30"
                                : "text-slate-400 hover:bg-slate-800 hover:text-white"
                        )}
                    >
                        <item.icon className="w-4 h-4 shrink-0" />
                        {item.label}
                        {item.superAdminOnly && (
                            <span className="ml-auto text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
                                SUPER
                            </span>
                        )}
                    </button>
                ))}
            </nav>

            {/* User + Logout */}
            <div className="px-4 py-4 border-t border-slate-700/60">
                <div className="flex items-center gap-3 px-2 py-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                        {userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{userName}</p>
                        <p className="text-[10px] text-slate-400">{userRole}</p>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                >
                    <LogOut className="w-4 h-4" />
                    Log Out
                </button>
            </div>
        </aside>
    );
}
