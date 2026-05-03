"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { TrendingUp, Zap, CalendarDays } from "lucide-react";

export function StatsOverview() {
  const { data: user } = useQuery<User>({
    queryKey: ["me"],
    queryFn: () => api.get("/users/me").then((r) => r.data),
  });

  const usagePct = user
    ? Math.min(Math.round((user.analyses_today / user.daily_limit) * 100), 100)
    : 0;

  const circumference = 2 * Math.PI * 18; // r=18
  const dashOffset = circumference - (usagePct / 100) * circumference;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Daily usage — ring progress */}
      <div className="bg-surface-900 border border-white/10 rounded-xl p-5 flex items-center gap-5">
        <div className="relative shrink-0">
          <svg width="52" height="52" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="18" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
            <circle
              cx="26" cy="26" r="18"
              fill="none"
              stroke={usagePct >= 90 ? "#ef4444" : "#4f6ef7"}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 26 26)"
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
            {usagePct}%
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-0.5">
            Today&apos;s Usage
          </p>
          <p className="text-2xl font-bold text-white leading-none">
            {user?.analyses_today ?? "—"}
            <span className="text-gray-600 text-sm font-normal ml-1">/ {user?.daily_limit}</span>
          </p>
          <p className="text-gray-600 text-xs mt-1">resets at midnight</p>
        </div>
      </div>

      {/* Plan */}
      <div className="bg-surface-900 border border-white/10 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-brand-500/15 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-brand-500" />
          </div>
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Plan</p>
        </div>
        <p className="text-2xl font-bold text-white capitalize">{user?.plan ?? "—"}</p>
        {user?.plan === "free" ? (
          <p className="text-gray-500 text-xs mt-1.5">
            100 analyses/day with{" "}
            <a href="/settings" className="text-brand-500 hover:underline">Pro</a>
          </p>
        ) : (
          <p className="text-green-400 text-xs mt-1.5">100 analyses/day</p>
        )}
      </div>

      {/* Total analyses */}
      <div className="bg-surface-900 border border-white/10 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
          </div>
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Total Run</p>
        </div>
        <p className="text-2xl font-bold text-white">{user?.analyses_used ?? "—"}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <CalendarDays className="w-3 h-3 text-gray-600" />
          <p className="text-gray-600 text-xs">
            since{" "}
            {user?.created_at
              ? new Date(user.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })
              : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
