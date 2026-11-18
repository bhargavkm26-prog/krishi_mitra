
import random
from collections import Counter, defaultdict

from backend.database.connection import get_connection


RNG = random.Random(20261116)

# Illustrative synthetic data for demonstration.
# These are not verified real farmer asset records.

TREE_DATA = {
    "Karnataka": [
        ("Mango", ["Alphonso", "Totapuri", "Local"]),
        ("Coconut", ["Tall", "Dwarf"]),
        ("Arecanut", ["Local"]),
        ("Teak", ["Local"]),
        ("Neem", ["Local"]),
        ("Tamarind", ["Local"]),
        ("Jackfruit", ["Local"]),
        ("Cashew", ["Local"]),
    ],
    "Gujarat": [
        ("Mango", ["Kesar", "Alphonso", "Local"]),
        ("Chikoo", ["Kalipatti", "Local"]),
        ("Date Palm", ["Local"]),
        ("Neem", ["Local"]),
        ("Teak", ["Local"]),
    ],
    "Assam": [
        ("Arecanut", ["Local"]),
        ("Coconut", ["Local"]),
        ("Mango", ["Local"]),
        ("Jackfruit", ["Local"]),
        ("Neem", ["Local"]),
    ],
    "Meghalaya": [
        ("Orange", ["Local"]),
        ("Arecanut", ["Local"]),
        ("Jackfruit", ["Local"]),
        ("Pine", ["Local"]),
        ("Bay Leaf", ["Local"]),
    ],
    "Goa": [
        ("Cashew", ["Vengurla", "Local"]),
        ("Coconut", ["Tall", "Local"]),
        ("Mango", ["Alphonso", "Local"]),
        ("Jackfruit", ["Local"]),
        ("Teak", ["Local"]),
    ],
}

LIVESTOCK_DATA = {
    "Karnataka": [
        ("Cow", ["Hallikar", "Amrit Mahal", "Local"]),
        ("Buffalo", ["Local", "Murrah"]),
        ("Goat", ["Osmanabadi", "Local"]),
        ("Sheep", ["Deccani", "Local"]),
        ("Poultry", ["Backyard"]),
    ],
    "Gujarat": [
        ("Cow", ["Gir", "Kankrej", "Local"]),
        ("Buffalo", ["Banni", "Surti"]),
        ("Goat", ["Local"]),
        ("Sheep", ["Local"]),
        ("Poultry", ["Backyard"]),
    ],
    "Assam": [
        ("Cow", ["Local"]),
        ("Goat", ["Assam Hill Goat", "Local"]),
        ("Pig", ["Local"]),
        ("Duck", ["Pati"]),
        ("Poultry", ["Backyard"]),
    ],
    "Meghalaya": [
        ("Cow", ["Local"]),
        ("Goat", ["Assam Hill Goat", "Local"]),
        ("Pig", ["Local"]),
        ("Poultry", ["Backyard"]),
    ],
    "Goa": [
        ("Cow", ["Local"]),
        ("Buffalo", ["Local"]),
        ("Goat", ["Local"]),
        ("Poultry", ["Backyard"]),
    ],
}

TREE_PURPOSES = [
    "Fruit",
    "Timber",
    "Commercial",
    "Shade",
]

ANIMAL_PURPOSES = {
    "Cow": ["Dairy", "Breeding"],
    "Buffalo": ["Dairy", "Breeding"],
    "Goat": ["Meat", "Breeding", "Milk"],
    "Sheep": ["Meat", "Wool", "Breeding"],
    "Poultry": ["Eggs", "Meat"],
    "Duck": ["Eggs", "Meat"],
    "Pig": ["Meat", "Breeding"],
}


def main():
    connection = get_connection()

    try:
        with connection:
            with connection.cursor() as cursor:

                # Prevent accidental duplicate generation.
                cursor.execute("""
                    SELECT
                        (SELECT COUNT(*) FROM farmer_trees),
                        (SELECT COUNT(*) FROM farmer_livestock)
                """)

                existing_trees, existing_livestock = cursor.fetchone()

                if existing_trees or existing_livestock:
                    raise ValueError(
                        "Tree or livestock records already exist. "
                        "Stopping to prevent duplicate insertion."
                    )

                # Fetch each farmer's actual landholdings.
                cursor.execute("""
                    SELECT
                        fp.farmer_id,
                        fp.state,
                        fl.landholding_id,
                        fl.land_area
                    FROM farmer_profiles fp
                    JOIN farmer_landholdings fl
                        ON fl.farmer_id = fp.farmer_id
                    ORDER BY fp.farmer_id, fl.landholding_id
                """)

                land_by_farmer = defaultdict(list)

                for farmer_id, state, landholding_id, area in cursor.fetchall():
                    land_by_farmer[farmer_id].append({
                        "state": state,
                        "landholding_id": landholding_id,
                        "land_area": float(area or 0),
                    })

                if len(land_by_farmer) != 100:
                    raise ValueError(
                        f"Expected 100 farmers with landholdings; "
                        f"found {len(land_by_farmer)}"
                    )

                tree_counts = Counter()
                livestock_counts = Counter()

                # --------------------------------
                # Generate tree records
                # --------------------------------

                for farmer_id, plots in land_by_farmer.items():

                    # Some farmers have no recorded trees.
                    if RNG.random() > 0.55:
                        continue

                    number_of_tree_types = RNG.randint(1, 2)

                    selected_plots = RNG.sample(
                        plots,
                        k=min(len(plots), number_of_tree_types)
                    )

                    for plot in selected_plots:

                        state = plot["state"]
                        tree_name, varieties = RNG.choice(
                            TREE_DATA[state]
                        )

                        variety = RNG.choice(varieties)

                        # Illustrative count based on plot size.
                        tree_count = max(
                            1,
                            min(
                                100,
                                round(
                                    plot["land_area"]
                                    * RNG.uniform(3, 8)
                                )
                            )
                        )

                        age = round(RNG.uniform(1, 20), 1)

                        cursor.execute("""
                            INSERT INTO farmer_trees (
                                farmer_id,
                                landholding_id,
                                tree_name,
                                tree_variety,
                                tree_count,
                                tree_age_years,
                                purpose
                            )
                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """, (
                            farmer_id,
                            plot["landholding_id"],
                            tree_name,
                            variety,
                            tree_count,
                            age,
                            RNG.choice(TREE_PURPOSES),
                        ))

                        tree_counts[state] += 1

                # --------------------------------
                # Generate livestock records
                # --------------------------------

                for farmer_id, plots in land_by_farmer.items():

                    # Some farmers have no recorded livestock.
                    if RNG.random() > 0.60:
                        continue

                    state = plots[0]["state"]

                    number_of_groups = RNG.randint(1, 2)

                    for _ in range(number_of_groups):

                        plot = RNG.choice(plots)

                        animal_type, breeds = RNG.choice(
                            LIVESTOCK_DATA[state]
                        )

                        breed = RNG.choice(breeds)

                        age = round(RNG.uniform(1, 10), 1)

                        animal_count = RNG.randint(1, 6)

                        purposes = ANIMAL_PURPOSES.get(
                            animal_type,
                            ["Meat", "Breeding"]
                        )

                        cursor.execute("""
                            INSERT INTO farmer_livestock (
                                farmer_id,
                                landholding_id,
                                animal_type,
                                breed,
                                animal_count,
                                age_years,
                                purpose
                            )
                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """, (
                            farmer_id,
                            plot["landholding_id"],
                            animal_type,
                            breed,
                            animal_count,
                            age,
                            RNG.choice(purposes),
                        ))

                        livestock_counts[state] += 1

                # --------------------------------
                # Final database counts
                # --------------------------------

                cursor.execute("""
                    SELECT COUNT(*) FROM farmer_trees
                """)
                total_trees = cursor.fetchone()[0]

                cursor.execute("""
                    SELECT COUNT(*) FROM farmer_livestock
                """)
                total_livestock = cursor.fetchone()[0]

                print("\nGeneration completed.")
                print(f"Tree records: {total_trees}")
                print(f"Livestock records: {total_livestock}")

                print("\nTree records by state:")
                for state, count in sorted(tree_counts.items()):
                    print(f"{state}: {count}")

                print("\nLivestock records by state:")
                for state, count in sorted(livestock_counts.items()):
                    print(f"{state}: {count}")

        print("\nTransaction committed successfully.")

    finally:
        connection.close()


if __name__ == "__main__":
    main()
