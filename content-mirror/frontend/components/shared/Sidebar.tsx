"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Plus, History, Settings, LogOut, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/analyze", icon: Plus, label: "New Analysis" },
  { href: "/history", icon: History, label: "History" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { data: user } = useQuery<User>({
    queryKey: ["me"],
    queryFn: () => api.get("/users/me").then((r) => r.data),
  });

  return (
    <aside className="w-[220px] shrink-0 h-full flex flex-col border-r border-white/[0.06] bg-surface-950">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center shadow-glow-sm group-hover:shadow-glow transition-shadow">
            <Zap className="w-3.5 h-3.5 text-white" fill="white" />
          </div>
          <span className="text-sm font-semibold text-white">Content Mirror</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150",
                active
                  ? "bg-brand-500/[0.12] text-brand-400 font-medium"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] font-normal"
              )}
            >
              <Icon
                className={cn("w-4 h-4 shrink-0", active ? "text-brand-400" : "text-zinc-600")}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom — plan + sign out */}
      <div className="px-3 pb-4 space-y-1 border-t border-white/[0.06] pt-3">
        {user && (
          <div className="px-3 py-2.5 mb-1">
            <p className="text-xs font-medium text-zinc-300 truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn(
                "text-[11px] font-medium px-1.5 py-0.5 rounded-full capitalize",
                user.plan === "pro"
                  ? "bg-brand-500/15 text-brand-400"
                  : "bg-zinc-800 text-zinc-500"
              )}>
                {user.plan}
              </span>
              <span className="text-[11px] text-zinc-600">
                {user.analyses_today}/{user.daily_limit} today
              </span>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-zinc-600 hover:text-red-400 hover:bg-red-500/[0.06] transition-all duration-150"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
