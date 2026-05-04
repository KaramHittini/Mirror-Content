"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Video, ChevronRight, Plus, Loader2 } from "lucide-react";
import type { AnalysisSummary } from "@/lib/types";

function ScorePill({ item }: { item: AnalysisSummary }) {
  if (item.hook_score == null) {
    const style: Record<string, string> = {
      pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      processing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      failed: "bg-red-500/10 text-red-400 border-red-500/20",
    };
    return (
      <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border capitalize ${style[item.status] ?? "bg-zinc-800 text-zinc-500 border-zinc-700"}`}>
        {item.status === "processing" && <Loader2 className="w-3 h-3 animate-spin" />}
        {item.status}
      </span>
    );
  }
  const s = item.hook_score;
  const cls =
    s >= 7 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    : s >= 4 ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
    : "bg-red-500/10 text-red-400 border-red-500/20";
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
      {s.toFixed(1)} / 10
    </span>
  );
}

export default function HistoryPage() {
  const { data: analyses, isLoading } = useQuery<AnalysisSummary[]>({
    queryKey: ["analyses"],
    queryFn: () => api.get("/analyses").then((r) => r.data),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">History</h1>
          <p className="text-sm text-zinc-600 mt-0.5">
            {analyses?.length ?? "—"} total {analyses?.length === 1 ? "analysis" : "analyses"}
          </p>
        </div>
        <Link href="/analyze" className="btn-primary text-xs px-3.5 py-2">
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New analysis</span>
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-1.5 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-[58px] bg-surface-900 rounded-xl border border-white/[0.04]" />
          ))}
        </div>
      )}

      {!isLoading && analyses?.length === 0 && (
        <div className="card border-dashed p-14 text-center">
          <div className="w-10 h-10 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Video className="w-4.5 h-4.5 text-brand-400" />
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
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-white/[0.06] hover:border-white/[0.12] hover:bg-surface-900 transition-all duration-150 group"
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
            <ScorePill item={item} />
            <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 transition-colors shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
