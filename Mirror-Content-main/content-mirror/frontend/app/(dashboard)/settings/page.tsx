"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/lib/types";
import toast from "react-hot-toast";
import { User as UserIcon, CreditCard, Shield, LogOut } from "lucide-react";

export default function SettingsPage() {
  const { logout } = useAuth();
  const qc = useQueryClient();

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["me"],
    queryFn: () => api.get("/users/me").then((r) => r.data),
  });

  const [name, setName] = useState("");

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  const updateProfile = useMutation({
    mutationFn: (data: { name: string }) =>
      api.patch("/users/me", data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && name.trim() !== user?.name) {
      updateProfile.mutate({ name: name.trim() });
    }
  };

  const usagePct = user
    ? Math.min(Math.round((user.analyses_used / user.analyses_limit) * 100), 100)
    : 0;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-36 bg-surface-900 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* ── Profile ──────────────────────────────────────────────────── */}
      <section className="bg-surface-900 border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <UserIcon className="w-5 h-5 text-brand-500" />
          <h2 className="text-white font-semibold">Profile</h2>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 text-2xl font-bold shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="text-white font-medium">{user?.name}</p>
            <p className="text-gray-500 text-sm">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Display name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-800 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={user?.email ?? ""}
              disabled
              className="w-full bg-surface-800/50 border border-white/5 rounded-lg px-4 py-2.5 text-gray-500 text-sm cursor-not-allowed"
            />
            <p className="text-gray-600 text-xs mt-1">Email cannot be changed.</p>
          </div>

          <button
            type="submit"
            disabled={updateProfile.isPending || !name.trim() || name.trim() === user?.name}
            className="bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {updateProfile.isPending ? "Saving..." : "Save changes"}
          </button>
        </form>
      </section>

      {/* ── Plan & Usage ─────────────────────────────────────────────── */}
      <section className="bg-surface-900 border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="w-5 h-5 text-brand-500" />
          <h2 className="text-white font-semibold">Plan & Usage</h2>
        </div>

        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-medium capitalize">{user?.plan}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  user?.plan === "pro"
                    ? "bg-brand-500/10 text-brand-500 border border-brand-500/20"
                    : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                }`}
              >
                {user?.plan === "pro" ? "Pro" : "Free"}
              </span>
            </div>
            <p className="text-gray-500 text-sm">
              {user?.analyses_used} / {user?.analyses_limit} analyses used this month
            </p>
          </div>

          {user?.plan === "free" && (
            <button
              disabled
              title="Coming soon"
              className="bg-brand-500/10 text-brand-500 border border-brand-500/30 text-sm font-medium px-4 py-2 rounded-lg opacity-60 cursor-not-allowed"
            >
              Upgrade to Pro
            </button>
          )}
        </div>

        <div className="bg-surface-800 rounded-full h-2 mb-2">
          <div
            className={`h-2 rounded-full transition-all ${
              usagePct >= 90 ? "bg-red-500" : "bg-brand-500"
            }`}
            style={{ width: `${usagePct}%` }}
          />
        </div>
        <p className="text-gray-600 text-xs">
          {usagePct >= 90
            ? "You're almost at your limit. "
            : `${100 - usagePct}% remaining. `}
          {user?.plan === "free"
            ? "Upgrade to Pro for 100 analyses/month."
            : "Resets at the start of each month."}
        </p>
      </section>

      {/* ── Account ──────────────────────────────────────────────────── */}
      <section className="bg-surface-900 border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-brand-500" />
          <h2 className="text-white font-semibold">Account</h2>
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-white text-sm font-medium">Member since</p>
            <p className="text-gray-500 text-xs">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </div>
        </div>

        <div className="border-t border-white/5 pt-4 flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium">Sign out</p>
            <p className="text-gray-500 text-xs">You can always sign back in</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 px-3 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </section>
    </div>
  );
}
