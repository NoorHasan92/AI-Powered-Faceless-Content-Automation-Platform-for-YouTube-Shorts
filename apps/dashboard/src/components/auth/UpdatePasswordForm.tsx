// File Location: src/components/auth/UpdatePasswordForm.tsx
"use client";

import { useState, useTransition } from "react";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";
import { updatePasswordAction } from "@/actions/auth.actions";
import SubmitButton from "@/components/ui/SubmitButton";

export default function UpdatePasswordForm() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleUpdate(formData: FormData) {
    setError("");
    setSuccess("");
    
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    startTransition(async () => {
      const result = await updatePasswordAction(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess("Password updated successfully.");
        (document.getElementById("update-password-form") as HTMLFormElement).reset();
      }
    });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center gap-3">
        <div className="p-2 bg-slate-100 rounded-lg">
          <Lock size={18} className="text-slate-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Security & Password</h2>
          <p className="text-xs text-slate-500">Update your account password.</p>
        </div>
      </div>
      <form id="update-password-form" action={handleUpdate} className="p-5 space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle2 size={16} /> {success}
          </div>
        )}

        <div className="space-y-4 max-w-3xl">
          {/* Current Password - half width to match New Password */}
          <div className="w-full sm:w-[calc(50%-0.5rem)]">
            <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
            <input
              type="password"
              name="currentPassword"
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* New and Confirm Passwords - side by side */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                name="newPassword"
                required
                minLength={8}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                required
                minLength={8}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <SubmitButton
            pendingText="Updating..."
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg text-sm shadow-sm transition-colors"
          >
            Update Password
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
