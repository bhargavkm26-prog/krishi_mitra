from typing import Any, Optional
from pydantic import BaseModel, Field


class EmbedRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text string to encode into dense vector")


class EmbedResponse(BaseModel):
    dim: int
    text_sample: str
    vector: list[float]


class SchemeSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Natural language search query")
    state: Optional[str] = Field(None, description="Optional State filter (e.g. Assam, Karnataka)")
    ministry: Optional[str] = Field(None, description="Optional Ministry filter")
    limit: int = Field(5, ge=1, le=20)


class SchemeSearchResultItem(BaseModel):
    scheme_id: int
    scheme_name: str
    level: Optional[str] = None
    state_ut_ministry: Optional[str] = None
    section: Optional[str] = None
    evidence: str
    relevance_score: float


class SchemeSearchResponse(BaseModel):
    count: int
    query: str
    schemes: list[SchemeSearchResultItem]


class FaqSearchRequest(BaseModel):
    issue: str = Field(..., min_length=1, description="Administrative issue (e.g. Aadhaar NPCI bank account block)")
    limit: int = Field(3, ge=1, le=10)


class FaqSearchResultItem(BaseModel):
    scheme: str
    ministry: Optional[str] = None
    faq_text: str
    relevance_score: float


class FaqSearchResponse(BaseModel):
    count: int
    issue: str
    faqs: list[FaqSearchResultItem]


class BgeHealthResponse(BaseModel):
    status: str
    device: str
    model_name: str
    dim: int
