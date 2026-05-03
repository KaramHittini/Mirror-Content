from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime


class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    plan: str
    analyses_used: int
    analyses_today: int
    daily_limit: int
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        if len(v) > 128:
            raise ValueError("Name too long (max 128 characters)")
        return v


class UsageResponse(BaseModel):
    analyses_used: int
    analyses_today: int
    daily_limit: int
    plan: str
    usage_pct: float
