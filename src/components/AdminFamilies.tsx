import { useState, useEffect, useCallback } from "react";
import { Users, Search, Plus, Trash2, UserPlus, X, RefreshCw, Network, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
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
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";

const RELATIONSHIP_OPTIONS = [
    "Self", "Spouse", "Father", "Mother", "Son", "Daughter",
    "Brother", "Sister", "Guardian", "Grandparent", "Grandchild", "Other"
];

export function AdminFamilies() {
    const { toast } = useToast();

    // State
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Selected group for detail view
    const [selectedGroup, setSelectedGroup] = useState<any | null>(null);

    // Create group dialog
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [createForm, setCreateForm] = useState({ name: "", primaryPatientMrNumber: "" });
    const [creating, setCreating] = useState(false);

    // Add member dialog
    const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
    const [addMemberForm, setAddMemberForm] = useState({ mrNumber: "", relationship: "Self" });
    const [addingMember, setAddingMember] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [memberSearchQuery, setMemberSearchQuery] = useState("");
    const [searchingMember, setSearchingMember] = useState(false);

    // Delete confirmations
    const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
    const [deletingGroup, setDeletingGroup] = useState(false);
    const [removeMemberInfo, setRemoveMemberInfo] = useState<{ groupId: string; mrNumber: string; name: string } | null>(null);

    const fetchGroups = useCallback(async (search: string, page: number) => {
        setLoading(true);
        try {
            const data = await api.getFamilyGroups(search, page, 10);
            setGroups(data.groups || []);
            setTotalPages(data.pagination?.totalPages || 1);
            setTotalCount(data.pagination?.total || 0);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message || "Failed to fetch family groups" });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGroups(searchQuery, currentPage);
    }, [currentPage]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchGroups(searchQuery, 1);
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createForm.name || !createForm.primaryPatientMrNumber) {
            toast({ variant: "destructive", title: "Validation Error", description: "Group name and primary patient MR number are required." });
            return;
        }
        setCreating(true);
        try {
            await api.createFamilyGroup(createForm);
            toast({ title: "Family Group Created", description: `"${createForm.name}" has been created successfully.` });
            setCreateDialogOpen(false);
            setCreateForm({ name: "", primaryPatientMrNumber: "" });
            fetchGroups(searchQuery, currentPage);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message || "Failed to create family group" });
        } finally {
            setCreating(false);
        }
    };

    const handleMemberSearch = async (query: string) => {
        setMemberSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        setSearchingMember(true);
        try {
            const results = await api.searchPatients(query);
            setSearchResults(results.slice(0, 5));
        } catch {
            setSearchResults([]);
        } finally {
            setSearchingMember(false);
        }
    };

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGroup || !addMemberForm.mrNumber) {
            toast({ variant: "destructive", title: "Error", description: "Please select a patient." });
            return;
        }
        setAddingMember(true);
        try {
            const updated = await api.addFamilyMember(selectedGroup.id, addMemberForm);
            toast({ title: "Member Added", description: "Patient has been added to the family group." });
            setAddMemberDialogOpen(false);
            setAddMemberForm({ mrNumber: "", relationship: "Self" });
            setMemberSearchQuery("");
            setSearchResults([]);
            setSelectedGroup(updated);
            fetchGroups(searchQuery, currentPage);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message || "Failed to add member" });
        } finally {
            setAddingMember(false);
        }
    };

    const handleRemoveMember = async () => {
        if (!removeMemberInfo) return;
        try {
            await api.removeFamilyMember(removeMemberInfo.groupId, removeMemberInfo.mrNumber);
            toast({ title: "Member Removed", description: `${removeMemberInfo.name} has been removed from the group.` });
            // Refresh selected group
            const updatedGroups = await api.getFamilyGroups(searchQuery, currentPage, 10);
            const updated = updatedGroups.groups.find((g: any) => g.id === removeMemberInfo.groupId);
            setSelectedGroup(updated || null);
            fetchGroups(searchQuery, currentPage);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message || "Failed to remove member" });
        } finally {
            setRemoveMemberInfo(null);
        }
    };

    const handleDeleteGroup = async () => {
        if (!deleteGroupId) return;
        setDeletingGroup(true);
        try {
            await api.deleteFamilyGroup(deleteGroupId);
            toast({ title: "Group Deleted", description: "Family group has been deleted." });
            if (selectedGroup?.id === deleteGroupId) setSelectedGroup(null);
            fetchGroups(searchQuery, currentPage);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message || "Failed to delete group" });
        } finally {
            setDeletingGroup(false);
            setDeleteGroupId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                        Family Groups
                    </h1>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                        Manage patient family linkages for coordinated care
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                        {totalCount} group{totalCount !== 1 ? "s" : ""}
                    </Badge>
                    <Button
                        onClick={() => setCreateDialogOpen(true)}
                        className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs"
                    >
                        <Plus className="w-4 h-4" />
                        Create Family Group
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left: Groups List */}
                <div className="lg:col-span-2">
                    <Card className="border-none shadow-sm bg-white">
                        <CardHeader className="border-b border-slate-100 py-4">
                            <form onSubmit={handleSearch} className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Search groups or patients..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 rounded-xl border-slate-200 text-sm"
                                    />
                                </div>
                                <Button type="submit" variant="secondary" size="sm" className="rounded-xl">
                                    <Search className="w-4 h-4" />
                                </Button>
                                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => { setSearchQuery(""); fetchGroups("", 1); }}>
                                    <RefreshCw className="w-4 h-4" />
                                </Button>
                            </form>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="flex justify-center items-center py-16">
                                    <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                                </div>
                            ) : groups.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                                    <Network className="w-10 h-10 text-slate-300" />
                                    <p className="text-sm font-semibold">No family groups found</p>
                                    <p className="text-xs">Create one to start linking family members</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {groups.map((group) => (
                                        <button
                                            key={group.id}
                                            onClick={() => setSelectedGroup(group)}
                                            className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 ${selectedGroup?.id === group.id ? "bg-indigo-50/60 border-l-2 border-indigo-500" : ""}`}
                                        >
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 text-sm truncate">{group.name}</p>
                                                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                                    Primary: MR-{group.primaryPatientMrNumber} · {group.memberCount || 0} member{group.memberCount !== 1 ? "s" : ""}
                                                </p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="rounded-lg text-xs">
                                        Prev
                                    </Button>
                                    <span className="text-xs text-slate-500">{currentPage} / {totalPages}</span>
                                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="rounded-lg text-xs">
                                        Next
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Group Detail */}
                <div className="lg:col-span-3">
                    {!selectedGroup ? (
                        <div className="h-full flex flex-col items-center justify-center py-24 text-center text-slate-400 gap-4">
                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                                <Users className="w-7 h-7 text-slate-300" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-500">Select a family group</p>
                                <p className="text-xs mt-1">Click a group on the left to view and manage its members</p>
                            </div>
                        </div>
                    ) : (
                        <Card className="border-none shadow-sm bg-white">
                            <CardHeader className="border-b border-slate-100 py-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-lg font-black text-slate-900">{selectedGroup.name}</CardTitle>
                                        <CardDescription className="text-xs mt-0.5">
                                            Primary Patient: MR-{selectedGroup.primaryPatientMrNumber} · Created {new Date(selectedGroup.createdAt).toLocaleDateString()}
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            onClick={() => setAddMemberDialogOpen(true)}
                                            size="sm"
                                            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                                        >
                                            <UserPlus className="w-3.5 h-3.5" />
                                            Add Member
                                        </Button>
                                        <Button
                                            onClick={() => setDeleteGroupId(selectedGroup.id)}
                                            size="sm"
                                            variant="ghost"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-slate-50/70">
                                        <TableRow>
                                            <TableHead className="font-semibold text-slate-700">Patient</TableHead>
                                            <TableHead className="font-semibold text-slate-700">MR Number</TableHead>
                                            <TableHead className="font-semibold text-slate-700">Relationship</TableHead>
                                            <TableHead className="font-semibold text-slate-700 w-16">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(!selectedGroup.members || selectedGroup.members.length === 0) ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-32 text-center text-slate-400 text-sm">
                                                    No members in this group yet.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            selectedGroup.members.map((member: any) => (
                                                <TableRow key={member.mrNumber} className="hover:bg-slate-50/40">
                                                    <TableCell className="font-semibold text-slate-900 text-sm">{member.name}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="font-mono text-xs bg-slate-50">MR-{member.mrNumber}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="secondary"
                                                            className={`text-xs font-bold ${member.relationship === "Self" ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "bg-slate-100 text-slate-600"}`}
                                                        >
                                                            {member.relationship}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {member.relationship !== "Self" && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => setRemoveMemberInfo({ groupId: selectedGroup.id, mrNumber: member.mrNumber, name: member.name })}
                                                                className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Create Group Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase tracking-wide">Create Family Group</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateGroup} className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Group Name</Label>
                            <Input
                                placeholder="e.g. Kumar Family"
                                value={createForm.name}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                                className="rounded-xl"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Primary Patient MR Number</Label>
                            <Input
                                placeholder="e.g. 100423"
                                value={createForm.primaryPatientMrNumber}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, primaryPatientMrNumber: e.target.value }))}
                                className="rounded-xl font-mono"
                                required
                            />
                        </div>
                        <DialogFooter className="pt-2 gap-2">
                            <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} className="rounded-xl">Cancel</Button>
                            <Button type="submit" disabled={creating} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                                {creating ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                                Create Group
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Member Dialog */}
            <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase tracking-wide">Add Family Member</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddMember} className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Search Patient</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Search by name, MR number, or phone..."
                                    value={memberSearchQuery}
                                    onChange={(e) => handleMemberSearch(e.target.value)}
                                    className="pl-9 rounded-xl"
                                />
                            </div>
                            {searchingMember && (
                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                    <RefreshCw className="w-3 h-3 animate-spin" /> Searching...
                                </p>
                            )}
                            {searchResults.length > 0 && (
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    {searchResults.map((p: any) => (
                                        <button
                                            key={p.mrNumber}
                                            type="button"
                                            onClick={() => {
                                                setAddMemberForm(prev => ({ ...prev, mrNumber: p.mrNumber }));
                                                setMemberSearchQuery(`${p.name} (MR-${p.mrNumber})`);
                                                setSearchResults([]);
                                            }}
                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-b-0 ${addMemberForm.mrNumber === p.mrNumber ? "bg-indigo-50 text-indigo-700" : "text-slate-700"}`}
                                        >
                                            <span className="font-semibold">{p.name}</span>
                                            <span className="text-slate-400 text-xs ml-2">MR-{p.mrNumber} · {p.contactNumber}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {addMemberForm.mrNumber && (
                                <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                                    ✓ Selected: MR-{addMemberForm.mrNumber}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Relationship</Label>
                            <Select value={addMemberForm.relationship} onValueChange={(v) => setAddMemberForm(prev => ({ ...prev, relationship: v }))}>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {RELATIONSHIP_OPTIONS.map(r => (
                                        <SelectItem key={r} value={r}>{r}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter className="pt-2 gap-2">
                            <Button type="button" variant="outline" onClick={() => { setAddMemberDialogOpen(false); setMemberSearchQuery(""); setSearchResults([]); setAddMemberForm({ mrNumber: "", relationship: "Self" }); }} className="rounded-xl">Cancel</Button>
                            <Button type="submit" disabled={addingMember || !addMemberForm.mrNumber} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                                {addingMember ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                                Add Member
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Group Confirm */}
            <AlertDialog open={!!deleteGroupId} onOpenChange={(o) => !o && setDeleteGroupId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Family Group?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the family group and all its member links. Patient records themselves will not be affected. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteGroup} disabled={deletingGroup} className="bg-red-600 hover:bg-red-700 text-white">
                            {deletingGroup ? "Deleting..." : "Delete Group"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Remove Member Confirm */}
            <AlertDialog open={!!removeMemberInfo} onOpenChange={(o) => !o && setRemoveMemberInfo(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Member?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Remove <strong>{removeMemberInfo?.name}</strong> (MR-{removeMemberInfo?.mrNumber}) from this family group? The patient record will not be deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemoveMember} className="bg-red-600 hover:bg-red-700 text-white">
                            Remove Member
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
