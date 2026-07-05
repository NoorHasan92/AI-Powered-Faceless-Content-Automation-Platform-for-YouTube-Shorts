"use client";

import { useState } from "react";
import SubmitButton from "./SubmitButton";

interface ConfirmActionProps {
  action: (formData: FormData) => void;
  title: string;
  description: string;
  confirmText: string;
  pendingText: string;
  confirmVariant?: "danger" | "warning" | "primary";
  trigger: React.ReactNode;
}

export default function ConfirmAction({
  action,
  title,
  description,
  confirmText,
  pendingText,
  confirmVariant = "danger",
  trigger
}: ConfirmActionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div onClick={() => setIsOpen(true)} className="inline-block flex-1 md:flex-none">
        {trigger}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
              <p className="text-slate-600 text-sm mb-6 leading-relaxed">{description}</p>
              
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <form action={action}>
                  <SubmitButton
                    pendingText={pendingText}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm ${
                      confirmVariant === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                      confirmVariant === 'warning' ? 'bg-amber-500 hover:bg-amber-600' :
                      'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {confirmText}
                  </SubmitButton>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
