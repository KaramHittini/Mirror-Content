import type { Recommendation } from "@/lib/types";

const CATEGORY_LABELS: Record<string, string> = {
  hook: "Hook",
  pacing: "Pacing",
  audio: "Audio",
  visual: "Visual",
  captions: "Captions",
  cta: "Call to Action",
};

const CATEGORY_STYLES: Record<string, string> = {
  hook: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  pacing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  audio: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  visual: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  captions: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  cta: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
}

export function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  const sorted = [...recommendations].sort((a, b) => a.priority - b.priority);

  if (sorted.length === 0) return null;

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Recommendations</p>
        <span className="text-xs text-zinc-600">{sorted.length} action{sorted.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="space-y-2">
        {sorted.map((rec, i) => (
          <div key={rec.id} className="rounded-xl border border-white/[0.06] bg-surface-800 p-4 space-y-2">
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-brand-500/15 text-brand-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-white leading-tight">{rec.title}</p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border shrink-0 ${CATEGORY_STYLES[rec.category] ?? "bg-zinc-800 text-zinc-500 border-zinc-700"}`}>
                    {CATEGORY_LABELS[rec.category] ?? rec.category}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">{rec.description}</p>
                {rec.example && (
                  <p className="text-xs text-brand-400/80 mt-2 italic leading-relaxed">
                    e.g. {rec.example}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
