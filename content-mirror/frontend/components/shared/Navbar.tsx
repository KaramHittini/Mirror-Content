"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

export function Navbar() {
  const { data: user } = useQuery<User>({
    queryKey: ["me"],
    queryFn: () => api.get("/users/me").then((r) => r.data),
  });

  return (
    <header className="h-14 border-b border-white/10 flex items-center justify-end px-6 gap-4">
      {user && (
        <>
          <div className="text-right">
            <p className="text-white text-sm font-medium">{user.name}</p>
            <p className="text-gray-500 text-xs">
              {user.analyses_today}/{user.daily_limit} today
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 text-sm font-bold">
            {user.name[0].toUpperCase()}
          </div>
        </>
      )}
    </header>
  );
}
