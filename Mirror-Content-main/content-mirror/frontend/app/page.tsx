"use client";

import Link from "next/link";
import { ArrowRight, Zap, BarChart3, Lightbulb, Target } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Hook Analysis",
    description:
      "Know exactly why viewers stay or leave in the first 3 seconds. Score your hook from 0–100.",
  },
  {
    icon: BarChart3,
    title: "Pacing Intelligence",
    description:
      "Detect slow segments, silent gaps, and pacing issues that kill engagement mid-video.",
  },
  {
    icon: Lightbulb,
    title: "Causality Explanations",
    description:
      "Not just metrics — we explain the WHY. 'Weak hook because no motion + no curiosity trigger.'",
  },
  {
    icon: Target,
    title: "Benchmarking",
    description:
      "Compare against similar high-performing content. See exactly what they did differently.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-950 text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <span className="text-xl font-bold text-brand-500">Content Mirror</span>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
            Log in
          </Link>
          <Link
            href="/signup"
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="inline-block bg-brand-500/10 text-brand-500 text-xs font-medium px-3 py-1 rounded-full mb-6 border border-brand-500/20">
          AI-Powered Content Analysis
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
          Stop guessing why your{" "}
          <span className="text-brand-500">content fails</span>
        </h1>
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          Content Mirror analyzes your videos and tells you exactly why they perform the
          way they do — not just numbers, but real explanations you can act on.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-8 py-4 rounded-xl text-lg transition-colors"
        >
          Analyze your first video free
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-6">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="bg-surface-900 border border-white/10 rounded-2xl p-6 hover:border-brand-500/40 transition-colors"
            >
              <div className="w-10 h-10 bg-brand-500/10 rounded-lg flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-brand-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-gray-600 text-sm">
        © {new Date().getFullYear()} Content Mirror. Built for creators.
      </footer>
    </div>
  );
}
