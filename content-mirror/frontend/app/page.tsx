"use client";

import Link from "next/link";
import { ArrowRight, Zap, BarChart3, Lightbulb, Target, CheckCircle } from "lucide-react";
import Aurora from "@/components/shared/Aurora";

const features = [
  {
    icon: Zap,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    title: "Hook Analysis",
    description: "Score your hook 0–10 and learn exactly why viewers drop off in the first 3 seconds.",
  },
  {
    icon: BarChart3,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    title: "Pacing Intelligence",
    description: "Detect slow segments, silent gaps, and pacing issues that quietly kill your retention.",
  },
  {
    icon: Lightbulb,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    title: "Causality Insights",
    description: "Not just metrics — real explanations. 'Weak hook: no motion + no curiosity trigger in frame 1.'",
  },
  {
    icon: Target,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    title: "Benchmarking",
    description: "See similar high-performing content and exactly what they did that your video didn't.",
  },
];

const proofPoints = [
  "Analyzes audio, visual, and structure simultaneously",
  "Actionable fixes, not just scores",
  "5 free analyses per day — no credit card required",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-950 text-white flex flex-col">
      {/* Nav */}
      <header className="border-b border-white/[0.06] sticky top-0 z-50 backdrop-blur-md bg-surface-950/80">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-brand-500 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" fill="white" />
            </div>
            <span className="text-sm font-semibold text-white">Content Mirror</span>
          </div>
          <nav className="flex items-center gap-1">
            <Link
              href="/login"
              className="text-sm text-zinc-400 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-all"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="btn-primary text-sm px-4 py-2"
            >
              Get started free
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-28 relative overflow-hidden">
        <Aurora
          colorStops={["#4f46e5", "#7c3aed", "#a78bfa"]}
          amplitude={1.1}
          speed={0.7}
        />
        <div className="relative z-10 flex flex-col items-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 bg-brand-500/10 text-brand-400 text-xs font-medium px-3 py-1.5 rounded-full mb-8 border border-brand-500/20">
            <Zap className="w-3 h-3" fill="currentColor" />
            AI-powered video analysis
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.08] mb-6 max-w-4xl">
            Know exactly why your{" "}
            <span className="bg-gradient-to-r from-brand-400 to-violet-400 bg-clip-text text-transparent">
              content fails
            </span>
          </h1>

          <p className="text-lg text-zinc-400 max-w-xl mb-10 leading-relaxed">
            Upload any video and get a full breakdown — hook strength, pacing, audio quality,
            and actionable fixes you can apply today.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-12">
            <Link href="/signup" className="btn-primary text-base px-6 py-3">
              Analyze your first video free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="btn-ghost text-base px-6 py-3">
              Sign in
            </Link>
          </div>

          {/* Proof points */}
          <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-zinc-500">
            {proofPoints.map((pt) => (
              <span key={pt} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                {pt}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto w-full px-6 pb-28">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-8">
          What you get
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {features.map(({ icon: Icon, color, bg, title, description }) => (
            <div
              key={title}
              className="card p-6 hover:border-white/[0.12] transition-all duration-200 group"
            >
              <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center mb-4`}>
                <Icon className={`w-4.5 h-4.5 ${color}`} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="max-w-5xl mx-auto w-full px-6 pb-20">
        <div className="card p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-violet-500/5 pointer-events-none" />
          <h2 className="text-2xl font-bold mb-3">Ready to stop guessing?</h2>
          <p className="text-zinc-400 text-sm mb-6">
            Start for free. 5 analyses per day, no credit card needed.
          </p>
          <Link href="/signup" className="btn-primary">
            Create free account
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-6 text-center text-xs text-zinc-700">
        © {new Date().getFullYear()} Content Mirror · Built for creators
      </footer>
    </div>
  );
}
