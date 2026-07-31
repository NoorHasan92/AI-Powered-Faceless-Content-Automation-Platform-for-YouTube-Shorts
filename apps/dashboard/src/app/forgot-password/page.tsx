"use client";

import { useState, useTransition } from "react";
import { Mail, KeyRound, Lock, ArrowRight, ArrowLeft, Sparkles, ShieldCheck } from "lucide-react";
import { requestPasswordResetAction, resetPasswordWithOtpAction } from "@/actions/auth.actions";
import SubmitButton from "@/components/ui/SubmitButton";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState("");

  const calculateStrength = (pass: string) => {
    let score = 0;
    if (!pass) return score;
    if (pass.length >= 4) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strengthScore = calculateStrength(password);
  const getStrengthDetails = (score: number) => {
    if (score === 0) return { label: "", color: "bg-transparent", text: "", width: "0%" };
    if (score <= 2) return { label: "Weak", color: "bg-red-500", text: "text-red-400", width: "33%" };
    if (score <= 4) return { label: "Medium", color: "bg-yellow-500", text: "text-yellow-400", width: "66%" };
    return { label: "Strong", color: "bg-emerald-500", text: "text-emerald-400", width: "100%" };
  };
  const strengthDetails = getStrengthDetails(strengthScore);

  async function handleRequestReset(formData: FormData) {
    setError("");
    setSuccessMsg("");
    const emailInput = formData.get("email") as string;
    setEmail(emailInput);

    startTransition(async () => {
      const result = await requestPasswordResetAction(emailInput);
      if (result?.error) {
        setError(result.error);
      } else {
        setStep(2);
        setSuccessMsg("If an account exists, an 8-digit OTP has been sent to your email. Valid for 15 minutes.");
      }
    });
  }

  async function handleResetPassword(formData: FormData) {
    setError("");
    setSuccessMsg("");
    formData.append("email", email);

    const pwd = formData.get("newPassword") as string;
    const confirmPwd = formData.get("confirmPassword") as string;

    if (pwd !== confirmPwd) {
      setError("Passwords do not match");
      return;
    }

    startTransition(async () => {
      const result = await resetPasswordWithOtpAction(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccessMsg("Password reset successfully! Redirecting to login...");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
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
          {/* Header section */}
          <div className="flex flex-col items-center mb-10">
            <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-6 relative group cursor-default">
              <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <KeyRound className="text-white" size={28} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
              {step === 1 ? "Reset Password" : "Secure Verification"}
            </h1>
            <p className="text-slate-400 text-sm text-center">
              {step === 1
                ? "Enter your registered email to receive a secure OTP."
                : "Check your email for the 8-digit secure code."}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl text-center backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 rounded-xl text-center backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
              {successMsg}
            </div>
          )}

          {step === 1 ? (
            <form action={handleRequestReset} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="pt-2">
                <SubmitButton
                  pendingText="Sending OTP..."
                  className="group w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-3.5 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] transition-all flex justify-center items-center gap-2"
                >
                  Send Reset Code
                  <ArrowRight size={18} className="opacity-70 group-hover:translate-x-1 transition-transform" />
                </SubmitButton>
              </div>
            </form>
          ) : (
            <form action={handleResetPassword} className="space-y-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 ml-1">8-Digit OTP</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                      <ShieldCheck size={18} />
                    </div>
                    <input
                      type="text"
                      name="otp"
                      maxLength={8}
                      pattern="\d{8}"
                      required
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner tracking-[0.2em] text-center font-mono text-xl"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1 mb-1">
                    <label className="text-sm font-medium text-slate-300">New Password</label>
                    {password && (
                      <span className={`text-xs font-semibold ${strengthDetails.text} transition-colors`}>
                        {strengthDetails.label}
                      </span>
                    )}
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      type="password"
                      name="newPassword"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={4}
                      required
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner tracking-wide"
                      placeholder="Min 4 characters"
                    />
                  </div>
                  {/* Password Strength Meter */}
                  <div className="h-1.5 w-full bg-slate-800 rounded-full mt-2 overflow-hidden flex">
                    <div 
                      className={`h-full transition-all duration-300 ${strengthDetails.color}`}
                      style={{ width: strengthDetails.width }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 ml-1">Confirm Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      type="password"
                      name="confirmPassword"
                      minLength={4}
                      required
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner tracking-wide"
                      placeholder="Repeat new password"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <SubmitButton
                  pendingText="Resetting Password..."
                  className="group w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-3.5 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] transition-all flex justify-center items-center gap-2"
                >
                  Reset Password
                  <Sparkles size={18} className="opacity-70 group-hover:scale-110 transition-transform" />
                </SubmitButton>
              </div>
            </form>
          )}

          <div className="mt-8 text-center">
            <Link href="/login" className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={14} className="mr-2" />
              Back to Login
            </Link>
          </div>
        </div>
        
        <div className="mt-8 text-center text-xs text-slate-600">
          <p>Secure Access — ShortForge AI v1.0</p>
        </div>
      </div>
    </div>
  );
}
