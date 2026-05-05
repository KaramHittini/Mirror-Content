"use client";

import { useState, useEffect, useRef } from "react";
import { uploadVideo, analyzeUrl, getAnalysisResult } from "@/lib/api";
import { tokenStore } from "@/lib/tokenStore";
import type { AnalysisResult, AnalysisProgress } from "@/lib/types";
import toast from "react-hot-toast";

const PENDING_KEY = "pending_analysis_id";
const POLL_INITIAL_MS = 3_000;
const POLL_MAX_MS = 15_000;
const POLL_BACKOFF = 1.5;

export function useAnalysis() {
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<AnalysisProgress["stage"] | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startAnalysis = async (file: File) => {
    setIsAnalyzing(true);
    setProgress(0);
    setStage("uploading");

    try {
      const { analysis_id } = await uploadVideo(file, (pct) => {
        setProgress(Math.round(pct * 0.3));
      });
      setAnalysisId(analysis_id);
      sessionStorage.setItem(PENDING_KEY, analysis_id);
      connectWebSocket(analysis_id);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail ?? "Upload failed. Please try again.");
      setIsAnalyzing(false);
      setStage(null);
    }
  };

  const connectWebSocket = (id: string) => {
    const token = tokenStore.get();
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/${id}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    let settled = false;
    let ws: WebSocket;

    try {
      ws = new WebSocket(wsUrl);
    } catch {
      pollResult(id);
      return;
    }

    wsRef.current = ws;

    // If no progress message arrives within 10s, fall back to polling
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
        sessionStorage.removeItem(PENDING_KEY);
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
    let delay = POLL_INITIAL_MS;
    const startedAt = Date.now();
    const MAX_POLL_MS = 10 * 60 * 1000; // 10 minutes
    setProgress(fakeProgress);
    setStage("preprocessing");

    const poll = async () => {
      if (Date.now() - startedAt > MAX_POLL_MS) {
        sessionStorage.removeItem(PENDING_KEY);
        toast.error("Analysis is taking too long. Please try again with a shorter video.");
        setIsAnalyzing(false);
        return;
      }

      try {
        const result = await getAnalysisResult(id);

        if (result.status === "completed") {
          sessionStorage.removeItem(PENDING_KEY);
          setProgress(100);
          setAnalysisResult(result);
          setIsAnalyzing(false);
        } else if (result.status === "failed") {
          sessionStorage.removeItem(PENDING_KEY);
          toast.error("Analysis failed. Please try again.");
          setIsAnalyzing(false);
        } else {
          fakeProgress = Math.min(fakeProgress + 4, 95);
          setProgress(fakeProgress);
          delay = Math.min(delay * POLL_BACKOFF, POLL_MAX_MS);
          pollRef.current = setTimeout(poll, delay);
        }
      } catch {
        setIsAnalyzing(false);
      }
    };

    pollRef.current = setTimeout(poll, delay);
  };

  const fetchResult = async (id: string) => {
    try {
      const result = await getAnalysisResult(id);
      sessionStorage.removeItem(PENDING_KEY);
      setProgress(100);
      setStage("complete");
      setAnalysisResult(result);
    } catch {
      toast.error("Failed to fetch results. Please refresh.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  const startUrlAnalysis = async (url: string) => {
    setIsAnalyzing(true);
    setProgress(5);
    setStage("preprocessing");

    try {
      const { analysis_id } = await analyzeUrl(url);
      setAnalysisId(analysis_id);
      sessionStorage.setItem(PENDING_KEY, analysis_id);
      connectWebSocket(analysis_id);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail ?? "Failed to start analysis. Please try again.");
      setIsAnalyzing(false);
      setStage(null);
    }
  };

  return { analysisId, analysisResult, isAnalyzing, progress, stage, startAnalysis, startUrlAnalysis };
}
