// File Location: src/components/Sidebar.tsx
// Client-side sidebar navigation with active route highlighting.
// Uses usePathname to determine the current route and style the active link.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Video, BarChart2, Settings, PlaySquare, Archive } from "lucide-react";

const navLinks = [
  { href: "/", icon: Home, label: "Dashboard" },
  { href: "/projects", icon: Video, label: "Projects" },
  { href: "/archived", icon: Archive, label: "Archived" },
  { href: "/analytics", icon: BarChart2, label: "Analytics" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 h-screen bg-slate-900 text-white flex flex-col border-r border-slate-800 shrink-0">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold flex items-center gap-2.5">
          <img src="/icon.svg" alt="ShortForge" className="w-7 h-7" />
          ShortForge
        </h1>
        <p className="text-[11px] text-slate-500 mt-1.5 ml-[38px]">AI Video Pipeline</p>
      </div>

      <nav className="flex-1 px-3 space-y-1 mt-6">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-3">
          Navigation
        </p>
        {navLinks.map(({ href, icon: Icon, label }) => {
          const isActive =
            pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? "bg-blue-600/15 text-blue-400 font-medium"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <p className="text-[11px] text-slate-400 font-medium">Pipeline Status</p>
          <p className="text-[11px] text-green-400 mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            System Online
          </p>
        </div>
      </div>
    </div>
  );
}