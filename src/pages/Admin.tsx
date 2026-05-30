import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Activity, Calendar, ShieldCheck, Plus, Pencil, ShieldOff, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { API_BASE_URL } from "@/config";
import { AdminSidebar, type AdminView } from "@/components/AdminSidebar";
import { AdminReports } from "@/components/AdminReports";
import { AdminFamilies } from "@/components/AdminFamilies";
import { AdminLogs } from "@/components/AdminLogs";
import { api } from "@/lib/api";

import { Trash2 } from "lucide-react";

type ScanType = {
    id: string;
    name: string;
    createdAt: string;
};

type UserData = {
    id: string;
    username: string;
    name: string;
    role: string;
    specializationId?: string | null;
    specialization?: { name: string } | null;
    isActive: boolean;
    createdAt: string;
};

type Specialization = {
    id: string;
    name: string;
    createdAt: string;
};

type DashboardStats = {
    totalPatients: number;
    totalVisits?: number;
    totalUsers: number;
    todayVisits: number;
    completedToday?: number;
    pendingToday?: number;
    withDoctorToday?: number;
};

type BlockedIp = {
    ip: string;
    count: number;
    resetTime: string;
};

const Admin = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [activeView, setActiveView] = useState<AdminView>("overview");
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [userName, setUserName] = useState("Admin");
    const [userRole, setUserRole] = useState("ADMIN");

    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [users, setUsers] = useState<UserData[]>([]);
    const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
    const [loadingIps, setLoadingIps] = useState(false);
    const [unblockingIp, setUnblockingIp] = useState<string | null>(null);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    // Create User Form State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newUsername, setNewUsername] = useState("");
    const [newName, setNewName] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newRole, setNewRole] = useState("RECEPTIONIST");
    const [newSpecializationId, setNewSpecializationId] = useState("none");
    const [newIsActive, setNewIsActive] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Edit User Form State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editUsername, setEditUsername] = useState("");
    const [editName, setEditName] = useState("");
    const [editPassword, setEditPassword] = useState("");
    const [editRole, setEditRole] = useState("RECEPTIONIST");
    const [editSpecializationId, setEditSpecializationId] = useState("none");
    const [editIsActive, setEditIsActive] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    // Scan Types State
    const [scanTypes, setScanTypes] = useState<ScanType[]>([]);
    const [loadingScanTypes, setLoadingScanTypes] = useState(false);
    const [newScanTypeName, setNewScanTypeName] = useState("");
    const [isAddingScanType, setIsAddingScanType] = useState(false);

    // Specializations State
    const [specializations, setSpecializations] = useState<Specialization[]>([]);
    const [loadingSpecializations, setLoadingSpecializations] = useState(false);
    const [newSpecializationName, setNewSpecializationName] = useState("");
    const [isAddingSpecialization, setIsAddingSpecialization] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const session = localStorage.getItem("user_session");

        if (!token || !session) {
            navigate("/login?station=admin");
            return;
        }

        const { role, name } = JSON.parse(session);
        if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
            toast({
                variant: "destructive",
                title: "Access Denied",
                description: `Your role (${role}) is not authorized for Admin Panel.`,
            });
            navigate("/home");
            return;
        }

        setUserName(name || "Admin");
        setUserRole(role);
        setIsSuperAdmin(role === "SUPER_ADMIN");

        const fetchAdminData = async () => {
            try {
                const [statsData, usersData] = await Promise.all([
                    api.getAdminStats(),
                    api.getAdminUsers(1, 50),
                ]);
                setStats(statsData);
                setUsers(usersData.users || []);
            } catch (error: any) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: error.message || "Failed to load admin data",
                });
            } finally {
                setIsInitialLoading(false);
            }
        };

        fetchAdminData();
    }, [navigate, toast]);

    // Fetch blocked IPs when security view is activated
    useEffect(() => {
        if (activeView !== "security" || !isSuperAdmin) return;
        const token = localStorage.getItem("token");
        setLoadingIps(true);
        fetch(`${API_BASE_URL}/api/admin/blocked-ips`, { headers: { "Authorization": `Bearer ${token}` } })
            .then((r) => r.json())
            .then((data) => setBlockedIps(Array.isArray(data) ? data : []))
            .catch(() => setBlockedIps([]))
            .finally(() => setLoadingIps(false));
    }, [activeView, isSuperAdmin, toast]);

    // Fetch data when view is activated
    useEffect(() => {
        // No special view-level fetching needed for reports/families/logs - they handle their own data
    }, [activeView]);

    const fetchScanTypes = async () => {
        // Scan types not supported in demo mode
        setLoadingScanTypes(false);
    };

    const handleAddScanType = async () => {
        // Not supported in demo mode
    };

    const handleDeleteScanType = async (_id: string) => {
        // Scan types not supported in demo mode
    };

    const fetchSpecializations = async () => {
        // Specializations not supported in demo mode
    };

    const handleAddSpecialization = async () => {
        // Not supported in demo mode
    };

    const handleDeleteSpecialization = async (_id: string) => {
        // Not supported in demo mode
    };

    const handleUnblockIp = async (ip: string) => {
        setUnblockingIp(ip);
        try {
            await api.unblockIp(ip);
            setBlockedIps((prev) => prev.filter((b) => b.ip !== ip));
            toast({ title: "IP Unblocked", description: `${ip} has been successfully unblocked.` });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setUnblockingIp(null);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user_session");
        toast({ title: "Logged out successfully" });
        navigate("/home");
    };

    const handleCreateUser = async () => {
        if (!newUsername || !newName || !newPassword || !newRole) {
            toast({ variant: "destructive", title: "Validation Error", description: "All fields are required." });
            return;
        }
        setIsCreating(true);
        try {
            const newUser = await api.createAdminUser({ 
                username: newUsername, 
                name: newName, 
                password: newPassword, 
                role: newRole,
                isActive: newIsActive
            });
            toast({ title: "User Created", description: "The new user has been successfully added." });
            setUsers((prev) => [newUser, ...prev]);
            setIsCreateOpen(false);
            setNewUsername(""); setNewName(""); setNewPassword(""); setNewRole("RECEPTIONIST");
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error Creating User", description: error.message });
        } finally {
            setIsCreating(false);
        }
    };

    const handleEditClick = (user: UserData) => {
        setEditingUserId(user.id);
        setEditUsername(user.username);
        setEditName(user.name);
        setEditRole(user.role);
        setEditSpecializationId(user.specializationId || "none");
        setEditIsActive(user.isActive ?? true);
        setEditPassword("");
        setIsEditOpen(true);
        // Ensure specializations are loaded for editing if needed
        if (specializations.length === 0) fetchSpecializations();
    };

    const handleUpdateUser = async () => {
        if (!editUsername || !editName || !editRole || !editingUserId) {
            toast({ variant: "destructive", title: "Validation Error", description: "Name, username, and role are required." });
            return;
        }
        setIsUpdating(true);
        try {
            const updateData: any = { username: editUsername, name: editName, role: editRole, isActive: editIsActive };
            if (editPassword) updateData.password = editPassword;
            const updatedUser = await api.updateAdminUser(editingUserId!, updateData);
            toast({ title: "User Updated", description: "The user has been successfully updated." });
            setUsers((prev) => prev.map((u) => u.id === editingUserId ? { ...u, ...updatedUser } : u));
            setIsEditOpen(false);
            setEditingUserId(null);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error Updating User", description: error.message });
        } finally {
            setIsUpdating(false);
        }
    };

    const roleSelectItems = (
        <>
            <SelectItem value="ADMIN">ADMIN</SelectItem>
            <SelectItem value="DOCTOR">DOCTOR</SelectItem>
            <SelectItem value="RECEPTIONIST">RECEPTIONIST</SelectItem>
            <SelectItem value="OPTOMETRIST">OPTOMETRIST</SelectItem>
            <SelectItem value="PHARMACIST">PHARMACIST</SelectItem>
            <SelectItem value="OPTICALS">OPTICALS</SelectItem>
        </>
    );

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans">
            <AdminSidebar
                activeView={activeView}
                onViewChange={setActiveView}
                isSuperAdmin={isSuperAdmin}
                onLogout={handleLogout}
                userName={userName}
                userRole={userRole}
            />

            {/* Initial Loading Screen */}
            {isInitialLoading && (
                <div className="fixed inset-0 bg-slate-50/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
                    <div className="flex flex-col items-center justify-center gap-1.5 leading-none animate-pulse">
                        <span
                            style={{ fontFamily: "'Outfit', sans-serif" }}
                            className="font-extrabold text-2xl tracking-tight leading-none"
                        >
                            <span style={{ color: "#0F172A" }}>Vision</span>
                            <span className="text-brand">Pulze</span>
                        </span>
                        <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400 mt-1">
                            Ophthalmic Ecosystem
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 font-medium animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <Activity className="w-5 h-5 animate-spin text-primary" />
                        Initializing Clinical Dashboard...
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8">

                {/* ── OVERVIEW ── */}
                {activeView === "overview" && (
                    <div className="space-y-8">
                        <div className="flex flex-col gap-2">
                             <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                                 Admin Dashboard
                             </h1>
                             <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">System-wide statistics and overview</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Card className="border-none shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-slate-500">Total Patients</CardTitle>
                                    <Users className="w-4 h-4 text-emerald-500" />
                                </CardHeader>
                                <CardContent><div className="text-3xl font-bold text-slate-900">{stats?.totalPatients ?? 0}</div></CardContent>
                            </Card>
                            <Card className="border-none shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-slate-500">Total Visits</CardTitle>
                                    <Activity className="w-4 h-4 text-blue-500" />
                                </CardHeader>
                                <CardContent><div className="text-3xl font-bold text-slate-900">{stats?.totalVisits ?? 0}</div></CardContent>
                            </Card>
                            <Card className="border-none shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-slate-500">Today's Visits</CardTitle>
                                    <Calendar className="w-4 h-4 text-orange-500" />
                                </CardHeader>
                                <CardContent><div className="text-3xl font-bold text-slate-900">{stats?.todayVisits ?? 0}</div></CardContent>
                            </Card>
                            <Card className="border-none shadow-sm bg-primary text-primary-foreground">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-primary-foreground/80">Total Staff</CardTitle>
                                    <ShieldCheck className="w-4 h-4 text-primary-foreground/80" />
                                </CardHeader>
                                <CardContent><div className="text-3xl font-bold">{stats?.totalUsers ?? 0}</div></CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* ── PERSONNEL ── */}
                {activeView === "personnel" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                             <div className="flex flex-col gap-1">
                                 <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                                     Personnel Roster
                                 </h1>
                                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Manage authorized clinical staff & access clearance</p>
                             </div>
                            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                <DialogTrigger asChild>
                                    <Button className="gap-2 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20">
                                        <Plus className="w-4 h-4" /> Add User
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md rounded-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Create New User</DialogTitle>
                                        <DialogDescription>Add a new staff member. Provide their login details and role.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2"><Label>Full Name</Label><Input placeholder="e.g. Ramakrishnan" value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
                                        <div className="space-y-2"><Label>Username</Label><Input placeholder="ramakrishnan" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} /></div>
                                        <div className="space-y-2"><Label>Password</Label><Input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
                                        <div className="space-y-2">
                                            <Label>Role</Label>
                                            <Select value={newRole} onValueChange={setNewRole}>
                                                <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                                                <SelectContent>{roleSelectItems}</SelectContent>
                                            </Select>
                                        </div>
                                        {newRole === 'DOCTOR' && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                                <Label>Doctor Specialization</Label>
                                                <Select value={newSpecializationId} onValueChange={setNewSpecializationId}>
                                                    <SelectTrigger><SelectValue placeholder="Select Specialization" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">General / Unspecified</SelectItem>
                                                        {specializations.map(s => (
                                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <p className="text-[10px] text-muted-foreground italic">If the list is empty, add them in the "Specializations" tab.</p>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                            <div className="space-y-0.5">
                                                <Label>Account Active</Label>
                                                <p className="text-[10px] text-muted-foreground">Enable or disable this user's ability to login.</p>
                                            </div>
                                            <Switch checked={newIsActive} onCheckedChange={setNewIsActive} />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>Cancel</Button>
                                        <Button onClick={handleCreateUser} disabled={isCreating}>{isCreating ? "Saving..." : "Create User"}</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50/80">
                                    <TableRow>
                                        <TableHead className="font-semibold text-slate-900">Name</TableHead>
                                        <TableHead className="font-semibold text-slate-900">Username</TableHead>
                                        <TableHead className="font-semibold text-slate-900">Role</TableHead>
                                        <TableHead className="font-semibold text-slate-900">Status</TableHead>
                                        <TableHead className="font-semibold text-slate-900 hidden md:table-cell">Created</TableHead>
                                        <TableHead className="w-16" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="h-24 text-center text-slate-500">Loading users...</TableCell></TableRow>
                                    ) : (
                                        users.map((user) => (
                                            <TableRow key={user.id} className="hover:bg-slate-50/50">
                                                <TableCell className="font-medium">{user.name}</TableCell>
                                                <TableCell className="text-slate-500">{user.username}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className={`px-2.5 py-1 rounded-md text-xs font-medium border inline-block w-fit
                                                            ${user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? 'bg-primary/10 text-primary border-primary/20' :
                                                                user.role === 'DOCTOR' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                                'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                            {user.role}
                                                        </span>
                                                        {user.role === 'DOCTOR' && user.specialization && (
                                                            <span className="text-[10px] text-slate-500 font-medium px-1 italic">
                                                                {user.specialization.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={user.isActive ? "secondary" : "destructive"} className="text-[10px] py-0 h-5">
                                                        {user.isActive ? "Active" : "Disabled"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-slate-500 hidden md:table-cell text-sm">
                                                    {new Date(user.createdAt).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)} className="h-8 w-8 text-slate-500 hover:text-primary">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Edit User Dialog */}
                        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                            <DialogContent className="sm:max-w-md rounded-2xl">
                                <DialogHeader>
                                    <DialogTitle>Edit User</DialogTitle>
                                    <DialogDescription>Update staff member details. Leave password empty to keep the current one.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2"><Label>Full Name</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
                                    <div className="space-y-2"><Label>Username</Label><Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} /></div>
                                    <div className="space-y-2"><Label>New Password (optional)</Label><Input type="password" placeholder="Leave blank to keep current" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} /></div>
                                    <div className="space-y-2">
                                        <Label>Role</Label>
                                        <Select value={editRole} onValueChange={setEditRole}>
                                            <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                                            <SelectContent>{roleSelectItems}</SelectContent>
                                        </Select>
                                    </div>
                                    {editRole === 'DOCTOR' && (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                            <Label>Doctor Specialization</Label>
                                            <Select value={editSpecializationId} onValueChange={setEditSpecializationId}>
                                                <SelectTrigger><SelectValue placeholder="Select Specialization" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">General / Unspecified</SelectItem>
                                                    {specializations.map(s => (
                                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                        <div className="space-y-0.5">
                                            <Label>Account Active</Label>
                                            <p className="text-[10px] text-muted-foreground">Enable or disable this user's ability to login.</p>
                                        </div>
                                        <Switch checked={editIsActive} onCheckedChange={setEditIsActive} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isUpdating}>Cancel</Button>
                                    <Button onClick={handleUpdateUser} disabled={isUpdating}>{isUpdating ? "Saving..." : "Save Changes"}</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}

                {/* ── SECURITY (SUPER ADMIN ONLY) ── */}
                {activeView === "security" && isSuperAdmin && (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-1">
                             <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                                  Security — Blocked IPs
                             </h1>
                             <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">IP Access Controls & Rate Limit Monitoring</p>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50/80">
                                    <TableRow>
                                        <TableHead className="font-semibold text-slate-900">IP Address</TableHead>
                                        <TableHead className="font-semibold text-slate-900">Failed Attempts</TableHead>
                                        <TableHead className="font-semibold text-slate-900">Block Expires</TableHead>
                                        <TableHead className="font-semibold text-slate-900 w-32">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingIps ? (
                                        <TableRow><TableCell colSpan={4} className="h-24 text-center text-slate-500">Loading blocked IPs...</TableCell></TableRow>
                                    ) : blockedIps.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                <div className="flex flex-col items-center gap-2 text-slate-400">
                                                    <ShieldCheck className="w-8 h-8 text-emerald-400" />
                                                    <span className="text-sm font-medium text-slate-500">No blocked IPs — system is clean!</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        blockedIps.map((entry) => (
                                            <TableRow key={entry.ip}>
                                                <TableCell className="font-mono text-sm">{entry.ip}</TableCell>
                                                <TableCell>
                                                    <Badge variant="destructive" className="text-xs">{entry.count} attempts</Badge>
                                                </TableCell>
                                                <TableCell className="text-slate-500 text-sm">
                                                    {new Date(entry.resetTime).toLocaleTimeString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="gap-1.5 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                                        onClick={() => handleUnblockIp(entry.ip)}
                                                        disabled={unblockingIp === entry.ip}
                                                    >
                                                        <ShieldCheck className="w-3.5 h-3.5" />
                                                        {unblockingIp === entry.ip ? "Unblocking..." : "Unblock"}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                {/* ── REPORTS ── */}
                {activeView === "reports" && (
                    <AdminReports />
                )}

                {/* ── FAMILY GROUPS ── */}
                {activeView === "families" && (
                    <AdminFamilies />
                )}

                {/* ── SYSTEM LOGS ── */}
                {activeView === "logs" && (
                    <AdminLogs />
                )}

            </main>
        </div>
    );
};

export default Admin;
