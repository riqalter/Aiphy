"use client";

import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import CourseCard from "@/components/course-card";
import { useState } from "react";
import Link from "next/link";

export default function AllCoursesPage() {
  const [activeTab, setActiveTab] = useState("all");

  const courses = [
    {
      id: 1,
      category: "Machine Learning",
      title: "Basic Machine Learning Algorithm",
      level: "Beginner",
      chaptersCount: 10,
      rating: 4.5,
      enrolledStudentsCount: "10.7k",
      duration: "17h 50min",
      price: "Rp520.000",
      originalPrice: "Rp720.000",
      type: "fundamental"
    },
    {
      id: 2,
      category: "Deep Learning",
      title: "Neural Networks & Deep Learning Fundamental",
      level: "Intermediate",
      chaptersCount: 12,
      rating: 4.8,
      enrolledStudentsCount: "5.4k",
      duration: "20h 15min",
      price: "Rp650.000",
      originalPrice: "Rp850.000",
      type: "intermediate"
    },
    {
      id: 3,
      category: "Generative AI",
      title: "Prompt Engineering & LLM Customization",
      level: "Advanced",
      chaptersCount: 8,
      rating: 4.9,
      enrolledStudentsCount: "3.2k",
      duration: "12h 40min",
      price: "Rp750.000",
      originalPrice: "Rp990.000",
      type: "advanced"
    },
    {
      id: 4,
      category: "Mathematics for AI",
      title: "Linear Algebra & Statistics for Data Science",
      level: "Beginner",
      chaptersCount: 15,
      rating: 4.6,
      enrolledStudentsCount: "8.1k",
      duration: "22h 30min",
      price: "Rp450.000",
      originalPrice: "Rp600.000",
      type: "fundamental"
    }
  ];

  const filteredCourses = activeTab === "all" 
    ? courses 
    : courses.filter(c => c.type === activeTab);

  const tabs = [
    { id: "all", name: "Semua Modul" },
    { id: "fundamental", name: "Dasar (Fundamental)" },
    { id: "intermediate", name: "Menengah (Intermediate)" },
    { id: "advanced", name: "Mahir (Advanced)" }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pl-20 dark:bg-slate-950">
      <Sidebar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Header userName="Nadya Najelina" userTitle="Pilih kurikulum AI terstruktur yang sesuai dengan level Anda." />

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
          {filteredCourses.map((course) => (
            <Link key={course.id} href={`/courses/${course.id}`}>
              <div className="h-full cursor-pointer hover:-translate-y-1 transition-transform">
                <CourseCard
                  type="recommendation"
                  category={course.category}
                  title={course.title}
                  level={course.level}
                  chaptersCount={course.chaptersCount}
                  rating={course.rating}
                  enrolledStudentsCount={course.enrolledStudentsCount}
                  duration={course.duration}
                  price={course.price}
                  originalPrice={course.originalPrice}
                />
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
