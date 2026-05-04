"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { VideoUploader } from "@/components/analysis/VideoUploader";
import { AnalysisResults } from "@/components/analysis/AnalysisResults";
import { useAnalysis } from "@/hooks/useAnalysis";
import { getAnalysisResult, cancelAnalysis } from "@/lib/api";
import type { AnalysisResult } from "@/lib/types";
import { Loader2, RotateCcw, Square } from "lucide-react";

const PENDING_KEY = "pending_analysis_id";

function AnalyzeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const loadId = searchParams.get("id");

  const { analysisResult, isAnalyzing, startAnalysis, startUrlAnalysis, progress, stage, analysisId } = useAnalysis();
  const [loadedResult, setLoadedResult] = useState<AnalysisResult | null>(null);
  const [isLoadingResult, setIsLoadingResult] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Load a specific analysis opened from history (?id=...)
  useEffect(() => {
    if (!loadId) return;
    setIsLoadingResult(true);
    getAnalysisResult(loadId)
      .then((data) => setLoadedResult(data))
      .catch(() => router.push("/history"))
      .finally(() => setIsLoadingResult(false));
  }, [loadId, router]);

  // Resume an in-progress analysis after the user navigated away
  useEffect(() => {
    if (loadId) return;
    const savedId = sessionStorage.getItem(PENDING_KEY);
    if (!savedId) return;
    setIsLoadingResult(true);
    getAnalysisResult(savedId)
      .then((data) => setLoadedResult(data))
      .catch(() => sessionStorage.removeItem(PENDING_KEY))
      .finally(() => setIsLoadingResult(false));
  }, [loadId]);

  // Poll while a loaded result is still pending/processing
  useEffect(() => {
    if (!loadedResult) return;
    if (loadedResult.status !== "pending" && loadedResult.status !== "processing") {
      sessionStorage.removeItem(PENDING_KEY);
      return;
    }
    const interval = setInterval(async () => {
      try {
        const data = await getAnalysisResult(loadedResult.id);
        setLoadedResult(data);
        if (data.status === "completed" || data.status === "failed") {
          sessionStorage.removeItem(PENDING_KEY);
          clearInterval(interval);
        }
      } catch { clearInterval(interval); }
    }, 3000);
    return () => clearInterval(interval);
  }, [loadedResult?.id, loadedResult?.status]);

  const result = loadedResult ?? analysisResult;

  const handleCancel = async () => {
    const id = loadedResult?.id ?? analysisId;
    if (!id) return;
    setIsCancelling(true);
    try {
      await cancelAnalysis(id);
    } finally {
      sessionStorage.removeItem(PENDING_KEY);
      setLoadedResult(null);
      setIsCancelling(false);
      router.push("/analyze");
    }
  };

  const handleNewAnalysis = () => {
    sessionStorage.removeItem(PENDING_KEY);
    setLoadedResult(null);
    router.push("/analyze");
  };

  if (isLoadingResult) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    );
  }

  const isPending = result && (result.status === "pending" || result.status === "processing");
  const isFailed = result && result.status === "failed";
  const isCompleted = result && result.status === "completed";

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      {!result && (
        <>
          <div>
            <h1 className="text-xl font-bold text-white">New Analysis</h1>
            <p className="text-sm text-zinc-600 mt-0.5">
              Upload a video to get a full AI breakdown of why it performs the way it does
            </p>
          </div>
          <VideoUploader
            onUpload={startAnalysis}
            onAnalyzeUrl={startUrlAnalysis}
            isUploading={isAnalyzing}
            progress={progress}
            stage={stage}
          />
        </>
      )}

      {isPending && (
        <div className="card p-12 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full border border-brand-500/30 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Analyzing {result.filename}</p>
            <p className="text-xs text-zinc-600 mt-1">
              This usually takes 1–3 minutes. You can leave this page and come back — your analysis will still be here.
            </p>
          </div>
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 px-4 py-2 rounded-lg transition-all mx-auto disabled:opacity-40"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            {isCancelling ? "Stopping…" : "Stop analysis"}
          </button>
        </div>
      )}

      {isFailed && (
        <div className="card border-red-500/20 p-12 text-center space-y-4">
          <p className="text-sm font-semibold text-red-400">Analysis failed</p>
          <p className="text-xs text-zinc-600">{result.filename}</p>
          <button onClick={handleNewAnalysis} className="btn-primary text-xs px-4 py-2">
            <RotateCcw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      )}

      {isCompleted && (
        <AnalysisResults result={result} onNewAnalysis={handleNewAnalysis} />
      )}
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      }
    >
      <AnalyzeContent />
    </Suspense>
  );
}
