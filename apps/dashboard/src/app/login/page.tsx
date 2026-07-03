// File Location: src/app/login/page.tsx
"use client";

import { useState, useTransition } from "react";
import { Lock, User, Sparkles, ArrowRight } from "lucide-react";
import { loginAction } from "@/actions/auth.actions";
import SubmitButton from "@/components/ui/SubmitButton";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleLogin(formData: FormData) {
    setError("");
    startTransition(async () => {
      const result = await loginAction(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#0B0F19] overflow-hidden selection:bg-blue-500/30">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-[28rem] h-[28rem] bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none" />

      <div className="w-full max-w-[420px] px-6 z-10">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-8 sm:p-10 shadow-2xl">
          {/* Logo / Header section */}
          <div className="flex flex-col items-center mb-10">
            <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-6 relative group cursor-default">
              <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <Sparkles className="text-white" size={28} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">Welcome Back</h1>
            <p className="text-slate-400 text-sm text-center">Sign in to your ShortForge AI dashboard</p>
          </div>

          <form action={handleLogin} className="space-y-6">
            {error && (
              <div className="p-4 text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl text-center backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">Username</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    name="username"
                    required
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-sm font-medium text-slate-300">Password</label>
                  <a href="#" className="text-xs text-blue-400 hover:text-blue-300 hover:underline transition-all">
                    Forgot password?
                  </a>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    name="password"
                    required
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner tracking-wide"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <SubmitButton
                pendingText="Authenticating..."
                className="group w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-3.5 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] transition-all flex justify-center items-center gap-2"
              >
                Sign In
                <ArrowRight size={18} className="opacity-70 group-hover:translate-x-1 transition-transform" />
              </SubmitButton>
            </div>
          </form>
        </div>
        
        <div className="mt-8 text-center text-xs text-slate-600">
          <p>Secure Access — ShortForge AI v1.0</p>
        </div>
      </div>
    </div>
  );
}
