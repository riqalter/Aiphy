"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import Link from "next/link";
import { 
  Users, BookOpen, Coins, ShieldAlert, TrendingUp, Sparkles, Activity,
  ArrowRight, ShieldCheck, Zap
} from "lucide-react";
import { api } from "../lib/api";

export default function AdminDashboardPage() {
  const [statsData, setStatsData] = useState<any>(null);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAdminData() {
      try {
        const [statsRes, activityRes, profileRes] = await Promise.all([
          api.get("/api/admin/stats").catch(() => ({ data: { totalUsers: 0, totalCourses: 0, totalTokens: 0 } })),
          api.get("/api/admin/activity").catch(() => ({ data: [] })),
          api.get("/api/user/profile").catch(() => null)
        ]);

        setStatsData(statsRes.data);
        setActivityFeed(activityRes.data || []);
        if (profileRes) {
          setProfile(profileRes.data);
        }
      } catch (err) {
        console.error("Gagal memuat analitik admin:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();
  }, []);

  const stats = [
    { name: "Total Pengguna", val: statsData?.totalUsers?.toString() || "0", icon: Users, diff: "Siswa terdaftar aktif", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
    { name: "Total Kelas", val: statsData?.totalCourses?.toString() || "0", icon: BookOpen, diff: "Kurikulum diterbitkan", color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20" },
    { name: "Token AI Terpakai", val: statsData?.totalTokens?.toLocaleString() || "0", icon: Coins, diff: "Pemakaian LLM Tutor", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20" },
    { name: "Isu Keamanan", val: "0", icon: ShieldAlert, diff: "Sistem Terlindungi", color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/20" }
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-955">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto dark:border-indigo-400"></div>
          <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Memuat Analitik Admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pl-20 dark:bg-slate-950">
      <Sidebar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Header userName={profile?.name || "Administrator"} userTitle="Manajemen data pengguna, konten kurikulum, dan pemantauan AIphy." />

        {/* stats grid */}
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mt-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{stat.name}</span>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${stat.bg} ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{stat.val}</span>
                  <span className="block mt-1 text-[10px] font-bold text-slate-450 dark:text-slate-500">{stat.diff}</span>
                </div>
              </div>
            );
          })}
        </section>

        {/* Dashboard Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
          
          {/* Recent Activity Feed */}
          <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="h-4.5 w-4.5 text-red-500" />
                Aktivitas Pengguna & Sistem
              </h3>
            </div>
            
            <div className="mt-4 space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {activityFeed.length > 0 ? (
                activityFeed.map((act) => (
                  <div key={act.id} className="flex items-start justify-between text-xs p-3 hover:bg-slate-50 rounded-2xl dark:hover:bg-slate-850/30">
                    <div className="flex items-center gap-3">
                      <span className="text-base">
                        {act.actionType === "login" ? "🔑" : act.actionType === "complete" ? "✅" : "⚙️"}
                      </span>
                      <div>
                        <p className="font-extrabold text-slate-950 dark:text-white">{act.userEmail || "Siswa AIphy"}</p>
                        <p className="text-slate-550 dark:text-slate-400 mt-0.5">{act.details || act.action}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 shrink-0">
                      {new Date(act.timestamp || act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-12">Belum ada aktivitas terbaru.</p>
              )}
            </div>
          </div>

          {/* Quick CMS & Access Links */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Akses Cepat Admin</h3>
              <div className="space-y-3">
                <Link href="/admin/courses" className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-150 hover:bg-red-50/10 hover:border-red-500/30 transition text-xs font-bold text-slate-700 dark:border-slate-800 dark:text-slate-300">
                  <span>CMS Kelola Kurikulum</span>
                  <ArrowRight className="h-4 w-4 text-red-550" />
                </Link>
                <Link href="/admin/users" className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-150 hover:bg-red-50/10 hover:border-red-500/30 transition text-xs font-bold text-slate-700 dark:border-slate-800 dark:text-slate-300">
                  <span>Manajemen Pengguna</span>
                  <ArrowRight className="h-4 w-4 text-red-550" />
                </Link>
                <Link href="/admin/settings" className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-150 hover:bg-red-50/10 hover:border-red-500/30 transition text-xs font-bold text-slate-700 dark:border-slate-800 dark:text-slate-300">
                  <span>Konfigurasi LLM Prompt</span>
                  <ArrowRight className="h-4 w-4 text-red-550" />
                </Link>
              </div>
            </div>

            {/* AI System status widget */}
            <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <span className="text-xs font-extrabold tracking-wide uppercase">AIphy Agent Status</span>
              </div>
              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400 font-medium">Model Utama</span>
                  <span className="font-mono text-[10px] bg-white/10 px-2 py-0.5 rounded">GPT-4o / Claude-3.5</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400 font-medium">API Endpoint</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Zap className="h-3 w-3 fill-emerald-400" /> Online
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Latensi Rata-rata</span>
                  <span className="font-mono text-slate-300">1.2s</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
