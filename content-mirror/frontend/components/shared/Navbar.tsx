"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/analyze": "Analyze",
  "/history": "History",
  "/settings": "Settings",
};

export function Navbar() {
  const pathname = usePathname();
  const { data: user } = useQuery<User>({
    queryKey: ["me"],
    queryFn: () => api.get("/users/me").then((r) => r.data),
  });

  const title = PAGE_TITLES[pathname] ?? "";

  return (
    <header className="h-14 flex items-center px-6 gap-4 shrink-0 bg-surface-950">
      <p className="text-lg font-bold text-white flex-1">{title}</p>

      {user && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-600 hidden sm:block">
            {user.analyses_today}/{user.daily_limit} today
          </span>
          <Link
            href="/settings"
            title="Settings"
            className="w-10 h-10 rounded-full bg-brand-500/20 hover:bg-brand-500/35 flex items-center justify-center text-brand-400 text-sm font-bold transition-all ring-2 ring-transparent hover:ring-brand-500/25 overflow-hidden shrink-0"
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              user.name[0].toUpperCase()
            )}
          </Link>
        </div>
      )}
    </header>
  );
}
