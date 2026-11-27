import sys
sys.path.insert(0, r"d:\krisi mitra")

from fastapi.testclient import TestClient
from backend.app import app
from backend.schemas.database_schemas import FarmerProfileUpdateRequest

# 1. Verify route is registered
farmer_routes = [
    (sorted(r.methods), r.path)
    for r in app.routes
    if hasattr(r, "path") and "farmers" in r.path
]
print("REGISTERED FARMER ROUTES:", farmer_routes)

# 2. Verify Pydantic update payload coercion (blank strings -> None / SQL NULL)
req = FarmerProfileUpdateRequest(
    password="",
    full_name="Test Farmer",
    date_of_birth="",
    gender="",
    mobile_number="9845099999",
    state="Karnataka",
    district="Mandya",
    sub_district="",
    village="",
    pincode="",
    location_id=None,
    social_category="OBC",
    farmer_category="Small",
    annual_family_income=180000,
    kcc_holder=True,
    farmer_registration_id="",
    landholdings=[{
        "land_area": 1.5,
        "land_area_unit": "HECTARE",
        "ownership_type": "OWNED",
        "irrigation_available": True,
        "state": "Karnataka",
        "district": "Mandya",
        "village": "",
        "location_id": None,
    }],
    crops=[{
        "plot_index": 0,
        "crop_name": "Ragi",
        "crop_season": "Kharif",
        "cultivation_year": 2026,
    }],
    trees=[{
        "plot_index": 0,
        "tree_name": "Coconut",
        "tree_variety": "Tall",
        "tree_count": 12,
        "tree_age_years": 5,
        "purpose": "Commercial",
    }],
    livestock=[{
        "plot_index": 0,
        "animal_type": "Cow",
        "breed": "Hallikar",
        "animal_count": 2,
        "age_years": 4,
        "purpose": "Dairy",
    }],
)
assert req.password is None
assert req.date_of_birth is None
assert req.gender is None
assert req.farmer_registration_id is None
assert req.landholdings[0].village is None
print("PYDANTIC VALIDATION & NULL COERCION: PASS")
