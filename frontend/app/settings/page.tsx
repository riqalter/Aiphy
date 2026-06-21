"use client";

import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { useState } from "react";
import { User, Bell, Shield, Lock, Save, Globe } from "lucide-react";

export default function SettingsPage() {
  const [profile, setProfile] = useState({ name: "Nadya Najelina", email: "nadya@ug.ac.id" });
  const [notif, setNotif] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [jwtToken, setJwtToken] = useState("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiTmFkeWEgTmFqZWxpbmEiLCJpZCI6MTIzNDU2fQ...");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Pengaturan profil berhasil disimpan!");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pl-20 dark:bg-slate-950">
      <Sidebar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Header userName="Nadya Najelina" userTitle="Kelola informasi pribadi, preferensi belajar, dan keamanan akun." />

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
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Alamat Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
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

              <button
                type="submit"
                className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/10"
              >
                <Save className="h-4 w-4" />
                Simpan Perubahan
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
                  onClick={() => alert("Kunci JWT berhasil diregenerasi secara aman!")}
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
                  placeholder="Sandi lama"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                />
                <input
                  type="password"
                  placeholder="Sandi baru"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                />
                <button
                  onClick={() => alert("Sandi berhasil diubah!")}
                  className="w-full rounded-2xl bg-slate-950 py-3 text-xs font-bold text-white hover:bg-slate-850 transition dark:bg-indigo-600 dark:hover:bg-indigo-500"
                >
                  Perbarui Kata Sandi
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
