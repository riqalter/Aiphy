"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  GraduationCap, 
  BookOpen, 
  MessageSquare, 
  HelpCircle, 
  Settings,
  Sparkles
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Course", href: "/my-course", icon: GraduationCap },
    { name: "All Courses", href: "/all-courses", icon: BookOpen },
    { name: "AI Chat", href: "/ai-chat", icon: MessageSquare },
  ];

  const bottomItems = [
    { name: "Help", href: "/help", icon: HelpCircle },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-20 flex-col items-center justify-between border-r border-indigo-900/10 bg-[#1E216B] py-6 text-white shadow-xl">
      {/* Brand Logo */}
      <div className="flex flex-col items-center gap-2">
        <Link href="/" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-white hover:bg-indigo-500/30 transition-all duration-200">
          <Sparkles className="h-6 w-6 text-indigo-300 animate-pulse" />
        </Link>
      </div>

      {/* Menu Navigation */}
      <nav className="flex flex-col gap-6 w-full px-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              title={item.name}
              className={`relative flex h-12 w-12 mx-auto items-center justify-center rounded-xl transition-all duration-300 ${
                isActive
                  ? "bg-indigo-600/90 text-white shadow-md shadow-indigo-600/30 scale-105"
                  : "text-indigo-200/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-5.5 w-5.5" />
              {isActive && (
                <span className="absolute left-0 top-3 h-6 w-1 rounded-r bg-indigo-300" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Navigation */}
      <div className="flex flex-col gap-6 w-full px-2">
        <div className="h-[1px] w-8 mx-auto bg-indigo-200/20" />
        {bottomItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              title={item.name}
              className={`flex h-12 w-12 mx-auto items-center justify-center rounded-xl transition-all duration-300 ${
                isActive
                  ? "bg-indigo-600/90 text-white"
                  : "text-indigo-200/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-5.5 w-5.5" />
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
