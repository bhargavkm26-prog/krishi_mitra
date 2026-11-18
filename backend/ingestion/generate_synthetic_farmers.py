
import random
from datetime import date, timedelta
from collections import Counter, defaultdict

from backend.database.connection import get_connection


# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

RNG = random.Random(20261116)

STATE_COUNTS = {
    "Karnataka": 80,
    "Gujarat": 8,
    "Assam": 5,
    "Meghalaya": 4,
    "Goa": 3,
}

CATEGORY_COUNTS = {
    "Marginal": 25,
    "Small": 30,
    "Semi-medium": 20,
    "Medium": 15,
    "Large": 10,
}

# Total operational land area per farmer, in hectares.
CATEGORY_AREA_RANGES = {
    "Marginal": (0.20, 1.00),
    "Small": (1.01, 2.00),
    "Semi-medium": (2.01, 4.00),
    "Medium": (4.01, 10.00),
    "Large": (10.01, 20.00),
}

FIRST_NAMES = [
    "Arun", "Ravi", "Kiran", "Manjunath", "Suresh",
    "Ramesh", "Mahesh", "Prakash", "Ganesh", "Naveen",
    "Anil", "Vijay", "Lakshmi", "Kavitha", "Geetha",
    "Savitha", "Meena", "Pooja", "Sunita", "Rekha",
    "Bharat", "Deepak", "Rajesh", "Mohan", "Shankar",
]

LAST_NAMES = [
    "Gowda", "Patil", "Reddy", "Shetty", "Naik",
    "Kumar", "Sharma", "Das", "Borah", "Sangma",
    "Pereira", "Desai", "Joshi", "Hegde", "Rao",
    "Kulkarni", "Bhat", "Nayak", "Deka", "Marak",
]

CROPS_BY_STATE = {
    "Karnataka": [
        "Rice", "Ragi", "Maize", "Jowar", "Groundnut",
        "Sugarcane", "Cotton", "Arecanut", "Coffee",
        "Coconut", "Tur", "Sunflower",
    ],
    "Gujarat": [
        "Cotton", "Groundnut", "Wheat", "Bajra",
        "Rice", "Castor", "Cumin", "Mustard",
    ],
    "Assam": [
        "Rice", "Tea", "Jute", "Mustard",
        "Maize", "Potato", "Sugarcane",
    ],
    "Meghalaya": [
        "Rice", "Maize", "Potato", "Ginger",
        "Turmeric", "Arecanut", "Pineapple",
    ],
    "Goa": [
        "Rice", "Coconut", "Cashew", "Arecanut",
        "Ragi", "Vegetables",
    ],
}

SEASONS = ["Kharif", "Rabi", "Zaid", "Perennial"]

SOCIAL_CATEGORIES = ["General", "OBC", "SC", "ST"]


# --------------------------------------------------
# DATA GENERATION
# --------------------------------------------------

def generate_category_list():
    categories = []

    for category, count in CATEGORY_COUNTS.items():
        categories.extend([category] * count)

    RNG.shuffle(categories)
    return categories


def generate_state_list():
    states = []

    for state, count in STATE_COUNTS.items():
        states.extend([state] * count)

    RNG.shuffle(states)
    return states


def random_birth_date():
    today = date.today()
    age = RNG.randint(25, 70)

    approximate_birth_year = today.year - age
    start = date(approximate_birth_year, 1, 1)
    end = date(approximate_birth_year, 12, 31)

    days = (end - start).days
    return start + timedelta(days=RNG.randint(0, days))


def generate_total_land(category):
    minimum, maximum = CATEGORY_AREA_RANGES[category]
    return round(RNG.uniform(minimum, maximum), 2)


def split_land_area(total_area, number_of_plots):
    # Generate positive plot proportions.
    weights = [RNG.uniform(0.5, 2.0) for _ in range(number_of_plots)]
    weight_total = sum(weights)

    areas = [
        round(total_area * weight / weight_total, 2)
        for weight in weights
    ]

    # Correct rounding difference so plot total equals farmer total.
    difference = round(total_area - sum(areas), 2)
    areas[0] = round(areas[0] + difference, 2)

    return areas


def generate_farmer_name():
    return (
        f"{RNG.choice(FIRST_NAMES)} "
        f"{RNG.choice(LAST_NAMES)}"
    )


# --------------------------------------------------
# DATABASE OPERATIONS
# --------------------------------------------------

def main():
    print("Starting synthetic farmer dataset generation...")

    connection = get_connection()

    try:
        with connection:
            with connection.cursor() as cursor:

                # ----------------------------------
                # 1. Load valid geographic records
                # ----------------------------------

                cursor.execute("""
                    SELECT
                        location_id,
                        state_name,
                        district_name,
                        sub_district_name,
                        village_name
                    FROM india_locations
                    WHERE state_name = ANY(%s)
                """, (list(STATE_COUNTS.keys()),))

                locations_by_state = defaultdict(list)

                for row in cursor.fetchall():
                    location = {
                        "location_id": row[0],
                        "state": row[1],
                        "district": row[2],
                        "sub_district": row[3],
                        "village": row[4],
                    }

                    locations_by_state[row[1]].append(location)

                for state in STATE_COUNTS:
                    if not locations_by_state[state]:
                        raise ValueError(
                            f"No locations found for {state}"
                        )

                print("Geographic records loaded successfully.")

                # ----------------------------------
                # 2. Generate exact distributions
                # ----------------------------------

                states = generate_state_list()
                categories = generate_category_list()

                if len(states) != 100 or len(categories) != 100:
                    raise ValueError("Dataset distribution error")

                inserted_categories = Counter()
                inserted_states = Counter()

                # ----------------------------------
                # 3. Insert farmers
                # ----------------------------------

                for index in range(100):

                    state = states[index]
                    category = categories[index]

                    # Primary farmer location.
                    profile_location = RNG.choice(
                        locations_by_state[state]
                    )

                    farmer_unique_id = f"KM26@{index + 1:04d}"

                    name = generate_farmer_name()
                    birth_date = random_birth_date()
                    gender = RNG.choice(["Male", "Female"])

                    annual_income = round(
                        RNG.uniform(60000, 600000), 2
                    )

                    social_category = RNG.choice(
                        SOCIAL_CATEGORIES
                    )

                    kcc_holder = RNG.choice([True, False])

                    # ----------------------------------
                    # Insert farmer profile
                    # ----------------------------------

                    cursor.execute("""
                        INSERT INTO farmer_profiles (
                            farmer_unique_id,
                            full_name,
                            date_of_birth,
                            gender,
                            mobile_number,
                            state,
                            district,
                            sub_district,
                            village,
                            pincode,
                            social_category,
                            farmer_category,
                            annual_family_income,
                            kcc_holder,
                            farmer_registration_id,
                            profile_verification_status,
                            location_id
                        )
                        VALUES (
                            %s, %s, %s, %s, NULL,
                            %s, %s, %s, %s, NULL,
                            %s, %s, %s, %s, NULL,
                            'UNVERIFIED', %s
                        )
                        RETURNING farmer_id
                    """, (
                        farmer_unique_id,
                        name,
                        birth_date,
                        gender,
                        profile_location["state"],
                        profile_location["district"],
                        profile_location["sub_district"],
                        profile_location["village"],
                        social_category,
                        category,
                        annual_income,
                        kcc_holder,
                        profile_location["location_id"],
                    ))

                    farmer_id = cursor.fetchone()[0]

                    # ----------------------------------
                    # Insert landholdings
                    # ----------------------------------

                    total_area = generate_total_land(category)
                    number_of_plots = RNG.randint(1, 3)

                    plot_areas = split_land_area(
                        total_area,
                        number_of_plots
                    )

                    for plot_area in plot_areas:

                        # Keep all plots within the farmer's state.
                        land_location = RNG.choice(
                            locations_by_state[state]
                        )

                        ownership = RNG.choices(
                            ["OWNED", "LEASED", "TENANT", "SHARED"],
                            weights=[65, 20, 10, 5],
                            k=1,
                        )[0]

                        irrigation = RNG.choice([True, False])

                        cursor.execute("""
                            INSERT INTO farmer_landholdings (
                                farmer_id,
                                land_area,
                                land_area_unit,
                                ownership_type,
                                irrigation_available,
                                state,
                                district,
                                village,
                                location_id
                            )
                            VALUES (%s, %s, 'HECTARE', %s, %s,
                                    %s, %s, %s, %s)
                        """, (
                            farmer_id,
                            plot_area,
                            ownership,
                            irrigation,
                            land_location["state"],
                            land_location["district"],
                            land_location["village"],
                            land_location["location_id"],
                        ))

                    # ----------------------------------
                    # Insert crops
                    # ----------------------------------

                    crop_count = RNG.randint(1, 4)

                    selected_crops = RNG.sample(
                        CROPS_BY_STATE[state],
                        crop_count,
                    )

                    for crop_name in selected_crops:
                        cursor.execute("""
                            INSERT INTO farmer_crops (
                                farmer_id,
                                crop_name,
                                crop_season,
                                cultivation_year
                            )
                            VALUES (%s, %s, %s, %s)
                        """, (
                            farmer_id,
                            crop_name,
                            RNG.choice(SEASONS),
                            RNG.choice([2024, 2025, 2026]),
                        ))

                    inserted_categories[category] += 1
                    inserted_states[state] += 1

                # ----------------------------------
                # 4. Validate inserted records
                # ----------------------------------

                cursor.execute("""
                    SELECT COUNT(*) FROM farmer_profiles
                """)
                farmer_count = cursor.fetchone()[0]

                cursor.execute("""
                    SELECT COUNT(*) FROM farmer_landholdings
                """)
                land_count = cursor.fetchone()[0]

                cursor.execute("""
                    SELECT COUNT(*) FROM farmer_crops
                """)
                crop_count = cursor.fetchone()[0]

                if farmer_count != 100:
                    raise ValueError(
                        f"Expected 100 farmers, found {farmer_count}"
                    )

                print("\nDataset inserted successfully.")
                print(f"Farmers: {farmer_count}")
                print(f"Landholdings: {land_count}")
                print(f"Crop records: {crop_count}")

                print("\nFarmers by state:")
                for state, count in sorted(inserted_states.items()):
                    print(f"{state}: {count}")

                print("\nFarmers by category:")
                for category, count in inserted_categories.items():
                    print(f"{category}: {count}")

        print("\nTransaction committed successfully.")

    finally:
        connection.close()


if __name__ == "__main__":
    main()
