import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { RecentAnalyses } from "@/components/dashboard/RecentAnalyses";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Overview</h1>
          <p className="text-sm text-zinc-600 mt-0.5">Your content analysis at a glance</p>
        </div>
        <Link href="/analyze" className="btn-primary text-xs px-3.5 py-2">
          <Plus className="w-3.5 h-3.5" />
          New analysis
        </Link>
      </div>

      <StatsOverview />
      <RecentAnalyses />
    </div>
  );
}
