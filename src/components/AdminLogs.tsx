import { useState, useEffect } from "react";
import { 
    Activity, ShieldAlert, Search, RefreshCw, XCircle, 
    Calendar, User, Key, Globe, LayoutGrid, ChevronLeft, ChevronRight, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";

type AuditLog = {
    id: string;
    userId: string | null;
    username: string | null;
    name: string | null;
    role: string | null;
    action: string;
    details: string;
    ipAddress: string | null;
    createdAt: string;
};

type ActiveSession = {
    id: string;
    userId: string;
    username: string;
    name: string;
    role: string;
    ipAddress: string;
    userAgent: string;
    loginAt: string;
};

export function AdminLogs() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<"audit" | "sessions" | "server">("audit");
    
    // Audit logs state
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLogsCount, setTotalLogsCount] = useState(0);
    const [loadingLogs, setLoadingLogs] = useState(false);
    
    // Active sessions state
    const [sessions, setSessions] = useState<ActiveSession[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);

    // Server logs state
    const [serverLogs] = useState<string[]>([]);
    const [loadingServerLogs] = useState(false);

    // Fetch Audit Logs from local demoDb
    const fetchAuditLogs = async (page: number, search: string) => {
        setLoadingLogs(true);
        try {
            const data = await api.getAuditLogs(page, 15, search);
            setLogs(data.logs || []);
            setTotalPages(data.pagination?.totalPages || 1);
            setTotalLogsCount(data.pagination?.total || 0);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to load audit logs"
            });
        } finally {
            setLoadingLogs(false);
        }
    };

    // Fetch Active Sessions (demo: current user session)
    const fetchActiveSessions = async () => {
        setLoadingSessions(true);
        try {
            // In demo mode, show the current logged-in user as an active session
            const sessionStr = localStorage.getItem("user_session");
            if (sessionStr) {
                const session = JSON.parse(sessionStr);
                setSessions([{
                    id: `session-${session.id || "current"}`,
                    userId: session.id || "demo",
                    username: session.username || "demo",
                    name: session.name || "Demo User",
                    role: session.role || "ADMIN",
                    ipAddress: "127.0.0.1",
                    userAgent: navigator.userAgent,
                    loginAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                }]);
            } else {
                setSessions([]);
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to load active sessions"
            });
        } finally {
            setLoadingSessions(false);
        }
    };

    // Load data depending on active tab
    useEffect(() => {
        if (activeTab === "audit") {
            fetchAuditLogs(currentPage, searchQuery);
        } else if (activeTab === "sessions") {
            fetchActiveSessions();
        }
    }, [activeTab, currentPage]);

    // Handle search submit
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchAuditLogs(1, searchQuery);
    };

    // Format relative time or clean date format
    const formatTimestamp = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short"
        });
    };

    // Helper to extract device name from user-agent
    const getDeviceLabel = (userAgent: string) => {
        if (!userAgent) return "Unknown Device";
        const ua = userAgent.toLowerCase();
        if (ua.includes("mobi") || ua.includes("android") || ua.includes("iphone")) {
            return "Mobile / Phone";
        }
        if (ua.includes("ipad") || ua.includes("tablet")) {
            return "Tablet";
        }
        if (ua.includes("macintosh") || ua.includes("mac os")) {
            return "Mac OSX Desktop";
        }
        if (ua.includes("windows")) {
            return "Windows Desktop";
        }
        if (ua.includes("linux")) {
            return "Linux Desktop";
        }
        return "Desktop PC";
    };

    const getActionBadgeColor = (action: string) => {
        if (action.includes("LOGIN")) return "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50";
        if (action.includes("LOGOUT")) return "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100";
        if (action.includes("CREATED") || action.includes("REGISTERED")) return "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-50";
        if (action.includes("DELETED") || action.includes("TERMINATED")) return "bg-red-50 text-red-700 border-red-100 hover:bg-red-50";
        if (action.includes("EXPORTED")) return "bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-50";
        return "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-50";
    };

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                        Security logs & Sessions
                    </h1>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                        Monitor active user sessions and track system-wide clinical actions
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-100/80 border border-slate-200/60 px-3.5 py-2 rounded-xl text-slate-500">
                    <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-[11px] font-medium leading-tight">
                        Demo mode: Logs are stored locally and reset on data clear.
                    </span>
                </div>
            </div>

            {/* Custom Premium Tabs Navigation */}
            <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit border border-slate-300/30">
                <button
                    onClick={() => setActiveTab("audit")}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                        activeTab === "audit" 
                            ? "bg-white text-slate-900 shadow-sm" 
                            : "text-slate-500 hover:text-slate-900"
                    }`}
                >
                    <Activity className="w-4 h-4" />
                    Audit Logs
                    <Badge variant="secondary" className="ml-1 bg-slate-100 text-slate-600 border border-slate-200">
                        {totalLogsCount}
                    </Badge>
                </button>
                <button
                    onClick={() => setActiveTab("sessions")}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                        activeTab === "sessions" 
                            ? "bg-white text-slate-900 shadow-sm" 
                            : "text-slate-500 hover:text-slate-900"
                    }`}
                >
                    <Globe className="w-4 h-4" />
                    Active Sessions
                    <Badge variant="secondary" className="ml-1 bg-emerald-50 text-emerald-600 border border-emerald-200/40">
                        {sessions.length || 0} online
                    </Badge>
                </button>
                <button
                    onClick={() => setActiveTab("server")}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                        activeTab === "server" 
                            ? "bg-white text-slate-900 shadow-sm" 
                            : "text-slate-500 hover:text-slate-900"
                    }`}
                >
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                    Server Logs
                </button>
            </div>

            {/* Content Container */}
            <Card className="border-none shadow-sm overflow-hidden bg-white">
                <CardHeader className="border-b border-slate-100 py-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg font-bold text-slate-900">
                                {activeTab === "audit" 
                                    ? "System-wide Actions & Event Trail" 
                                    : activeTab === "sessions" 
                                        ? "Connected Hospital Personnel" 
                                        : "Server Error & Diagnostics Trail"}
                            </CardTitle>
                            <CardDescription>
                                {activeTab === "audit"
                                    ? "Full accountability logs of user creations, reports, consultations, and actions."
                                    : activeTab === "sessions"
                                        ? "Real-time list of all active logged-in clinic staff."
                                        : "Server error logs — not available in demo mode."}
                            </CardDescription>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {activeTab === "audit" && (
                                <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                        <Input
                                            type="text"
                                            placeholder="Search logs..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9 pr-4 py-2 w-[240px] rounded-xl text-sm border-slate-200 bg-slate-50/50 focus:bg-white"
                                        />
                                    </div>
                                    <Button type="submit" variant="secondary" className="rounded-xl">
                                        Search
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                            setSearchQuery("");
                                            setCurrentPage(1);
                                            fetchAuditLogs(1, "");
                                        }}
                                        className="rounded-xl"
                                        title="Reset search"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </Button>
                                </form>
                            )}
                            {activeTab === "sessions" && (
                                <Button 
                                    onClick={fetchActiveSessions} 
                                    variant="outline" 
                                    className="gap-2 rounded-xl"
                                    disabled={loadingSessions}
                                >
                                    <RefreshCw className={`w-4 h-4 ${loadingSessions ? "animate-spin" : ""}`} />
                                    Refresh Sessions
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                
                <CardContent className="p-0">
                    {/* AUDIT LOGS TAB VIEW */}
                    {activeTab === "audit" && (
                        <div className="min-h-[300px] flex flex-col justify-between">
                            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50/70 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="font-semibold text-slate-700">Timestamp</TableHead>
                                            <TableHead className="font-semibold text-slate-700">Account</TableHead>
                                            <TableHead className="font-semibold text-slate-700">Role</TableHead>
                                            <TableHead className="font-semibold text-slate-700">Event / Action</TableHead>
                                            <TableHead className="font-semibold text-slate-700">Log Details</TableHead>
                                            <TableHead className="font-semibold text-slate-700 hidden lg:table-cell">IP Address</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loadingLogs ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-48 text-center">
                                                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                                        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                                                        <span className="text-sm font-medium">Fetching event trail...</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : logs.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-48 text-center text-slate-500">
                                                    No logs matching current filter found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            logs.map((log) => (
                                                <TableRow key={log.id} className="hover:bg-slate-50/40 border-b border-slate-100">
                                                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                                                        {formatTimestamp(log.createdAt)}
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-slate-900">
                                                        {log.name || log.username || "System"}
                                                        <p className="text-[10px] text-slate-400 font-normal">{log.username || "system"}</p>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-600">
                                                        {log.role || "SYSTEM"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={`text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full border ${getActionBadgeColor(log.action)}`}>
                                                            {log.action}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-700 max-w-[280px] break-words leading-relaxed font-medium">
                                                        {log.details}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-mono text-slate-400 hidden lg:table-cell">
                                                        {log.ipAddress || "—"}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            
                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/40">
                                    <div className="text-xs font-medium text-slate-500">
                                        Showing page <span className="font-bold text-slate-700">{currentPage}</span> of <span className="font-bold text-slate-700">{totalPages}</span> ({totalLogsCount} total logs)
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1 || loadingLogs}
                                            className="rounded-lg"
                                        >
                                            <ChevronLeft className="w-4 h-4 mr-1" />
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages || loadingLogs}
                                            className="rounded-lg"
                                        >
                                            Next
                                            <ChevronRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ACTIVE SESSIONS TAB VIEW */}
                    {activeTab === "sessions" && (
                        <div className="overflow-x-auto min-h-[300px] max-h-[480px] overflow-y-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/70 sticky top-0 z-10">
                                    <TableRow>
                                        <TableHead className="font-semibold text-slate-700">Staff Account</TableHead>
                                        <TableHead className="font-semibold text-slate-700">Role</TableHead>
                                        <TableHead className="font-semibold text-slate-700">Login Timestamp</TableHead>
                                        <TableHead className="font-semibold text-slate-700">Platform / Device</TableHead>
                                        <TableHead className="font-semibold text-slate-700">IP Address</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingSessions ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-48 text-center">
                                                <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                                                    <span className="text-sm font-medium">Scanning network connections...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : sessions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-48 text-center text-slate-500">
                                                No active sessions found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        sessions.map((session) => (
                                            <TableRow key={session.id} className="hover:bg-slate-50/40 border-b border-slate-100">
                                                <TableCell className="font-semibold text-slate-900">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="relative flex h-2.5 w-2.5 shrink-0">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                                        </div>
                                                        <div>
                                                            {session.name}
                                                            <p className="text-[10px] text-slate-400 font-normal">{session.username}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-600">
                                                    {session.role}
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500">
                                                    {formatTimestamp(session.loginAt)}
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-600">
                                                    <span className="font-semibold text-slate-800">{getDeviceLabel(session.userAgent)}</span>
                                                    <p className="text-[10px] text-slate-400 max-w-[200px] truncate" title={session.userAgent}>
                                                        {session.userAgent}
                                                    </p>
                                                </TableCell>
                                                <TableCell className="text-xs font-mono text-slate-600">
                                                    {session.ipAddress || "—"}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* SERVER LOGS TAB VIEW */}
                    {activeTab === "server" && (
                        <div className="p-5 bg-slate-950 text-slate-200 font-mono text-xs rounded-b-2xl overflow-y-auto max-h-[500px] min-h-[300px]">
                            {loadingServerLogs ? (
                                <div className="flex flex-col items-center justify-center gap-2 text-slate-400 py-24">
                                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                                    <span>Fetching server error logs...</span>
                                </div>
                            ) : serverLogs.length === 0 ? (
                                <div className="text-center py-24 space-y-3">
                                    <ShieldAlert className="w-8 h-8 text-slate-600 mx-auto" />
                                    <p className="text-slate-400 text-sm font-semibold">Demo Mode Active</p>
                                    <p className="text-slate-600 text-xs">Server logs are not available in the offline demo environment. In a live deployment, real-time backend error logs would appear here.</p>
                                </div>
                            ) : (
                                <div className="space-y-1.5 whitespace-pre-wrap select-text">
                                    {serverLogs.map((logLine, idx) => {
                                        let lineClass = "text-slate-300";
                                        if (logLine.includes("[ERROR]")) {
                                            lineClass = "text-rose-400 font-semibold";
                                        } else if (logLine.includes("[WARN]")) {
                                            lineClass = "text-amber-400";
                                        }
                                        return (
                                            <div key={idx} className={`${lineClass} border-b border-slate-900 pb-1.5 last:border-none last:pb-0`}>
                                                {logLine}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
