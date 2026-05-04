"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/lib/types";
import toast from "react-hot-toast";
import { User as UserIcon, CreditCard, Lock, LogOut, Trash2, Camera } from "lucide-react";
import { useRef } from "react";

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
  const [email, setEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.email) setEmail(user.email);
  }, [user?.name, user?.email]);

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

  const changeEmail = useMutation({
    mutationFn: (data: { new_email: string; current_password: string }) =>
      api.patch("/users/me/email", data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Email updated");
      setEmailPassword("");
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? "Failed to update email");
    },
  });

  const uploadAvatar = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return api.post("/users/me/avatar", form, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
    },
    onSuccess: () => {
      toast.success("Profile picture updated");
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: () => api.delete("/users/me"),
    onSuccess: () => {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    },
  });

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
          <button
            className="relative group shrink-0"
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadAvatar.isPending}
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Avatar" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-lg font-bold">
                {user?.name?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="w-4 h-4 text-white" />
            </div>
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar.mutate(f); }}
          />
          <div>
            <p className="text-sm font-semibold text-white">{user?.name}</p>
            <p className="text-xs text-zinc-500">{user?.email}</p>
            <p className="text-[11px] text-zinc-700 mt-0.5">Click avatar to change photo</p>
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
          <button
            type="submit"
            disabled={updateProfile.isPending || !name.trim() || name.trim() === user?.name}
            className="btn-primary text-xs px-4 py-2"
          >
            {updateProfile.isPending ? "Saving…" : "Save changes"}
          </button>
        </form>
      </Section>

      {/* Email */}
      <Section icon={UserIcon} title="Change Email">
        <form onSubmit={(e) => { e.preventDefault(); changeEmail.mutate({ new_email: email, current_password: emailPassword }); }} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">New email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Current password</label>
            <input
              type="password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={changeEmail.isPending || !email || !emailPassword || email === user?.email}
            className="btn-primary text-xs px-4 py-2"
          >
            {changeEmail.isPending ? "Saving…" : "Update email"}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        <div className="flex items-center justify-between mb-4">
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
        <div className="border-t border-white/[0.06] pt-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-400">Delete account</p>
            <p className="text-xs text-zinc-600 mt-0.5">Permanently delete your account and all data</p>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 px-3 py-2 rounded-lg transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </Section>

      {/* Delete account modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Delete account</p>
                <p className="text-xs text-zinc-500">This action is permanent and cannot be undone</p>
              </div>
            </div>
            <p className="text-xs text-zinc-400">
              Type <span className="font-mono text-white bg-surface-800 px-1.5 py-0.5 rounded">delete-my-account</span> to confirm
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="input"
              placeholder="delete-my-account"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }}
                className="btn-ghost text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteAccount.mutate()}
                disabled={deleteConfirmText !== "delete-my-account" || deleteAccount.isPending}
                className="flex items-center gap-2 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 px-4 py-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleteAccount.isPending ? "Deleting…" : "Permanently delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
