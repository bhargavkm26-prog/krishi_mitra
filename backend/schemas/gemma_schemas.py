from typing import Any, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="system, user, or assistant")
    content: str = Field(..., description="Message text content")


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    temperature: float = Field(0.1, ge=0.0, le=1.0)
    max_tokens: int = Field(1500, ge=10, le=4096)


class ChatResponse(BaseModel):
    status: str
    response: Any


class EligibilityEvaluateRequest(BaseModel):
    farmer_id: int = Field(..., description="Registered farmer ID")
    scheme_id: int = Field(..., description="Target scheme ID to evaluate")


class EligibilityEvaluateResponse(BaseModel):
    scheme_id: int
    scheme_name: str
    status: str
    confidence_score: float
    disqualifying_factors: list[str]
    priority_tier: str
    target_quota: Optional[str] = None
    fit_score: Optional[float] = None


class ConsultRequest(BaseModel):
    inquiry: str = Field(..., min_length=2, description="Citizen grievance or assistance inquiry")
    farmer_id: Optional[int] = Field(None, description="Optional registered farmer ID")
    max_turns: int = Field(3, ge=1, le=5)


class ConsultResponse(BaseModel):
    status: str
    deliberation: str
    directive: dict[str, Any]


class GemmaHealthResponse(BaseModel):
    status: str
    server_url: str
    healthy: bool
