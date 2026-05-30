import { useState, useEffect } from "react";
import { FileText, Download, Search, RefreshCw, ChevronLeft, ChevronRight, Users, Calendar, TrendingUp, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";

type ReportType = "patients" | "visits";

const REPORT_TYPES: { value: ReportType; label: string; icon: React.ReactNode; description: string }[] = [
    { value: "patients", label: "Patient Registry", icon: <Users className="w-4 h-4" />, description: "All registered patients with demographics" },
    { value: "visits", label: "Visit Records", icon: <Calendar className="w-4 h-4" />, description: "Today's clinic visit log with statuses" },
];

const STATUS_LABELS: Record<string, string> = {
    AT_RECEPTION: "Reception",
    IN_REFRACTION: "Refraction",
    REFRACTION_DONE: "Refraction Done",
    WITH_DOCTOR: "With Doctor",
    CONSULTED: "Consulted",
    AT_OPTICAL: "Optical",
    COMPLETED: "Completed",
};

const STATUS_COLORS: Record<string, string> = {
    AT_RECEPTION: "bg-yellow-50 text-yellow-700 border-yellow-100",
    IN_REFRACTION: "bg-blue-50 text-blue-700 border-blue-100",
    REFRACTION_DONE: "bg-cyan-50 text-cyan-700 border-cyan-100",
    WITH_DOCTOR: "bg-purple-50 text-purple-700 border-purple-100",
    CONSULTED: "bg-emerald-50 text-emerald-700 border-emerald-100",
    AT_OPTICAL: "bg-indigo-50 text-indigo-700 border-indigo-100",
    COMPLETED: "bg-slate-100 text-slate-600 border-slate-200",
};

export function AdminReports() {
    const { toast } = useToast();

    const [reportType, setReportType] = useState<ReportType>("patients");
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState<any>(null);

    const fetchData = async (type: ReportType, page: number, search: string) => {
        setLoading(true);
        try {
            const result = await api.getReports(type, page, 20, search);
            setData(result.data || []);
            setTotalPages(result.pagination?.totalPages || 1);
            setTotalCount(result.pagination?.total || 0);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message || "Failed to fetch report data" });
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const s = await api.getAdminStats();
            setStats(s);
        } catch {}
    };

    useEffect(() => {
        fetchData(reportType, currentPage, searchQuery);
        fetchStats();
    }, [reportType, currentPage]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchData(reportType, 1, searchQuery);
    };

    const handleExportCSV = () => {
        if (data.length === 0) {
            toast({ variant: "destructive", title: "No Data", description: "No data available to export." });
            return;
        }

        let csv = "";
        if (reportType === "patients") {
            csv = "MR Number,Name,Gender,Age/DOB,Contact,District,State\n";
            data.forEach((p: any) => {
                const dobOrAge = p.dob || p.age || "";
                csv += `"${p.mrNumber}","${p.name}","${p.gender || ""}","${dobOrAge}","${p.contactNumber || ""}","${p.district || ""}","${p.state || ""}"\n`;
            });
        } else {
            csv = "Visit ID,MR Number,Patient Name,Status,Doctor,Date\n";
            data.forEach((v: any) => {
                const patientName = v.patient?.name || v.mrNumber;
                const status = STATUS_LABELS[v.status] || v.status;
                const doctorName = v.consultingDoctorName || "";
                const date = v.visitedAt ? new Date(v.visitedAt).toLocaleDateString() : "";
                csv += `"${v.id}","${v.mrNumber}","${patientName}","${status}","${doctorName}","${date}"\n`;
            });
        }

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${reportType}_report_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({ title: "Export Successful", description: `${reportType} report downloaded as CSV.` });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                        Hospital Reports
                    </h1>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                        Clinical data reports and analytics from demo database
                    </p>
                </div>
                <Button
                    onClick={handleExportCSV}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs"
                    disabled={data.length === 0}
                >
                    <Download className="w-4 h-4" />
                    Export CSV
                </Button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border border-slate-200/80 shadow-sm bg-white rounded-2xl">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                                    <Users className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wide">Total Patients</p>
                                    <p className="text-2xl font-black text-slate-900">{stats.totalPatients}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-slate-200/80 shadow-sm bg-white rounded-2xl">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                                    <Activity className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wide">Today's Visits</p>
                                    <p className="text-2xl font-black text-slate-900">{stats.todayVisits}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-slate-200/80 shadow-sm bg-white rounded-2xl">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                                    <TrendingUp className="w-4 h-4 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wide">Completed</p>
                                    <p className="text-2xl font-black text-slate-900">{stats.completedToday}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-slate-200/80 shadow-sm bg-white rounded-2xl">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                                    <Calendar className="w-4 h-4 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wide">Staff Users</p>
                                    <p className="text-2xl font-black text-slate-900">{stats.totalUsers}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Report Type Selector */}
            <div className="flex gap-3 flex-wrap">
                {REPORT_TYPES.map((rt) => (
                    <button
                        key={rt.value}
                        onClick={() => { setReportType(rt.value); setCurrentPage(1); setSearchQuery(""); }}
                        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                            reportType === rt.value
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                        }`}
                    >
                        {rt.icon}
                        {rt.label}
                    </button>
                ))}
            </div>

            {/* Report Table */}
            <Card className="border-none shadow-sm overflow-hidden bg-white">
                <CardHeader className="border-b border-slate-100 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-base font-bold text-slate-900">
                                {REPORT_TYPES.find(r => r.value === reportType)?.label}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {REPORT_TYPES.find(r => r.value === reportType)?.description} · {totalCount} records
                            </CardDescription>
                        </div>
                        <form onSubmit={handleSearch} className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Search records..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 w-[220px] rounded-xl text-sm border-slate-200"
                                />
                            </div>
                            <Button type="submit" variant="secondary" size="sm" className="rounded-xl">Search</Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => { setSearchQuery(""); setCurrentPage(1); fetchData(reportType, 1, ""); }}
                                className="rounded-xl"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                        </form>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                        {reportType === "patients" ? (
                            <Table>
                                <TableHeader className="bg-slate-50/70 sticky top-0 z-10">
                                    <TableRow>
                                        <TableHead className="font-semibold text-slate-700">MR Number</TableHead>
                                        <TableHead className="font-semibold text-slate-700">Patient Name</TableHead>
                                        <TableHead className="font-semibold text-slate-700">Gender</TableHead>
                                        <TableHead className="font-semibold text-slate-700">DOB / Age</TableHead>
                                        <TableHead className="font-semibold text-slate-700">Contact</TableHead>
                                        <TableHead className="font-semibold text-slate-700 hidden lg:table-cell">Location</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-48 text-center">
                                                <div className="flex flex-col items-center gap-2 text-slate-400">
                                                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                                                    <span className="text-sm">Loading report data...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-48 text-center text-slate-500">
                                                <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                                No records found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        data.map((p: any) => (
                                            <TableRow key={p.mrNumber} className="hover:bg-slate-50/40 border-b border-slate-100">
                                                <TableCell>
                                                    <Badge variant="outline" className="font-mono text-xs bg-slate-50 border-slate-200">MR-{p.mrNumber}</Badge>
                                                </TableCell>
                                                <TableCell className="font-semibold text-slate-900 text-sm">{p.name}</TableCell>
                                                <TableCell className="text-xs text-slate-600 capitalize">{p.gender || "—"}</TableCell>
                                                <TableCell className="text-xs text-slate-600 font-mono">{p.dob || (p.age ? `${p.age} yrs` : "—")}</TableCell>
                                                <TableCell className="text-xs text-slate-600 font-mono">{p.contactNumber || "—"}</TableCell>
                                                <TableCell className="text-xs text-slate-500 hidden lg:table-cell">{[p.district, p.state].filter(Boolean).join(", ") || "—"}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        ) : (
                            <Table>
                                <TableHeader className="bg-slate-50/70 sticky top-0 z-10">
                                    <TableRow>
                                        <TableHead className="font-semibold text-slate-700">Token</TableHead>
                                        <TableHead className="font-semibold text-slate-700">MR Number</TableHead>
                                        <TableHead className="font-semibold text-slate-700">Patient</TableHead>
                                        <TableHead className="font-semibold text-slate-700">Status</TableHead>
                                        <TableHead className="font-semibold text-slate-700 hidden md:table-cell">Doctor</TableHead>
                                        <TableHead className="font-semibold text-slate-700">Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-48 text-center">
                                                <div className="flex flex-col items-center gap-2 text-slate-400">
                                                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                                                    <span className="text-sm">Loading report data...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-48 text-center text-slate-500">
                                                <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                                No visit records found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        data.map((v: any) => (
                                            <TableRow key={v.id} className="hover:bg-slate-50/40 border-b border-slate-100">
                                                <TableCell>
                                                    <Badge className="bg-slate-900 text-white text-xs font-mono rounded-full">T-{v.tokenNumber || "—"}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-mono text-xs bg-slate-50 border-slate-200">MR-{v.mrNumber}</Badge>
                                                </TableCell>
                                                <TableCell className="font-semibold text-slate-900 text-sm">
                                                    {v.patient?.name || "—"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_COLORS[v.status] || "bg-slate-50 text-slate-600"}`}>
                                                        {STATUS_LABELS[v.status] || v.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-600 hidden md:table-cell">
                                                    {v.consultingDoctorName || "—"}
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                                                    {v.visitedAt ? new Date(v.visitedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/40">
                            <div className="text-xs font-medium text-slate-500">
                                Page <span className="font-bold text-slate-700">{currentPage}</span> of <span className="font-bold text-slate-700">{totalPages}</span> ({totalCount} records)
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline" size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                    disabled={currentPage === 1 || loading}
                                    className="rounded-lg"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                                </Button>
                                <Button
                                    variant="outline" size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                    disabled={currentPage === totalPages || loading}
                                    className="rounded-lg"
                                >
                                    Next <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
