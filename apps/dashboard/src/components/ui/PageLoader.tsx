// File Location: src/components/ui/PageLoader.tsx
"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export default function PageLoader() {
  return (
    <motion.div
      initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
      animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
      exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-100/50"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3, type: "spring", stiffness: 200 }}
        className="flex flex-col items-center gap-4 p-8 bg-white/80 rounded-2xl shadow-xl border border-white backdrop-blur-md"
      >
        <div className="relative flex items-center justify-center w-16 h-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="absolute inset-0 border-4 border-indigo-100 rounded-full border-t-indigo-500"
          />
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
        <div className="space-y-1 text-center">
          <h3 className="text-sm font-semibold text-slate-800 tracking-wide uppercase">
            Loading Environment
          </h3>
          <p className="text-xs text-slate-500">Preparing your workspace...</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
