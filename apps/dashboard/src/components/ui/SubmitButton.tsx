// File Location: src/components/SubmitButton.tsx
// Client component that displays a loading spinner during Server Action submission.
// Uses React 19's useFormStatus hook to detect pending form state.

"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

interface SubmitButtonProps {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}

export default function SubmitButton({ children, pendingText = "Processing...", className = "" }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} ${pending ? "opacity-60 cursor-not-allowed" : ""} inline-flex items-center justify-center gap-2`}
    >
      {pending ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
