"use client";

import { useState, useEffect, useRef } from "react";
import { uploadVideo, getAnalysisResult } from "@/lib/api";
import type { AnalysisResult, AnalysisProgress } from "@/lib/types";
import toast from "react-hot-toast";

const PENDING_KEY = "pending_analysis_id";

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
        setProgress(Math.round(pct * 0.3));
      });
      setAnalysisId(analysis_id);
      localStorage.setItem(PENDING_KEY, analysis_id);
      connectWebSocket(analysis_id);
    } catch {
      setIsAnalyzing(false);
      setStage(null);
    }
  };

  const connectWebSocket = (id: string) => {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/${id}`;
    let settled = false;
    let ws: WebSocket;

    try {
      ws = new WebSocket(wsUrl);
    } catch {
      pollResult(id);
      return;
    }

    wsRef.current = ws;

    // If no progress message arrives within 10s, WS won't deliver — fall back to polling
    const wsTimeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        ws.close();
        pollResult(id);
      }
    }, 10_000);

    ws.onmessage = (event) => {
      clearTimeout(wsTimeout);
      const data: AnalysisProgress = JSON.parse(event.data);
      setStage(data.stage);
      setProgress(data.progress);

      if (data.stage === "complete") {
        settled = true;
        ws.close();
        fetchResult(id);
      } else if (data.stage === "failed") {
        settled = true;
        ws.close();
        localStorage.removeItem(PENDING_KEY);
        toast.error("Analysis failed. Please try again.");
        setIsAnalyzing(false);
      }
    };

    ws.onerror = () => {
      clearTimeout(wsTimeout);
      if (!settled) { settled = true; pollResult(id); }
    };

    ws.onclose = () => {
      clearTimeout(wsTimeout);
      if (!settled) { settled = true; pollResult(id); }
    };
  };

  const pollResult = (id: string) => {
    let fakeProgress = 35;
    setProgress(fakeProgress);
    setStage("preprocessing");

    const interval = setInterval(async () => {
      try {
        const result = await getAnalysisResult(id);

        if (result.status === "completed") {
          clearInterval(interval);
          localStorage.removeItem(PENDING_KEY);
          setProgress(100);
          setAnalysisResult(result);
          setIsAnalyzing(false);
        } else if (result.status === "failed") {
          clearInterval(interval);
          localStorage.removeItem(PENDING_KEY);
          toast.error("Analysis failed.");
          setIsAnalyzing(false);
        } else {
          fakeProgress = Math.min(fakeProgress + 4, 90);
          setProgress(fakeProgress);
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
      localStorage.removeItem(PENDING_KEY);
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
