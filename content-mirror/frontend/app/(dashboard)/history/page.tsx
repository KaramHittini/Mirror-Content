"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { BarChart3, ChevronRight } from "lucide-react";
import type { AnalysisSummary } from "@/lib/types";

export default function HistoryPage() {
  const { data: analyses, isLoading } = useQuery<AnalysisSummary[]>({
    queryKey: ["analyses"],
    queryFn: () => api.get("/analyses").then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="space-y-3 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-surface-900 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Analysis History</h1>

      {analyses?.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No analyses yet.</p>
          <Link href="/analyze" className="text-brand-500 text-sm mt-2 block hover:underline">
            Start your first analysis →
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {analyses?.map((item) => (
          <Link
            key={item.id}
            href={`/analyze?id=${item.id}`}
            className="flex items-center justify-between bg-surface-900 border border-white/10 hover:border-brand-500/40 rounded-xl px-5 py-4 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-brand-500/10 rounded-lg flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 text-brand-500" />
              </div>
              <div>
                <p className="text-white text-sm font-medium truncate max-w-sm">
                  {item.filename}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {formatDistanceToNow(new Date(item.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  item.hook_score >= 7
                    ? "bg-green-500/10 text-green-400"
                    : item.hook_score >= 4
                    ? "bg-yellow-500/10 text-yellow-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                Hook {item.hook_score.toFixed(1)}/10
              </span>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
