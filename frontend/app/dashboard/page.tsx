"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import DashboardBanner from "@/components/dashboard-banner";
import StreakCard from "@/components/streak-card";
import CourseCard from "@/components/course-card";
import { ChevronLeft, ChevronRight, Award, GraduationCap } from "lucide-react";
import { api } from "../lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [streak, setStreak] = useState<any>(null);
  const [activeStudy, setActiveStudy] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.push("/login");
          return;
        }

        const profileRes = await api.get("/api/user/profile");
        setProfile(profileRes.data);

        const streakRes = await api.get("/api/user/streak");
        setStreak(streakRes.data);

        const activeRes = await api.get("/api/user/active-study");
        setActiveStudy(activeRes.data);

        const badgesRes = await api.get("/api/user/badges");
        setBadges(badgesRes.data);

        const enrolledRes = await api.get("/api/courses/enrolled");
        
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

        const recommendedRes = await api.get("/api/courses");
        // Filter out courses that user is already enrolled in
        const enrolledIds = new Set((enrolledRes.data || []).map((c: any) => c.id));
        const filteredRecs = (recommendedRes.data || []).filter((c: any) => !enrolledIds.has(c.id));
        setRecommendedCourses(filteredRecs.slice(0, 3));
      } catch (err) {
        console.error("Dashboard Load Error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto dark:border-indigo-400"></div>
          <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Memuat Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pl-20 dark:bg-slate-950 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Layout Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Top Header Bar */}
        <Header userName={profile?.name || "Learner"} userTitle="Lacak progres, aktivitas, dan pencapaian belajar Anda." />

        {/* Dashboard Banner & Stats Grid */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3 mt-4">
          <div className="lg:col-span-2">
            <DashboardBanner 
              activeStudy={activeStudy} 
              progressPercentage={
                activeStudy 
                  ? (enrolledCourses.find((c: any) => c.id === activeStudy.courseId)?.progressPercentage ?? 0)
                  : 0
              } 
            />
          </div>
          <div>
            <StreakCard 
              currentStreak={streak?.currentStreak} 
              longestStreak={streak?.longestStreak} 
              weeklyActive={streak?.weeklyActive} 
            />
          </div>
        </section>

        {/* Active Study / Continue Learning */}
        {activeStudy && (
          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Lanjutkan Belajar</span>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">{activeStudy.courseTitle}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Pelajaran Terakhir: {activeStudy.lessonTitle}</p>
              </div>
              <Link 
                href={`/courses/${activeStudy.courseId}`}
                className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 transition"
              >
                Masuk Kelas
              </Link>
            </div>
          </section>
        )}

        {/* Enrolled Courses Section */}
        <section className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Kelas Anda
            </h3>
          </div>

          {enrolledCourses.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800 bg-white dark:bg-slate-900/50">
              <span className="text-3xl">📚</span>
              <h4 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">Belum mendaftar kelas apa pun</h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Pilih salah satu rekomendasi kelas di bawah ini untuk memulai!</p>
              <Link href="/all-courses" className="mt-4 inline-block text-xs font-bold text-[#1E216B] hover:text-indigo-500 dark:text-indigo-400">
                Lihat Semua Kelas →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {enrolledCourses.map((course) => (
                <Link key={course.id} href={`/courses/${course.id}`}>
                  <div className="h-full cursor-pointer hover:-translate-y-1 transition-transform">
                    <CourseCard
                      type="enrolled"
                      category={course.category}
                      title={course.title}
                      level={course.level === 'beginner' ? 'Beginner' : course.level === 'intermediate' ? 'Intermediate' : 'Advanced'}
                      chaptersCount={5}
                      videosCount={12}
                      progressText={course.status === 'completed' ? 'Selesai' : `${course.progressPercentage}% selesai`}
                      progressPercentage={course.progressPercentage}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recommended Courses Section */}
        <section className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Rekomendasi Kelas Untuk Anda
            </h3>
          </div>

          {recommendedCourses.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">
              Tidak ada rekomendasi baru saat ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recommendedCourses.map((course) => (
                <Link key={course.id} href={`/courses/${course.id}`}>
                  <div className="h-full cursor-pointer hover:-translate-y-1 transition-transform">
                    <CourseCard
                      type="recommendation"
                      category={course.category}
                      title={course.title}
                      level={course.level}
                      chaptersCount={5}
                      rating={4.8}
                      enrolledStudentsCount="150+ siswa"
                      duration="8 jam"
                      price={course.price === 0 ? 'Gratis' : `Rp ${course.price.toLocaleString()}`}
                      originalPrice={course.originalPrice === 0 ? undefined : `Rp ${course.originalPrice.toLocaleString()}`}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* User Earned Badges Section */}
        {badges.length > 0 && (
          <section className="mt-12">
            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
              Lencana Pencapaian Anda
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {badges.map((b) => (
                <div key={b.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">{b.name}</h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{b.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
