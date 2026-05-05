"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { Zap, TrendingUp } from "lucide-react";
import Link from "next/link";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className ?? ""}`} />;
}

export function StatsOverview() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["me"],
    queryFn: () => api.get("/users/me").then((r) => r.data),
  });

  const usagePct = user
    ? Math.min(Math.round((user.analyses_today / user.daily_limit) * 100), 100)
    : 0;

  const r = 26;
  const circ = 2 * Math.PI * r;
  const dash = circ - (usagePct / 100) * circ;
  const ringColor = usagePct >= 90 ? "#f87171" : "#6366f1";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] ?? "";

  if (isLoading) {
    return (
      <div data-testid="stats-loading" className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const remaining = (user?.daily_limit ?? 0) - (user?.analyses_today ?? 0);

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {greeting}{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Here&apos;s an overview of your content analysis activity.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

        {/* Daily usage */}
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/[0.08] via-transparent to-transparent pointer-events-none" />
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-4">
            Today&apos;s Usage
          </p>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0 w-16 h-16">
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4.5" />
                <circle
                  cx="32" cy="32" r={r}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={dash}
                  transform="rotate(-90 32 32)"
                  style={{ transition: "stroke-dashoffset 0.8s ease" }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                {usagePct}%
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-1 leading-none mb-1">
                <span className="text-3xl font-bold text-white">{user?.analyses_today}</span>
                <span className="text-zinc-500 text-sm">/ {user?.daily_limit}</span>
              </div>
              <p className="text-xs text-zinc-500">used today</p>
              <p className={`text-xs mt-1 font-medium ${remaining === 0 ? "text-red-400" : "text-zinc-600"}`}>
                {remaining} remaining
              </p>
            </div>
          </div>
        </div>

        {/* Plan */}
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.06] via-transparent to-transparent pointer-events-none" />
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-4">
            Current Plan
          </p>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-brand-500/15 border border-brand-500/20 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-brand-400" fill="currentColor" />
            </div>
            <span className="text-2xl font-bold text-white capitalize">{user?.plan}</span>
          </div>
          {user?.plan === "free" ? (
            <Link
              href="/settings"
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium"
            >
              Upgrade for 100/day →
            </Link>
          ) : (
            <p className="text-xs text-emerald-400 font-medium">100 analyses per day</p>
          )}
        </div>

        {/* All time */}
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.06] via-transparent to-transparent pointer-events-none" />
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-4">
            All Time
          </p>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-3xl font-bold text-white">{user?.analyses_used}</span>
          </div>
          <p className="text-xs text-zinc-500">
            videos analysed since{" "}
            {user?.created_at
              ? new Date(user.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })
              : ""}
          </p>
        </div>

      </div>
    </div>
  );
}
