from datetime import date
import re
from typing import Any, Optional
from pydantic import BaseModel, Field, field_validator


UNIQUE_ID_ALLOWED_RE = re.compile(r"^[A-Za-z0-9@#$_-]{8,20}$")


def empty_to_none(value: Any) -> Any:
    """Convert blank strings to None so PostgreSQL receives SQL NULL."""
    if isinstance(value, str):
        stripped = value.strip()
        return stripped if stripped != "" else None
    return value


def validate_unique_id_rules(unique_id: str) -> tuple[bool, Optional[str]]:
    """Validate against PostgreSQL CHECK constraint `farmer_unique_id_format`."""
    value = (unique_id or "").strip()
    if len(value) < 8 or len(value) > 20:
        return False, "User ID must be 8 to 20 characters long."
    if not UNIQUE_ID_ALLOWED_RE.match(value):
        return False, "User ID may contain only letters, numbers, and @ # $ _ -."
    if not re.search(r"[A-Za-z]", value):
        return False, "User ID must contain at least 1 letter (A-Z / a-z)."
    if not re.search(r"[0-9]", value):
        return False, "User ID must contain at least 1 digit (0-9)."
    if not re.search(r"[@#$_-]", value):
        return False, "User ID must contain at least 1 special character (@ # $ _ -)."
    return True, None


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
    unassigned_crops: Optional[list[dict[str, Any]]] = None
    message: Optional[str] = None


class CheckUniqueIdResponse(BaseModel):
    farmer_unique_id: str
    valid_format: bool
    available: bool
    message: str


class FarmerLoginRequest(BaseModel):
    farmer_unique_id: str = Field(..., min_length=1, description="Farmer Unique User ID (e.g. KM26@0001)")
    password: str = Field(..., min_length=1, description="Farmer password")


class LandholdingInput(BaseModel):
    """Maps 1:1 to `public.farmer_landholdings` columns."""
    land_area: Optional[float] = None
    land_area_unit: Optional[str] = "HECTARE"
    ownership_type: Optional[str] = None
    irrigation_available: Optional[bool] = None
    state: Optional[str] = None
    district: Optional[str] = None
    village: Optional[str] = None
    location_id: Optional[int] = None

    @field_validator("land_area_unit", "ownership_type", "state", "district", "village", mode="before")
    @classmethod
    def _clean_str(cls, v):
        return empty_to_none(v)


class CropInput(BaseModel):
    """Maps 1:1 to `public.farmer_crops` columns."""
    plot_index: Optional[int] = Field(None, description="0-based index into landholdings array, or None for unassigned")
    crop_name: Optional[str] = None
    crop_season: Optional[str] = None
    cultivation_year: Optional[int] = None

    @field_validator("crop_name", "crop_season", mode="before")
    @classmethod
    def _clean_str(cls, v):
        return empty_to_none(v)


class TreeInput(BaseModel):
    """Maps 1:1 to `public.farmer_trees` columns (requires plot_index + tree_count > 0)."""
    plot_index: Optional[int] = Field(0, description="0-based index into landholdings array")
    tree_name: Optional[str] = None
    tree_variety: Optional[str] = None
    tree_count: Optional[int] = None
    tree_age_years: Optional[float] = None
    purpose: Optional[str] = None

    @field_validator("tree_name", "tree_variety", "purpose", mode="before")
    @classmethod
    def _clean_str(cls, v):
        return empty_to_none(v)


class LivestockInput(BaseModel):
    """Maps 1:1 to `public.farmer_livestock` columns (requires plot_index + animal_count > 0)."""
    plot_index: Optional[int] = Field(0, description="0-based index into landholdings array")
    animal_type: Optional[str] = None
    breed: Optional[str] = None
    animal_count: Optional[int] = None
    age_years: Optional[float] = None
    purpose: Optional[str] = None

    @field_validator("animal_type", "breed", "purpose", mode="before")
    @classmethod
    def _clean_str(cls, v):
        return empty_to_none(v)


class NewFarmerRegisterRequest(BaseModel):
    """
    Complete multi-table farmer registration request.
    Only `farmer_unique_id` and `password` are mandatory; any omitted or empty optional field is stored as SQL NULL.
    """
    farmer_unique_id: str = Field(..., max_length=20)
    password: str = Field(..., min_length=1, max_length=255)

    # Personal details (`public.farmer_profiles`)
    full_name: Optional[str] = Field(None, max_length=150)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(None, max_length=30)
    mobile_number: Optional[str] = Field(None, max_length=15)

    # Residence location (`public.farmer_profiles` + `public.india_locations` FK)
    state: Optional[str] = Field(None, max_length=100)
    district: Optional[str] = Field(None, max_length=100)
    sub_district: Optional[str] = Field(None, max_length=100)
    village: Optional[str] = Field(None, max_length=100)
    pincode: Optional[str] = Field(None, max_length=10)
    location_id: Optional[int] = None

    # Agrarian & Economic classification (`public.farmer_profiles`)
    social_category: Optional[str] = Field(None, max_length=30)
    farmer_category: Optional[str] = Field(None, max_length=30)
    annual_family_income: Optional[float] = None
    kcc_holder: Optional[bool] = None
    farmer_registration_id: Optional[str] = Field(None, max_length=100)
    profile_verification_status: Optional[str] = Field("UNVERIFIED", max_length=30)

    # Child tables (`farmer_landholdings`, `farmer_crops`, `farmer_trees`, `farmer_livestock`)
    landholdings: list[LandholdingInput] = Field(default_factory=list)
    crops: list[CropInput] = Field(default_factory=list)
    trees: list[TreeInput] = Field(default_factory=list)
    livestock: list[LivestockInput] = Field(default_factory=list)

    @field_validator(
        "full_name",
        "date_of_birth",
        "gender",
        "mobile_number",
        "state",
        "district",
        "sub_district",
        "village",
        "pincode",
        "social_category",
        "farmer_category",
        "farmer_registration_id",
        "profile_verification_status",
        mode="before",
    )
    @classmethod
    def _clean_optional_strs(cls, v):
        return empty_to_none(v)


class NewFarmerRegisterResponse(BaseModel):
    success: bool
    farmer_id: int
    farmer_unique_id: str
    landholdings_created: int
    crops_created: int
    trees_created: int
    livestock_created: int
    message: str


class LandholdingUpdateInput(LandholdingInput):
    """Landholding input supporting optional existing `landholding_id` preservation during updates."""
    landholding_id: Optional[int] = None


class FarmerProfileUpdateRequest(BaseModel):
    """
    Full 6-table profile update payload from Farmer Dashboard Edit Profile modal.
    All optional fields coerce empty strings to SQL NULL. Leave `password` blank/None to keep existing password.
    """
    password: Optional[str] = Field(None, max_length=255)

    # Personal details (`public.farmer_profiles`)
    full_name: Optional[str] = Field(None, max_length=150)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(None, max_length=30)
    mobile_number: Optional[str] = Field(None, max_length=15)

    # Residence location (`public.farmer_profiles` + `public.india_locations` FK)
    state: Optional[str] = Field(None, max_length=100)
    district: Optional[str] = Field(None, max_length=100)
    sub_district: Optional[str] = Field(None, max_length=100)
    village: Optional[str] = Field(None, max_length=100)
    pincode: Optional[str] = Field(None, max_length=10)
    location_id: Optional[int] = None

    # Agrarian & Economic classification (`public.farmer_profiles`)
    social_category: Optional[str] = Field(None, max_length=30)
    farmer_category: Optional[str] = Field(None, max_length=30)
    annual_family_income: Optional[float] = None
    kcc_holder: Optional[bool] = None
    farmer_registration_id: Optional[str] = Field(None, max_length=100)
    profile_verification_status: Optional[str] = Field(None, max_length=30)

    # Child tables (`farmer_landholdings`, `farmer_crops`, `farmer_trees`, `farmer_livestock`)
    landholdings: list[LandholdingUpdateInput] = Field(default_factory=list)
    crops: list[CropInput] = Field(default_factory=list)
    trees: list[TreeInput] = Field(default_factory=list)
    livestock: list[LivestockInput] = Field(default_factory=list)

    @field_validator(
        "password",
        "full_name",
        "date_of_birth",
        "gender",
        "mobile_number",
        "state",
        "district",
        "sub_district",
        "village",
        "pincode",
        "social_category",
        "farmer_category",
        "farmer_registration_id",
        "profile_verification_status",
        mode="before",
    )
    @classmethod
    def _clean_optional_strs(cls, v):
        return empty_to_none(v)


class FarmerProfileUpdateResponse(BaseModel):
    found: bool = True
    success: bool = True
    farmer_id: int
    farmer_unique_id: str
    landholdings_count: int
    crops_count: int
    trees_count: int
    livestock_count: int
    farmer: dict[str, Any]
    landholdings: list[dict[str, Any]]
    unassigned_crops: list[dict[str, Any]] = Field(default_factory=list)
    message: str


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
