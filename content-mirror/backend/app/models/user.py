import uuid
from datetime import datetime, date, timezone
from sqlalchemy import String, DateTime, Date, Integer, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    email: Mapped[str] = mapped_column(String(256), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    plan: Mapped[str] = mapped_column(SAEnum("free", "pro", name="plan_enum"), default="free")
    analyses_used: Mapped[int] = mapped_column(Integer, default=0)
    analyses_today: Mapped[int] = mapped_column(Integer, default=0)
    analyses_reset_at: Mapped[date] = mapped_column(Date, default=lambda: date.today())
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    analyses: Mapped[list["Analysis"]] = relationship(back_populates="user", lazy="select")  # noqa: F821

    @property
    def daily_limit(self) -> int:
        return 5 if self.plan == "free" else 100
