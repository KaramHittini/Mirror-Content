"use client";

import { useState, useEffect, useRef } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useQueryClient } from "@tanstack/react-query";
import { getAnalysisHistory, deleteAnalysis } from "@/lib/api";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Video, ChevronRight, Plus, Loader2, Search, Trash2, AlertCircle } from "lucide-react";
import type { AnalysisSummary } from "@/lib/types";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Completed", value: "completed" },
  { label: "Processing", value: "processing" },
  { label: "Failed", value: "failed" },
];

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
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  usePageTitle("History");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  // Reset and reload when filters change
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setOffset(0);
    getAnalysisHistory({
      limit: PAGE_SIZE,
      offset: 0,
      status: statusFilter || undefined,
      search: debouncedSearch || undefined,
    })
      .then((data: AnalysisSummary[]) => {
        if (!cancelled) {
          setAnalyses(data);
          setHasMore(data.length === PAGE_SIZE);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [statusFilter, debouncedSearch]);

  const loadMore = async () => {
    const nextOffset = offset + PAGE_SIZE;
    setIsLoadingMore(true);
    try {
      const data: AnalysisSummary[] = await getAnalysisHistory({
        limit: PAGE_SIZE,
        offset: nextOffset,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
      });
      setAnalyses((prev) => [...prev, ...data]);
      setOffset(nextOffset);
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      // error toast handled by axios interceptor
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      await deleteAnalysis(id);
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
      toast.success("Analysis deleted");
    } catch {
      // error toast handled by axios interceptor
    } finally {
      setDeletingId(null);
    }
  };

  const totalLabel = isLoading ? "—" : analyses.length;

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">History</h1>
          <p className="text-sm text-zinc-600 mt-0.5">
            {totalLabel} {analyses.length === 1 ? "analysis" : "analyses"}{hasMore ? "+" : ""}
          </p>
        </div>
        <Link href="/analyze" className="btn-primary text-xs px-3.5 py-2">
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New analysis</span>
        </Link>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Status tabs */}
        <div className="flex gap-1 p-1 bg-surface-900 rounded-lg border border-white/[0.05] shrink-0">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-md transition-all",
                statusFilter === f.value
                  ? "bg-white/10 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename…"
            className="input text-xs pl-8 w-full"
          />
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-1.5 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-[58px] bg-surface-900 rounded-xl border border-white/[0.04]" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && analyses.length === 0 && (
        <div className="card border-dashed p-14 text-center">
          <div className="w-10 h-10 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Video className="w-4.5 h-4.5 text-brand-400" />
          </div>
          {debouncedSearch || statusFilter ? (
            <>
              <p className="text-sm font-medium text-white mb-1">No matches found</p>
              <p className="text-xs text-zinc-600">Try a different filter or search term</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-white mb-1">No analyses yet</p>
              <p className="text-xs text-zinc-600 mb-5">Upload your first video to get started</p>
              <Link href="/analyze" className="btn-primary text-xs px-4 py-2">
                <Plus className="w-3.5 h-3.5" />
                Analyze a video
              </Link>
            </>
          )}
        </div>
      )}

      {/* List */}
      {!isLoading && analyses.length > 0 && (
        <div className="space-y-1.5">
          {analyses.map((item) => (
            <div
              key={item.id}
              className="group flex items-center gap-3 px-4 py-3.5 rounded-xl border border-white/[0.06] hover:border-white/[0.12] hover:bg-surface-900 transition-all duration-150"
            >
              <div className="w-8 h-8 bg-brand-500/10 rounded-lg flex items-center justify-center shrink-0">
                <Video className="w-3.5 h-3.5 text-brand-400" />
              </div>

              <Link
                href={`/analyze?id=${item.id}`}
                className="flex-1 min-w-0 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 font-medium truncate">{item.filename}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-zinc-600">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </p>
                    {item.status === "failed" && item.error_message && item.error_message !== "Cancelled by user" && (
                      <span className="flex items-center gap-1 text-[11px] text-red-500">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[200px]">{item.error_message}</span>
                      </span>
                    )}
                    {item.status === "failed" && item.error_message === "Cancelled by user" && (
                      <span className="text-[11px] text-zinc-600">Cancelled</span>
                    )}
                  </div>
                </div>
                <ScorePill item={item} />
                <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 transition-colors shrink-0" />
              </Link>

              {/* Delete button */}
              <div className="shrink-0 flex items-center">
                {confirmDeleteId === item.id ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="text-[11px] text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 px-2 py-1 rounded-md transition-all disabled:opacity-40"
                    >
                      {deletingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Delete"}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-[11px] text-zinc-600 hover:text-zinc-400 px-2 py-1"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    aria-label="Delete analysis"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {!isLoading && hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 border border-white/[0.06] hover:border-white/[0.12] px-5 py-2.5 rounded-lg transition-all disabled:opacity-40"
          >
            {isLoadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {isLoadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
