"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { Zap, TrendingUp } from "lucide-react";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/[0.06] ${className ?? ""}`} />;
}

export function StatsOverview() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["me"],
    queryFn: () => api.get("/users/me").then((r) => r.data),
  });

  const usagePct = user
    ? Math.min(Math.round((user.analyses_today / user.daily_limit) * 100), 100)
    : 0;

  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = circ - (usagePct / 100) * circ;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-5 flex items-center gap-4">
            <Skeleton className="w-14 h-14 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Daily usage */}
      <div className="card p-5 flex items-center gap-4">
        <div className="relative shrink-0 w-14 h-14">
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3.5" />
            <circle
              cx="28" cy="28" r={r}
              fill="none"
              stroke={usagePct >= 90 ? "#f87171" : "#6366f1"}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={dash}
              transform="rotate(-90 28 28)"
              style={{ transition: "stroke-dashoffset 0.8s ease" }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
            {usagePct}%
          </span>
        </div>
        <div>
          <p className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider mb-1">Today</p>
          <p className="text-2xl font-bold text-white leading-none">
            {user?.analyses_today}
            <span className="text-zinc-600 text-sm font-normal">/{user?.daily_limit}</span>
          </p>
          <p className="text-zinc-600 text-xs mt-1">analyses used</p>
        </div>
      </div>

      {/* Plan */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-brand-500/10 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-brand-400" />
          </div>
          <p className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Plan</p>
        </div>
        <p className="text-2xl font-bold text-white capitalize mb-1">{user?.plan}</p>
        {user?.plan === "free" ? (
          <p className="text-xs text-zinc-600">
            Upgrade for{" "}
            <a href="/settings" className="text-brand-400 hover:text-brand-300 transition-colors">
              100/day →
            </a>
          </p>
        ) : (
          <p className="text-xs text-emerald-500">100 analyses/day</p>
        )}
      </div>

      {/* Total */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider">All time</p>
        </div>
        <p className="text-2xl font-bold text-white mb-1">{user?.analyses_used}</p>
        <p className="text-xs text-zinc-600">
          since{" "}
          {user?.created_at
            ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
            : ""}
        </p>
      </div>
    </div>
  );
}
