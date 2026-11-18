
import csv
from pathlib import Path
from collections import Counter

from psycopg2.extras import execute_values

from backend.database.connection import get_connection

ROOT_DIR = Path(__file__).resolve().parents[2]
CSV_PATH = ROOT_DIR / "data" / "raw" / "india_lgd_locations.csv"

SELECTED_STATES = {
    "Karnataka",
    "Gujarat",
    "Assam",
    "Meghalaya",
    "Goa",
}

INSERT_SQL = """
    INSERT INTO india_locations (
        state_code,
        state_name,
        district_code,
        district_name,
        sub_district_code,
        sub_district_name,
        village_code,
        village_name
    )
    VALUES %s
    ON CONFLICT (village_code) DO NOTHING
    RETURNING state_name;
"""


def main():
    if not CSV_PATH.exists():
        raise FileNotFoundError(f"CSV not found: {CSV_PATH}")

    records = []

    with open(CSV_PATH, "r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)

        for row in reader:
            if row["state_name"].strip() not in SELECTED_STATES:
                continue

            records.append((
                row["state_code"].strip(),
                row["state_name"].strip(),
                row["district_code"].strip(),
                row["district_name"].strip(),
                row["sub-district_code"].strip(),
                row["sub-district_name"].strip(),
                row["village_code"].strip(),
                row["village_name"].strip(),
            ))

    print(f"Records selected: {len(records):,}")

    inserted_by_state = Counter()

    connection = get_connection()

    try:
        with connection:
            with connection.cursor() as cursor:
                batch_size = 5000

                for start in range(0, len(records), batch_size):
                    batch = records[start:start + batch_size]

                    inserted = execute_values(
                        cursor,
                        INSERT_SQL,
                        batch,
                        page_size=batch_size,
                        fetch=True,
                    )

                    inserted_by_state.update(
                        row[0] for row in inserted
                    )

        print("\nImport completed.")
        print("\nNew records inserted by state:")

        for state in sorted(SELECTED_STATES):
            print(f"{state}: {inserted_by_state[state]:,}")

        print(
            f"\nTotal newly inserted: "
            f"{sum(inserted_by_state.values()):,}"
        )

    finally:
        connection.close()


if __name__ == "__main__":
    main()
