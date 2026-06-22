"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { CreditCard, CheckCircle2, ShieldAlert } from "lucide-react";
import { api } from "../lib/api";

function PaymentSimulationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const transactionId = searchParams.get("id");
  const amount = searchParams.get("amount");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSimulateSuccess = async () => {
    if (!transactionId) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/api/payment/simulate-success", { transactionId });
      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard?status=success");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Gagal memproses simulasi pembayaran.");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md bg-white p-8 rounded-3xl border border-slate-200 shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-655 dark:bg-indigo-950 dark:text-indigo-400 mx-auto mb-6">
        <CreditCard className="h-6 w-6" />
      </div>

      <h2 className="text-center text-lg font-extrabold text-slate-900 dark:text-white">
        Simulasi Pembayaran Xendit Sandbox
      </h2>
      <p className="text-center text-xs text-slate-400 mt-1">
        Gunakan halaman ini untuk mensimulasikan status pembayaran sukses.
      </p>

      <div className="mt-6 border border-slate-100 rounded-2xl p-4 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40 space-y-3.5">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-slate-400">ID Transaksi</span>
          <span className="text-slate-800 dark:text-slate-202 font-mono truncate max-w-[200px]">{transactionId || "N/A"}</span>
        </div>
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-slate-400">Total Nominal</span>
          <span className="text-slate-900 dark:text-white font-extrabold text-sm">
            Rp {amount ? Number(amount).toLocaleString() : "0"}
          </span>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex gap-2 rounded-xl bg-red-50 p-3.5 text-xs text-red-600 dark:bg-red-955/20 dark:text-red-400">
          <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mt-4 flex gap-2 rounded-xl bg-emerald-50 p-3.5 text-xs text-emerald-700 dark:bg-emerald-955/20 dark:text-emerald-400">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
          <span>Simulasi sukses! Mengalihkan ke dashboard...</span>
        </div>
      )}

      <div className="mt-8 space-y-3">
        <button
          onClick={handleSimulateSuccess}
          disabled={loading || success || !transactionId}
          className="w-full rounded-2xl bg-indigo-600 py-3.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/10 disabled:opacity-50"
        >
          {loading ? "Memproses..." : "Konfirmasi Pembayaran Sukses"}
        </button>
        <button
          onClick={() => router.push("/dashboard?status=failed")}
          disabled={loading || success}
          className="w-full rounded-2xl border border-slate-200 py-3.5 text-xs font-bold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
        >
          Batalkan / Simulasi Gagal
        </button>
      </div>
    </div>
  );
}

export default function PaymentSimulationPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 font-sans">
      <Suspense fallback={
        <div className="text-center text-xs font-semibold text-slate-400 animate-pulse">
          Memuat data tagihan...
        </div>
      }>
        <PaymentSimulationContent />
      </Suspense>
    </div>
  );
}
