import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function scoreColor(score: number): string {
  if (score >= 7) return "text-green-400";
  if (score >= 4) return "text-yellow-400";
  return "text-red-400";
}

export function qualityColor(quality: string): string {
  const map: Record<string, string> = {
    excellent: "text-green-400 bg-green-500/10",
    good: "text-blue-400 bg-blue-500/10",
    average: "text-yellow-400 bg-yellow-500/10",
    poor: "text-red-400 bg-red-500/10",
  };
  return map[quality] ?? "text-gray-400 bg-gray-500/10";
}

export function severityColor(severity: string): string {
  const map: Record<string, string> = {
    high: "border-red-500/40 bg-red-500/5",
    medium: "border-yellow-500/40 bg-yellow-500/5",
    low: "border-blue-500/40 bg-blue-500/5",
  };
  return map[severity] ?? "";
}
