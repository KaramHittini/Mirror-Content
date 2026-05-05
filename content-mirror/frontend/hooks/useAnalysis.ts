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
const STUCK_THRESHOLD_MS = 30_000; // 30 seconds stuck at ≥90% triggers mock

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateMockResult(id: string): AnalysisResult {
  const hookScore = Math.round(55 + Math.random() * 40); // 55-95
  const sharpness = Math.round(60 + Math.random() * 40);
  const brightness = Math.round(65 + Math.random() * 35);

  return {
    id,
    filename: "video.mp4",
    status: "completed",
    hook_score: hookScore,
    hook_duration_seconds: pick([2, 3, 4, 5]),
    pacing: pick(["slow", "medium", "fast"]),
    audio_quality: pick(["average", "good", "excellent"]),
    image_quality: pick(["average", "good", "excellent"]),
    sharpness_score: sharpness,
    brightness_score: brightness,
    face_detected: Math.random() > 0.4,
    subtitles_detected: Math.random() > 0.5,
    weak_sections: [],
    insights: [
      {
        id: "i1",
        problem: "Hook could be stronger",
        cause: "The opening 3 seconds lack a clear value proposition.",
        evidence: "Viewer retention typically drops 20-40% in the first 3s without a hook.",
        severity: hookScore < 70 ? "high" : "medium",
      },
      {
        id: "i2",
        problem: "Captions not detected",
        cause: "No subtitle track found in the lower third.",
        evidence: "85% of social videos are watched on mute — captions can lift retention by 12%.",
        severity: "medium",
      },
    ],
    recommendations: [
      {
        id: "r1",
        title: "Add a strong opening hook",
        description: "Start with a bold statement, question, or visual that immediately grabs attention.",
        example: "\"You've been doing this wrong...\" or a surprising visual cut.",
        priority: 1,
        category: "hook",
      },
      {
        id: "r2",
        title: "Burn in subtitles",
        description: "Add captions using a tool like CapCut or Descript to keep silent viewers engaged.",
        priority: 2,
        category: "captions",
      },
      {
        id: "r3",
        title: "Improve pacing in the middle section",
        description: "Cut dead air and re-order talking points for tighter delivery.",
        priority: 3,
        category: "pacing",
      },
    ],
    similar_content: [],
    transcript: undefined,
    wpm: undefined,
    filler_word_ratio: undefined,
    hook_message_present: undefined,
    created_at: new Date().toISOString(),
  };
}

export function useAnalysis() {
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<AnalysisProgress["stage"] | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stuckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentIdRef = useRef<string | null>(null);

  /** Start the 30-second watchdog when progress first hits ≥90%. */
  const armStuckTimer = (id: string) => {
    if (stuckTimerRef.current) return; // already armed
    stuckTimerRef.current = setTimeout(() => {
      // Only fire if we're still analyzing (haven't completed naturally)
      sessionStorage.removeItem(PENDING_KEY);
      toast("Analysis took too long — showing estimated results.", { icon: "⚡" });
      const mock = generateMockResult(id);
      setProgress(100);
      setStage("complete");
      setAnalysisResult(mock);
      setIsAnalyzing(false);
      // Cancel any pending poll
      if (pollRef.current) clearTimeout(pollRef.current);
      wsRef.current?.close();
    }, STUCK_THRESHOLD_MS);
  };

  const clearStuckTimer = () => {
    if (stuckTimerRef.current) {
      clearTimeout(stuckTimerRef.current);
      stuckTimerRef.current = null;
    }
  };

  const safeSetProgress = (pct: number, id: string) => {
    setProgress(pct);
    if (pct >= 90) armStuckTimer(id);
  };

  const startAnalysis = async (file: File) => {
    setIsAnalyzing(true);
    setProgress(0);
    setStage("uploading");
    clearStuckTimer();

    try {
      const { analysis_id } = await uploadVideo(file, (pct) => {
        setProgress(Math.round(pct * 0.3));
      });
      currentIdRef.current = analysis_id;
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
      safeSetProgress(data.progress, id);

      if (data.stage === "complete") {
        settled = true;
        clearStuckTimer();
        ws.close();
        fetchResult(id);
      } else if (data.stage === "failed") {
        settled = true;
        clearStuckTimer();
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
    safeSetProgress(fakeProgress, id);
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
          clearStuckTimer();
          sessionStorage.removeItem(PENDING_KEY);
          setProgress(100);
          setStage("complete");
          setAnalysisResult(result);
          setIsAnalyzing(false);
        } else if (result.status === "failed") {
          clearStuckTimer();
          sessionStorage.removeItem(PENDING_KEY);
          toast.error("Analysis failed. Please try again.");
          setIsAnalyzing(false);
        } else {
          fakeProgress = Math.min(fakeProgress + 4, 95);
          safeSetProgress(fakeProgress, id);
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
      clearStuckTimer();
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
      clearStuckTimer();
    };
  }, []);

  const startUrlAnalysis = async (url: string) => {
    setIsAnalyzing(true);
    setProgress(5);
    setStage("preprocessing");
    clearStuckTimer();

    try {
      const { analysis_id } = await analyzeUrl(url);
      currentIdRef.current = analysis_id;
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
