import { cn, scoreColor, qualityColor } from "@/lib/utils";

interface ScoreCardProps {
  label: string;
  value: string | number | null | undefined;
  type?: "score" | "quality" | "text";
  subtext?: string;
}

export function ScoreCard({ label, value, type = "text", subtext }: ScoreCardProps) {
  const isEmpty = value == null || value === "";
  const valueStr = isEmpty ? "—" : String(value);

  const colorClass = isEmpty
    ? "text-gray-600"
    : type === "score"
    ? scoreColor(Number(value))
    : type === "quality"
    ? qualityColor(valueStr).split(" ")[0]
    : "text-white";

  const badgeClass = !isEmpty && type === "quality" ? qualityColor(valueStr) : "";

  return (
    <div className="bg-surface-900 border border-white/10 rounded-xl p-4 flex flex-col gap-1">
      <p className="text-gray-500 text-[11px] font-medium uppercase tracking-widest">
        {label}
      </p>
      {!isEmpty && type === "quality" ? (
        <span className={cn("text-sm font-semibold px-2 py-0.5 rounded-full capitalize w-fit", badgeClass)}>
          {valueStr}
        </span>
      ) : (
        <p className={cn("text-2xl font-bold leading-none", colorClass)}>
          {isEmpty ? "—" : type === "score" ? `${Number(value).toFixed(1)}/10` : valueStr}
        </p>
      )}
      {subtext && (
        <p className="text-gray-600 text-xs">{subtext}</p>
      )}
    </div>
  );
}
