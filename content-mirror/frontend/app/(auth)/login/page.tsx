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
      <div className="hidden lg:flex w-[420px] shrink-0 flex-col justify-between p-10 border-r border-white/[0.06]">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="font-semibold text-white text-sm">Content Mirror</span>
        </Link>

        <div>
          <blockquote className="text-zinc-300 text-lg font-medium leading-snug mb-4">
            &ldquo;I went from 2% to 12% watch time in two weeks just by fixing what
            Content Mirror flagged.&rdquo;
          </blockquote>
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

          <p className="text-center text-sm text-zinc-600 mt-6">
            No account?{" "}
            <Link href="/signup" className="text-brand-400 hover:text-brand-300 transition-colors">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
