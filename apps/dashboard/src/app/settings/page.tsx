// File Location: src/app/settings/page.tsx
// Settings page for managing API keys, default pipeline config, and integrations.
// Currently displays configuration sections as read-only placeholders.

import { Settings, Key, Sliders, MonitorPlay, Shield } from "lucide-react";

export default function SettingsPage() {
  const sections = [
    {
      title: "API Keys",
      description: "Manage your AI and platform integration keys.",
      icon: Key,
      items: [
        { label: "Google Gemini API Key", status: "Connected", statusColor: "text-green-600 bg-green-50" },
        { label: "YouTube Data API Key", status: "Not Connected", statusColor: "text-slate-400 bg-slate-50" },
        { label: "Stability AI Key (Image Gen)", status: "Not Connected", statusColor: "text-slate-400 bg-slate-50" },
      ],
    },
    {
      title: "Pipeline Defaults",
      description: "Set default values for new project pipelines.",
      icon: Sliders,
      items: [
        { label: "Default Niche", status: "Science", statusColor: "text-blue-600 bg-blue-50" },
        { label: "Default Tone", status: "Educational", statusColor: "text-blue-600 bg-blue-50" },
        { label: "Scene Count Range", status: "4–6 scenes", statusColor: "text-blue-600 bg-blue-50" },
      ],
    },
    {
      title: "YouTube Integration",
      description: "Connect your YouTube channel for automated publishing.",
      icon: MonitorPlay,
      items: [
        { label: "Channel Connection", status: "Not Linked", statusColor: "text-slate-400 bg-slate-50" },
        { label: "Auto-Publish", status: "Disabled", statusColor: "text-slate-400 bg-slate-50" },
        { label: "Default Visibility", status: "Unlisted", statusColor: "text-blue-600 bg-blue-50" },
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Configure your pipeline, API keys, and integrations.</p>
      </header>

      <div className="space-y-6">
        {sections.map(({ title, description, icon: Icon, items }) => (
          <div key={title} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Icon size={18} className="text-slate-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                <p className="text-xs text-slate-500">{description}</p>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {items.map(({ label, status, statusColor }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-sm text-slate-700">{label}</span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor}`}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
        <Shield className="mx-auto text-slate-300 mb-3" size={32} />
        <p className="text-sm text-slate-500">
          Settings modification will be enabled in a future update.
          <br />
          API keys are currently managed via environment variables.
        </p>
      </div>
    </div>
  );
}
