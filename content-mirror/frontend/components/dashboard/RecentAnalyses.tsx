"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Video, ChevronRight, Plus } from "lucide-react";
import type { AnalysisSummary } from "@/lib/types";

function ScoreBadge({ item }: { item: AnalysisSummary }) {
  if (item.hook_score == null) {
    const colors: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-400",
      processing: "bg-blue-500/10 text-blue-400",
      failed: "bg-red-500/10 text-red-400",
    };
    return (
      <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${colors[item.status] ?? "bg-gray-500/10 text-gray-400"}`}>
        {item.status}
      </span>
    );
  }
  const score = item.hook_score;
  const cls =
    score >= 7
      ? "bg-green-500/10 text-green-400"
      : score >= 4
      ? "bg-yellow-500/10 text-yellow-400"
      : "bg-red-500/10 text-red-400";
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>
      {score.toFixed(1)} / 10
    </span>
  );
}

export function RecentAnalyses() {
  const { data: analyses, isLoading } = useQuery<AnalysisSummary[]>({
    queryKey: ["analyses"],
    queryFn: () => api.get("/analyses?limit=5").then((r) => r.data),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold text-base">Recent Analyses</h2>
        <Link href="/history" className="text-brand-500 text-sm hover:text-brand-400 transition-colors">
          View all →
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-2 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-[58px] bg-surface-900 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && analyses?.length === 0 && (
        <div className="bg-surface-900 border border-dashed border-white/10 rounded-xl p-10 text-center">
          <div className="w-10 h-10 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Plus className="w-5 h-5 text-brand-500" />
          </div>
          <p className="text-white text-sm font-medium mb-1">No analyses yet</p>
          <p className="text-gray-500 text-xs mb-4">Upload your first video to get started</p>
          <Link
            href="/analyze"
            className="inline-flex items-center gap-1.5 text-sm bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Analyze a video
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {analyses?.map((item) => (
          <Link
            key={item.id}
            href={`/analyze?id=${item.id}`}
            className="flex items-center gap-4 bg-surface-900 border border-white/10 hover:border-brand-500/30 hover:bg-surface-900/80 rounded-xl px-4 py-3 transition-all duration-150 group"
          >
            <div className="w-9 h-9 bg-brand-500/10 rounded-lg flex items-center justify-center shrink-0">
              <Video className="w-4 h-4 text-brand-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate leading-tight">{item.filename}</p>
              <p className="text-gray-600 text-xs mt-0.5">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </p>
            </div>
            <ScoreBadge item={item} />
            <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-gray-400 transition-colors shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
