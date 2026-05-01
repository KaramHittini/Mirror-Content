"use client";

import { formatSeconds } from "@/lib/utils";
import type { WeakSection } from "@/lib/types";

interface WeakSectionsTimelineProps {
  weakSections: WeakSection[];
  totalDuration: number;
}

export function WeakSectionsTimeline({
  weakSections,
  totalDuration,
}: WeakSectionsTimelineProps) {
  return (
    <div className="bg-surface-900 border border-white/10 rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4">Content Timeline</h3>

      {/* Visual timeline bar */}
      <div className="relative h-4 bg-surface-800 rounded-full overflow-hidden mb-4">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/40 via-green-500/20 to-green-500/10 rounded-full" />
        {weakSections.map((section, i) => {
          const left = (section.start_seconds / totalDuration) * 100;
          const width =
            ((section.end_seconds - section.start_seconds) / totalDuration) * 100;
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

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-5">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-green-500/40 inline-block" />
          Strong sections
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-red-500/70 inline-block" />
          Weak sections
        </span>
      </div>

      {/* Weak section list */}
      {weakSections.length === 0 ? (
        <p className="text-green-400 text-sm">No major weak sections detected.</p>
      ) : (
        <div className="space-y-2">
          {weakSections.map((section, i) => (
            <div
              key={i}
              className="flex items-start gap-3 bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3"
            >
              <span className="text-red-400 font-mono text-xs mt-0.5 shrink-0">
                {formatSeconds(section.start_seconds)} —{" "}
                {formatSeconds(section.end_seconds)}
              </span>
              <p className="text-gray-300 text-sm">{section.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
