"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { VideoUploader } from "@/components/analysis/VideoUploader";
import { AnalysisResults } from "@/components/analysis/AnalysisResults";
import { useAnalysis } from "@/hooks/useAnalysis";
import { getAnalysisResult } from "@/lib/api";
import type { AnalysisResult } from "@/lib/types";
import { Loader2 } from "lucide-react";

function AnalyzeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const loadId = searchParams.get("id");

  const { analysisResult, isAnalyzing, startAnalysis, progress, stage } = useAnalysis();
  const [loadedResult, setLoadedResult] = useState<AnalysisResult | null>(null);
  const [isLoadingResult, setIsLoadingResult] = useState(false);

  useEffect(() => {
    if (!loadId) return;
    setIsLoadingResult(true);
    getAnalysisResult(loadId)
      .then((data: AnalysisResult) => setLoadedResult(data))
      .catch(() => router.push("/history"))
      .finally(() => setIsLoadingResult(false));
  }, [loadId, router]);

  const result = loadedResult ?? analysisResult;

  const handleNewAnalysis = () => {
    setLoadedResult(null);
    router.push("/analyze");
  };

  if (isLoadingResult) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  const isPendingOrProcessing = result && (result.status === "pending" || result.status === "processing");
  const isFailed = result && result.status === "failed";
  const isCompleted = result && result.status === "completed";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Analyze Content</h1>
        <p className="text-gray-400 text-sm mt-1">
          Upload a video to get AI-powered insights on why it performs the way it does
        </p>
      </div>

      {!result && (
        <VideoUploader
          onUpload={startAnalysis}
          isUploading={isAnalyzing}
          progress={progress}
          stage={stage}
        />
      )}

      {isPendingOrProcessing && (
        <div className="bg-surface-900 border border-white/10 rounded-2xl p-10 text-center space-y-4">
          <Loader2 className="w-10 h-10 text-brand-500 animate-spin mx-auto" />
          <p className="text-white font-medium">Analysis in progress</p>
          <p className="text-gray-500 text-sm">{result.filename}</p>
        </div>
      )}

      {isFailed && (
        <div className="bg-surface-900 border border-red-500/20 rounded-2xl p-10 text-center space-y-4">
          <p className="text-red-400 font-medium">Analysis failed</p>
          <p className="text-gray-500 text-sm">{result.filename}</p>
          <button
            onClick={handleNewAnalysis}
            className="text-sm bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try a new analysis
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
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
      }
    >
      <AnalyzeContent />
    </Suspense>
  );
}
