from pydantic import BaseModel, EmailStr
from datetime import datetime


class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    plan: str
    analyses_used: int
    analyses_limit: int
    created_at: datetime

    model_config = {"from_attributes": True}
