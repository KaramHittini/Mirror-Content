"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/lib/types";
import toast from "react-hot-toast";
import { User as UserIcon, CreditCard, Lock, LogOut } from "lucide-react";

function Section({ icon: Icon, title, children }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
        <Icon className="w-4 h-4 text-zinc-500" />
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { logout } = useAuth();
  const qc = useQueryClient();

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["me"],
    queryFn: () => api.get("/users/me").then((r) => r.data),
  });

  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  const changePassword = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      api.patch("/users/me/password", data),
    onSuccess: () => {
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? "Failed to update password");
    },
  });

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && name.trim() !== user?.name) {
      updateProfile.mutate({ name: name.trim() });
    }
  };

  const handlePasswordSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    changePassword.mutate({ current_password: currentPassword, new_password: newPassword });
  };

  const usagePct = user
    ? Math.min(Math.round((user.analyses_today / user.daily_limit) * 100), 100)
    : 0;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-3 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 bg-surface-900 rounded-xl border border-white/[0.06]" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
      {/* Profile */}
      <Section icon={UserIcon} title="Profile">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-lg font-bold shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{user?.name}</p>
            <p className="text-xs text-zinc-600">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Display name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Email</label>
            <input
              type="email"
              value={user?.email ?? ""}
              disabled
              className="input opacity-40 cursor-not-allowed"
            />
          </div>
          <button
            type="submit"
            disabled={updateProfile.isPending || !name.trim() || name.trim() === user?.name}
            className="btn-primary text-xs px-4 py-2"
          >
            {updateProfile.isPending ? "Saving…" : "Save changes"}
          </button>
        </form>
      </Section>

      {/* Password */}
      <Section icon={Lock} title="Change Password">
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input"
                placeholder="Min 8 characters"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={changePassword.isPending || !currentPassword || newPassword.length < 8 || !confirmPassword}
            className="btn-primary text-xs px-4 py-2"
          >
            {changePassword.isPending ? "Saving…" : "Update password"}
          </button>
        </form>
      </Section>

      {/* Plan & Usage */}
      <Section icon={CreditCard} title="Plan & Usage">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-base font-bold text-white capitalize">{user?.plan}</p>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize ${
                user?.plan === "pro"
                  ? "bg-brand-500/10 text-brand-400 border-brand-500/20"
                  : "bg-zinc-800 text-zinc-500 border-zinc-700"
              }`}>
                {user?.plan === "pro" ? "Active" : "Free"}
              </span>
            </div>
            <p className="text-xs text-zinc-600">
              {user?.analyses_today} / {user?.daily_limit} analyses used today
            </p>
          </div>
          {user?.plan === "free" && (
            <button
              disabled
              className="text-xs border border-brand-500/20 text-brand-400 px-3 py-1.5 rounded-lg opacity-50 cursor-not-allowed"
            >
              Upgrade to Pro
            </button>
          )}
        </div>
        <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
          <div
            className={`h-1.5 rounded-full transition-all ${usagePct >= 90 ? "bg-red-500" : "bg-brand-500"}`}
            style={{ width: `${usagePct}%` }}
          />
        </div>
        <p className="text-[11px] text-zinc-700 mt-2">
          {usagePct >= 90 ? "Almost at your daily limit." : `${100 - usagePct}% remaining today.`}
          {user?.plan === "free" ? " Pro plan gives you 100/day." : " Resets at midnight."}
        </p>
      </Section>

      {/* Account / Danger zone */}
      <Section icon={LogOut} title="Account">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Sign out</p>
            <p className="text-xs text-zinc-600 mt-0.5">
              Member since{" "}
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                : "—"}
            </p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 px-3 py-2 rounded-lg transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </Section>
    </div>
  );
}
