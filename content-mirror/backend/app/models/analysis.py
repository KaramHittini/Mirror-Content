import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, Enum as SAEnum, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(512), nullable=True)

    status: Mapped[str] = mapped_column(
        SAEnum("pending", "processing", "completed", "failed", name="analysis_status_enum"),
        default="pending",
        index=True,
    )
    error_message: Mapped[str | None] = mapped_column(String, nullable=True)
    celery_task_id: Mapped[str | None] = mapped_column(String(256), nullable=True)

    # Core scores (populated after processing)
    hook_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    hook_duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pacing: Mapped[str | None] = mapped_column(String(16), nullable=True)
    audio_quality: Mapped[str | None] = mapped_column(String(16), nullable=True)
    image_quality: Mapped[str | None] = mapped_column(String(16), nullable=True)

    # JSON blobs for complex data
    weak_sections: Mapped[list | None] = mapped_column(JSON, nullable=True)
    insights: Mapped[list | None] = mapped_column(JSON, nullable=True)
    recommendations: Mapped[list | None] = mapped_column(JSON, nullable=True)
    similar_content: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # Extended audio fields
    transcript: Mapped[str | None] = mapped_column(String, nullable=True)
    wpm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    filler_word_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    hook_message_present: Mapped[bool | None] = mapped_column(nullable=True)

    # Extended visual fields
    sharpness_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    brightness_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    face_detected: Mapped[bool | None] = mapped_column(nullable=True)
    subtitles_detected: Mapped[bool | None] = mapped_column(nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="analyses")  # noqa: F821
