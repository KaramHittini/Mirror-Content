export interface User {
  id: string;
  name: string;
  email: string;
  plan: "free" | "pro";
  analyses_used: number;
  analyses_today: number;
  daily_limit: number;
  avatar_url: string | null;
  email_verified: boolean;
  created_at: string;
}

export interface WeakSection {
  start_seconds: number;
  end_seconds: number;
  reason: string;
}

export interface AnalysisResult {
  id: string;
  filename: string;
  status: "pending" | "processing" | "completed" | "failed";
  hook_score: number | null;
  pacing: "slow" | "medium" | "fast";
  audio_quality: "poor" | "average" | "good" | "excellent";
  image_quality: "poor" | "average" | "good" | "excellent";
  weak_sections: WeakSection[];
  hook_duration_seconds: number;
  // Extended fields from insight engine
  insights: Insight[];
  recommendations: Recommendation[];
  similar_content: SimilarContent[];
  transcript?: string;
  wpm?: number;
  filler_word_ratio?: number;
  hook_message_present?: boolean;
  sharpness_score?: number;
  brightness_score?: number;
  face_detected?: boolean;
  subtitles_detected?: boolean;
  created_at: string;
}

export interface AnalysisSummary {
  id: string;
  filename: string;
  hook_score: number | null;
  status: AnalysisResult["status"];
  created_at: string;
}

export interface Insight {
  id: string;
  problem: string;
  cause: string;
  evidence: string;
  severity: "low" | "medium" | "high";
  timestamp_seconds?: number;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  example?: string;
  priority: number;
  category: "hook" | "pacing" | "audio" | "visual" | "captions" | "cta";
}

export interface SimilarContent {
  title: string;
  platform: "tiktok" | "instagram" | "youtube";
  url?: string;
  why_successful: string;
  key_differences: string;
  hook_score: number;
}

export interface AnalysisProgress {
  analysisId: string;
  stage: "uploading" | "preprocessing" | "analyzing_video" | "analyzing_audio" | "analyzing_visual" | "generating_insights" | "complete" | "failed";
  progress: number;
  message: string;
}
