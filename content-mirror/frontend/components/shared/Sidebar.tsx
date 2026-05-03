"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Plus, History, Settings, LogOut, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/analyze", icon: Plus, label: "New Analysis" },
  { href: "/history", icon: History, label: "History" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="w-60 border-r border-white/10 flex flex-col py-6 px-4 shrink-0 bg-surface-950">
      {/* Logo — always visible, uses explicit color so it never inherits */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 px-2 mb-8 group"
        style={{ color: "#4f6ef7" }}
      >
        <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-white" fill="white" />
        </div>
        <span className="text-[15px] font-bold tracking-tight text-brand-500">
          Content Mirror
        </span>
      </Link>

      <nav className="flex-1 space-y-0.5">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
              pathname === href
                ? "bg-brand-500/15 text-brand-400 shadow-[inset_0_0_0_1px_rgba(79,110,247,0.15)]"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <button
        onClick={logout}
        className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-colors w-full"
      >
        <LogOut className="w-4 h-4 shrink-0" />
        Sign out
      </button>
    </aside>
  );
}
