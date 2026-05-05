"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import { tokenStore } from "@/lib/tokenStore";
import { Zap, CheckCircle } from "lucide-react";

const perks = [
  "5 free video analyses per day",
  "Hook score, pacing, audio & visual quality",
  "Actionable recommendations with examples",
  "Compare against top-performing content",
];

export default function SignupPage() {
  const { register, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (tokenStore.get()) { router.replace("/dashboard"); return; }
    axios.post("/api/auth/refresh", {}, { withCredentials: true })
      .then(({ data }) => { tokenStore.set(data.access_token); router.replace("/dashboard"); })
      .catch(() => {});
  }, [router]);
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
              Stop posting and hoping.{" "}
              <span className="text-brand-400">Start knowing what works.</span>
            </h2>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Every video you post is a data point. Content Mirror reads that data so
              you know exactly what to change next time.
            </p>
          </div>

          <ul className="space-y-4">
            {perks.map((perk) => (
              <li key={perk} className="flex items-start gap-3 text-base text-zinc-300">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                {perk}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-zinc-300 text-base font-medium leading-snug mb-3">
            &ldquo;Finally — feedback that actually tells me why my videos tank,
            not just that they do.&rdquo;
          </p>
          <p className="text-zinc-600 text-sm">— YouTube creator, 42k subscribers</p>
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
