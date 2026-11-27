import sys
sys.path.insert(0, r"d:\krisi mitra")

from fastapi.testclient import TestClient
from backend.app import app
from backend.database.connection import get_connection

client = TestClient(app)

TEST_UID = "KM_TEST@9988"

# Cleanup any leftover test row first
conn = get_connection()
try:
    with conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM public.farmer_profiles WHERE farmer_unique_id = %s;", (TEST_UID,))
            cur.execute("SELECT location_id, state_name, district_name, sub_district_name, village_name FROM public.india_locations LIMIT 1;")
            loc_row = cur.fetchone()
finally:
    conn.close()

assert loc_row is not None, "Expected india_locations rows in DB"
loc_id, st_name, dist_name, sub_name, vil_name = loc_row
print("SAMPLE_LGD_LOCATION:", loc_id, st_name, dist_name, sub_name, vil_name)

# 1. Register test farmer
reg_resp = client.post("/api/v1/database/farmers/register", json={
    "farmer_unique_id": TEST_UID,
    "password": "Pass1234",
    "full_name": "Initial Farmer",
    "state": st_name,
    "district": dist_name,
    "sub_district": sub_name,
    "village": vil_name,
    "location_id": loc_id,
    "landholdings": [{"land_area": 1.2, "land_area_unit": "HECTARE", "ownership_type": "OWNED", "irrigation_available": True}],
    "crops": [{"plot_index": 0, "crop_name": "Rice", "crop_season": "Kharif", "cultivation_year": 2025}],
    "trees": [],
    "livestock": []
})
assert reg_resp.status_code == 200, reg_resp.text
print("REGISTER_OK:", reg_resp.json()["farmer_id"])

# 2. Update all 6 tables via PUT /api/v1/database/farmers/{uid}
upd_resp = client.put(f"/api/v1/database/farmers/{TEST_UID}", json={
    "password": "",  # Keep existing plain-text password
    "full_name": "Updated Farmer Name",
    "date_of_birth": "1984-05-10",
    "gender": "Female",
    "mobile_number": "9845077777",
    "state": st_name,
    "district": dist_name,
    "sub_district": sub_name,
    "village": vil_name,
    "pincode": "571401",
    "location_id": loc_id,
    "social_category": "OBC",
    "farmer_category": "Medium",
    "annual_family_income": 320000,
    "kcc_holder": True,
    "farmer_registration_id": "FID-TEST-9988",
    "profile_verification_status": "VERIFIED",
    "landholdings": [
        {
            "land_area": 2.5,
            "land_area_unit": "HECTARE",
            "ownership_type": "OWNED",
            "irrigation_available": True,
            "state": st_name,
            "district": dist_name,
            "village": vil_name,
            "location_id": loc_id,
        }
    ],
    "crops": [
        {"plot_index": 0, "crop_name": "Ragi", "crop_season": "Kharif", "cultivation_year": 2026},
        {"plot_index": None, "crop_name": "Tomato", "crop_season": "Rabi", "cultivation_year": 2026},
    ],
    "trees": [
        {"plot_index": 0, "tree_name": "Coconut", "tree_variety": "Tall", "tree_count": 15, "tree_age_years": 6.5, "purpose": "Commercial"}
    ],
    "livestock": [
        {"plot_index": 0, "animal_type": "Cow", "breed": "Hallikar", "animal_count": 3, "age_years": 4, "purpose": "Dairy"}
    ],
})
assert upd_resp.status_code == 200, upd_resp.text
data = upd_resp.json()
assert data["farmer"]["full_name"] == "Updated Farmer Name"
assert data["farmer"]["location_id"] == loc_id
assert data["farmer"]["pincode"] == "571401"
assert data["landholdings_count"] == 1
assert data["crops_count"] == 2
assert data["trees_count"] == 1
assert data["livestock_count"] == 1
assert len(data["unassigned_crops"]) == 1
print("UPDATE_OK:", data["message"])

# 3. Verify login still works with original password (empty password kept existing)
login_resp = client.post("/api/v1/database/farmers/login", json={
    "farmer_unique_id": TEST_UID,
    "password": "Pass1234",
})
assert login_resp.status_code == 200, login_resp.text
assert login_resp.json()["farmer"]["full_name"] == "Updated Farmer Name"
assert len(login_resp.json()["landholdings"][0]["trees"]) == 1
assert len(login_resp.json()["landholdings"][0]["livestock"]) == 1
print("LOGIN_AFTER_UPDATE_OK")

# 4. Clean up test farmer
conn = get_connection()
try:
    with conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM public.farmer_profiles WHERE farmer_unique_id = %s;", (TEST_UID,))
finally:
    conn.close()
print("CLEANUP_OK: 6-TABLE UPDATE VERIFIED END-TO-END")
