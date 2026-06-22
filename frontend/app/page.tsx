"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Check, HelpCircle, Mail, Phone, MapPin, ChevronDown } from "lucide-react";
import { api } from "./lib/api";

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [faqs, setFaqs] = useState<any[]>([]);

  useEffect(() => {
    async function loadFaqs() {
      try {
        const res = await api.get("/api/help/faqs");
        if (res.data && res.data.length > 0) {
          setFaqs(res.data.slice(0, 3).map((f: any) => ({ q: f.question, a: f.answer }))); // Display top 3 FAQs
        } else {
          setFaqs(defaultFaqs);
        }
      } catch {
        setFaqs(defaultFaqs);
      }
    }
    loadFaqs();
  }, []);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    try {
      await api.post("/api/contact", contactForm);
      alert("Pesan kemitraan Anda telah dikirim! Tim kami akan segera menghubungi Anda.");
      setContactForm({ name: "", email: "", message: "" });
    } catch (err: any) {
      alert("Gagal mengirim pesan: " + err.message);
    } finally {
      setFormSubmitted(false);
    }
  };

  const pricingFeatures = {
    basic: ["Akses 3 Modul Fundamental", "Buku Panduan Belajar", "Latihan Praktik Dasar"],
    pro: ["Akses Semua Modul AI", "Akses Tutor AI Tanpa Batas", "Sertifikat Penyelesaian", "Grup Premium Instruktur", "Latihan & Evaluasi Koding Otomatis"]
  };

  const defaultFaqs = [
    { q: "Apakah platform ini cocok untuk pemula?", a: "Ya! Kurikulum AIphy dirancang berjenjang dari tingkat fundamental hingga tingkat mahir agar pemula tanpa latar belakang koding pun dapat memahaminya." },
    { q: "Bagaimana cara kerja AI Assistant (Tutor Virtual)?", a: "AI Assistant kami menggunakan teknologi LLM (Large Language Model) adaptif untuk menyederhanakan bahasa teknis dan memberikan umpan balik langsung pada tugas pemrograman Anda." },
    { q: "Bagaimana sistem pembayarannya?", a: "Kami menyediakan paket dasar gratis dan paket Pro berlangganan bulanan melalui transfer bank atau e-wallet." }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans dark:bg-slate-950 dark:text-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-wider text-[#1E216B] dark:text-indigo-400">
            <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span>AIphy</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-indigo-600 transition">Fitur</a>
            <a href="#catalog" className="hover:text-indigo-600 transition">Kurikulum</a>
            <a href="#pricing" className="hover:text-indigo-600 transition">Harga</a>
            <a href="#about" className="hover:text-indigo-600 transition">Tentang Kami</a>
            <a href="#faq" className="hover:text-indigo-600 transition">FAQ</a>
            <a href="#contact" className="hover:text-indigo-600 transition">Kontak</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-xs font-bold text-slate-700 hover:text-indigo-600 dark:text-slate-200">
              Sign In
            </Link>
            <Link href="/register" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition">
              Daftar Gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_50%_-10rem,rgba(99,102,241,0.08),rgba(255,255,255,0))]" />
        <div className="mx-auto max-w-7xl px-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
            <Sparkles className="h-3.5 w-3.5" />
            Integrasi Generative AI Terkini
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl dark:text-white leading-[1.15]">
            Pelajari Kecerdasan Artifisial Lebih Mudah dengan <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">AIphy</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
            Platform edukasi AI adaptif terstruktur khusus generasi muda Indonesia. Didukung asisten LLM yang siap menerjemahkan teori rumit menjadi bahasa sederhana kapan saja.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/register" className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition">
              Mulai Belajar Sekarang
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#catalog" className="text-sm font-bold text-slate-700 hover:text-indigo-600 dark:text-slate-300">
              Lihat Kurikulum
            </a>
          </div>
        </div>
      </section>

      {/* Unique Value Propositions (UVP) */}
      <section id="features" className="py-20 bg-white dark:bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Mengapa Memilih AIphy?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-slate-500 dark:text-slate-400">
              Menghadirkan terobosan metode belajar kecerdasan buatan adaptif.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { title: "Kurikulum Terstruktur", desc: "Silabus komprehensif mulai dari dasar matematika AI, Machine Learning, Deep Learning, hingga Generative AI.", icon: "📚" },
              { title: "Tutor AI Pendamping", desc: "Tanyakan apa saja secara realtime. Tutor AI asisten kami siap menyederhanakan bahasa teknis yang kompleks.", icon: "🤖" },
              { title: "Dashboard Progres Adaptif", desc: "Pantau kemajuan Anda dengan visualisasi streak keaktifan mingguan, kuis evaluasi, dan modul interaktif.", icon: "⚡" }
            ].map((feature, i) => (
              <div key={i} className="rounded-3xl border border-slate-100 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <span className="text-4xl">{feature.icon}</span>
                <h3 className="mt-6 text-lg font-bold text-slate-900 dark:text-white">{feature.title}</h3>
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Catalog Preview */}
      <section id="catalog" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Modul Kurikulum Unggulan
              </h2>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Pilih jalur belajar Anda dan jadilah ahli AI profesional.
              </p>
            </div>
            <Link href="/register" className="mt-4 md:mt-0 flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
              Jelajahi Semua Kelas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Pengenalan Python & Dasar AI", level: "Dasar", dur: "10 Jam", cap: "8 Bab" },
              { title: "Algoritma Machine Learning", level: "Menengah", dur: "15 Jam", cap: "10 Bab" },
              { title: "Rekayasa Generative AI (Prompt)", level: "Mahir", dur: "12 Jam", cap: "7 Bab" }
            ].map((course, idx) => (
              <div key={idx} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  {course.level}
                </span>
                <h4 className="mt-4 text-base font-bold text-slate-900 dark:text-white">{course.title}</h4>
                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500 dark:border-slate-850 dark:text-slate-400">
                  <span>⏱ {course.dur}</span>
                  <span>📖 {course.cap}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white dark:bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Pilih Paket Belajar Anda
            </h2>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Investasi masa depan teknologi tanpa terhambat biaya.
            </p>
          </div>
          <div className="mx-auto max-w-4xl grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Basic Plan */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Basic Learner</h3>
                <p className="mt-2 text-xs text-slate-450 dark:text-slate-400">Untuk pemula yang baru memulai karir AI.</p>
                <div className="mt-6 flex items-baseline gap-1 text-slate-900 dark:text-white">
                  <span className="text-4xl font-extrabold">Rp0</span>
                  <span className="text-xs font-semibold text-slate-400">/selamanya</span>
                </div>
                <ul className="mt-8 space-y-4">
                  {pricingFeatures.basic.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-350">
                      <Check className="h-4 w-4 text-indigo-500 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link href="/register" className="mt-8 block w-full rounded-2xl border border-slate-200 py-3 text-center text-xs font-bold hover:bg-slate-50 transition dark:border-slate-850 dark:hover:bg-slate-800">
                Mulai Gratis
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="rounded-3xl border-2 border-indigo-600 bg-white p-8 shadow-md dark:bg-slate-900 flex flex-col justify-between relative">
              <span className="absolute -top-3.5 right-6 rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-bold text-white tracking-widest uppercase">REKOMENDASI</span>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pro Learner</h3>
                <p className="mt-2 text-xs text-slate-450 dark:text-slate-400">Akses penuh asisten AI pendamping tanpa batas.</p>
                <div className="mt-6 flex items-baseline gap-1 text-slate-900 dark:text-white">
                  <span className="text-4xl font-extrabold">Rp149.000</span>
                  <span className="text-xs font-semibold text-slate-400">/bulan</span>
                </div>
                <ul className="mt-8 space-y-4">
                  {pricingFeatures.pro.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-350">
                      <Check className="h-4 w-4 text-indigo-500 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link href="/register" className="mt-8 block w-full rounded-2xl bg-indigo-600 py-3 text-center text-xs font-bold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/10">
                Berlangganan Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* About Us */}
      <section id="about" className="py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Kolaborasi Universitas Gunadarma & Mitra
          </h2>
          <p className="mx-auto mt-6 text-sm leading-8 text-slate-600 dark:text-slate-300">
            Proyek AIphy diinisiasi oleh Lembaga Penelitian Universitas Gunadarma (Kelompok 9) sebagai bagian dari upaya nasional memajukan literasi teknologi AI di kalangan pemuda Indonesia. Pengembangannya didukung oleh vendor teknologi profesional PT TechSolusi Nusantara.
          </p>
          <div className="mt-10 flex items-center justify-center gap-12 grayscale opacity-75">
            <span className="text-sm font-bold tracking-widest text-slate-400">UG RESEARCH</span>
            <span className="text-sm font-bold tracking-widest text-slate-400">TECHSOLUSI</span>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-white dark:bg-slate-900/40">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Pertanyaan yang Sering Diajukan
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="flex w-full items-center justify-between p-5 text-left text-xs font-bold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-850"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4.5 w-4.5 text-indigo-500" />
                    {faq.q}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${activeFaq === idx ? "rotate-180" : ""}`} />
                </button>
                {activeFaq === idx && (
                  <div className="border-t border-slate-100 p-5 text-xs text-slate-500 dark:border-slate-850 dark:text-slate-400 leading-relaxed bg-slate-50/50 dark:bg-slate-950/20">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {/* Contact Info */}
            <div className="flex flex-col justify-between">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Hubungi Kami
                </h2>
                <p className="mt-4 text-sm text-slate-550 dark:text-slate-400">
                  Ada kebutuhan kerja sama institusi (B2B) atau pertanyaan kemitraan?
                </p>
                <div className="mt-8 space-y-6">
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-350">
                    <Phone className="h-5 w-5 text-indigo-600" />
                    <span>+62 21 78881112</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-350">
                    <Mail className="h-5 w-5 text-indigo-600" />
                    <span>support@aiphy.ug.ac.id</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-350">
                    <MapPin className="h-5 w-5 text-indigo-600" />
                    <span>Lembaga Penelitian Universitas Gunadarma, Depok, Indonesia</span>
                  </div>
                </div>
              </div>
              <div className="mt-12 text-xs text-slate-400">
                © 2026 AIphy. All rights reserved. PT TechSolusi Nusantara.
              </div>
            </div>

            {/* Form */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white outline-none focus:border-indigo-500"
                    placeholder="Contoh: Budi Santoso"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Email Instansi / Personal</label>
                  <input
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white outline-none focus:border-indigo-500"
                    placeholder="budi@kampus.ac.id"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Pesan</label>
                  <textarea
                    rows={4}
                    required
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white outline-none focus:border-indigo-500"
                    placeholder="Halo, saya ingin mengajukan kemitraan..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={formSubmitted}
                  className="w-full rounded-2xl bg-indigo-600 py-3.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/10 disabled:bg-emerald-600"
                >
                  {formSubmitted ? "Pesan Terkirim!" : "Kirim Pesan Kemitraan"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
