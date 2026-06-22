"use client";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import CourseCard from "@/components/course-card";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "../lib/api";

export default function AllCoursesPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [courses, setCourses] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [coursesRes, profileRes] = await Promise.all([
          api.get("/api/courses"),
          api.get("/api/user/profile").catch(() => null)
        ]);
        setCourses(coursesRes.data || []);
        if (profileRes) {
          setProfile(profileRes.data);
        }
      } catch (err) {
        console.error("Gagal memuat katalog kursus:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredCourses = activeTab === "all"
    ? courses
    : courses.filter(c => {
        const mappedLevel = c.level === "beginner" ? "fundamental" : c.level;
        return mappedLevel === activeTab;
      });

  const tabs = [
    { id: "all", name: "Semua Modul" },
    { id: "fundamental", name: "Dasar (Fundamental)" },
    { id: "intermediate", name: "Menengah (Intermediate)" },
    { id: "advanced", name: "Mahir (Advanced)" }
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto dark:border-indigo-400"></div>
          <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Memuat Katalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pl-20 dark:bg-slate-950">
      <Sidebar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Header userName={profile?.name || "Learner"} userTitle="Pilih kurikulum AI terstruktur yang sesuai dengan level Anda." />

        {/* Filter Navigation Tabs */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4 dark:border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-2xl px-5 py-2.5 text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-350 dark:border-slate-800 dark:hover:bg-slate-800"
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Courses Listing Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-8">
          {filteredCourses.length > 0 ? (
            filteredCourses.map((course) => (
              <Link key={course.id} href={`/courses/${course.id}`}>
                <div className="h-full cursor-pointer hover:-translate-y-1 transition-transform">
                  <CourseCard
                    type="recommendation"
                    category={course.category}
                    title={course.title}
                    level={course.level === "beginner" ? "Beginner" : course.level === "intermediate" ? "Intermediate" : "Advanced"}
                    chaptersCount={5} // Mock chapters count
                    rating={4.8} // Mock rating
                    enrolledStudentsCount="150+ siswa"
                    duration="8 jam"
                    price={course.price === 0 ? "Gratis" : `Rp ${course.price.toLocaleString()}`}
                    originalPrice={course.originalPrice > 0 ? `Rp ${course.originalPrice.toLocaleString()}` : undefined}
                  />
                </div>
              </Link>
            ))
          ) : (
            <p className="col-span-full text-center text-xs font-semibold text-slate-400 py-12">Tidak ada kelas dalam kategori ini.</p>
          )}
        </div>
      </main>
    </div>
  );
}
