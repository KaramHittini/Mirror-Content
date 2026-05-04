"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/lib/api";
import { Zap, ArrowLeft, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm animate-fade-in">
        <Link href="/" className="flex items-center gap-2 justify-center mb-10">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="font-semibold text-white">Content Mirror</span>
        </Link>

        {submitted ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Check your email</h1>
            <p className="text-sm text-zinc-500">
              If <span className="text-zinc-300">{email}</span> is registered, you'll receive a reset link within a few minutes.
            </p>
            <Link href="/login" className="inline-flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition-colors mt-4">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-1">Forgot your password?</h1>
              <p className="text-zinc-500 text-sm">Enter your email and we'll send you a reset link.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input"
                  placeholder="you@example.com"
                  autoFocus
                />
              </div>
              <button type="submit" disabled={isLoading || !email} className="btn-primary w-full mt-2">
                {isLoading ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <p className="text-center text-sm text-zinc-600 mt-6">
              <Link href="/login" className="inline-flex items-center gap-1.5 text-brand-400 hover:text-brand-300 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
