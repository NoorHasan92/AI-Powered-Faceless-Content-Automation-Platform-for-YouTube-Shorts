// File Location: src/app/layout.tsx
// Root layout wrapping all pages with the persistent sidebar shell.
import "../globals.css";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen overflow-hidden text-slate-900 bg-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}