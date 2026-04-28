"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

export function StatsOverview() {
  const { data: user } = useQuery<User>({
    queryKey: ["me"],
    queryFn: () => api.get("/users/me").then((r) => r.data),
  });

  const usagePct = user
    ? Math.round((user.analyses_used / user.analyses_limit) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-surface-900 border border-white/10 rounded-xl p-5">
        <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Analyses Used</p>
        <p className="text-3xl font-bold text-white">{user?.analyses_used ?? "—"}</p>
        <p className="text-gray-600 text-xs mt-1">of {user?.analyses_limit} this month</p>
        <div className="mt-3 bg-surface-800 rounded-full h-1.5">
          <div
            className="bg-brand-500 h-1.5 rounded-full transition-all"
            style={{ width: `${usagePct}%` }}
          />
        </div>
      </div>

      <div className="bg-surface-900 border border-white/10 rounded-xl p-5">
        <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Plan</p>
        <p className="text-3xl font-bold text-white capitalize">{user?.plan ?? "—"}</p>
        {user?.plan === "free" && (
          <a
            href="/settings"
            className="text-brand-500 text-xs mt-2 block hover:underline"
          >
            Upgrade to Pro →
          </a>
        )}
      </div>

      <div className="bg-surface-900 border border-white/10 rounded-xl p-5">
        <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Member Since</p>
        <p className="text-lg font-bold text-white">
          {user?.created_at
            ? new Date(user.created_at).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })
            : "—"}
        </p>
      </div>
    </div>
  );
}
