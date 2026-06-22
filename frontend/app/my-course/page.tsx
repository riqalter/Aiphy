"use client";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import CourseCard from "@/components/course-card";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "../lib/api";

export default function MyCoursePage() {
  const [filter, setFilter] = useState("active");
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCertCourse, setSelectedCertCourse] = useState<any | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [enrolledRes, profileRes] = await Promise.all([
          api.get("/api/courses/enrolled"),
          api.get("/api/user/profile").catch(() => null)
        ]);
        
        // Fetch progress percentage for each enrolled course
        const enrolledWithProgress = await Promise.all(
          (enrolledRes.data || []).map(async (course: any) => {
            try {
              const progressRes = await api.get(`/api/courses/${course.id}/progress`);
              const percentage = progressRes.data?.percentage ?? 0;
              return {
                ...course,
                progressPercentage: percentage,
              };
            } catch (err) {
              console.error(`Failed to fetch progress for course ${course.id}:`, err);
              return {
                ...course,
                progressPercentage: course.status === 'completed' ? 100 : 0,
              };
            }
          })
        );
        setEnrolledCourses(enrolledWithProgress);

        if (profileRes) {
          setProfile(profileRes.data);
        }
      } catch (err) {
        console.error("Gagal memuat kelas terdaftar:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = enrolledCourses.filter(c => {
    if (filter === "completed") {
      return c.status === "completed" || c.progressPercentage === 100;
    }
    return c.status === "active" && c.progressPercentage < 100;
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto dark:border-indigo-400"></div>
          <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Memuat Kelas Anda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pl-20 dark:bg-slate-950">
      <div className="no-print">
        <Sidebar />
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="no-print">
          <Header userName={profile?.name || "Learner"} userTitle="Pantau kelas aktif dan riwayat sertifikat kelulusan Anda." />

          {/* Filters */}
          <div className="mt-6 flex gap-2 border-b border-slate-200 pb-4 dark:border-slate-800">
            <button
              onClick={() => setFilter("active")}
              className={`rounded-2xl px-5 py-2.5 text-xs font-bold transition-all ${
                filter === "active"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-350 dark:border-slate-800"
              }`}
            >
              Kelas Aktif
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`rounded-2xl px-5 py-2.5 text-xs font-bold transition-all ${
                filter === "completed"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-350 dark:border-slate-800"
              }`}
            >
              Kelas Selesai (Sertifikat)
            </button>
          </div>

          {/* List of Enrolled Courses */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-8">
            {filtered.length > 0 ? (
              filtered.map((course) => (
                <Link key={course.id} href={`/courses/${course.id}`}>
                  <div className="h-full cursor-pointer hover:-translate-y-1 transition-transform">
                    <CourseCard
                      type="enrolled"
                      category={course.category}
                      title={course.title}
                      level={course.level === "beginner" ? "Beginner" : course.level === "intermediate" ? "Intermediate" : "Advanced"}
                      chaptersCount={5}
                      videosCount={12}
                      progressText={course.status === "completed" ? "Selesai" : `${course.progressPercentage}% selesai`}
                      progressPercentage={course.progressPercentage}
                      onPrintCertificate={() => setSelectedCertCourse(course)}
                    />
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-xs font-semibold text-slate-400 py-6">Tidak ada modul kriteria ini.</p>
            )}
          </div>
        </div>

        {/* Certificate Modal */}
        {selectedCertCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print-backdrop">
            <div className="relative w-full max-w-4xl rounded-3xl bg-white p-8 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 print-modal-box">
              
              {/* Modal Actions */}
              <div className="mb-6 flex justify-end gap-3 no-print">
                <button
                  onClick={() => window.print()}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  Cetak / Simpan PDF
                </button>
                <button
                  onClick={() => setSelectedCertCourse(null)}
                  className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Tutup
                </button>
              </div>

              {/* Certificate Canvas Area */}
              <div 
                id="certificate-print-area"
                className="print-only border-8 border-double border-indigo-600/25 p-8 dark:border-indigo-500/20 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl flex flex-col justify-between aspect-[1.414/1] relative overflow-hidden"
              >
                {/* Background Decorators */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-100 dark:bg-indigo-950/20 rounded-full blur-3xl opacity-60 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-100 dark:bg-indigo-950/20 rounded-full blur-3xl opacity-60 pointer-events-none" />

                {/* Header branding */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1.5">
                    <span className="text-2xl">🎓</span>
                    <span className="text-lg font-black tracking-wider text-indigo-600 dark:text-indigo-400">AIPHY</span>
                  </div>
                  <p className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400 font-bold">
                    Platform Pembelajaran Kecerdasan Artifisial Adaptif
                  </p>
                </div>

                {/* Body Content */}
                <div className="text-center my-4 space-y-4">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white uppercase tracking-wide">
                      Sertifikat Kelulusan
                    </h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-1 font-bold">
                      No: CERT-{selectedCertCourse.id.substring(0, 8).toUpperCase()}-{(profile?.id || "USER").substring(0, 4).toUpperCase()}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                      Dengan ini menerangkan bahwa peserta didik:
                    </p>
                    <h3 className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 border-b border-indigo-100 dark:border-indigo-950/50 pb-2 max-w-lg mx-auto">
                      {profile?.name || "Learner Resmi"}
                    </h3>
                  </div>

                  <div className="space-y-1.5 max-w-xl mx-auto">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                      Telah berhasil menyelesaikan kurikulum pembelajaran dan lulus evaluasi terstruktur pada kelas:
                    </p>
                    <h4 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800/60 py-2.5 px-4 rounded-xl inline-block shadow-sm">
                      {selectedCertCourse.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 max-w-md mx-auto leading-relaxed font-bold">
                      Program terstruktur ini mencakup dasar pemahaman algoritma AI, pengerjaan tugas implementasi praktis terintegrasi Python, serta kuis komprehensif di bawah asisten virtual AIphy.
                    </p>
                  </div>
                </div>

                {/* Footer signees */}
                <div className="grid grid-cols-2 gap-8 text-center pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="space-y-1">
                    <div className="h-8 flex items-end justify-center">
                      <span className="text-slate-300 dark:text-slate-700 font-serif italic text-xs select-none">Universitas Gunadarma</span>
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-350">
                      Tim Lembaga Penelitian UG
                    </p>
                    <p className="text-[9px] font-semibold text-slate-400 font-bold">
                      Universitas Gunadarma
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="h-8 flex items-end justify-center">
                      <span className="text-slate-300 dark:text-slate-700 font-serif italic text-xs select-none">PT TechSolusi Nusantara</span>
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-350">
                      Direktur PT TechSolusi Nusantara
                    </p>
                    <p className="text-[9px] font-semibold text-slate-400 font-bold">
                      Rekan Pengembang AIphy
                    </p>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* Global Print Styling */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background: white !important;
              color: black !important;
            }
            /* Hide UI elements */
            .no-print {
              display: none !important;
            }
            .pl-20 {
              padding-left: 0 !important;
            }
            .no-print-backdrop {
              background: transparent !important;
              backdrop-filter: none !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              height: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .print-modal-box {
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
              background: transparent !important;
              width: 100% !important;
              max-width: 100% !important;
            }
            /* Style print target specifically */
            .print-only {
              position: fixed !important;
              left: 5% !important;
              top: 5% !important;
              width: 90% !important;
              height: 90% !important;
              border: 12px double #4f46e5 !important;
              padding: 40px !important;
              background: white !important;
              color: black !important;
              box-shadow: none !important;
              border-radius: 16px !important;
              z-index: 9999999 !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              box-sizing: border-box !important;
            }
            /* Specific resets for darkmode classes on printing */
            .print-only * {
              color: black !important;
              background-color: transparent !important;
              border-color: #e2e8f0 !important;
            }
            .print-only h3, .print-only h4 {
              color: #4f46e5 !important;
            }
          }
        `}} />
      </main>
    </div>
  );
}
