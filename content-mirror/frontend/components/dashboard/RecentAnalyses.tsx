"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { BarChart3, ChevronRight } from "lucide-react";
import { scoreColor } from "@/lib/utils";
import type { AnalysisSummary } from "@/lib/types";

export function RecentAnalyses() {
  const { data: analyses, isLoading } = useQuery<AnalysisSummary[]>({
    queryKey: ["analyses"],
    queryFn: () => api.get("/analyses?limit=5").then((r) => r.data),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold">Recent Analyses</h2>
        <Link href="/history" className="text-brand-500 text-sm hover:underline">
          View all
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-surface-900 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && analyses?.length === 0 && (
        <div className="bg-surface-900 border border-white/10 rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">No analyses yet.</p>
          <Link
            href="/analyze"
            className="text-brand-500 text-sm mt-2 block hover:underline"
          >
            Analyze your first video →
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {analyses?.map((item) => (
          <Link
            key={item.id}
            href={`/analyze?id=${item.id}`}
            className="flex items-center gap-4 bg-surface-900 border border-white/10 hover:border-brand-500/30 rounded-xl px-4 py-3 transition-colors group"
          >
            <div className="w-8 h-8 bg-brand-500/10 rounded-lg flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4 text-brand-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{item.filename}</p>
              <p className="text-gray-600 text-xs">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </p>
            </div>
            <span className={`text-sm font-bold ${scoreColor(item.hook_score)}`}>
              {item.hook_score.toFixed(1)}
            </span>
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
