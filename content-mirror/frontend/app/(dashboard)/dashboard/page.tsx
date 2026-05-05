import type { Metadata } from "next";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { RecentAnalyses } from "@/components/dashboard/RecentAnalyses";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "Dashboard | Content Mirror" };

export default function DashboardPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">

      <ErrorBoundary>
        <StatsOverview />
      </ErrorBoundary>

      {/* CTA banner */}
      <div className="relative overflow-hidden rounded-xl border border-brand-500/20 p-5 flex items-center justify-between gap-4">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 via-violet-500/5 to-transparent pointer-events-none" />
        <div className="absolute -top-6 -left-6 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative">
          <p className="text-sm font-semibold text-white mb-0.5">
            Ready to analyse your next video?
          </p>
          <p className="text-xs text-zinc-500">
            Upload a file or paste a YouTube / TikTok / Instagram URL.
          </p>
        </div>
        <Link href="/analyze" className="btn-primary text-sm px-4 py-2 shrink-0 relative">
          Analyse now
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <ErrorBoundary>
        <RecentAnalyses />
      </ErrorBoundary>

    </div>
  );
}
