"use client";

import { ScoreCard } from "./ScoreCard";
import { WeakSectionsTimeline } from "./WeakSectionsTimeline";
import { RecommendationsPanel } from "./RecommendationsPanel";
import { severityColor, formatSeconds } from "@/lib/utils";
import type { AnalysisResult } from "@/lib/types";
import { Download, RotateCcw, AlertTriangle, CheckCircle, ExternalLink, Loader2 } from "lucide-react";
import { exportReport } from "@/lib/api";
import { useState } from "react";
import toast from "react-hot-toast";

interface AnalysisResultsProps {
  result: AnalysisResult;
  onNewAnalysis: () => void;
}

export function AnalysisResults({ result, onNewAnalysis }: AnalysisResultsProps) {
  const [exporting, setExporting] = useState<"pdf" | "json" | null>(null);

  const handleExport = async (format: "pdf" | "json") => {
    if (exporting) return;
    setExporting(format);
    try {
      const blob = await exportReport(result.id, format);
      const url = URL.createObjectURL(blob.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `content-mirror-${result.id}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">Analysis complete</p>
          <p className="text-sm text-zinc-400 truncate max-w-sm">{result.filename}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleExport("pdf")}
            disabled={!!exporting}
            className="btn-ghost text-xs px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exporting === "pdf" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            PDF
          </button>
          <button
            onClick={() => handleExport("json")}
            disabled={!!exporting}
            className="btn-ghost text-xs px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exporting === "json" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            JSON
          </button>
          <button onClick={onNewAnalysis} className="btn-primary text-xs px-3 py-2">
            <RotateCcw className="w-3.5 h-3.5" />
            New analysis
          </button>
        </div>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ScoreCard
          label="Hook Score"
          value={result.hook_score ?? null}
          type="score"
          subtext={result.hook_duration_seconds ? `${result.hook_duration_seconds}s hook` : undefined}
        />
        <ScoreCard label="Pacing" value={result.pacing} type="text" />
        <ScoreCard label="Audio" value={result.audio_quality} type="quality" />
        <ScoreCard label="Visual" value={result.image_quality} type="quality" />
      </div>

      {/* Insights */}
      {result.insights.length > 0 && (
        <div className="card p-5 space-y-3">
          <p className="text-sm font-semibold text-white">Key Insights</p>
          <div className="space-y-2">
            {result.insights.map((insight) => (
              <div
                key={insight.id}
                className={`rounded-xl border p-4 ${severityColor(insight.severity)}`}
              >
                <div className="flex items-start gap-3">
                  {insight.severity === "high" ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white leading-tight">{insight.problem}</p>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                      <span className="text-zinc-600">Why: </span>{insight.cause}
                    </p>
                    {insight.evidence && (
                      <p className="text-[11px] text-zinc-700 mt-1 italic">{insight.evidence}</p>
                    )}
                    {insight.timestamp_seconds !== undefined && (
                      <span className="text-[11px] font-mono text-brand-400 mt-1 block">
                        @ {formatSeconds(insight.timestamp_seconds)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <WeakSectionsTimeline
        weakSections={result.weak_sections ?? []}
        totalDuration={result.hook_duration_seconds ? result.hook_duration_seconds * 10 : 60}
      />

      {/* Recommendations */}
      <RecommendationsPanel recommendations={result.recommendations ?? []} />

      {/* Similar content */}
      {result.similar_content?.length > 0 && (
        <div className="card p-5 space-y-4">
          <p className="text-sm font-semibold text-white">Similar Successful Content</p>
          <div className="space-y-2">
            {result.similar_content.map((item, i) => (
              <div key={i} className="rounded-xl border border-white/[0.06] bg-surface-800 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-medium text-white flex-1 min-w-0">{item.title}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-surface-700 text-zinc-400 capitalize border border-white/[0.06]">
                      {item.platform}
                    </span>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-zinc-400">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
                <p className="text-xs text-emerald-400 mb-1">✓ {item.why_successful}</p>
                <p className="text-xs text-zinc-600">{item.key_differences}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
