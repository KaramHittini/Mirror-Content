"use client";

import { formatSeconds } from "@/lib/utils";
import type { WeakSection } from "@/lib/types";
import { CheckCircle, AlertCircle } from "lucide-react";

interface WeakSectionsTimelineProps {
  weakSections: WeakSection[];
  totalDuration: number;
}

export function WeakSectionsTimeline({ weakSections, totalDuration }: WeakSectionsTimelineProps) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Content Timeline</p>
        <div className="flex items-center gap-3 text-[11px] text-zinc-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40 inline-block" />
            Strong
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500/60 inline-block" />
            Weak
          </span>
        </div>
      </div>

      {/* Bar */}
      <div className="relative h-3 bg-surface-800 rounded-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/25 to-emerald-500/10 rounded-full" />
        {weakSections.map((section, i) => {
          const left = totalDuration > 0 ? (section.start_seconds / totalDuration) * 100 : 0;
          const width = totalDuration > 0
            ? ((section.end_seconds - section.start_seconds) / totalDuration) * 100
            : 0;
          return (
            <div
              key={i}
              className="absolute top-0 h-full bg-red-500/70 rounded-sm"
              style={{ left: `${left}%`, width: `${Math.max(width, 1.5)}%` }}
              title={section.reason}
            />
          );
        })}
      </div>

      {/* List */}
      {weakSections.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle className="w-4 h-4 shrink-0" />
          No major weak sections detected
        </div>
      ) : (
        <div className="space-y-2">
          {weakSections.map((section, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg px-3.5 py-3 bg-red-500/[0.04] border border-red-500/[0.15]">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-300 leading-relaxed">{section.reason}</p>
              </div>
              <span className="text-[11px] font-mono text-zinc-600 shrink-0 whitespace-nowrap">
                {formatSeconds(section.start_seconds)}–{formatSeconds(section.end_seconds)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
