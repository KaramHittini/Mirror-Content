"use client";

import { ScoreCard } from "./ScoreCard";
import { WeakSectionsTimeline } from "./WeakSectionsTimeline";
import { RecommendationsPanel } from "./RecommendationsPanel";
import { severityColor, formatSeconds } from "@/lib/utils";
import type { AnalysisResult } from "@/lib/types";
import { Download, RotateCcw, AlertTriangle, CheckCircle } from "lucide-react";
import { exportReport } from "@/lib/api";

interface AnalysisResultsProps {
  result: AnalysisResult;
  onNewAnalysis: () => void;
}

export function AnalysisResults({ result, onNewAnalysis }: AnalysisResultsProps) {
  const handleExport = async (format: "pdf" | "json") => {
    const blob = await exportReport(result.id, format);
    const url = URL.createObjectURL(blob.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `content-mirror-report-${result.id}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-lg">Analysis Complete</h2>
          <p className="text-gray-500 text-sm truncate max-w-sm">{result.filename}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExport("pdf")}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-2 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={onNewAnalysis}
            className="flex items-center gap-2 text-sm bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            New analysis
          </button>
        </div>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ScoreCard
          label="Hook Score"
          value={result.hook_score}
          type="score"
          subtext={`${result.hook_duration_seconds}s hook`}
        />
        <ScoreCard
          label="Pacing"
          value={result.pacing}
          type="text"
        />
        <ScoreCard
          label="Audio Quality"
          value={result.audio_quality}
          type="quality"
        />
        <ScoreCard
          label="Visual Quality"
          value={result.image_quality}
          type="quality"
        />
      </div>

      {/* Insights */}
      {result.insights.length > 0 && (
        <div className="bg-surface-900 border border-white/10 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Key Insights</h3>
          <div className="space-y-3">
            {result.insights.map((insight) => (
              <div
                key={insight.id}
                className={`border rounded-lg p-4 ${severityColor(insight.severity)}`}
              >
                <div className="flex items-start gap-3">
                  {insight.severity === "high" ? (
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-white text-sm font-medium">{insight.problem}</p>
                    <p className="text-gray-400 text-sm mt-1">
                      <span className="text-gray-500">Why: </span>
                      {insight.cause}
                    </p>
                    <p className="text-gray-500 text-xs mt-1 italic">{insight.evidence}</p>
                    {insight.timestamp_seconds !== undefined && (
                      <span className="text-brand-500 text-xs mt-1 block font-mono">
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
        weakSections={result.weak_sections}
        totalDuration={result.hook_duration_seconds * 10}
      />

      {/* Recommendations */}
      <RecommendationsPanel recommendations={result.recommendations} />

      {/* Similar successful content */}
      {result.similar_content.length > 0 && (
        <div className="bg-surface-900 border border-white/10 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Similar Successful Content</h3>
          <div className="space-y-3">
            {result.similar_content.map((item, i) => (
              <div key={i} className="bg-surface-800 border border-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white text-sm font-medium">{item.title}</p>
                  <span className="text-xs bg-brand-500/10 text-brand-500 px-2 py-0.5 rounded-full capitalize border border-brand-500/20">
                    {item.platform}
                  </span>
                </div>
                <p className="text-green-400 text-xs mb-1">
                  Why it worked: {item.why_successful}
                </p>
                <p className="text-gray-500 text-xs">
                  Key difference from your content: {item.key_differences}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
