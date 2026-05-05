"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Zap, CheckCircle, XCircle, Loader2 } from "lucide-react";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) { setState("error"); return; }
    api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => setState("success"))
      .catch(() => setState("error"));
  }, [token]);

  return (
    <div className="text-center space-y-4">
      {state === "loading" && (
        <>
          <Loader2 className="w-10 h-10 mx-auto text-brand-400 animate-spin" />
          <p className="text-sm text-zinc-400">Verifying your email…</p>
        </>
      )}
      {state === "success" && (
        <>
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Email verified!</h1>
          <p className="text-sm text-zinc-500">Your account is now fully verified.</p>
          <Link href="/dashboard" className="inline-block mt-4 btn-primary text-sm px-5 py-2">
            Go to dashboard
          </Link>
        </>
      )}
      {state === "error" && (
        <>
          <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <XCircle className="w-6 h-6 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Link invalid or expired</h1>
          <p className="text-sm text-zinc-500">This verification link has expired or already been used.</p>
          <Link href="/dashboard" className="inline-block mt-4 text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Go to dashboard and resend
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm animate-fade-in">
        <Link href="/" className="flex items-center gap-2 justify-center mb-10">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="font-semibold text-white">Content Mirror</span>
        </Link>
        <Suspense fallback={<Loader2 className="w-8 h-8 mx-auto text-brand-400 animate-spin" />}>
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  );
}
