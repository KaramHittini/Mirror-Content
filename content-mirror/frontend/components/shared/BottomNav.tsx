"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Plus, History, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/analyze", icon: Plus, label: "Analyze" },
  { href: "/history", icon: History, label: "History" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-surface-950/95 backdrop-blur-md border-t border-white/[0.06]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={cn(
                "flex items-center justify-center w-16 h-full transition-transform duration-100 active:scale-75",
                active ? "text-brand-400" : "text-zinc-600"
              )}
            >
              <div className={cn(
                "w-11 h-11 flex items-center justify-center rounded-2xl transition-all duration-150",
                active ? "bg-brand-500/15" : ""
              )}>
                <Icon className="w-5 h-5" />
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
