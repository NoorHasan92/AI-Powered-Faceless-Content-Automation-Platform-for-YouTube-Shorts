// File Location: src/components/Sidebar.tsx
// Client-side sidebar navigation with Framer Motion active route transitions and SaaS styling.

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Video,
  BarChart2,
  Settings,
  Archive,
  Menu,
  X,
  Sparkles,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { href: "/", icon: Home, label: "Dashboard" },
  { href: "/projects", icon: Video, label: "Studio & Projects" },
  { href: "/archived", icon: Archive, label: "Archived" },
  { href: "/analytics", icon: BarChart2, label: "Analytics" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile Top Navigation Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-slate-950 text-white border-b border-slate-800/80 shrink-0 shadow-md z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight block leading-none">ShortForge</span>
            <span className="text-[10px] text-blue-400 font-medium">AI Studio</span>
          </div>
        </div>
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-850 rounded-lg transition-colors cursor-pointer"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Shell */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 text-white flex flex-col border-r border-slate-800/60 shrink-0 transition-transform duration-300 ease-in-out
          md:static md:translate-x-0
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/70 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              ShortForge
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                PRO
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Autonomous Video SaaS</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 space-y-1.5 mt-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">
            Workspace
          </p>
          {navLinks.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "text-white"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebarActivePill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600/30 via-indigo-600/20 to-transparent border-l-2 border-blue-500"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon size={18} className={`relative z-10 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
                <span className="relative z-10">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Engine Status & Footer */}
        <div className="p-4 border-t border-slate-800/70 space-y-3">
          <Link
            href="/projects"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs shadow-md shadow-blue-600/20 transition-all hover:shadow-lg cursor-pointer"
          >
            <Zap size={14} /> New Video Project
          </Link>

          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Render Engine</span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1.5 font-semibold">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Active
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">FFmpeg 1080p • Edge-TTS 24kHz</p>
          </div>
        </div>
      </aside>
    </>
  );
}
