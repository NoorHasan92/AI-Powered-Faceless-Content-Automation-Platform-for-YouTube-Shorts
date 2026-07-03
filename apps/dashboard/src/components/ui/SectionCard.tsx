// File Location: src/components/ui/SectionCard.tsx
import { type LucideIcon } from "lucide-react";

interface SectionCardProps {
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  children: React.ReactNode;
}

export default function SectionCard({ 
  title, 
  icon: Icon, 
  iconColor = "text-slate-500",
  children 
}: SectionCardProps) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
        <Icon className={iconColor} size={20} />
        {title}
      </h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}
