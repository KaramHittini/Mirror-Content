"use client";

import { useState } from "react";
import { VideoUploader } from "@/components/analysis/VideoUploader";
import { AnalysisResults } from "@/components/analysis/AnalysisResults";
import { useAnalysis } from "@/hooks/useAnalysis";

export default function AnalyzePage() {
  const { analysisResult, isAnalyzing, analysisId, startAnalysis, progress } =
    useAnalysis();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Analyze Content</h1>
        <p className="text-gray-400 text-sm mt-1">
          Upload a video to get AI-powered insights on why it performs the way it does
        </p>
      </div>

      {!analysisResult && (
        <VideoUploader
          onUpload={startAnalysis}
          isUploading={isAnalyzing}
          progress={progress}
        />
      )}

      {analysisResult && (
        <AnalysisResults
          result={analysisResult}
          onNewAnalysis={() => window.location.reload()}
        />
      )}
    </div>
  );
}
