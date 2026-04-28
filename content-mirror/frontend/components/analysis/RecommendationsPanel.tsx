import type { Recommendation } from "@/lib/types";
import { Lightbulb, ArrowRight } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  hook: "Hook",
  pacing: "Pacing",
  audio: "Audio",
  visual: "Visual",
  captions: "Captions",
  cta: "Call to Action",
};

const CATEGORY_COLORS: Record<string, string> = {
  hook: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  pacing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  audio: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  visual: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  captions: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  cta: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
}

export function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  const sorted = [...recommendations].sort((a, b) => a.priority - b.priority);

  return (
    <div className="bg-surface-900 border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-5">
        <Lightbulb className="w-5 h-5 text-brand-500" />
        <h3 className="text-white font-semibold">Recommendations</h3>
        <span className="ml-auto text-xs text-gray-500">
          {sorted.length} action{sorted.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-3">
        {sorted.map((rec, i) => (
          <div
            key={rec.id}
            className="bg-surface-800 border border-white/5 rounded-lg p-4"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-500/10 text-brand-500 text-xs flex items-center justify-center font-bold shrink-0">
                  {i + 1}
                </span>
                <p className="text-white text-sm font-medium">{rec.title}</p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${CATEGORY_COLORS[rec.category] ?? "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}
              >
                {CATEGORY_LABELS[rec.category] ?? rec.category}
              </span>
            </div>
            <p className="text-gray-400 text-sm ml-7">{rec.description}</p>
            {rec.example && (
              <div className="mt-2 ml-7 flex items-start gap-1.5 text-xs text-brand-500">
                <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" />
                <span className="italic">{rec.example}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
