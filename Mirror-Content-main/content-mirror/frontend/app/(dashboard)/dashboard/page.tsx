import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { RecentAnalyses } from "@/components/dashboard/RecentAnalyses";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">
            Track your content performance over time
          </p>
        </div>
        <Link
          href="/analyze"
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Analysis
        </Link>
      </div>

      <StatsOverview />
      <RecentAnalyses />
    </div>
  );
}
