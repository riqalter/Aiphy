"use client";

import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import CourseCard from "@/components/course-card";
import { useState } from "react";

export default function MyCoursePage() {
  const [filter, setFilter] = useState("active");

  const enrolledCourses = [
    {
      id: 1,
      category: "Machine Learning",
      title: "Basic Machine Learning Algorithm",
      level: "Beginner",
      chaptersCount: 10,
      videosCount: 25,
      progressText: "1/3 lessons 2h 10min",
      progressPercentage: 33,
      status: "active"
    },
    {
      id: 2,
      category: "Mathematics for AI",
      title: "Linear Algebra & Statistics for Data Science",
      level: "Beginner",
      chaptersCount: 15,
      videosCount: 30,
      progressText: "Lulus - Nilai A+",
      progressPercentage: 100,
      status: "completed"
    }
  ];

  const filtered = enrolledCourses.filter(c => c.status === filter);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pl-20 dark:bg-slate-950">
      <Sidebar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Header userName="Nadya Najelina" userTitle="Pantau kelas aktif dan riwayat sertifikat kelulusan Anda." />

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
              <CourseCard
                key={course.id}
                type="enrolled"
                category={course.category}
                title={course.title}
                level={course.level}
                chaptersCount={course.chaptersCount}
                videosCount={course.videosCount}
                progressText={course.progressText}
                progressPercentage={course.progressPercentage}
              />
            ))
          ) : (
            <p className="text-xs font-semibold text-slate-400">Tidak ada modul kriteria ini.</p>
          )}
        </div>
      </main>
    </div>
  );
}
