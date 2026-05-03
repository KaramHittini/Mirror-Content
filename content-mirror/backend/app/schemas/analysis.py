from pydantic import BaseModel, field_validator
from datetime import datetime


class WeakSection(BaseModel):
    start_seconds: int
    end_seconds: int
    reason: str


class Insight(BaseModel):
    id: str
    problem: str
    cause: str
    evidence: str
    severity: str
    timestamp_seconds: int | None = None


class Recommendation(BaseModel):
    id: str
    title: str
    description: str
    example: str | None = None
    priority: int
    category: str


class SimilarContent(BaseModel):
    title: str
    platform: str
    url: str | None = None
    why_successful: str
    key_differences: str
    hook_score: float


class AnalysisUploadResponse(BaseModel):
    analysis_id: str
    message: str = "Analysis queued successfully"


class AnalysisSummary(BaseModel):
    id: str
    filename: str
    hook_score: float | None = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AnalysisResponse(BaseModel):
    id: str
    filename: str
    status: str
    hook_score: float | None = None
    hook_duration_seconds: int | None = None
    pacing: str | None = None
    audio_quality: str | None = None
    image_quality: str | None = None
    weak_sections: list[WeakSection] = []
    insights: list[Insight] = []
    recommendations: list[Recommendation] = []
    similar_content: list[SimilarContent] = []
    transcript: str | None = None
    wpm: int | None = None
    filler_word_ratio: float | None = None
    hook_message_present: bool | None = None
    sharpness_score: float | None = None
    brightness_score: float | None = None
    face_detected: bool | None = None
    subtitles_detected: bool | None = None
    created_at: datetime

    @field_validator("weak_sections", "insights", "recommendations", "similar_content", mode="before")
    @classmethod
    def coerce_none_to_list(cls, v):
        return v if v is not None else []

    model_config = {"from_attributes": True}
