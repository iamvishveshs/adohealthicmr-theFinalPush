"use client";

import { useState, useEffect, Fragment, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import {
  ChevronRight,
  Mail,
  Edit3,
  Key,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  BookOpen,
  Search,
  Filter,
  X,
  Loader2
} from "lucide-react";

// Updated interfaces to match the new embedded answers data structure
interface AnswerRow {
  moduleId: number;
  questionId: number;
  answer: string;
  isCorrect?: boolean;
  submittedAt: string;
}

interface UserRow {
  id: string;
  username: string;
  email: string;
  role: string;
  answers?: AnswerRow[]; // Answers are now directly attached to the user
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [userName, setUserName] = useState("");

  // Modal States
  const [editModal, setEditModal] = useState<UserRow | null>(null);
  const [passwordModal, setPasswordModal] = useState<UserRow | null>(null);
  const [deleteModal, setDeleteModal] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ email: "", username: "" });
  const [newPassword, setNewPassword] = useState("");

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");

  // Accordion State
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      setIsAuthLoading(true);
      try {
        const meRes = await fetch("/api/auth/me", { credentials: "include" });
        const meData = await meRes.json();

        if (!meRes.ok || !meData.user) {
          setError("Please log in as admin to view users.");
          setIsUserLoggedIn(false);
          setIsAdmin(false);
          setLoading(false);
        } else if (meData.user.role !== "admin") {
          setError("Admin access required.");
          setIsUserLoggedIn(true);
          setIsAdmin(false);
          setLoading(false);
        } else {
          // Success Path: User is Admin
          setIsUserLoggedIn(true);
          setIsAdmin(true);
          setUserName(meData.user.username || meData.user.email || "Admin");
          await fetchUsers();
        }
      } catch (err) {
        setError("Failed to verify authentication.");
        setLoading(false);
      } finally {
        setIsAuthLoading(false);
      }
    }
    checkAuth();
  }, []);

  // Fetch Users (Now includes their specific answers embedded)
  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users", { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        setError("");
      } else {
        setError(data.error || data.message || "Failed to load users.");
      }
    } catch {
      setError("Failed to fetch users data.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
    window.location.href = "/";
  };

  const toggleUserAccordion = (userId: string) => {
    setExpandedUserId(expandedUserId === userId ? null : userId);
  };

  // Client-side instant filtering logic
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            u.username.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === "all" || u.role === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, filterRole]);

  // Action Logic Preserved
  const handleEdit = (u: UserRow) => {
    setEditModal(u);
    setEditForm({ email: u.email, username: u.username });
    setActionError("");
  };

  const handleSaveEdit = async () => {
    if (!editModal) return;
    setActionLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/users/${editModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: editForm.email, username: editForm.username }),
      });
      if (res.ok) {
        setEditModal(null);
        await fetchUsers();
      } else {
        const data = await res.json();
        setActionError(data.error || "Failed to update user");
      }
    } catch { setActionError("Failed to update user"); }
    finally { setActionLoading(false); }
  };

  const handleSetPassword = (u: UserRow) => {
    setPasswordModal(u);
    setNewPassword("");
    setActionError("");
  };

  const handleSavePassword = async () => {
    if (!passwordModal || !newPassword || newPassword.length < 6) {
      setActionError("Password must be at least 8 characters");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/users/${passwordModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) setPasswordModal(null);
      else setActionError("Failed to set password");
    } catch { setActionError("Failed to set password"); }
    finally { setActionLoading(false); }
  };

  const handleDelete = (u: UserRow) => {
    setDeleteModal(u);
    setActionError("");
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/users/${deleteModal.id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setDeleteModal(null);
        await fetchUsers();
      } else setActionError("Failed to delete user");
    } catch { setActionError("Failed to delete user"); }
    finally { setActionLoading(false); }
  };

  return (
    <main className="min-h-screen bg-[#0f172a] font-sans text-slate-300">
      <Header isUserLoggedIn={false} isAdmin={isAdmin} userName={userName} isLoading={isAuthLoading} onLoginClick={() => (window.location.href = "/")} onLogout={handleLogout} />

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col sm:flex-row items-baseline justify-between gap-4 mb-8 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-4xl font-light text-white tracking-tight italic">User <span className="font-bold text-yellow-500/80">Accounts</span></h1>
            <p className="text-slate-500 text-sm mt-2 font-medium tracking-wide">AdoHealthICMR Data</p>
          </div>
          <Link href="/" className="group flex items-center gap-2 px-6 py-2 border border-slate-700 text-slate-300 text-xs font-bold uppercase tracking-widest hover:border-yellow-500/50 hover:text-yellow-500 transition-all duration-300 no-round">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Dashboard
          </Link>
        </div>

        {/* Search Console */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="md:col-span-3 relative flex items-center">
              <Search className="absolute left-4 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Filter by name or identity..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-10 py-3 bg-slate-900 border border-slate-800 text-slate-200 text-sm outline-none focus:border-yellow-500/40 no-round transition-all"
              />
              {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute right-4 text-slate-500 hover:text-white"><X size={14}/></button>}
            </div>
            <div className="relative flex items-center">
              <Filter className="absolute left-4 text-slate-500" size={14} />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-widest focus:border-yellow-500/40 outline-none no-round cursor-pointer appearance-none"
              >
                <option value="all">All Access</option>
                <option value="admin">Administrators</option>
                <option value="user">Participants</option>
              </select>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Syncing Users</p>
          </div>
        ) : error ? (
          <div className="p-8 bg-red-500/10 border border-red-500/20 text-red-400 no-round">
            <h3 className="font-bold uppercase text-sm mb-2">Access Error</h3>
            <p className="text-sm opacity-80 mb-6">{error}</p>
            <Link href="/" className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-xs font-bold uppercase transition-colors">Return</Link>
          </div>
        ) : (
          <div className="border border-slate-800 bg-[#1e293b]/30 shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-800">
                    <th className="w-12 px-4 py-5" />
                    <th className="px-6 py-5 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] text-left">Reference Identity</th>
                    <th className="px-6 py-5 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] text-left">System Alias</th>
                    <th className="px-6 py-5 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] text-left">Role</th>
                    <th className="px-6 py-5 text-right text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Command</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-600 italic">No user matching current criteria</td></tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isExpanded = expandedUserId === u.id;
                      const subs = u.answers || []; // Pulls directly from the embedded answers

                      // Categorize submissions by module ID
                      const grouped = subs.reduce((acc, curr) => {
                        const title = `Module ${curr.moduleId}`;
                        if (!acc[title]) acc[title] = [];
                        acc[title].push(curr);
                        return acc;
                      }, {} as Record<string, AnswerRow[]>);

                      return (
                        <Fragment key={u.id}>
                          <tr className={`group transition-all duration-300 cursor-pointer ${isExpanded ? "bg-slate-800/40" : "hover:bg-slate-800/20"}`} onClick={() => toggleUserAccordion(u.id)}>
                            <td className="px-4 py-5 text-center">
                              <ChevronRight size={16} className={`text-slate-600 transition-all duration-500 ${isExpanded ? "rotate-90 text-yellow-500" : ""}`} />
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 border border-slate-700 text-slate-500 transition-all group-hover:text-yellow-500 group-hover:border-yellow-500/30"><Mail size={14} /></div>
                                <span className="font-semibold text-slate-200">{u.email}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-slate-500 font-medium text-sm">{u.username}</td>
                            <td className="px-6 py-5">
                              <span className={`inline-block px-3 py-0.5 text-[9px] font-black uppercase tracking-widest border transition-all duration-500 ${u.role === "admin" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-slate-800 text-slate-400 border-slate-700"}`}>{u.role}</span>
                            </td>
                            <td className="px-6 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-1 justify-end opacity-100 group-hover:opacity-100 transition-all duration-300">
                                <button onClick={() => handleEdit(u)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"><Edit3 size={14}/></button>
                                <button onClick={() => handleSetPassword(u)} className="p-2 text-slate-400 hover:text-yellow-500 hover:bg-yellow-500/10 transition-all"><Key size={14}/></button>
                                <button onClick={() => handleDelete(u)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all"><Trash2 size={14}/></button>
                              </div>
                            </td>
                          </tr>

                          {/* Instant Accordion Details */}
                          {isExpanded && (
                            <tr className="bg-slate-900/30 border-l-2 border-yellow-500 transition-all duration-500">
                              <td colSpan={5} className="p-0 border-b border-slate-800">
                                <div className="px-10 py-12 animate-in fade-in slide-in-from-top-1 duration-700">
                                  <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                      <div className="h-4 w-[1px] bg-yellow-500" />
                                      <h3 className="text-[10px] font-black text-slate-400 ">User Progress History : {u.username}</h3>
                                    </div>
                                    {subs.length > 0 && (
                                      <span className="text-[10px] font-black text-green-500 bg-green-500/10 px-3 py-1 border border-green-500/20">
                                        Total Answers: {subs.length}
                                      </span>
                                    )}
                                  </div>

                                  {Object.keys(grouped).length === 0 ? (
                                    <div className="py-10 text-center border border-dashed border-slate-800">
                                      <p className="text-slate-600 text-xs italic tracking-widest">No submission activity recorded</p>
                                    </div>
                                  ) : (
                                    <div className="space-y-12">
                                      {Object.entries(grouped).map(([title, items]) => (
                                        <div key={title} className="border border-slate-800 no-round shadow-lg">
                                          <div className="bg-slate-800/30 px-6 py-3 flex items-center justify-between border-b border-slate-800">
                                            <div className="flex items-center gap-3">
                                              <BookOpen size={14} className="text-yellow-500/60" />
                                              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{title}</h4>
                                            </div>
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{items.length} Tasks</span>
                                          </div>
                                          <table className="w-full text-[11px] text-left">
                                            <thead>
                                              <tr className="bg-slate-900/50 text-[9px] font-black uppercase text-slate-500 border-b border-slate-800">
                                                <th className="px-6 py-3">Reference</th>
                                                <th className="px-6 py-3">Student Response</th>
                                                <th className="px-6 py-3 text-center">Status</th>
                                                <th className="px-6 py-3 text-right">Date</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/40">
                                              {items.map((s, idx) => (
                                                <tr key={idx} className="hover:bg-white/[0.01] transition-all">
                                                  <td className="px-6 py-4 text-slate-500 font-mono tracking-tighter">Q.{s.questionId}</td>
                                                  <td className="px-6 py-4 text-slate-300 font-medium italic border-r border-slate-800/30">&quot;{s.answer}&quot;</td>
                                                  <td className="px-6 py-4">
                                                    <div className="flex justify-center">
                                                      {s.isCorrect === true ? (
                                                        <span className="text-green-500/80 font-black uppercase tracking-tighter flex items-center gap-2">
                                                          <CheckCircle2 size={10} /> Correct
                                                        </span>
                                                      ) : s.isCorrect === false ? (
                                                        <span className="text-red-500/80 font-black uppercase tracking-tighter flex items-center gap-2">
                                                          <XCircle size={10} /> Incorrect
                                                        </span>
                                                      ) : (
                                                        <span className="text-slate-600 uppercase font-black text-[9px]">Awaiting</span>
                                                      )}
                                                    </div>
                                                  </td>
                                                  <td className="px-6 py-4 text-slate-600 text-right font-mono text-[10px]">
                                                    {new Date(s.submittedAt).toLocaleDateString()}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editModal && (
          <div className="fixed inset-0 bg-[#0a0a0a]/90 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-[#1e293b] border border-slate-700 p-10 max-w-md w-full shadow-2xl transition-all no-round">
              <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-8 italic">Update Personnel Meta</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Email Key</label>
                  <input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} className="w-full px-4 py-3 bg-slate-900 border border-slate-700 text-slate-200 outline-none focus:border-yellow-500/50 no-round transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Username</label>
                  <input type="text" value={editForm.username} onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))} className="w-full px-4 py-3 bg-slate-900 border border-slate-700 text-slate-200 outline-none focus:border-yellow-500/50 no-round transition-all" />
                </div>
                {actionError && <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest">{actionError}</p>}
              </div>
              <div className="flex gap-4 mt-12">
                <button onClick={() => setEditModal(null)} className="flex-1 py-4 text-slate-400 text-xs font-bold uppercase hover:text-white transition-all no-round">Abort</button>
                <button onClick={handleSaveEdit} disabled={actionLoading} className="flex-1 py-4 bg-yellow-500 text-slate-900 font-black text-xs uppercase tracking-widest hover:bg-yellow-400 disabled:opacity-30 no-round transition-all">{actionLoading ? "Syncing" : "Confirm Update"}</button>
              </div>
            </div>
          </div>
        )}

        {/* Set Password Modal */}
        {passwordModal && (
          <div className="fixed inset-0 bg-[#0a0a0a]/90 z-50 flex items-center justify-center p-4 animate-in fade-in no-round">
            <div className="bg-[#1e293b] border border-slate-700 p-10 max-w-md w-full shadow-2xl no-round">
              <h2 className="text-xl font-bold text-white uppercase mb-2 italic">Security Overhaul</h2>
              <p className="text-slate-500 text-[10px] font-bold uppercase mb-10 tracking-widest">ID: <span className="text-slate-300">{passwordModal.email}</span></p>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">New System Key</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 bg-slate-900 border border-slate-700 text-white outline-none focus:border-yellow-500/50 transition-all no-round" />
                </div>
                {actionError && <p className="text-red-400 text-[10px] font-bold uppercase">{actionError}</p>}
              </div>
              <div className="flex gap-4 mt-12">
                <button onClick={() => setPasswordModal(null)} className="flex-1 py-4 text-slate-400 text-xs font-bold uppercase hover:text-white no-round transition-all">Discard</button>
                <button onClick={handleSavePassword} disabled={actionLoading || newPassword.length < 6} className="flex-1 py-4 bg-yellow-500 text-slate-900 font-black text-xs uppercase tracking-widest disabled:opacity-20 no-round transition-all">Confirm</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {deleteModal && (
          <div className="fixed inset-0 bg-[#0a0a0a]/95 z-50 flex items-center justify-center p-4 animate-in zoom-in-95 no-round">
            <div className="bg-[#1e293b] border border-red-500/20 p-12 max-w-md w-full text-center no-round shadow-2xl">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 mx-auto flex items-center justify-center mb-8 border border-red-500/20 no-round"><Trash2 size={24} /></div>
              <h2 className="text-xl font-bold text-white uppercase mb-4 italic">Terminate Node Access</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-10 font-medium italic">Purging record <strong className="text-slate-200">{deleteModal.email}</strong>.<br/>This procedure is permanent.</p>
              {actionError && <p className="text-red-400 text-[10px] font-black uppercase mb-6">{actionError}</p>}
              <div className="flex flex-col gap-2">
                <button onClick={handleConfirmDelete} disabled={actionLoading} className="w-full py-4 bg-red-500/80 text-white font-black text-xs uppercase tracking-widest hover:bg-red-500 transition-all duration-300 no-round">{actionLoading ? "Processing" : "Execute Wipe"}</button>
                <button onClick={() => setDeleteModal(null)} className="w-full py-4 text-slate-500 text-xs font-bold uppercase hover:text-white transition-all no-round">Abort</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .no-round, * { border-radius: 0px !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; }
        ::-webkit-scrollbar-thumb:hover { background: #eab308; }
      `}</style>
    </main>
  );
}