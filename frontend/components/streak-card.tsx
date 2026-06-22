"use client";

import { Flame } from "lucide-react";

interface StreakCardProps {
  currentStreak?: number;
  longestStreak?: number;
  weeklyActive?: boolean[];
}

export default function StreakCard({ currentStreak = 0, longestStreak = 0, weeklyActive = [] }: StreakCardProps) {
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const days = dayNames.map((name, idx) => {
    // Sunday in javascript is index 0. Mon is 1, Tue is 2, ..., Sat is 6.
    // Our visual order is Mon (idx 0), Tue (idx 1), ..., Sun (idx 6).
    const dayIndex = idx === 6 ? 0 : idx + 1;
    const active = weeklyActive[dayIndex] || false;
    return { name, active };
  });

  return (
    <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Weekly Streak
          </h3>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 dark:text-white">
            {currentStreak} Hari
          </p>
        </div>

        {/* Top Right Badge */}
        <span className="inline-flex items-center rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
          Streak Terpanjang: {longestStreak} Hari
        </span>
      </div>

      {/* Divider */}
      <div className="my-5 h-[1px] w-full bg-slate-100 dark:bg-slate-800" />

      {/* Week Days List */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, idx) => (
          <div key={idx} className="flex flex-col items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
              {day.name}
            </span>
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-300 ${
                day.active
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-105"
                  : "border border-dashed border-slate-200 bg-slate-50/50 text-slate-300 dark:border-slate-800 dark:bg-slate-950/20"
              }`}
            >
              {day.active ? (
                <Flame className="h-5 w-5 fill-white" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-slate-200 dark:bg-slate-800" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
