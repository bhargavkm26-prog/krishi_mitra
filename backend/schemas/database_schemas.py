from typing import Any, Optional
from pydantic import BaseModel, Field


class SchemeSummary(BaseModel):
    id: int
    scheme_name: str
    scheme_slug: Optional[str] = None
    level: Optional[str] = None
    state_ut_ministry: Optional[str] = None
    application_mode: Optional[str] = None
    tags: Optional[Any] = None


class SchemeListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    schemes: list[SchemeSummary]


class SchemeDossierResponse(BaseModel):
    found: bool
    dossier: Optional[dict[str, Any]] = None
    message: Optional[str] = None


class FarmerProfileCreate(BaseModel):
    district: str = Field(..., description="District name (e.g. Mandya, Dhemaji)")
    land_size_acres: float = Field(..., description="Landholding in acres")
    land_ownership: str = Field("owned", description="owned, leased, or joint")
    crop: str = Field(..., description="Primary cultivated crop")
    irrigation: str = Field("rainfed", description="rainfed, borewell, canal, drip")
    category: str = Field("general", description="general, obc, sc, st")
    age_group: str = Field("middle", description="young (18-40), middle (41-60), senior (>60)")
    gender: str = Field("male", description="male, female, other")
    has_bank_account: bool = Field(True, description="Active bank account available")
    has_fruits_id: bool = Field(False, description="State farmer portal ID (e.g. FRUITS in Karnataka)")


class FarmerProfileResponse(BaseModel):
    success: bool
    farmer_id: int
    message: str
    data: Optional[dict[str, Any]] = None


class FarmerFactsResponse(BaseModel):
    found: bool
    farmer: Optional[dict[str, Any]] = None
    landholdings: Optional[list[dict[str, Any]]] = None
    message: Optional[str] = None


class RawVectorQueryRequest(BaseModel):
    vector: list[float] = Field(..., description="1024-dimensional float vector")
    limit: int = Field(5, ge=1, le=50)


class RawVectorMatch(BaseModel):
    chunk_id: int
    scheme_id: int
    scheme_name: str
    distance: float


class RawVectorQueryResponse(BaseModel):
    count: int
    matches: list[RawVectorMatch]


class DatabaseHealthResponse(BaseModel):
    status: str
    schemes_count: int
    faq_chunks_count: int
    pgvector_version: Optional[str] = None
