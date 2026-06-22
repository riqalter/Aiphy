"use client";

import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { useState, useEffect } from "react";
import { User, Bell, Shield, Lock, Save, Globe } from "lucide-react";
import { api, getCurrentUser, getAccessToken, getRefreshToken, saveTokens, saveCurrentUser } from "../lib/api";

export default function SettingsPage() {
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [notif, setNotif] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [jwtToken, setJwtToken] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setProfile({
        name: user.name || "",
        email: user.email || "",
      });
    }

    const token = getAccessToken();
    if (token) {
      setJwtToken(token);
    }

    const loadProfile = async () => {
      try {
        const res = await api.get("/api/user/profile");
        if (res.success && res.data) {
          setProfile({
            name: res.data.name || "",
            email: res.data.email || "",
          });
          setNotif(res.data.notificationEnabled ?? true);
          setDarkMode(res.data.darkMode ?? false);
        }
      } catch (err: any) {
        console.error("Failed to load profile:", err.message);
      }
    };
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await api.put("/api/user/profile", {
        name: profile.name,
        notificationEnabled: notif,
        darkMode: darkMode,
      });

      if (res.success && res.data) {
        // Update localStorage user object
        const user = getCurrentUser();
        if (user) {
          saveCurrentUser({
            ...user,
            name: res.data.name,
          });
        }
        alert("Pengaturan profil berhasil disimpan!");
      }
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan profil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pl-20 dark:bg-slate-950">
      <Sidebar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Header userName={profile.name || "Learner"} userTitle="Kelola informasi pribadi, preferensi belajar, dan keamanan akun." />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 mt-6">
          {/* Profile form */}
          <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 mb-6 dark:text-white flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-600" />
              Informasi Akun & Preferensi
            </h3>
            
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Nama Lengkap</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                 <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Alamat Email (Tidak dapat diubah)</label>
                  <input
                    type="email"
                    readOnly
                    value={profile.email}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-xs outline-none cursor-not-allowed opacity-75 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-bold text-slate-900 dark:text-white">Notifikasi Email</span>
                    <span className="text-[10px] text-slate-400">Terima ringkasan belajar dan pengingat kuis.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notif}
                    onChange={() => setNotif(!notif)}
                    className="h-4.5 w-9 rounded-full bg-slate-200 checked:bg-indigo-600 transition outline-none cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-bold text-slate-900 dark:text-white">Tampilan Gelap (Dark Mode)</span>
                    <span className="text-[10px] text-slate-400">Aktifkan kontras tinggi untuk kenyamanan mata malam hari.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={() => setDarkMode(!darkMode)}
                    className="h-4.5 w-9 rounded-full bg-slate-200 checked:bg-indigo-600 transition outline-none cursor-pointer"
                  />
                </div>
              </div>

               {error && <p className="text-red-550 text-xs font-semibold">{error}</p>}
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/10 disabled:opacity-70"
              >
                <Save className="h-4 w-4" />
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </form>
          </div>

          {/* Security and Credentials Panel */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-900 mb-4 dark:text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-600" />
                Keamanan & Token
              </h3>
              
              <div className="space-y-4">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kunci Sesi JWT aktif</span>
                  <div className="mt-2 rounded-xl bg-slate-900 p-3 font-mono text-[9px] text-indigo-300 break-all select-all">
                    {jwtToken}
                  </div>
                </div>
                 <button
                  onClick={async () => {
                    const refreshToken = getRefreshToken();
                    if (!refreshToken) {
                      alert("Sesi tidak ditemukan. Silakan login kembali.");
                      return;
                    }
                    try {
                      const res = await api.post("/api/auth/refresh", { refreshToken });
                      saveTokens(res.data.accessToken, res.data.refreshToken);
                      setJwtToken(res.data.accessToken);
                      alert("Kunci JWT berhasil diregenerasi secara aman!");
                    } catch (err: any) {
                      alert("Gagal meregenerasi token: " + err.message);
                    }
                  }}
                  className="w-full rounded-2xl border border-slate-200 py-3 text-xs font-bold hover:bg-slate-50 transition dark:border-slate-800 dark:hover:bg-slate-800"
                >
                  Regenerasi Token Keamanan
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-900 mb-4 dark:text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-indigo-600" />
                Ubah Sandi
              </h3>
               <div className="space-y-3">
                <input
                  type="password"
                  placeholder="Sandi lama (kosongkan jika tidak ada)"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                />
                <input
                  type="password"
                  placeholder="Sandi baru (min. 8 karakter)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                />
                <button
                  onClick={async () => {
                    if (!newPassword || newPassword.length < 8) {
                      alert("Sandi baru minimal harus 8 karakter.");
                      return;
                    }
                    setChangingPwd(true);
                    try {
                      await api.put("/api/user/password", {
                        currentPassword: currentPassword || undefined,
                        newPassword,
                      });
                      alert("Sandi berhasil diubah!");
                      setCurrentPassword("");
                      newPassword && setNewPassword("");
                    } catch (err: any) {
                      alert(err.message || "Gagal mengubah sandi.");
                    } finally {
                      setChangingPwd(false);
                    }
                  }}
                  disabled={changingPwd}
                  className="w-full rounded-2xl bg-slate-950 py-3 text-xs font-bold text-white hover:bg-slate-850 transition dark:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-75"
                >
                  {changingPwd ? "Mengubah..." : "Perbarui Kata Sandi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
