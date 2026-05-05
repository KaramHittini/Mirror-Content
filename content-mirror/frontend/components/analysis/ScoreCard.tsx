import { cn, scoreColor, qualityColor } from "@/lib/utils";

interface ScoreCardProps {
  label: string;
  value: string | number | null | undefined;
  type?: "score" | "quality" | "text";
  subtext?: string;
}

export function ScoreCard({ label, value, type = "text", subtext }: ScoreCardProps) {
  const empty = value == null || value === "";
  const valueStr = empty ? "—" : String(value);

  const numericColor = empty ? "text-zinc-700" : scoreColor(Number(value));
  const badgeClass = !empty && type === "quality" ? qualityColor(valueStr) : "";

  return (
    <div className="card p-4 flex flex-col gap-2">
      <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">{label}</p>
      {!empty && type === "quality" ? (
        <span className={cn("text-xs font-semibold px-2 py-1 rounded-lg capitalize w-fit", badgeClass)}>
          {valueStr}
        </span>
      ) : (
        <p className={cn("text-2xl font-bold leading-none", type === "score" ? numericColor : empty ? "text-zinc-700" : "text-white")}>
          {empty ? "—" : type === "score" ? `${Number(value).toFixed(1)}/10` : valueStr}
        </p>
      )}
      {subtext && <p className="text-[11px] text-zinc-600">{subtext}</p>}
    </div>
  );
}
