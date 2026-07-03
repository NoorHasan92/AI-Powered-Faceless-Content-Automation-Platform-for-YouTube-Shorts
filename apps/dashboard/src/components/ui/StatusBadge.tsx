// File Location: src/components/ui/StatusBadge.tsx
import { PROJECT_STATUS_CONFIG } from "@/lib/constants";

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = PROJECT_STATUS_CONFIG[status] || PROJECT_STATUS_CONFIG.DRAFT;
  
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${config.className}`}
    >
      {config.label}
    </span>
  );
}
