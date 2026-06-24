"use client";

import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { useState, useEffect } from "react";
import { Plus, Trash2, ShieldAlert, Search, ShieldCheck, Send, Bell } from "lucide-react";
import { api } from "../../lib/api";

export default function AdminUsersPage() {
  const [usersList, setUsersList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("learner");

  // Notification modal states
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [notifTargetUserId, setNotifTargetUserId] = useState("all");
  const [notifTargetUserName, setNotifTargetUserName] = useState("Semua Pengguna");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifType, setNotifType] = useState("info");

  // Load profile and user list
  const fetchUsers = async (search = "") => {
    try {
      const res = await api.get(`/api/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`);
      setUsersList(res.data || []);
    } catch (err) {
      console.error("Gagal memuat daftar pengguna:", err);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const profileRes = await api.get("/api/user/profile").catch(() => null);
        if (profileRes) {
          setProfile(profileRes.data);
        }
        await fetchUsers();
      } catch (err) {
        console.error("Gagal inisialisasi:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Fetch users when search query changes
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (!loading) {
        fetchUsers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Toggle user subscription plan between Basic Learner and Pro Learner
  const handleTogglePlan = async (userId: string, currentPlan: string) => {
    const nextPlan = currentPlan === "Pro Learner" ? "Basic Learner" : "Pro Learner";
    try {
      await api.put(`/api/admin/users/${userId}`, { planName: nextPlan });
      alert(`User berhasil di-upgrade/downgrade ke paket ${nextPlan}!`);
      fetchUsers(searchQuery);
    } catch (err: any) {
      alert("Gagal memperbarui paket langganan: " + err.message);
    }
  };

  // Toggle user block/suspend status
  const handleToggleBlock = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "suspended" ? "active" : "suspended";
    try {
      await api.put(`/api/admin/users/${userId}`, { status: nextStatus });
      alert(`User berhasil di-${nextStatus === "suspended" ? "blokir" : "aktifkan"}!`);
      fetchUsers(searchQuery);
    } catch (err: any) {
      alert("Gagal memperbarui status user: " + err.message);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus user ini secara permanen dari database?")) return;
    try {
      await api.delete(`/api/admin/users/${userId}`);
      alert("User berhasil dihapus secara permanen!");
      fetchUsers(searchQuery);
    } catch (err: any) {
      alert("Gagal menghapus user: " + err.message);
    }
  };

  // Add new user account
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    try {
      await api.post("/api/admin/users", {
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
        password: "password123", // Default placeholder password
      });

      alert("Akun pengguna baru berhasil dibuat!");
      setNewUserName("");
      setNewUserEmail("");
      setNewUserOpen(false);
      fetchUsers(searchQuery);
    } catch (err: any) {
      alert("Gagal menambahkan pengguna baru: " + err.message);
    }
  };

  // Send a custom notification to a user or broadcast to all users
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) return;

    try {
      await api.post("/api/admin/notifications", {
        userId: notifTargetUserId,
        type: notifType,
        title: notifTitle,
        message: notifMessage,
      });

      alert(`Pemberitahuan berhasil terkirim ke: ${notifTargetUserName}!`);
      setNotifModalOpen(false);
      setNotifTitle("");
      setNotifMessage("");
      setNotifType("info");
    } catch (err: any) {
      alert("Gagal mengirim pemberitahuan: " + err.message);
    }
  };

  // Map backend roles to pretty frontend tags
  const getRoleLabel = (role: string) => {
    switch (role) {
      case "super_admin": return "Super Administrator";
      case "content_admin": return "Content Administrator";
      case "instructor": return "Instructor Access";
      default: return "Standard Learner";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-955">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto dark:border-indigo-400"></div>
          <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Memuat data pengguna...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pl-20 dark:bg-slate-955 font-sans">
      <Sidebar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Header userName={profile?.name || "User Management"} userTitle="Manajemen data akses pengguna, blokir akun, serta pemberian lisensi instruktur." />

        <div className="mt-8 space-y-6">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari pengguna berdasarkan nama atau email..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white font-bold"
              />
            </div>

            {/* Quick Add & Broadcast Buttons */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => {
                  setNotifTargetUserId("all");
                  setNotifTargetUserName("Semua Pengguna");
                  setNotifTitle("");
                  setNotifMessage("");
                  setNotifType("info");
                  setNotifModalOpen(true);
                }}
                className="rounded-2xl border border-indigo-200 text-indigo-600 bg-indigo-50/10 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-400 dark:bg-indigo-950/10 dark:hover:bg-indigo-950 px-4 py-2.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Bell className="h-4 w-4" />
                Kirim Notifikasi Massal
              </button>
              <button
                onClick={() => setNewUserOpen(!newUserOpen)}
                className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/10 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-4.5 w-4.5" />
                Tambah Akun Baru
              </button>
            </div>
          </div>

          {/* Add User Section Form */}
          {newUserOpen && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 max-w-2xl">
              <h3 className="text-xs font-extrabold text-slate-900 mb-4 dark:text-white uppercase tracking-wider">Form Tambah Pengguna Baru</h3>
              <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Contoh: Andi Pratama"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alamat Email</label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="Contoh: andi@gmail.com"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-bold"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hak Akses</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-indigo-200"
                    >
                      <option value="learner">Standard Learner</option>
                      <option value="instructor">Instructor Access</option>
                      <option value="content_admin">Content Admin</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-900 transition dark:bg-indigo-600 dark:hover:bg-indigo-500 self-end h-[38px] cursor-pointer"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* User Database Table Grid */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="p-5 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between bg-slate-50/40 dark:bg-slate-955/20">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Daftar Akun Terdaftar</h3>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
                {usersList.length} Ditemukan
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-slate-605 dark:text-slate-300">
                <thead className="bg-slate-50 text-slate-700 dark:bg-slate-955/20 dark:text-slate-400 border-b border-slate-100 dark:border-slate-850">
                  <tr>
                    <th className="p-4 font-bold">Nama</th>
                    <th className="p-4 font-bold">Email</th>
                    <th className="p-4 font-bold">Hak Akses</th>
                    <th className="p-4 font-bold">Paket Langganan</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {usersList.length > 0 ? (
                    usersList.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10">
                        <td className="p-4 font-semibold text-slate-950 dark:text-white">{user.name}</td>
                        <td className="p-4">{user.email}</td>
                        <td className="p-4 font-medium">{getRoleLabel(user.role)}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            user.planName === "Pro Learner"
                              ? "bg-indigo-50 text-indigo-750 dark:bg-indigo-950/20 dark:text-indigo-400"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}>
                            {user.planName || "Basic Learner"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            user.status === "active" 
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-955/20 dark:text-rose-400"
                          }`}>
                            {user.status === "active" ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td className="p-4 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleTogglePlan(user.id, user.planName)}
                            className={`rounded-xl px-3 py-1.5 text-[10px] font-bold border transition ${
                              user.planName === "Pro Learner"
                                ? "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-300"
                                : "border-indigo-200 bg-indigo-50/20 text-indigo-650 hover:bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/20 dark:text-indigo-400 dark:hover:bg-indigo-950"
                            }`}
                          >
                            {user.planName === "Pro Learner" ? "Downgrade ke Basic" : "Upgrade ke Pro"}
                          </button>
                          <button
                            onClick={() => handleToggleBlock(user.id, user.status)}
                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-[10px] font-bold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            {user.status === "active" ? "Blokir" : "Aktifkan"}
                          </button>
                          <button
                            onClick={() => {
                              setNotifTargetUserId(user.id);
                              setNotifTargetUserName(user.name);
                              setNotifTitle("");
                              setNotifMessage("");
                              setNotifType("info");
                              setNotifModalOpen(true);
                            }}
                            title="Kirim Notifikasi"
                            className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-850 dark:hover:bg-indigo-950/30 transition cursor-pointer"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-850 dark:hover:bg-rose-955/30 transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs font-semibold text-slate-400">
                        Tidak ada pengguna yang terdaftar atau cocok dengan pencarian Anda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notification Sender Modal */}
          {notifModalOpen && (
            <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                    Kirim Notifikasi
                  </h4>
                  <button
                    onClick={() => setNotifModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                  >
                    Tutup
                  </button>
                </div>

                <form onSubmit={handleSendNotification} className="space-y-3.5">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Penerima</label>
                    <input
                      type="text"
                      disabled
                      value={notifTargetUserName}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950 px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Judul</label>
                    <input
                      type="text"
                      required
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      placeholder="Contoh: Modul Baru Diterbitkan"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-955 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tipe Notifikasi</label>
                    <select
                      value={notifType}
                      onChange={(e) => setNotifType(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-955 dark:text-indigo-200"
                    >
                      <option value="info">📢 Info Umum</option>
                      <option value="success">✅ Sukses / Kelulusan</option>
                      <option value="streak">🔥 Streak Belajar</option>
                      <option value="badge">🏆 Badge Baru</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pesan</label>
                    <textarea
                      required
                      rows={3}
                      value={notifMessage}
                      onChange={(e) => setNotifMessage(e.target.value)}
                      placeholder="Tulis pesan pemberitahuan di sini..."
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-955 dark:text-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setNotifModalOpen(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-[10px] font-bold text-white hover:bg-indigo-550 transition shadow-md cursor-pointer"
                    >
                      Kirim Notifikasi
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
