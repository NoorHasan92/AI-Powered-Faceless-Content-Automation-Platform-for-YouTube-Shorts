// File Location: src/components/project/CreateProjectForm.tsx
import { Plus } from "lucide-react";
import SubmitButton from "@/components/ui/SubmitButton";
import { createProjectAction } from "@/actions/project.actions";
import { NICHE_OPTIONS, TONE_OPTIONS } from "@/lib/constants";

export default function CreateProjectForm() {
  return (
    <form
      action={createProjectAction}
      className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
    >
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Project Working Title
        </label>
        <input
          type="text"
          name="title"
          placeholder="e.g., Quantum Physics Explained"
          className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 bg-white"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Content Niche
        </label>
        <select
          name="niche"
          className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white"
        >
          {NICHE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Narration Tone
        </label>
        <select
          name="tone"
          className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white"
        >
          {TONE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="md:col-span-3 flex justify-end mt-2">
        <SubmitButton
          pendingText="Initializing..."
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-lg transition-colors shadow-sm"
        >
          <Plus size={18} /> Initialize Pipeline
        </SubmitButton>
      </div>
    </form>
  );
}
