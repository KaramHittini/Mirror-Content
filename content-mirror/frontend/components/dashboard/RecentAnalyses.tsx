"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Video, ChevronRight, Plus, Loader2, History } from "lucide-react";
import type { AnalysisSummary } from "@/lib/types";

function ScoreBadge({ item }: { item: AnalysisSummary }) {
  if (item.hook_score == null) {
    const styles: Record<string, string> = {
      pending:    "bg-amber-500/10 text-amber-400 border-amber-500/20",
      processing: "bg-blue-500/10  text-blue-400  border-blue-500/20",
      failed:     "bg-red-500/10   text-red-400   border-red-500/20",
    };
    return (
      <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border capitalize ${styles[item.status] ?? "bg-zinc-800 text-zinc-500 border-zinc-700"}`}>
        {item.status === "processing" && <Loader2 className="w-3 h-3 animate-spin" />}
        {item.status}
      </span>
    );
  }

  const s = item.hook_score;
  const style =
    s >= 7 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    : s >= 4 ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
    : "bg-red-500/10 text-red-400 border-red-500/20";

  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${style}`}>
      {s.toFixed(1)} / 10
    </span>
  );
}

function ScoreBar({ score }: { score: number | null }) {
  if (score == null) return null;
  const pct = (score / 10) * 100;
  const color =
    score >= 7 ? "bg-emerald-500"
    : score >= 4 ? "bg-amber-500"
    : "bg-red-500";

  return (
    <div className="w-12 h-1 rounded-full bg-white/[0.06] overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function RecentAnalyses() {
  const { data: analyses, isLoading } = useQuery<AnalysisSummary[]>({
    queryKey: ["analyses", { limit: 5 }],
    queryFn: () => api.get("/analyses", { params: { limit: 5 } }).then((r) => r.data),
  });

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-zinc-800 border border-white/[0.06] flex items-center justify-center">
            <History className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <p className="text-sm font-semibold text-white">Recent analyses</p>
        </div>
        <Link
          href="/history"
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
        >
          View all
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-surface-900 rounded-xl border border-white/[0.04]" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && analyses?.length === 0 && (
        <div className="card border-dashed p-12 text-center">
          <div className="w-12 h-12 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-5 h-5 text-brand-400" />
          </div>
          <p className="text-sm font-semibold text-white mb-1">No analyses yet</p>
          <p className="text-xs text-zinc-500 mb-5">Upload your first video to get started</p>
          <Link href="/analyze" className="btn-primary text-xs px-4 py-2">
            <Plus className="w-3.5 h-3.5" />
            Analyze a video
          </Link>
        </div>
      )}

      {/* List */}
      {!isLoading && analyses && analyses.length > 0 && (
        <div className="card divide-y divide-white/[0.04] overflow-hidden">
          {analyses.map((item) => (
            <Link
              key={item.id}
              href={`/analyze?id=${item.id}`}
              className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-white/[0.03] transition-colors duration-150 group"
            >
              {/* Icon */}
              <div className="w-8 h-8 bg-brand-500/10 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-brand-500/15 transition-colors">
                <Video className="w-3.5 h-3.5 text-brand-400" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-100 font-medium truncate leading-snug">
                  {item.filename}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-zinc-600">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </p>
                  <ScoreBar score={item.hook_score} />
                </div>
              </div>

              {/* Score badge */}
              <ScoreBadge item={item} />

              {/* Arrow */}
              <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0 -mr-0.5" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
