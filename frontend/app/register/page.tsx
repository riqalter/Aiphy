"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles, Mail, Lock, User, ArrowRight } from "lucide-react";
import { api, saveTokens, saveCurrentUser } from "../lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/api/auth/register", { name, email, password });
      saveTokens(res.data.accessToken, res.data.refreshToken);
      saveCurrentUser(res.data.user);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Pendaftaran gagal. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Form Container */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24 bg-white dark:bg-slate-900/50">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <Link href="/landing" className="flex items-center gap-2 text-lg font-bold tracking-wider text-[#1E216B] dark:text-indigo-400">
              <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span>AIphy</span>
            </Link>
            <h2 className="mt-8 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Buat akun belajar Anda
            </h2>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Sudah punya akun?{" "}
              <Link href="/login" className="font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                Masuk disini
              </Link>
            </p>
          </div>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="mt-8">
            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Nama Lengkap</label>
                <div className="relative mt-2">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-250 bg-slate-50 py-2.5 pl-10 pr-4 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    placeholder="Budi Santoso"
                  />
                </div>
              </div>

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
                    placeholder="Minimal 8 karakter"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="agree-terms"
                  type="checkbox"
                  required
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="agree-terms" className="ml-2 block text-[11px] text-slate-500 dark:text-slate-400">
                  Saya menyetujui Ketentuan Layanan & Kebijakan Privasi
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/10 disabled:opacity-70"
              >
                {loading ? "Mendaftar..." : "Mulai Belajar Sekarang"}
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
              Belajar adaptif AI dengan dukungan Virtual Tutor LLM.
            </h3>
            <p className="mt-4 text-sm text-slate-200">
              Ubah konsep Machine Learning dan Deep Learning yang rumit menjadi penjelasan ramah pemula secara otomatis.
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
