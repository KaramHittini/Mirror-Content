"use client";

import { useState, useEffect, useRef } from "react";
import { uploadVideo, getAnalysisResult } from "@/lib/api";
import type { AnalysisResult, AnalysisProgress } from "@/lib/types";
import toast from "react-hot-toast";

export function useAnalysis() {
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<AnalysisProgress["stage"] | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const startAnalysis = async (file: File) => {
    setIsAnalyzing(true);
    setProgress(0);
    setStage("uploading");

    try {
      const { analysis_id } = await uploadVideo(file, (pct) => {
        setProgress(Math.round(pct * 0.3)); // upload = 0-30%
      });
      setAnalysisId(analysis_id);
      connectWebSocket(analysis_id);
    } catch {
      setIsAnalyzing(false);
      setStage(null);
    }
  };

  const connectWebSocket = (id: string) => {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/${id}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data: AnalysisProgress = JSON.parse(event.data);
      setStage(data.stage);
      setProgress(data.progress);

      if (data.stage === "complete") {
        ws.close();
        fetchResult(id);
      } else if (data.stage === "failed") {
        ws.close();
        toast.error("Analysis failed. Please try again.");
        setIsAnalyzing(false);
      }
    };

    ws.onerror = () => {
      // WebSocket unavailable — fall back to polling
      pollResult(id);
    };
  };

  const pollResult = (id: string) => {
    const interval = setInterval(async () => {
      try {
        const result = await getAnalysisResult(id);
        if (result.status === "completed") {
          clearInterval(interval);
          setAnalysisResult(result);
          setIsAnalyzing(false);
        } else if (result.status === "failed") {
          clearInterval(interval);
          toast.error("Analysis failed.");
          setIsAnalyzing(false);
        }
      } catch {
        clearInterval(interval);
        setIsAnalyzing(false);
      }
    }, 3000);
  };

  const fetchResult = async (id: string) => {
    try {
      const result = await getAnalysisResult(id);
      setAnalysisResult(result);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    return () => wsRef.current?.close();
  }, []);

  return { analysisId, analysisResult, isAnalyzing, progress, stage, startAnalysis };
}
