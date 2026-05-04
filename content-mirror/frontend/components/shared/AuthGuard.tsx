"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import axios from "axios";
import { tokenStore } from "@/lib/tokenStore";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Already have a token in memory (same-tab navigation)
    if (tokenStore.get()) {
      setReady(true);
      return;
    }

    // Cold load — try to restore via the httpOnly refresh cookie
    axios
      .post("/api/auth/refresh", {}, { withCredentials: true })
      .then(({ data }) => {
        tokenStore.set(data.access_token);
        setReady(true);
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [router]);

  if (!ready) {
    return (
      <div className="h-screen bg-surface-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
