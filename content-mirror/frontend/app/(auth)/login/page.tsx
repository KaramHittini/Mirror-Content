"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import { tokenStore } from "@/lib/tokenStore";
import { Zap } from "lucide-react";

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (tokenStore.get()) { router.replace("/dashboard"); return; }
    axios.post("/api/auth/refresh", {}, { withCredentials: true })
      .then(({ data }) => { tokenStore.set(data.access_token); router.replace("/dashboard"); })
      .catch(() => {});
  }, [router]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-[480px] shrink-0 flex-col p-12 border-r border-white/[0.06] gap-14">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="font-semibold text-white text-sm">Content Mirror</span>
        </Link>

        <div className="flex-1 flex flex-col justify-center gap-10">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              The feedback loop every creator is missing.
            </h2>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Upload a video. Get a full breakdown of what&apos;s hurting your hook,
              pacing, and retention — and exactly how to fix it.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Hook Score", desc: "0–10 rating for your opening seconds" },
              { label: "Pacing Analysis", desc: "Detect slow segments automatically" },
              { label: "Audio Quality", desc: "WPM, filler words & clarity check" },
              { label: "Visual Score", desc: "Sharpness, brightness & face detection" },
            ].map(({ label, desc }) => (
              <div key={label} className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                <p className="text-white text-sm font-semibold mb-1">{label}</p>
                <p className="text-zinc-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-zinc-300 text-base font-medium leading-snug mb-3">
            &ldquo;I went from 2% to 12% watch time in two weeks just by fixing what
            Content Mirror flagged.&rdquo;
          </p>
          <p className="text-zinc-600 text-sm">— TikTok creator, 180k followers</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 justify-center mb-10 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" fill="white" />
            </div>
            <span className="font-semibold text-white">Content Mirror</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
            <p className="text-zinc-500 text-sm">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input"
                placeholder="••••••••"
              />
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full mt-2">
              {isLoading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-6 space-y-3 text-center">
            <Link href="/forgot-password" className="block text-sm text-zinc-600 hover:text-zinc-400 transition-colors">
              Forgot your password?
            </Link>
            <p className="text-sm text-zinc-600">
              No account?{" "}
              <Link href="/signup" className="text-brand-400 hover:text-brand-300 transition-colors">
                Create one free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
