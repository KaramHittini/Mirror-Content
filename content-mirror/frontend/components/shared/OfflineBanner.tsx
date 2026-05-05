"use client";

import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center gap-2.5"
    >
      <WifiOff className="w-3.5 h-3.5 text-red-400 shrink-0" />
      <p className="text-xs text-red-300">
        You&rsquo;re offline — changes won&rsquo;t be saved until you reconnect.
      </p>
    </div>
  );
}
