"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Loader2, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalysisProgress } from "@/lib/types";
import toast from "react-hot-toast";

interface VideoUploaderProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
  progress: number;
  stage?: AnalysisProgress["stage"] | null;
}

const STAGE_LABELS: Record<string, string> = {
  uploading: "Uploading…",
  preprocessing: "Preprocessing frames…",
  analyzing_video: "Analyzing video structure…",
  analyzing_audio: "Analyzing audio…",
  analyzing_visual: "Analyzing visuals…",
  generating_insights: "Generating insights…",
};

export function VideoUploader({ onUpload, isUploading, progress, stage }: VideoUploaderProps) {
  const [urlInput, setUrlInput] = useState("");

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onUpload(accepted[0]);
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "video/*": [".mp4", ".mov", ".avi", ".mkv"] },
    maxSize: 500 * 1024 * 1024,
    disabled: isUploading,
    multiple: false,
  });

  if (isUploading) {
    return (
      <div className="card p-10 text-center space-y-5">
        <div className="relative w-14 h-14 mx-auto">
          <div className="w-14 h-14 rounded-full border-2 border-brand-500/20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-white mb-1">
            {STAGE_LABELS[stage ?? ""] ?? "Analyzing your content…"}
          </p>
          <p className="text-xs text-zinc-600">{progress}% complete</p>
        </div>
        <div className="w-full max-w-xs mx-auto">
          <div className="h-1 bg-surface-800 rounded-full overflow-hidden">
            <div
              className="h-1 bg-brand-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "card rounded-2xl p-16 text-center cursor-pointer transition-all duration-200 relative overflow-hidden",
          isDragActive
            ? "border-brand-500/60 bg-brand-500/[0.04]"
            : "hover:border-white/[0.12] hover:bg-surface-900"
        )}
      >
        <input {...getInputProps()} />
        {isDragActive && (
          <div className="absolute inset-0 pointer-events-none bg-brand-500/[0.03] border-2 border-brand-500/40 rounded-2xl" />
        )}
        <div className="w-12 h-12 mx-auto mb-5 rounded-2xl bg-surface-800 border border-white/[0.06] flex items-center justify-center">
          {isDragActive
            ? <Film className="w-5 h-5 text-brand-400" />
            : <UploadCloud className="w-5 h-5 text-zinc-500" />
          }
        </div>
        <p className="text-sm font-semibold text-white mb-1.5">
          {isDragActive ? "Drop it here" : "Drop your video here"}
        </p>
        <p className="text-xs text-zinc-600 mb-5">MP4, MOV, AVI or MKV · up to 500 MB</p>
        <button
          type="button"
          className="inline-flex items-center gap-2 border border-white/[0.1] hover:border-white/20 text-zinc-300 hover:text-white text-xs font-medium px-4 py-2 rounded-lg transition-all"
        >
          Browse files
        </button>
      </div>

      {/* URL row */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/[0.05]" />
        <span className="text-[11px] text-zinc-700 uppercase tracking-wider font-medium">or</span>
        <div className="flex-1 h-px bg-white/[0.05]" />
      </div>

      <div className="flex gap-2">
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Paste a TikTok, Instagram or YouTube URL…"
          className="input flex-1 text-xs"
        />
        <button
          onClick={() =>
            toast("URL analysis is coming soon. For now, download the video and upload it.", {
              icon: "🚧",
              duration: 4000,
            })
          }
          className="btn-ghost text-xs px-4 whitespace-nowrap"
        >
          Analyze URL
        </button>
      </div>
    </div>
  );
}
