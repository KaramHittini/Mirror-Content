"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Film, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoUploaderProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
  progress: number;
}

const STAGE_LABELS: Record<string, string> = {
  uploading: "Uploading video...",
  preprocessing: "Preprocessing frames...",
  analyzing_video: "Analyzing video structure...",
  analyzing_audio: "Analyzing audio quality...",
  analyzing_visual: "Analyzing visual quality...",
  generating_insights: "Generating insights...",
};

export function VideoUploader({ onUpload, isUploading, progress }: VideoUploaderProps) {
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
    maxSize: 500 * 1024 * 1024, // 500 MB
    disabled: isUploading,
    multiple: false,
  });

  if (isUploading) {
    return (
      <div className="bg-surface-900 border border-white/10 rounded-2xl p-10 text-center space-y-4">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin mx-auto" />
        <p className="text-white font-medium">
          {STAGE_LABELS[String(progress)] ?? "Analyzing your content..."}
        </p>
        <div className="w-full bg-surface-800 rounded-full h-2">
          <div
            className="bg-brand-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-gray-500 text-sm">{progress}% complete</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "bg-surface-900 border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-brand-500 bg-brand-500/5"
            : "border-white/10 hover:border-brand-500/50"
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <p className="text-white font-medium mb-1">
          {isDragActive ? "Drop your video here" : "Drag & drop your video"}
        </p>
        <p className="text-gray-500 text-sm">
          MP4, MOV, AVI, MKV — up to 500 MB
        </p>
        <button className="mt-5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
          Browse files
        </button>
      </div>

      {/* URL input (future — Phase 2) */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-gray-600 text-xs uppercase tracking-wider">
          or paste a URL
        </span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <div className="flex gap-3">
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="https://www.tiktok.com/@user/video/..."
          className="flex-1 bg-surface-900 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
        />
        <button
          disabled
          title="URL analysis coming in Phase 2"
          className="bg-surface-800 text-gray-500 text-sm font-medium px-4 py-2.5 rounded-lg cursor-not-allowed border border-white/10"
        >
          Analyze URL
        </button>
      </div>
      <p className="text-gray-600 text-xs text-center">
        TikTok, Instagram, and YouTube URL support coming soon
      </p>
    </div>
  );
}
