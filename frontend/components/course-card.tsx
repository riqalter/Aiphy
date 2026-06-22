"use client";

import { Star, Plus, Layers, Play, Users, Clock, BookOpen } from "lucide-react";

interface CourseCardProps {
  type: "enrolled" | "recommendation";
  category: string;
  title: string;
  level: string;
  chaptersCount: number;
  videosCount?: number;
  duration?: string;
  rating?: number;
  enrolledStudentsCount?: string;
  progressText?: string;
  progressPercentage?: number;
  price?: string;
  originalPrice?: string;
  onPrintCertificate?: (e: React.MouseEvent) => void;
}

export default function CourseCard({
  type,
  category,
  title,
  level,
  chaptersCount,
  videosCount,
  duration,
  rating,
  enrolledStudentsCount,
  progressText,
  progressPercentage,
  price,
  originalPrice,
  onPrintCertificate,
}: CourseCardProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-all duration-300 dark:border-slate-800 dark:bg-slate-900">
      {/* Cover Image / Illustration Area */}
      <div className="relative flex aspect-video w-full flex-col justify-between bg-indigo-50/60 p-4 dark:bg-slate-950/40">
        {/* Category Label */}
        <span className="self-start rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400">
          {category}
        </span>

        {/* Python & Graphic Overlay */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <span className="text-xl">🐍</span>
            <span className="text-xs font-bold text-slate-800 dark:text-white">Basic Algorithm</span>
          </div>
        </div>

        {/* Decorator overlays */}
        <div className="absolute bottom-2 left-4 text-slate-300 dark:text-slate-700/50">🌐</div>
        <div className="absolute bottom-2 right-4 text-slate-300 dark:text-slate-700/50">&lt;/&gt;</div>
      </div>

      {/* Course Info */}
      <div className="flex flex-1 flex-col p-5">
        {/* Title & Optional Rating */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-bold text-slate-900 line-clamp-2 dark:text-white hover:text-indigo-600 transition-colors">
            {title}
          </h4>
          {type === "recommendation" && rating && (
            <div className="flex items-center gap-1 shrink-0 text-xs font-bold text-amber-500">
              <span>{rating}</span>
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
            </div>
          )}
        </div>

        {/* Badges / Stats grid */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            {level}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {chaptersCount} Chapters
          </span>
          {type === "enrolled" && videosCount && (
            <span className="flex items-center gap-1">
              <Play className="h-3.5 w-3.5" />
              {videosCount} Videos
            </span>
          )}
          {type === "recommendation" && enrolledStudentsCount && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {enrolledStudentsCount}
            </span>
          )}
          {type === "recommendation" && duration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {duration}
            </span>
          )}
        </div>

        {/* Dynamic section: Enrolled progress vs Price buy */}
        <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800/80">
          {type === "enrolled" ? (
            <div className="w-full space-y-3">
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  <span>{progressText}</span>
                  <span>{progressPercentage}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-indigo-600" 
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
              {progressPercentage === 100 && onPrintCertificate && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onPrintCertificate(e);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold py-2 transition shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  Cetak Sertifikat
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-xs font-semibold text-slate-400 line-through">
                  {originalPrice}
                </span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {price}
                </span>
              </div>
              <button className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white hover:bg-slate-800 transition-colors dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
