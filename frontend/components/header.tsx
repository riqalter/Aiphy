"use client";

import { Search, ShoppingBag, Bell, ChevronDown, User, LogOut, Settings, Sparkles, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getCurrentUser, clearTokens } from "@/app/lib/api";

interface HeaderProps {
  userName?: string;
  userTitle?: string;
}

export default function Header({ 
  userName, 
  userTitle = "Track your progress, activity, and performance." 
}: HeaderProps) {
  const router = useRouter();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    setProfile(getCurrentUser());
  }, []);

  const displayUserName = userName || profile?.name || "Learner";

  const getInitials = (name: string) => {
    if (!name) return "L";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const initials = getInitials(displayUserName);

  const mockNotifications = [
    { id: 1, text: "🔥 Streak belajar Anda mencapai 5 hari! Pertahankan!", time: "2 jam yang lalu" },
    { id: 2, text: "📚 Modul Baru: Prompt Engineering telah diterbitkan.", time: "1 hari yang lalu" },
    { id: 3, text: "📝 Nilai Kuis Matematika AI Anda: Lulus (A+)", time: "2 hari yang lalu" }
  ];

  const mockCartItems = [
    { id: 1, title: "Algoritma Machine Learning", price: "Rp520.000" },
    { id: 2, title: "Prompt Engineering & LLM", price: "Rp750.000" }
  ];

  return (
    <header className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-8 z-30">
      {/* Greetings */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl dark:text-white">
          Hi, {userName}
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1 dark:text-slate-400">
          {userTitle}
        </p>
      </div>

      {/* Actions & Search */}
      <div className="flex flex-1 max-w-2xl items-center gap-4 md:justify-end">
        {/* Search Bar */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search courses, lessons, or topics..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500"
          />
        </div>

        {/* Cart, Notifications & Profile */}
        <div className="flex items-center gap-3 relative">
          {/* Cart */}
          <div className="relative">
            <button 
              onClick={() => { setShowCart(!showCart); setShowNotif(false); setShowProfile(false); }}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            >
              <ShoppingBag className="h-5 w-5" />
            </button>
            
            {showCart && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Keranjang Belanja</h4>
                <div className="mt-2 divide-y divide-slate-150 dark:divide-slate-800">
                  {mockCartItems.map((item) => (
                    <div key={item.id} className="py-2.5 flex justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{item.title}</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0">{item.price}</span>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => { alert("Checkout diproses!"); setShowCart(false); }}
                  className="w-full mt-4 rounded-xl bg-indigo-600 py-2.5 text-center text-xs font-bold text-white hover:bg-indigo-500 transition"
                >
                  Checkout Sekarang
                </button>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => { setShowNotif(!showNotif); setShowCart(false); setShowProfile(false); }}
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                3
              </span>
            </button>

            {showNotif && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Pemberitahuan</h4>
                <div className="mt-2 space-y-3">
                  {mockNotifications.map((notif) => (
                    <div key={notif.id} className="text-xs leading-normal">
                      <p className="text-slate-850 dark:text-slate-200">{notif.text}</p>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{notif.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Vertical Divider */}
          <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800" />

          {/* Profile Dropdown */}
          <div className="relative">
            <button 
              onClick={() => { setShowProfile(!showProfile); setShowNotif(false); setShowCart(false); }}
              className="flex items-center gap-2 rounded-2xl p-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <div className="relative h-9 w-9 overflow-hidden rounded-xl bg-slate-200">
                <div className="flex h-full w-full items-center justify-center bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                  {initials}
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </button>

            {showProfile && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50">
                <Link 
                  href="/settings"
                  className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={() => setShowProfile(false)}
                >
                  <Settings className="h-4 w-4 text-slate-450" />
                  Pengaturan
                </Link>
                <div className="my-1 h-[1px] bg-slate-100 dark:bg-slate-800" />
                <button
                  onClick={() => {
                    setShowProfile(false);
                    clearTokens();
                    router.push("/login");
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20"
                >
                  <LogOut className="h-4 w-4" />
                  Keluar / Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
