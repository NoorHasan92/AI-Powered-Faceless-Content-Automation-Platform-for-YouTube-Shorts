// File Location: src/app/layout.tsx
// Root layout wrapping all pages with the persistent sidebar shell.
import "../globals.css";
import Sidebar from "@/components/Sidebar";

export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden text-slate-900 bg-slate-50 md:bg-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative">
        {children}
      </main>
    </div>
  );
}