// File Location: src/app/loading.tsx
import PageLoader from "@/components/ui/PageLoader";

export default function Loading() {
  return (
    <div className="relative w-full h-full min-h-[500px]">
      <PageLoader />
    </div>
  );
}
