import { cn, scoreColor, qualityColor } from "@/lib/utils";

interface ScoreCardProps {
  label: string;
  value: string | number;
  type?: "score" | "quality" | "text";
  subtext?: string;
}

export function ScoreCard({ label, value, type = "text", subtext }: ScoreCardProps) {
  const valueStr = String(value);

  const colorClass =
    type === "score"
      ? scoreColor(Number(value))
      : type === "quality"
      ? qualityColor(valueStr).split(" ")[0]
      : "text-white";

  const badgeClass =
    type === "quality" ? qualityColor(valueStr) : "";

  return (
    <div className="bg-surface-900 border border-white/10 rounded-xl p-4">
      <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">
        {label}
      </p>
      {type === "quality" ? (
        <span className={cn("text-sm font-semibold px-2 py-1 rounded-full capitalize", badgeClass)}>
          {valueStr}
        </span>
      ) : (
        <p className={cn("text-2xl font-bold", colorClass)}>
          {type === "score" ? `${Number(value).toFixed(1)}/10` : valueStr}
        </p>
      )}
      {subtext && (
        <p className="text-gray-600 text-xs mt-1">{subtext}</p>
      )}
    </div>
  );
}
