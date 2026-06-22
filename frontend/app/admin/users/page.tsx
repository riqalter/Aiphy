"use client";

import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { useState, useEffect } from "react";
import { Plus, Trash2, ShieldAlert, Search, ShieldCheck } from "lucide-react";
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

            {/* Quick Add Button */}
            <button
              onClick={() => setNewUserOpen(!newUserOpen)}
              className="rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/10 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5" />
              Tambah Akun Baru
            </button>
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
                            user.status === "active" 
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-955/20 dark:text-rose-400"
                          }`}>
                            {user.status === "active" ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td className="p-4 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleBlock(user.id, user.status)}
                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-[10px] font-bold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 transition"
                          >
                            {user.status === "active" ? "Blokir" : "Aktifkan"}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-850 dark:hover:bg-rose-950/30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-xs font-semibold text-slate-400">
                        Tidak ada pengguna yang terdaftar atau cocok dengan pencarian Anda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
