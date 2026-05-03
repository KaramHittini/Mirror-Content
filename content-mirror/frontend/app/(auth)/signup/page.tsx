"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Zap, CheckCircle } from "lucide-react";

const perks = [
  "5 free video analyses per day",
  "Hook score, pacing, audio & visual quality",
  "Actionable recommendations with examples",
  "Compare against top-performing content",
];

export default function SignupPage() {
  const { register, isLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await register(name, email, password);
  };

  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Left panel — value prop */}
      <div className="hidden lg:flex w-[420px] shrink-0 flex-col justify-between p-10 border-r border-white/[0.06]">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="font-semibold text-white text-sm">Content Mirror</span>
        </Link>

        <div>
          <h2 className="text-xl font-bold text-white mb-6 leading-snug">
            Stop posting and hoping.
            <br />
            <span className="text-zinc-400 font-normal">Start knowing what works.</span>
          </h2>
          <ul className="space-y-3">
            {perks.map((perk) => (
              <li key={perk} className="flex items-start gap-3 text-sm text-zinc-400">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                {perk}
              </li>
            ))}
          </ul>
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
            <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
            <p className="text-zinc-500 text-sm">Free forever · No credit card needed</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="input"
                placeholder="Your name"
              />
            </div>

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
                minLength={8}
                className="input"
                placeholder="Min. 8 characters"
              />
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full mt-2">
              {isLoading ? "Creating account…" : "Create free account"}
            </button>
          </form>

          <p className="text-center text-sm text-zinc-600 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-brand-400 hover:text-brand-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
