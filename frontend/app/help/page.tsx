"use client";

import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { useState } from "react";
import { HelpCircle, Mail, Phone, Clock, Send, CheckCircle2 } from "lucide-react";

export default function HelpPage() {
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMsg, setTicketMsg] = useState("");
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    { q: "Bagaimana cara mereset progres belajar saya di suatu modul?", a: "Anda dapat menekan tombol 'Reset Progres' di dalam panel pengaturan silabus modul yang bersangkutan atau menghubungi instruktur Anda." },
    { q: "Mengapa compiler Python saya tidak merespon?", a: "Pastikan koneksi internet Anda stabil. Compiler dijalankan di dalam sandbox browser. Coba segarkan halaman atau klik 'Jalankan Koding' kembali." },
    { q: "Di mana saya bisa mengklaim sertifikat kelulusan?", a: "Setelah menyelesaikan kuis modul terakhir dengan skor minimal 80%, tombol 'Unduh Sertifikat' akan muncul di halaman 'My Course'." }
  ];

  const handleSendTicket = (e: React.FormEvent) => {
    e.preventDefault();
    setTicketSubmitted(true);
    setTimeout(() => {
      setTicketSubject("");
      setTicketMsg("");
      setTicketSubmitted(false);
      alert("Tiket dukungan teknis Anda telah dikirim ke tim admin AIphy!");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pl-20 dark:bg-slate-950">
      <Sidebar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Header userName="Nadya Najelina" userTitle="Pusat bantuan teknis dan pertanyaan umum AIphy." />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 mt-6">
          {/* FAQ Accordions & Contacts */}
          <div className="lg:col-span-2 space-y-8">
            {/* FAQ List */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-900 mb-6 dark:text-white flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-indigo-600" />
                Pertanyaan yang Sering Diajukan (FAQ)
              </h3>
              
              <div className="space-y-3">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
                    <button
                      onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                      className="flex w-full items-center justify-between p-4 text-left text-xs font-bold text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-900"
                    >
                      <span>{faq.q}</span>
                      <span>{activeFaq === idx ? "▲" : "▼"}</span>
                    </button>
                    {activeFaq === idx && (
                      <div className="border-t border-slate-100 p-4 text-xs text-slate-500 dark:border-slate-850 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/20 leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Direct Contact Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Kirim Email</span>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">support@aiphy.ug.ac.id</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Telepon Kami</span>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">+62 21 78881112</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Jam Operasional</span>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Senin - Jumat, 09.00 - 17.00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Support Ticket Submission */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 mb-6 dark:text-white flex items-center gap-2">
              <Send className="h-5 w-5 text-indigo-600" />
              Kirim Tiket Masalah
            </h3>
            
            <form onSubmit={handleSendTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Subjek Masalah</label>
                <input
                  type="text"
                  required
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="Contoh: Kesalahan Kuis Modul 2"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Deskripsi Detail</label>
                <textarea
                  rows={5}
                  required
                  value={ticketMsg}
                  onChange={(e) => setTicketMsg(e.target.value)}
                  placeholder="Ceritakan kendala yang Anda alami secara lengkap..."
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={ticketSubmitted}
                className="w-full rounded-2xl bg-indigo-600 py-3.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/10 disabled:bg-emerald-600"
              >
                {ticketSubmitted ? "Mengirim..." : "Kirim Tiket"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
