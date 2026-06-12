import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWithAuth } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { 
  UserPlus, 
  Trash2, 
  RefreshCw, 
  ShieldAlert, 
  UserCheck, 
  Mail, 
  Calendar,
  X,
  Edit
} from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "team" | "ca";
  created_at: string;
}

export default function TeamManagement() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  // --- DATA STATES ---
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- ADD MODAL / FORM STATES ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "team" | "ca">("team");
  const [confirmDeleteMember, setConfirmDeleteMember] = useState<TeamMember | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // --- EDIT MODAL / FORM STATES ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "team" | "ca">("team");
  const [editPassword, setEditPassword] = useState("");

  // --- LOAD MEMBERS ---
  const loadMembers = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetchWithAuth("/api/users");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to fetch team members");
      }
      const data = await res.json();
      setMembers(data.users ?? []);
    } catch (error) {
      toast({
        title: "Sync Error",
        description: error instanceof Error ? error.message : "Could not retrieve team members directory.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const isAdmin = currentUser?.role === "admin";

  // --- ADD MEMBER HANDLER ---
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setFormError("All fields are required.");
      return;
    }

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetchWithAuth("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to add team member");
      }

      toast({
        title: "Success",
        description: `Successfully added ${name} to the directory.`,
        variant: "success",
      });

      // Reset Form and Modal
      setName("");
      setEmail("");
      setPassword("");
      setRole("team");
      setIsAddModalOpen(false);
      
      // Reload directory
      await loadMembers(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to save member.");
    } finally {
      setSaving(false);
    }
  };

  // --- EDIT MEMBER HANDLER ---
  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!editName.trim() || !editEmail.trim()) {
      setFormError("Name and email are required.");
      return;
    }

    if (editPassword && editPassword.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetchWithAuth(`/api/users/${editMemberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          role: editRole,
          password: editPassword.trim() !== "" ? editPassword : null
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to update team member");
      }

      toast({
        title: "Success",
        description: `Successfully updated ${editName}.`,
        variant: "success",
      });

      setIsEditModalOpen(false);
      setEditMemberId(null);
      
      // Reload directory
      await loadMembers(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to update member.");
    } finally {
      setSaving(false);
    }
  };

  // --- DELETE MEMBER HANDLER ---
  const handleDeleteMember = (member: TeamMember) => {
    if (!isAdmin) return;

    if (member.email.toLowerCase() === currentUser?.email.toLowerCase()) {
      toast({
        title: "Action Denied",
        description: "You cannot delete your own logged-in account.",
        variant: "destructive",
      });
      return;
    }

    setConfirmDeleteMember(member);
  };

  const executeDeleteMember = async () => {
    if (!confirmDeleteMember) return;
    const member = confirmDeleteMember;
    setConfirmDeleteMember(null);

    try {
      const res = await fetchWithAuth(`/api/users/${member.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to delete user");
      }

      toast({
        title: "Member Deleted",
        description: `${member.name} has been removed successfully.`,
        variant: "success",
      });

      // Reload directory
      await loadMembers(false);
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete team member.",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout 
      title="Team Directory & RBAC Management" 
      subtitle="View, add, and manage user accounts and system access privileges."
    >
      <div className="space-y-6">
        
        {/* ==========================================
            1. ACTION BAR
           ========================================== */}
        <div className="bg-white p-4 rounded-xl border border-blue-pale shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-navy">Active Accounts ({members.length})</h3>
            {!isAdmin && (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> View Only Access
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => loadMembers(true)} 
              disabled={refreshing || loading}
              className="p-2 border border-blue-pale text-blue-mid hover:bg-blue-pale rounded-lg transition disabled:opacity-50"
              title="Sync Directory"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            
            {isAdmin ? (
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="btn-ui btn-primary flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                Add Team Member
              </button>
            ) : (
              <button 
                disabled
                className="btn-ui btn-primary flex items-center gap-1.5 opacity-50 cursor-not-allowed"
                title="Administrator permissions required to add members."
              >
                <UserPlus className="w-4 h-4" />
                Add Team Member
              </button>
            )}
          </div>
        </div>

        {/* ==========================================
            2. DIRECTORY GRID
           ========================================== */}
        {loading ? (
          <div className="p-12 text-center bg-white rounded-xl border border-blue-pale shadow-sm">
            <RefreshCw className="w-8 h-8 text-blue-mid animate-spin mx-auto mb-3" />
            <p className="text-sm text-blue-mid font-semibold">Retrieving member accounts...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-white rounded-xl border border-blue-pale shadow-sm text-blue-muted italic">
                No active team accounts found.
              </div>
            ) : (
              members.map((member) => {
                const isSelf = member.email.toLowerCase() === currentUser?.email.toLowerCase();
                return (
                  <div 
                    key={member.id} 
                    className="p-6 bg-white border border-blue-pale rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-navy text-lg leading-tight flex items-center gap-1.5">
                            {member.name}
                            {isSelf && (
                              <span className="bg-blue-pale text-navy text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                                You
                              </span>
                            )}
                          </h4>
                          <span className={`inline-block mt-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wide ${
                            member.role === "admin" 
                              ? "bg-red-100 text-red-800" 
                              : member.role === "team"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          }`}>
                            🛡️ {member.role}
                          </span>
                        </div>
                        
                        {isAdmin && (
                          <div className="flex gap-1">
                            <button 
                              onClick={() => {
                                setEditMemberId(member.id);
                                setEditName(member.name);
                                setEditEmail(member.email);
                                setEditRole(member.role);
                                setEditPassword("");
                                setFormError(null);
                                setIsEditModalOpen(true);
                              }}
                              className="p-1.5 text-blue-muted hover:text-navy hover:bg-blue-pale rounded-lg transition"
                              title="Edit Member Details"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {!isSelf && (
                              <button 
                                onClick={() => handleDeleteMember(member)}
                                className="p-1.5 text-danger-muted hover:text-danger hover:bg-danger-bg rounded-lg transition"
                                title="Remove Member"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="mt-4 space-y-2 text-sm text-blue-mid">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-blue-muted" />
                          <span className="truncate">{member.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-blue-muted" />
                          <span>Joined: {new Date(member.created_at).toLocaleDateString("en-IN")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-blue-pale flex justify-between items-center text-xs text-blue-muted">
                      <span>ID: {member.id.substring(0, 8)}...</span>
                      <span className="flex items-center gap-1 font-semibold text-success">
                        <UserCheck className="w-3.5 h-3.5" /> Synchronized
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ==========================================
            3. ADD MEMBER MODAL
           ========================================== */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-xl shadow-xl overflow-hidden border border-blue-pale animate-scale-up">
              {/* Modal Header */}
              <div className="bg-navy p-4 text-white flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <UserPlus className="w-5 h-5" /> Add Team Member
                </h3>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-white/80 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleAddMember} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-danger-bg border border-danger-light rounded-lg text-xs text-danger font-semibold">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full px-4 py-2 border border-blue-pale rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@antiaifinance.com"
                    className="w-full px-4 py-2 border border-blue-pale rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1">Initial Password</label>
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full px-4 py-2 border border-blue-pale rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1">System Role Access</label>
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-4 py-2 border border-blue-pale rounded-lg text-sm bg-background focus:outline-none"
                  >
                    <option value="team">Team Member (Limited write permissions)</option>
                    <option value="admin">Administrator (Full CRUD permissions)</option>
                    <option value="ca">CA Auditor (Read-only portal views)</option>
                  </select>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex gap-3 pt-4 border-t border-blue-pale mt-6">
                  <button 
                    type="button" 
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-2 border border-blue-pale text-blue-mid font-semibold rounded-lg hover:bg-blue-pale transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="flex-1 py-2 bg-navy hover:bg-navy-light text-white font-bold rounded-lg transition disabled:opacity-50"
                  >
                    {saving ? "Saving Member..." : "Save Member"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==========================================
            4. EDIT MEMBER MODAL
           ========================================== */}
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-xl shadow-xl overflow-hidden border border-blue-pale animate-scale-up">
              {/* Modal Header */}
              <div className="bg-navy p-4 text-white flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Edit className="w-5 h-5" /> Edit Team Member
                </h3>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-white/80 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleEditMember} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-danger-bg border border-danger-light rounded-lg text-xs text-danger font-semibold">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full px-4 py-2 border border-blue-pale rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="name@antiaifinance.com"
                    className="w-full px-4 py-2 border border-blue-pale rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1">Reset Password</label>
                  <input 
                    type="password" 
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="w-full px-4 py-2 border border-blue-pale rounded-lg text-sm bg-background focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                  <p className="text-[10px] text-blue-muted mt-1">
                    Allows directly changing password without requiring current password.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1">System Role Access</label>
                  <select 
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full px-4 py-2 border border-blue-pale rounded-lg text-sm bg-background focus:outline-none"
                  >
                    <option value="team">Team Member (Limited write permissions)</option>
                    <option value="admin">Administrator (Full CRUD permissions)</option>
                    <option value="ca">CA Auditor (Read-only portal views)</option>
                  </select>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex gap-3 pt-4 border-t border-blue-pale mt-6">
                  <button 
                    type="button" 
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 py-2 border border-blue-pale text-blue-mid font-semibold rounded-lg hover:bg-blue-pale transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="flex-1 py-2 bg-navy hover:bg-navy-light text-white font-bold rounded-lg transition disabled:opacity-50"
                  >
                    {saving ? "Updating..." : "Update Details"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>

      <ConfirmDialog 
        isOpen={!!confirmDeleteMember}
        title="Remove Team Member"
        message={`Are you sure you want to remove ${confirmDeleteMember?.name} from the team? This action will permanently deactivate their account credentials.`}
        onConfirm={executeDeleteMember}
        onCancel={() => setConfirmDeleteMember(null)}
        confirmText="Remove"
      />
    </Layout>
  );
}
