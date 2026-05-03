"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Video, ChevronRight, Plus, Loader2 } from "lucide-react";
import type { AnalysisSummary } from "@/lib/types";

function StatusBadge({ item }: { item: AnalysisSummary }) {
  if (item.hook_score == null) {
    const style: Record<string, string> = {
      pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      processing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      failed: "bg-red-500/10 text-red-400 border-red-500/20",
    };
    return (
      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize ${style[item.status] ?? "bg-zinc-800 text-zinc-500 border-zinc-700"}`}>
        {item.status === "processing" ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
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
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${style}`}>
      {s.toFixed(1)} / 10
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
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-white">Recent analyses</p>
        <Link href="/history" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          View all →
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-2 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-surface-900 rounded-xl border border-white/[0.04]" />
          ))}
        </div>
      )}

      {!isLoading && analyses?.length === 0 && (
        <div className="card border-dashed p-10 text-center">
          <div className="w-10 h-10 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Plus className="w-5 h-5 text-brand-400" />
          </div>
          <p className="text-sm font-medium text-white mb-1">No analyses yet</p>
          <p className="text-xs text-zinc-600 mb-5">Upload your first video to get started</p>
          <Link href="/analyze" className="btn-primary text-xs px-4 py-2">
            <Plus className="w-3.5 h-3.5" />
            Analyze a video
          </Link>
        </div>
      )}

      <div className="space-y-1.5">
        {analyses?.map((item) => (
          <Link
            key={item.id}
            href={`/analyze?id=${item.id}`}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.06] hover:border-white/[0.12] hover:bg-surface-900 transition-all duration-150 group"
          >
            <div className="w-8 h-8 bg-brand-500/10 rounded-lg flex items-center justify-center shrink-0">
              <Video className="w-3.5 h-3.5 text-brand-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-200 font-medium truncate">{item.filename}</p>
              <p className="text-xs text-zinc-600 mt-0.5">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </p>
            </div>
            <StatusBadge item={item} />
            <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 transition-colors shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
