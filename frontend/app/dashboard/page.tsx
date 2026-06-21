"use client";

import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import DashboardBanner from "@/components/dashboard-banner";
import StreakCard from "@/components/streak-card";
import CourseCard from "@/components/course-card";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function DashboardPage() {
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
    },
    {
      id: 2,
      category: "Machine Learning",
      title: "Basic Machine Learning Algorithm",
      level: "Beginner",
      chaptersCount: 10,
      videosCount: 25,
      progressText: "1/3 lessons 2h 10min",
      progressPercentage: 33,
    },
    {
      id: 3,
      category: "Machine Learning",
      title: "Basic Machine Learning Algorithm",
      level: "Beginner",
      chaptersCount: 10,
      videosCount: 25,
      progressText: "1/3 lessons 2h 10min",
      progressPercentage: 33,
    },
    {
      id: 4,
      category: "Machine Learning",
      title: "Basic Machine Learning Algorithm",
      level: "Beginner",
      chaptersCount: 10,
      videosCount: 25,
      progressText: "1/3 lessons 2h 10min",
      progressPercentage: 33,
    },
  ];

  const recommendedCourses = [
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
    },
    {
      id: 2,
      category: "Machine Learning",
      title: "Basic Machine Learning Algorithm",
      level: "Beginner",
      chaptersCount: 10,
      rating: 4.5,
      enrolledStudentsCount: "10.7k",
      duration: "17h 50min",
      price: "Rp520.000",
      originalPrice: "Rp720.000",
    },
    {
      id: 3,
      category: "Machine Learning",
      title: "Basic Machine Learning Algorithm",
      level: "Beginner",
      chaptersCount: 10,
      rating: 4.5,
      enrolledStudentsCount: "10.7k",
      duration: "17h 50min",
      price: "Rp520.000",
      originalPrice: "Rp720.000",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pl-20 dark:bg-slate-950">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Layout Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Top Header Bar */}
        <Header userName="Nadya Najelina" userTitle="Track your progress, activity, and performance." />

        {/* Dashboard Banner & Stats Grid */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3 mt-4">
          <div className="lg:col-span-2">
            <DashboardBanner />
          </div>
          <div>
            <StreakCard />
          </div>
        </section>

        {/* Enrolled Courses Section */}
        <section className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Your Courses
            </h3>
            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {enrolledCourses.map((course) => (
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
            ))}
          </div>

          {/* Indicator Dot Slides */}
          <div className="flex justify-center gap-1.5 mt-6">
            <span className="h-2 w-6 rounded-full bg-indigo-600" />
            <span className="h-2 w-2 rounded-full bg-slate-200 dark:bg-slate-800" />
            <span className="h-2 w-2 rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
        </section>

        {/* Recommended Courses Section */}
        <section className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Recommended For You
            </h3>
            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recommendedCourses.map((course) => (
              <CourseCard
                key={course.id}
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
            ))}
          </div>

          {/* Indicator Dot Slides */}
          <div className="flex justify-center gap-1.5 mt-6">
            <span className="h-2 w-6 rounded-full bg-indigo-600" />
            <span className="h-2 w-2 rounded-full bg-slate-200 dark:bg-slate-800" />
            <span className="h-2 w-2 rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
        </section>
      </main>
    </div>
  );
}
