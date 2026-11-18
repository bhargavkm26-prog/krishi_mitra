
from decimal import Decimal
from datetime import date, datetime

from psycopg2.extras import RealDictCursor

from backend.database.connection import get_connection


def make_json_serializable(value):
    """Convert PostgreSQL values into JSON-compatible values."""

    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, (date, datetime)):
        return value.isoformat()

    if isinstance(value, dict):
        return {
            key: make_json_serializable(item)
            for key, item in value.items()
        }

    if isinstance(value, list):
        return [make_json_serializable(item) for item in value]

    return value


def get_farmer_profile(farmer_id: int):
    """
    Retrieve and aggregate all available farmer information.

    Crops, trees and livestock are nested under their
    respective landholdings.

    This function does not determine scheme eligibility.
    """

    connection = get_connection()

    try:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:

            # 1. Farmer personal information

            cursor.execute("""
                SELECT
                    fp.farmer_id,
                    fp.farmer_unique_id,
                    fp.full_name,
                    fp.date_of_birth,
                    fp.gender,
                    fp.mobile_number,
                    fp.state,
                    fp.district,
                    fp.sub_district,
                    fp.village,
                    fp.pincode,
                    fp.social_category,
                    fp.farmer_category,
                    fp.annual_family_income,
                    fp.kcc_holder,
                    fp.farmer_registration_id,
                    fp.profile_verification_status,
                    fp.location_id,
                    il.state_code,
                    il.district_code,
                    il.sub_district_code,
                    il.village_code
                FROM farmer_profiles fp
                LEFT JOIN india_locations il
                    ON fp.location_id = il.location_id
                WHERE fp.farmer_id = %s
            """, (farmer_id,))

            farmer = cursor.fetchone()

            if farmer is None:
                return None

            # 2. Landholdings

            cursor.execute("""
                SELECT
                    landholding_id,
                    land_area,
                    land_area_unit,
                    ownership_type,
                    irrigation_available,
                    state,
                    district,
                    village,
                    location_id,
                    created_at
                FROM farmer_landholdings
                WHERE farmer_id = %s
                ORDER BY landholding_id
            """, (farmer_id,))

            landholdings = {}

            for row in cursor.fetchall():
                plot = dict(row)
                plot["crops"] = []
                plot["trees"] = []
                plot["livestock"] = []

                landholdings[plot["landholding_id"]] = plot

            # 3. Crops

            cursor.execute("""
                SELECT
                    crop_id,
                    landholding_id,
                    crop_name,
                    crop_season,
                    cultivation_year
                FROM farmer_crops
                WHERE farmer_id = %s
                ORDER BY crop_id
            """, (farmer_id,))

            unassigned_crops = []

            for row in cursor.fetchall():
                crop = dict(row)
                landholding_id = crop.pop("landholding_id")

                if landholding_id in landholdings:
                    landholdings[landholding_id]["crops"].append(crop)
                else:
                    # Preserve crops whose plot association is unknown.
                    unassigned_crops.append(crop)

            # 4. Trees

            cursor.execute("""
                SELECT
                    tree_id,
                    landholding_id,
                    tree_name,
                    tree_variety,
                    tree_count,
                    tree_age_years,
                    purpose
                FROM farmer_trees
                WHERE farmer_id = %s
                ORDER BY tree_id
            """, (farmer_id,))

            for row in cursor.fetchall():
                tree = dict(row)
                landholding_id = tree.pop("landholding_id")

                if landholding_id in landholdings:
                    landholdings[landholding_id]["trees"].append(tree)

            # 5. Livestock

            cursor.execute("""
                SELECT
                    livestock_id,
                    landholding_id,
                    animal_type,
                    breed,
                    animal_count,
                    age_years,
                    purpose
                FROM farmer_livestock
                WHERE farmer_id = %s
                ORDER BY livestock_id
            """, (farmer_id,))

            for row in cursor.fetchall():
                animal = dict(row)
                landholding_id = animal.pop("landholding_id")

                if landholding_id in landholdings:
                    landholdings[landholding_id]["livestock"].append(animal)

            # 6. Final profile

            profile = {
                "farmer": dict(farmer),
                "landholdings": list(landholdings.values()),
                "unassigned_crops": unassigned_crops
            }

            return make_json_serializable(profile)

    finally:
        connection.close()
