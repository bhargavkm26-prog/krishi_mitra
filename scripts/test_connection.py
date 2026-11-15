import sys
from pathlib import Path

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.database.connection import get_connection


def test_database():
    conn = get_connection()

    try:
        with conn.cursor() as cur:

            cur.execute("""
                SELECT COUNT(*)
                FROM public.schemes;
            """)

            count = cur.fetchone()[0]

            print("Database connected successfully!")
            print(f"Total schemes: {count}")

            cur.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = 'schemes'
                ORDER BY ordinal_position;
            """)

            columns = cur.fetchall()

            print("\nAvailable columns:")

            for column in columns:
                print("-", column[0])

    finally:
        conn.close()


if __name__ == "__main__":
    test_database()