// File Location: src/app/settings/page.tsx
// Settings page for managing API keys, default pipeline config, and integrations.

import { Settings, Key, Sliders, MonitorPlay, Shield, Video } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const hasYouTubeToken = !!cookieStore.get("yt_access_token")?.value;

  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasPexels = !!process.env.PEXELS_API_KEY;

  const sections = [
    {
      title: "API Keys",
      description: "Manage your AI and platform integration keys (configured via .env).",
      icon: Key,
      items: [
        { 
          label: "Google Gemini API Key", 
          status: hasGemini ? "Connected" : "Not Connected", 
          statusColor: hasGemini ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50" 
        },
        { 
          label: "Pexels API Key (Assets)", 
          status: hasPexels ? "Connected" : "Not Connected", 
          statusColor: hasPexels ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50" 
        },
        { 
          label: "Microsoft Edge TTS", 
          status: "Built-in (No Key Needed)", 
          statusColor: "text-blue-600 bg-blue-50" 
        },
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
        { 
          label: "Channel Connection", 
          status: hasYouTubeToken ? "Connected" : "Not Linked", 
          statusColor: hasYouTubeToken ? "text-green-600 bg-green-50" : "text-slate-500 bg-slate-100" 
        },
        { 
          label: "Default Visibility", 
          status: "Private", 
          statusColor: "text-blue-600 bg-blue-50" 
        },
      ],
      action: !hasYouTubeToken ? (
        <div className="px-5 pb-5">
          <a 
            href="/api/auth/youtube"
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors shadow-sm"
          >
            <Video size={16} /> Connect YouTube Account
          </a>
        </div>
      ) : null
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Configure your pipeline, API keys, and integrations.</p>
      </header>

      <div className="space-y-6">
        {sections.map(({ title, description, icon: Icon, items, action }) => (
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
            {action && action}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
        <Shield className="mx-auto text-slate-300 mb-3" size={32} />
        <p className="text-sm text-slate-500">
          Advanced settings modification will be enabled in a future update.
          <br />
          API keys are currently managed via environment variables.
        </p>
      </div>
    </div>
  );
}
