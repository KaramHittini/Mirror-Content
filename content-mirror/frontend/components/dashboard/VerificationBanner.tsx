"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, resendVerification } from "@/lib/api";
import type { User } from "@/lib/types";
import { Mail, X } from "lucide-react";
import toast from "react-hot-toast";

export function VerificationBanner() {
  const { data: user } = useQuery<User>({
    queryKey: ["me"],
    queryFn: () => api.get("/users/me").then((r) => r.data),
  });
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);

  if (!user || user.email_verified || dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      await resendVerification();
      toast.success("Verification email sent — check your inbox.");
    } catch {
      toast.error("Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center gap-3">
      <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <p className="text-xs text-amber-300 flex-1">
        Please verify your email address.{" "}
        <button
          onClick={handleResend}
          disabled={sending}
          className="underline hover:text-amber-200 transition-colors disabled:opacity-50"
        >
          {sending ? "Sending…" : "Resend email"}
        </button>
      </p>
      <button onClick={() => setDismissed(true)} className="text-amber-600 hover:text-amber-400 transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
