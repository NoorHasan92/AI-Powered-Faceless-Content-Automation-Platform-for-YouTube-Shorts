// File Location: src/app/settings/page.tsx
// Settings page for managing API keys, default pipeline config, and integrations.

import { Settings, Key, Sliders, MonitorPlay, Shield, Video, LogOut } from "lucide-react";
import { cookies } from "next/headers";
import { getConnectedYouTubeChannel } from "@/services/youtube.service";
import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";
import { logoutAction } from "@/actions/auth.actions";
import ConfirmAction from "@/components/ui/ConfirmAction";
import { disconnectYouTubeAction } from "@/actions/youtube.actions";
import SubmitButton from "@/components/ui/SubmitButton";
import VisibilitySelect from "@/components/settings/VisibilitySelect";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const ytAccessToken = cookieStore.get("yt_access_token")?.value;
  const ytRefreshToken = cookieStore.get("yt_refresh_token")?.value;
  const ytVisibility = cookieStore.get("yt_default_visibility")?.value as "public" | "private" | "unlisted" || "private";

  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasPexels = !!process.env.PEXELS_API_KEY;

  let ytChannel = null;
  if (ytAccessToken) {
    ytChannel = await getConnectedYouTubeChannel(ytAccessToken, ytRefreshToken);
  }

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
      title: "YouTube Integration",
      description: "Connect your YouTube channel for automated publishing.",
      icon: MonitorPlay,
      items: [
        {
          label: ytChannel ? ytChannel.title : "Channel Connection",
          status: ytAccessToken ? "Connected" : "Not Linked",
          statusColor: ytAccessToken ? "text-green-600 bg-green-50" : "text-slate-500 bg-slate-100",
          thumbnail: ytChannel?.thumbnail
        },
        {
          label: "Default Visibility",
          isComponent: true,
          component: <VisibilitySelect initialVisibility={ytVisibility} />
        },
      ],
      action: !ytAccessToken ? (
        <div className="px-5 pb-5">
          <a
            href="/api/auth/youtube"
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors shadow-sm"
          >
            <Video size={16} /> Connect YouTube Account
          </a>
        </div>
      ) : (
        <div className="px-5 pb-5 border-t border-slate-100 pt-5 mt-2">
          <ConfirmAction
            action={disconnectYouTubeAction}
            title="Disconnect YouTube"
            description="Are you sure you want to disconnect your YouTube account? You won't be able to directly publish videos until you reconnect."
            confirmText="Disconnect"
            pendingText="Disconnecting..."
            confirmVariant="warning"
            trigger={
              <button type="button" className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-white border border-slate-300 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-700 font-medium py-2 px-4 rounded-lg text-sm transition-colors shadow-sm cursor-pointer">
                Disconnect Account
              </button>
            }
          />
        </div>
      )
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 mt-1">Configure your pipeline, API keys, and integrations.</p>
        </div>
        <ConfirmAction
          action={logoutAction}
          title="Sign Out"
          description="Are you sure you want to sign out?"
          confirmText="Sign Out"
          pendingText="Signing out..."
          confirmVariant="danger"
          trigger={
            <button type="button" className="w-full md:w-auto justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-2">
              <LogOut size={16} /> Sign Out
            </button>
          }
        />
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
              {items.map((item: any) => (
                <div key={item.label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    {item.thumbnail && (
                      <img src={item.thumbnail} alt={item.label} className="w-8 h-8 rounded-full bg-slate-200" />
                    )}
                    <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  </div>
                  {item.isComponent ? (
                    <div className="w-full sm:w-auto">{item.component}</div>
                  ) : (
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full w-fit ${item.statusColor}`}>
                      {item.status}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {action && action}
          </div>
        ))}
      </div>

      <UpdatePasswordForm />

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
