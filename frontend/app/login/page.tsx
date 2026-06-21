"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles, Mail, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"learner" | "admin">("learner");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate successful login authentication
    setTimeout(() => {
      setLoading(false);
      if (role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }, 1500);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Form Container */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24 bg-white dark:bg-slate-900/50">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-wider text-[#1E216B] dark:text-indigo-400">
              <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span>AIphy</span>
            </Link>
            <h2 className="mt-8 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Selamat datang kembali
            </h2>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Belum punya akun?{" "}
              <Link href="/register" className="font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                Daftar sekarang
              </Link>
            </p>
          </div>

          {/* Role Selector Tabs */}
          <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setRole("learner")}
              className={`rounded-lg py-2.5 text-center text-xs font-bold transition-all ${
                role === "learner"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Learner
            </button>
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`rounded-lg py-2.5 text-center text-xs font-bold transition-all ${
                role === "admin"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Administrator
            </button>
          </div>

          <div className="mt-6">
            {/* Social Logins */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => router.push(role === "admin" ? "/admin" : "/dashboard")}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              >
                <span>🌐</span> Google
              </button>
              <button
                onClick={() => router.push(role === "admin" ? "/admin" : "/dashboard")}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              >
                <svg className="h-4 w-4 text-slate-800 dark:text-slate-205" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg> GitHub
              </button>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-250 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs font-semibold">
                <span className="bg-white px-2 text-slate-400 dark:bg-slate-900">Atau masuk dengan email</span>
              </div>
            </div>

            {/* Email login form */}
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Alamat Email</label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-250 bg-slate-50 py-2.5 pl-10 pr-4 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    placeholder="nama@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Kata Sandi</label>
                <div className="relative mt-2">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-250 bg-slate-50 py-2.5 pl-10 pr-4 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-500 dark:text-slate-400">
                    Ingat saya
                  </label>
                </div>
                <Link href="#" className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                  Lupa sandi?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/10 disabled:opacity-70"
              >
                {loading ? "Menghubungkan..." : `Masuk sebagai ${role === "admin" ? "Admin" : "Learner"}`}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Hero Image Side (Desktop only) */}
      <div className="relative hidden w-0 flex-1 lg:block bg-[#1E216B]">
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900 to-indigo-700/80 mix-blend-multiply" />
        <div className="flex h-full flex-col justify-between p-12 text-white relative z-10">
          <span className="text-xs font-bold tracking-widest text-indigo-300 uppercase">AIphy Platform</span>
          <div className="max-w-md">
            <h3 className="text-3xl font-extrabold leading-tight">
              Kuasai konsep Kecerdasan Artifisial dari fundamental hingga tingkat lanjut.
            </h3>
            <p className="mt-4 text-sm text-slate-200">
              Evaluasi koding interaktif, kuis adaptif, serta pendamping belajar virtual (AI Assistant) menanti Anda.
            </p>
          </div>
          <div className="text-xs text-slate-300">
            © 2026 AIphy. PT TechSolusi Nusantara & Kelompok 9 Universitas Gunadarma.
          </div>
        </div>
      </div>
    </div>
  );
}
