"use client";

import { Target, Flame } from "lucide-react";
import Link from "next/link";

interface DashboardBannerProps {
  activeStudy?: {
    courseId: string;
    courseTitle: string;
    lessonId: string | null;
    lessonTitle: string;
  } | null;
  progressPercentage?: number;
}

export default function DashboardBanner({ activeStudy, progressPercentage = 0 }: DashboardBannerProps) {
  if (!activeStudy) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-xl">
        {/* Background Gradient & Patterns */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 via-slate-900/95 to-slate-900" />
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-10 top-0 hidden w-72 md:block">
          <div className="relative h-full w-full opacity-85 hover:opacity-100 transition-opacity">
            <div className="absolute inset-y-8 right-0 left-8 rounded-2xl bg-gradient-to-b from-indigo-500/20 to-indigo-600/10 border border-indigo-500/20 shadow-inner flex flex-col items-center justify-center text-center p-4">
              <span className="text-xs font-semibold tracking-widest text-indigo-300 uppercase">Interactive Lab</span>
              <p className="text-[10px] text-slate-400 mt-1 max-w-[180px]">Practice machine learning theories directly in browser sandbox environments.</p>
            </div>
          </div>
        </div>

        {/* Main Content for empty state */}
        <div className="relative flex flex-col p-6 sm:p-8 md:max-w-2xl">
          <div className="mb-6">
            <span className="inline-flex items-center rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300">
              Selamat Datang
            </span>
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl mt-3">
              Mulai Petualangan Belajar AI Anda!
            </h2>
            <p className="text-xs text-slate-355 mt-1.5 leading-relaxed">
              Jelajahi kurikulum adaptif kecerdasan buatan, visualisasikan data dengan editor Python, dan dibimbing oleh tutor AI interaktif.
            </p>
          </div>

          <div className="flex flex-wrap items-center max-w-md gap-4 border-t border-slate-800 pt-5">
            <Link
              href="/all-courses"
              className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-650 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-650/30 transition-all hover:bg-indigo-600 hover:shadow-indigo-600/20 active:scale-95 cursor-pointer"
            >
              <Flame className="h-4 w-4 fill-white" />
              Mulai Cari Kelas
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-xl">
      {/* Background Gradient & Patterns */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 via-slate-900/95 to-slate-900" />
      <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="absolute bottom-0 right-10 top-0 hidden w-72 md:block">
        <div className="relative h-full w-full opacity-85 hover:opacity-100 transition-opacity">
          <div className="absolute inset-y-8 right-0 left-8 rounded-2xl bg-gradient-to-b from-indigo-500/20 to-indigo-600/10 border border-indigo-500/20 shadow-inner flex flex-col items-center justify-center text-center p-4">
            <span className="text-xs font-semibold tracking-widest text-indigo-300 uppercase">Interactive Lab</span>
            <p className="text-[10px] text-slate-400 mt-1 max-w-[180px]">Practice machine learning theories directly in browser sandbox environments.</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative flex flex-col p-6 sm:p-8 md:max-w-2xl">
        {/* Course Header */}
        <div className="mb-4">
          <span className="inline-flex items-center rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300">
            Active Study
          </span>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl mt-3 truncate">
            {activeStudy.courseTitle}
          </h2>
          <p className="text-xs text-slate-350 mt-1">
            Pelajaran Aktif: <span className="text-white font-bold">{activeStudy.lessonTitle}</span>
          </p>
        </div>

        {/* Progress Bar & Description */}
        <div className="mb-6 w-full max-w-md">
          <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-2">
            <span>Progres Belajar</span>
            <span>{progressPercentage}% selesai</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div 
              className="h-full rounded-full bg-indigo-500 transition-all duration-500" 
              style={{ width: `${progressPercentage}%`, backgroundColor: '#6366f1' }}
            />
          </div>
        </div>

        {/* Banner Footer Actions */}
        <div className="flex flex-wrap items-center max-w-md gap-4 border-t border-slate-800 pt-5">
          {/* Next Goal */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-indigo-400">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-slate-455 font-semibold">Tujuan Anda</span>
              <span className="text-xs font-semibold text-slate-200">Selesaikan seluruh materi kelas ini</span>
            </div>
          </div>

          {/* Action button */}
          <Link 
            href={`/courses/${activeStudy.courseId}`}
            className="sm:ml-auto flex items-center justify-center gap-2 rounded-2xl bg-indigo-650 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-650/30 transition-all hover:bg-indigo-600 hover:shadow-indigo-600/20 active:scale-95 cursor-pointer"
          >
            <Flame className="h-4 w-4 fill-white" />
            Lanjutkan Belajar!
          </Link>
        </div>
      </div>
    </div>
  );
}
