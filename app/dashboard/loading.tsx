import { FullPageLoader, LoadingSpinner } from "@/components/ui/loading-spinner";

export default function DashboardLoading() {
  return (
    <FullPageLoader>
      <LoadingSpinner size={48} />
    </FullPageLoader>
  );
}